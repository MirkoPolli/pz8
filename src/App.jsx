import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import ClientList from './components/ClientList';
import UserModal from './components/UserModal';
import CreditModal from './components/CreditModal';
import ConfirmRenewModal from './components/ConfirmRenewModal';
import SettingsModal from './components/SettingsModal';

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

import { INITIAL_CLIENTS, INITIAL_CREDIT_STATE } from './data/sampleClients';
import { addMonthsToDate, getTodayDateString } from './utils/dateUtils';

export default function App() {
  const [user, setUser] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [clients, setClients] = useState(() => {
    const saved = localStorage.getItem('pz8_demo_clients');
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });
  const [creditData, setCreditData] = useState(() => {
    const saved = localStorage.getItem('pz8_demo_credits');
    return saved ? JSON.parse(saved) : INITIAL_CREDIT_STATE;
  });

  const [filterTab, setFilterTab] = useState('all');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState(null);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  // Admin access control (Mirko Polliotto)
  const ADMIN_EMAILS = ['polliotto.mirko@gmail.com'];
  const isAdmin = isDemoMode || (user && ADMIN_EMAILS.includes(user.email?.toLowerCase()));

  // Column visibility settings (individual per user)
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('pz8_visible_columns');
    return saved ? JSON.parse(saved) : {
      contactName: true,
      monthlyCost: true,
      notes: true,
      totalCreditsUsed: false
    };
  });

  // Renewal Confirmation state
  const [renewConfirmState, setRenewConfirmState] = useState({
    isOpen: false,
    client: null,
    months: 1
  });

  // Show temporary toast notification (with optional action button)
  const notify = (msg, type = 'info', action = null) => {
    setNotification({ msg, type, action });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsDemoMode(false);
        notify(`Accesso effettuato come ${currentUser.displayName || currentUser.email}`, 'success');
      } else {
        setUser(null);
        setIsDemoMode(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time sync with Firestore when user is logged in
  useEffect(() => {
    if (!user || isDemoMode) return;

    // A. Sync Clients Subcollection: /users/{uid}/clients
    const clientsRef = collection(db, 'users', user.uid, 'clients');
    const unsubClients = onSnapshot(clientsRef, (snapshot) => {
      const remoteClients = [];
      snapshot.forEach((docSnap) => {
        remoteClients.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (remoteClients.length > 0) {
        setClients(remoteClients);
      }
    });

    // B. Sync Profile & Credits: /users/{uid}/profile/data
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

    // C. Sync Settings & Visible Columns: /users/{uid}/settings/data
    const settingsRef = doc(db, 'users', user.uid, 'settings', 'data');
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().visibleColumns) {
        setVisibleColumns(docSnap.data().visibleColumns);
      }
    });

    return () => {
      unsubClients();
      unsubProfile();
      unsubSettings();
    };
  }, [user, isDemoMode]);

  // 3. Save to localStorage in Demo Mode
  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem('pz8_demo_clients', JSON.stringify(clients));
    }
  }, [clients, isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem('pz8_demo_credits', JSON.stringify(creditData));
    }
  }, [creditData, isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem('pz8_visible_columns', JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, isDemoMode]);

  const handleToggleColumn = async (columnId) => {
    const updated = {
      ...visibleColumns,
      [columnId]: !visibleColumns[columnId]
    };
    setVisibleColumns(updated);
    if (!isDemoMode && user) {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'data'), { visibleColumns: updated }, { merge: true });
    } else {
      localStorage.setItem('pz8_visible_columns', JSON.stringify(updated));
    }
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
    setIsDemoMode(true);
    notify("Disconnesso. Modalità Demo attiva.", 'info');
  };

  // Add / Edit Client
  const handleSaveClient = async (clientPayload) => {
    const { deductCredits, ...clientFields } = clientPayload;

    if (deductCredits > 0 && creditData.creditsBalance < deductCredits) {
      notify(`Crediti insufficienti! Servono ${deductCredits} crediti.`, 'error');
      return;
    }

    if (clientToEdit) {
      // EDIT EXISTING
      if (!isDemoMode && user) {
        await updateDoc(doc(db, 'users', user.uid, 'clients', clientToEdit.id), clientFields);
      } else {
        setClients(prev => prev.map(c => c.id === clientToEdit.id ? { ...c, ...clientFields } : c));
      }
      notify(`Utente "${clientFields.user}" salvato.`, 'success');
    } else {
      // CREATE NEW & DEDUCT CREDITS
      const newClientRecord = {
        ...clientFields,
        createdAt: new Date().toISOString(),
        lastRenewal: null
      };

      if (!isDemoMode && user) {
        await addDoc(collection(db, 'users', user.uid, 'clients'), newClientRecord);
      } else {
        const newClient = {
          id: 'c_' + Date.now(),
          ...newClientRecord
        };
        setClients(prev => [newClient, ...prev]);
      }

      if (deductCredits > 0) {
        handleDeductCredits(deductCredits, `Nuovo utente "${clientFields.user}" (${deductCredits}M)`);
      }
      notify(`Nuovo utente "${clientFields.user}" creato (-${deductCredits} crediti).`, 'success');
    }
  };

  // Renewal Flow: 1. Request Confirmation Modal
  const handleRequestRenew = (client, months) => {
    if (creditData.creditsBalance < months) {
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
  const handleConfirmRenew = async () => {
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

    const updatedClient = {
      ...client,
      expirationDate: newExpiration,
      isActive: true,
      totalCreditsUsed: (client.totalCreditsUsed || 0) + months,
      lastRenewal: renewalRecord
    };

    if (!isDemoMode && user) {
      await updateDoc(doc(db, 'users', user.uid, 'clients', client.id), {
        expirationDate: newExpiration,
        isActive: true,
        totalCreditsUsed: (client.totalCreditsUsed || 0) + months,
        lastRenewal: renewalRecord
      });
    } else {
      setClients(prev => prev.map(c => c.id === client.id ? updatedClient : c));
    }

    handleDeductCredits(months, `Rinnovo +${months}M per "${client.user}"`);
    notify(
      `Rinnovato "${client.user}" per +${months} Mesi fino al ${newExpiration} (-${months} crediti)`,
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

    if (!isDemoMode && user) {
      await updateDoc(doc(db, 'users', user.uid, 'clients', client.id), {
        expirationDate: prevExpirationDate,
        totalCreditsUsed: Math.max(0, (client.totalCreditsUsed || 0) - months),
        lastRenewal: null
      });
    } else {
      setClients(prev => prev.map(c => c.id === client.id ? revertedClient : c));
    }

    // Refund credits
    handleAddCredits(months, 0, `Rimborso annullamento rinnovo per "${client.user}" (+${months}M)`);
    notify(`Rinnovo annullato! Data ripristinata e rimborsati +${months} crediti.`, 'info');
  };

  // Toggle Client Active
  const handleToggleActive = async (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const newStatus = !client.isActive;

    if (!isDemoMode && user) {
      await updateDoc(doc(db, 'users', user.uid, 'clients', clientId), { isActive: newStatus });
    } else {
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, isActive: newStatus } : c));
    }
    notify(`Stato di "${client.user}" impostato su ${newStatus ? 'ATTIVO' : 'OFF'}.`, 'info');
  };

  // Delete Client
  const handleDeleteClient = async (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!window.confirm(`Vuoi davvero eliminare l'utente "${client?.user}"?`)) return;

    if (!isDemoMode && user) {
      await deleteDoc(doc(db, 'users', user.uid, 'clients', clientId));
    } else {
      setClients(prev => prev.filter(c => c.id !== clientId));
    }
    notify(`Utente rimosso.`, 'info');
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

    if (!isDemoMode && user) {
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

    if (!isDemoMode && user) {
      await setDoc(doc(db, 'users', user.uid, 'profile', 'data'), newCreditData, { merge: true });
    } else {
      setCreditData(newCreditData);
    }
  };

  // CSV Import (from Google Sheets)
  const handleImportCsv = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        const imported = [];

        // Check if row 1 has balance & purchased history
        let detectedBalance = null;
        if (lines.length > 0) {
          const row1Cols = lines[0].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
          // In sheet, G1 is available credits (e.g. 78)
          const g1 = parseInt(row1Cols[6], 10);
          if (!isNaN(g1)) {
            detectedBalance = g1;
          }
        }

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
          const username = cols[0];
          if (!username || username === 'Davide-lan' && cols[1] === 'Contatto') continue;

          const contact = cols[1] || '';
          const enabled = cols[2] === 'x' || cols[2] === 'X' || cols[2] === 'true';
          const rawDate = cols[3] || '';
          const cost = parseFloat(cols[4]) || 10;
          const creditsUsed = parseInt(cols[5], 10) || 0;

          // Convert DD/MM/YYYY to YYYY-MM-DD
          let formattedDate = rawDate;
          if (rawDate.includes('/')) {
            const parts = rawDate.split('/');
            if (parts.length === 3) {
              formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }

          imported.push({
            id: 'csv_' + i + '_' + Date.now(),
            user: username,
            contactName: contact,
            phone: '',
            expirationDate: formattedDate || getTodayDateString(),
            monthlyCost: cost,
            isActive: enabled,
            totalCreditsUsed: creditsUsed,
            notes: 'Importato da Sheet',
            lastRenewal: null
          });
        }

        if (imported.length > 0) {
          if (!isDemoMode && user) {
            for (const item of imported) {
              await addDoc(collection(db, 'users', user.uid, 'clients'), item);
            }
            if (detectedBalance !== null) {
              await updateDoc(doc(db, 'users', user.uid, 'profile', 'data'), {
                creditsBalance: detectedBalance
              });
            }
          } else {
            setClients(imported);
            if (detectedBalance !== null) {
              setCreditData(prev => ({ ...prev, creditsBalance: detectedBalance }));
            }
          }
          notify(`Importati con successo ${imported.length} account dal foglio!`, 'success');
        }
      } catch (err) {
        console.error("CSV import error:", err);
        notify("Errore durante l'importazione del file CSV", 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const activeClientsCount = clients.filter(c => c.isActive).length;
  const monthlyRevenue = clients.filter(c => c.isActive).reduce((sum, c) => sum + (Number(c.monthlyCost) || 0), 0);

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
        onLoginGoogle={handleGoogleLogin}
        onLogout={handleLogout}
        isDemoMode={isDemoMode}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* KPI & Stats Dashboard */}
        <StatsBar
          clients={clients}
          creditsBalance={creditData.creditsBalance || 0}
          isAdmin={isAdmin}
          onFilterExpiring={() => setFilterTab('expiring')}
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
          onDelete={handleDeleteClient}
          onToggleActive={handleToggleActive}
          onImportCsv={handleImportCsv}
          filterTab={filterTab}
          setFilterTab={setFilterTab}
          creditsBalance={creditData.creditsBalance || 0}
          visibleColumns={visibleColumns}
          isAdmin={isAdmin}
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
        user={user}
      />

      <ConfirmRenewModal
        isOpen={renewConfirmState.isOpen}
        onClose={() => setRenewConfirmState({ isOpen: false, client: null, months: 1 })}
        onConfirm={handleConfirmRenew}
        client={renewConfirmState.client}
        months={renewConfirmState.months}
        creditsBalance={creditData.creditsBalance || 0}
      />

    </div>
  );
}
