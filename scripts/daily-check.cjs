/**
 * scripts/daily-check.cjs
 * Avviato tramite workflow_dispatch (es. da Google Apps Script ogni giorno alle ~09:00 Europe/Rome).
 * Notifica gli utenti via email per i rispettivi account in scadenza (oggi o il giorno prima, in base alle impostazioni)
 * e invia un alert all'admin se i crediti disponibili non bastano per i rinnovi imminenti.
 */

const admin = require('firebase-admin');
const { Resend } = require('resend');

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.error("Manca la variabile RESEND_API_KEY");
  process.exit(1);
}
const resend = new Resend(resendApiKey);

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountRaw) {
  console.error("Manca la variabile FIREBASE_SERVICE_ACCOUNT");
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountRaw);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const ADMIN_EMAILS = ['polliotto.mirko@gmail.com'];
const forceResend = String(process.env.FORCE_RESEND || 'false').toLowerCase() === 'true';

function getRomeTodayParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = Number(part.value);
    }
  }
  return { year: map.year, month: map.month, day: map.day };
}

function getRomeUtcDate(offsetDays = 0) {
  const { year, month, day } = getRomeTodayParts();
  return new Date(Date.UTC(year, month - 1, day + offsetDays));
}

function toIsoDateString(utcDate) {
  return utcDate.toISOString().slice(0, 10);
}

function parseClientDateUtc(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  return isNaN(d.getTime()) ? null : d;
}

