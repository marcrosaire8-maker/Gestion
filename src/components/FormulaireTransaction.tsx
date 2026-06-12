import React, { useState, useRef } from 'react';
import { DbService } from '../services/dbService';
import { InventaireItem, Transaction } from '../types';
import { 
  PlusCircle, 
  UploadCloud, 
  FileText, 
  Check, 
  AlertCircle, 
  Eye, 
  X,
  Package,
  Layers,
  Sparkles,
  ChevronRight,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FormProps {
  inventaire: InventaireItem[];
  onTransactionSuccess: (tx: Transaction) => void;
  onNewInventoryItem: (item: InventaireItem) => void;
  onRefresh: () => void;
}

export default function FormulaireTransaction({ 
  inventaire, 
  onTransactionSuccess, 
  onNewInventoryItem, 
  onRefresh 
}: FormProps) {
  // Logic preserved 100%
  const [type, setType] = useState<'entrée' | 'sortie'>('entrée');
  const [montant, setMontant] = useState('');
  const [modePaiement, setModePaiement] = useState('Espèces');
  const [description, setDescription] = useState('');
  const [categorie, setCategorie] = useState<'Développement/Tech' | 'Marketing/Com' | 'Logistique' | 'Administratif/Frais' | 'Autre'>('Autre');
  const [associeNom, setAssocieNom] = useState('');
  const [preuveFile, setPreuveFile] = useState<File | null>(null);
  const [preuveUrl, setPreuveUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lierInventaire, setLierInventaire] = useState(false);
  const [articleId, setArticleId] = useState('');
  const [quantiteAchetee, setQuantiteAchetee] = useState('1');
  const [creerNouvelArticle, setCreerNouvelArticle] = useState(false);
  const [nomNouvelArticle, setNomNouvelArticle] = useState('');
  const [valeurUnitaireNouvelArticle, setValeurUnitaireNouvelArticle] = useState('');
  const [uniteNouvelArticle, setUniteNouvelArticle] = useState('pièce');
  const [customUniteNouvelArticle, setCustomUniteNouvelArticle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Handlers (Preserved 100%)
  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === 'dragenter' || e.type === 'dragover'); };
  const handleDrop = async (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.[0]) await processUploadedFile(e.dataTransfer.files[0]); };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) await processUploadedFile(e.target.files[0]); };

  const processUploadedFile = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) { setUploadError('Images ou PDF uniquement.'); return; }
    setUploadError(null); setPreuveFile(file); setUploading(true);
    try { const url = await DbService.uploadReceipt(file); setPreuveUrl(url); } 
    catch (err: any) { setUploadError(err.message || "Erreur upload."); } 
    finally { setUploading(false); }
  };

  const resetForm = () => {
    setMontant(''); setDescription(''); setPreuveFile(null); setPreuveUrl(''); setLierInventaire(false);
    setArticleId(''); setQuantiteAchetee('1'); setCreerNouvelArticle(false); setNomNouvelArticle('');
    setValeurUnitaireNouvelArticle(''); setUniteNouvelArticle('pièce'); setCustomUniteNouvelArticle('');
    setFormError(null); setAssocieNom('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(null); setSuccessMsg(null);
    const amountNum = parseFloat(montant);
    if (isNaN(amountNum) || amountNum <= 0) { setFormError('Montant invalide.'); return; }
    setSubmitting(true);
    try {
      let finalArticleId = articleId;
      if (lierInventaire && creerNouvelArticle) {
        const addedItem = await DbService.addInventaireItem({
          nom_article: nomNouvelArticle.trim(), quantite_disponible: 0,
          valeur_unitaire: parseFloat(valeurUnitaireNouvelArticle),
          unite: uniteNouvelArticle === 'custom' ? customUniteNouvelArticle : uniteNouvelArticle
        });
        onNewInventoryItem(addedItem); finalArticleId = addedItem.id;
      }
      const tx = await DbService.addTransaction({
          type, montant: amountNum, mode_paiement: modePaiement, description: description.trim(),
          preuve_url: preuveUrl || undefined, user_id: '',
          categorie: type === 'sortie' ? categorie : undefined,
          associe_nom: type === 'entrée' ? (associeNom.trim() || undefined) : undefined,
        }, lierInventaire ? finalArticleId : undefined, lierInventaire ? parseInt(quantiteAchetee) : undefined
      );
      setSuccessMsg('Opération enregistrée avec succès.'); onTransactionSuccess(tx); resetForm(); onRefresh();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) { setFormError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      {/* Header Style Enterprise */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
            <PlusCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Nouveau Mouvement</h3>
            <p className="text-[13px] text-slate-500 font-medium">Flux financier & liaison inventaire</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Alerts */}
        <AnimatePresence mode="wait">
          {successMsg && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-semibold">
                <Check className="w-4 h-4" /> {successMsg}
              </div>
            </motion.div>
          )}
          {formError && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6">
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4" /> {formError}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SÉLECTEUR DE TYPE (Entrée / Sortie) */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Type d'opération</label>
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
              <button
                type="button" onClick={() => setType('entrée')}
                className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  type === 'entrée' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" /> Entrée (Recette)
              </button>
              <button
                type="button" onClick={() => setType('sortie')}
                className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  type === 'sortie' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" /> Sortie (Dépense)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MONTANT */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Montant (F CFA)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600">
                  <Wallet className="w-4 h-4" />
                </div>
                <input
                  type="number" required placeholder="0" value={montant} onChange={(e) => setMontant(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/5 focus:border-blue-600 transition-all"
                />
              </div>
            </div>

            {/* MODE PAIEMENT */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Mode de règlement</label>
              <select
                value={modePaiement} onChange={(e) => setModePaiement(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold text-slate-700 focus:outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer"
              >
                <option value="Espèces">Espèces (Cash)</option>
                <option value="MTN Mobile Money">MTN MoMo</option>
                <option value="Moov Money">Moov Flooz</option>
                <option value="Virement bancaire">Virement bancaire</option>
                <option value="Chèque">Chèque</option>
              </select>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Désignation de l'opération</label>
            <input
              type="text" required placeholder="Détails du mouvement..." value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:border-blue-600 transition-all"
            />
          </div>

          {/* CATÉGORIE / ASSOCIÉ (Conditionnel) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {type === 'sortie' ? (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Catégorie Budgétaire</label>
                <select
                  value={categorie} onChange={(e) => setCategorie(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold text-slate-700 focus:outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer"
                >
                  <option value="Développement/Tech">Développement / Tech</option>
                  <option value="Marketing/Com">Marketing / Com</option>
                  <option value="Logistique">Logistique / Transport</option>
                  <option value="Administratif/Frais">Administratif / Loyers</option>
                  <option value="Autre">Autre dépense</option>
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Associé (Si Apport Capital)</label>
                <input
                  type="text" placeholder="Nom de l'apporteur..." value={associeNom} onChange={(e) => setAssocieNom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:border-blue-600 transition-all"
                />
              </div>
            )}
          </div>

          {/* UPLOAD JUSTIFICATIF */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Pièce justificative (Reçu / Facture)</label>
            <div 
              className={`border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center text-center ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
              onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
            >
              <input ref={fileInputRef} type="file" className="hidden" id="file-up" accept="image/*,application/pdf" onChange={handleFileChange} />
              {!preuveFile ? (
                <label htmlFor="file-up" className="cursor-pointer group flex flex-col items-center">
                  <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Cliquez pour uploader ou glissez un fichier</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Images ou PDF (Max 5Mo)</p>
                </label>
              ) : (
                <div className="w-full flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{preuveFile.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{uploading ? 'Upload en cours...' : 'Prêt ✓'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {preuveUrl && <a href={preuveUrl} target="_blank" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-4 h-4" /></a>}
                    <button type="button" onClick={() => { setPreuveFile(null); setPreuveUrl(''); }} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LIAISON INVENTAIRE SECTION */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox" checked={lierInventaire} onChange={(e) => setLierInventaire(e.target.checked)}
                    className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-600 transition-all cursor-pointer"
                  />
                </div>
                <span className="text-[13px] font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Lier cet achat/vente au stock ?</span>
              </label>

              {lierInventaire && (
                <button
                  type="button" onClick={() => setCreerNouvelArticle(!creerNouvelArticle)}
                  className="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest hover:underline"
                >
                  {creerNouvelArticle ? "Sélectionner un article existant" : "+ Créer nouvel article"}
                </button>
              )}
            </div>

            <AnimatePresence>
              {lierInventaire && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 border-t border-slate-200 space-y-4">
                  {!creerNouvelArticle ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Article en stock</label>
                        <select
                          value={articleId} onChange={(e) => setArticleId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 appearance-none"
                        >
                          <option value="">-- Choisir un article --</option>
                          {inventaire.map(item => (
                            <option key={item.id} value={item.id}>{item.nom_article} (Stock: {item.quantite_disponible})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">Quantité</label>
                        <input
                          type="number" value={quantiteAchetee} onChange={(e) => setQuantiteAchetee(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-white border border-blue-100 rounded-xl space-y-4 shadow-sm">
                      <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-tight">Nouvel Article</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="text" placeholder="Nom de l'article" value={nomNouvelArticle} onChange={(e) => setNomNouvelArticle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs" />
                        <input type="number" placeholder="Prix unitaire" value={valeurUnitaireNouvelArticle} onChange={(e) => setValeurUnitaireNouvelArticle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs" />
                        <select value={uniteNouvelArticle} onChange={(e) => setUniteNouvelArticle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs">
                          <option value="pièce">Pièce (U)</option>
                          <option value="kg">kg</option>
                          <option value="litre">Litre</option>
                          <option value="paquet">Paquet</option>
                        </select>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit" disabled={submitting || uploading}
            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-[0.99] disabled:opacity-70 mt-4"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Enregistrer le mouvement</span>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
