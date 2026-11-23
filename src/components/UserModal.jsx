import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Calendar, 
  Euro, 
  Coins, 
  CheckCircle, 
  AlertCircle,
  MessageCircle,
  Send,
  BookUser,
  Clock,
  Check,
  Search,
  RotateCcw
} from 'lucide-react';
import { getTodayDateString, addMonthsToDate, formatDateItalian } from '../utils/dateUtils';

export default function UserModal({ 
  isOpen, 
  onClose, 
  onSave, 
  clientToEdit, 
  currentCredits,
  contacts = [],
  onUndoRenew,
  isAdmin = true
}) {
  const isEditing = Boolean(clientToEdit && clientToEdit.id);

  const [username, setUsername] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [monthlyCost, setMonthlyCost] = useState(10);
  const [initialMonths, setInitialMonths] = useState(3);
  const [expirationDate, setExpirationDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  
  // Payment state
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [amountDue, setAmountDue] = useState(0);
  const [paymentNote, setPaymentNote] = useState('');

  const [error, setError] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [isContactListOpen, setIsContactListOpen] = useState(false);

  useEffect(() => {
    if (clientToEdit) {
      setUsername(clientToEdit.user || '');
      setContactName(clientToEdit.contactName || '');
      setPhone(clientToEdit.phone || '');
      setTelegram(clientToEdit.telegram || '');
      setMonthlyCost(clientToEdit.monthlyCost ?? 10);
      setExpirationDate(clientToEdit.expirationDate || getTodayDateString());
      setIsActive(clientToEdit.isActive ?? true);
      setNotes(clientToEdit.notes || '');
      
      setPaymentStatus(clientToEdit.paymentStatus || 'paid');
      setAmountDue(clientToEdit.amountDue !== undefined ? clientToEdit.amountDue : 0);
      setPaymentNote(clientToEdit.paymentNote || '');
    } else {
      // Defaults for new user
      setUsername('');
      setContactName('');
      setPhone('');
      setTelegram('');
      setMonthlyCost(10);
      setInitialMonths(3);
      setExpirationDate(addMonthsToDate(getTodayDateString(), 3));
      setIsActive(true);
      setNotes('');
      
      setPaymentStatus('paid');
      setAmountDue(0);
      setPaymentNote('');
    }
    setError('');
    setShowContactDropdown(false);
    setContactSearch('');
    setIsContactListOpen(false);
  }, [clientToEdit, isOpen]);

  const handleDurationChange = (months) => {
    setInitialMonths(months);
    setExpirationDate(addMonthsToDate(getTodayDateString(), months));
    if (paymentStatus === 'unpaid') {
      setAmountDue(months * (Number(monthlyCost) || 10));
    }
  };

  const handleSelectContact = (c) => {
    if (!c) return;
    setContactName(c.name || '');
    setPhone(c.phone || '');
    setTelegram(c.telegram || '');
    if (c.notes && !notes) {
      setNotes(c.notes);
    }
    setContactSearch('');
    setIsContactListOpen(false);
    setShowContactDropdown(false);
  };

  const handleSelectContactById = (contactId) => {
    if (!contactId) return;
    const c = contacts.find(item => item.id === contactId);
    if (c) {
      handleSelectContact(c);
    }
  };

  const handleTogglePaymentStatus = (status) => {
    setPaymentStatus(status);
    if (status === 'unpaid') {
      const defaultDue = !isEditing ? (initialMonths * (Number(monthlyCost) || 10)) : (Number(monthlyCost) || 10);
      setAmountDue(defaultDue);
    } else {
      setAmountDue(0);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Inserisci lo username dell\'account');
      return;
    }
    if (!expirationDate) {
      setError('Inserisci la data di scadenza');
      return;
    }

    if (!isEditing && isAdmin && currentCredits < initialMonths) {
      setError(`Crediti insufficienti! Hai ${currentCredits} crediti ma ne servono ${initialMonths}. Ricarica prima i crediti.`);
      return;
    }

    onSave({
      user: username.trim(),
      contactName: contactName.trim(),
      phone: phone.trim(),
      telegram: telegram.trim(),
      monthlyCost: Number(monthlyCost) || 0,
      expirationDate,
      isActive,
      notes: notes.trim(),
      deductCredits: (!isEditing && isAdmin) ? initialMonths : 0,
      paymentStatus,
      amountDue: paymentStatus === 'paid' ? 0 : (Number(amountDue) || 0),
      paymentNote: paymentNote.trim()
    });

    onClose();
  };

  if (!isOpen) return null;

  // Filtra contatti da rubrica con barra di ricerca
  const filteredContacts = contacts.filter(c => {
    if (!contactSearch.trim()) return true;
    const s = contactSearch.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(s) ||
      (c.phone || '').includes(s) ||
      (c.telegram || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111726] border border-[#1f2a45] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1f2a45] flex items-center justify-between bg-[#0e1320] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00ff9d]"></span>
            <h2 className="font-mono font-bold text-white text-base">
              {isEditing ? `Modifica Utente: ${clientToEdit?.user || ''}` : 'Aggiungi Nuovo Utente'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 font-mono text-xs">
          
          {error && (
            <div className="p-3 rounded-lg bg-[#ff3366]/10 border border-[#ff3366]/40 text-[#ff3366] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Banner Annulla Ultimo Rinnovo (se presente rinnovo recente) */}
          {isEditing && clientToEdit?.lastRenewal && onUndoRenew && (
            <div className="p-3.5 rounded-xl bg-[#ffb700]/10 border border-[#ffb700]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_15px_rgba(255,183,0,0.1)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#ffb700]/20 text-[#ffb700] flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-white font-bold text-xs">
                    Ultimo rinnovo: +{clientToEdit.lastRenewal.months} {clientToEdit.lastRenewal.months === 1 ? 'Mese' : 'Mesi'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Scadenza prec.: {formatDateItalian(clientToEdit.lastRenewal.prevExpirationDate)} • Vengono rimborsati +{clientToEdit.lastRenewal.months} CR
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onUndoRenew(clientToEdit);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-[#ffb700] hover:bg-[#ffa600] text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(255,183,0,0.3)] flex-shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Annulla Rinnovo</span>
              </button>
            </div>
          )}

          {/* Username (Mandatory) */}
          <div>
            <label className="block text-xs uppercase text-slate-400 mb-1">
              Username Account <span className="text-[#00ff9d]">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="es. Mario-pll"
                className="w-full bg-[#0a0d14] border border-[#1f2a45] focus:border-[#00ff9d] rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                required
              />
              <User className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
            </div>
          </div>

          {/* Contatto Referente con Ricerca e Selezione Rubrica */}
          <div className="space-y-2.5 p-3 rounded-xl bg-[#0a0f1c] border border-[#1d2b45]">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase text-slate-300 font-bold flex items-center gap-1.5">
                <BookUser className="w-3.5 h-3.5 text-[#00ff9d]" />
                <span>Referente / Rubrica</span>
              </label>
              {contacts.length > 0 && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {contacts.length} contatti in rubrica
                </span>
              )}
            </div>

            {/* Ricerca e scelta da rubrica con filtro */}
            {contacts.length > 0 && (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => {
                      setContactSearch(e.target.value);
                      setIsContactListOpen(true);
                    }}
                    onFocus={() => setIsContactListOpen(true)}
                    placeholder="Cerca contatto in rubrica (nome, tel, telegram)..."
                    className="w-full bg-[#080c16] border border-[#1e2a42] focus:border-[#00ff9d] text-slate-200 text-xs rounded-lg pl-8 pr-8 py-2 outline-none transition-colors"
                  />
                  {contactSearch && (
                    <button
                      type="button"
                      onClick={() => setContactSearch('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white p-0.5 rounded"
                      title="Svuota ricerca"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown contatti filtrati */}
                {isContactListOpen && (
                  <div className="max-h-44 overflow-y-auto rounded-lg border border-[#233559] bg-[#0c1222] divide-y divide-[#172238] shadow-2xl">
                    {filteredContacts.length === 0 ? (
                      <div className="p-2.5 text-center text-slate-500 text-[11px]">
                        Nessun contatto trovato con "{contactSearch}".
                      </div>
                    ) : (
                      filteredContacts.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectContact(c)}
                          className="w-full text-left p-2.5 hover:bg-[#15233d] transition-colors flex items-center justify-between group"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-white text-xs group-hover:text-[#00ff9d] transition-colors truncate">
                              {c.name}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                              {c.phone && <span>📞 {c.phone}</span>}
                              {c.telegram && <span>TG: @{c.telegram.replace(/^@/, '')}</span>}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            Seleziona ↵
                          </span>
                        </button>
                      ))
                    )}
                    <div className="p-1.5 bg-[#090d18] text-right border-t border-[#1a263d]">
                      <button
                        type="button"
                        onClick={() => setIsContactListOpen(false)}
                        className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800"
                      >
                        Chiudi elenco
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Nome Contatto input manuale / modificabile */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Nome Contatto assegnato:
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="es. Mario Rossi"
                className="w-full bg-[#0a0d14] border border-[#1f2a45] focus:border-[#00ff9d] rounded-lg px-3 py-1.5 text-white text-xs outline-none transition-colors"
              />
            </div>
          </div>

          {/* Telefono / WhatsApp & Telegram */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase text-slate-400 mb-1">
                Telefono / WhatsApp
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="es. 3401234567"
                  className="w-full bg-[#0a0d14] border border-[#1f2a45] focus:border-[#00ff9d] rounded-lg px-3 py-2 text-white text-xs outline-none transition-colors"
                />
                <MessageCircle className="w-4 h-4 text-[#25D366] absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-400 mb-1">
                Telegram (@username)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="es. @mariorossi"
                  className="w-full bg-[#0a0d14] border border-[#1f2a45] focus:border-[#00f0ff] rounded-lg px-3 py-2 text-white text-xs outline-none transition-colors"
                />
                <Send className="w-4 h-4 text-[#229ED9] absolute right-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Initial Duration Selector (Only for new user) */}
          {!isEditing && (
            <div className="p-3 rounded-xl bg-[#0e1424] border border-[#1e2c4a] space-y-2">
              <label className="block text-xs uppercase text-[#00f0ff] font-semibold">
                Durata Iniziale (Partenza da Oggi)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleDurationChange(m)}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      initialMonths === m
                        ? 'bg-[#00ff9d]/20 border-[#00ff9d] text-[#00ff9d] shadow-[0_0_10px_rgba(0,255,157,0.3)]'
                        : 'bg-[#0a0d14] border-[#1f2a45] text-slate-400 hover:text-white'
                    }`}
                  >
                    {m} {m === 1 ? 'Mese' : 'Mesi'}
                    {isAdmin && (
                      <div className="text-[10px] opacity-75 font-normal">(-{m} cred)</div>
                    )}
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>Scadenza calcolata: <strong className="text-white">{formatDateItalian(expirationDate)}</strong></span>
                {isAdmin && (
                  <span className="text-[#ffb700]">Scalati: {initialMonths} Crediti</span>
                )}
              </div>
            </div>
          )}

          {/* Expiration Date (editable) & Monthly Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs uppercase text-slate-400">
                  Data Scadenza <span className="text-[#00ff9d]">*</span>
                </label>
                {expirationDate && (
                  <span className="text-[11px] font-mono text-[#00ff9d] font-bold">
                    {formatDateItalian(expirationDate)}
                  </span>
                )}
              </div>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full bg-[#0a0d14] border border-[#1f2a45] focus:border-[#00ff9d] rounded-lg px-3 py-2 text-white text-xs outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-400 mb-1">
                Costo Mensile (€)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={monthlyCost}
                  onChange={(e) => {
                    const c = e.target.value;
                    setMonthlyCost(c);
                    if (paymentStatus === 'unpaid') {
                      setAmountDue(!isEditing ? (initialMonths * (Number(c) || 10)) : (Number(c) || 10));
                    }
                  }}
                  placeholder="10"
                  className="w-full bg-[#0a0d14] border border-[#1f2a45] focus:border-[#00ff9d] rounded-lg px-3 py-2 text-white text-xs outline-none transition-colors"
                />
                <Euro className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Sezione Stato Pagamento */}
          <div className="p-3.5 rounded-xl bg-[#0e1320] border border-[#1b253b] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase text-slate-400 font-bold">
                Stato Pagamento
              </label>
              <span className={`text-[11px] font-bold ${paymentStatus === 'paid' ? 'text-[#00ff9d]' : 'text-[#ff3366]'}`}>
                {paymentStatus === 'paid' ? '● Pagato / In Regola' : `● Da Saldare (€${amountDue})`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTogglePaymentStatus('paid')}
                className={`py-1.5 px-3 rounded-lg border flex items-center justify-center gap-1.5 transition-all text-xs ${
                  paymentStatus === 'paid'
                    ? 'bg-[#00ff9d]/20 border-[#00ff9d] text-[#00ff9d] font-bold'
                    : 'bg-[#080b12] border-[#1b253b] text-slate-400'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Già Pagato</span>
              </button>
              <button
                type="button"
                onClick={() => handleTogglePaymentStatus('unpaid')}
                className={`py-1.5 px-3 rounded-lg border flex items-center justify-center gap-1.5 transition-all text-xs ${
                  paymentStatus === 'unpaid'
                    ? 'bg-[#ff3366]/20 border-[#ff3366] text-[#ff3366] font-bold'
                    : 'bg-[#080b12] border-[#1b253b] text-slate-400'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Da Saldare</span>
              </button>
            </div>

            {paymentStatus === 'unpaid' && (
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Importo Dovuto (€):</label>
                  <input
                    type="number"
                    min="1"
                    value={amountDue}
                    onChange={(e) => setAmountDue(e.target.value)}
                    className="w-full bg-[#080b12] border border-[#ff3366]/40 focus:border-[#ff3366] rounded-lg px-2.5 py-1.5 text-white text-xs outline-none"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Nota debito:</label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full bg-[#080b12] border border-[#1e2a42] focus:border-[#ff3366] rounded-lg px-2.5 py-1.5 text-white text-xs outline-none"
                    placeholder="Es. paga a inizio mese"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Active status & Notes */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded bg-[#0a0d14] border-[#1f2a45] text-[#00ff9d] focus:ring-0"
              />
              <span>Account Attivo</span>
            </label>
          </div>

          <div>
            <label className="block text-xs uppercase text-slate-400 mb-1">
              Note (Opzionali)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="es. Rinnovo concordato, linea camera da letto..."
              className="w-full bg-[#0a0d14] border border-[#1f2a45] focus:border-[#00ff9d] rounded-lg px-3 py-2 text-white text-xs outline-none transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#1f2a45] flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#141b2b] text-slate-300 hover:text-white text-xs"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#00ff9d] hover:bg-[#00dd87] text-black font-semibold text-xs transition-all shadow-[0_0_15px_rgba(0,255,157,0.3)]"
            >
              {isEditing ? 'Salva Modifiche' : `Crea Utente (-${initialMonths} Crediti)`}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
