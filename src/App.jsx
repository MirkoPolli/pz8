import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import ClientList from './components/ClientList';
import UserModal from './components/UserModal';
import CreditModal from './components/CreditModal';
import ConfirmRenewModal from './components/ConfirmRenewModal';
import SettingsModal from './components/SettingsModal';
import AddressBookModal from './components/AddressBookModal';
import PaymentModal from './components/PaymentModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';

import { 
  auth, 
  googleProvider, 
  db, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot
} from './firebase';

import { INITIAL_CREDIT_STATE } from './data/sampleClients';
import { addMonthsToDate, getTodayDateString, formatDateItalian } from './utils/dateUtils';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [creditData, setCreditData] = useState({ creditsBalance: 0, creditCostUnit: 3.0, history: [] });

  const [filterTab, setFilterTab] = useState('active');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState(null);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddressBookOpen, setIsAddressBookOpen] = useState(false);
  
  // Payment modal state
  const [paymentModalState, setPaymentModalState] = useState({
    isOpen: false,
    client: null
  });

  // Delete modal state
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    client: null
  });

  const [notification, setNotification] = useState(null);
  const notifyTimerRef = useRef(null);

  // Admin access control (Mirko Polliotto)
  const ADMIN_EMAILS = ['polliotto.mirko@gmail.com'];
  const isAdmin = user && ADMIN_EMAILS.includes(user.email?.toLowerCase());

  // Column visibility settings (individual per user)
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('pz8_visible_columns');
    return saved ? JSON.parse(saved) : {
      contactName: true,
      monthlyCost: true,
      payment: true,
      notes: true,
      totalCreditsUsed: false
    };
  });

  // Token / Credit purchase cost unit (individual per user, e.g. 3€ for Mirko, 5€ for friend)
  const [tokenCost, setTokenCost] = useState(() => {
    const saved = localStorage.getItem('pz8_token_cost');
    return saved !== null ? Number(saved) : 3;
  });

  // Email Notification timing: 'today' (giorno scadenza), 'day_before' (1 giorno prima), 'two_days_before' (2 giorni prima)
  const [notifyTiming, setNotifyTiming] = useState(() => {
    const saved = localStorage.getItem('pz8_notify_timing');
    return saved || 'today';
  });

  // Renewal Confirmation state
  const [renewConfirmState, setRenewConfirmState] = useState({
    isOpen: false,
    client: null,
    months: 1
  });

  // Show temporary toast notification (with optional action button)
  const notify = (msg, type = 'info', action = null) => {
    if (notifyTimerRef.current) {
      clearTimeout(notifyTimerRef.current);
    }
    setNotification({ msg, type, action });
    notifyTimerRef.current = setTimeout(() => {
      setNotification(null);
      notifyTimerRef.current = null;
    }, 5000);
  };

  // 1. Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Garantisce che il documento principale /users/{uid} esista sempre
        try {
          await setDoc(doc(db, 'users', currentUser.uid), {
            email: currentUser.email,
            displayName: currentUser.displayName || '',
            lastLogin: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.warn("Impossibile salvare doc utente principale:", e);
        }
        notify(`Benvenuto ${currentUser.displayName || currentUser.email}!`, 'success');
      } else {
        setUser(null);
        setClients([]);
        setContacts([]);
        setCreditData({ creditsBalance: 0, creditCostUnit: 3.0, history: [] });
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time sync with Firestore when user is logged in
  useEffect(() => {
    if (!user) return;

    // A. Sync Clients Subcollection: /users/{uid}/clients
    const clientsRef = collection(db, 'users', user.uid, 'clients');
    const unsubClients = onSnapshot(clientsRef, (snapshot) => {
      const remoteClients = [];
      snapshot.forEach((docSnap) => {
        // Garantisce che l'ID del documento Firestore reale non venga sovrascritto
        remoteClients.push({ ...docSnap.data(), id: docSnap.id });
      });
      setClients(remoteClients);
    });

    // B. Sync Contacts Subcollection: /users/{uid}/contacts
    const contactsRef = collection(db, 'users', user.uid, 'contacts');
    const unsubContacts = onSnapshot(contactsRef, (snapshot) => {
      const remoteContacts = [];
      snapshot.forEach((docSnap) => {
        // Garantisce che l'ID del documento Firestore reale non venga sovrascritto
        remoteContacts.push({ ...docSnap.data(), id: docSnap.id });
      });
      // Sort alphabetically by name
      remoteContacts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setContacts(remoteContacts);
    });

    // C. Sync Profile & Credits: /users/{uid}/profile/data
    const profileRef = doc(db, 'users', user.uid, 'profile', 'data');
    const unsubProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        setCreditData(docSnap.data());
      } else {
        // Init profile
        setDoc(profileRef, {
          ...INITIAL_CREDIT_STATE,
          email: user.email,
          displayName: user.displayName || 'User'
        }, { merge: true });
      }
    });

    // D. Sync Settings & Visible Columns: /users/{uid}/settings/data
    const settingsRef = doc(db, 'users', user.uid, 'settings', 'data');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.visibleColumns) {
          setVisibleColumns(data.visibleColumns);
        }
        if (data.tokenCost !== undefined) {
          setTokenCost(Number(data.tokenCost));
          localStorage.setItem('pz8_token_cost', data.tokenCost);
        }
        if (data.notifyTiming) {
          setNotifyTiming(data.notifyTiming);
          localStorage.setItem('pz8_notify_timing', data.notifyTiming);
        }
      }
    });

    return () => {
      unsubClients();
      unsubContacts();
      unsubProfile();
      unsubSettings();
    };
  }, [user]);

  const handleToggleColumn = async (columnId) => {
    const updated = {
      ...visibleColumns,
      [columnId]: !visibleColumns[columnId]
    };
    setVisibleColumns(updated);
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'data'), { visibleColumns: updated }, { merge: true });
    } else {
      localStorage.setItem('pz8_visible_columns', JSON.stringify(updated));
    }
  };

  const handleChangeTokenCost = async (newCost) => {
    const val = Number(newCost);
    if (isNaN(val) || val < 0) return;
    setTokenCost(val);
    localStorage.setItem('pz8_token_cost', val);
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'data'), { tokenCost: val }, { merge: true });
    }
    notify(`Costo credito aggiornato a €${val}`, 'success');
  };

  const handleChangeNotifyTiming = async (timing) => {
    const timingLabels = {
      today: 'Il giorno della scadenza',
      day_before: 'Il giorno prima (24h)',
      two_days_before: '2 giorni prima (48h)'
    };
    if (!timingLabels[timing]) return;
    setNotifyTiming(timing);
    localStorage.setItem('pz8_notify_timing', timing);
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'data'), { notifyTiming: timing }, { merge: true });
    }
    notify(`Avviso email impostato: ${timingLabels[timing]}`, 'success');
  };

  // Auth Handlers
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login error:", err);
      notify(`Errore Login Google: ${err.message}`, 'error');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setClients([]);
    setContacts([]);
    setCreditData({ creditsBalance: 0, creditCostUnit: 3.0, history: [] });
    notify("Disconnesso.", 'info');
  };

  // Helper auto-save or update contact in Address Book
  const handleAutoSaveContact = async (contactPayload) => {
    if (!user || !contactPayload.name) return;
    const cleanName = contactPayload.name.trim();
    if (!cleanName) return;

    // Cerca se esiste già un contatto con questo nome (case-insensitive)
    const existing = contacts.find(c => (c.name || '').trim().toLowerCase() === cleanName.toLowerCase());

    if (existing) {
      // Aggiorna se sono presenti nuovi dati telefono/telegram
      const needsUpdate = 
        (contactPayload.phone && contactPayload.phone !== existing.phone) ||
        (contactPayload.telegram && contactPayload.telegram !== existing.telegram);

      if (needsUpdate) {
        await updateDoc(doc(db, 'users', user.uid, 'contacts', existing.id), {
          phone: contactPayload.phone || existing.phone || '',
          telegram: contactPayload.telegram || existing.telegram || ''
        });
      }
    } else {
      // Crea nuovo contatto in rubrica
      await addDoc(collection(db, 'users', user.uid, 'contacts'), {
        name: cleanName,
        phone: contactPayload.phone || '',
        telegram: contactPayload.telegram || '',
        notes: '',
        createdAt: new Date().toISOString()
      });
    }
  };

  // Manual save contact from Address Book Modal
  const handleSaveContact = async (contactData) => {
    if (!user) return;
    const { id, ...fields } = contactData;

    if (id) {
      await updateDoc(doc(db, 'users', user.uid, 'contacts', id), fields);
      notify(`Contatto "${fields.name}" aggiornato.`, 'success');
    } else {
      await addDoc(collection(db, 'users', user.uid, 'contacts'), {
        ...fields,
        createdAt: new Date().toISOString()
      });
      notify(`Nuovo contatto "${fields.name}" aggiunto alla rubrica!`, 'success');
    }
  };

  // Delete contact from Address Book
  const handleDeleteContact = async (contactId) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'contacts', contactId));
    notify("Contatto rimosso dalla rubrica.", 'info');
  };

  // Add / Edit Client
  const handleSaveClient = async (clientPayload) => {
    const { deductCredits, ...clientFields } = clientPayload;

    if (deductCredits > 0 && creditData.creditsBalance < deductCredits) {
      notify(`Crediti insufficienti! Servono ${deductCredits} crediti.`, 'error');
      return;
    }

    try {
      if (clientToEdit && clientToEdit.id) {
        // EDIT EXISTING
        if (user) {
          await setDoc(doc(db, 'users', user.uid, 'clients', clientToEdit.id), clientFields, { merge: true });
        }
        notify(`Utente "${clientFields.user}" salvato.`, 'success');
      } else {
        // CREATE NEW & DEDUCT CREDITS
        const newClientRecord = {
          ...clientFields,
          createdAt: new Date().toISOString(),
          lastRenewal: null,
          totalCreditsUsed: deductCredits || 0 // FIX: memorizza i crediti scalati alla creazione!
        };

        if (user) {
          await addDoc(collection(db, 'users', user.uid, 'clients'), newClientRecord);
        }

        if (deductCredits > 0) {
          handleDeductCredits(deductCredits, `Nuovo utente "${clientFields.user}" (${deductCredits}M)`);
        }
        notify(`Nuovo utente "${clientFields.user}" creato${deductCredits > 0 ? ` (-${deductCredits} crediti)` : ''}.`, 'success');
      }

      // Salva o aggiorna automaticamente il contatto nella Rubrica
      if (clientFields.contactName) {
        handleAutoSaveContact({
          name: clientFields.contactName,
          phone: clientFields.phone,
          telegram: clientFields.telegram
        });
      }
    } catch (err) {
      console.error("Errore salvataggio utente:", err);
      notify(`Errore durante il salvataggio: ${err.message}`, 'error');
    }
  };

  // Renewal Flow: 1. Request Confirmation Modal
  const handleRequestRenew = (client, months) => {
    if (isAdmin && creditData.creditsBalance < months) {
      notify(`Crediti insufficienti! Servono ${months} crediti. Ricarica prima!`, 'error');
      setIsCreditModalOpen(true);
      return;
    }
    setRenewConfirmState({
      isOpen: true,
      client,
      months
    });
  };

  // Renewal Flow: 2. Execute Renewal on Confirmation
  const handleConfirmRenew = async ({ markAsUnpaid, amountToAdd } = {}) => {
    const { client, months } = renewConfirmState;
    if (!client) return;

    setRenewConfirmState({ isOpen: false, client: null, months: 1 });

    const prevExpirationDate = client.expirationDate;
    const newExpiration = addMonthsToDate(prevExpirationDate, months);

    const renewalRecord = {
      months,
      prevExpirationDate,
      renewedAt: new Date().toISOString()
    };

    const newPaymentStatus = markAsUnpaid ? 'unpaid' : (client.paymentStatus || 'paid');
    const newAmountDue = markAsUnpaid 
      ? (Number(client.amountDue) || 0) + amountToAdd 
      : (client.paymentStatus === 'unpaid' ? (client.amountDue || 0) : 0);

    const updatedClient = {
      ...client,
      expirationDate: newExpiration,
      isActive: true,
      totalCreditsUsed: (client.totalCreditsUsed || 0) + months,
      lastRenewal: renewalRecord,
      paymentStatus: newPaymentStatus,
      amountDue: newAmountDue
    };

    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'clients', client.id), {
        expirationDate: newExpiration,
        isActive: true,
        totalCreditsUsed: (client.totalCreditsUsed || 0) + months,
        lastRenewal: renewalRecord,
        paymentStatus: newPaymentStatus,
        amountDue: newAmountDue
      }, { merge: true });
    }

    if (isAdmin) {
      handleDeductCredits(months, `Rinnovo +${months}M per "${client.user}"`);
    }
    notify(
      `Rinnovato "${client.user}" per +${months} Mesi fino al ${formatDateItalian(newExpiration)}${isAdmin ? ` (-${months} crediti)` : ''}${markAsUnpaid ? ` • Da saldare: €${newAmountDue}` : ''}`,
      'success',
      { label: 'Annulla', onClick: () => handleUndoRenew(updatedClient) }
    );
  };

  // Undo Renewal Flow: Rolls back date & refunds credits
  const handleUndoRenew = async (client) => {
    if (!client.lastRenewal) {
      notify("Nessun rinnovo recente da annullare per questo utente.", 'info');
      return;
    }

    const { months, prevExpirationDate } = client.lastRenewal;

    const revertedClient = {
      ...client,
      expirationDate: prevExpirationDate,
      totalCreditsUsed: Math.max(0, (client.totalCreditsUsed || 0) - months),
      lastRenewal: null
    };

    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'clients', client.id), {
        expirationDate: prevExpirationDate,
        totalCreditsUsed: Math.max(0, (client.totalCreditsUsed || 0) - months),
        lastRenewal: null
      }, { merge: true });
    }

    // Refund credits (solo admin)
    if (isAdmin) {
      handleAddCredits(months, 0, `Rimborso annullamento rinnovo per "${client.user}" (+${months}M)`);
      notify(`Rinnovo annullato! Data ripristinata e rimborsati +${months} crediti.`, 'info');
    } else {
      notify(`Rinnovo annullato! Data ripristinata.`, 'info');
    }
  };

  // Save / Update Payment status
  const handleSavePayment = async (clientId, paymentData) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'clients', clientId), paymentData, { merge: true });
    if (paymentData.paymentStatus === 'paid') {
      notify("Pagamento registrato: tutto saldato!", 'success');
    } else {
      notify(`Stato pagamento aggiornato: debito €${paymentData.amountDue}`, 'info');
    }
  };

  // Undo Quick Pay: ripristina debito precedente
  const handleUndoQuickPay = async (prevSnapshot) => {
    if (!user || !prevSnapshot) return;
    await setDoc(doc(db, 'users', user.uid, 'clients', prevSnapshot.id), {
      paymentStatus: prevSnapshot.paymentStatus,
      amountDue: prevSnapshot.amountDue,
      paymentNote: prevSnapshot.paymentNote
    }, { merge: true });
    notify(`Saldo annullato: ripristinato €${prevSnapshot.amountDue} da saldare per "${prevSnapshot.user}".`, 'info');
  };

  // Quick Pay (1-click mark as paid)
  const handleQuickPay = async (client) => {
    if (!user) return;
    const prevSnapshot = {
      id: client.id,
      user: client.user,
      paymentStatus: client.paymentStatus || 'unpaid',
      amountDue: Number(client.amountDue) || 0,
      paymentNote: client.paymentNote || ''
    };
    await setDoc(doc(db, 'users', user.uid, 'clients', client.id), {
      paymentStatus: 'paid',
      amountDue: 0,
      paymentNote: ''
    }, { merge: true });
    notify(
      `Pagamento di €${prevSnapshot.amountDue} per "${client.user}" incassato!`,
      'success',
      { label: 'Annulla', onClick: () => handleUndoQuickPay(prevSnapshot) }
    );
  };

  // Toggle Client Active
  const handleToggleActive = async (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const newStatus = !client.isActive;

    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'clients', clientId), { isActive: newStatus }, { merge: true });
    }
    notify(`Stato di "${client.user}" impostato su ${newStatus ? 'ATTIVO' : 'OFF'}.`, 'info');
  };

  // Delete Client
  const handleDeleteClient = async (clientId) => {
    try {
      if (user) {
        await deleteDoc(doc(db, 'users', user.uid, 'clients', clientId));
      }
      notify("Utente rimosso con successo.", 'info');
    } catch (err) {
      console.error("Errore cancellazione:", err);
      notify(`Errore cancellazione: ${err.message}`, 'error');
    }
  };

  // Credits Management
  const handleAddCredits = async (amount, cost, description) => {
    const newTx = {
      id: 'tx_' + Date.now(),
      type: 'purchase',
      amount,
      cost,
      description,
      timestamp: new Date().toISOString()
    };

    const newCreditData = {
      ...creditData,
      creditsBalance: (creditData.creditsBalance || 0) + amount,
      history: [...(creditData.history || []), newTx]
    };

    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'profile', 'data'), newCreditData, { merge: true });
    } else {
      setCreditData(newCreditData);
    }
  };

  const handleDeductCredits = async (amount, description) => {
    const newTx = {
      id: 'tx_' + Date.now(),
      type: 'usage',
      amount,
      cost: 0,
      description,
      timestamp: new Date().toISOString()
    };

    const newCreditData = {
      ...creditData,
      creditsBalance: Math.max(0, (creditData.creditsBalance || 0) - amount),
      history: [...(creditData.history || []), newTx]
    };

    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'profile', 'data'), newCreditData, { merge: true });
    } else {
      setCreditData(newCreditData);
    }
  };

  const activeClientsCount = clients.filter(c => c.isActive).length;
  const monthlyRevenue = clients.filter(c => c.isActive).reduce((sum, c) => sum + (Number(c.monthlyCost) || 0), 0);

  // --- LOGIN GATE: show splash screen when not logged in ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#080b12] flex items-center justify-center">
        <div className="text-[#00ff9d] font-mono text-sm animate-pulse">CARICAMENTO...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#080b12] text-slate-100 flex flex-col items-center justify-center gap-8 font-sans">
        {/* Logo / Title */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00ff9d] to-[#00b8d9] flex items-center justify-center">
              <span className="text-black font-black text-lg font-mono">P8</span>
            </div>
            <h1 className="text-3xl font-black font-mono tracking-tight text-white">
              PZ8<span className="text-[#00ff9d]">::</span>MANAGER
            </h1>
          </div>
          <p className="text-slate-400 font-mono text-sm">Gestione abbonamenti IPTV</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0d121f] border border-[#1b253b] rounded-2xl p-8 flex flex-col items-center gap-5 w-full max-w-xs shadow-2xl">
          <p className="text-slate-300 font-mono text-xs text-center leading-relaxed">
            Accedi con il tuo account Google per visualizzare e gestire i tuoi abbonamenti.
          </p>
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold font-mono text-sm py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Accedi con Google
          </button>
        </div>

        {/* Footer minimal */}
        <p className="text-slate-600 font-mono text-xs">pz8-manager.web.app</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080b12] text-slate-100 flex flex-col font-sans selection:bg-[#00ff9d] selection:text-black">
      
      {/* Toast Alert with Undo button */}
      {notification && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-xl border text-xs font-mono shadow-2xl flex items-center gap-3 transition-all ${
          notification.type === 'error'
            ? 'bg-[#ff3366] text-white border-[#ff3366]'
            : notification.type === 'success'
            ? 'bg-[#00ff9d] text-black border-[#00ff9d] font-bold'
            : 'bg-[#151c2e] text-[#00f0ff] border-[#00f0ff]/40'
        }`}>
          <span>{notification.msg}</span>
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="px-2 py-0.5 rounded bg-black/30 hover:bg-black/50 text-white font-bold underline"
            >
              {notification.action.label}
            </button>
          )}
        </div>
      )}

      {/* Header Bar */}
      <Header
        user={user}
        creditsBalance={creditData.creditsBalance || 0}
        isAdmin={isAdmin}
        onOpenCreditModal={() => setIsCreditModalOpen(true)}
        onOpenNewUserModal={() => {
          setClientToEdit(null);
          setIsUserModalOpen(true);
        }}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenAddressBook={() => setIsAddressBookOpen(true)}
        onLoginGoogle={handleGoogleLogin}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* KPI & Stats Dashboard */}
        <StatsBar
          clients={clients}
          creditsBalance={creditData.creditsBalance || 0}
          isAdmin={isAdmin}
          tokenCost={tokenCost}
          onFilterExpiring={() => setFilterTab('expiring')}
          onFilterUnpaid={() => setFilterTab('unpaid')}
          onOpenCreditModal={() => setIsCreditModalOpen(true)}
        />

        {/* Client Table & List */}
        <ClientList
          clients={clients}
          onRequestRenew={handleRequestRenew}
          onUndoRenew={handleUndoRenew}
          onEdit={(client) => {
            setClientToEdit(client);
            setIsUserModalOpen(true);
          }}
          onDelete={(clientId) => {
            const c = clients.find(x => x.id === clientId);
            if (c) {
              setDeleteModalState({ isOpen: true, client: c });
            }
          }}
          onToggleActive={handleToggleActive}
          filterTab={filterTab}
          setFilterTab={setFilterTab}
          creditsBalance={creditData.creditsBalance || 0}
          visibleColumns={visibleColumns}
          isAdmin={isAdmin}
          onQuickPay={handleQuickPay}
          onOpenPaymentModal={(client) => setPaymentModalState({ isOpen: true, client })}
        />

      </main>

      {/* Modals */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setClientToEdit(null);
        }}
        onSave={handleSaveClient}
        clientToEdit={clientToEdit}
        currentCredits={creditData.creditsBalance || 0}
        contacts={contacts}
        onUndoRenew={handleUndoRenew}
        isAdmin={isAdmin}
      />

      <CreditModal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        creditData={creditData}
        onAddCredits={(amount, cost, desc) => handleAddCredits(amount, cost, desc)}
        activeClientsCount={activeClientsCount}
        monthlyRevenue={monthlyRevenue}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        visibleColumns={visibleColumns}
        onToggleColumn={handleToggleColumn}
        tokenCost={tokenCost}
        onChangeTokenCost={handleChangeTokenCost}
        notifyTiming={notifyTiming}
        onChangeNotifyTiming={handleChangeNotifyTiming}
        user={user}
        isAdmin={isAdmin}
      />

      <ConfirmRenewModal
        isOpen={renewConfirmState.isOpen}
        onClose={() => setRenewConfirmState({ isOpen: false, client: null, months: 1 })}
        onConfirm={handleConfirmRenew}
        client={renewConfirmState.client}
        months={renewConfirmState.months}
        creditsBalance={creditData.creditsBalance || 0}
        isAdmin={isAdmin}
      />

      {/* Address Book Modal */}
      <AddressBookModal
        isOpen={isAddressBookOpen}
        onClose={() => setIsAddressBookOpen(false)}
        contacts={contacts}
        clients={clients}
        onSaveContact={handleSaveContact}
        onDeleteContact={handleDeleteContact}
        onSelectContactForNewUser={(contact) => {
          setClientToEdit({
            contactName: contact.name,
            phone: contact.phone,
            telegram: contact.telegram,
            notes: contact.notes
          });
          setIsUserModalOpen(true);
        }}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModalState.isOpen}
        onClose={() => setPaymentModalState({ isOpen: false, client: null })}
        client={paymentModalState.client}
        onSavePayment={handleSavePayment}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, client: null })}
        onConfirm={handleDeleteClient}
        client={deleteModalState.client}
      />

    </div>
  );
}
