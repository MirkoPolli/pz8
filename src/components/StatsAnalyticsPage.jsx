import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  Users,
  Wallet,
  CreditCard,
  BarChart3,
  PieChart,
  Coins,
  Calendar,
  AlertTriangle,
  Award
} from 'lucide-react';
import {
  formatDateItalian,
  getTodayDateString,
  isExpired,
  isExpiringSoon
} from '../utils/dateUtils';

const MONTH_LABELS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

function parseYmd(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return { year: parts[0], month: parts[1] - 1, day: parts[2] };
}

export default function StatsAnalyticsPage({
  clients = [],
  creditData = {},
  isAdmin = true,
  tokenCost = 3,
  onBack,
  onJumpToFilter,
  onOpenCreditModal
}) {
  const [chartMetric, setChartMetric] = useState('revenue'); // 'revenue' | 'count'
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);

  const unitCost = Number(tokenCost) || 0;
  const todayItalian = formatDateItalian(getTodayDateString());

  const analytics = useMemo(() => {
    const activeClients = clients.filter(c => c.isActive);
    const inactiveClients = clients.filter(c => !c.isActive);

    const monthlyGross = activeClients.reduce((sum, c) => sum + (Number(c.monthlyCost) || 0), 0);
    const monthlyTokenCost = activeClients.length * unitCost;
    const monthlyNet = monthlyGross - monthlyTokenCost;
    const marginPct = monthlyGross > 0 ? Math.round((monthlyNet / monthlyGross) * 100) : 0;

    const arpu = activeClients.length > 0 ? monthlyGross / activeClients.length : 0;
    const netPerAccount = activeClients.length > 0 ? monthlyNet / activeClients.length : 0;
    const activeRate = clients.length > 0 ? Math.round((activeClients.length / clients.length) * 100) : 0;

    // Pagamenti / Debitori
    const unpaidClients = clients.filter(c => c.paymentStatus === 'unpaid' && Number(c.amountDue) > 0);
    const totalAmountDue = unpaidClients.reduce((sum, c) => sum + (Number(c.amountDue) || 0), 0);
    const paidRate = clients.length > 0 ? Math.round(((clients.length - unpaidClients.length) / clients.length) * 100) : 100;

    const debtorKeys = new Set();
    unpaidClients.forEach(c => {
      const rawName = (c.contactName || '').trim().toLowerCase();
      const rawPhone = (c.phone || '').trim();
      debtorKeys.add(rawName || rawPhone || (c.user || '').toLowerCase());
    });
    const uniqueDebtorsCount = debtorKeys.size;

    // Stato parco account (4 segmenti mutamente esclusivi)
    let okActiveCount = 0;
    let expiringCount = 0;
    let expiredActiveCount = 0;
    activeClients.forEach(c => {
      if (isExpired(c.expirationDate)) {
        expiredActiveCount++;
      } else if (isExpiringSoon(c.expirationDate, 3)) {
        expiringCount++;
      } else {
        okActiveCount++;
      }
    });

    // Proiezione scadenze e valore rinnovi prossimi 6 mesi
    const now = new Date();
    const baseYear = now.getFullYear();
    const baseMonth = now.getMonth();
    const monthsProjection = [];
    const monthIndexMap = new Map();

    for (let i = 0; i < 6; i++) {
      const d = new Date(baseYear, baseMonth + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${m}`;
      monthIndexMap.set(key, i);
      monthsProjection.push({
        key,
        label: `${MONTH_LABELS_IT[m]} ${String(y).slice(-2)}`,
        shortLabel: MONTH_LABELS_IT[m],
        count: 0,
        gross: 0,
        net: 0
      });
    }

    let beyond6MonthsCount = 0;
    activeClients.forEach(c => {
      if (!c.expirationDate || isExpired(c.expirationDate)) return;
      const parsed = parseYmd(c.expirationDate);
      if (!parsed) return;
      const key = `${parsed.year}-${parsed.month}`;
      const idx = monthIndexMap.get(key);
      if (idx !== undefined) {
        const price = Number(c.monthlyCost) || 0;
        monthsProjection[idx].count += 1;
        monthsProjection[idx].gross += price;
        monthsProjection[idx].net += price - unitCost;
      } else {
        const expMonthVal = parsed.year * 12 + parsed.month;
        const lastSlotDate = new Date(baseYear, baseMonth + 5, 1);
        const lastSlotVal = lastSlotDate.getFullYear() * 12 + lastSlotDate.getMonth();
        if (expMonthVal > lastSlotVal) {
          beyond6MonthsCount++;
        }
      }
    });

    // Distribuzione per fascia di prezzo mensile
    const priceBucketsMap = new Map();
    activeClients.forEach(c => {
      const price = Number(c.monthlyCost) || 0;
      priceBucketsMap.set(price, (priceBucketsMap.get(price) || 0) + 1);
    });
    const priceBuckets = Array.from(priceBucketsMap.entries())
      .map(([price, count]) => ({
        price,
        count,
        pct: activeClients.length > 0 ? Math.round((count / activeClients.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count || b.price - a.price);

    // Top 8 referenti / persone per fatturato mensile lordo
    const referentsMap = new Map();
    activeClients.forEach(c => {
      const rawName = (c.contactName || '').trim();
      const rawPhone = (c.phone || '').trim();
      const key = rawName ? rawName.toLowerCase() : (rawPhone || (c.user || '').toLowerCase());
      const displayName = rawName || c.user || 'N/D';
      if (!referentsMap.has(key)) {
        referentsMap.set(key, {
          key,
          name: displayName,
          count: 0,
          gross: 0,
          net: 0
        });
      }
      const ref = referentsMap.get(key);
      const price = Number(c.monthlyCost) || 0;
      ref.count += 1;
      ref.gross += price;
      ref.net += price - unitCost;
    });
    const topReferents = Array.from(referentsMap.values())
      .sort((a, b) => b.gross - a.gross || b.count - a.count)
      .slice(0, 8);

    // Storico consumo crediti ultimi 6 mesi (solo Admin)
    const creditsHistoryMonths = [];
    const creditsMap = new Map();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(baseYear, baseMonth - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const entry = {
        key,
        label: MONTH_LABELS_IT[d.getMonth()],
        used: 0
      };
      creditsMap.set(key, entry);
      creditsHistoryMonths.push(entry);
    }

    const historyList = Array.isArray(creditData?.history) ? creditData.history : [];
    let totalHistoricalCreditsUsed = 0;
    historyList.forEach(tx => {
      if (tx?.type !== 'usage') return;
      const amount = Number(tx.amount) || 0;
      totalHistoricalCreditsUsed += amount;
      if (!tx.timestamp) return;
      const d = new Date(tx.timestamp);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = creditsMap.get(key);
      if (bucket) {
        bucket.used += amount;
      }
    });

    const creditsBalance = Number(creditData?.creditsBalance) || 0;
    const autonomyMonths = activeClients.length > 0
      ? (creditsBalance / activeClients.length).toFixed(1)
      : '∞';

    return {
      totalClients: clients.length,
      activeClients,
      inactiveClients,
      monthlyGross,
      monthlyTokenCost,
      monthlyNet,
      marginPct,
      arpu,
      netPerAccount,
      activeRate,
      totalAmountDue,
      paidRate,
      uniqueDebtorsCount,
      okActiveCount,
      expiringCount,
      expiredActiveCount,
      monthsProjection,
      beyond6MonthsCount,
      priceBuckets,
      topReferents,
      creditsHistoryMonths,
      totalHistoricalCreditsUsed,
      creditsBalance,
      autonomyMonths
    };
  }, [clients, creditData, unitCost]);

  // Configurazione grafico principale 6 mesi SVG
  const chartW = 600;
  const chartH = 220;
  const padTop = 26;
  const padBottom = 34;
  const padLeft = 42;
  const padRight = 16;
  const innerW = chartW - padLeft - padRight;
  const innerH = chartH - padTop - padBottom;
  const slotW = innerW / 6;
  const barW = 38;

  const rawValues = analytics.monthsProjection.map(m => (chartMetric === 'revenue' ? m.gross : m.count));
  const maxChartVal = Math.max(...rawValues, 1);

  const chartPoints = analytics.monthsProjection.map((m, idx) => {
    const val = chartMetric === 'revenue' ? m.gross : m.count;
    const barH = (val / maxChartVal) * innerH;
    const x = padLeft + idx * slotW + (slotW - barW) / 2;
    const y = padTop + innerH - barH;
    return {
      ...m,
      idx,
      val,
      barH,
      x,
      y,
      cx: x + barW / 2
    };
  });

  const polylinePoints = chartPoints.map(p => `${p.cx},${p.y}`).join(' ');
  const selectedMonth = chartPoints[selectedMonthIndex] || chartPoints[0];

  // Donut Chart stato parco account
  const donutSegments = [
    { id: 'ok', label: 'Attivi OK (>3gg)', count: analytics.okActiveCount, color: '#00ff9d', filter: 'active' },
    { id: 'expiring', label: 'In Scadenza (≤3gg)', count: analytics.expiringCount, color: '#ffb700', filter: 'expiring' },
    { id: 'expired', label: 'Scaduti (Attivi)', count: analytics.expiredActiveCount, color: '#ff3366', filter: 'expired' },
    { id: 'inactive', label: 'Disattivati (OFF)', count: analytics.inactiveClients.length, color: '#64748b', filter: 'inactive' }
  ];

  const donutRadius = 66;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let cumulativeArc = 0;
  const donutArcs = donutSegments.map(seg => {
    const ratio = analytics.totalClients > 0 ? seg.count / analytics.totalClients : 0;
    const length = ratio * donutCircumference;
    const offset = -cumulativeArc;
    cumulativeArc += length;
    return {
      ...seg,
      pct: analytics.totalClients > 0 ? Math.round(ratio * 100) : 0,
      length,
      offset
    };
  });

  // Composizione economica (Margine vs Costo Token)
  const grossPositive = analytics.monthlyGross > 0;
  const netSharePct = grossPositive
    ? Math.max(0, Math.min(100, Math.round((analytics.monthlyNet / analytics.monthlyGross) * 100)))
    : 0;
  const tokenSharePct = grossPositive ? 100 - netSharePct : 0;

  // Scala mini bar chart crediti
  const maxCreditsUsed = Math.max(...analytics.creditsHistoryMonths.map(m => m.used), 1);
  const topReferentMaxGross = analytics.topReferents[0]?.gross || 1;

  return (
    <div className="space-y-6 font-mono animate-in fade-in duration-200">

      {/* Header Pagina KPI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d121f] border border-[#1b253b] rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#151c2e] hover:bg-[#00ff9d] text-slate-200 hover:text-black border border-[#23314d] font-bold text-xs transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Torna agli Account</span>
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#00f0ff]" />
              <span>Statistiche &amp; KPI</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Aggiornato al {todayItalian} • Dati in tempo reale
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1.5 rounded-xl bg-[#0a0f1c] border border-[#1d2b45] text-xs text-slate-300">
            Costo token: <strong className="text-[#00f0ff]">€{unitCost}</strong>
          </span>
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenCreditModal}
              className="px-3 py-1.5 rounded-xl bg-[#00ff9d]/15 hover:bg-[#00ff9d]/25 border border-[#00ff9d]/40 text-[#00ff9d] text-xs font-bold transition-all"
            >
              Crediti: {analytics.creditsBalance} CR
            </button>
          )}
        </div>
      </div>

      {/* Riga 1: Hero KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Incasso Netto/Mese */}
        <div className="p-4 rounded-2xl bg-[#111726] border border-[#00f0ff]/35 shadow-[0_0_20px_rgba(0,240,255,0.06)] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase">
            <span>Incasso Netto/Mese</span>
            <TrendingUp className="w-4 h-4 text-[#00f0ff]" />
          </div>
          <div className="text-2xl font-bold text-[#00f0ff]">
            €{analytics.monthlyNet.toLocaleString('it-IT')}
          </div>
          <div className="text-[10px] text-slate-400">
            Margine <strong className="text-[#00ff9d]">{analytics.marginPct}%</strong> • €{(analytics.monthlyNet * 12).toLocaleString('it-IT')}/anno
          </div>
          <div className="text-[10px] text-slate-500">
            Lordo €{analytics.monthlyGross} − Token €{analytics.monthlyTokenCost}
          </div>
        </div>

        {/* 2. ARPU & Margine per Account */}
        <div className="p-4 rounded-2xl bg-[#111726] border border-[#1d263b] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase">
            <span>ARPU &amp; Margine/Acc.</span>
            <Wallet className="w-4 h-4 text-[#00ff9d]" />
          </div>
          <div className="text-2xl font-bold text-white">
            €{analytics.arpu.toFixed(2)}<span className="text-xs font-normal text-slate-500">/m</span>
          </div>
          <div className="text-[10px] text-[#00ff9d]">
            Margine netto: <strong>+€{analytics.netPerAccount.toFixed(2)}</strong> / account
          </div>
          <div className="text-[10px] text-slate-500">
            Su {analytics.activeClients.length} account attivi
          </div>
        </div>

        {/* 3. Tasso Attivi (Retention) - Cliccabile -> Attivi */}
        <button
          type="button"
          onClick={() => onJumpToFilter('active')}
          className="text-left p-4 rounded-2xl bg-[#111726] border border-[#1d263b] hover:border-[#00ff9d]/50 hover:bg-[#00ff9d]/[0.04] transition-all space-y-1.5 cursor-pointer"
          title="Vai alla lista Account Attivi"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase">
            <span>Tasso Attivi</span>
            <Users className="w-4 h-4 text-[#00ff9d]" />
          </div>
          <div className="text-2xl font-bold text-[#00ff9d]">
            {analytics.activeRate}%
          </div>
          <div className="text-[10px] text-slate-300">
            <strong>{analytics.activeClients.length}</strong> attivi su {analytics.totalClients} totali
          </div>
          <div className="text-[10px] text-slate-500">
            {analytics.inactiveClients.length} disattivati • Clicca per vedere
          </div>
        </button>

        {/* 4. Salute Pagamenti - Cliccabile -> Da Saldare */}
        <button
          type="button"
          onClick={() => onJumpToFilter('unpaid')}
          className={`text-left p-4 rounded-2xl border transition-all space-y-1.5 cursor-pointer ${
            analytics.totalAmountDue > 0
              ? 'bg-[#140c14] border-[#ff3366]/45 hover:border-[#ff3366]'
              : 'bg-[#111726] border-[#1d263b] hover:border-[#00ff9d]/50'
          }`}
          title="Vai alla scheda Da Saldare"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase">
            <span>Salute Pagamenti</span>
            <CreditCard className={`w-4 h-4 ${analytics.totalAmountDue > 0 ? 'text-[#ff3366]' : 'text-[#00ff9d]'}`} />
          </div>
          <div className={`text-2xl font-bold ${analytics.totalAmountDue > 0 ? 'text-[#ff3366]' : 'text-[#00ff9d]'}`}>
            {analytics.paidRate}%
          </div>
          <div className="text-[10px] text-slate-300">
            {analytics.totalAmountDue > 0 ? (
              <>Da riscuotere: <strong className="text-[#ff6b8b]">€{analytics.totalAmountDue}</strong></>
            ) : (
              <span className="text-[#00ff9d]">Tutti i pagamenti in regola</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500">
            {analytics.uniqueDebtorsCount} {analytics.uniqueDebtorsCount === 1 ? 'debitore' : 'debitori'} • Clicca per gestire
          </div>
        </button>
      </div>

      {/* Riga 2: Grafico Principale SVG - Proiezione Scadenze & Rinnovi Prossimi 6 Mesi */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0d121f] border border-[#1b253b] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#00f0ff]" />
              <span>Proiezione Scadenze &amp; Rinnovi (Prossimi 6 Mesi)</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Distribuzione mensile degli abbonamenti attivi in scadenza (tocca o passa su una barra per i dettagli)
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#080b12] p-1 rounded-xl border border-[#1c263b] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setChartMetric('revenue')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                chartMetric === 'revenue'
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Valore Rinnovi (€)
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('count')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                chartMetric === 'count'
                  ? 'bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Account in scadenza
            </button>
          </div>
        </div>

        {/* Badge extra: già scaduti / oltre 6 mesi */}
        {(analytics.expiredActiveCount > 0 || analytics.beyond6MonthsCount > 0) && (
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            {analytics.expiredActiveCount > 0 && (
              <button
                type="button"
                onClick={() => onJumpToFilter('expired')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ff3366]/15 hover:bg-[#ff3366]/25 border border-[#ff3366]/40 text-[#ff6b8b] font-bold transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{analytics.expiredActiveCount} account attivi già scaduti (vedi tab Scaduti)</span>
              </button>
            )}
            {analytics.beyond6MonthsCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#141d30] border border-[#233559] text-slate-300">
                +{analytics.beyond6MonthsCount} account con scadenza oltre 6 mesi
              </span>
            )}
          </div>
        )}

        {/* Grafico SVG Interattivo */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="w-full h-56 min-w-[360px] select-none"
            role="img"
            aria-label="Grafico proiezione scadenze prossimi 6 mesi"
          >
            <defs>
              <linearGradient id="pz8BarGradCyan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="pz8BarGradGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00ff9d" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#00ff9d" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Griglia orizzontale (4 livelli) */}
            {[0, 0.33, 0.66, 1].map((ratio, i) => {
              const y = padTop + innerH * (1 - ratio);
              const gridVal = Math.round(maxChartVal * ratio);
              return (
                <g key={i}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={chartW - padRight}
                    y2={y}
                    stroke="#1b263d"
                    strokeDasharray={i === 0 ? undefined : '4 4'}
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {chartMetric === 'revenue' ? `€${gridVal}` : gridVal}
                  </text>
                </g>
              );
            })}

            {/* Barre */}
            {chartPoints.map((p) => {
              const isSelected = p.idx === selectedMonthIndex;
              const fillUrl = chartMetric === 'revenue' ? 'url(#pz8BarGradCyan)' : 'url(#pz8BarGradGreen)';
              const accent = chartMetric === 'revenue' ? '#00f0ff' : '#00ff9d';
              return (
                <g
                  key={p.key}
                  className="cursor-pointer"
                  onMouseEnter={() => setSelectedMonthIndex(p.idx)}
                  onClick={() => setSelectedMonthIndex(p.idx)}
                >
                  {/* Area cliccabile ampia */}
                  <rect
                    x={padLeft + p.idx * slotW}
                    y={padTop}
                    width={slotW}
                    height={innerH + padBottom}
                    fill="transparent"
                  />
                  {/* Sfondo selezione colonna */}
                  {isSelected && (
                    <rect
                      x={p.x - 6}
                      y={padTop - 4}
                      width={barW + 12}
                      height={innerH + 8}
                      rx="8"
                      fill={accent}
                      fillOpacity="0.06"
                      stroke={accent}
                      strokeOpacity="0.25"
                    />
                  )}
                  {/* Barra */}
                  <rect
                    x={p.x}
                    y={p.y}
                    width={barW}
                    height={Math.max(p.barH, 2)}
                    rx="6"
                    fill={fillUrl}
                    stroke={isSelected ? accent : 'none'}
                    strokeWidth={isSelected ? '1.5' : '0'}
                  />
                  {/* Etichetta valore sopra la barra */}
                  <text
                    x={p.cx}
                    y={Math.max(p.y - 8, 12)}
                    textAnchor="middle"
                    fill={isSelected ? '#ffffff' : '#cbd5e1'}
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {chartMetric === 'revenue' ? `€${p.val}` : p.val}
                  </text>
                  {/* Etichetta mese */}
                  <text
                    x={p.cx}
                    y={chartH - 10}
                    textAnchor="middle"
                    fill={isSelected ? accent : '#94a3b8'}
                    fontSize="11"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    fontFamily="monospace"
                  >
                    {p.label}
                  </text>
                </g>
              );
            })}

            {/* Linea di trend sovrapposta */}
            <polyline
              fill="none"
              stroke="#ffb700"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylinePoints}
              opacity="0.85"
            />
            {chartPoints.map((p) => (
              <circle
                key={`dot-${p.key}`}
                cx={p.cx}
                cy={p.y}
                r={p.idx === selectedMonthIndex ? 4.5 : 3}
                fill="#0d121f"
                stroke="#ffb700"
                strokeWidth="2"
                className="pointer-events-none"
              />
            ))}
          </svg>
        </div>

        {/* Riepilogo interattivo del mese selezionato */}
        {selectedMonth && (
          <div className="p-3 rounded-xl bg-[#080b12] border border-[#1b253b] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="text-slate-300">
              Mese selezionato: <strong className="text-white">{selectedMonth.label}</strong>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-slate-300">
                Scadenze: <strong className="text-[#00ff9d]">{selectedMonth.count} account</strong>
              </span>
              <span className="text-slate-300">
                Lordo atteso: <strong className="text-[#00f0ff]">€{selectedMonth.gross}</strong>
              </span>
              <span className="text-slate-300">
                Netto stimato: <strong className="text-[#00ff9d]">€{selectedMonth.net}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Riga 3: Donut Stato Parco Account & Composizione Economica / Fasce Prezzo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sinistra: Donut Stato Parco Account */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0d121f] border border-[#1b253b] space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#00ff9d]" />
            <span>Stato Parco Account</span>
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Donut SVG */}
            <div className="relative flex-shrink-0">
              <svg width="170" height="170" viewBox="0 0 180 180" role="img" aria-label="Stato parco account">
                <circle
                  cx="90"
                  cy="90"
                  r={donutRadius}
                  fill="none"
                  stroke="#162035"
                  strokeWidth="20"
                />
                {analytics.totalClients > 0 && donutArcs.map((arc) => (
                  arc.count > 0 && (
                    <circle
                      key={arc.id}
                      cx="90"
                      cy="90"
                      r={donutRadius}
                      fill="none"
                      stroke={arc.color}
                      strokeWidth="20"
                      strokeDasharray={`${arc.length} ${donutCircumference}`}
                      strokeDashoffset={arc.offset}
                      transform="rotate(-90 90 90)"
                    />
                  )
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-white">{analytics.totalClients}</span>
                <span className="text-[10px] text-slate-400 uppercase">Totali</span>
              </div>
            </div>

            {/* Legenda interattiva */}
            <div className="flex-1 w-full space-y-2">
              {donutArcs.map((seg) => (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => onJumpToFilter(seg.filter)}
                  className="w-full p-2.5 rounded-xl bg-[#080b12] hover:bg-[#121a2d] border border-[#192338] flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-slate-200">{seg.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <strong className="text-white">{seg.count}</strong>
                    <span className="text-[10px] text-slate-500 w-9 text-right">{seg.pct}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Destra: Composizione Economica & Fasce di Prezzo */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0d121f] border border-[#1b253b] space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00f0ff]" />
            <span>Composizione Economica &amp; Prezzi</span>
          </h2>

          {/* Barra impilata Margine vs Costo Token */}
          <div className="p-3.5 rounded-xl bg-[#080b12] border border-[#192338] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Lordo mensile: <strong className="text-white">€{analytics.monthlyGross}</strong></span>
              <span className="text-[#00ff9d] font-bold">Margine {analytics.marginPct}%</span>
            </div>

            <div className="w-full h-4 rounded-full bg-[#151e30] overflow-hidden flex">
              <div
                className="bg-[#00ff9d] h-full transition-all"
                style={{ width: `${netSharePct}%` }}
                title={`Margine netto: €${analytics.monthlyNet} (${netSharePct}%)`}
              />
              <div
                className="bg-[#00f0ff] h-full transition-all"
                style={{ width: `${tokenSharePct}%` }}
                title={`Costo token: €${analytics.monthlyTokenCost} (${tokenSharePct}%)`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#00ff9d] inline-block" />
                Netto: <strong className="text-white">€{analytics.monthlyNet}</strong> ({netSharePct}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#00f0ff] inline-block" />
                Token: <strong className="text-white">€{analytics.monthlyTokenCost}</strong> ({tokenSharePct}%)
              </span>
            </div>
          </div>

          {/* Fasce di Prezzo Mensili */}
          <div className="space-y-2">
            <div className="text-[11px] text-slate-400 uppercase font-bold">
              Distribuzione per Prezzo Mensile (Attivi)
            </div>
            {analytics.priceBuckets.length === 0 ? (
              <div className="text-xs text-slate-500 py-3">Nessun account attivo.</div>
            ) : (
              <div className="space-y-1.5">
                {analytics.priceBuckets.map((bucket) => (
                  <div key={bucket.price} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-200 font-bold">€{bucket.price} / mese</span>
                      <span className="text-slate-400">
                        <strong className="text-white">{bucket.count}</strong> account ({bucket.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#151e30] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#00f0ff] to-[#00ff9d]"
                        style={{ width: `${bucket.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Riga 4: Trend Consumo Crediti (solo Admin) & Top Referenti */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2' : ''} gap-4`}>
        {/* Trend Consumo Crediti (Admin Only) */}
        {isAdmin && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0d121f] border border-[#1b253b] space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#ffb700]" />
                <span>Trend Consumo Crediti (6 Mesi)</span>
              </h2>
              <button
                type="button"
                onClick={onOpenCreditModal}
                className="px-2.5 py-1 rounded-lg bg-[#162238] hover:bg-[#00ff9d] text-[#00ff9d] hover:text-black border border-[#00ff9d]/30 text-[11px] font-bold transition-all"
              >
                Gestisci Crediti
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-[#080b12] border border-[#192338]">
                <div className="text-[10px] text-slate-400 uppercase">Saldo Attuale</div>
                <div className="text-base font-bold text-[#00ff9d] mt-0.5">{analytics.creditsBalance} CR</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#080b12] border border-[#192338]">
                <div className="text-[10px] text-slate-400 uppercase">Autonomia</div>
                <div className="text-base font-bold text-[#00f0ff] mt-0.5">~{analytics.autonomyMonths} mesi</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#080b12] border border-[#192338]">
                <div className="text-[10px] text-slate-400 uppercase">Usati Storici</div>
                <div className="text-base font-bold text-[#ffb700] mt-0.5">{analytics.totalHistoricalCreditsUsed} CR</div>
              </div>
            </div>

            {/* Mini Bar Chart SVG Crediti Consumati */}
            <div className="p-3 rounded-xl bg-[#080b12] border border-[#192338]">
              <svg viewBox="0 0 360 120" className="w-full h-32 select-none" role="img" aria-label="Consumo crediti ultimi 6 mesi">
                {analytics.creditsHistoryMonths.map((m, idx) => {
                  const slot = 340 / 6;
                  const bW = 28;
                  const bH = (m.used / maxCreditsUsed) * 68;
                  const x = 10 + idx * slot + (slot - bW) / 2;
                  const y = 86 - bH;
                  return (
                    <g key={m.key}>
                      <rect
                        x={x}
                        y={y}
                        width={bW}
                        height={Math.max(bH, 2)}
                        rx="4"
                        fill="#ffb700"
                        fillOpacity={m.used > 0 ? '0.85' : '0.25'}
                      />
                      <text
                        x={x + bW / 2}
                        y={Math.max(y - 5, 11)}
                        textAnchor="middle"
                        fill="#e2e8f0"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {m.used}
                      </text>
                      <text
                        x={x + bW / 2}
                        y="108"
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {m.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* Top Referenti / Persone per Valore Mensile */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0d121f] border border-[#1b253b] space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-[#00ff9d]" />
            <span>Top Referenti per Valore Mensile</span>
          </h2>

          {analytics.topReferents.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center">
              Nessun account attivo disponibile.
            </div>
          ) : (
            <div className="space-y-2">
              {analytics.topReferents.map((ref, idx) => {
                const barWidth = Math.max(6, Math.round((ref.gross / topReferentMaxGross) * 100));
                return (
                  <div key={ref.key} className="p-2.5 rounded-xl bg-[#080b12] border border-[#192338] space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                          idx === 0
                            ? 'bg-[#ffb700]/20 text-[#ffb700] border border-[#ffb700]/40'
                            : 'bg-[#151e32] text-slate-400'
                        }`}>
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-white truncate" title={ref.name}>
                          {ref.name}
                        </span>
                        <span className="text-[10px] text-slate-500 flex-shrink-0">
                          ({ref.count} acc.)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[#00f0ff] font-bold">€{ref.gross}/m</span>
                        <span className="text-[10px] text-[#00ff9d]">+€{ref.net}</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#151e30] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#00ff9d] to-[#00f0ff]"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Riga 5: Proiezione Guadagni (1M, 3M, 6M, 1A) */}
      <div className="space-y-2.5">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-bold px-1">
          Proiezione Guadagni (a parità di account attivi)
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: '1 Mese', mult: 1 },
            { label: '3 Mesi', mult: 3 },
            { label: '6 Mesi', mult: 6 },
            { label: '1 Anno', mult: 12 }
          ].map((p) => (
            <div
              key={p.label}
              className="p-4 rounded-2xl bg-[#111726] border border-[#1d263b] space-y-1"
            >
              <div className="text-[11px] text-slate-400 uppercase">{p.label}</div>
              <div className="text-xl font-bold text-[#00ff9d]">
                €{(analytics.monthlyNet * p.mult).toLocaleString('it-IT')}
              </div>
              <div className="text-[10px] text-slate-400">
                Lordo: <span className="text-[#00f0ff]">€{(analytics.monthlyGross * p.mult).toLocaleString('it-IT')}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                Token: €{(analytics.monthlyTokenCost * p.mult).toLocaleString('it-IT')}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
