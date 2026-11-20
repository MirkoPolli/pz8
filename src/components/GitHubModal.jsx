import React, { useState } from 'react';
import { X, Copy, Check, Mail, Clock, ShieldCheck } from 'lucide-react';

export default function GitHubModal({ isOpen, onClose }) {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedWorkflow, setCopiedWorkflow] = useState(false);

  if (!isOpen) return null;

  const workflowYml = `name: Daily Expiration Check & Email

on:
  schedule:
    # 08:00 UTC = 09:00 ora italiana invernale (CET)
    - cron: '0 8 * * *'
  workflow_dispatch: # Permette anche di lanciare il test a mano con 1 click

jobs:
  check-and-notify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install firebase-admin resend

      - name: Run notification script for all users
        env:
          FIREBASE_SERVICE_ACCOUNT: \${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          RESEND_API_KEY: \${{ secrets.RESEND_API_KEY }}
        run: node scripts/daily-check.cjs
`;

  const runnerScript = `/**
 * scripts/daily-check.cjs
 * Gira ogni mattina alle 09:00 su GitHub Actions
 * Itera TUTTI gli utenti registrati su Firebase (tu e il tuo amico)
 * e invia a ciascuno l'email con le sue utenze in scadenza.
 */
const admin = require('firebase-admin');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return \`\${y}-\${m}-\${day}\`;
}

async function run() {
  const todayStr = getTodayString();
  console.log('Esecuzione controllo scadenze per la data:', todayStr);

  // Legge tutti gli utenti da Firebase
  const usersSnap = await db.collection('users').get();
  console.log(\`Trovati \${usersSnap.size} utenti registrati nel sistema.\`);

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    
    // Legge profilo utente (email e saldo crediti)
    const profileSnap = await db.collection('users').doc(uid).collection('profile').doc('data').get();
    const profileData = profileSnap.exists ? profileSnap.data() : {};
    
    // Auth user info
    let recipientEmail = profileData.email;
    try {
      const userRecord = await admin.auth().getUser(uid);
      recipientEmail = recipientEmail || userRecord.email;
    } catch (e) {
      console.warn('Impossibile recuperare email da Auth per uid:', uid);
    }

    if (!recipientEmail) {
      console.log(\`Nessuna email trovata per utente \${uid}, salto.\`);
      continue;
    }

    // Legge le utenze del singolo utente
    const clientsSnap = await db.collection('users').doc(uid).collection('clients').get();
    const expiringToday = [];
    let expiringNext3Days = 0;

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const threeDaysDate = new Date(todayDate);
    threeDaysDate.setDate(todayDate.getDate() + 3);

    clientsSnap.forEach(doc => {
      const c = doc.data();
      if (!c.isActive || !c.expirationDate) return;

      const exp = new Date(c.expirationDate);
      exp.setHours(0, 0, 0, 0);

      if (c.expirationDate === todayStr || exp.getTime() === todayDate.getTime()) {
        expiringToday.push(c);
      }

      if (exp >= todayDate && exp <= threeDaysDate) {
        expiringNext3Days++;
      }
    });

    // 1. Invio email scadenze di oggi
    if (expiringToday.length > 0) {
      for (const client of expiringToday) {
        const emailBody = \`Scaduto oggi IPTV di "\${client.user}"\\n\` +
                          \`Nome contatto: "\${client.contactName || 'N/D'}"\\n\` +
                          \`Costo mensile: "\${client.monthlyCost || 10}€"\`;

        console.log(\`Invio email a \${recipientEmail} per scadenza \${client.user}\`);
        await resend.emails.send({
          from: 'PZ8 Manager <onboarding@resend.dev>',
          to: recipientEmail,
          subject: 'Scadenza IPTV',
          text: emailBody
        });
      }
    } else {
      console.log(\`Nessuna scadenza oggi per \${recipientEmail}.\`);
    }

    // 2. Alert crediti per Admin
    const balance = profileData.creditsBalance || 0;
    const needed = expiringNext3Days * 3;
    if (balance < needed && expiringNext3Days > 0) {
      const alertBody = \`Attenzione,\\n\\n\` +
                        \`I tuoi crediti disponibili sono quasi esauriti: \${balance} CR rimanenti.\\n\` +
                        \`Hai \${expiringNext3Days} utenti in scadenza nei prossimi 3 giorni (fabbisogno stimato: \${needed} crediti).\\n\\n\` +
                        \`Ricordati di ricaricare il pacchetto crediti!\`;

      console.log(\`Invio alert crediti a \${recipientEmail}\`);
      await resend.emails.send({
        from: 'PZ8 Manager <onboarding@resend.dev>',
        to: recipientEmail,
        subject: '⚠️ Alert Crediti IPTV in Esaurimento',
        text: alertBody
      });
    }
  }

  console.log('Controllo completato con successo.');
}

run().catch(err => {
  console.error('Errore nel cron:', err);
  process.exit(1);
});
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111726] border border-[#1f2a45] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1f2a45] flex items-center justify-between bg-[#0e1320]">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#00ff9d]" />
            <h2 className="font-mono font-bold text-white text-base">
              Automazione Email (GitHub Actions)
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
          
          <div className="p-3.5 rounded-xl bg-[#0a0d14] border border-[#1d273d] space-y-2 text-slate-300">
            <div className="font-bold text-[#00ff9d] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Come funziona per te e per il tuo amico:</span>
            </div>
            <p className="text-slate-400">
              Il workflow gira ogni giorno su GitHub alle <strong className="text-white">09:00 (ora italiana)</strong>.
              Interroga Firestore e per ciascun utente registrato (tu e il tuo amico) trova le utenze in scadenza e invia l'email <strong>direttamente al rispettivo indirizzo Google</strong>.
            </p>
            <div className="text-slate-400 pt-1">
              Servono solo 2 secret gratuiti configurati nel repository GitHub (<code className="text-[#00f0ff]">Settings &gt; Secrets and variables &gt; Actions</code>):
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-white">
                <li><code className="text-[#00f0ff]">FIREBASE_SERVICE_ACCOUNT</code>: chiave di servizio JSON scaricabile da Firebase Console.</li>
                <li><code className="text-[#00f0ff]">RESEND_API_KEY</code>: chiave gratuita da <a href="https://resend.com" target="_blank" rel="noreferrer" className="underline text-[#00ff9d]">resend.com</a> (3.000 email/mese free).</li>
              </ul>
            </div>
          </div>

          {/* Workflow file */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px] font-bold">1. File Workflow: <code>.github/workflows/daily-check.yml</code></span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(workflowYml);
                  setCopiedWorkflow(true);
                  setTimeout(() => setCopiedWorkflow(false), 2000);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e2c4a] text-[#00f0ff] hover:bg-[#25375c]"
              >
                {copiedWorkflow ? <Check className="w-3.5 h-3.5 text-[#00ff9d]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWorkflow ? 'Copiato!' : 'Copia'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#070a10] border border-[#1b2438] text-slate-300 overflow-x-auto text-[11px] max-h-40">
              <code>{workflowYml}</code>
            </pre>
          </div>

          {/* Script file */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px] font-bold">2. Script Node: <code>scripts/daily-check.js</code></span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(runnerScript);
                  setCopiedScript(true);
                  setTimeout(() => setCopiedScript(false), 2000);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e2c4a] text-[#00f0ff] hover:bg-[#25375c]"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-[#00ff9d]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? 'Copiato!' : 'Copia'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#070a10] border border-[#1b2438] text-slate-300 overflow-x-auto text-[11px] max-h-44">
              <code>{runnerScript}</code>
            </pre>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1f2a45] bg-[#0e1320] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#151c2e] text-slate-300 hover:text-white font-mono text-xs"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
}
