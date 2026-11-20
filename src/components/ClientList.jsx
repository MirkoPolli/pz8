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
  Check,
  X,
  Users
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

  // Clean phone number for WhatsApp - Messaggio predefinito: "ciao scade oggi"
  const getWhatsAppUrl = (phone) => {
    if (!phone) return null;
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 10 && !clean.startsWith('39')) {
      clean = '39' + clean;
    }
    const message = encodeURIComponent('ciao scade oggi');
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

  // Raggruppamento debiti per persona / contatto unico (se un contatto ha più username conta 1 solo cliente)
  const debtorsMap = new Map();
  unpaidClients.forEach(c => {
    const rawName = (c.contactName || '').trim();
    const rawPhone = (c.phone || '').trim();
    const key = (rawName ? rawName.toLowerCase() : (rawPhone || c.user.toLowerCase()));
    const displayName = rawName || c.user;

    if (!debtorsMap.has(key)) {
      debtorsMap.set(key, {
        key,
        name: displayName,
        phone: c.phone || '',
        telegram: c.telegram || '',
        totalDue: 0,
        accounts: []
      });
    }
    const debtor = debtorsMap.get(key);
    debtor.totalDue += (Number(c.amountDue) || 0);
    debtor.accounts.push({
      id: c.id,
      user: c.user,
      amountDue: Number(c.amountDue) || 0,
      monthlyCost: c.monthlyCost,
      expirationDate: c.expirationDate,
      rawClient: c
    });
    if (!debtor.phone && c.phone) debtor.phone = c.phone;
    if (!debtor.telegram && c.telegram) debtor.telegram = c.telegram;
  });

  const uniqueDebtors = Array.from(debtorsMap.values()).sort((a, b) => b.totalDue - a.totalDue);
  const uniqueDebtorsCount = uniqueDebtors.length;

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
    if (filterTab === 'active') {
      return c.isActive;
    }
    if (filterTab === 'expiring') {
      return c.isActive && isExpiringSoon(c.expirationDate, 3);
    }
    if (filterTab === 'expired') {
      return c.isActive && isExpired(c.expirationDate);
    }
    if (filterTab === 'unpaid') {
      return c.paymentStatus === 'unpaid' && (Number(c.amountDue) > 0);
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
        
        {/* Search Input con tasto 'X' per cancellare subito */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per username, contatto, tel o telegram..."
            className="w-full bg-[#080b12] border border-[#1e2a42] focus:border-[#00ff9d] rounded-lg pl-9 pr-8 py-1.5 text-xs font-mono text-white outline-none transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              title="Cancella ricerca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Tabs: Solo Attivi come default, In Scadenza, Scaduti, Da Saldare, Disattivati (Rimosso 'Tutti') */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-xs font-mono">
          {[
            { id: 'active', label: 'Attivi' },
            { id: 'expiring', label: 'In Scadenza (≤3gg)', highlight: true },
            { id: 'expired', label: 'Scaduti' },
            { 
              id: 'unpaid', 
              label: `Da Saldare (€${totalAmountDue})`, 
              isRed: totalAmountDue > 0, 
              badge: uniqueDebtorsCount 
            },
            { id: 'inactive', label: 'Disattivati' },
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

      {/* Counter - Totale da riscuotere calcolato in base al contatto unico */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
        <span>Risultati visualizzati: <strong className="text-white">{sortedClients.length}</strong></span>
        {totalAmountDue > 0 && (
          <span className="text-[#ff6b8b]">
            Totale da riscuotere: <strong className="text-[#ff3366]">€{totalAmountDue}</strong> ({uniqueDebtorsCount} {uniqueDebtorsCount === 1 ? 'cliente' : 'clienti'})
          </span>
        )}
      </div>

      {/* --- SEZIONE DA SALDARE: RIEPILOGO PERSONE CON TOTALI --- */}
      {filterTab === 'unpaid' && uniqueDebtors.length > 0 && (
        <div className="p-4 rounded-xl bg-[#120d18] border border-[#ff3366]/40 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#ff3366]/20">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff3366] animate-pulse"></span>
              <h3 className="font-mono font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <span>Riepilogo Debitori per Persona</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-[#ff3366]/20 text-[#ff6b8b] border border-[#ff3366]/40">
                  {uniqueDebtorsCount} {uniqueDebtorsCount === 1 ? 'persona' : 'persone'}
                </span>
              </h3>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 font-mono">Totale complessivo: </span>
              <strong className="text-base text-[#ff3366] font-mono font-bold">€{totalAmountDue}</strong>
            </div>
          </div>

          {/* Griglia card per persona con totali ed elenco account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {uniqueDebtors.map((debtor) => {
              const waUrl = getWhatsAppUrl(debtor.phone);
              const tgUrl = getTelegramUrl(debtor.telegram);

              return (
                <div 
                  key={debtor.key}
                  className="p-3 rounded-lg bg-[#0a070e] border border-[#ff3366]/25 hover:border-[#ff3366]/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <span className="font-bold text-white text-xs truncate block" title={debtor.name}>
                          {debtor.name}
                        </span>
                        {debtor.phone && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {debtor.phone}
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#ff3366]/20 text-[#ff3366] border border-[#ff3366]/50 flex-shrink-0">
                        €{debtor.totalDue}
                      </span>
                    </div>

                    {/* Elenco account associati a questa persona */}
                    <div className="space-y-1 mb-2.5">
                      {debtor.accounts.map((acc, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] font-mono text-slate-300 bg-[#160e1d] px-2 py-1 rounded border border-[#2d1b33]">
                          <span className="truncate max-w-[140px] text-slate-200">
                            📺 {acc.user}
                          </span>
                          <span className="text-[#ff6b8b] font-bold">
                            €{acc.amountDue}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Azioni rapide di contatto */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#2d1b33] text-[11px]">
                    <span className="text-slate-500 font-mono text-[10px]">
                      {debtor.accounts.length} {debtor.accounts.length === 1 ? 'account' : 'account'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 px-2 rounded bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/30 transition-colors flex items-center gap-1 font-bold text-[10px]"
                          title="Scrivi su WhatsApp (ciao scade oggi)"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      {tgUrl && (
                        <a
                          href={tgUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 px-2 rounded bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20 border border-[#0088cc]/30 transition-colors flex items-center gap-1 font-bold text-[10px]"
                          title="Scrivi su Telegram"
                        >
                          <Send className="w-3 h-3" />
                          <span>TG</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- DESKTOP TABLE VIEW --- */}
      <div className="hidden md:block rounded-xl border border-[#1b253b] bg-[#0d121f] overflow-hidden">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#090d16] border-b border-[#1b253b] text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-4 whitespace-nowrap">Stato</th>
              <th className="py-2.5 px-4 whitespace-nowrap">Username Account</th>
              {visibleColumns.contactName !== false && (
                <th className="py-2.5 px-4 whitespace-nowrap">Contatto & Chat</th>
              )}
              <th className="py-2.5 px-4 whitespace-nowrap">Scadenza</th>
              {visibleColumns.monthlyCost !== false && (
                <th className="py-2.5 px-4 whitespace-nowrap">Costo</th>
              )}
              {visibleColumns.payment !== false && (
                <th className="py-2.5 px-4 whitespace-nowrap">Pagamento</th>
              )}
              {visibleColumns.totalCreditsUsed && (
                <th className="py-2.5 px-4 whitespace-nowrap">Tot. Crediti</th>
              )}
              <th className="py-2.5 px-4 text-center whitespace-nowrap">Rinnova</th>
              <th className="py-2.5 px-4 text-right whitespace-nowrap">Azioni</th>
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
                    <td className="py-2.5 px-4 whitespace-nowrap">
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
                    <td className="py-2.5 px-4 font-bold text-white whitespace-nowrap">
                      <span>{client.user}</span>
                      {visibleColumns.notes !== false && client.notes && (
                        <span className="text-[10px] text-slate-400 font-normal font-sans ml-2 truncate max-w-[120px] inline-block align-middle">
                          ({client.notes})
                        </span>
                      )}
                    </td>

                    {/* Contact & WhatsApp & Telegram */}
                    {visibleColumns.contactName !== false && (
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-nowrap">
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
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-nowrap">
                        <span className={`font-bold ${
                          expired 
                            ? 'text-[#ff3366]' 
                            : daysDiff === 0 
                            ? 'text-[#ff5500] font-black' 
                            : expiring 
                            ? 'text-[#ffb700]' 
                            : 'text-slate-200'
                        }`}>
                          {formatDateItalian(client.expirationDate)}
                        </span>

                        {expired && (
                          <span className="px-1.5 py-0.2 rounded bg-[#ff3366]/15 text-[#ff3366] text-[10px] border border-[#ff3366]/30">
                            Scaduto ({Math.abs(daysDiff)}gg fa)
                          </span>
                        )}
                        {!expired && daysDiff === 0 && (
                          <span className="px-2 py-0.5 rounded bg-[#ff5500]/25 text-[#ff6600] font-black text-[10px] border border-[#ff5500] animate-pulse shadow-[0_0_8px_rgba(255,85,0,0.35)]">
                            SCADE OGGI
                          </span>
                        )}
                        {!expired && expiring && daysDiff > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-[#ffb700]/15 text-[#ffb700] text-[10px] border border-[#ffb700]/30 animate-pulse">
                            tra {daysDiff}gg
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cost */}
                    {visibleColumns.monthlyCost !== false && (
                      <td className="py-2.5 px-4 text-[#00f0ff] font-bold whitespace-nowrap">
                        {client.monthlyCost || 10}€
                      </td>
                    )}

                    {/* Sezione Pagamento */}
                    {visibleColumns.payment !== false && (
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {isUnpaid ? (
                          <div className="flex items-center gap-1.5 flex-nowrap">
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
                    )}

                    {/* Total Credits Used */}
                    {visibleColumns.totalCreditsUsed && (
                      <td className="py-2.5 px-4 text-slate-300 font-bold whitespace-nowrap">
                        {client.totalCreditsUsed || 0} CR
                      </td>
                    )}

                    {/* Renewal Buttons */}
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                        <button
                          onClick={() => onRequestRenew(client, 1)}
                          className="px-2.5 py-1 rounded bg-[#162035] hover:bg-[#00ff9d] hover:text-black border border-[#1f2d4d] text-slate-300 text-xs font-bold transition-all"
                          title="Rinnova +1 Mese"
                        >
                          +1M
                        </button>
                        <button
                          onClick={() => onRequestRenew(client, 3)}
                          className="px-3 py-1 rounded bg-[#182642] hover:bg-[#00f0ff] hover:text-black border border-[#00f0ff]/40 text-[#00f0ff] text-xs font-bold transition-all shadow-[0_0_8px_rgba(0,240,255,0.15)]"
                          title="Rinnova +3 Mesi"
                        >
                          +3M
                        </button>
                        <button
                          onClick={() => onRequestRenew(client, 12)}
                          className="px-2.5 py-1 rounded bg-[#162035] hover:bg-[#ffb700] hover:text-black border border-[#1f2d4d] text-slate-300 text-xs font-bold transition-all"
                          title="Rinnova +12 Mesi"
                        >
                          +12M
                        </button>
                      </div>
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 flex-nowrap">
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
                    : daysDiff === 0
                    ? 'border-[#ff5500] bg-[#1a0e08] shadow-[0_0_12px_rgba(255,85,0,0.2)]'
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
                      expired 
                        ? 'text-[#ff3366]' 
                        : daysDiff === 0 
                        ? 'text-[#ff5500] font-black' 
                        : expiring 
                        ? 'text-[#ffb700]' 
                        : 'text-slate-200'
                    }`}>
                      {formatDateItalian(client.expirationDate)}
                    </span>
                    {expired && <span className="text-[#ff3366] text-[10px] ml-1">(Scaduto)</span>}
                    {!expired && daysDiff === 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-[#ff5500]/25 text-[#ff6600] font-black text-[10px] border border-[#ff5500] ml-1.5 animate-pulse">
                        SCADE OGGI
                      </span>
                    )}
                    {!expired && expiring && daysDiff > 0 && (
                      <span className="text-[#ffb700] text-[10px] ml-1">
                        (tra {daysDiff}gg)
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
                {visibleColumns.payment !== false && (
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
                )}

                {/* Renewal row */}
                <div className="space-y-1.5 pt-1 border-t border-[#162033]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Rinnova:</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => onRequestRenew(client, 1)}
                      className="py-1.5 rounded-lg bg-[#162035] hover:bg-[#00ff9d] hover:text-black border border-[#1f2d4d] text-slate-300 font-bold text-center text-xs"
                    >
                      +1M
                    </button>
                    <button
                      onClick={() => onRequestRenew(client, 3)}
                      className="py-1.5 rounded-lg bg-[#182642] hover:bg-[#00f0ff] hover:text-black border border-[#00f0ff]/40 text-[#00f0ff] font-bold text-center text-xs"
                    >
                      +3M
                    </button>
                    <button
                      onClick={() => onRequestRenew(client, 12)}
                      className="py-1.5 rounded-lg bg-[#162035] hover:bg-[#ffb700] hover:text-black border border-[#1f2d4d] text-slate-300 font-bold text-center text-xs"
                    >
                      +12M
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
