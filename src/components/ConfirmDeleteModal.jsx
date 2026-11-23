import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { formatDateItalian } from '../utils/dateUtils';

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  client
}) {
  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111726] border border-[#ff3366]/40 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2a1723] flex items-center justify-between bg-[#140b12]">
          <div className="flex items-center gap-2 text-[#ff3366]">
            <Trash2 className="w-5 h-5" />
            <h2 className="font-mono font-bold text-white text-base">
              Elimina Account
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
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#1c0f18] border border-[#ff3366]/30 text-slate-300">
            <AlertTriangle className="w-5 h-5 text-[#ff3366] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Sei sicuro di voler eliminare questo account?</p>
              <p className="mt-1 text-slate-400">
                L'account <strong className="text-white">"{client.user}"</strong> verrà rimosso definitivamente.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#080d17] border border-[#1b253b] space-y-1 text-slate-400">
            {client.contactName && (
              <div>Referente: <span className="text-white">{client.contactName}</span></div>
            )}
            <div>Scadenza: <span className="text-slate-200">{formatDateItalian(client.expirationDate)}</span></div>
            <div>Costo: <span className="text-[#00f0ff] font-bold">{client.monthlyCost || 10}€</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1f2a45] bg-[#0e1320] flex items-center justify-end gap-2 font-mono text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={() => {
              onConfirm(client.id);
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-[#ff3366] hover:bg-[#ff1a53] text-white font-bold transition-all shadow-[0_0_12px_rgba(255,51,102,0.3)]"
          >
            Sì, Elimina
          </button>
        </div>

      </div>
    </div>
  );
}
