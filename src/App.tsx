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
  TrendingUp, 
  Database,
  RefreshCw,
  Trash2,
  History,
  Users,
  FileText,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  X,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type TabType = 'dashboard' | 'saisie' | 'inventaire' | 'historique' | 'rapport' | 'utilisateurs' | 'suppression';

export default function App() {
  // --- LOGIQUE CONSERVÉE À L'IDENTIQUE ---
  const [user, setUser] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventaire, setInventaire] = useState<InventaireItem[]>([]);
  const [fallbackStatus, setFallbackStatus] = useState({ isFallback: false, reason: '' });
  const [dataError, setDataError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const currentUser = await DbService.getCurrentUser();
        if (currentUser) setUser(currentUser);
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

  useEffect(() => {
    if (user) refreshAllData();
  }, [user]);

  const handleLogout = async () => {
    try { await DbService.signOut(); } catch (err) { console.warn(err); }
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
  // ---------------------------------------

  // Écran de chargement initial
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-500 tracking-tight">Initialisation du système sécurisé...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 font-sans flex flex-col">
      
      {/* Header Institutionnel */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm" id="app-header">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2 leading-none">
                FINANCE <span className="text-blue-600">HUB</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 font-bold uppercase tracking-wider">Benin</span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Console de pilotage financier & inventaire</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Profil Utilisateur */}
            <div className="hidden sm:flex items-center gap-3 pr-6 border-r border-slate-200">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800 leading-none">{user.email}</p>
                <p className="text-[10px] text-blue-600 font-bold uppercase mt-1 tracking-tighter">
                  {user.role === 'admin' ? 'Administrateur Principal' : 'Associé d\'exploitation'}
                </p>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                <ShieldCheck className="w-5 h-5 text-slate-600" />
              </div>
            </div>
            
            <button 
              id="btn-logout"
              onClick={handleLogout}
              className="group flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors font-bold text-xs"
            >
              <div className="p-2 bg-slate-50 group-hover:bg-red-50 rounded-lg transition-colors">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="hidden md:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Barre de Navigation Secondaire (Tabs) */}
      <nav className="bg-white border-b border-slate-200 overflow-x-auto no-scrollbar scroll-smooth" id="tabs-group">
        <div className="max-w-[1400px] mx-auto px-6 flex">
          {[
            { id: 'dashboard', label: 'Tableau de Bord', icon: BarChart3 },
            { id: 'saisie', label: 'Nouvelle Opération', icon: PlusCircle },
            { id: 'inventaire', label: `Inventaire (${inventaire.length})`, icon: Package },
            { id: 'historique', label: 'Audit & Log', icon: History },
            { id: 'rapport', label: 'Rapports PDF', icon: FileText },
            { id: 'utilisateurs', label: 'Associés', icon: Users, admin: true },
            { id: 'suppression', label: 'Maintenance', icon: Trash2, admin: true, danger: true },
          ].map((tab) => (
            (!tab.admin || user.role === 'admin') && (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-4 px-6 text-[13px] font-bold tracking-tight flex items-center gap-2.5 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? (tab.danger ? 'border-red-600 text-red-600 bg-red-50/30' : 'border-blue-600 text-blue-600 bg-blue-50/30')
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? '' : 'opacity-60'}`} />
                {tab.label}
              </button>
            )
          ))}
        </div>
      </nav>

      {/* Corps Principal */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-8">
        
        {/* Messages d'erreurs globaux */}
        <AnimatePresence>
          {dataError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-bold">{dataError}</p>
              </div>
              <button 
                onClick={refreshAllData}
                className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-xs font-black uppercase hover:bg-red-50 transition-all"
              >
                Réessayer la connexion
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zone d'affichage dynamique */}
        <div className="min-h-[500px]">
          {loadingData && transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-4">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Synchronisation des données...</p>
            </div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'dashboard' && <Dashboard transactions={transactions} inventaire={inventaire} user={user} fallbackStatus={fallbackStatus} onRefresh={refreshAllData} />}
              {activeTab === 'saisie' && <FormulaireTransaction inventaire={inventaire} onTransactionSuccess={handleNewTransaction} onNewInventoryItem={handleNewInventoryItem} onRefresh={refreshAllData} />}
              {activeTab === 'inventaire' && <Inventaire items={inventaire} onAddNewItem={handleNewInventoryItem} onRefresh={refreshAllData} user={user} />}
              {activeTab === 'historique' && <Historique user={user} onRefresh={refreshAllData} />}
              {activeTab === 'rapport' && <RapportFinancier transactions={transactions} inventaire={inventaire} user={user} />}
              {activeTab === 'utilisateurs' && user.role === 'admin' && <GestionUtilisateurs user={user} />}
              {activeTab === 'suppression' && user.role === 'admin' && <Suppression transactions={transactions} inventaire={inventaire} onRefresh={refreshAllData} />}
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer Pro */}
      <footer className="bg-white border-t border-slate-200 py-8 px-6">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            <p className="text-slate-500 text-[11px] font-bold tracking-tight">
              &copy; 2026 Système de Gestion Enterprise &bull; Tous droits réservés
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">PostgreSQL Supabase</span>
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
            >
              Vider le cache système
            </button>
          </div>
        </div>
      </footer>

      {/* Modal de Confirmation Réinitialisation (Clean Look) */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[32px] max-w-md w-full p-10 shadow-2xl space-y-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h4 className="text-xl font-black text-slate-900 tracking-tight">Réinitialisation Cache</h4>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Cette action supprimera les données locales temporaires et rechargera l'application depuis le serveur. Les données sur Supabase ne seront pas affectées.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowResetConfirm(false); DbService.resetLocalData(); }}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-red-200"
                >
                  Confirmer la réinitialisation
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-sm font-bold transition-all"
                >
                  Annuler l'action
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
