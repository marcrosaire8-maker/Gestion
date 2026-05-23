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
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SuppressionProps {
  transactions: Transaction[];
  inventaire: InventaireItem[];
  onRefresh: () => Promise<void>;
}

export default function Suppression({ transactions, inventaire, onRefresh }: SuppressionProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfirmAll, setShowConfirmAll] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  
  // Custom transaction confirmation modal state
  const [transactionToDelete, setTransactionToDelete] = useState<{ id: string; description: string } | null>(null);

  // Format currency
  const formatCFA = (val: number) => {
    return new Intl.NumberFormat('fr-BJ', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(val).replace('XOF', 'F CFA');
  };

  // Handle single deletion
  const handleDeleteSingle = async (id: string, description: string) => {
    setDeletingId(id);
    setMessage(null);
    try {
      await DbService.deleteTransaction(id);
      await onRefresh();
      setMessage({ type: 'success', text: `L'opération "${description}" a été supprimée avec succès.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Erreur lors de la suppression : ${err.message || 'Inconnue'}` });
    } finally {
      setDeletingId(null);
    }
  };

  // Handle mass clear
  const handleClearAll = async () => {
    if (confirmText.toLowerCase() !== 'supprimer') {
      setMessage({ type: 'error', text: "Veuillez saisir 'SUPPRIMER' pour confirmer l'action globale." });
      return;
    }

    setClearingAll(true);
    setMessage(null);
    try {
      await DbService.deleteAllTransactions();
      await onRefresh();
      setMessage({ 
        type: 'success', 
        text: "Toutes les opérations de la comptabilité ont été purgées avec succès. L'inventaire de base n'a pas été affecté." 
      });
      setShowConfirmAll(false);
      setConfirmText('');
    } catch (err: any) {
      setMessage({ type: 'error', text: `Erreur lors du nettoyage global : ${err.message}` });
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <div className="space-y-6" id="suppression-page-container">
      {/* Title & Introduction */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-500" />
            Espace Administration & Suppression d'Opérations
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gérez et annulez les opérations financières enregistrées. Cet espace permet le retrait sécurisé d'entrées ou de dépenses erronées.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded font-semibold">
            Rôle : Administrateur Principal
          </span>
        </div>
      </div>

      {/* Warning Box */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-white">Impacts des transactions supprimées :</p>
          <ul className="list-disc pl-4 space-y-1 text-slate-400">
            <li>La suppression d'une <span className="text-emerald-400">entrée de capital</span> réduira le solde de trésorerie disponible.</li>
            <li>La suppression d'une <span className="text-rose-400">sortie d'achat</span> de matériel (ex: ordinateur, papeterie) réduira automatiquement la quantité correspondante déjà acquise dans l'inventaire de matériel.</li>
            <li>Ces opérations sont irréversibles si la base de données est purgée.</li>
          </ul>
        </div>
      </div>

      {/* Messages notifier */}
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
            className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-400 hover:text-white"
          >
            Masquer
          </button>
        </motion.div>
      )}

      {/* Interactive Controls Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Mass Delete Card */}
        <div className="bg-slate-900/60 border border-red-500/25 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-bold text-white">Purge Complète Compta</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Supprimez l'ensemble des {transactions.length} écritures comptables enregistrées à ce jour pour recommencer sur une feuille blanche.
          </p>

          {!showConfirmAll ? (
            <button
              id="btn-trigger-purge-all"
              onClick={() => setShowConfirmAll(true)}
              disabled={transactions.length === 0}
              className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600 border border-red-600/30 hover:border-red-500 text-red-200 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Réinitialiser toute la compta
            </button>
          ) : (
            <div className="bg-slate-950 p-3 rounded-lg border border-red-500/35 space-y-3">
              <p className="text-[11px] text-red-400 font-medium">
                Saisissez le mot <span className="font-bold underline uppercase text-white">supprimer</span> pour valider cette action critique :
              </p>
              <input
                id="input-confirm-all"
                type="text"
                placeholder="Indiquez 'supprimer'"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white uppercase font-semibold focus:outline-none focus:border-red-500 text-center"
              />
              <div className="flex gap-2">
                <button
                  id="btn-cancel-purge-all"
                  onClick={() => {
                    setShowConfirmAll(false);
                    setConfirmText('');
                  }}
                  className="flex-1 py-1 px-2.5 bg-slate-800 hover:bg-slate-705 text-slate-300 text-[11px] rounded transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  id="btn-confirm-purge-all"
                  onClick={handleClearAll}
                  disabled={confirmText.toLowerCase() !== 'supprimer' || clearingAll}
                  className="flex-1 py-1 px-2.5 bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold rounded disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {clearingAll ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Patientez...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Confirmer purge
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Individual operations list for fast deletion */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-slate-400" />
              Supprimer une Opération Spécifique
            </h3>
            <span className="text-[10px] font-mono bg-slate-800 text-slate-350 px-2.5 py-0.5 rounded-full border border-slate-700">
              {transactions.length} enregistrées
            </span>
          </div>

          <div className="max-h-[420px] overflow-y-auto space-y-2.5 pr-2">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs">Aucune opération financière enregistrée dans le système.</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-950/70 rounded-lg border border-slate-800 hover:border-slate-700 transition-all gap-3"
                >
                  <div className="flex gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      tx.type === 'entrée' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                    }`}>
                      {tx.type === 'entrée' ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-rose-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">{tx.description}</h4>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(tx.date_transaction).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        <span className="text-slate-600">•</span>
                        <span>Mode: {tx.mode_paiement}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-900 pt-2 sm:pt-0 shrink-0">
                    <span className={`text-xs font-bold font-mono ${
                      tx.type === 'entrée' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {tx.type === 'entrée' ? '+' : '-'} {formatCFA(tx.montant)}
                    </span>

                    <button
                      id={`btn-delete-tx-${tx.id}`}
                      onClick={() => setTransactionToDelete({ id: tx.id, description: tx.description })}
                      disabled={deletingId === tx.id}
                      className="p-1.5 bg-red-500/10 hover:bg-red-600 border border-red-500/20 hover:border-red-500 text-red-400 hover:text-white rounded-md cursor-pointer transition-all disabled:opacity-50"
                      title="Supprimer cette opération"
                    >
                      {deletingId === tx.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Modern Custom Confirmation Modal for Single Transaction deletion to prevent iframe blocks */}
      <AnimatePresence>
        {transactionToDelete && (
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
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Supprimer l'opération ?</h4>
              </div>
              
              <p className="text-xs text-slate-300 leading-relaxed">
                Êtes-vous certain de vouloir supprimer l'opération <strong className="text-white">"{transactionToDelete.description}"</strong> de la comptabilité ? 
                Si elle est liée à l'achat ou à la vente de matériel, les stocks de l'inventaire seront recalculés automatiquement.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTransactionToDelete(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-705 text-slate-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const idToDel = transactionToDelete.id;
                    const descToDel = transactionToDelete.description;
                    setTransactionToDelete(null);
                    await handleDeleteSingle(idToDel, descToDel);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Oui, supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