function formatDateItalian(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return 'N/D';
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateStr;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

async function run() {
  const todayDate = getRomeUtcDate(0);
  const tomorrowDate = getRomeUtcDate(1);
  const threeDaysDate = getRomeUtcDate(3);

  const todayStr = toIsoDateString(todayDate);
  const tomorrowStr = toIsoDateString(tomorrowDate);

  console.log('=== Controllo Scadenze Giornaliero ===');
  console.log('Data Oggi (Europe/Rome):', todayStr, '| Data Domani:', tomorrowStr, '| FORCE_RESEND:', forceResend);

  // Recupera tutti gli utenti tramite Firebase Auth (include sempre tutti gli utenti registrati)
  const userMap = new Map();
  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    console.log(`Trovati ${listUsersResult.users.length} utenti su Firebase Auth.`);
    listUsersResult.users.forEach(u => {
      if (u.email) {
        userMap.set(u.uid, u.email);
      }
    });
  } catch (authErr) {
    console.warn("Avviso lettura Firebase Auth listUsers:", authErr.message);
  }

  // Controlla anche documenti presenti direttamente nella collection 'users' di Firestore
  try {
    const usersSnap = await db.collection('users').get();
    console.log(`Trovati ${usersSnap.size} documenti nella collection 'users' di Firestore.`);
    usersSnap.forEach(d => {
      if (!userMap.has(d.id)) {
        userMap.set(d.id, d.data().email || null);
      }
    });
  } catch (fsErr) {
    console.warn("Avviso lettura collection users da Firestore:", fsErr.message);
  }

  console.log(`Totale utenti unici da elaborare: ${userMap.size}`);

  for (const [uid, authEmail] of userMap.entries()) {
    console.log(`\n-----------------------------------------`);
    console.log(`Verifica dati per UID: ${uid}`);

    // Leggi profilo per email o crediti: /users/{uid}/profile/data
    const profileSnap = await db.collection('users').doc(uid).collection('profile').doc('data').get();
    const profileData = profileSnap.exists ? profileSnap.data() : {};
    const recipientEmail = authEmail || profileData.email;

    if (!recipientEmail) {
      console.log(`Nessun indirizzo email associato all'UID ${uid}, salto.`);
      continue;
    }

    const isAdmin = ADMIN_EMAILS.includes(String(recipientEmail).toLowerCase());
    console.log(`Email destinatario: ${recipientEmail} (admin: ${isAdmin})`);

    // Protezione anti-duplicato giornaliero
    const notifRef = db.collection('users').doc(uid).collection('notifications').doc('dailyCheck');
    const notifSnap = await notifRef.get();
    if (!forceResend && notifSnap.exists && notifSnap.data().lastSentDate === todayStr) {
      console.log(`Notifiche già inviate oggi (${todayStr}) per ${recipientEmail}, salto per evitare duplicati.`);
      continue;
    }

    // Leggi preferenze notifiche da settings: /users/{uid}/settings/data
    const settingsSnap = await db.collection('users').doc(uid).collection('settings').doc('data').get();
    const settingsData = settingsSnap.exists ? settingsSnap.data() : {};
    // notifyTiming: 'today' (default) oppure 'day_before'
    const notifyTiming = settingsData.notifyTiming === 'day_before' ? 'day_before' : 'today';
    console.log(`Preferenza invio notifica: ${notifyTiming === 'day_before' ? 'Il giorno prima della scadenza' : 'Il giorno della scadenza'}`);

    // Leggi clienti dell'utente
    const clientsSnap = await db.collection('users').doc(uid).collection('clients').get();
    const clientsToNotify = [];
    let expiringNext3Days = 0;

    const targetDate = notifyTiming === 'day_before' ? tomorrowDate : todayDate;
    const targetStr = notifyTiming === 'day_before' ? tomorrowStr : todayStr;

    clientsSnap.forEach(docSnap => {
      const c = docSnap.data();
      if (!c.isActive || !c.expirationDate) return;

      const exp = parseClientDateUtc(c.expirationDate);
      if (!exp) return;

      // In scadenza oggi o domani in base alla preferenza utente
      if (c.expirationDate === targetStr || exp.getTime() === targetDate.getTime()) {
        clientsToNotify.push(c);
      }

      // Conteggio in scadenza nei prossimi 3 giorni (da oggi a 3 giorni)
      if (exp >= todayDate && exp <= threeDaysDate) {
        expiringNext3Days++;
      }
    });

    let sentCount = 0;

    // 1. Invio Notifiche Scadenza
    if (clientsToNotify.length > 0) {
      console.log(`Trovati ${clientsToNotify.length} account da notificare (${notifyTiming}).`);
      for (const client of clientsToNotify) {
        const isDayBefore = notifyTiming === 'day_before';
        const subject = isDayBefore
          ? `[PZ8] Promemoria Scadenza Domani: ${client.user}`
          : `[PZ8] Scadenza Oggi: ${client.user}`;

        const emailBody = (isDayBefore ? `In scadenza DOMANI IPTV di "${client.user}"\n` : `Scaduto oggi IPTV di "${client.user}"\n`) +
                          `Nome contatto: "${client.contactName || 'N/D'}"\n` +
                          `Data scadenza: "${formatDateItalian(client.expirationDate)}"\n` +
                          `Costo mensile: "${client.monthlyCost || 10}€"`;

        console.log(`Inviando notifica scadenza a ${recipientEmail} per "${client.user}"...`);
        try {
          const res = await resend.emails.send({
            from: 'PZ8 Manager <onboarding@resend.dev>',
            to: recipientEmail,
            subject: subject,
            text: emailBody
          });
          if (res?.error) {
            console.error(`✗ Errore Resend per ${client.user}:`, res.error);
          } else {
            sentCount++;
            console.log(`✓ Email inviata con successo. ID:`, res?.data?.id || res?.id || 'ok');
          }
        } catch (mailErr) {
          console.error(`✗ Errore invio email per ${client.user}:`, mailErr);
        }
      }
    } else {
      console.log(`Nessun account da notificare per ${recipientEmail} con criterio "${notifyTiming}".`);
    }

    // 2. Alert Scorte Crediti Insufficienti (solo Admin)
    if (isAdmin && profileData.creditsBalance !== undefined) {
      const balance = Number(profileData.creditsBalance) || 0;
      // Fabbisogno minimo: almeno 1 credito per ciascun utente in scadenza nei prossimi 3 giorni
      const minNeeded = expiringNext3Days;

      console.log(`Stato Crediti: saldo ${balance} CR | ${expiringNext3Days} utenti in scadenza nei prossimi 3gg.`);

      if (balance < minNeeded && expiringNext3Days > 0) {
        console.log(`⚠️ ALERT CREDITI ATTIVO per ${recipientEmail}: Saldo ${balance} CR < Fabbisogno ${minNeeded} CR.`);
        const alertBody = `Attenzione,\n\n` +
                          `I tuoi crediti disponibili (${balance} CR) non sono sufficienti per rinnovare gli account in scadenza nei prossimi 3 giorni (${expiringNext3Days} utenti in scadenza, fabbisogno minimo stimato: ${minNeeded} crediti).\n\n` +
                          `Ricordati di ricaricare il tuo pacchetto crediti al più presto per evitare interruzioni del servizio!`;

        try {
          const res = await resend.emails.send({
            from: 'PZ8 Manager <onboarding@resend.dev>',
            to: recipientEmail,
            subject: '⚠️ Alert PZ8: Crediti Insufficienti per Rinnovi',
            text: alertBody
          });
          if (res?.error) {
            console.error(`✗ Errore Resend per alert crediti:`, res.error);
          } else {
            sentCount++;
            console.log(`✓ Alert crediti inviato con successo a ${recipientEmail}. ID:`, res?.data?.id || res?.id || 'ok');
          }
        } catch (alertErr) {
          console.error(`✗ Errore invio alert crediti:`, alertErr);
        }
      }
    }

    // Salva stato invio giornaliero se almeno una mail è partita con successo
    if (sentCount > 0) {
      await notifRef.set({
        lastSentDate: todayStr,
        lastSentAt: new Date().toISOString(),
        lastSentCount: sentCount
      }, { merge: true });
      console.log(`✓ Registrato invio giornaliero (${sentCount} email) per ${todayStr}.`);
    }
  }

  console.log('\n=== Controllo completato con successo ===');
}

run().catch(err => {
  console.error("Errore critico durante l'esecuzione del cron:", err);
  process.exit(1);
});
