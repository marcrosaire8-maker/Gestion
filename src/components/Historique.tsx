import { useState, useEffect } from 'react';
import { ActivityLog, UserProfile } from '../types';
import { DbService } from '../services/dbService';
import { 
  History, 
  Search, 
  Trash2, 
  User, 
  Calendar, 
  Package, 
  RefreshCw,
  FileText,
  SlidersHorizontal,
  X,
  XCircle,
  AlertTriangle,
  Layers,
  Sparkles,
  ChevronRight,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HistoriqueProps {
  user: UserProfile;
  onRefresh: () => Promise<void>;
}

export default function Historique({ user, onRefresh }: HistoriqueProps) {
  // Logic preserved 100%
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [showConfirmHistoryClear, setShowConfirmHistoryClear] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const dbLogs = await DbService.getLogs();
      setLogs(dbLogs);
    } catch (err: any) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  const formatCFA = (val: number) => {
    return new Intl.NumberFormat('fr-BJ', {
      style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(val).replace('XOF', 'F CFA');
  };

  // Badge Logic refined for Light Enterprise Theme
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create_tx':
        return { label: 'Enregistrement', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <PlusCircle className="w-4 h-4" /> };
      case 'delete_tx':
        return { label: 'Annulation', color: 'text-rose-600', bg: 'bg-rose-50', icon: <ArrowDownRight className="w-4 h-4" /> };
      case 'purge_tx':
        return { label: 'Purge Critique', color: 'text-red-700', bg: 'bg-red-100', icon: <XCircle className="w-4 h-4" /> };
      case 'create_inv':
        return { label: 'Inventaire +', color: 'text-blue-600', bg: 'bg-blue-50', icon: <Package className="w-4 h-4" /> };
      case 'update_inv':
        return { label: 'Ajustement', color: 'text-amber-600', bg: 'bg-amber-50', icon: <Layers className="w-4 h-4" /> };
      case 'delete_inv':
        return { label: 'Retrait Inv.', color: 'text-purple-600', bg: 'bg-purple-50', icon: <Trash2 className="w-4 h-4" /> };
      default:
        return { label: 'Système', color: 'text-slate-600', bg: 'bg-slate-100', icon: <FileText className="w-4 h-4" /> };
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchQuery.toLowerCase()) || log.user_email.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedAction === 'all') return matchesSearch;
    if (selectedAction === 'finance') return matchesSearch && ['create_tx', 'delete_tx', 'purge_tx'].includes(log.action_type);
    if (selectedAction === 'inventaire') return matchesSearch && ['create_inv', 'update_inv', 'delete_inv'].includes(log.action_type);
    return matchesSearch && log.action_type === selectedAction;
  });

  const handleClearHistory = async () => {
    setClearing(true);
    try {
      await DbService.clearLogs();
      setLogs([]);
      setMessage({ type: 'success', text: "Historique purgé." });
    } catch (err: any) { setMessage({ type: 'error', text: "Erreur lors de la purge." }); } 
    finally { setClearing(false); }
  };

  return (
    <div className="space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Journal d'Audit</h2>
            <p className="text-[13px] text-slate-500 font-medium">Traçabilité complète des opérations système</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchLogs(); onRefresh(); }}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {user.role === 'admin' && (
            <button
              onClick={() => setShowConfirmHistoryClear(true)}
              disabled={clearing || logs.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[13px] font-bold hover:bg-rose-100 transition-all active:scale-95 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Purger les logs
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm flex flex-col lg:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="Rechercher un événement, un email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-transparent text-sm focus:outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
          {[
            { id: 'all', label: `Tous (${logs.length})` },
            { id: 'finance', label: 'Finance' },
            { id: 'inventaire', label: 'Inventaire' }
          ].map(tab => (
            <button
              key={tab.id} onClick={() => setSelectedAction(tab.id)}
              className={`flex-1 lg:flex-none px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                selectedAction === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-medium">Chargement du journal d'audit...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400 font-medium">Aucun événement enregistré.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const badge = getActionBadge(log.action_type);
              return (
                <div key={log.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Action Icon Badge */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-transparent transition-colors ${badge.bg} ${badge.color}`}>
                      {badge.icon}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight ${badge.bg} ${badge.color}`}>
                          {badge.label}
                        </span>
                        <p className="text-[13px] font-bold text-slate-800 leading-tight">
                          {log.details}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> {log.user_email}</span>
                        <span className="text-slate-200">•</span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" /> 
                          {new Date(log.created_at).toLocaleString('fr-FR', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Impact */}
                  {log.montant !== undefined && log.montant > 0 && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Impact</span>
                      <span className={`text-[13px] font-bold font-mono ${log.type_operation === 'entrée' ? 'text-emerald-600' : 'text-rose-600'}`}>
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

      {/* Confirm Purge Modal */}
      <AnimatePresence>
        {showConfirmHistoryClear && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Purger l'historique ?</h4>
              <p className="text-[13px] text-slate-500 font-medium mb-8 leading-relaxed">
                Cette action supprimera <span className="font-bold text-slate-800">définitivement</span> toutes les traces d'audit. Cette opération est irréversible.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmHistoryClear(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Annuler</button>
                <button 
                  onClick={async () => { setShowConfirmHistoryClear(false); await handleClearHistory(); }}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-red-100"
                >
                  Confirmer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Success Toast */}
      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 right-8 z-[200]"
          >
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-bold pr-4">{message.text}</span>
              <button onClick={() => setMessage(null)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
