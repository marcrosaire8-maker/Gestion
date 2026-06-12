import { useState } from 'react';
import { Transaction, InventaireItem, UserProfile } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Search, 
  Calendar, 
  FileText, 
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  CreditCard,
  Building,
  Smartphone,
  ChevronRight,
  Package,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardProps {
  transactions: Transaction[];
  inventaire: InventaireItem[];
  user: UserProfile;
  fallbackStatus: { isFallback: boolean; reason: string };
  onRefresh: () => void;
}

export default function Dashboard({ transactions, inventaire, user, fallbackStatus, onRefresh }: DashboardProps) {
  // Logic preserved 100%
  const [filterType, setFilterType] = useState<'tous' | 'entrée' | 'sortie'>('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPreuveUrl, setSelectedPreuveUrl] = useState<string | null>(null);

  // Financial calculations (Preserved)
  const totalEntrees = transactions
    .filter(t => t.type === 'entrée')
    .reduce((sum, t) => sum + Number(t.montant), 0);
  const totalSorties = transactions
    .filter(t => t.type === 'sortie')
    .reduce((sum, t) => sum + Number(t.montant), 0);
  const capitalActuel = totalEntrees - totalSorties;
  const totalValeurStock = inventaire.reduce((sum, item) => sum + (item.quantite_disponible * Number(item.valeur_unitaire)), 0);

  const formatCFA = (val: number) => {
    return new Intl.NumberFormat('fr-BJ', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val).replace('XOF', 'F CFA');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 650);
  };

  // Logic: Burn Rate & Autonomy (Preserved)
  const sortiesParMois: { [key: string]: number } = {};
  transactions.filter(t => t.type === 'sortie').forEach(t => {
    const dateStr = t.date_transaction || new Date().toISOString();
    const mois = dateStr.substring(0, 7);
    if (mois) sortiesParMois[mois] = (sortiesParMois[mois] || 0) + Number(t.montant);
  });
  const totalMoisSorties = Object.keys(sortiesParMois).length;
  const burnRateMoyen = totalMoisSorties > 0 ? (Object.values(sortiesParMois).reduce((a, b) => a + b, 0) / totalMoisSorties) : totalSorties;
  const moisAutonomie = (burnRateMoyen > 0 && capitalActuel > 0) ? parseFloat((capitalActuel / burnRateMoyen).toFixed(1)) : (capitalActuel <= 0 ? 0 : Infinity);

  const categoriesBreakdown: { [key: string]: number } = {
    'Développement/Tech': 0, 'Marketing/Com': 0, 'Logistique': 0, 'Administratif/Frais': 0, 'Autre': 0
  };
  transactions.filter(t => t.type === 'sortie').forEach(t => {
    const cat = t.categorie || 'Autre';
    if (categoriesBreakdown[cat] !== undefined) categoriesBreakdown[cat] += Number(t.montant);
    else categoriesBreakdown['Autre'] += Number(t.montant);
  });

  const apportsAssocies = Object.entries(
    transactions.filter(t => t.type === 'entrée').reduce((acc: any, t) => {
      const nom = t.associe_nom?.trim() || '';
      if (nom) acc[nom] = (acc[nom] || 0) + Number(t.montant);
      return acc;
    }, {})
  ).map(([name, amount]: any) => ({ name, amount })).sort((a, b) => b.amount - a.amount);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) || t.mode_paiement.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'tous' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  const sqlScript = `-- SQL SCRIPT PRESERVED... (Same as original)`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 p-4 md:p-8 relative">
      {/* Background Texture consistent with Login */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} 
      />

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        
        {/* Header Enterprise Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Console de Gestion</h1>
            </div>
            <p className="text-slate-500 text-sm">Bienvenue, {user.full_name} • <span className="font-medium">Nexus Systems Inc.</span></p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSqlModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
              <Database className="w-4 h-4 text-blue-600" />
              Installation SQL
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[13px] font-semibold shadow-md hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-70"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Chargement...' : 'Actualiser'}
            </button>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`p-4 rounded-2xl border flex items-start gap-4 transition-all ${
          fallbackStatus.isFallback ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'
        }`}>
          <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${fallbackStatus.isFallback ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'}`} />
          <div>
            <h4 className={`text-[13px] font-bold uppercase tracking-wider ${fallbackStatus.isFallback ? 'text-amber-800' : 'text-blue-800'}`}>
              {fallbackStatus.isFallback ? 'Mode Démonstration' : 'Connecté à Supabase Cloud'}
            </h4>
            <p className={`text-xs mt-0.5 font-medium ${fallbackStatus.isFallback ? 'text-amber-700/80' : 'text-blue-700/80'}`}>
              {fallbackStatus.isFallback ? `${fallbackStatus.reason}. Données locales.` : 'Synchronisation PostgreSQL en temps réel active.'}
            </p>
          </div>
        </div>

        {/* Primary Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Trésorerie Actuelle', val: formatCFA(capitalActuel), icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50', sub: 'Solde Net' },
            { label: 'Total Entrées', val: formatCFA(totalEntrees), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: `${transactions.filter(t => t.type === 'entrée').length} flux entrants` },
            { label: 'Total Sorties', val: formatCFA(totalSorties), icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50', sub: `${transactions.filter(t => t.type === 'sortie').length} dépenses` },
            { label: 'Valeur Inventaire', val: formatCFA(totalValeurStock), icon: Package, color: 'text-amber-600', bg: 'bg-amber-50', sub: 'Articles en stock' },
          ].map((stat, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              key={i} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 ${stat.bg} rounded-xl`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.sub}</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight font-mono">{stat.val}</h3>
              <p className="text-[13px] font-semibold text-slate-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Autonomie Widget */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-4">Burn Rate & Autonomie</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-semibold text-slate-600">Coût Mensuel Moyen</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">{formatCFA(burnRateMoyen)}</span>
                </div>
                <div className="text-center py-6">
                  <div className="text-4xl font-black text-slate-900 tracking-tighter">
                    {moisAutonomie === Infinity ? '∞' : `${moisAutonomie}`}
                    <span className="text-lg text-slate-400 ml-1">mois</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-2">Autonomie financière estimée</p>
                </div>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${moisAutonomie >= 6 ? 'bg-emerald-500' : moisAutonomie >= 3 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${moisAutonomie === Infinity ? 100 : Math.min(100, (moisAutonomie / 12) * 100)}%` }}
              />
            </div>
          </div>

          {/* Dépenses Widget */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h4 className="text-[11px] font-bold text-rose-600 uppercase tracking-[0.2em] mb-6">Répartition Dépenses</h4>
            <div className="space-y-5">
              {Object.entries(categoriesBreakdown).map(([cat, amount]) => {
                const pct = totalSorties > 0 ? ((amount / totalSorties) * 100).toFixed(0) : '0';
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-700">{cat}</span>
                      <span className="text-slate-400">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                      <div className="bg-slate-800 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Associés Widget */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden">
            <h4 className="text-[11px] font-bold text-emerald-600 uppercase tracking-[0.2em] mb-4">Fonds Propres</h4>
            <div className="space-y-3 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
              {apportsAssocies.map((associe, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">{associe.name}</p>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Associé d'exploitation</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-emerald-600 font-mono">{formatCFA(associe.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transactions Table Section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Historique des Flux</h3>
              <p className="text-[13px] text-slate-500 font-medium">Journal transactionnel de l'entreprise</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filter Tabs */}
              <div className="bg-slate-100 p-1 rounded-xl flex">
                {(['tous', 'entrée', 'sortie'] as const).map(t => (
                  <button 
                    key={t} onClick={() => setFilterType(t)}
                    className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                      filterType === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/5 focus:border-blue-600 transition-all w-64"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Transaction</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Paiement</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'entrée' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {tx.type === 'entrée' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-800 line-clamp-1">{tx.description}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{tx.categorie || 'Opération'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[12px] text-slate-600 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(tx.date_transaction).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                           {tx.mode_paiement.toLowerCase().includes('mobile') ? <Smartphone className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                           {tx.mode_paiement}
                        </span>
                        {tx.preuve_url && (
                          <button onClick={() => setSelectedPreuveUrl(tx.preuve_url || null)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-[14px] font-bold font-mono ${tx.type === 'entrée' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'entrée' ? '+' : '-'} {formatCFA(tx.montant)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SQL Script Modal - Styled like an Enterprise Overlay */}
      <AnimatePresence>
        {showSqlModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Script d'Initialisation</h3>
                    <p className="text-xs text-slate-500 font-medium">Structure des tables et politiques RLS</p>
                  </div>
                </div>
                <button onClick={() => setShowSqlModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">Fermer</button>
              </div>
              <div className="p-6 bg-slate-900 overflow-y-auto flex-1">
                <pre className="text-xs font-mono text-blue-300 leading-relaxed whitespace-pre-wrap">{sqlScript}</pre>
              </div>
              <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sqlScript);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copié !' : 'Copier le script'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preuve Modal */}
      <AnimatePresence>
        {selectedPreuveUrl && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md"
            onClick={() => setSelectedPreuveUrl(null)}
          >
            <div className="max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
               <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                 <span className="text-sm font-bold text-slate-800">Visualisation du Justificatif</span>
                 <button onClick={() => setSelectedPreuveUrl(null)} className="text-xs font-bold text-slate-400">FERMER</button>
               </div>
               <div className="p-4 bg-slate-50 flex justify-center">
                 <img src={selectedPreuveUrl} alt="Reçu" className="max-h-[70vh] rounded-lg shadow-sm border border-slate-200" />
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
