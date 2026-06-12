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
  X,
  Trash2,
  Check,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InventaireProps {
  items: InventaireItem[];
  onAddNewItem: (item: InventaireItem) => void;
  onRefresh: () => void;
  user: UserProfile;
}

export default function Inventaire({ items, onAddNewItem, onRefresh, user }: InventaireProps) {
  // Logic preserved 100%
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [unite, setUnite] = useState('pièce');
  const [customUnite, setCustomUnite] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState('');
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCFA = (val: number) => {
    return new Intl.NumberFormat('fr-BJ', {
      style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(val).replace('XOF', 'F CFA');
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const qtyNum = parseInt(qty);
    const priceNum = parseFloat(price);
    if (!name.trim() || isNaN(qtyNum) || isNaN(priceNum)) {
      setError('Veuillez remplir correctement tous les champs.');
      return;
    }
    setLoading(true);
    try {
      const added = await DbService.addInventaireItem({
        nom_article: name.trim(),
        quantite_disponible: qtyNum,
        valeur_unitaire: priceNum,
        unite: unite === 'custom' ? customUnite.trim() : (unite === 'none' ? '' : unite)
      });
      onAddNewItem(added);
      setName(''); setQty(''); setPrice(''); setUnite('pièce'); setShowAddForm(false);
      onRefresh();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleUpdateQtySubmit = async (id: string) => {
    const q = parseInt(editingQty);
    if (isNaN(q) || q < 0) return;
    try {
      await DbService.updateInventaireQty(id, q);
      setEditingId(null);
      onRefresh();
    } catch (err) { console.error(err); }
  };

  const handleDeleteItem = async (id: string) => {
    setLoading(true);
    try {
      await DbService.deleteInventaireItem(id);
      onRefresh();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const filteredItems = items.filter(item => item.nom_article.toLowerCase().includes(searchQuery.toLowerCase()));
  const lowStockItems = items.filter(item => item.quantite_disponible <= 5 && item.quantite_disponible > 0);
  const outOfStockItems = items.filter(item => item.quantite_disponible === 0);
  const totalValeurStock = items.reduce((sum, item) => sum + (item.quantite_disponible * Number(item.valeur_unitaire)), 0);

  return (
    <div className="space-y-8">
      
      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Références Catalogue', val: `${items.length} articles`, icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Alertes Stock Bas', val: `${lowStockItems.length + outOfStockItems.length} articles`, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', sub: 'Action requise' },
          { label: 'Valeur du Stock', val: formatCFA(totalValeurStock), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2.5 ${stat.bg} rounded-xl`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              {stat.sub && <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-100/50 px-2 py-0.5 rounded-full">{stat.sub}</span>}
            </div>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight font-mono">{stat.val}</h3>
            <p className="text-[13px] font-semibold text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Critical Stock Alert Banner */}
      <AnimatePresence>
        {outOfStockItems.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 p-4 bg-red-50 border border-red-100 rounded-2xl">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-red-800 uppercase tracking-tight">Rupture de stock détectée</p>
              <p className="text-[13px] text-red-700/80 font-medium">{outOfStockItems.length} articles sont épuisés. Planifiez un réapprovisionnement.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Catalog Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        
        {/* Table Header / Actions */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Catalogue de l'Inventaire</h3>
            <p className="text-[13px] text-slate-500 font-medium">Gestion des actifs et matériel d'exploitation</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/5 focus:border-blue-600 transition-all w-64"
              />
            </div>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[13px] font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Nouvel Article
            </button>
          </div>
        </div>

        {/* Inline Add Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-slate-50/80 border-b border-slate-100">
              <form onSubmit={handleSubmitItem} className="p-8 space-y-6">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">Enregistrement Rapide</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Désignation</label>
                    <input type="text" required placeholder="Ex: Mac Studio M2" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Quantité</label>
                    <input type="number" required value={qty} onChange={(e) => setQty(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Unité</label>
                    <select value={unite} onChange={(e) => setUnite(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm appearance-none">
                      <option value="pièce">Pièce (U)</option>
                      <option value="paquet">Paquet</option>
                      <option value="litre">Litre</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Prix Unit. (F CFA)</label>
                    <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200/50 pt-6">
                  <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Annuler</button>
                  <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-100">Confirmer l'ajout</button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30 border-b border-slate-100">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Désignation</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Prix Unit.</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Quantité</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Valeur Stock</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredItems.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">Aucun article trouvé dans l'inventaire.</td></tr>
              ) : (
                filteredItems.map((item) => {
                  const isOut = item.quantite_disponible === 0;
                  const isLow = item.quantite_disponible <= 5 && !isOut;
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOut ? 'bg-red-50 text-red-600' : isLow ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-slate-800">{item.nom_article}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight ${
                              isOut ? 'bg-red-100 text-red-700' : isLow ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {isOut ? 'Rupture' : isLow ? 'Stock Bas' : 'Disponible'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-mono text-xs font-bold text-slate-500">
                        {formatCFA(item.valeur_unitaire)}
                      </td>
                      <td className="px-6 py-5 text-center">
                        {editingId === item.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <input 
                              type="number" value={editingQty} onChange={(e) => setEditingQty(e.target.value)}
                              className="w-16 bg-white border border-blue-600 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none" 
                            />
                            <button onClick={() => handleUpdateQtySubmit(item.id)} className="p-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"><Check className="w-3 h-3" /></button>
                            <button onClick={() => setEditingId(null)} className="p-1 bg-slate-200 text-slate-600 rounded-md"><X className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <span className={`text-sm font-bold font-mono ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-800'}`}>
                            {item.quantite_disponible} <span className="text-[10px] font-semibold text-slate-400">{item.unite || 'U'}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right font-mono font-bold text-slate-800 text-[13px]">
                        {formatCFA(item.quantite_disponible * item.valeur_unitaire)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setEditingId(item.id); setEditingQty(item.quantite_disponible.toString()); }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setItemToDelete({ id: item.id, name: item.nom_article })}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Confirmation Modal Section */}
      <AnimatePresence>
        {itemToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Supprimer l'article ?</h4>
              <p className="text-[13px] text-slate-500 font-medium mb-8">
                Voulez-vous vraiment retirer <span className="font-bold text-slate-800">"{itemToDelete.name}"</span> du catalogue ? Cette action est irréversible.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setItemToDelete(null)} className="flex-1 py-2.5 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Annuler</button>
                <button 
                  onClick={async () => {
                    const id = itemToDelete.id;
                    setItemToDelete(null);
                    await handleDeleteItem(id);
                  }}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-100 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
