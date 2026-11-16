import React, { useState } from 'react';
import { 
  X, 
  Search, 
  UserPlus, 
  Phone, 
  Send, 
  MessageCircle, 
  Edit2, 
  Trash2, 
  Tv, 
  BookUser,
  Plus,
  Check,
  Calendar
} from 'lucide-react';
import { formatDateItalian } from '../utils/dateUtils';

export default function AddressBookModal({
  isOpen,
  onClose,
  contacts = [],
  clients = [],
  onSaveContact,
  onDeleteContact,
  onSelectContactForNewUser
}) {
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setIsEditing(true);
    setEditingId(null);
    setName('');
    setPhone('');
    setTelegram('');
    setNotes('');
  };

  const handleStartEdit = (c) => {
    setIsEditing(true);
    setEditingId(c.id);
    setName(c.name || '');
    setPhone(c.phone || '');
    setTelegram(c.telegram || '');
    setNotes(c.notes || '');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setPhone('');
    setTelegram('');
    setNotes('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveContact({
      id: editingId,
      name: name.trim(),
      phone: phone.trim(),
      telegram: telegram.trim(),
      notes: notes.trim()
    });

    handleCancelEdit();
  };

  // Helper per url whatsapp
  const getWhatsAppUrl = (p, contactName) => {
    if (!p) return null;
    let clean = p.replace(/\D/g, '');
    if (clean.length === 10 && !clean.startsWith('39')) {
      clean = '39' + clean;
    }
    const msg = encodeURIComponent(`Ciao ${contactName || ''}!`);
    return `https://wa.me/${clean}?text=${msg}`;
  };

  // Helper per url telegram
  const getTelegramUrl = (t) => {
    if (!t) return null;
    const clean = t.trim().replace(/^@/, '').replace(/^t\.me\//, '');
    return `https://t.me/${clean}`;
  };

  // Filtra contatti
  const s = search.toLowerCase();
  const filteredContacts = contacts.filter(c => 
    (c.name || '').toLowerCase().includes(s) ||
    (c.phone || '').includes(s) ||
    (c.telegram || '').toLowerCase().includes(s) ||
    (c.notes || '').toLowerCase().includes(s)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm">
      <div className="bg-[#111726] border border-[#1f2a45] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1f2a45] flex items-center justify-between bg-[#0e1320] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00ff9d]/10 border border-[#00ff9d]/30 text-[#00ff9d] flex items-center justify-center">
              <BookUser className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono font-bold text-white text-base">
                Rubrica Contatti
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
                {contacts.length} contatti registrati • Evita di riscrivere telefono e dati per più account
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top bar: Cerca e Aggiungi */}
        <div className="p-4 border-b border-[#1a233a] bg-[#0c101c] flex items-center gap-3 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca contatto per nome, telefono o telegram..."
              className="w-full bg-[#080b12] border border-[#1e2a42] focus:border-[#00ff9d] rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-white outline-none"
            />
          </div>

          <button
            onClick={handleStartAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00ff9d] hover:bg-[#00dd87] text-black font-bold font-mono text-xs transition-all flex-shrink-0 shadow-[0_0_12px_rgba(0,255,157,0.25)]"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo Contatto</span>
          </button>
        </div>

        {/* Edit / Create Form inline */}
        {isEditing && (
          <form onSubmit={handleSave} className="p-4 bg-[#0a0e1a] border-b border-[#1f2a45] space-y-3 font-mono text-xs animate-in slide-in-from-top-2">
            <div className="font-bold text-[#00ff9d] text-xs uppercase tracking-wider flex items-center justify-between">
              <span>{editingId ? 'Modifica Contatto' : 'Aggiungi Nuovo Contatto'}</span>
              <button 
                type="button" 
                onClick={handleCancelEdit}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Nome Referente *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Es. Marco Rossi"
                  className="w-full bg-[#080b12] border border-[#1e2a42] focus:border-[#00ff9d] rounded-lg px-2.5 py-1.5 text-white outline-none"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Telefono (WhatsApp)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Es. 3401234567"
                  className="w-full bg-[#080b12] border border-[#1e2a42] focus:border-[#00ff9d] rounded-lg px-2.5 py-1.5 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Telegram (@username)</label>
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="Es. @maborossi"
                  className="w-full bg-[#080b12] border border-[#1e2a42] focus:border-[#00f0ff] rounded-lg px-2.5 py-1.5 text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Note contatto (opzionale)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Es. Amico di Luca, paga sempre con Bonifico istantaneo"
                className="w-full bg-[#080b12] border border-[#1e2a42] focus:border-[#00ff9d] rounded-lg px-2.5 py-1.5 text-white outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/40"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#00ff9d] text-black font-bold hover:bg-[#00dd87]"
              >
                Salva Contatto
              </button>
            </div>
          </form>
        )}

        {/* Lista Contatti */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
          {filteredContacts.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <BookUser className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nessun contatto trovato nella rubrica.</p>
              <p className="text-[11px] text-slate-600 mt-1">
                I contatti vengono aggiunti qui anche in automatico quando salvi nuovi utenti!
              </p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              // Trova tutti gli account associati a questo contatto
              const linkedClients = clients.filter(cl => 
                (cl.contactName || '').trim().toLowerCase() === (contact.name || '').trim().toLowerCase() ||
                (contact.phone && cl.phone && cl.phone.replace(/\D/g, '') === contact.phone.replace(/\D/g, ''))
              );

              const waUrl = getWhatsAppUrl(contact.phone, contact.name);
              const tgUrl = getTelegramUrl(contact.telegram);

              return (
                <div 
                  key={contact.id}
                  className="p-3.5 rounded-xl border border-[#1b253b] bg-[#0d121f] hover:border-[#2b3a5c] transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    
                    {/* Info contatto */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm">{contact.name}</span>
                        {linkedClients.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 text-[10px] font-bold">
                            {linkedClients.length} {linkedClients.length === 1 ? 'account' : 'account'}
                          </span>
                        )}
                      </div>

                      {/* Phone & Telegram */}
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-slate-300">
                        {contact.phone && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Tel:</span>
                            <span className="text-white">{contact.phone}</span>
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/40 transition-colors"
                                title="Apri WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}

                        {contact.telegram && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Telegram:</span>
                            <span className="text-[#229ED9]">{contact.telegram}</span>
                            {tgUrl && (
                              <a
                                href={tgUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded bg-[#229ED9]/20 text-[#229ED9] hover:bg-[#229ED9]/40 transition-colors"
                                title="Apri Telegram"
                              >
                                <Send className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {contact.notes && (
                        <p className="text-slate-400 text-[11px] mt-1 italic">
                          "{contact.notes}"
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(contact)}
                        className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Modifica contatto"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Eliminare il contatto "${contact.name}" dalla rubrica? (Gli account IPTV rimarranno intatti)`)) {
                            onDeleteContact(contact.id);
                          }
                        }}
                        className="p-1.5 rounded text-slate-400 hover:text-[#ff3366] hover:bg-[#ff3366]/10 transition-colors"
                        title="Elimina contatto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>

                  {/* Account collegati */}
                  {linkedClients.length > 0 && (
                    <div className="pt-2 border-t border-[#162033] flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-500 text-[10px] flex items-center gap-1">
                        <Tv className="w-3 h-3" /> Linee IPTV:
                      </span>
                      {linkedClients.map((cl) => (
                        <div 
                          key={cl.id} 
                          className="px-2 py-0.5 rounded bg-[#080d17] border border-[#1d2942] text-[10px] text-slate-300 flex items-center gap-1.5"
                        >
                          <span className="font-bold text-white">{cl.user}</span>
                          <span className={`text-[9px] ${cl.isActive ? 'text-[#00ff9d]' : 'text-slate-500'}`}>
                            {cl.isActive ? '●' : '○'}
                          </span>
                          <span className="text-slate-400 text-[9px]">
                            scad: {formatDateItalian(cl.expirationDate)}
                          </span>
                          {cl.paymentStatus === 'unpaid' && (
                            <span className="text-[#ff3366] text-[9px] font-bold">
                              [debito €{cl.amountDue}]
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
