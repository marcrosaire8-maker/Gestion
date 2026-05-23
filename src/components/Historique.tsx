import { useState, useEffect } from 'react';
import { ActivityLog, UserProfile } from '../types';
import { DbService } from '../services/dbService';
import { 
  History, 
  Search, 
  Trash2, 
  User, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Package, 
  RefreshCw,
  FileText,
  SlidersHorizontal,
  X,
  XCircle,
  AlertTriangle,
  Layers,
  Sparkles,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HistoriqueProps {
  user: UserProfile;
  onRefresh: () => Promise<void>;
}

export default function Historique({ user, onRefresh }: HistoriqueProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [showConfirmHistoryClear, setShowConfirmHistoryClear] = useState(false);

  // Fetch log elements on load
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const dbLogs = await DbService.getLogs();
      setLogs(dbLogs);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Format currency helper
  const formatCFA = (val: number) => {
    return new Intl.NumberFormat('fr-BJ', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val).replace('XOF', 'F CFA');
  };

  // Log action translation & visual badges helper
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create_tx':
        return {
          label: 'Enregistrement',
          className: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
          icon: <PlusCircleIcon className="w-3.5 h-3.5" />
        };
      case 'delete_tx':
        return {
          label: 'Annulation Opération',
          className: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />
        };
      case 'purge_tx':
        return {
          label: 'Purge Globale Compta',
          className: 'bg-red-500/15 border-red-500/25 text-red-400 font-bold',
          icon: <XCircle className="w-3.5 h-3.5 text-red-400" />
        };
      case 'create_inv':
        return {
          label: 'Ajout Inventaire',
          className: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
          icon: <Package className="w-3.5 h-3.5" />
        };
      case 'update_inv':
        return {
          label: 'Ajustement Inventaire',
          className: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          icon: <Layers className="w-3.5 h-3.5" />
        };
      case 'delete_inv':
        return {
          label: 'Retrait Inventaire',
          className: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
          icon: <Trash2 className="w-3.5 h-3.5 text-purple-400" />
        };
      default:
        return {
          label: 'Action Système',
          className: 'bg-slate-800 border-slate-700 text-slate-300',
          icon: <FileText className="w-3.5 h-3.5" />
        };
    }
  };

  // Filter logs based on query and action type selection
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) || 
      log.user_email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedAction === 'all') return matchesSearch;
    if (selectedAction === 'finance') return matchesSearch && ['create_tx', 'delete_tx', 'purge_tx'].includes(log.action_type);
    if (selectedAction === 'inventaire') return matchesSearch && ['create_inv', 'update_inv', 'delete_inv'].includes(log.action_type);
    return matchesSearch && log.action_type === selectedAction;
  });

  // Handle clear logs (Admin only)
  const handleClearHistory = async () => {
    setClearing(true);
    setMessage(null);
    try {
      await DbService.clearLogs();
      setLogs([]);
      setMessage({ type: 'success', text: "L'historique des activités a été purgé avec succès." });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Erreur lors de la purge : ${err.message || 'Inconnue'}` });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6" id="historique-page-container">
      {/* Title block */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            Traçabilité & Historique d'Audit
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Visualisez la chronologie complète des opérations de comptabilité et d'inventaire enregistrées ou annulées par l'équipe.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              fetchLogs();
              onRefresh();
            }}
            disabled={loading}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-705 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer disabled:opacity-50"
            title="Rafraîchir les logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {user.role === 'admin' && (
            <button
              id="btn-clear-history-admin"
              onClick={() => setShowConfirmHistoryClear(true)}
              disabled={clearing || logs.length === 0}
              className="px-3.5 py-2 bg-rose-600/10 hover:bg-rose-600 border border-rose-600/20 hover:border-rose-500 text-rose-400 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Effacer historique
            </button>
          )}
        </div>
      </div>

      {/* Message banners */}
      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border text-xs flex justify-between items-center ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <p>{message.text}</p>
          <button 
            onClick={() => setMessage(null)}
            className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            Fermer
          </button>
        </motion.div>
      )}

      {/* Filter and search bar */}
      <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Input Box */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
          <input
            id="input-search-logs"
            type="text"
            placeholder="Rechercher par description, équipement, utilisateur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs text-white focus:outline-none placeholder-slate-500 transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters Select group */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1 mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
            Bouton de filtre :
          </span>

          <button
            onClick={() => setSelectedAction('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              selectedAction === 'all'
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-800'
            }`}
          >
            Tous les logs ({logs.length})
          </button>

          <button
            onClick={() => setSelectedAction('finance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              selectedAction === 'finance'
                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-800'
            }`}
          >
            Flux financiers
          </button>

          <button
            onClick={() => setSelectedAction('inventaire')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              selectedAction === 'inventaire'
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-800'
            }`}
          >
            Mouvements matériel
          </button>

          <button
            onClick={() => setSelectedAction('purge_tx')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              selectedAction === 'purge_tx'
                ? 'bg-rose-900/35 border-rose-500/30 text-rose-300 font-bold'
                : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-800'
            }`}
          >
            Prises d'acte critiques (Purges)
          </button>
        </div>
      </div>

      {/* Logs stream/table design */}
      <div className="bg-slate-900/30 border border-slate-900 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
            <RefreshCw className="w-7 h-7 text-indigo-400 animate-spin" />
            <p className="text-xs">Chargement de l'historique d'audit...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-20 text-slate-500 space-y-2 border border-dashed border-slate-850 m-4 rounded-xl">
            <FileText className="w-9 h-9 text-slate-600 mx-auto" />
            <p className="text-xs font-medium">Aucun événement ne correspond à vos filtres.</p>
            <p className="text-[10px] text-slate-600">Enregistrez de nouvelles opérations ou de nouveaux articles pour alimenter cet audit.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-900">
            {filteredLogs.map((log) => {
              const badge = getActionBadge(log.action_type);
              return (
                <div 
                  key={log.id} 
                  className="p-4 hover:bg-slate-900/25 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  id={`audit-log-item-${log.id}`}
                >
                  <div className="flex items-start gap-4 flex-1">
                    {/* Event color indicator */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${badge.className}`}>
                      {badge.icon}
                    </div>

                    <div className="space-y-1 flex-1">
                      {/* Event description */}
                      <p className="text-xs font-medium text-slate-200 leading-relaxed">
                        {log.details}
                      </p>

                      {/* Technical/Audit details */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          {log.user_email}
                        </span>
                        <span className="text-slate-800">•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(log.created_at).toLocaleString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial amounts indicator column on desktop/fluid width */}
                  {(log.montant !== undefined && log.montant > 0) && (
                    <div className="flex md:flex-col items-baseline md:items-end justify-between md:justify-center shrink-0 w-full md:w-auto border-t md:border-t-0 border-dashed border-slate-900 pt-2.5 md:pt-0 font-mono">
                      <span className="text-[10px] text-slate-500 md:hidden">Impact financier :</span>
                      <span className={`text-xs font-bold ${
                        log.type_operation === 'entrée' 
                          ? 'text-emerald-400' 
                          : 'text-rose-400'
                      }`}>
                        {log.type_operation === 'entrée' ? '+' : '-'} {formatCFA(log.montant)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modern Custom Confirmation Modal for purging history trail */}
      <AnimatePresence>
        {showConfirmHistoryClear && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Purger l'historique d'audit ?</h4>
              </div>
              
              <p className="text-xs text-slate-300 leading-relaxed">
                Êtes-vous sûr de vouloir vider <strong className="text-white">l'ensemble des traces d'historique et des journaux d'audit</strong> de l'application ? 
                Cette opération d'administration est définitive et irréversible.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmHistoryClear(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-705 text-slate-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowConfirmHistoryClear(false);
                    await handleClearHistory();
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Confirmer la purge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Inline component replacement because PlusCircle is styled with special colors in case-by-case helper
function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      width="24" 
      height="24" 
      stroke="currentColor" 
      strokeWidth="2" 
      fill="none" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
