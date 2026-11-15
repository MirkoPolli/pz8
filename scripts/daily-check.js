/**
 * scripts/daily-check.js
 * Eseguito su GitHub Actions ogni giorno alle ore 09:00 (CET).
 * Notifica sia te che il tuo amico via email per i rispettivi account in scadenza.
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

async function run() {
  const todayStr = getTodayString();
  console.log('=== Controllo Scadenze Giornaliero per:', todayStr, '===');

  // Recupera tutti gli utenti presenti in Firestore
  const usersSnap = await db.collection('users').get();
  console.log(`Trovati ${usersSnap.size} utenti nel sistema.`);

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    console.log(`\nVerifica dati per UID: ${uid}`);

    // Email destinatario
    let recipientEmail = null;
    try {
      const userRecord = await admin.auth().getUser(uid);
      recipientEmail = userRecord.email;
    } catch (e) {
      console.warn(`Impossibile leggere email da Auth per ${uid}:`, e.message);
    }

    const profileSnap = await db.collection('users').doc(uid).collection('profile').doc('data').get();
    const profileData = profileSnap.exists ? profileSnap.data() : {};
    recipientEmail = recipientEmail || profileData.email;

    if (!recipientEmail) {
      console.log(`Nessun indirizzo email associato all'UID ${uid}, salto.`);
      continue;
    }

    console.log(`Email destinatario: ${recipientEmail}`);

    // Leggi clienti dell'utente
    const clientsSnap = await db.collection('users').doc(uid).collection('clients').get();
    const expiringToday = [];
    let expiringNext3Days = 0;

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const threeDaysDate = new Date(todayDate);
    threeDaysDate.setDate(todayDate.getDate() + 3);

    clientsSnap.forEach(docSnap => {
      const c = docSnap.data();
      if (!c.isActive || !c.expirationDate) return;

      const exp = new Date(c.expirationDate);
      exp.setHours(0, 0, 0, 0);

      // Scaduto oggi
      if (c.expirationDate === todayStr || exp.getTime() === todayDate.getTime()) {
        expiringToday.push(c);
      }

      // In scadenza nei prossimi 3 giorni
      if (exp >= todayDate && exp <= threeDaysDate) {
        expiringNext3Days++;
      }
    });

    // 1. Invio Notifiche Scadenza
    if (expiringToday.length > 0) {
      for (const client of expiringToday) {
        const emailBody = `Scaduto oggi IPTV di "${client.user}"\n` +
                          `Nome contatto: "${client.contactName || 'N/D'}"\n` +
                          `Costo mensile: "${client.monthlyCost || 10}€"`;

        console.log(`Inviando notifica scadenza a ${recipientEmail} per "${client.user}"...`);
        try {
          await resend.emails.send({
            from: 'PZ8 Manager <onboarding@resend.dev>',
            to: recipientEmail,
            subject: 'Scadenza IPTV',
            text: emailBody
          });
          console.log(`✓ Email inviata con successo.`);
        } catch (mailErr) {
          console.error(`✗ Errore invio email per ${client.user}:`, mailErr);
        }
      }
    } else {
      console.log(`Nessun account scaduto oggi per ${recipientEmail}.`);
    }

    // 2. Alert Scorte Crediti (Solo se gestisce i crediti)
    if (profileData.creditsBalance !== undefined) {
      const balance = profileData.creditsBalance || 0;
      const needed = expiringNext3Days * 3;

      if (balance < needed && expiringNext3Days > 0) {
        console.log(`⚠️ Alert crediti attivi per ${recipientEmail}: Saldo ${balance} CR, Fabbisogno ${needed} CR.`);
        const alertBody = `Attenzione,\n\n` +
                          `I tuoi crediti disponibili sono quasi esauriti: ${balance} CR rimanenti.\n` +
                          `Hai ${expiringNext3Days} utenti in scadenza nei prossimi 3 giorni (fabbisogno stimato: ${needed} crediti).\n\n` +
                          `Ricordati di ricaricare il pacchetto crediti!`;

        try {
          await resend.emails.send({
            from: 'PZ8 Manager <onboarding@resend.dev>',
            to: recipientEmail,
            subject: '⚠️ Alert Crediti IPTV in Esaurimento',
            text: alertBody
          });
          console.log(`✓ Alert crediti inviato con successo a ${recipientEmail}.`);
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
