import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Sliders, 
  Lock, 
  Eye, 
  EyeOff, 
  Save, 
  Check, 
  Coins, 
  Euro, 
  RotateCw, 
  Smartphone 
} from 'lucide-react';
import { forceReloadApp } from '../utils/reloadApp';

export default function SettingsModal({
  isOpen,
  onClose,
  visibleColumns,
  onToggleColumn,
  tokenCost = 3,
  onChangeTokenCost,
  user
}) {
  const [costInput, setCostInput] = useState(tokenCost);
  const [isReloading, setIsReloading] = useState(false);
  const [savedCostNotice, setSavedCostNotice] = useState(false);

  if (!isOpen) return null;

  const handleSaveCost = (newVal) => {
    const val = Number(newVal);
    if (!isNaN(val) && val >= 0) {
      setCostInput(val);
      onChangeTokenCost(val);
      setSavedCostNotice(true);
      setTimeout(() => setSavedCostNotice(false), 2500);
    }
  };

  const handleForceReload = async () => {
    setIsReloading(true);
    await forceReloadApp();
  };

  const fields = [
    {
      id: 'user',
      label: 'Username Account',
      description: 'Identificativo dell\'abbonamento IPTV',
      isMandatory: true,
      visible: true
    },
    {
      id: 'expirationDate',
      label: 'Data di Scadenza',
      description: 'Giorno e mese di scadenza del servizio',
      isMandatory: true,
      visible: true
    },
    {
      id: 'isActive',
      label: 'Stato (Attivo / Inattivo)',
      description: 'Indicatore se l\'abbonamento è abilitato o disattivato',
      isMandatory: true,
      visible: true
    },
    {
      id: 'contactName',
      label: 'Nome Contatto & Chat',
      description: 'Nome della persona e link rapido WhatsApp / Telegram',
      isMandatory: false,
      visible: visibleColumns.contactName ?? true
    },
    {
      id: 'monthlyCost',
      label: 'Costo Mensile (€)',
      description: 'Prezzo concordato per mese (es. 10€)',
      isMandatory: false,
      visible: visibleColumns.monthlyCost ?? true
    },
    {
      id: 'notes',
      label: 'Note Aggiuntive',
      description: 'Promemoria, dettagli accordo o dispositivi collegati',
      isMandatory: false,
      visible: visibleColumns.notes ?? true
    },
    {
      id: 'totalCreditsUsed',
      label: 'Storico Crediti Consumati',
      description: 'Totale dei mesi/crediti rinnovati per questo account',
      isMandatory: false,
      visible: visibleColumns.totalCreditsUsed ?? false
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111726] border border-[#1f2a45] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1f2a45] flex items-center justify-between bg-[#0e1320] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#00ff9d]" />
            <h2 className="font-mono font-bold text-white text-base">
              Impostazioni Personali
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
        <div className="p-5 space-y-5 font-mono text-xs overflow-y-auto flex-1">
          
          {/* Sezione 1: Costo Token / Credito (Personalizzabile) */}
          <div className="p-4 rounded-xl bg-[#0a0f1c] border border-[#1d2b45] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xs uppercase tracking-wider">
                    Costo di Acquisto Credito / Token
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Prezzo che paghi per ciascun credito al fornitore
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <span className="text-sm font-bold text-[#00ff9d]">€{tokenCost}</span>
                <span className="text-[10px] text-slate-500 block">/ credito</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Questo valore viene utilizzato per calcolare il tuo reale <strong>Incasso Netto Mensile</strong>: 
              <span className="text-slate-300 font-mono"> Lordo − (Utenti Attivi × {tokenCost}€)</span>.
            </p>

            {/* Quick buttons & Custom input */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {[3, 4, 5, 6].map((cost) => (
                <button
                  key={cost}
                  type="button"
                  onClick={() => handleSaveCost(cost)}
                  className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
                    Number(tokenCost) === cost
                      ? 'bg-[#00ff9d] text-black border-[#00ff9d] shadow-[0_0_10px_rgba(0,255,157,0.3)]'
                      : 'bg-[#121a2c] text-slate-300 border-[#1f2d4d] hover:bg-[#1a263f] hover:text-white'
                  }`}
                >
                  €{cost} {cost === 3 ? '(Mirko)' : cost === 5 ? '(Amico)' : ''}
                </button>
              ))}

              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[11px] text-slate-400">Altro:</span>
                <div className="relative w-20">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={costInput}
                    onChange={(e) => setCostInput(e.target.value)}
                    onBlur={(e) => handleSaveCost(e.target.value)}
                    className="w-full bg-[#080c16] border border-[#233559] focus:border-[#00ff9d] rounded-lg px-2 py-1 text-white text-xs outline-none text-center font-bold"
                  />
                  <span className="absolute right-2 top-1 text-slate-500 text-[10px]">€</span>
                </div>
              </div>
            </div>

            {savedCostNotice && (
              <div className="text-[#00ff9d] text-[10px] font-bold animate-pulse flex items-center gap-1">
                <Check className="w-3 h-3" /> Costo token aggiornato con successo!
              </div>
            )}
          </div>

          {/* Sezione 2: Ricarica App da Smartphone / iPhone */}
          <div className="p-4 rounded-xl bg-[#0a0f1c] border border-[#1d2b45] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#00ff9d]/10 border border-[#00ff9d]/30 text-[#00ff9d] flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xs uppercase tracking-wider">
                    Aggiornamento App (iPhone / Mobile)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Svuota la cache di Safari/Chrome e scarica l'ultima versione
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Su iPhone Safari spesso rimangono in memoria i file precedenti. Premi questo pulsante per forzare il download immediato dell'ultima versione aggiornata.
            </p>

            <button
              type="button"
              onClick={handleForceReload}
              className="w-full py-2.5 px-4 rounded-xl bg-[#142035] hover:bg-[#00ff9d] hover:text-black border border-[#00ff9d]/40 text-[#00ff9d] font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(0,255,157,0.15)]"
            >
              <RotateCw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
              <span>Ricarica e Aggiorna App Ora</span>
            </button>
          </div>

          {/* Sezione 3: Visibilità Colonne */}
          <div className="space-y-2">
            <div className="text-slate-400 text-xs uppercase tracking-wider font-bold">
              Visibilità Colonne e Campi
            </div>

            <div className="space-y-2">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    field.isMandatory
                      ? 'bg-[#0a0d14]/60 border-[#1a2336] opacity-75'
                      : field.visible
                      ? 'bg-[#0f172a] border-[#00ff9d]/30'
                      : 'bg-[#0a0d14] border-[#1a2336]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{field.label}</span>
                      {field.isMandatory && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#162035] text-[#00f0ff] border border-[#00f0ff]/30">
                          <Lock className="w-2.5 h-2.5" />
                          Obbligatorio
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                      {field.description}
                    </div>
                  </div>

                  {field.isMandatory ? (
                    <div className="w-9 h-9 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-500">
                      <Check className="w-4 h-4 text-[#00ff9d]" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggleColumn(field.id)}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                        field.visible ? 'bg-[#00ff9d]' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`bg-black w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          field.visible ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1f2a45] bg-[#0e1320] flex items-center justify-between font-mono text-xs flex-shrink-0">
          <span className="text-slate-500 text-[11px]">
            {user ? `Profilo: ${user.email}` : 'Salvataggio locale'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#00ff9d] hover:bg-[#00dd87] text-black font-bold transition-all shadow-[0_0_10px_rgba(0,255,157,0.3)]"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
}
