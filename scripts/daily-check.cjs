/**
 * scripts/daily-check.cjs
 * Eseguito su GitHub Actions ogni giorno alle ore 09:00 (CET).
 * Notifica gli utenti via email per i rispettivi account in scadenza (oggi o il giorno prima, in base alle impostazioni)
 * e invia un alert se i crediti disponibili non bastano per i rinnovi imminenti.
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

function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getTomorrowString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function run() {
  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();
  console.log('=== Controllo Scadenze Giornaliero ===');
  console.log('Data Oggi:', todayStr, '| Data Domani:', tomorrowStr);

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

    console.log(`Email destinatario: ${recipientEmail}`);

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

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(todayDate.getDate() + 1);

    const threeDaysDate = new Date(todayDate);
    threeDaysDate.setDate(todayDate.getDate() + 3);

    clientsSnap.forEach(docSnap => {
      const c = docSnap.data();
      if (!c.isActive || !c.expirationDate) return;

      const exp = new Date(c.expirationDate);
      exp.setHours(0, 0, 0, 0);

      // In scadenza oggi o domani in base alla preferenza utente
      if (notifyTiming === 'day_before') {
        if (c.expirationDate === tomorrowStr || exp.getTime() === tomorrowDate.getTime()) {
          clientsToNotify.push(c);
        }
      } else {
        if (c.expirationDate === todayStr || exp.getTime() === todayDate.getTime()) {
          clientsToNotify.push(c);
        }
      }

      // Conteggio in scadenza nei prossimi 3 giorni (da oggi a 3 giorni)
      if (exp >= todayDate && exp <= threeDaysDate) {
        expiringNext3Days++;
      }
    });

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
                          `Data scadenza: "${client.expirationDate}"\n` +
                          `Costo mensile: "${client.monthlyCost || 10}€"`;

        console.log(`Inviando notifica scadenza a ${recipientEmail} per "${client.user}"...`);
        try {
          const res = await resend.emails.send({
            from: 'PZ8 Manager <onboarding@resend.dev>',
            to: recipientEmail,
            subject: subject,
            text: emailBody
          });
          console.log(`✓ Email inviata con successo. ID:`, res?.data?.id || res?.id || 'ok');
        } catch (mailErr) {
          console.error(`✗ Errore invio email per ${client.user}:`, mailErr);
        }
      }
    } else {
      console.log(`Nessun account da notificare per ${recipientEmail} con criterio "${notifyTiming}".`);
    }

    // 2. Alert Scorte Crediti Insufficienti
    if (profileData.creditsBalance !== undefined) {
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
          console.log(`✓ Alert crediti inviato con successo a ${recipientEmail}. ID:`, res?.data?.id || res?.id || 'ok');
        } catch (alertErr) {
          console.error(`✗ Errore invio alert crediti:`, alertErr);
        }
      }
    }
  }

  console.log('\n=== Controllo completato con successo ===');
}

run().catch(err => {
  console.error("Errore critico durante l'esecuzione del cron:", err);
  process.exit(1);
});
