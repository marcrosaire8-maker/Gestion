import React, { useState } from 'react';
import { InventaireItem, UserProfile } from '../types';
import { DbService } from '../services/dbService';
import { 
  Package, 
  AlertTriangle, 
  Search, 
  Plus, 
  Sparkles,
  Edit2,
  DollarSign,
  Layers,
  ArrowRight,
  X,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InventaireProps {
  items: InventaireItem[];
  onAddNewItem: (item: InventaireItem) => void;
  onRefresh: () => void;
  user: UserProfile;
}

export default function Inventaire({ items, onAddNewItem, onRefresh, user }: InventaireProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Custom manual insertion
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [unite, setUnite] = useState('pièce');
  const [customUnite, setCustomUnite] = useState('');

  // Editing state for manual correction
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState('');
  
  // Custom confirmation modal state for deletion
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Financial Formatting
  const formatCFA = (val: number) => {
    return new Intl.NumberFormat('fr-BJ', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val).replace('XOF', 'F CFA');
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !qty || !price) {
      setError('Veuillez remplir tous les champs disponibles.');
      return;
    }

    const qtyNum = parseInt(qty);
    const priceNum = parseFloat(price);

    if (isNaN(qtyNum) || qtyNum < 0) {
      setError('La quantité doit être un entier positif ou nul.');
      return;
    }

    if (isNaN(priceNum) || priceNum < 0) {
      setError('Le prix unitaire doit être un nombre positif.');
      return;
    }

    const finalUnite = unite === 'custom' ? customUnite.trim() : (unite === 'none' ? '' : unite);

    setLoading(true);

    try {
      const added = await DbService.addInventaireItem({
        nom_article: name.trim(),
        quantite_disponible: qtyNum,
        valeur_unitaire: priceNum,
        unite: finalUnite
      });
      onAddNewItem(added);
      
      // Clear inputs
      setName('');
      setQty('');
      setPrice('');
      setUnite('pièce');
      setCustomUnite('');
      setShowAddForm(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'ajout du matériel en inventaire.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQtySubmit = async (id: string) => {
    const q = parseInt(editingQty);
    if (isNaN(q) || q < 0) return;
    
    try {
      await DbService.updateInventaireQty(id, q);
      setEditingId(null);
      setEditingQty('');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await DbService.deleteInventaireItem(id);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression de l'article.");
    } finally {
      setLoading(false);
    }
  };

  // Filter list
  const filteredItems = items.filter(item => 
    item.nom_article.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Low stock indicator check (less than 5 items)
  const lowStockItems = items.filter(item => item.quantite_disponible <= 5);
  const outOfStockItems = items.filter(item => item.quantite_disponible === 0);

  const totalValeurStock = items.reduce((sum, item) => sum + (item.quantite_disponible * Number(item.valeur_unitaire)), 0);

  return (
    <div className="space-y-6" id="inventaire-container">
      {/* KPI grids of stock operations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Kinds of articles */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">Total Références</span>
            <span id="kpi-refs-count" className="text-xl font-bold font-mono text-white mt-1 block">
              {items.length} articles différents
            </span>
          </div>
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">Alertes Stock Bas</span>
            <span id="kpi-low-count" className="text-xl font-bold font-mono text-amber-400 mt-1 block">
              {lowStockItems.length} références (≤ 5)
            </span>
          </div>
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        {/* Inventory cumulative worth */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">Valeur Globale Entreposée</span>
            <span id="kpi-valuation" className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
              {formatCFA(totalValeurStock)}
            </span>
          </div>
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {outOfStockItems.length > 0 && (
        <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl flex items-center gap-2 text-rose-300 text-xs shadow-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 animate-pulse" />
          <p>
            Certains équipements essentiels sont en rupture de stock (<strong className="text-white">{outOfStockItems.length} articles épuisés</strong>). Pensez à planifier un réapprovisionnement matériel.
          </p>
        </div>
      )}

      {/* Primary list space */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Catalogue de l'Inventaire
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Consultez les quantités disponibles, la valeur d'achat globale et le statut d'approvisionnement
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                id="search-inventory"
                type="text"
                placeholder="Rechercher un article..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 w-full sm:w-[200px]"
              />
            </div>

            <button
              id="btn-toggle-add-stock-item"
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouvel Article
            </button>
          </div>
        </div>

        {/* Rapid inline registration of a stock item */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-slate-800/80 bg-slate-950/20"
            >
              <form onSubmit={handleSubmitItem} className="py-5 space-y-4">
                <div className="flex items-center gap-1 text-xs font-bold text-indigo-400 mb-1">
                  <Sparkles className="w-4 h-4" />
                  Ajouter un nouvel article directement au catalogue matériel :
                </div>

                {error && (
                  <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="inventaire-rapid-fields">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Nom de l'article / Produit</label>
                    <input
                      id="input-add-inv-name"
                      type="text"
                      required
                      placeholder="Ex : Papier A4 Ram Double A"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Quantité Initiale</label>
                    <input
                      id="input-add-inv-qty"
                      type="number"
                      required
                      min="0"
                      placeholder="Ex : 25"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Unité de Mesure</label>
                    <select
                      id="input-add-inv-unite"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      value={unite}
                      onChange={(e) => setUnite(e.target.value)}
                    >
                      <option value="pièce">Pièce (U)</option>
                      <option value="kg">Kilogramme (kg)</option>
                      <option value="litre">Litre (L)</option>
                      <option value="paquet">Paquet / Ram</option>
                      <option value="sac">Sac / Cartouche</option>
                      <option value="boîte">Boîte / Carton</option>
                      <option value="none">Aucune unité (Quantité brute)</option>
                      <option value="custom">Autre (Saisir...)</option>
                    </select>
                    {unite === 'custom' && (
                      <input
                        id="input-add-inv-custom-unite"
                        type="text"
                        required
                        placeholder="Ex : Litre, Douzaine"
                        className="w-full mt-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                        value={customUnite}
                        onChange={(e) => setCustomUnite(e.target.value)}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Valeur Unitaire d'achat (F CFA)</label>
                    <input
                      id="input-add-inv-price"
                      type="number"
                      required
                      min="0"
                      placeholder="Ex : 3500"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all text-xs font-semibold cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    id="btn-confirm-add-inv"
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {loading ? 'Enregistrement...' : 'Confirmer l\'ajout'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inventory articles lists */}
        <div className="mt-4">
          <table className="min-w-full divide-y divide-slate-800/50">
            <thead>
              <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pt-2">Désignation</th>
                <th className="pb-3 pt-2">Prix unitaire d'achat</th>
                <th className="pb-3 pt-2 text-center">Quantité</th>
                <th className="pb-3 pt-2 text-right">Valeur totale en stock</th>
                <th className="pb-3 pt-2 text-right">Régler stockage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10" id="empty-stock-trigger">
                    <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Aucun article enregistré dans l'inventaire.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const itemValue = item.quantite_disponible * item.valeur_unitaire;
                  const isLow = item.quantite_disponible <= 5;
                  const isOut = item.quantite_disponible === 0;

                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-slate-950/20 group transition-all text-xs"
                      id={`inventory-row-${item.id}`}
                    >
                      <td className="py-4">
                        <span className="font-semibold text-slate-100">{item.nom_article}</span>
                        {isOut ? (
                          <span className="ml-2 inline-flex items-center gap-0.5 px-2 py-0.2 bg-red-600/10 border border-red-500/20 text-red-400 rounded text-[9px] font-bold uppercase">
                            Rupture
                          </span>
                        ) : isLow ? (
                          <span className="ml-2 inline-flex items-center gap-0.5 px-2 py-0.2 bg-amber-600/10 border border-amber-500/20 text-amber-400 rounded text-[9px] font-bold uppercase">
                            Stock Bas
                          </span>
                        ) : (
                          <span className="ml-2 inline-flex items-center gap-0.5 px-2 py-0.2 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-bold uppercase">
                            Disponible
                          </span>
                        )}
                      </td>
                      <td className="py-4 font-mono font-medium text-slate-300">
                        {formatCFA(item.valeur_unitaire)}
                      </td>
                      <td className="py-4 text-center">
                        {editingId === item.id ? (
                          <div className="flex items-center justify-center gap-1.5 max-w-[120px] mx-auto">
                            <input
                              type="number"
                              min="0"
                              className="w-14 px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                              value={editingQty}
                              onChange={(e) => setEditingQty(e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateQtySubmit(item.id)}
                              className="p-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-all cursor-pointer"
                              title="Enregistrer"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 transition-all cursor-pointer text-xs"
                              title="Annuler"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className={`font-mono font-bold ${
                            isOut ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-slate-100'
                          }`}>
                            {item.quantite_disponible}{item.unite ? ` ${item.unite}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right font-mono font-bold text-slate-100">
                        {formatCFA(itemValue)}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditingQty(item.quantite_disponible.toString());
                            }}
                            className="p-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700/80 active:bg-slate-900 border border-slate-700/40 text-slate-300 hover:text-white transition-all text-[10px] font-semibold inline-flex items-center gap-1.5 cursor-pointer opacity-80 group-hover:opacity-100"
                          >
                            <Edit2 className="w-3 h-3" />
                            Ajuster Qté
                          </button>

                          <button
                            type="button"
                            onClick={() => setItemToDelete({ id: item.id, name: item.nom_article })}
                            className="p-1 px-2.5 rounded bg-red-500/10 hover:bg-rose-600/20 active:bg-rose-750 border border-red-500/20 hover:border-red-500 text-red-400 font-semibold inline-flex items-center gap-1.5 cursor-pointer opacity-80 group-hover:opacity-100 transition-all text-[10px]"
                            title="Supprimer l'article définitivement"
                          >
                            <Trash2 className="w-3 h-3" />
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Custom Confirmation Modal for Deletion to prevent iframe issues */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Supprimer l'élément ?</h4>
              </div>
              
              <p className="text-xs text-slate-300 leading-relaxed">
                Êtes-vous certain de vouloir supprimer l'équipement <strong className="text-white">"{itemToDelete.name}"</strong> de l'inventaire ? 
                Cette action retirera cet article de l'inventaire définitivement.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-705 text-slate-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const idToDel = itemToDelete.id;
                    setItemToDelete(null);
                    await handleDeleteItem(idToDel);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Confirmer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
