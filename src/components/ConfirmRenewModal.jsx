import React from 'react';
import { AlertCircle, Calendar, Coins, ArrowRight, X } from 'lucide-react';
import { formatDateItalian, addMonthsToDate } from '../utils/dateUtils';

export default function ConfirmRenewModal({
  isOpen,
  onClose,
  onConfirm,
  client,
  months,
  creditsBalance
}) {
  if (!isOpen || !client) return null;

  const currentExp = client.expirationDate;
  const newExp = addMonthsToDate(currentExp, months);
  const remainingCredits = (creditsBalance || 0) - months;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111726] border border-[#1f2a45] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1f2a45] flex items-center justify-between bg-[#0e1320]">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#00f0ff]" />
            <h2 className="font-mono font-bold text-white text-base">
              Conferma Rinnovo Abbonamento
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 font-mono text-xs">
          
          <div className="p-3.5 rounded-xl bg-[#090d16] border border-[#1b253b] space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span>Account:</span>
              <strong className="text-white text-sm">{client.user}</strong>
            </div>
            {client.contactName && (
              <div className="flex justify-between items-center text-slate-400">
                <span>Contatto:</span>
                <span className="text-slate-200">{client.contactName}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-400">
              <span>Durata Rinnovo:</span>
              <strong className="text-[#00f0ff]">+{months} {months === 1 ? 'Mese' : 'Mesi'}</strong>
            </div>
          </div>

          {/* Date comparison */}
          <div className="p-3.5 rounded-xl bg-[#0e1526] border border-[#1d2c4d] flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Scadenza Attuale</div>
              <div className="text-slate-300 font-bold mt-0.5">{formatDateItalian(currentExp)}</div>
            </div>

            <ArrowRight className="w-5 h-5 text-[#00ff9d]" />

            <div className="text-right">
              <div className="text-[10px] text-[#00ff9d] uppercase font-bold">Nuova Scadenza</div>
              <div className="text-[#00ff9d] font-bold text-sm mt-0.5">{formatDateItalian(newExp)}</div>
            </div>
          </div>

          {/* Credit deduction warning */}
          <div className="p-3 rounded-xl bg-[#141d30] border border-[#233559] flex items-center justify-between text-slate-300">
            <div>
              <div>Costo operazione: <strong className="text-[#ffb700]">-{months} Crediti</strong></div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Saldo dopo il rinnovo: <strong className={remainingCredits < 0 ? 'text-[#ff3366]' : 'text-white'}>{remainingCredits} CR</strong>
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-500">
              (Possibilità di annullare in seguito)
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-[#1f2a45] bg-[#0e1320] flex items-center justify-end gap-3 font-mono text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#151c2e] text-slate-300 hover:text-white transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-lg bg-[#00ff9d] hover:bg-[#00dd87] text-black font-bold transition-all shadow-[0_0_15px_rgba(0,255,157,0.3)]"
          >
            Conferma Rinnovo (-{months} CR)
          </button>
        </div>

      </div>
    </div>
  );
}
