import { useState } from 'react';
import { Transaction, InventaireItem } from '../types';
import { DbService } from '../services/dbService';
import { 
  Trash2, 
  AlertTriangle, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw,
  XCircle,
  Check,
  FileText,
  ShieldAlert,
  ChevronRight,
  Info,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SuppressionProps {
  transactions: Transaction[];
  inventaire: InventaireItem[];
  onRefresh: () => Promise<void>;
}

export default function Suppression({ transactions, inventaire, onRefresh }: SuppressionProps) {
  // Logic preserved 100%
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfirmAll, setShowConfirmAll] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [transactionToDelete, setTransactionToDelete] = useState<{ id: string; description: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const formatCFA = (val: number) => {
    return new Intl.NumberFormat('fr-BJ', {
      style: 'currency', currency: 'XOF', minimumFractionDigits: 0,
    }).format(val).replace('XOF', 'F CFA');
  };

  const handleDeleteSingle = async (id: string, description: string) => {
    setDeletingId(id);
    try {
      await DbService.deleteTransaction(id);
      await onRefresh();
      setMessage({ type: 'success', text: `Opération supprimée.` });
    } catch (err: any) { setMessage({ type: 'error', text: "Erreur lors de la suppression." }); } 
    finally { setDeletingId(null); }
  };

  const handleClearAll = async () => {
    if (confirmText.toLowerCase() !== 'supprimer') return;
    setClearingAll(true);
    try {
      await DbService.deleteAllTransactions();
      await onRefresh();
      setMessage({ type: 'success', text: "Comptabilité purgée." });
      setShowConfirmAll(false);
      setConfirmText('');
    } catch (err: any) { setMessage({ type: 'error', text: "Erreur lors de la purge." }); } 
    finally { setClearingAll(false); }
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-100">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Espace Administration</h2>
            <p className="text-[13px] text-slate-500 font-medium">Contrôle des données et corrections comptables</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-slate-900 text-white rounded-full">
            Accès : Super-Admin
          </span>
        </div>
      </div>

      {/* Warnings & Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-amber-50 border border-amber-100 rounded-2xl p-6 flex gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h4 className="text-[13px] font-bold text-amber-800 uppercase tracking-tight">Impacts des suppressions</h4>
            <p className="text-xs text-amber-700/80 font-medium leading-relaxed">
              Toute suppression recalcule automatiquement le solde de trésorerie et les quantités de l'inventaire matériel liées à l'opération. Cette action est irréversible.
            </p>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-2">
            <h4 className="text-[13px] font-bold text-blue-800 uppercase tracking-tight">Support d'audit</h4>
            <p className="text-xs text-blue-700/80 font-medium leading-relaxed">
              Toutes les suppressions sont consignées dans le journal d'audit pour assurer la traçabilité.
            </p>
          </div>
        </div>
      </div>

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Mass Purge Card */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-fit sticky top-8">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Réinitialisation</h3>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Vous pouvez purger l'ensemble des <span className="font-bold text-slate-800">{transactions.length} écritures</span> comptables pour recommencer à zéro.
              </p>

              {!showConfirmAll ? (
                <button
                  onClick={() => setShowConfirmAll(true)}
                  disabled={transactions.length === 0}
                  className="w-full h-11 bg-rose-50 text-rose-600 border border-rose-100 font-bold rounded-xl text-xs hover:bg-rose-100 transition-all disabled:opacity-50"
                >
                  Purger toute la compta
                </button>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-rose-600 uppercase tracking-widest ml-1">Confirmation requise</label>
                    <input
                      type="text" placeholder="Saisir 'supprimer'" value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      className="w-full bg-rose-50 border border-rose-200 rounded-xl py-2.5 px-4 text-sm font-bold text-rose-900 focus:outline-none placeholder-rose-300 text-center uppercase"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowConfirmAll(false)} className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Annuler</button>
                    <button 
                      onClick={handleClearAll}
                      disabled={confirmText.toLowerCase() !== 'supprimer' || clearingAll}
                      className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg shadow-md disabled:opacity-50"
                    >
                      {clearingAll ? "Purge..." : "Confirmer"}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Individual Selection List */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Supprimer une opération</h3>
              </div>
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/5 focus:border-blue-600 transition-all w-full md:w-64"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
              {filteredTransactions.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">Aucun enregistrement financier trouvé.</p>
                </div>
              ) : (
                filteredTransactions.map((tx) => (
                  <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'entrée' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {tx.type === 'entrée' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-slate-800 truncate max-w-[200px] md:max-w-md">{tx.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(tx.date_transaction).toLocaleDateString('fr-FR')}</span>
                          <span className="text-slate-200">•</span>
                          <span className="font-bold text-slate-500 uppercase tracking-tight">{tx.mode_paiement}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`text-[13px] font-bold font-mono ${tx.type === 'entrée' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'entrée' ? '+' : '-'} {formatCFA(tx.montant)}
                      </span>
                      <button
                        onClick={() => setTransactionToDelete({ id: tx.id, description: tx.description })}
                        disabled={deletingId === tx.id}
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      >
                        {deletingId === tx.id ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {transactionToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Supprimer l'opération ?</h4>
              <p className="text-[13px] text-slate-500 font-medium mb-8 leading-relaxed">
                Voulez-vous retirer <span className="font-bold text-slate-800">"{transactionToDelete.description}"</span> ? Le solde de trésorerie et les stocks seront automatiquement corrigés.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setTransactionToDelete(null)} className="flex-1 py-2.5 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Annuler</button>
                <button 
                  onClick={async () => {
                    const id = transactionToDelete.id;
                    const desc = transactionToDelete.description;
                    setTransactionToDelete(null);
                    await handleDeleteSingle(id, desc);
                  }}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-100"
                >
                  Confirmer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages notifier */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-8 right-8 z-[200]">
            <div className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-3 bg-white ${message.type === 'success' ? 'border-emerald-100' : 'border-rose-100'}`}>
              <div className={`p-2 rounded-xl ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {message.type === 'success' ? <Check className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </div>
              <span className="text-sm font-bold text-slate-800 pr-8">{message.text}</span>
              <button onClick={() => setMessage(null)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><XCircle className="w-4 h-4 text-slate-400" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
