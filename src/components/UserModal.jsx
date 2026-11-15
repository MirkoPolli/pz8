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
  MessageCircle
} from 'lucide-react';
import { getTodayDateString, addMonthsToDate } from '../utils/dateUtils';

export default function UserModal({ 
  isOpen, 
  onClose, 
  onSave, 
  clientToEdit, 
  currentCredits 
}) {
  const isEditing = Boolean(clientToEdit);

  const [username, setUsername] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [monthlyCost, setMonthlyCost] = useState(10);
  const [initialMonths, setInitialMonths] = useState(3);
  const [expirationDate, setExpirationDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (clientToEdit) {
      setUsername(clientToEdit.user || '');
      setContactName(clientToEdit.contactName || '');
      setPhone(clientToEdit.phone || '');
      setMonthlyCost(clientToEdit.monthlyCost ?? 10);
      setExpirationDate(clientToEdit.expirationDate || getTodayDateString());
      setIsActive(clientToEdit.isActive ?? true);
      setNotes(clientToEdit.notes || '');
    } else {
      // Defaults for new user
      setUsername('');
      setContactName('');
      setPhone('');
      setMonthlyCost(10);
      setInitialMonths(3);
      setExpirationDate(addMonthsToDate(getTodayDateString(), 3));
      setIsActive(true);
      setNotes('');
    }
    setError('');
  }, [clientToEdit, isOpen]);

  const handleDurationChange = (months) => {
    setInitialMonths(months);
    setExpirationDate(addMonthsToDate(getTodayDateString(), months));
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

    if (!isEditing && currentCredits < initialMonths) {
      setError(`Crediti insufficienti! Hai ${currentCredits} crediti ma ne servono ${initialMonths}. Ricarica prima i crediti.`);
      return;
    }

    onSave({
      user: username.trim(),
      contactName: contactName.trim(),
      phone: phone.trim(),
      monthlyCost: Number(monthlyCost) || 0,
      expirationDate,
      isActive,
      notes: notes.trim(),
      deductCredits: isEditing ? 0 : initialMonths
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111726] border border-[#1f2a45] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1f2a45] flex items-center justify-between bg-[#0e1320]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00ff9d]"></span>
            <h2 className="font-mono font-bold text-white text-base">
              {isEditing ? `Modifica Utente: ${clientToEdit.user}` : 'Aggiungi Nuovo Utente'}
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {error && (
            <div className="p-3 rounded-lg bg-[#ff3366]/10 border border-[#ff3366]/40 text-[#ff3366] text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Username (Mandatory) */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Username Account <span className="text-[#00ff9d]">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="es. Mario-pll"
                className="w-full bg-[#0a0d14] border border-[#1f2a45] focus:border-[#00ff9d] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none transition-colors"
                required
              />
              <User className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
            </div>
          </div>

          {/* Contact Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                Nome Contatto
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="es. Mario Rossi"
                className="w-full bg-[#0a0d14] border border-[#1f2a45] focus:border-[#00ff9d] rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                Telefono / WhatsApp
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="es. 3401234567"
                  className="w-full bg-[#0a0d14] border border-[#1f2a45] focus:border-[#00ff9d] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none transition-colors"
                />
                <MessageCircle className="w-4 h-4 text-[#25D366] absolute right-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Initial Duration Selector (Only for new user) */}
          {!isEditing && (
            <div className="p-3 rounded-xl bg-[#0e1424] border border-[#1e2c4a] space-y-2">
              <label className="block text-xs font-mono uppercase text-[#00f0ff] font-semibold">
                Durata Iniziale (Partenza da Oggi)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleDurationChange(m)}
                    className={`py-2 rounded-lg font-mono text-xs font-bold border transition-all ${
                      initialMonths === m
                        ? 'bg-[#00ff9d]/20 border-[#00ff9d] text-[#00ff9d] shadow-[0_0_10px_rgba(0,255,157,0.3)]'
                        : 'bg-[#0a0d14] border-[#1f2a45] text-slate-400 hover:text-white'
                    }`}
                  >
                    {m} {m === 1 ? 'Mese' : 'Mesi'}
                    <div className="text-[10px] opacity-75 font-normal">(-{m} cred)</div>
                  </button>
                ))}
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1">
                <span>Scadenza calcolata: <strong className="text-white">{expirationDate}</strong></span>
                <span className="text-[#ffb700]">Costo: {initialMonths} Crediti</span>
              </div>
            </div>
          )}

          {/* Expiration Date (editable) & Monthly Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                Data Scadenza <span className="text-[#00ff9d]">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full bg-[#0a0d14] border border-[#1f2a45] focus:border-[#00ff9d] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                Costo Mensile (€)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={monthlyCost}
                  onChange={(e) => setMonthlyCost(e.target.value)}
                  placeholder="10"
                  className="w-full bg-[#0a0d14] border border-[#1f2a45] focus:border-[#00ff9d] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none transition-colors"
                />
                <Euro className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Active status & Notes */}
          <div className="flex items-center gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-slate-300">
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
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Note (Opzionali)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="es. Rinnovo concordato, test..."
              className="w-full bg-[#0a0d14] border border-[#1f2a45] focus:border-[#00ff9d] rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#1f2a45] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#141b2b] text-slate-300 hover:text-white font-mono text-xs"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#00ff9d] hover:bg-[#00dd87] text-black font-semibold font-mono text-xs transition-all shadow-[0_0_15px_rgba(0,255,157,0.3)]"
            >
              {isEditing ? 'Salva Modifiche' : `Crea Utente (-${initialMonths} Crediti)`}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
