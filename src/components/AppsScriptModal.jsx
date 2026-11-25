import React, { useState } from 'react';
import { X, Copy, Check, FileCode, Clock } from 'lucide-react';

export default function AppsScriptModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const scriptCode = `/**
 * PZ8 MANAGER - TRIGGER GIORNALIERO EMAIL SCADENZE (Google Apps Script)
 * Avvia ogni mattina intorno alle 09:00 (Europe/Rome) il workflow GitHub Actions
 * "daily-check.yml" (Firebase + Resend), evitando i ritardi dello scheduler GitHub.
 */

var GITHUB_OWNER = 'MirkoPolli';
var GITHUB_REPO = 'pz8';
var WORKFLOW_FILE = 'daily-check.yml';
var GITHUB_BRANCH = 'main';
var GITHUB_TOKEN = 'INCOLLA_QUI_IL_TUO_GITHUB_TOKEN';

function avviaControlloScadenzePZ8() {
  avviaWorkflow_(false);
}

function testaInvioOra() {
  avviaWorkflow_(true);
}

function installaTriggerGiornaliero() {
  rimuoviTriggerGiornaliero();

  ScriptApp.newTrigger('avviaControlloScadenzePZ8')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .nearMinute(0)
    .inTimezone('Europe/Rome')
    .create();

  Logger.log('✓ Trigger giornaliero installato: esecuzione prevista ogni giorno alle ~09:00 (Europe/Rome).');
}

function rimuoviTriggerGiornaliero() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'avviaControlloScadenzePZ8') {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }
  if (removed > 0) {
    Logger.log('Rimossi ' + removed + ' trigger precedenti.');
  }
}

function avviaWorkflow_(forceResend) {
  if (!GITHUB_TOKEN || GITHUB_TOKEN === 'INCOLLA_QUI_IL_TUO_GITHUB_TOKEN') {
    throw new Error('Devi prima inserire il tuo GITHUB_TOKEN in cima allo script.');
  }

  var url = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO +
            '/actions/workflows/' + WORKFLOW_FILE + '/dispatches';

  var payload = {
    ref: GITHUB_BRANCH,
    inputs: {
      force_resend: forceResend ? 'true' : 'false'
    }
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + GITHUB_TOKEN,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'PZ8-AppsScript-Trigger'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var code = response.getResponseCode();

  if (code === 204) {
    Logger.log('✓ Workflow "' + WORKFLOW_FILE + '" avviato con successo (force_resend=' + payload.inputs.force_resend + ').');
  } else {
    throw new Error('Errore avvio workflow GitHub (HTTP ' + code + '): ' + response.getContentText());
  }
}
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111726] border border-[#1f2a45] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1f2a45] flex items-center justify-between bg-[#0e1320]">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-[#00f0ff]" />
            <h2 className="font-mono font-bold text-white text-base">
              Trigger Email 09:00 (Google Apps Script → Resend)
            </h2>
          </div>
          <button 
            type="button"
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
              <Clock className="w-4 h-4" />
              <span>Configurazione in 6 passi per ricevere le email puntuali alle ~09:00:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-400 leading-relaxed">
              <li>Apri <strong className="text-white">script.google.com</strong> con il tuo account Google e clicca <strong className="text-white">Nuovo progetto</strong>.</li>
              <li>Cancella il testo iniziale e incolla tutto il codice qui sotto.</li>
              <li>Sostituisci <strong className="text-[#ffb700]">INCOLLA_QUI_IL_TUO_GITHUB_TOKEN</strong> con il tuo token GitHub (permesso <em>Actions: Read and write</em> su <strong className="text-white">MirkoPolli/pz8</strong>).</li>
              <li>Salva il progetto (<strong className="text-white">Cmd+S / Ctrl+S</strong>).</li>
              <li>Dal menu in alto seleziona <strong className="text-white">installaTriggerGiornaliero</strong>, clicca <strong className="text-white">Esegui</strong> e accetta le autorizzazioni Google richieste.</li>
              <li>Facoltativo: per fare un test immediato seleziona <strong className="text-white">testaInvioOra</strong> e clicca <strong className="text-white">Esegui</strong>.</li>
            </ol>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between pb-2">
              <span className="text-slate-400 uppercase text-[11px]">Codice Google Apps Script:</span>
              <button
                type="button"
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
            type="button"
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
