import React, { useState } from 'react';
import { X, Copy, Check, FileCode, Clock, Mail, ShieldAlert, ExternalLink } from 'lucide-react';

export default function AppsScriptModal({ isOpen, onClose, userEmail }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const targetEmail = userEmail || "tua_email_google@gmail.com";

  const scriptCode = `/**
 * PZ8 IPTV MANAGER - AUTOMAZIONE EMAIL SCADENZE & CREDITI
 * Da incollare in Google Apps Script (Estensioni > Apps Script nel tuo foglio Google)
 * 
 * Istruzioni:
 * 1. Incolla questo codice nell'editor Apps Script.
 * 2. Clicca sull'icona della Sveglia (Trigger) a sinistra.
 * 3. Aggiungi trigger: funzione "inviaNotificheGiornaliereIPTV", sorgente "Orario",
 *    frequenza "Giornaliera", intervallo "Dalle 8:00 alle 9:00" (o 9:00 - 10:00).
 */

function inviaNotificheGiornaliereIPTV() {
  var EMAIL_DESTINATARIO = "${targetEmail}";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet(); // o ss.getSheetByName("Foglio1");
  var data = sheet.getDataRange().getValues();
  
  var oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  
  var treGiorni = new Date(oggi);
  treGiorni.setDate(oggi.getDate() + 3);

  var utentiScadutiOggi = [];
  var utentiInScadenzaProssimi3gg = 0;

  // Riga 1 contiene intestazioni o totali, i dati partono dalla riga 2 (indice 1)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var username = row[0]; // Colonna A: Username
    var contatto = row[1]; // Colonna B: Contatto
    var enabled  = row[2]; // Colonna C: Enabled ('x' o attivo)
    var scadenza = row[3]; // Colonna D: Data scadenza
    var costo    = row[4]; // Colonna E: Costo mensile

    // Considera solo account attivi
    var isAttivo = (enabled === 'x' || enabled === true || enabled === 'X' || enabled === 1);
    if (!isAttivo || !scadenza || !username) continue;

    var dataScadenza = new Date(scadenza);
    dataScadenza.setHours(0, 0, 0, 0);

    // Controlla se scade esattamente oggi
    if (dataScadenza.getTime() === oggi.getTime()) {
      utentiScadutiOggi.push({
        user: username,
        contatto: contatto || "N/D",
        costo: costo || 10
      });
    }

    // Controlla se scade entro i prossimi 3 giorni
    if (dataScadenza >= oggi && dataScadenza <= treGiorni) {
      utentiInScadenzaProssimi3gg++;
    }
  }

  // 1. INVIO EMAIL SCADENZE DI OGGI
  if (utentiScadutiOggi.length > 0) {
    for (var j = 0; j < utentiScadutiOggi.length; j++) {
      var u = utentiScadutiOggi[j];
      var subject = "Scadenza IPTV";
      var body = 'Scaduto oggi IPTV di "' + u.user + '"\\n' +
                 'Nome contatto: "' + u.contatto + '"\\n' +
                 'Costo mensile: "' + u.costo + '€"';
      
      GmailApp.sendEmail(EMAIL_DESTINATARIO, subject, body);
      Logger.log("Email scadenza inviata per: " + u.user);
    }
  }

  // 2. CONTROLLO E ALERT CREDITI IN ESAURIMENTO
  // Legge i crediti disponibili dalla cella G1 (o formula crediti residui)
  var creditiDisponibili = sheet.getRange("G1").getValue() || 0;
  var fabbisognoStimato = utentiInScadenzaProssimi3gg * 3; // 3 mesi medi per rinnovo

  if (creditiDisponibili < fabbisognoStimato && utentiInScadenzaProssimi3gg > 0) {
    var subjectAlert = "⚠️ Alert Crediti IPTV in Esaurimento";
    var bodyAlert = "Attenzione,\\n\\n" +
                    "I tuoi crediti disponibili sono quasi esauriti: " + creditiDisponibili + " CR rimanenti.\\n" +
                    "Hai " + utentiInScadenzaProssimi3gg + " utenti in scadenza nei prossimi 3 giorni (fabbisogno stimato: " + fabbisognoStimato + " crediti).\\n\\n" +
                    "Ricordati di ricaricare il pacchetto crediti!";
    
    GmailApp.sendEmail(EMAIL_DESTINATARIO, subjectAlert, bodyAlert);
    Logger.log("Alert crediti inviato: " + creditiDisponibili + " rimasti.");
  }
}
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111726] border border-[#1f2a45] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1f2a45] flex items-center justify-between bg-[#0e1320]">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-[#00f0ff]" />
            <h2 className="font-mono font-bold text-white text-base">
              Automazione Email (Google Apps Script)
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
          
          <div className="p-3 rounded-xl bg-[#0a0d14] border border-[#1d273d] space-y-2 text-slate-300">
            <div className="font-bold text-[#00ff9d] flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Come attivare l'invio automatico alle ore 09:00:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>Apri il tuo foglio Google Sheets <strong className="text-white">IPTV</strong>.</li>
              <li>Dal menu in alto clicca su <strong className="text-white">Estensioni &gt; Apps Script</strong>.</li>
              <li>Cancella il contenuto esistente e incolla il codice qui sotto.</li>
              <li>Clicca sull'icona della sveglia <strong className="text-white">Trigger</strong> nel menu laterale a sinistra di Apps Script.</li>
              <li>Aggiungi un trigger: seleziona <strong className="text-white">inviaNotificheGiornaliereIPTV</strong>, evento <strong className="text-white">Guidato da data e ora</strong>, ogni giorno, intervallo <strong className="text-white">8:00 - 9:00</strong>.</li>
            </ol>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between pb-2">
              <span className="text-slate-400 uppercase text-[11px]">Codice Apps Script Pronto:</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1 rounded bg-[#1e2c4a] hover:bg-[#25375c] border border-[#00f0ff]/40 text-[#00f0ff] transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#00ff9d]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiato!' : 'Copia Codice'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-[#070a10] border border-[#1b2438] text-slate-300 overflow-x-auto text-[11px] leading-relaxed max-h-72">
              <code>{scriptCode}</code>
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
