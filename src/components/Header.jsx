import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  PlusCircle, 
  Settings,
  LogOut, 
  LogIn, 
  Clock,
  BookUser,
  RotateCw
} from 'lucide-react';
import { forceReloadApp } from '../utils/reloadApp';

export default function Header({ 
  user, 
  creditsBalance, 
  isAdmin,
  onGoHome,
  onOpenCreditModal, 
  onOpenNewUserModal, 
  onOpenSettingsModal,
  onOpenAddressBook,
  onLoginGoogle, 
  onLogout
}) {
  const [time, setTime] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await forceReloadApp();
  };

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('it-IT', { hour12: false }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="border-b border-[#1c2438] bg-[#0c101a]/95 backdrop-blur sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Logo & Terminal Title (No 'v2 geek' badge) */}
        <div
          onClick={onGoHome}
          className={`flex items-center gap-3 ${onGoHome ? 'cursor-pointer group' : ''}`}
          title={onGoHome ? 'Torna alla dashboard' : undefined}
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-[#00ff9d]/10 border border-[#00ff9d]/30 text-[#00ff9d]">
            <Terminal className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00ff9d] rounded-full animate-ping opacity-75"></span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00ff9d] rounded-full"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold tracking-wider text-white text-base sm:text-lg">
                PZ8<span className="text-[#00ff9d]">::</span>MANAGER
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="text-slate-500">{time} CET</span>
              <span>•</span>
              <span className="text-[#00ff9d]">● ONLINE</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          
          {/* New User Button */}
          <button
            onClick={onOpenNewUserModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00ff9d] hover:bg-[#00dd87] text-black font-semibold text-xs sm:text-sm transition-all shadow-[0_0_15px_rgba(0,255,157,0.3)] hover:shadow-[0_0_20px_rgba(0,255,157,0.5)]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuovo Utente</span>
          </button>

          {/* Address Book Modal Button */}
          <button
            onClick={onOpenAddressBook}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#151c2e] hover:bg-[#1f2a45] text-slate-300 hover:text-[#00ff9d] border border-[#1f293d] transition-all text-xs font-mono"
            title="Rubrica Contatti (Gestione referenti e account collegati)"
          >
            <BookUser className="w-4 h-4 text-[#00f0ff]" />
            <span className="hidden md:inline">Rubrica</span>
          </button>

          {/* Refresh App / Cache Buster Button (Ideale per iPhone / Safari) */}
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-[#151c2e] hover:bg-[#1f2a45] text-slate-300 hover:text-[#00ff9d] border border-[#1f293d] transition-all"
            title="Aggiorna / Ricarica App (svuota cache smartphone e carica l'ultima versione)"
          >
            <RotateCw className={`w-4 h-4 text-[#00ff9d] ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={onOpenSettingsModal}
            className="p-2 rounded-lg bg-[#151c2e] hover:bg-[#1f2a45] text-slate-300 hover:text-[#00ff9d] border border-[#1f293d] transition-all"
            title="Impostazioni Campi Visibili"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Auth Info */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[#1f293d]">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || "User"} 
                  className="w-8 h-8 rounded-full border border-[#00ff9d]/40"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1b253b] flex items-center justify-center font-mono text-xs text-[#00ff9d] border border-[#00ff9d]/30">
                  {(user.displayName || user.email || "U")[0].toUpperCase()}
                </div>
              )}
              <button
                onClick={onLogout}
                className="p-1.5 rounded text-slate-400 hover:text-[#ff3366] hover:bg-[#ff3366]/10 transition-colors"
                title="Disconnetti"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginGoogle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#162035] hover:bg-[#1e2c4a] border border-[#00f0ff]/40 text-[#00f0ff] text-xs font-mono font-semibold transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Google Login</span>
              <span className="sm:hidden">Login</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
}
