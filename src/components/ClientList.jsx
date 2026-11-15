import React, { useState } from 'react';
import { 
  Search, 
  MessageCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  CalendarPlus, 
  Edit2, 
  Trash2, 
  AlertTriangle,
  Coins,
  ChevronRight,
  Filter,
  RotateCcw,
  Send,
  Euro,
  Check
} from 'lucide-react';
import { 
  formatDateItalian, 
  getDaysDifference, 
  isExpired, 
  isExpiringSoon 
} from '../utils/dateUtils';

export default function ClientList({ 
  clients, 
  onRequestRenew, 
  onUndoRenew,
  onEdit, 
  onDelete, 
  onToggleActive,
  filterTab,
  setFilterTab,
  creditsBalance,
  isAdmin = true,
  visibleColumns = { contactName: true, monthlyCost: true, notes: true, totalCreditsUsed: false },
  onQuickPay,
  onOpenPaymentModal
}) {
  const [search, setSearch] = useState('');

  // Clean phone number for WhatsApp
  const getWhatsAppUrl = (phone, contactName, user, expirationDate) => {
    if (!phone) return null;
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 10 && !clean.startsWith('39')) {
      clean = '39' + clean;
    }
    const message = encodeURIComponent(
      `Ciao ${contactName || user}, ti ricordo che il tuo abbonamento IPTV scade il ${formatDateItalian(expirationDate)}. Fammi sapere se desideri rinnovare!`
    );
    return `https://wa.me/${clean}?text=${message}`;
  };

  // Telegram helper
  const getTelegramUrl = (telegram) => {
    if (!telegram) return null;
    const t = telegram.trim();
    if (!t) return null;
    if (t.startsWith('http://') || t.startsWith('https://')) return t;
    const username = t.replace(/^@/, '').replace(/^t\.me\//, '');
    return `https://t.me/${username}`;
  };

  // Calcolo totale crediti da riscuotere / pagamenti in sospeso
  const unpaidClients = clients.filter(c => c.paymentStatus === 'unpaid' && (Number(c.amountDue) > 0));
  const totalAmountDue = unpaidClients.reduce((sum, c) => sum + (Number(c.amountDue) || 0), 0);

  // Filter clients
  const filteredClients = clients.filter(c => {
    // Search text match
    const s = search.toLowerCase();
    const matchSearch = 
      (c.user || '').toLowerCase().includes(s) ||
      (c.contactName || '').toLowerCase().includes(s) ||
      (c.phone || '').includes(s) ||
      (c.telegram || '').toLowerCase().includes(s);

    if (!matchSearch) return false;

    // Tab filter
    if (filterTab === 'all') return true;
    if (filterTab === 'expiring') {
      return c.isActive && isExpiringSoon(c.expirationDate, 3);
    }
    if (filterTab === 'expired') {
      return c.isActive && isExpired(c.expirationDate);
    }
    if (filterTab === 'unpaid') {
      return c.paymentStatus === 'unpaid' && (Number(c.amountDue) > 0);
    }
    if (filterTab === 'active') {
      return c.isActive;
    }
    if (filterTab === 'inactive') {
      return !c.isActive;
    }
    return true;
  });

  // Sort clients by expiration date ascending (earliest expiring first)
  const sortedClients = [...filteredClients].sort((a, b) => {
    if (!a.expirationDate && !b.expirationDate) return 0;
    if (!a.expirationDate) return 1;
    if (!b.expirationDate) return -1;
    return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
  });

  return (
    <div className="space-y-4">
      
      {/* Controls Bar: Search & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0d121f] p-3 rounded-xl border border-[#1b253b]">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per username, contatto, tel o telegram..."
            className="w-full bg-[#080b12] border border-[#1e2a42] focus:border-[#00ff9d] rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-white outline-none transition-colors"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-xs font-mono">
          {[
            { id: 'all', label: 'Tutti' },
            { id: 'expiring', label: 'In Scadenza (≤3gg)', highlight: true },
            { id: 'expired', label: 'Scaduti' },
            { 
              id: 'unpaid', 
              label: `Da Saldare (€${totalAmountDue})`, 
              isRed: totalAmountDue > 0, 
              badge: unpaidClients.length 
            },
            { id: 'active', label: 'Attivi' },
            { id: 'inactive', label: 'Disattivi' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                filterTab === tab.id
                  ? tab.isRed
                    ? 'bg-[#ff3366]/20 text-[#ff3366] border border-[#ff3366]/60 font-bold'
                    : tab.highlight 
                    ? 'bg-[#ffb700]/20 text-[#ffb700] border border-[#ffb700]/50 font-bold'
                    : 'bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/50 font-bold'
                  : tab.isRed
                  ? 'text-[#ff6b8b] hover:bg-[#ff3366]/10 border border-[#ff3366]/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#131b2d] border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* Counter (Rimosso Saldo Crediti a destra) */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
        <span>Risultati visualizzati: <strong className="text-white">{sortedClients.length}</strong></span>
        {totalAmountDue > 0 && (
          <span className="text-[#ff6b8b]">
            Totale da riscuotere: <strong className="text-[#ff3366]">€{totalAmountDue}</strong> ({unpaidClients.length} {unpaidClients.length === 1 ? 'cliente' : 'clienti'})
          </span>
        )}
      </div>

      {/* --- DESKTOP TABLE VIEW --- */}
      <div className="hidden md:block rounded-xl border border-[#1b253b] bg-[#0d121f] overflow-hidden">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#090d16] border-b border-[#1b253b] text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Stato</th>
              <th className="py-3 px-4">Username Account</th>
              {visibleColumns.contactName !== false && (
                <th className="py-3 px-4">Contatto & Chat</th>
              )}
              <th className="py-3 px-4">Scadenza</th>
              {visibleColumns.monthlyCost !== false && (
                <th className="py-3 px-4">Costo</th>
              )}
              <th className="py-3 px-4">Pagamento</th>
              {visibleColumns.totalCreditsUsed && (
                <th className="py-3 px-4">Tot. Crediti</th>
              )}
              <th className="py-3 px-4 text-center">Rinnova (Conferma)</th>
              <th className="py-3 px-4 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#172033]">
            {sortedClients.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-8 text-center text-slate-500 font-mono">
                  Nessun utente trovato con i filtri attuali.
                </td>
              </tr>
            ) : (
              sortedClients.map((client) => {
                const daysDiff = getDaysDifference(client.expirationDate);
                const expired = isExpired(client.expirationDate);
                const expiring = isExpiringSoon(client.expirationDate, 3);
                const waUrl = getWhatsAppUrl(client.phone, client.contactName, client.user, client.expirationDate);
                const tgUrl = getTelegramUrl(client.telegram);
                const isUnpaid = client.paymentStatus === 'unpaid' && (Number(client.amountDue) > 0);

                return (
                  <tr 
                    key={client.id}
                    className={`hover:bg-[#121929]/70 transition-colors ${
                      !client.isActive ? 'opacity-50' : ''
                    } ${isUnpaid ? 'bg-[#ff3366]/[0.03]' : ''}`}
                  >
                    {/* Active Toggle */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onToggleActive(client.id)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          client.isActive 
                            ? 'bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {client.isActive ? 'ATTIVO' : 'OFF'}
                      </button>
                    </td>

                    {/* Username */}
                    <td className="py-3 px-4 font-bold text-white">
                      {client.user}
                      {visibleColumns.notes !== false && client.notes && (
                        <div className="text-[10px] text-slate-400 font-normal font-sans truncate max-w-[150px]">
                          {client.notes}
                        </div>
                      )}
                    </td>

                    {/* Contact & WhatsApp & Telegram */}
                    {visibleColumns.contactName !== false && (
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-200">{client.contactName || '-'}</span>
                          
                          {/* WhatsApp icon */}
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded bg-[#25D366]/15 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 transition-colors"
                              title={`Apri chat WhatsApp (${client.phone})`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Telegram icon */}
                          {tgUrl && (
                            <a
                              href={tgUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded bg-[#229ED9]/15 hover:bg-[#229ED9]/30 text-[#229ED9] border border-[#229ED9]/40 transition-colors"
                              title={`Apri Telegram (${client.telegram})`}
                            >
                              <Send className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {!waUrl && !tgUrl && (
                            <span 
                              onClick={() => onEdit(client)}
                              className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer underline"
                              title="Aggiungi contatto"
                            >
                              +Info
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Expiration Date & Badge */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${
                          expired ? 'text-[#ff3366]' : expiring ? 'text-[#ffb700]' : 'text-slate-200'
                        }`}>
                          {formatDateItalian(client.expirationDate)}
                        </span>

                        {expired && (
                          <span className="px-1.5 py-0.2 rounded bg-[#ff3366]/15 text-[#ff3366] text-[10px] border border-[#ff3366]/30">
                            Scaduto ({Math.abs(daysDiff)}gg fa)
                          </span>
                        )}
                        {!expired && expiring && (
                          <span className="px-1.5 py-0.2 rounded bg-[#ffb700]/15 text-[#ffb700] text-[10px] border border-[#ffb700]/30 animate-pulse">
                            {daysDiff === 0 ? 'OGGI' : `tra ${daysDiff}gg`}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cost */}
                    {visibleColumns.monthlyCost !== false && (
                      <td className="py-3 px-4 text-[#00f0ff] font-bold">
                        {client.monthlyCost || 10}€
                      </td>
                    )}

                    {/* Sezione Pagamento */}
                    <td className="py-3 px-4">
                      {isUnpaid ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onOpenPaymentModal(client)}
                            className="px-2 py-0.5 rounded bg-[#ff3366]/20 hover:bg-[#ff3366]/30 border border-[#ff3366]/50 text-[#ff3366] font-bold text-[10px] flex items-center gap-1"
                            title={client.paymentNote ? `Nota: ${client.paymentNote}` : 'Clicca per gestire debito'}
                          >
                            <span>DA SALDARE: €{client.amountDue}</span>
                          </button>
                          <button
                            onClick={() => onQuickPay(client)}
                            className="p-1 rounded bg-[#00ff9d]/20 hover:bg-[#00ff9d] hover:text-black text-[#00ff9d] border border-[#00ff9d]/40 text-[10px] transition-all"
                            title="Segna subito come saldato"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onOpenPaymentModal(client)}
                          className="px-1.5 py-0.5 rounded text-slate-500 hover:text-[#00ff9d] hover:bg-[#00ff9d]/10 text-[10px] transition-colors"
                          title="Stato regolare. Clicca per segnare un debito"
                        >
                          <span className="text-[#00ff9d]/80 font-mono">✓ Pagato</span>
                        </button>
                      )}
                    </td>

                    {/* Total Credits Used */}
                    {visibleColumns.totalCreditsUsed && (
                      <td className="py-3 px-4 text-slate-300 font-bold">
                        {client.totalCreditsUsed || 0} CR
                      </td>
                    )}

                    {/* Renewal Buttons with Confirmation */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onRequestRenew(client, 1)}
                          className="px-2 py-1 rounded bg-[#162035] hover:bg-[#00ff9d] hover:text-black border border-[#1f2d4d] text-slate-300 text-[11px] font-bold transition-all"
                          title="Rinnova +1 Mese"
                        >
                          +1M <span className="opacity-70 text-[9px]">(-1c)</span>
                        </button>
                        <button
                          onClick={() => onRequestRenew(client, 3)}
                          className="px-2.5 py-1 rounded bg-[#182642] hover:bg-[#00f0ff] hover:text-black border border-[#00f0ff]/40 text-[#00f0ff] text-[11px] font-bold transition-all shadow-[0_0_8px_rgba(0,240,255,0.15)]"
                          title="Rinnova +3 Mesi"
                        >
                          +3M <span className="opacity-70 text-[9px]">(-3c)</span>
                        </button>
                        <button
                          onClick={() => onRequestRenew(client, 12)}
                          className="px-2 py-1 rounded bg-[#162035] hover:bg-[#ffb700] hover:text-black border border-[#1f2d4d] text-slate-300 text-[11px] font-bold transition-all"
                          title="Rinnova +12 Mesi"
                        >
                          +12M <span className="opacity-70 text-[9px]">(-12c)</span>
                        </button>

                        {/* Undo Renewal Button */}
                        {client.lastRenewal && (
                          <button
                            onClick={() => onUndoRenew(client)}
                            className="px-2 py-1 rounded bg-[#ffb700]/15 hover:bg-[#ffb700] hover:text-black border border-[#ffb700]/40 text-[#ffb700] text-[10px] font-bold transition-all flex items-center gap-1 ml-1"
                            title={`Annulla ultimo rinnovo (+${client.lastRenewal.months}M) e rimborsa i crediti`}
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Annulla</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(client)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Modifica"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(client.id)}
                          className="p-1 rounded text-slate-400 hover:text-[#ff3366] hover:bg-[#ff3366]/10 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- MOBILE CARD VIEW (<768px) --- */}
      <div className="md:hidden space-y-2.5">
        {sortedClients.length === 0 ? (
          <div className="py-8 text-center text-slate-500 font-mono text-xs bg-[#0d121f] rounded-xl border border-[#1b253b]">
            Nessun utente trovato.
          </div>
        ) : (
          sortedClients.map((client) => {
            const daysDiff = getDaysDifference(client.expirationDate);
            const expired = isExpired(client.expirationDate);
            const expiring = isExpiringSoon(client.expirationDate, 3);
            const waUrl = getWhatsAppUrl(client.phone, client.contactName, client.user, client.expirationDate);
            const tgUrl = getTelegramUrl(client.telegram);
            const isUnpaid = client.paymentStatus === 'unpaid' && (Number(client.amountDue) > 0);

            return (
              <div 
                key={client.id}
                className={`p-3.5 rounded-xl border bg-[#0d121f] space-y-3 font-mono text-xs ${
                  isUnpaid
                    ? 'border-[#ff3366]/50 bg-[#160b13]'
                    : expired 
                    ? 'border-[#ff3366]/50 bg-[#140b12]' 
                    : expiring 
                    ? 'border-[#ffb700]/50 bg-[#16120b]' 
                    : 'border-[#1b253b]'
                } ${!client.isActive ? 'opacity-50' : ''}`}
              >
                {/* Header row: Username & Status Badge & Chat icons */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-white text-sm">{client.user}</div>
                    {visibleColumns.contactName !== false && (
                      <div className="text-slate-400 text-[11px]">{client.contactName || 'Nessun contatto'}</div>
                    )}
                    {visibleColumns.notes !== false && client.notes && (
                      <div className="text-slate-500 text-[10px] truncate max-w-[200px]">{client.notes}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {/* WhatsApp */}
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 flex items-center gap-1 text-[11px]"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WA</span>
                      </a>
                    )}
                    {/* Telegram */}
                    {tgUrl && (
                      <a
                        href={tgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-[#229ED9]/20 text-[#229ED9] border border-[#229ED9]/40 flex items-center gap-1 text-[11px]"
                        title="Telegram"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">TG</span>
                      </a>
                    )}
                    <button
                      onClick={() => onToggleActive(client.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        client.isActive ? 'bg-[#00ff9d]/20 text-[#00ff9d]' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {client.isActive ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* Expiration & Cost row */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#080b12] border border-[#182133]">
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Scadenza</span>
                    <span className={`font-bold ${
                      expired ? 'text-[#ff3366]' : expiring ? 'text-[#ffb700]' : 'text-slate-200'
                    }`}>
                      {formatDateItalian(client.expirationDate)}
                    </span>
                    {expired && <span className="text-[#ff3366] text-[10px] ml-1">(Scaduto)</span>}
                    {!expired && expiring && (
                      <span className="text-[#ffb700] text-[10px] ml-1">
                        ({daysDiff === 0 ? 'Oggi' : `tra ${daysDiff}gg`})
                      </span>
                    )}
                  </div>

                  {visibleColumns.monthlyCost !== false && (
                    <div className="text-right">
                      <span className="text-slate-500 text-[10px] block uppercase">Costo</span>
                      <span className="text-[#00f0ff] font-bold">{client.monthlyCost || 10}€ / m</span>
                    </div>
                  )}

                  {visibleColumns.totalCreditsUsed && (
                    <div className="text-right">
                      <span className="text-slate-500 text-[10px] block uppercase">Tot. Crediti</span>
                      <span className="text-white font-bold">{client.totalCreditsUsed || 0} CR</span>
                    </div>
                  )}
                </div>

                {/* Sezione Pagamento Mobile */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0f1c] border border-[#19253d]">
                  <span className="text-[10px] text-slate-400 uppercase">Stato Pagamento:</span>
                  {isUnpaid ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenPaymentModal(client)}
                        className="px-2 py-0.5 rounded bg-[#ff3366]/20 border border-[#ff3366]/50 text-[#ff3366] font-bold text-[11px]"
                      >
                        DA SALDARE: €{client.amountDue}
                      </button>
                      <button
                        onClick={() => onQuickPay(client)}
                        className="p-1 rounded bg-[#00ff9d] text-black font-bold text-[10px]"
                        title="Segna come saldato"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onOpenPaymentModal(client)}
                      className="text-[#00ff9d] text-[11px] font-bold"
                    >
                      ✓ In Regola
                    </button>
                  )}
                </div>

                {/* Renewal row with Undo */}
                <div className="space-y-1.5 pt-1 border-t border-[#162033]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Rinnova:</span>
                    {client.lastRenewal && (
                      <button
                        onClick={() => onUndoRenew(client)}
                        className="px-2 py-0.5 rounded bg-[#ffb700]/15 hover:bg-[#ffb700] hover:text-black border border-[#ffb700]/40 text-[#ffb700] text-[10px] font-bold flex items-center gap-1"
                        title="Annulla rinnovo precedente"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Annulla +{client.lastRenewal.months}M</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => onRequestRenew(client, 1)}
                      className="py-1.5 rounded-lg bg-[#162035] hover:bg-[#00ff9d] hover:text-black border border-[#1f2d4d] text-slate-300 font-bold text-center"
                    >
                      +1 Mese <span className="text-[9px] block opacity-75">(-1 CR)</span>
                    </button>
                    <button
                      onClick={() => onRequestRenew(client, 3)}
                      className="py-1.5 rounded-lg bg-[#182642] hover:bg-[#00f0ff] hover:text-black border border-[#00f0ff]/40 text-[#00f0ff] font-bold text-center"
                    >
                      +3 Mesi <span className="text-[9px] block opacity-75">(-3 CR)</span>
                    </button>
                    <button
                      onClick={() => onRequestRenew(client, 12)}
                      className="py-1.5 rounded-lg bg-[#162035] hover:bg-[#ffb700] hover:text-black border border-[#1f2d4d] text-slate-300 font-bold text-center"
                    >
                      +12 Mesi <span className="text-[9px] block opacity-75">(-12 CR)</span>
                    </button>
                  </div>
                </div>

                {/* Edit & Delete row */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#162033]">
                  <button
                    onClick={() => onEdit(client)}
                    className="px-2 py-1 rounded text-slate-400 hover:text-white bg-slate-800/60 flex items-center gap-1 text-[11px]"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Modifica</span>
                  </button>
                  <button
                    onClick={() => onDelete(client.id)}
                    className="px-2 py-1 rounded text-[#ff3366] hover:bg-[#ff3366]/20 bg-[#ff3366]/10 border border-[#ff3366]/30 flex items-center gap-1 text-[11px]"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Elimina</span>
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
