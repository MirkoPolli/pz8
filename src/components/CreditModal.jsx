import React, { useState } from 'react';
import { 
  X, 
  Coins, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Calculator,
  ShieldCheck,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

export default function CreditModal({ 
  isOpen, 
  onClose, 
  creditData, 
  onAddCredits,
  activeClientsCount,
  monthlyRevenue
}) {
  const [customAmount, setCustomAmount] = useState(200);

  if (!isOpen) return null;

  const currentBalance = creditData.creditsBalance || 0;
  const unitCost = creditData.creditCostUnit || 3.0;

  // History sorted newest first
  const history = [...(creditData.history || [])].reverse();

  const handleQuickAdd200 = () => {
    onAddCredits(200, 200 * unitCost, "Ricarica rapida pacchetto 200 crediti");
  };

  const handleCustomAdd = (e) => {
    e.preventDefault();
    const qty = parseInt(customAmount, 10);
    if (!qty || qty <= 0) return;
    onAddCredits(qty, qty * unitCost, `Ricarica personalizzata +${qty} crediti`);
    setCustomAmount(200);
  };

  // Calculate cumulative stats
  const totalPurchased = (creditData.history || [])
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalSpent = (creditData.history || [])
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + (t.cost || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111726] border border-[#1f2a45] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1f2a45] flex items-center justify-between bg-[#0e1320]">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#00ff9d]" />
            <h2 className="font-mono font-bold text-white text-base">
              Gestione Saldo Crediti (Admin)
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
        <div className="p-5 overflow-y-auto space-y-5">
          
          {/* Big Balance Showcase */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#0c1322] to-[#121c33] border border-[#1f2d4d] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                Crediti Disponibili
              </div>
              <div className="text-4xl font-mono font-extrabold text-[#00ff9d] mt-1 flex items-baseline gap-2">
                <span>{currentBalance}</span>
                <span className="text-sm font-normal text-slate-400">CR (valore: {(currentBalance * unitCost).toFixed(2)}€)</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Costo fisso per credito: <span className="text-white font-mono">3,00 €</span>
              </div>
            </div>

            {/* Quick 200 credits button */}
            <button
              onClick={handleQuickAdd200}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#00ff9d] hover:bg-[#00dd87] text-black font-mono font-bold text-sm transition-all shadow-[0_0_20px_rgba(0,255,157,0.3)] hover:scale-105"
            >
              +200 Crediti (600€)
            </button>
          </div>

          {/* Custom Recharge Form */}
          <div className="p-4 rounded-xl bg-[#0a0d14] border border-[#1b253b] space-y-2">
            <div className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-[#00f0ff]" />
              <span>Ricarica Personalizzata</span>
            </div>
            
            <form onSubmit={handleCustomAdd} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Quantità crediti"
                  className="w-full bg-[#111726] border border-[#1f2a45] focus:border-[#00f0ff] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-400">
                  = {(customAmount * unitCost).toFixed(2)} €
                </span>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#162035] hover:bg-[#1f2d4a] border border-[#00f0ff]/50 text-[#00f0ff] font-mono text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Aggiungi</span>
              </button>
            </form>
          </div>

          {/* Performance & Revenue summary */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-[#0e1424] border border-[#1b253b]">
              <div className="text-slate-500 uppercase">Totale Crediti Acquistati</div>
              <div className="text-lg font-bold text-white mt-0.5">{totalPurchased} CR</div>
              <div className="text-slate-400 text-[10px]">Spesa totale: € {totalSpent.toFixed(2)}</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0e1424] border border-[#1b253b]">
              <div className="text-slate-500 uppercase">Incasso Mensile Clienti</div>
              <div className="text-lg font-bold text-[#00f0ff] mt-0.5">€ {monthlyRevenue.toFixed(2)}</div>
              <div className="text-slate-400 text-[10px]">Su {activeClientsCount} utenze attive</div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-400" />
              <span>Ultime Transazioni</span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {history.length === 0 ? (
                <div className="text-center py-4 text-xs font-mono text-slate-500">
                  Nessuna transazione registrata
                </div>
              ) : (
                history.map((tx) => (
                  <div 
                    key={tx.id || Math.random()} 
                    className="p-2.5 rounded-lg bg-[#0a0d14] border border-[#182236] flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      {tx.type === 'purchase' ? (
                        <div className="w-6 h-6 rounded bg-[#00ff9d]/10 text-[#00ff9d] flex items-center justify-center">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded bg-[#ff3366]/10 text-[#ff3366] flex items-center justify-center">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div>
                        <div className="text-slate-200 font-semibold">{tx.description}</div>
                        <div className="text-[10px] text-slate-500">
                          {tx.timestamp ? new Date(tx.timestamp).toLocaleString('it-IT') : '-'}
                        </div>
                      </div>
                    </div>

                    <div className={`text-right font-bold ${tx.type === 'purchase' ? 'text-[#00ff9d]' : 'text-[#ff3366]'}`}>
                      {tx.type === 'purchase' ? `+${tx.amount}` : `-${tx.amount}`} CR
                    </div>
                  </div>
                ))
              )}
            </div>
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
