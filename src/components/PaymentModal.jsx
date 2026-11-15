import React, { useState, useEffect } from 'react';
import { X, Euro, CheckCircle2, AlertCircle, Clock, FileText } from 'lucide-react';

export default function PaymentModal({
  isOpen,
  onClose,
  client,
  onSavePayment
}) {
  if (!isOpen || !client) return null;

  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [amountDue, setAmountDue] = useState(10);
  const [paymentNote, setPaymentNote] = useState('');

  useEffect(() => {
    if (client) {
      setPaymentStatus(client.paymentStatus || 'paid');
      setAmountDue(client.amountDue !== undefined ? client.amountDue : (client.monthlyCost || 10));
      setPaymentNote(client.paymentNote || '');
    }
  }, [client, isOpen]);

  const handleMarkAsPaid = () => {
    onSavePayment(client.id, {
      paymentStatus: 'paid',
      amountDue: 0,
      paymentNote: ''
    });
    onClose();
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSavePayment(client.id, {
      paymentStatus,
      amountDue: paymentStatus === 'paid' ? 0 : (Number(amountDue) || 0),
      paymentNote: paymentNote.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111726] border border-[#1f2a45] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1f2a45] flex items-center justify-between bg-[#0e1320]">
          <div className="flex items-center gap-2">
            <Euro className="w-5 h-5 text-[#ffb700]" />
            <h2 className="font-mono font-bold text-white text-base">
              Gestione Pagamento
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
        <form onSubmit={handleSave} className="p-5 space-y-4 font-mono text-xs">
          
          {/* Client summary */}
          <div className="p-3.5 rounded-xl bg-[#090d16] border border-[#1b253b] space-y-1.5">
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
              <span>Costo mensile:</span>
              <span className="text-[#00f0ff] font-bold">{client.monthlyCost || 10}€</span>
            </div>
          </div>

          {/* Quick Mark as Paid Button */}
          {client.paymentStatus === 'unpaid' && (
            <button
              type="button"
              onClick={handleMarkAsPaid}
              className="w-full py-2.5 px-4 rounded-xl bg-[#00ff9d] hover:bg-[#00dd87] text-black font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,255,157,0.25)]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Segna come Tutto Pagato (Saldo €0)</span>
            </button>
          )}

          {/* Payment Status Selector */}
          <div>
            <label className="text-slate-400 block mb-2 font-bold uppercase tracking-wider text-[11px]">
              Stato Pagamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentStatus('paid')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  paymentStatus === 'paid'
                    ? 'bg-[#00ff9d]/20 border-[#00ff9d] text-[#00ff9d] font-bold'
                    : 'bg-[#090d16] border-[#1b253b] text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>In Regola / Pagato</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('unpaid')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  paymentStatus === 'unpaid'
                    ? 'bg-[#ff3366]/20 border-[#ff3366] text-[#ff3366] font-bold'
                    : 'bg-[#090d16] border-[#1b253b] text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Da Saldare</span>
              </button>
            </div>
          </div>

          {/* Amount Due (visible if unpaid) */}
          {paymentStatus === 'unpaid' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-[#140b12] border border-[#ff3366]/30 animate-in fade-in">
              <div>
                <label className="text-slate-300 block mb-1 text-[11px]">
                  Importo da Saldate (€):
                </label>
                <div className="relative">
                  <Euro className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amountDue}
                    onChange={(e) => setAmountDue(e.target.value)}
                    placeholder="Es. 30"
                    className="w-full bg-[#080b12] border border-[#2a1723] focus:border-[#ff3366] rounded-lg pl-9 pr-3 py-2 text-white font-mono text-sm outline-none"
                    required
                  />
                </div>
              </div>

              {/* Quick suggestions */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">Rapidi:</span>
                {[10, 20, 30, 60, 100, 120].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountDue(amt)}
                    className="px-2 py-0.5 rounded bg-[#1e101d] text-[#ff80a0] border border-[#ff3366]/30 text-[10px] hover:bg-[#ff3366]/20"
                  >
                    €{amt}
                  </button>
                ))}
              </div>

              {/* Note */}
              <div>
                <label className="text-slate-300 block mb-1 text-[11px]">
                  Nota pagamento (opzionale):
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Es. ha dato 10€, mancano 20€ entro fine mese"
                  className="w-full bg-[#080b12] border border-[#2a1723] focus:border-[#ff3366] rounded-lg px-3 py-2 text-white font-mono text-xs outline-none"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#00ff9d] hover:bg-[#00dd87] text-black font-bold transition-all"
            >
              Salva Stato
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
