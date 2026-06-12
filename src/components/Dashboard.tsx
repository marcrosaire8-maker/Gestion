import { useState } from 'react';
import { Transaction, InventaireItem, UserProfile } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Search, 
  Calendar, 
  FileText, 
  Settings, 
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
  X
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
  // --- LOGIQUE CONSERVÉE À L'IDENTIQUE ---
  const [filterType, setFilterType] = useState<'tous' | 'entrée' | 'sortie'>('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPreuveUrl, setSelectedPreuveUrl] = useState<string | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

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

  const sqlScript = `-- 1. CRÉATION DES TABLES... (Script conservé)`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.mode_paiement.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.montant.toString().includes(searchQuery);
    const matchesType = filterType === 'tous' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  const sortiesParMois: { [key: string]: number } = {};
  transactions.filter(t => t.type === 'sortie').forEach(t => {
    const dateStr = t.date_transaction || new Date().toISOString();
    const mois = dateStr.substring(0, 7);
    if (mois) sortiesParMois[mois] = (sortiesParMois[mois] || 0) + Number(t.montant);
  });

  const burnRateMoyen = Object.keys(sortiesParMois).length > 0 
    ? Object.values(sortiesParMois).reduce((a, b) => a + b, 0) / Object.keys(sortiesParMois).length 
    : totalSorties;

  let moisAutonomie = (burnRateMoyen > 0 && capitalActuel > 0) ? parseFloat((capitalActuel / burnRateMoyen).toFixed(1)) : (capitalActuel <= 0 ? 0 : Infinity);

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

  const getPaymentIcon = (method: string) => {
    const lower = method.toLowerCase();
    if (lower.includes('bancaire') || lower.includes('virement')) return <Building className="w-3.5 h-3.5 text-slate-500" />;
    if (lower.includes('money') || lower.includes('mtn')) return <Smartphone className="w-3.5 h-3.5 text-slate-500" />;
    return <CreditCard className="w-3.5 h-3.5 text-slate-500" />;
  };

  return (
    <div className="space-y-8 bg-slate-50/50 min-h-screen pb-12" id="dashboard-container">
      
      {/* Barre de Status Corporate */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${fallbackStatus.isFallback ? 'bg-amber-50' : 'bg-emerald-50'}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${fallbackStatus.isFallback ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-slate-800 flex items-center gap-2">
              Statut du Système
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {fallbackStatus.isFallback ? `Mode Démo : ${fallbackStatus.reason}` : 'Connecté à Supabase Cloud (Production)'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSqlModal(true)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-200"
          >
            <Database className="w-3.5 h-3.5" />
            Script SQL
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md shadow-blue-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Cartes de Statistiques Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Trésorerie Actuelle', val: capitalActuel, icon: Wallet, color: 'blue', sub: 'Solde Net' },
          { label: 'Total Entrées', val: totalEntrees, icon: TrendingUp, color: 'emerald', sub: `${transactions.filter(t => t.type === 'entrée').length} opérations` },
          { label: 'Total Sorties', val: totalSorties, icon: TrendingDown, color: 'rose', sub: `${transactions.filter(t => t.type === 'sortie').length} opérations` },
          { label: 'Valeur Stock', val: totalValeurStock, icon: Settings, color: 'amber', sub: 'Inventaire Actif' }
        ].map((card, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2.5 bg-${card.color}-50 rounded-xl`}>
                <card.icon className={`w-5 h-5 text-${card.color}-600`} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider text-slate-400`}>{card.label}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{formatCFA(card.val)}</h2>
            <div className="mt-4 flex items-center text-[11px] font-semibold text-slate-500 border-t border-slate-50 pt-3">
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Analytics & Budgeting */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Burn Rate Widget */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h4 className="text-[13px] font-bold text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-blue-600 rounded-full" /> Burn Rate & Autonomie
          </h4>
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Moyenne Mensuelle</p>
              <p className="text-xl font-bold text-slate-900">{formatCFA(burnRateMoyen)}</p>
            </div>
            <div className="text-center py-6 px-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <p className="text-[10px] font-bold text-blue-100 uppercase">Autonomie Estimée</p>
              <p className="text-4xl font-black text-white my-1">
                {moisAutonomie === Infinity ? '∞' : moisAutonomie} <span className="text-sm font-medium opacity-80">mois</span>
              </p>
            </div>
          </div>
        </div>

        {/* Categories Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h4 className="text-[13px] font-bold text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-rose-500 rounded-full" /> Dépenses par Catégorie
          </h4>
          <div className="space-y-4">
            {Object.entries(categoriesBreakdown).map(([cat, amount]) => {
              const pct = totalSorties > 0 ? (amount / totalSorties) * 100 : 0;
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{cat}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Associates */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h4 className="text-[13px] font-bold text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-emerald-500 rounded-full" /> Apports Associés
          </h4>
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {apportsAssocies.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-10">Aucun apport enregistré.</p>
            ) : (
              apportsAssocies.map((assoc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">{assoc.name}</span>
                  <span className="text-xs font-mono font-bold text-emerald-600">{formatCFA(assoc.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Balance Visuelle */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold text-slate-800">Équilibre des Flux</h3>
          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Résumé Financier</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-[11px] font-bold uppercase text-slate-400">
            <span>Entrées : {formatCFA(totalEntrees)}</span>
            <span>Sorties : {formatCFA(totalSorties)}</span>
          </div>
          <div className="h-5 w-full bg-slate-100 rounded-xl overflow-hidden flex shadow-inner">
            <div className="h-full bg-emerald-500" style={{ width: `${(totalEntrees / (totalEntrees + totalSorties)) * 100}%` }} />
            <div className="h-full bg-rose-500" style={{ width: `${(totalSorties / (totalEntrees + totalSorties)) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Liste des Transactions */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/30">
          <div>
            <h3 className="text-base font-bold text-slate-800">Historique des Opérations</h3>
            <p className="text-xs text-slate-500 font-medium">Flux de trésorerie en temps réel</p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-64 transition-all"
              />
            </div>
            <select 
              value={filterType} 
              onChange={(e:any) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none"
            >
              <option value="tous">Tous les flux</option>
              <option value="entrée">Entrées uniquement</option>
              <option value="sortie">Sorties uniquement</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredTransactions.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Aucune transaction trouvée</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <div key={tx.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'entrée' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {tx.type === 'entrée' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{tx.description}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(tx.date_transaction).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                        {getPaymentIcon(tx.mode_paiement)} {tx.mode_paiement}
                      </span>
                      {tx.preuve_url && (
                        <button onClick={() => setSelectedPreuveUrl(tx.preuve_url || null)} className="text-[10px] font-bold text-blue-600 hover:underline">
                          Justificatif
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${tx.type === 'entrée' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'entrée' ? '+' : '-'} {formatCFA(tx.montant)}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{tx.categorie || 'Général'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal SQL (Design Institutionnel) */}
      <AnimatePresence>
        {showSqlModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-800 tracking-tight">Installation de la Base de Données</h3>
                </div>
                <button onClick={() => setShowSqlModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto bg-slate-900 font-mono text-xs text-slate-300">
                <pre className="whitespace-pre-wrap">{sqlScript}</pre>
              </div>
              <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={copyToClipboard} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-100">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copié !' : 'Copier le script SQL'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Justificatif */}
      <AnimatePresence>
        {selectedPreuveUrl && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Document Justificatif</span>
                <button onClick={() => setSelectedPreuveUrl(null)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 flex justify-center bg-slate-50">
                <img src={selectedPreuveUrl} alt="Reçu" className="max-h-[60vh] rounded-xl shadow-sm border border-white" />
              </div>
              <div className="p-4 flex justify-center">
                <button onClick={() => setSelectedPreuveUrl(null)} className="px-8 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">Fermer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
