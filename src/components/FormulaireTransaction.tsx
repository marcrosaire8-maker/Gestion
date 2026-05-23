import React, { useState, useRef } from 'react';
import { DbService } from '../services/dbService';
import { InventaireItem, Transaction } from '../types';
import { 
  PlusCircle, 
  UploadCloud, 
  FileText, 
  DollarSign, 
  Check, 
  AlertCircle, 
  Eye, 
  X,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  // Core transaction fields
  const [type, setType] = useState<'entrée' | 'sortie'>('entrée');
  const [montant, setMontant] = useState('');
  const [modePaiement, setModePaiement] = useState('Espèces');
  const [description, setDescription] = useState('');
  const [categorie, setCategorie] = useState<'Développement/Tech' | 'Marketing/Com' | 'Logistique' | 'Administratif/Frais' | 'Autre'>('Autre');
  const [associeNom, setAssocieNom] = useState('');
  
  // File Upload fields
  const [preuveFile, setPreuveFile] = useState<File | null>(null);
  const [preuveUrl, setPreuveUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inventaire links fields
  const [lierInventaire, setLierInventaire] = useState(false);
  const [articleId, setArticleId] = useState('');
  const [quantiteAchetee, setQuantiteAchetee] = useState('1');

  // Inline rapid article creation
  const [creerNouvelArticle, setCreerNouvelArticle] = useState(false);
  const [nomNouvelArticle, setNomNouvelArticle] = useState('');
  const [valeurUnitaireNouvelArticle, setValeurUnitaireNouvelArticle] = useState('');
  const [uniteNouvelArticle, setUniteNouvelArticle] = useState('pièce');
  const [customUniteNouvelArticle, setCustomUniteNouvelArticle] = useState('');

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // File drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processUploadedFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processUploadedFile(file);
    }
  };

  const processUploadedFile = async (file: File) => {
    // Basic image/pdf validation
    const fileType = file.type;
    const isImage = fileType.startsWith('image/');
    const isPdf = fileType === 'application/pdf';

    if (!isImage && !isPdf) {
      setUploadError('Seuls les fichiers images ou PDF sont acceptés.');
      return;
    }

    setUploadError(null);
    setPreuveFile(file);
    setUploading(true);

    try {
      const url = await DbService.uploadReceipt(file);
      setPreuveUrl(url);
    } catch (err: any) {
      setUploadError(err.message || "Erreur de chargement du justificatif sur Supabase Storage.");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setPreuveFile(null);
    setPreuveUrl('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetForm = () => {
    setMontant('');
    setDescription('');
    setPreuveFile(null);
    setPreuveUrl('');
    setLierInventaire(false);
    setArticleId('');
    setQuantiteAchetee('1');
    setCreerNouvelArticle(false);
    setNomNouvelArticle('');
    setValeurUnitaireNouvelArticle('');
    setUniteNouvelArticle('pièce');
    setCustomUniteNouvelArticle('');
    setFormError(null);
    setCategorie('Autre');
    setAssocieNom('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    const amountNum = parseFloat(montant);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError('Le montant doit être un chiffre positif.');
      return;
    }

    if (!description.trim()) {
      setFormError('La description est requise.');
      return;
    }

    setSubmitting(true);

    try {
      let finalArticleId = articleId;

      // Inline creation of the article if specified
      if (lierInventaire && creerNouvelArticle) {
        if (!nomNouvelArticle.trim() || !valeurUnitaireNouvelArticle) {
          throw new Error("Veuillez saisir le nom et le prix unitaire du nouvel article.");
        }
        const unitVal = parseFloat(valeurUnitaireNouvelArticle);
        if (isNaN(unitVal) || unitVal < 0) {
          throw new Error("La valeur unitaire du nouvel article est invalide.");
        }

        const finalUnite = uniteNouvelArticle === 'custom' ? customUniteNouvelArticle.trim() : (uniteNouvelArticle === 'none' ? '' : uniteNouvelArticle);

        const addedItem = await DbService.addInventaireItem({
          nom_article: nomNouvelArticle.trim(),
          quantite_disponible: 0, // Will be updated by transaction link
          valeur_unitaire: unitVal,
          unite: finalUnite
        });

        onNewInventoryItem(addedItem);
        finalArticleId = addedItem.id;
      }

      const qty = parseInt(quantiteAchetee);
      if (lierInventaire && (isNaN(qty) || qty <= 0)) {
        throw new Error("La quantité reliée à la transaction doit être positive.");
      }

      // Add to database
      const tx = await DbService.addTransaction(
        {
          type,
          montant: amountNum,
          mode_paiement: modePaiement,
          description: description.trim(),
          preuve_url: preuveUrl || undefined,
          user_id: '', // Handled by service layer
          categorie: type === 'sortie' ? categorie : undefined,
          associe_nom: type === 'entrée' ? (associeNom.trim() || undefined) : undefined,
        },
        lierInventaire ? finalArticleId : undefined,
        lierInventaire ? qty : undefined
      );

      setSuccessMsg('Transaction enregistrée avec succès ! Flux financier et inventaire mis à jour.');
      onTransactionSuccess(tx);
      resetForm();
      onRefresh();

      // Clear success notification after 5 seconds
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de l\'enregistrement de la transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden" id="form-transac-container">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-600/15 rounded-xl flex items-center justify-center">
          <PlusCircle className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide">
            Saisie de Mouvement Trésorerie
          </h3>
          <p className="text-xs text-slate-400">
            Saisissez des entrées ou des dépenses et liez-les à l'inventaire si nécessaire
          </p>
        </div>
      </div>

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3 text-emerald-200 text-xs"
          id="transac-success"
        >
          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>{successMsg}</p>
        </motion.div>
      )}

      {formError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-200 text-xs"
          id="transac-error"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p>{formError}</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: Type & Payment Mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Type de transaction
            </label>
            <div className="grid grid-cols-2 bg-slate-950 border border-slate-800 p-1 rounded-xl">
              <button
                id="btn-form-type-entree"
                type="button"
                onClick={() => setType('entrée')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  type === 'entrée' 
                    ? 'bg-emerald-600/15 border border-emerald-500/30 text-emerald-400' 
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Entrée (Recette / Vente)
              </button>
              <button
                id="btn-form-type-sortie"
                type="button"
                onClick={() => setType('sortie')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  type === 'sortie' 
                    ? 'bg-rose-600/15 border border-rose-500/30 text-rose-400' 
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Sortie (Dépense / Achat)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Mode de Règlement
            </label>
            <select
              id="select-mode"
              value={modePaiement}
              onChange={(e) => setModePaiement(e.target.value)}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-all select-none h-[42px]"
            >
              <option value="Espèces">Espèces (Cash)</option>
              <option value="MTN Mobile Money">MTN Mobile Money (MoMo)</option>
              <option value="Moov Money">Moov Money (Flooz)</option>
              <option value="Virement bancaire">Virement bancaire</option>
              <option value="Chèque">Chèque</option>
            </select>
          </div>
        </div>

        {/* Row 2: Amount & Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Montant de la Transaction (F CFA)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <DollarSign className="w-4 h-4 text-slate-500" />
              </span>
              <input
                id="input-form-montant"
                type="number"
                min="0"
                step="any"
                required
                className="w-full pl-9 pr-20 py-2.5 bg-slate-950/65 border border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                placeholder="Ex : 750000"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-semibold text-slate-500 font-mono">
                F CFA
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Description de l'Opération
            </label>
            <input
              id="input-form-desc"
              type="text"
              required
              className="w-full px-4 py-2.5 bg-slate-950/65 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
              placeholder="Ex : Vente d'équipements informatiques à MTN Bénin"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Row 2.5: Special budgeting and tracking depending on tx type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {type === 'sortie' ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5" htmlFor="select-categorie">
                Catégorie de Dépense Budgétaire
              </label>
              <select
                id="select-categorie"
                value={categorie}
                onChange={(e) => setCategorie(e.target.value as any)}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-all select-none h-[42px]"
              >
                <option value="Développement/Tech">Développement / Internet / Tech</option>
                <option value="Marketing/Com">Marketing / Communication / Publicité</option>
                <option value="Logistique">Logistique / Transport / Stockage</option>
                <option value="Administratif/Frais">Administratif / Loyers / Bureaux</option>
                <option value="Autre">Autre dépense de fonctionnement</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5" htmlFor="input-associe-nom">
                Associé Apporteur de Capital (Optionnel)
              </label>
              <input
                id="input-associe-nom"
                type="text"
                className="w-full px-4 py-2.5 bg-slate-950/65 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600 h-[42px]"
                placeholder="Ex : Monsieur Koffi, Madame Agnès"
                value={associeNom}
                onChange={(e) => setAssocieNom(e.target.value)}
              />
            </div>
          )}
          
          <div className="invisible hidden md:block" />
        </div>

        {/* Row 3: File Justificatif / Receipt drag & drop */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
            Pièce justificative / Reçu de paiement (Bucket "recus-preuves")
          </label>
          <div 
            className={`border border-dashed rounded-xl p-4 transition-all flex flex-col items-center justify-center text-center ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-500/5' 
                : preuveFile 
                  ? 'border-slate-700 bg-slate-950/40' 
                  : 'border-slate-800 bg-slate-950/10 hover:bg-slate-950/20'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <input 
              ref={fileInputRef}
              type="file"
              id="file-upload"
              className="hidden"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
            />

            {!preuveFile ? (
              <label 
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center p-2 group w-full"
              >
                <UploadCloud className="w-7 h-7 text-slate-400 group-hover:text-indigo-400 transition-all mb-2" />
                <span className="text-xs text-slate-200 font-semibold group-hover:text-indigo-300">
                  Parcourez vos fichiers ou Glissez-déposez ici
                </span>
                <span className="text-[10px] text-slate-500 mt-1">
                  Format image (JPEG, PNG) ou PDF. Taille max : 5Mo.
                </span>
              </label>
            ) : (
              <div className="w-full flex items-center justify-between gap-4 p-1.5" id="file-loaded-state">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="text-left overflow-hidden">
                    <p className="text-xs text-slate-200 font-semibold truncate max-w-[200px] sm:max-w-xs">{preuveFile.name}</p>
                    <p className="text-[10px] text-slate-500">{uploading ? 'Enregistrement...' : 'Chargé sur Supabase Storage ✓'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {preuveUrl && (
                    <a 
                      href={preuveUrl} 
                      target="_blank" 
                      rel="referrer noopener"
                      className="p-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Voir
                    </a>
                  )}
                  <button 
                    type="button" 
                    onClick={removeFile}
                    className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          {uploadError && (
            <p className="text-[10px] text-rose-400 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {uploadError}
            </p>
          )}
        </div>

        {/* Row 4: Inventory linking (Liaison Inventaire) */}
        <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="checkbox-lier-inventaire"
                type="checkbox"
                checked={lierInventaire}
                onChange={(e) => setLierInventaire(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-slate-950 border-slate-800 rounded focus:ring-indigo-500 focus:ring-offset-slate-900 focus:ring-1"
              />
              <span className="text-xs font-semibold text-slate-200">
                Lier avec un article de l'inventaire ?
              </span>
            </label>

            {lierInventaire && (
              <button
                type="button"
                onClick={() => setCreerNouvelArticle(!creerNouvelArticle)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                {creerNouvelArticle ? "Choisir existant..." : "Créer un nouvel article..."}
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {lierInventaire && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-2 space-y-4"
              >
                {!creerNouvelArticle ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">
                        Sélectionner l'article
                      </label>
                      <select
                        id="select-article-inventaire"
                        value={articleId}
                        onChange={(e) => setArticleId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Sélectionnez un article en stock --</option>
                        {inventaire.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.nom_article} (Qté : {item.quantite_disponible} dispo - {item.valeur_unitaire} F)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">
                        Quantité ({type === 'entrée' ? 'Vendue' : 'Achetée'})
                      </label>
                      <input
                        id="input-quantite"
                        type="number"
                        min="1"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Ex : 10"
                        value={quantiteAchetee}
                        onChange={(e) => setQuantiteAchetee(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3.5 bg-indigo-950/20 border border-indigo-500/20 rounded-lg space-y-3"
                    id="new-article-inline-panel"
                  >
                    <div className="flex items-center gap-1 text-xs font-semibold text-indigo-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      Création d'un nouvel Article en direct
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-indigo-300 mb-1.5">
                          Nom de l'article en stock
                        </label>
                        <input
                          id="inline-article-name"
                          type="text"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-indigo-900/50"
                          placeholder="Ex: Routeur WiFi Cisco"
                          value={nomNouvelArticle}
                          onChange={(e) => setNomNouvelArticle(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-indigo-300 mb-1.5">
                          Valeur Unitaire (F CFA)
                        </label>
                        <input
                          id="inline-article-price"
                          type="number"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-indigo-900/50"
                          placeholder="Ex: 80000"
                          value={valeurUnitaireNouvelArticle}
                          onChange={(e) => setValeurUnitaireNouvelArticle(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-indigo-300 mb-1.5">
                          Unité de Mesure
                        </label>
                        <select
                          id="inline-article-unite"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                          value={uniteNouvelArticle}
                          onChange={(e) => setUniteNouvelArticle(e.target.value)}
                        >
                          <option value="pièce">Pièce (U)</option>
                          <option value="kg">Kilogramme (kg)</option>
                          <option value="litre">Litre (L)</option>
                          <option value="paquet">Paquet / Ram</option>
                          <option value="sac">Sac / Cartouche</option>
                          <option value="boîte">Boîte / Carton</option>
                          <option value="none">Aucune unité</option>
                          <option value="custom">Autre (Saisir...)</option>
                        </select>
                        {uniteNouvelArticle === 'custom' && (
                          <input
                            id="inline-article-custom-unite"
                            type="text"
                            required
                            placeholder="Ex : Douzaine, Litre"
                            className="w-full mt-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                            value={customUniteNouvelArticle}
                            onChange={(e) => setCustomUniteNouvelArticle(e.target.value)}
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-indigo-300 mb-1.5">
                        Quantité à approvisionner ({type === 'entrée' ? 'Vendue' : 'Achetée'})
                      </label>
                      <input
                        id="inline-article-qty"
                        type="number"
                        min="1"
                        className="w-full max-w-[180px] px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Ex : 5"
                        value={quantiteAchetee}
                        onChange={(e) => setQuantiteAchetee(e.target.value)}
                      />
                    </div>
                  </motion.div>
                )}
                <p className="text-[10px] text-slate-400 italic">
                  * Note: {type === 'sortie' 
                    ? "L'article sera approvisionné (quantité augmentée)." 
                    : "L'article sera retiré du stock (quantité diminuée)."
                  }
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Submit */}
        <button
          id="btn-submit-transac"
          type="submit"
          disabled={submitting || uploading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer"
        >
          {submitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Enregistrement en cours...
            </>
          ) : (
            <>
              <Package className="w-4 h-4 text-indigo-200" />
              Valider et Enregistrer le Mouvement
            </>
          )}
        </button>
      </form>
    </div>
  );
}
