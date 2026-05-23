import { useState, useEffect, useRef } from 'react';
import { Transaction, UserProfile } from '../types';
import { DbService } from '../services/dbService';
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  X,
  ChevronDown,
  Download,
  Banknote,
  Tag,
  User,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

interface RapportFinancierProps {
  user: UserProfile;
}

type PeriodFilter = 'all' | 'month' | 'quarter' | 'year' | 'custom';

const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
];

const formatCFA = (val: number) =>
  new Intl.NumberFormat('fr-BJ', {
    style: 'currency', currency: 'XOF',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(val).replace('XOF', 'F CFA');

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${formatDate(iso)} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
};

export default function RapportFinancier({ user }: RapportFinancierProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'entrée' | 'sortie'>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await DbService.getTransactions();
      setTransactions(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: `Erreur chargement : ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  // ── Filtrage ────────────────────────────────────────────────────
  const filtered = transactions.filter(tx => {
    // Type
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

    // Recherche texte
    const q = search.toLowerCase();
    if (q && !(
      tx.description?.toLowerCase().includes(q) ||
      tx.mode_paiement?.toLowerCase().includes(q) ||
      tx.categorie?.toLowerCase().includes(q) ||
      tx.associe_nom?.toLowerCase().includes(q)
    )) return false;

    // Période
    const date = new Date(tx.date_transaction);
    const now = new Date();
    if (periodFilter === 'month') {
      if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false;
    } else if (periodFilter === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      if (Math.floor(date.getMonth() / 3) !== q || date.getFullYear() !== now.getFullYear()) return false;
    } else if (periodFilter === 'year') {
      if (date.getFullYear() !== now.getFullYear()) return false;
    } else if (periodFilter === 'custom') {
      if (customFrom && date < new Date(customFrom)) return false;
      if (customTo && date > new Date(customTo + 'T23:59:59')) return false;
    }

    return true;
  });

  // ── Statistiques ────────────────────────────────────────────────
  const totalEntrees = filtered.filter(t => t.type === 'entrée').reduce((s, t) => s + t.montant, 0);
  const totalSorties = filtered.filter(t => t.type === 'sortie').reduce((s, t) => s + t.montant, 0);
  const solde = totalEntrees - totalSorties;

  // ── Libellé période ─────────────────────────────────────────────
  const getPeriodLabel = () => {
    const now = new Date();
    if (periodFilter === 'month') return `${MONTHS_FR[now.getMonth()]} ${now.getFullYear()}`;
    if (periodFilter === 'quarter') return `T${Math.floor(now.getMonth()/3)+1} ${now.getFullYear()}`;
    if (periodFilter === 'year') return `Année ${now.getFullYear()}`;
    if (periodFilter === 'custom' && customFrom && customTo) return `${formatDate(customFrom)} → ${formatDate(customTo)}`;
    return 'Toutes les périodes';
  };

  // ── Export Excel ─────────────────────────────────────────────────
  const exportExcel = async () => {
    setExporting('excel');
    try {
      const wb = XLSX.utils.book_new();

      // Feuille 1 : Transactions détaillées
      const headers = ['Date', 'Type', 'Montant (F CFA)', 'Description', 'Mode de paiement', 'Catégorie', 'Associé', 'Preuve/Reçu'];
      const rows = filtered.map(tx => [
        formatDateTime(tx.date_transaction),
        tx.type === 'entrée' ? 'Entrée (+)' : 'Sortie (-)',
        tx.montant,
        tx.description || '',
        tx.mode_paiement || '',
        tx.categorie || '',
        tx.associe_nom || '',
        tx.preuve_url || '',
      ]);

      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Largeurs colonnes
      ws['!cols'] = [
        { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 40 },
        { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 40 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

      // Feuille 2 : Résumé
      const wsSummary = XLSX.utils.aoa_to_sheet([
        ['RAPPORT FINANCIER — COMPTA & INVENTAIRE'],
        ['Période', getPeriodLabel()],
        ['Généré le', formatDateTime(new Date().toISOString())],
        ['Généré par', user.email],
        [],
        ['RÉSUMÉ'],
        ['Total Entrées (F CFA)', totalEntrees],
        ['Total Sorties (F CFA)', totalSorties],
        ['Solde Net (F CFA)', solde],
        ['Nombre d\'opérations', filtered.length],
        ['Dont Entrées', filtered.filter(t => t.type === 'entrée').length],
        ['Dont Sorties', filtered.filter(t => t.type === 'sortie').length],
      ]);
      wsSummary['!cols'] = [{ wch: 30 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

      const fileName = `rapport_financier_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setMessage({ type: 'success', text: '✅ Fichier Excel téléchargé avec succès.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Erreur export Excel : ${err.message}` });
    } finally {
      setExporting(null);
    }
  };

  // ── Export PDF ────────────────────────────────────────────────────
  const exportPDF = async () => {
    setExporting('pdf');
    try {
      // Import dynamique jsPDF + autoTable
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const now = new Date();
      const pageW = doc.internal.pageSize.getWidth();

      // ── En-tête ──
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('RAPPORT FINANCIER', 14, 11);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Compta & Inventaire — Bénin', 14, 17);
      doc.text(`Période : ${getPeriodLabel()}`, 14, 23);
      doc.text(`Généré le ${formatDateTime(now.toISOString())} par ${user.email}`, pageW - 14, 23, { align: 'right' });

      // ── Cartes résumé ──
      const cards = [
        { label: 'TOTAL ENTRÉES', value: formatCFA(totalEntrees), color: [16, 185, 129] as [number,number,number] },
        { label: 'TOTAL SORTIES', value: formatCFA(totalSorties), color: [239, 68, 68] as [number,number,number] },
        { label: 'SOLDE NET', value: formatCFA(solde), color: solde >= 0 ? [59, 130, 246] as [number,number,number] : [239, 68, 68] as [number,number,number] },
        { label: 'OPÉRATIONS', value: `${filtered.length}`, color: [139, 92, 246] as [number,number,number] },
      ];

      const cardW = (pageW - 28 - 9) / 4;
      cards.forEach((card, i) => {
        const x = 14 + i * (cardW + 3);
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(x, 33, cardW, 18, 2, 2, 'F');
        doc.setDrawColor(...card.color);
        doc.setLineWidth(0.5);
        doc.line(x + 2, 33, x + 2, 51);
        doc.setTextColor(...card.color);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(card.label, x + 6, 40);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(card.value, x + 6, 47);
      });

      // ── Tableau ──
      autoTable(doc, {
        startY: 57,
        head: [['Date', 'Type', 'Montant', 'Description', 'Mode paiement', 'Catégorie', 'Associé', 'Reçu']],
        body: filtered.map(tx => [
          formatDateTime(tx.date_transaction),
          tx.type === 'entrée' ? '▲ Entrée' : '▼ Sortie',
          formatCFA(tx.montant),
          tx.description || '—',
          tx.mode_paiement || '—',
          tx.categorie || '—',
          tx.associe_nom || '—',
          tx.preuve_url ? 'Oui ✓' : '—',
        ]),
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          textColor: [226, 232, 240],
          fillColor: [15, 23, 42],
          lineColor: [30, 41, 59],
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [148, 163, 184],
          fontStyle: 'bold',
          fontSize: 7,
        },
        alternateRowStyles: { fillColor: [20, 30, 50] },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 18 },
          2: { cellWidth: 28, halign: 'right' },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 28 },
          5: { cellWidth: 24 },
          6: { cellWidth: 24 },
          7: { cellWidth: 14, halign: 'center' },
        },
        didParseCell: (data) => {
          if (data.column.index === 1 && data.section === 'body') {
            const isEntree = (data.cell.raw as string).includes('Entrée');
            data.cell.styles.textColor = isEntree ? [16, 185, 129] : [239, 68, 68];
          }
          if (data.column.index === 2 && data.section === 'body') {
            const tx = filtered[data.row.index];
            if (tx) data.cell.styles.textColor = tx.type === 'entrée' ? [16, 185, 129] : [239, 68, 68];
          }
        },
        // Pied de page
        didDrawPage: (data) => {
          const pageH = doc.internal.pageSize.getHeight();
          doc.setFillColor(15, 23, 42);
          doc.rect(0, pageH - 10, pageW, 10, 'F');
          doc.setTextColor(71, 85, 105);
          doc.setFontSize(7);
          doc.text(
            `Compta & Inventaire • Document confidentiel • Page ${data.pageNumber}`,
            pageW / 2, pageH - 4, { align: 'center' }
          );
        },
        margin: { left: 14, right: 14 },
      });

      const fileName = `rapport_financier_${now.toISOString().slice(0,10)}.pdf`;
      doc.save(fileName);
      setMessage({ type: 'success', text: '✅ Fichier PDF téléchargé avec succès.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Erreur export PDF : ${err.message}. Installez jspdf et jspdf-autotable.` });
    } finally {
      setExporting(null);
    }
  };

  // ── Rendu ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">

      {/* Toast */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium ${
              message.type === 'success'
                ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                : 'bg-red-950 border-red-700 text-red-300'
            }`}
          >
            {message.text}
            <button onClick={() => setMessage(null)}><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* En-tête page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" />
            Rapport Financier
          </h1>
          <p className="text-slate-400 text-sm mt-1">{getPeriodLabel()} · {filtered.length} opération{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>

          <button
            onClick={exportExcel}
            disabled={!!exporting || filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors shadow-lg shadow-emerald-900/30"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exporting === 'excel' ? 'Export...' : 'Excel'}
          </button>

          <button
            onClick={exportPDF}
            disabled={!!exporting || filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-900/30"
          >
            <FileDown className="w-4 h-4" />
            {exporting === 'pdf' ? 'Export...' : 'PDF'}
          </button>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: 'Total Entrées',
            value: formatCFA(totalEntrees),
            count: `${filtered.filter(t => t.type === 'entrée').length} opérations`,
            icon: <TrendingUp className="w-5 h-5" />,
            color: 'emerald',
          },
          {
            label: 'Total Sorties',
            value: formatCFA(totalSorties),
            count: `${filtered.filter(t => t.type === 'sortie').length} opérations`,
            icon: <TrendingDown className="w-5 h-5" />,
            color: 'rose',
          },
          {
            label: 'Solde Net',
            value: formatCFA(solde),
            count: solde >= 0 ? 'Bénéfice' : 'Déficit',
            icon: <Banknote className="w-5 h-5" />,
            color: solde >= 0 ? 'blue' : 'rose',
          },
          {
            label: 'Opérations',
            value: filtered.length.toString(),
            count: 'au total',
            icon: <Receipt className="w-5 h-5" />,
            color: 'violet',
          },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden`}
          >
            <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl bg-${card.color}-500`} />
            <div className={`text-${card.color}-400 mb-2`}>{card.icon}</div>
            <p className="text-slate-400 text-xs mb-1">{card.label}</p>
            <p className={`text-${card.color}-400 font-bold text-lg leading-tight`}>{card.value}</p>
            <p className="text-slate-500 text-xs mt-1">{card.count}</p>
          </motion.div>
        ))}
      </div>

      {/* Barre de filtres */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Recherche */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher description, catégorie, associé..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Type */}
          <div className="flex gap-2">
            {(['all', 'entrée', 'sortie'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  typeFilter === t
                    ? t === 'all' ? 'bg-slate-700 border-slate-600 text-white'
                      : t === 'entrée' ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-rose-600 border-rose-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'all' ? 'Tout' : t === 'entrée' ? '▲ Entrées' : '▼ Sorties'}
              </button>
            ))}
          </div>

          {/* Période */}
          <div className="flex gap-2 flex-wrap">
            {([
              { key: 'all', label: 'Tout' },
              { key: 'month', label: 'Ce mois' },
              { key: 'quarter', label: 'Trimestre' },
              { key: 'year', label: 'Cette année' },
              { key: 'custom', label: 'Personnalisé' },
            ] as { key: PeriodFilter; label: string }[]).map(p => (
              <button
                key={p.key}
                onClick={() => setPeriodFilter(p.key)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors border ${
                  periodFilter === p.key
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dates personnalisées */}
        <AnimatePresence>
          {periodFilter === 'custom' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-3 mt-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-slate-400 text-sm">Du</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-slate-400 text-sm">Au</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={e => setCustomTo(e.target.value)}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tableau */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mr-3" />
            Chargement des transactions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <FileText className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Aucune opération trouvée pour ces filtres.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />Date
                  </th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Type</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                    <Banknote className="w-3.5 h-3.5 inline mr-1" />Montant
                  </th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Description</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Mode paiement</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">
                    <Tag className="w-3.5 h-3.5 inline mr-1" />Catégorie
                  </th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">
                    <User className="w-3.5 h-3.5 inline mr-1" />Associé
                  </th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Reçu</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx, idx) => (
                  <motion.tr
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(idx * 0.01, 0.3) }}
                    className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap text-xs">
                      {formatDateTime(tx.date_transaction)}
                    </td>
                    <td className="px-4 py-3">
                      {tx.type === 'entrée' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                          <ArrowUpRight className="w-3 h-3" />Entrée
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                          <ArrowDownRight className="w-3 h-3" />Sortie
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      tx.type === 'entrée' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {tx.type === 'entrée' ? '+' : '-'}{formatCFA(tx.montant)}
                    </td>
                    <td className="px-4 py-3 text-slate-200 max-w-xs">
                      <span className="line-clamp-2">{tx.description || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap text-xs">
                      {tx.mode_paiement || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {tx.categorie ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs">
                          {tx.categorie}
                        </span>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">
                      {tx.associe_nom || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tx.preuve_url ? (
                        <a
                          href={tx.preuve_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/20 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />Voir
                        </a>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>

              {/* Ligne totaux */}
              <tfoot>
                <tr className="bg-slate-950 border-t-2 border-slate-700">
                  <td colSpan={2} className="px-4 py-3 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    TOTAUX ({filtered.length} opérations)
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-emerald-400 text-xs font-semibold">+{formatCFA(totalEntrees)}</div>
                    <div className="text-rose-400 text-xs font-semibold">-{formatCFA(totalSorties)}</div>
                    <div className={`text-sm font-bold mt-1 ${solde >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                      = {formatCFA(solde)}
                    </div>
                  </td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Note installation */}
      <p className="text-center text-slate-600 text-xs mt-4">
        Export PDF nécessite : <code className="bg-slate-800 px-1 rounded">npm install jspdf jspdf-autotable</code>
      </p>
    </div>
  );
}
