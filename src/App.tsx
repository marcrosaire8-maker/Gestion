/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { DbService } from './services/dbService';
import { UserProfile, Transaction, InventaireItem } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import FormulaireTransaction from './components/FormulaireTransaction';
import Inventaire from './components/Inventaire';
import Suppression from './components/Suppression';
import Historique from './components/Historique';
import GestionUtilisateurs from './components/GestionUtilisateurs';
import RapportFinancier from './components/RapportFinancier';
import { 
  BarChart3, 
  PlusCircle, 
  Package, 
  LogOut, 
  User, 
  Sparkles, 
  TrendingUp, 
  Database,
  Building,
  RefreshCcw,
  RefreshCw,
  Trash2,
  History,
  Users,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';

type TabType = 'dashboard' | 'saisie' | 'inventaire' | 'historique' | 'rapport' | 'utilisateurs' | 'suppression';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Database States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventaire, setInventaire] = useState<InventaireItem[]>([]);
  const [fallbackStatus, setFallbackStatus] = useState({ isFallback: false, reason: '' });
  const [dataError, setDataError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Auto-authenticate check on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const currentUser = await DbService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (err) {
        console.warn("Auth check failed:", err);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkSession();
  }, []);

  const refreshAllData = async () => {
    if (!user) return;
    setDataError(null);
    setLoadingData(true);
    try {
      // Parallel DB fetching
      const [txs, inv] = await Promise.all([
        DbService.getTransactions(),
        DbService.getInventaire()
      ]);
      setTransactions(txs);
      setInventaire(inv);
      setFallbackStatus(DbService.getFallbackStatus());
    } catch (err: any) {
      setDataError("Échec du chargement des données. " + err.message);
    } finally {
      setLoadingData(false);
    }
  };

  // Whenever user authenticates or changes, we fetch the financial logs
  useEffect(() => {
    if (user) {
      refreshAllData();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await DbService.signOut();
    } catch (err) {
      console.warn(err);
    }
    setUser(null);
    setTransactions([]);
    setInventaire([]);
    setActiveTab('dashboard');
  };

  const handleNewTransaction = (tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);
  };

  const handleNewInventoryItem = (item: InventaireItem) => {
    setInventaire(prev => [...prev, item]);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 select-none">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-xs text-slate-400 font-medium tracking-wide">Vérification de la session en cours...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in, force Login screen
  if (!user) {
    return <Login onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-600/30 font-sans flex flex-col">
      {/* Upper Navigation Header Bar */}
      <header className="border-b border-slate-900 bg-slate-900/60 sticky top-0 z-40 backdrop-blur-md px-4 sm:px-6 py-4" id="app-header">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/10">
              <TrendingUp className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5 leading-none">
                Compta & Inventaire
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 font-semibold uppercase">Bénin</span>
              </h1>
              <p className="text-[10px] text-slate-400 mt-1 leading-none">Système de pilotage financier sécurisé avec Supabase</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* User status tag details */}
            <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <div className="text-left leading-none">
                <span className="block font-semibold text-slate-200 text-[11px] truncate max-w-[150px]">{user.email}</span>
                <span className="block text-[8px] text-slate-400 font-mono uppercase mt-0.5">
                  {user.role === 'admin' ? 'Co-fondateur (Admin)' : 'Associé d\'exploitation'}
                </span>
              </div>
              <span className="h-4 border-l border-slate-800" />
              <button 
                id="btn-logout"
                onClick={handleLogout}
                className="p-1 hover:bg-slate-900 text-slate-400 hover:text-rose-400 transition-all rounded cursor-pointer"
                title="Déconnexion sécurisée"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Primary Layout Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Navigation Tabs bar */}
        <div className="flex border-b border-slate-900" id="tabs-group">
          <button
            id="tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`py-3.5 px-5 text-xs font-semibold tracking-wide flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/[0.02]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/15'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Tableau de Bord Compta
          </button>
          
          <button
            id="tab-saisie"
            onClick={() => setActiveTab('saisie')}
            className={`py-3.5 px-5 text-xs font-semibold tracking-wide flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'saisie'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/[0.02]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/15'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Saisie Transaction
          </button>
          
          <button
            id="tab-inventaire"
            onClick={() => setActiveTab('inventaire')}
            className={`py-3.5 px-5 text-xs font-semibold tracking-wide flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'inventaire'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/[0.02]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/15'
            }`}
          >
            <Package className="w-4 h-4" />
            Inventaire Matériel ({inventaire.length})
          </button>

          <button
            id="tab-historique"
            onClick={() => setActiveTab('historique')}
            className={`py-3.5 px-5 text-xs font-semibold tracking-wide flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'historique'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/[0.02]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/15'
            }`}
          >
            <History className="w-4 h-4 text-indigo-400/85" />
            Historique d'Audit
          </button>

          <button
            id="tab-rapport"
            onClick={() => setActiveTab('rapport')}
            className={`py-3.5 px-5 text-xs font-semibold tracking-wide flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'rapport'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/[0.02]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/15'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-400/85" />
            Rapport Financier
          </button>

          {user.role === 'admin' && (
            <>
              <button
                id="tab-utilisateurs"
                onClick={() => setActiveTab('utilisateurs')}
                className={`py-3.5 px-5 text-xs font-semibold tracking-wide flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'utilisateurs'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/[0.02]'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/15'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-400/85" />
                Accès & Associés
              </button>

              <button
                id="tab-suppression"
                onClick={() => setActiveTab('suppression')}
                className={`py-3.5 px-5 text-xs font-semibold tracking-wide flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'suppression'
                    ? 'border-rose-500 text-rose-400 bg-rose-500/[0.02]'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/15'
                }`}
              >
                <Trash2 className="w-4 h-4 text-rose-500/80" />
                Annulation & Suppressions
              </button>
            </>
          )}
        </div>

        {/* Global Loading or Error messages */}
        {dataError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between gap-3 text-rose-200 text-xs" id="global-data-error">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <p>{dataError}</p>
            </div>
            <button 
              onClick={refreshAllData}
              className="px-3 py-1 bg-rose-500/20 rounded hover:bg-rose-500/35 transition-all font-semibold font-mono"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Render Selected View */}
        <div className="min-h-[400px]">
          {loadingData && transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <svg className="animate-spin h-7 w-7 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-xs">Chargement sécurisé des bases de données...</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              key={activeTab}
            >
              {activeTab === 'dashboard' && (
                <Dashboard 
                  transactions={transactions} 
                  inventaire={inventaire} 
                  user={user}
                  fallbackStatus={fallbackStatus}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'saisie' && (
                <FormulaireTransaction 
                  inventaire={inventaire}
                  onTransactionSuccess={handleNewTransaction}
                  onNewInventoryItem={handleNewInventoryItem}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'inventaire' && (
                <Inventaire 
                  items={inventaire}
                  onAddNewItem={handleNewInventoryItem}
                  onRefresh={refreshAllData}
                  user={user}
                />
              )}

              {activeTab === 'historique' && (
                <Historique 
                  user={user}
                  onRefresh={refreshAllData}
                />
              )}

              {activeTab === 'rapport' && (
                <RapportFinancier 
                  transactions={transactions}
                  inventaire={inventaire}
                  user={user}
                />
              )}

              {activeTab === 'utilisateurs' && user.role === 'admin' && (
                <GestionUtilisateurs 
                  user={user}
                />
              )}

              {activeTab === 'suppression' && user.role === 'admin' && (
                <Suppression 
                  transactions={transactions} 
                  inventaire={inventaire} 
                  onRefresh={refreshAllData}
                />
              )}
            </motion.div>
          )}
        </div>
      </main>

      {/* Sticky Bottom Actions / Reset cache helper for developers */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-slate-500 text-[11px] gap-4">
          <p>© 2026 Cabinet de Gestion d'Inventaire et Finances. Tous droits réservés.</p>
          <div className="flex items-center gap-3">
            <span className="text-slate-600">Outils de test :</span>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-slate-300 transition-all font-mono text-[10px] cursor-pointer"
            >
              Vider le cache de démonstration
            </button>
          </div>
        </div>
      </footer>

      {/* Modern Custom Confirmation Modal for Cache resetting */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-indigo-400">
              <span className="p-2 bg-indigo-500/10 rounded-lg">⚙️</span>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Réinitialiser l'application ?</h4>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Voulez-vous réinitialiser l'ensemble des caches de démonstration locale et recharger la page ? 
              Cette action remettra les données de démonstration d'origine de l'application à zéro.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-705 text-slate-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  DbService.resetLocalData();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}