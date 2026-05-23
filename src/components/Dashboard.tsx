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
  Smartphone
} from 'lucide-react';
import { motion } from 'motion/react';
import { DbService } from '../services/dbService';

interface DashboardProps {
  transactions: Transaction[];
  inventaire: InventaireItem[];
  user: UserProfile;
  fallbackStatus: { isFallback: boolean; reason: string };
  onRefresh: () => void;
}

export default function Dashboard({ transactions, inventaire, user, fallbackStatus, onRefresh }: DashboardProps) {
  const [filterType, setFilterType] = useState<'tous' | 'entrée' | 'sortie'>('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPreuveUrl, setSelectedPreuveUrl] = useState<string | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  // Financial calculations
  const totalEntrees = transactions
    .filter(t => t.type === 'entrée')
    .reduce((sum, t) => sum + Number(t.montant), 0);

  const totalSorties = transactions
    .filter(t => t.type === 'sortie')
    .reduce((sum, t) => sum + Number(t.montant), 0);

  const capitalActuel = totalEntrees - totalSorties;

  // Inventory value
  const totalValeurStock = inventaire.reduce((sum, item) => sum + (item.quantite_disponible * Number(item.valeur_unitaire)), 0);

  // Format currency in F CFA (standard Benin formatting)
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

  // SQL Script to copy
  const sqlScript = `-- 1. CRÉATION DES TABLES PRINCIPALES

-- Table de l'inventaire des articles/équipements
CREATE TABLE IF NOT EXISTS public.inventaire (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom_article TEXT NOT NULL,
    quantite_disponible INTEGER NOT NULL DEFAULT 0,
    valeur_unitaire NUMERIC NOT NULL CHECK (valeur_unitaire >= 0),
    unite TEXT, -- Unité de mesure (Ex: kg, litre, pièce)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des flux financiers (Transactions)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('entrée', 'sortie')),
    montant NUMERIC NOT NULL CHECK (montant > 0),
    date_transaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mode_paiement TEXT NOT NULL,
    preuve_url TEXT,
    description TEXT NOT NULL,
    categorie TEXT, -- Pour les dépenses ('Développement/Tech', 'Marketing/Com', etc.)
    associe_nom TEXT -- Nom de l'associé apporteur pour les entrées de capital
);

-- Table pivot de liaison de l'inventaire et des transactions (ex: achat de matériel)
CREATE TABLE IF NOT EXISTS public.liaison_inventaire_transaction (
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    article_id UUID REFERENCES public.inventaire(id) ON DELETE CASCADE,
    quantite_achetee INTEGER NOT NULL CHECK (quantite_achetee > 0),
    PRIMARY KEY (transaction_id, article_id)
);

-- Table des Paramètres Système (Mécanisme de verrouillage de mois civil comptable)
CREATE TABLE IF NOT EXISTS public.parametres_systeme (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    dernier_mois_verrouille TEXT NOT NULL DEFAULT '' -- Format de date YYYY-MM
);

-- 2. COMMANDES DE MIGRATION POUR BASES EXISTANTES (Si déjà créées)
-- ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS categorie TEXT;
-- ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS associe_nom TEXT;
-- ALTER TABLE public.inventaire ADD COLUMN IF NOT EXISTS unite TEXT;

-- 3. AJOUT DE POLITIQUES DE SÉCURITÉ DE BASE (RLS - Permettre aux utilisateurs authentifiés d'agir)
ALTER TABLE public.inventaire ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liaison_inventaire_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametres_systeme ENABLE ROW LEVEL SECURITY;

-- Supprimer d'anciennes politiques si elles existent déjà pour éviter les collisions
DROP POLICY IF EXISTS "Allow all actions to authenticated users" ON public.inventaire;
DROP POLICY IF EXISTS "Allow all actions to authenticated users" ON public.transactions;
DROP POLICY IF EXISTS "Allow all actions to authenticated users" ON public.liaison_inventaire_transaction;
DROP POLICY IF EXISTS "Allow all actions to public users" ON public.inventaire;
DROP POLICY IF EXISTS "Allow all actions to public users" ON public.transactions;
DROP POLICY IF EXISTS "Allow all actions to public users" ON public.liaison_inventaire_transaction;
DROP POLICY IF EXISTS "Allow all actions to public users" ON public.parametres_systeme;

CREATE POLICY "Allow all actions to public users" ON public.inventaire FOR ALL USING (true);
CREATE POLICY "Allow all actions to public users" ON public.transactions FOR ALL USING (true);
CREATE POLICY "Allow all actions to public users" ON public.liaison_inventaire_transaction FOR ALL USING (true);
CREATE POLICY "Allow all actions to public users" ON public.parametres_systeme FOR ALL USING (true);
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Search filter
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.mode_paiement.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.montant.toString().includes(searchQuery);
    const matchesType = filterType === 'tous' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  // -------------------------------------------------------------------------
  // BURN RATE & AUDIO AUTONOMY CALCULATIONS
  // -------------------------------------------------------------------------
  const sortiesParMois: { [key: string]: number } = {};
  transactions
    .filter(t => t.type === 'sortie')
    .forEach(t => {
      const dateStr = t.date_transaction || new Date().toISOString();
      const mois = dateStr.substring(0, 7); // "YYYY-MM"
      if (mois) {
        sortiesParMois[mois] = (sortiesParMois[mois] || 0) + Number(t.montant);
      }
    });

  const listeMois = Object.keys(sortiesParMois);
  const totalMoisSorties = listeMois.length;
  
  let burnRateMoyen = 0;
  if (totalMoisSorties > 0) {
    const totalSortiesSomme = Object.values(sortiesParMois).reduce((a, b) => a + b, 0);
    burnRateMoyen = totalSortiesSomme / totalMoisSorties;
  } else {
    burnRateMoyen = totalSorties; 
  }

  let moisAutonomie = 0;
  if (burnRateMoyen > 0 && capitalActuel > 0) {
    moisAutonomie = parseFloat((capitalActuel / burnRateMoyen).toFixed(1));
  } else if (capitalActuel <= 0) {
    moisAutonomie = 0;
  } else {
    moisAutonomie = Infinity;
  }

  // Categories partition
  const categoriesBreakdown: { [key: string]: number } = {
    'Développement/Tech': 0,
    'Marketing/Com': 0,
    'Logistique': 0,
    'Administratif/Frais': 0,
    'Autre': 0
  };

  transactions
    .filter(t => t.type === 'sortie')
    .forEach(t => {
      const cat = t.categorie || 'Autre';
      if (categoriesBreakdown[cat] !== undefined) {
        categoriesBreakdown[cat] += Number(t.montant);
      } else {
        categoriesBreakdown['Autre'] += Number(t.montant);
      }
    });

  // Associates accumulated funding
  const apportsAssociemapping: { [key: string]: number } = {};
  transactions
    .filter(t => t.type === 'entrée')
    .forEach(t => {
      const nom = t.associe_nom ? t.associe_nom.trim() : '';
      if (nom) {
        apportsAssociemapping[nom] = (apportsAssociemapping[nom] || 0) + Number(t.montant);
      }
    });

  const apportsAssocies = Object.entries(apportsAssociemapping).map(([name, amount]) => ({
    name,
    amount
  })).sort((a, b) => b.amount - a.amount);

  // Payments visual grouping
  const getPaymentIcon = (method: string) => {
    const lower = method.toLowerCase();
    if (lower.includes('bancaire') || lower.includes('virement') || lower.includes('chèque')) return <Building className="w-4 h-4 text-indigo-400" />;
    if (lower.includes('money') || lower.includes('mtn') || lower.includes('moov')) return <Smartphone className="w-4 h-4 text-emerald-400" />;
    return <CreditCard className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Configuration Mode Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${fallbackStatus.isFallback ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              {fallbackStatus.isFallback ? 'Mode Démo Réactif Actif' : 'Mode Connecté Supabase OK'}
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {fallbackStatus.isFallback 
                ? `${fallbackStatus.reason} : Les données de test sont stockées localement.`
                : `Connecté sur la base de données PostgreSQL de Supabase.`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-show-sql"
            onClick={() => setShowSqlModal(true)}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700/80 active:bg-slate-900 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer border border-slate-700"
          >
            <Database className="w-3.5 h-3.5" />
            Script d'installation SQL
          </button>
          
          <button
            id="btn-refresh-dashboard"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all cursor-pointer border border-slate-700 disabled:opacity-50"
            title="Rafraîchir les données"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main stats counters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="stats-grid">
        {/* Current Capital Active Balance */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Trésorerie Actuelle</span>
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Wallet className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold font-mono text-white tracking-tight mt-2 break-all" id="capital-actuel">
              {formatCFA(capitalActuel)}
            </h2>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Solde Net Bénéfice</span>
            <span className={`font-mono font-bold ${capitalActuel >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {capitalActuel >= 0 ? '+' : ''}{totalEntrees > 0 ? ((capitalActuel / totalEntrees) * 100).toFixed(1) : 0}% ratio
            </span>
          </div>
        </div>

        {/* Total Inputs */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Total des Entrées</span>
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold font-mono text-emerald-400 tracking-tight mt-2 break-all" id="total-entrees">
              {formatCFA(totalEntrees)}
            </h2>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Flux de trésorerie entrant</span>
            <span className="font-mono text-emerald-400/80">
              {transactions.filter(t => t.type === 'entrée').length} opérations
            </span>
          </div>
        </div>

        {/* Total Outputs */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Total des Sorties</span>
              <div className="p-2 bg-rose-500/10 rounded-lg">
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold font-mono text-rose-400 tracking-tight mt-2 break-all" id="total-sorties">
              {formatCFA(totalSorties)}
            </h2>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Dépenses d'exploitation</span>
            <span className="font-mono text-rose-400/80">
              {transactions.filter(t => t.type === 'sortie').length} opérations
            </span>
          </div>
        </div>

        {/* Total Inventory Value */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Valeur de l'Inventaire</span>
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Settings className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold font-mono text-amber-400 tracking-tight mt-2 break-all" id="valeur-stock">
              {formatCFA(totalValeurStock)}
            </h2>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Articles de l'inventaire</span>
            <span className="font-mono text-amber-400/80">
              {inventaire.reduce((sum, item) => sum + item.quantite_disponible, 0)} articles total
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Budgeting & Cash Runway Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="budgeting-analytics-section">
        
        {/* Widget 1: Runway / Burn Rate */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between lg:col-span-1">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 mb-3">
              <span className="p-1.5 bg-indigo-500/10 rounded-lg">⏱️</span>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Burn Rate & Autonomie</h4>
            </div>
            
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Indique combien de temps la trésorerie actuelle peut soutenir l'exploitation sur la base de vos dépenses mensuelles passées.
            </p>
          </div>

          <div className="py-2 space-y-3">
            <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-lg border border-slate-800/40">
              <span className="text-[11px] text-slate-400 font-medium">Coût Mensuel Moyen (Burn Rate)</span>
              <span className="text-xs font-bold font-mono text-white">{formatCFA(burnRateMoyen)}</span>
            </div>

            <div className="text-center p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10 flex flex-col items-center justify-center space-y-1">
              <span className="text-[10px] text-indigo-300 uppercase font-bold tracking-wider">Autonomie Financière Estimée</span>
              <div className="text-2xl font-black text-indigo-400 font-mono tracking-wide py-1">
                {moisAutonomie === Infinity ? '∞' : `${moisAutonomie} mois`}
              </div>
              <p className="text-[10px] text-slate-400 italic">
                {moisAutonomie === Infinity 
                  ? "Aucune dépense mensuelle d'exploitation enregistrée." 
                  : `Au rythme actuel, il reste ${moisAutonomie} mois d'autonomie avant d'épuiser les fonds.`}
              </p>
            </div>
          </div>

          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                moisAutonomie >= 6 
                  ? 'bg-emerald-500' 
                  : moisAutonomie >= 3 
                    ? 'bg-amber-500' 
                    : 'bg-rose-500'
              }`} 
              style={{ width: `${moisAutonomie === Infinity ? 100 : Math.min(100, (moisAutonomie / 12) * 100)}%` }} 
            />
          </div>
        </div>

        {/* Widget 2: Expense Allocation by Category */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2 text-rose-400 mb-1">
            <span className="p-1.5 bg-rose-500/10 rounded-lg">📊</span>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Dépenses par Catégorie</h4>
          </div>

          <div className="space-y-3 pt-1">
            {Object.entries(categoriesBreakdown).map(([cat, amount]) => {
              const maxVal = totalSorties > 0 ? totalSorties : 1;
              const percentage = ((amount / maxVal) * 100).toFixed(1);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-medium">
                    <span className="text-slate-300">{cat}</span>
                    <span className="text-slate-400 font-mono">
                      {formatCFA(amount)} <span className="text-[10px] text-slate-500">({percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-md overflow-hidden border border-slate-800/45">
                    <div 
                      className="bg-rose-500 h-full rounded-md transition-all duration-500"
                      style={{ width: `${(amount / maxVal) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Widget 3: Founders / Injected capital list */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <span className="p-1.5 bg-emerald-500/10 rounded-lg">🤝</span>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Apports des Associés</h4>
          </div>

          <p className="text-[11px] text-slate-400 leading-normal">
            Aperçu des capitaux cumulés injectés en fonds propres par chaque associé d'exploitation :
          </p>

          <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
            {apportsAssocies.length === 0 ? (
              <div className="text-center py-8 bg-slate-950/25 border border-dashed border-slate-800/70 rounded-xl">
                <span className="text-slate-500 text-[10px] italic">Aucun apport d'associé identifié dans les entrées.</span>
              </div>
            ) : (
              apportsAssocies.map(({ name, amount }) => {
                const totalInjected = Object.values(apportsAssociemapping).reduce((a, b) => a + b, 0);
                const pctOfCapital = totalInjected > 0 ? ((amount / totalInjected) * 100).toFixed(1) : 0;
                return (
                  <div key={name} className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-800/55 rounded-lg">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white font-sans">{name}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">{pctOfCapital}% de l'apport total</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold font-mono text-emerald-400">{formatCFA(amount)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Modern High-End Visual comparison chart */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <span>Aperçu de la Balance Financière</span>
        </h3>
        
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-end text-xs text-slate-400">
            <div>
              <p className="text-base font-bold text-white font-sans">{formatCFA(capitalActuel)}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-0.5">Solde Cashflow</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300">
                Performance globale
              </span>
            </div>
          </div>

          {/* Visual double bar */}
          <div className="w-full bg-slate-950/80 rounded-2xl p-4 border border-slate-800">
            <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                Entrées ({totalEntrees > 0 ? ((totalEntrees / (totalEntrees + totalSorties)) * 100).toFixed(1) : 0}%)
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                Sorties ({totalSorties > 0 ? ((totalSorties / (totalEntrees + totalSorties)) * 100).toFixed(1) : 0}%)
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
              </span>
            </div>

            <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden flex">
              {totalEntrees === 0 && totalSorties === 0 ? (
                <div className="w-full h-full bg-slate-800" />
              ) : (
                <>
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                    style={{ width: `${(totalEntrees / (totalEntrees + totalSorties)) * 100}%` }}
                  />
                  <div 
                    className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-500"
                    style={{ width: `${(totalSorties / (totalEntrees + totalSorties)) * 100}%` }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transactions list header and body */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Historique Global Décoché
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Historique des flux financiers entrées ou dépenses engagées
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Type selector */}
            <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              {(['tous', 'entrée', 'sortie'] as const).map((t) => (
                <button
                  id={`btn-filter-${t}`}
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all cursor-pointer ${
                    filterType === t 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t === 'tous' ? 'Tous' : t === 'entrée' ? 'Entrées' : 'Sorties'}
                </button>
              ))}
            </div>

            {/* Search inputs */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                id="search-tx"
                type="text"
                placeholder="Rechercher description, mode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table/List */}
        <div className="mt-4 overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-10" id="empty-history-trigger">
              <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Aucune transaction correspondante trouvée.</p>
            </div>
          ) : (
            <div className="min-w-full divide-y divide-slate-800/55 space-y-2.5">
              {filteredTransactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-950/40 hover:bg-slate-950/90 hover:border-slate-700/80 rounded-xl border border-slate-800/10 transition-all gap-3.5"
                  id={`transaction-item-${tx.id}`}
                >
                  <div className="flex gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === 'entrée' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                    }`}>
                      {tx.type === 'entrée' ? (
                        <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-rose-400" />
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-200 line-clamp-1">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(tx.date_transaction).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-905 border border-slate-800 text-slate-300 flex items-center gap-1">
                          {getPaymentIcon(tx.mode_paiement)}
                          {tx.mode_paiement}
                        </span>

                        {tx.preuve_url && (
                          <button 
                            type="button"
                            onClick={() => setSelectedPreuveUrl(tx.preuve_url || null)}
                            className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded font-mono font-medium transition-all cursor-pointer"
                          >
                            Voir Reçu
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-baseline justify-between sm:items-end shrink-0 py-1 sm:py-0 border-t sm:border-t-0 border-dashed border-slate-800 pt-2 sm:pt-0">
                    <span className="text-slate-400 text-[10px] sm:hidden">Montant :</span>
                    <span className={`text-sm font-bold font-mono tracking-tight ${
                      tx.type === 'entrée' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {tx.type === 'entrée' ? '+' : '-'} {formatCFA(tx.montant)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SQL script Copy Modal Drawer overlay */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl relative shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Script de création SQL (Supabase)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Exécutez ce script dans l'onglet SQL Editor de Supabase</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSqlModal(false)}
                className="p-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 font-mono text-xs text-slate-300 bg-slate-950">
              <pre className="whitespace-pre-wrap select-all">{sqlScript}</pre>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-900">
              <p className="text-[10px] text-slate-400 italic">
                Ce script configure l'inventaire, les transactions et les règles d'accès RLS de sécurité.
              </p>
              <button
                type="button"
                onClick={copyToClipboard}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copier le script SQL
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Proof / Receipt Photo Modal Overlay */}
      {selectedPreuveUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl relative shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Justificatif Reçu & Pièce Jointe
              </h3>
              <button 
                onClick={() => setSelectedPreuveUrl(null)}
                className="p-1 px-2.5 rounded bg-slate-800 hover:bg-slate-705 text-slate-300 hover:text-white transition-all text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>
            
            <div className="p-4 bg-slate-950 flex justify-center items-center overflow-auto max-h-[60vh]">
              {selectedPreuveUrl.startsWith('data:') || selectedPreuveUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || selectedPreuveUrl.includes('images.unsplash.com') || selectedPreuveUrl.includes('supabase') ? (
                <img 
                  src={selectedPreuveUrl} 
                  alt="Preuve / Reçu" 
                  className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-md border border-slate-800"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center py-12 text-slate-400 space-y-3 w-full animate-fade-in">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-xs">Visualisation de la pièce jointe (document d'origine) :</p>
                  <a 
                    href={selectedPreuveUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-indigo-400 hover:underline break-all block px-4 font-mono"
                  >
                    {selectedPreuveUrl}
                  </a>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900">
              <button 
                onClick={() => setSelectedPreuveUrl(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Fermer l'aperçu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
