import { useState, useEffect } from 'react';
import { Transaction, UserProfile } from '../types';
import { DbService } from '../services/dbService';
import {
  FileDown,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Banknote,
  Filter,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// On déclare ces variables pour éviter les erreurs TypeScript car elles viennent du HTML
declare global {
  interface Window {
    XLSX: any;
    jspdf: any;
  }
}

interface RapportFinancierProps {
  user: UserProfile;
}

export default function RapportFinancier({ user }: RapportFinancierProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'entrée' | 'sortie'>('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await DbService.getTransactions();
      setTransactions(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: `Erreur : ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const formatCFA = (val: number) =>
    new Intl.NumberFormat('fr-BJ', {
      style: 'currency', currency: 'XOF',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(val).replace('XOF', 'F CFA');

  const filtered = transactions.filter(tx => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    const q = search.toLowerCase();
    if (q && !(tx.description?.toLowerCase().includes(q))) return false;
    return true;
  });

  const totalEntrees = filtered.filter(t => t.type === 'entrée').reduce((s, t) => s + t.montant, 0);
  const totalSorties = filtered.filter(t => t.type === 'sortie').reduce((s, t) => s + t.montant, 0);
  const solde = totalEntrees - totalSorties;

  // ── LOGIQUE EXPORT EXCEL (SANS TERMINAL) ──
  const exportExcel = () => {
    if (filtered.length === 0) return;
    try {
      const XLSX = window.XLSX;
      const wb = XLSX.utils.book_new();
      const headers = [['Date', 'Type', 'Description', 'Montant (FCFA)', 'Mode']];
      const data = filtered.map(tx => [
        new Date(tx.date_transaction).toLocaleDateString('fr-FR'),
        tx.type.toUpperCase(),
        tx.description,
        tx.montant,
        tx.mode_paiement
      ]);
      const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
      XLSX.utils.book_append_sheet(wb, ws, "Rapport");
      XLSX.writeFile(wb, `Rapport_Finance.xlsx`);
      setMessage({ type: 'success', text: "Excel généré." });
    } catch (e) {
      setMessage({ type: 'error', text: "Erreur Excel. Vérifiez index.html" });
    }
  };

  // ── LOGIQUE EXPORT PDF (SANS TERMINAL) ──
  const exportPDF = () => {
    if (filtered.length === 0) return;
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text("RAPPORT FINANCIER", 14, 20);
      
      const body = filtered.map(tx => [
        new Date(tx.date_transaction).toLocaleDateString('fr-FR'),
        tx.type,
        tx.description,
        formatCFA(tx.montant)
      ]);

      (doc as any).autoTable({
        startY: 30,
        head: [['Date', 'Type', 'Description', 'Montant']],
        body: body,
      });

      doc.save(`Rapport_Finance.pdf`);
      setMessage({ type: 'success', text: "PDF généré." });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: "Erreur PDF. Vérifiez index.html" });
    }
  };

  return (
    <div className="space-y-8 pb-12 p-4">
      {/* Notifications */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`fixed bottom-8 right-8 z-[100] p-4 rounded-2xl shadow-2xl bg-white border flex items-center gap-3 ${message.type === 'success' ? 'border-emerald-100 text-emerald-800' : 'border-rose-100 text-rose-800'}`}>
            <span className="text-sm font-bold">{message.text}</span>
            <button onClick={() => setMessage(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Rapports Financiers</h1>
            <p className="text-[13px] text-slate-500 font-medium">Analyse et Exports (CDN Mode)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-[13px] font-bold hover:bg-emerald-100 transition-all">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[13px] font-bold shadow-lg hover:bg-blue-700 transition-all">
            <FileDown className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <TrendingUp className="w-5 h-5 text-emerald-600 mb-2" />
          <h3 className="text-2xl font-bold text-slate-800 font-mono">{formatCFA(totalEntrees)}</h3>
          <p className="text-[13px] text-slate-500">Total Entrées</p>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <TrendingDown className="w-5 h-5 text-rose-600 mb-2" />
          <h3 className="text-2xl font-bold text-slate-800 font-mono">{formatCFA(totalSorties)}</h3>
          <p className="text-[13px] text-slate-500">Total Sorties</p>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <Banknote className="w-5 h-5 text-blue-600 mb-2" />
          <h3 className="text-2xl font-bold text-slate-800 font-mono">{formatCFA(solde)}</h3>
          <p className="text-[13px] text-slate-500">Solde Net</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase">Date</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase">Type</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase text-right">Montant</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600">{new Date(tx.date_transaction).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${tx.type === 'entrée' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{tx.type}</span>
                  </td>
                  <td className={`px-6 py-4 text-right font-bold font-mono text-sm ${tx.type === 'entrée' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'entrée' ? '+' : '-'} {formatCFA(tx.montant)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-800">{tx.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
