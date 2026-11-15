import React from 'react';
import { X, Settings, Sliders, Lock, Eye, EyeOff, Save, Check } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  visibleColumns,
  onToggleColumn,
  user
}) {
  if (!isOpen) return null;

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
      label: 'Nome Contatto & WhatsApp',
      description: 'Nome della persona e link rapido alla chat WhatsApp',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111726] border border-[#1f2a45] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1f2a45] flex items-center justify-between bg-[#0e1320]">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#00ff9d]" />
            <h2 className="font-mono font-bold text-white text-base">
              Impostazioni Visualizzazione Campi
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
        <div className="p-5 space-y-4 font-mono text-xs">
          
          <div className="p-3 rounded-xl bg-[#0a0d14] border border-[#1d273d] text-slate-400">
            Personalizza quali colonne e informazioni visualizzare nella tua vista. 
            Queste impostazioni sono <strong className="text-white">personali e separate</strong> tra te e il tuo amico.
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
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

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1f2a45] bg-[#0e1320] flex items-center justify-between font-mono text-xs">
          <span className="text-slate-500 text-[11px]">
            {user ? `Salvato su profilo: ${user.email}` : 'Salvato localmente nel browser'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#00ff9d] hover:bg-[#00dd87] text-black font-bold transition-all shadow-[0_0_10px_rgba(0,255,157,0.3)]"
          >
            Fatto
          </button>
        </div>

      </div>
    </div>
  );
}
