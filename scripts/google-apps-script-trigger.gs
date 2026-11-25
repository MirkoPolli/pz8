/**
 * PZ8 MANAGER - TRIGGER GIORNALIERO EMAIL SCADENZE (Google Apps Script)
 *
 * Avvia ogni mattina intorno alle 09:00 (ora italiana Europe/Rome)
 * il workflow GitHub Actions "daily-check.yml", che controlla le scadenze
 * su Firebase e invia le email tramite Resend senza i ritardi dello scheduler GitHub.
 *
 * ISTRUZIONI RAPIDE:
 * 1. Vai su https://script.google.com e crea un "Nuovo progetto".
 * 2. Incolla questo codice e sostituisci GITHUB_TOKEN con il tuo token GitHub
 *    (es. Fine-Grained Token con permesso "Actions: Read and write" sul repo MirkoPolli/pz8).
 * 3. Salva (Ctrl+S / Cmd+S).
 * 4. Nel menu funzioni in alto seleziona "installaTriggerGiornaliero" ed esegui ("Esegui").
 *    Accetta le autorizzazioni Google richieste la prima volta.
 * 5. Per fare un test immediato delle email, seleziona "testaInvioOra" e clicca "Esegui".
 */

var GITHUB_OWNER = 'MirkoPolli';
var GITHUB_REPO = 'pz8';
var WORKFLOW_FILE = 'daily-check.yml';
var GITHUB_BRANCH = 'main';
var GITHUB_TOKEN = 'INCOLLA_QUI_IL_TUO_GITHUB_TOKEN';

/**
 * Funzione chiamata automaticamente ogni mattina dal trigger.
 * Invia le notifiche di oggi (con protezione anti-duplicato giornaliero).
 */
function avviaControlloScadenzePZ8() {
  avviaWorkflow_(false);
}

/**
 * Funzione manuale per testare subito l'invio (forza il reinvio anche se già eseguito oggi).
 */
function testaInvioOra() {
  avviaWorkflow_(true);
}

/**
 * Crea (o ricrea senza duplicati) il trigger giornaliero alle ~09:00 Europe/Rome.
 */
function installaTriggerGiornaliero() {
  rimuoviTriggerGiornaliero();

  ScriptApp.newTrigger('avviaControlloScadenzePZ8')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .nearMinute(0)
    .inTimezone('Europe/Rome')
    .create();

  Logger.log('✓ Trigger giornaliero installato: esecuzione prevista ogni giorno intorno alle 09:00 (Europe/Rome).');
}

/**
 * Rimuove tutti i trigger collegati ad avviaControlloScadenzePZ8.
 */
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

/**
 * Chiama le API GitHub per avviare workflow_dispatch su daily-check.yml.
 */
function avviaWorkflow_(forceResend) {
  if (!GITHUB_TOKEN || GITHUB_TOKEN === 'INCOLLA_QUI_IL_TUO_GITHUB_TOKEN') {
    throw new Error('Devi prima inserire il tuo GITHUB_TOKEN nella variabile GITHUB_TOKEN in cima allo script.');
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
