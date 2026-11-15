import React from 'react';
import { 
  Users, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  ShieldAlert,
  Coins
} from 'lucide-react';

export default function StatsBar({ 
  clients, 
  creditsBalance, 
  onFilterExpiring, 
  onFilterUnpaid,
  onOpenCreditModal,
  isAdmin = true,
  tokenCost = 3
}) {
  const activeClients = clients.filter(c => c.isActive);
  
  // Unpaid clients
  const unpaidClients = clients.filter(c => c.paymentStatus === 'unpaid' && (Number(c.amountDue) > 0));
  const totalAmountDue = unpaidClients.reduce((sum, c) => sum + (Number(c.amountDue) || 0), 0);
  
  // Clients expiring in <= 3 days (including today)
  const expiringClients = activeClients.filter(c => {
    if (!c.expirationDate) return false;
    const exp = new Date(c.expirationDate);
    exp.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((exp - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  });

  // Clients already expired
  const expiredClients = activeClients.filter(c => {
    if (!c.expirationDate) return false;
    const exp = new Date(c.expirationDate);
    exp.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp < today;
  });

  // Total monthly revenue (net of configurable token cost, e.g. 3€ or 5€)
  const creditCostPerMonth = Number(tokenCost) || 3;
  const monthlyGross = activeClients.reduce((sum, c) => sum + (Number(c.monthlyCost) || 0), 0);
  const monthlyCreditCost = activeClients.length * creditCostPerMonth;
  const monthlyRevenue = monthlyGross - monthlyCreditCost;

  // Expected credits requirement (3 credits per expiring account)
  const creditsNeededNext3Days = expiringClients.length * 3;
  const isCreditShortage = creditsBalance < creditsNeededNext3Days;

  return (
    <div className="space-y-3">
      {/* Shortage Warning Banner (Admin Only) */}
      {isAdmin && isCreditShortage && (
        <div className="p-3 rounded-xl bg-[#ff3366]/10 border border-[#ff3366]/50 flex items-center justify-between gap-3 text-sm font-mono text-[#ff3366] neon-glow-red animate-pulse">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>
              <strong>ALERT CREDITI:</strong> Hai {creditsBalance} crediti rimasti ma ci sono {expiringClients.length} utenti in scadenza nei prossimi 3 giorni (fabbisogno stimato: {creditsNeededNext3Days} crediti)!
            </span>
          </div>
          <button
            onClick={onOpenCreditModal}
            className="px-3 py-1 bg-[#ff3366] text-white font-bold rounded-lg hover:bg-[#ff1a53] transition-all flex-shrink-0 text-xs"
          >
            Ricarica +200 CR
          </button>
        </div>
      )}

      {/* Unpaid Alert Banner (Se ci sono pagamenti in sospeso) */}
      {totalAmountDue > 0 && (
        <div className="p-3 rounded-xl bg-[#ff3366]/10 border border-[#ff3366]/30 flex items-center justify-between gap-3 text-xs font-mono text-[#ff6b8b]">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#ff3366] flex-shrink-0" />
            <span>
              Hai <strong>€{totalAmountDue}</strong> da riscuotere da <strong>{unpaidClients.length}</strong> {unpaidClients.length === 1 ? 'cliente' : 'clienti'}.
            </span>
          </div>
          <button
            onClick={onFilterUnpaid}
            className="px-2.5 py-1 bg-[#ff3366]/20 hover:bg-[#ff3366] hover:text-white border border-[#ff3366]/40 text-white font-bold rounded-lg transition-all text-xs"
          >
            Mostra da Saldare →
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className={`grid grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3`}>
        
        {/* Active Accounts */}
        <div className="p-3.5 rounded-xl bg-[#111726] border border-[#1d263b] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Account Attivi</div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-white mt-1">
              {activeClients.length} <span className="text-xs font-normal text-slate-500">/ {clients.length}</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#00ff9d]/10 border border-[#00ff9d]/30 text-[#00ff9d] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Expiring Soon (3 days) */}
        <div 
          onClick={onFilterExpiring}
          className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
            expiringClients.length > 0 
              ? 'bg-[#ffb700]/10 border-[#ffb700]/50 hover:bg-[#ffb700]/20' 
              : 'bg-[#111726] border-[#1d263b]'
          }`}
        >
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">In Scadenza (≤3 gg)</div>
            <div className={`text-xl sm:text-2xl font-mono font-bold mt-1 ${expiringClients.length > 0 ? 'text-[#ffb700]' : 'text-slate-300'}`}>
              {expiringClients.length}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#ffb700]/10 border border-[#ffb700]/30 text-[#ffb700] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Available Credits (Admin Only) */}
        {isAdmin && (
          <div 
            onClick={onOpenCreditModal}
            className="p-3.5 rounded-xl bg-[#111726] border border-[#1d263b] hover:border-[#00ff9d]/50 cursor-pointer flex items-center justify-between transition-all"
          >
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Saldo Crediti</div>
              <div className="text-xl sm:text-2xl font-mono font-bold text-[#00ff9d] mt-1 flex items-center gap-1">
                {creditsBalance} <span className="text-xs font-normal text-slate-500">CR</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#00ff9d]/10 border border-[#00ff9d]/30 text-[#00ff9d] flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </div>
        )}

        {/* Monthly Revenue */}
        <div className="p-3.5 rounded-xl bg-[#111726] border border-[#1d263b] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Incasso Netto/Mese</div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-[#00f0ff] mt-1">
              € {monthlyRevenue.toLocaleString('it-IT', { minimumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
              lordo €{monthlyGross} − crediti €{monthlyCreditCost} ({creditCostPerMonth}€/credito)
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

      </div>
    </div>
  );
}
