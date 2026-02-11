import React from 'react';
import { startOfWeek } from 'date-fns';
import { Target, BarChart3, Loader2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const PROGRESSION_PAGE_SIZE = 10;

/** Curseur de survol du Tooltip pour BarChart vertical */
const TooltipCursorBar = (props) => {
  const h = 14;
  const y = (props.y ?? 0) + ((props.height ?? 40) - h) / 2;
  return <rect x={props.x ?? 0} y={y} width={props.width ?? 0} height={h} fill="#f9fafb" fillOpacity={0.95} />;
};

/**
 * Onglet KPI & Période du dashboard pasteur : sommaire, progression familles, KPI période, modal détail, graphiques d'évolution.
 */
const PasteurKpiPeriod = ({
  pasteurNom,
  loadingKpiTab,
  filteredFamilles,
  chartData,
  famillesForProgressionChart,
  familles,
  progressionFilter,
  setProgressionFilter,
  progressionSort,
  setProgressionSort,
  hoveredFamilleNameProgression,
  setHoveredFamilleNameProgression,
  setSelectedFamille,
  progressionPage,
  setProgressionPage,
  kpiPeriodType,
  setKpiPeriodType,
  kpiSelectedYearForPeriod,
  setKpiSelectedYearForPeriod,
  kpiSelectedQuarter,
  setKpiSelectedQuarter,
  kpiSelectedMonth,
  setKpiSelectedMonth,
  kpiSelectedWeek,
  setKpiSelectedWeek,
  globalStats,
  kpiAnnuelsBreakdown,
  kpiDetailModal,
  setKpiDetailModal,
  hoveredKpiBarName,
  setHoveredKpiBarName,
  evolutionChartsRef,
  evolutionChartsInView,
  evolutionVisibleSeries,
  setEvolutionVisibleSeries,
}) => {
  return (
    <div className="space-y-6">
      {/* Sommaire / Sur cette page */}
      <Card className="bg-gray-100 border-gray-200 shadow-sm">
        <CardContent className="py-3">
          <p className="text-sm font-medium text-gray-700 mb-2">Sur cette page :</p>
          <nav className="flex flex-wrap gap-2" aria-label="Navigation dans l'onglet KPI">
            <a href="#kpi-progression" className="text-sm text-purple-600 hover:text-purple-800 underline font-medium">Progression des familles</a>
            <span className="text-gray-400">·</span>
            <a href="#kpi-periode" className="text-sm text-purple-600 hover:text-purple-800 underline font-medium">KPI de la période</a>
            <span className="text-gray-400">·</span>
            <a href="#kpi-evolution" className="text-sm text-purple-600 hover:text-purple-800 underline font-medium">Évolution des KPI (12 mois)</a>
          </nav>
        </CardContent>
      </Card>

      {/* Graphiques de progression des familles */}
      {(loadingKpiTab || filteredFamilles.length > 0 || chartData.length > 0) && (
        <Card id="kpi-progression" className="bg-white border-gray-200 shadow-sm scroll-mt-4">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Progression Globale des Familles de <span className="text-purple-600 font-semibold">{[pasteurNom.first_name, pasteurNom.last_name].filter(Boolean).join(' ') || pasteurNom.identifiant_unique || 'votre pasteur'}</span>
            </CardTitle>
            <CardDescription>
              Évolution dans le temps et progression par famille vers l&apos;objectif 70
            </CardDescription>
          </CardHeader>
          <CardContent onMouseLeave={() => setHoveredFamilleNameProgression(null)}>
            {loadingKpiTab ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="text-sm font-medium text-gray-700">Filtrer :</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'toutes', label: 'Toutes' },
                      { value: 'objectif_atteint', label: 'Objectif atteint' },
                      { value: 'en_cours', label: 'En cours' },
                    ].map(({ value, label }) => (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant="outline"
                        className={progressionFilter === value ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600' : 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200 hover:border-gray-400 hover:text-black'}
                        onClick={() => setProgressionFilter(value)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-700 ml-2">Trier par :</span>
                  <Select value={progressionSort} onValueChange={setProgressionSort}>
                    <SelectTrigger className="w-[180px] bg-gray-100 border-gray-300 text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="progression" className="text-gray-900">Progression (%)</SelectItem>
                      <SelectItem value="disciples" className="text-gray-900">Nombre de disciples</SelectItem>
                      <SelectItem value="nom" className="text-gray-900">Nom de famille</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  {famillesForProgressionChart.length > 0 && (() => {
                    const totalPages = Math.max(1, Math.ceil(famillesForProgressionChart.length / PROGRESSION_PAGE_SIZE));
                    const pageData = famillesForProgressionChart.slice(
                      progressionPage * PROGRESSION_PAGE_SIZE,
                      (progressionPage + 1) * PROGRESSION_PAGE_SIZE
                    );
                    return (
                      <>
                        <div className="h-[400px] w-full min-w-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={pageData.map((f) => ({
                                name: (f.famille?.nom || 'Famille'),
                                progression: Math.round(f.stats?.progression ?? 0),
                                disciples: f.stats?.nombreMembres ?? 0,
                              }))}
                              layout="vertical"
                              margin={{ top: 5, right: 20, left: 90, bottom: 5 }}
                              onClick={(chartDataClick) => {
                                const payload = chartDataClick?.activePayload?.[0]?.payload;
                                if (!payload?.name) return;
                                const item = famillesForProgressionChart.find((f) => (f.famille?.nom || 'Famille') === payload.name);
                                if (item) setSelectedFamille(item);
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <XAxis type="number" domain={[0, 100]} unit="%" stroke="#888888" fontSize={11} />
                              <YAxis
                                type="category"
                                dataKey="name"
                                stroke="#888888"
                                fontSize={11}
                                width={85}
                                tick={(props) => {
                                  const { x, y, payload } = props;
                                  const value = payload?.value ?? '';
                                  const item = famillesForProgressionChart.find((f) => (f.famille?.nom || 'Famille') === value);
                                  const supName = item ? `${item.superviseur?.first_name || ''} ${item.superviseur?.last_name || ''}`.trim() : '';
                                  const isHovered = value === hoveredFamilleNameProgression;
                                  const familyNameFill = isHovered ? '#9333ea' : '#2563eb';
                                  return (
                                    <g transform={`translate(${x},${y})`}>
                                      <text textAnchor="end" x={0} y={0} fontWeight="bold" fontSize={11} fill={familyNameFill}>{value}</text>
                                      {supName && <text textAnchor="end" x={0} y={14} fontSize={10} fill="#6b7280">{supName}</text>}
                                    </g>
                                  );
                                }}
                              />
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                              <Tooltip
                                cursor={<TooltipCursorBar />}
                                content={({ active, payload }) => {
                                  queueMicrotask(() => {
                                    setHoveredFamilleNameProgression(active && payload?.length ? payload[0].payload.name : null);
                                  });
                                  if (!active || !payload?.length) return null;
                                  const p = payload[0].payload;
                                  return (
                                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
                                      <div className="font-semibold text-purple-600">Progression : {p.progression}%</div>
                                      <div className="text-gray-700">Soit {p.disciples ?? 0} Disciples</div>
                                      <div className="text-xs text-purple-600 mt-1">Cliquez pour voir la fiche famille</div>
                                    </div>
                                  );
                                }}
                              />
                              <Bar dataKey="progression" name="Progression (%)" fill="#9333ea" radius={[0, 4, 4, 0]} barSize={18} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        {totalPages > 1 && (
                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3">
                            <span className="text-sm text-gray-600">
                              Familles {progressionPage * PROGRESSION_PAGE_SIZE + 1}–{Math.min((progressionPage + 1) * PROGRESSION_PAGE_SIZE, famillesForProgressionChart.length)} sur {famillesForProgressionChart.length}
                            </span>
                            <div className="flex items-center gap-2">
                              <Button type="button" size="sm" variant="outline" disabled={progressionPage <= 0} onClick={() => setProgressionPage((p) => Math.max(0, p - 1))} className="bg-gray-100 border-gray-300">
                                Précédent
                              </Button>
                              <span className="text-sm font-medium text-gray-700 px-2">Page {progressionPage + 1} / {totalPages}</span>
                              <Button type="button" size="sm" variant="outline" disabled={progressionPage >= totalPages - 1} onClick={() => setProgressionPage((p) => Math.min(totalPages - 1, p + 1))} className="bg-gray-100 border-gray-300">
                                Suivant
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {famillesForProgressionChart.length === 0 && familles.length > 0 && (
                    <div className="py-8 text-center text-gray-500 text-sm">Aucune famille ne correspond à ce filtre. Essayez « Toutes » ou « En cours ».</div>
                  )}
                  {chartData.length > 0 && chartData.some((d) => d.progressionEstimee != null) && familles.length === 0 && (
                    <div className="w-full min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Évolution de la progression (12 derniers mois)</h3>
                      <p className="text-xs text-gray-500 mb-2">Estimation à partir des disciples déclarés dans les rapports</p>
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis domain={[0, 100]} unit="%" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <Tooltip formatter={(v) => [`${v}%`, 'Progression estimée']} />
                            <Line type="monotone" dataKey="progressionEstimee" name="Progression estimée (%)" stroke="#9333ea" strokeWidth={2} dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPI avec sélection de période */}
      <Card id="kpi-periode" className="bg-white border-gray-200 shadow-sm scroll-mt-4">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg font-semibold text-gray-900">
                {(() => {
                  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
                  if (kpiPeriodType === 'annuel') return `KPI Annuels ${kpiSelectedYearForPeriod}`;
                  if (kpiPeriodType === 'trimestriel') return `KPI Trimestriels T${kpiSelectedQuarter} ${kpiSelectedYearForPeriod}`;
                  if (kpiPeriodType === 'mensuel') return `KPI Mensuels ${months[parseInt(kpiSelectedMonth, 10)]} ${kpiSelectedYearForPeriod}`;
                  const selectedYear = parseInt(kpiSelectedYearForPeriod, 10);
                  const selectedWeek = parseInt(kpiSelectedWeek, 10);
                  const jan1 = new Date(selectedYear, 0, 1);
                  const firstWeekStart = startOfWeek(jan1, { weekStartsOn: 1 });
                  const targetWeekStart = new Date(firstWeekStart);
                  targetWeekStart.setDate(firstWeekStart.getDate() + (selectedWeek - 1) * 7);
                  const monthName = months[targetWeekStart.getMonth()];
                  return `KPI Hebdomadaires Sem ${kpiSelectedWeek} ${monthName} ${kpiSelectedYearForPeriod}`;
                })()}
              </CardTitle>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={kpiPeriodType} onValueChange={setKpiPeriodType}>
                <SelectTrigger className="w-[140px] bg-gray-200 border-0 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-gray-900 hover:bg-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="hebdomadaire" className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">Hebdomadaire</SelectItem>
                  <SelectItem value="mensuel" className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">Mensuel</SelectItem>
                  <SelectItem value="trimestriel" className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">Trimestriel</SelectItem>
                  <SelectItem value="annuel" className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">Annuel</SelectItem>
                </SelectContent>
              </Select>
              {kpiPeriodType === 'annuel' && (
                <Select value={kpiSelectedYearForPeriod} onValueChange={setKpiSelectedYearForPeriod}>
                  <SelectTrigger className="w-[100px] bg-gray-100 border-0 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return <SelectItem key={year} value={year.toString()} className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">{year}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              )}
              {kpiPeriodType === 'trimestriel' && (
                <>
                  <Select value={kpiSelectedQuarter} onValueChange={setKpiSelectedQuarter}>
                    <SelectTrigger className="w-[140px] bg-gray-100 border-0 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="1" className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">Trimestre 1</SelectItem>
                      <SelectItem value="2" className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">Trimestre 2</SelectItem>
                      <SelectItem value="3" className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">Trimestre 3</SelectItem>
                      <SelectItem value="4" className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">Trimestre 4</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={kpiSelectedYearForPeriod} onValueChange={setKpiSelectedYearForPeriod}>
                    <SelectTrigger className="w-[100px] bg-gray-100 border-0 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {Array.from({ length: 7 }, (_, i) => {
                        const year = 2025 + i;
                        return <SelectItem key={year} value={year.toString()} className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">{year}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </>
              )}
              {kpiPeriodType === 'mensuel' && (
                <>
                  <Select value={kpiSelectedMonth} onValueChange={setKpiSelectedMonth}>
                    <SelectTrigger className="w-[140px] bg-gray-100 border-0 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((month, index) => (
                        <SelectItem key={index} value={index.toString()} className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={kpiSelectedYearForPeriod} onValueChange={setKpiSelectedYearForPeriod}>
                    <SelectTrigger className="w-[100px] bg-gray-100 border-0 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {Array.from({ length: 7 }, (_, i) => {
                        const year = 2025 + i;
                        return <SelectItem key={year} value={year.toString()} className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">{year}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </>
              )}
              {kpiPeriodType === 'hebdomadaire' && (
                <>
                  <Select value={kpiSelectedWeek} onValueChange={setKpiSelectedWeek}>
                    <SelectTrigger className="w-[120px] bg-gray-100 border-0 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 max-h-[200px]">
                      {Array.from({ length: 52 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()} className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">Semaine {i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={kpiSelectedYearForPeriod} onValueChange={setKpiSelectedYearForPeriod}>
                    <SelectTrigger className="w-[100px] bg-gray-100 border-0 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {Array.from({ length: 7 }, (_, i) => {
                        const year = 2025 + i;
                        return <SelectItem key={year} value={year.toString()} className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">{year}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>
          <CardDescription className="mt-2">Indicateurs de performance agrégés pour la période sélectionnée</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingKpiTab ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-indigo-50 to-white p-3 shadow-sm">
                  <div className="text-xl font-bold text-indigo-700">{globalStats.kpiAnnuels?.culteSamediSoir || 0}</div>
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Culte samedi soir</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-3 shadow-sm">
                  <div className="text-xl font-bold text-blue-700">{globalStats.kpiAnnuels?.culteDimancheMatin || 0}</div>
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Culte dimanche</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-emerald-50 to-white p-3 shadow-sm">
                  <div className="text-xl font-bold text-emerald-700">{globalStats.kpiAnnuels?.nouveauxConvertis || 0}</div>
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Nouveaux convertis</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-rose-50 to-white p-3 shadow-sm">
                  <div className="text-xl font-bold text-rose-700">{globalStats.kpiAnnuels?.nouveauxArrivants || 0}</div>
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Nouveaux arrivants</div>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Cliquez sur une barre pour voir le détail par famille.</p>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Culte sam.', value: globalStats.kpiAnnuels?.culteSamediSoir || 0, modalKey: null },
                        { name: 'Culte dim.', value: globalStats.kpiAnnuels?.culteDimancheMatin || 0, modalKey: null },
                        { name: 'After culte', value: globalStats.kpiAnnuels?.afterCulteDimanche || 0, modalKey: null },
                        { name: 'Évangélis.', value: globalStats.kpiAnnuels?.personnesEvangelisees || 0, modalKey: 'personnesEvangelisees' },
                        { name: 'Nouv. convertis', value: globalStats.kpiAnnuels?.nouveauxConvertis || 0, modalKey: 'nouveauxConvertis' },
                        { name: 'Nouv. arrivants', value: globalStats.kpiAnnuels?.nouveauxArrivants || 0, modalKey: 'nouveauxArrivants' },
                        { name: 'Âmes revenues', value: globalStats.kpiAnnuels?.amesRevenues || 0, modalKey: 'amesRevenues' },
                        { name: 'Ne répond plus', value: globalStats.kpiAnnuels?.neRepondPlus || 0, modalKey: 'neRepondPlus' },
                      ]}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 92, bottom: 28 }}
                      onClick={(chartDataClick) => {
                        const payload = chartDataClick?.activePayload?.[0]?.payload;
                        if (!payload?.modalKey) return;
                        const titles = { personnesEvangelisees: 'Personnes évangélisées', nouveauxConvertis: 'Nouveaux Convertis', nouveauxArrivants: 'Nouveaux Arrivants', amesRevenues: 'Âmes Revenues', neRepondPlus: 'Ne répond plus' };
                        const breakdown = kpiAnnuelsBreakdown[payload.modalKey];
                        if (breakdown) setKpiDetailModal({ title: titles[payload.modalKey] || payload.name, data: breakdown });
                      }}
                      onMouseMove={(e) => setHoveredKpiBarName(e?.activePayload?.[0]?.payload?.name ?? null)}
                      onMouseLeave={() => setHoveredKpiBarName(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <XAxis type="number" stroke="#6b7280" fontSize={12} label={{ value: 'Nombre (effectif pour la période)', position: 'insideBottom', offset: -4, style: { fill: '#6b7280', fontSize: 12 } }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={88}
                        stroke="#6b7280"
                        tick={(props) => {
                          const { x, y, payload } = props;
                          const isHovered = payload?.value === hoveredKpiBarName;
                          const fill = isHovered ? '#7c3aed' : '#111827';
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text textAnchor="end" x={0} y={0} fill={fill} fontSize={14} fontWeight="bold">{payload.value}</text>
                            </g>
                          );
                        }}
                      />
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                      <Tooltip
                        cursor={{ fill: '#f3f4f6', fillOpacity: 0.8 }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0].payload;
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
                              <div className="font-semibold text-gray-900">{p.name}</div>
                              <div className="text-gray-700">{p.value} pour la période</div>
                              {p.modalKey && <div className="text-xs text-purple-600 mt-1">Cliquez pour voir par famille</div>}
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="value" name="Valeur" fill="#9333ea" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal détail KPI par famille */}
      <Dialog open={!!kpiDetailModal} onOpenChange={() => setKpiDetailModal(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-gray-100 text-gray-900 border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">{kpiDetailModal?.title} — par famille</DialogTitle>
            <DialogDescription className="text-gray-700">Nombre de personnes par famille pour la période sélectionnée.</DialogDescription>
          </DialogHeader>
          {kpiDetailModal?.data?.length ? (
            <div className="overflow-x-auto text-gray-900">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-900">Famille</TableHead>
                    <TableHead className="text-gray-900">Superviseur</TableHead>
                    <TableHead className="text-right text-gray-900">Nombre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpiDetailModal.data.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-gray-900">{row.familleNom}</TableCell>
                      <TableCell className="text-gray-700">{row.superviseurNom}</TableCell>
                      <TableCell className="text-right font-semibold text-gray-900">{row.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-gray-700 text-sm py-4">Aucune donnée par famille pour cette période.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Graphiques d'évolution des KPI */}
      {chartData.length > 0 && (
        <Card id="kpi-evolution" ref={evolutionChartsRef} className="bg-white border-gray-200 shadow-sm scroll-mt-4">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Évolution des KPI (12 derniers mois)
            </CardTitle>
            <CardDescription>Tendances des indicateurs. Cochez ou décochez les séries pour afficher/masquer les courbes.</CardDescription>
            {evolutionChartsInView && (
              <div className="flex flex-wrap gap-2 mt-2">
                <Button type="button" size="sm" variant="outline" className="text-xs border-gray-300 bg-gray-100" onClick={() => setEvolutionVisibleSeries({ culteSamediSoir: true, culteDimancheMatin: true, afterCulteDimanche: true, tempsPriere: true, tempsPartage: true, nouveauxConvertis: true, nouveauxArrivants: true, sortiesEvangelisation: true, personnesEvangelisees: true })}>
                  Tout afficher
                </Button>
                <Button type="button" size="sm" variant="outline" className="text-xs border-gray-300 bg-gray-100" onClick={() => setEvolutionVisibleSeries({ culteSamediSoir: false, culteDimancheMatin: false, afterCulteDimanche: false, tempsPriere: false, tempsPartage: false, nouveauxConvertis: false, nouveauxArrivants: false, sortiesEvangelisation: false, personnesEvangelisees: false })}>
                  Tout masquer
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {evolutionChartsInView ? (
              <div className="space-y-8">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">Cultes & présence</h3>
                  <div className="flex flex-wrap gap-4 items-center">
                    {[
                      { key: 'culteSamediSoir', label: 'Culte Samedi Soir' },
                      { key: 'culteDimancheMatin', label: 'Culte Dimanche' },
                      { key: 'afterCulteDimanche', label: 'After Culte' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                        <Checkbox checked={evolutionVisibleSeries[key]} onCheckedChange={() => setEvolutionVisibleSeries((p) => ({ ...p, [key]: !p[key] }))} className="border-gray-400 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600" />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCulteSamedi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                          <linearGradient id="colorCulteDimanche" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                          <linearGradient id="colorAfterCulte" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/><stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/></linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <Tooltip /><Legend />
                        {evolutionVisibleSeries.culteSamediSoir && <Area type="monotone" dataKey="culteSamediSoir" name="Culte Samedi Soir" stroke="#6366f1" fillOpacity={1} fill="url(#colorCulteSamedi)" />}
                        {evolutionVisibleSeries.culteDimancheMatin && <Area type="monotone" dataKey="culteDimancheMatin" name="Culte Dimanche Matin" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCulteDimanche)" />}
                        {evolutionVisibleSeries.afterCulteDimanche && <Area type="monotone" dataKey="afterCulteDimanche" name="After Culte" stroke="#14b8a6" fillOpacity={1} fill="url(#colorAfterCulte)" />}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">Prière & partage</h3>
                  <div className="flex flex-wrap gap-4 items-center">
                    {[{ key: 'tempsPriere', label: 'Temps de Prière' }, { key: 'tempsPartage', label: 'Temps de Partage' }].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                        <Checkbox checked={evolutionVisibleSeries[key]} onCheckedChange={() => setEvolutionVisibleSeries((p) => ({ ...p, [key]: !p[key] }))} className="border-gray-400 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600" />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <Tooltip /><Legend />
                        {evolutionVisibleSeries.tempsPriere && <Line type="monotone" dataKey="tempsPriere" name="Temps de Prière" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />}
                        {evolutionVisibleSeries.tempsPartage && <Line type="monotone" dataKey="tempsPartage" name="Temps de Partage" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">Évangélisation & nouveaux convertis</h3>
                  <div className="flex flex-wrap gap-4 items-center">
                    {[
                      { key: 'nouveauxConvertis', label: 'Nouveaux Convertis' },
                      { key: 'nouveauxArrivants', label: 'Nouveaux Arrivants' },
                      { key: 'sortiesEvangelisation', label: "Sorties d'Évangélisation" },
                      { key: 'personnesEvangelisees', label: 'Personnes Évangélisées' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                        <Checkbox checked={evolutionVisibleSeries[key]} onCheckedChange={() => setEvolutionVisibleSeries((p) => ({ ...p, [key]: !p[key] }))} className="border-gray-400 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600" />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <Tooltip /><Legend />
                        {evolutionVisibleSeries.nouveauxConvertis && <Line type="monotone" dataKey="nouveauxConvertis" name="Nouveaux Convertis" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} />}
                        {evolutionVisibleSeries.nouveauxArrivants && <Line type="monotone" dataKey="nouveauxArrivants" name="Nouveaux Arrivants" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />}
                        {evolutionVisibleSeries.sortiesEvangelisation && <Line type="monotone" dataKey="sortiesEvangelisation" name="Sorties d'Évangélisation" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />}
                        {evolutionVisibleSeries.personnesEvangelisees && <Line type="monotone" dataKey="personnesEvangelisees" name="Personnes Évangélisées" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-gray-500 text-sm">Chargement des graphiques d&apos;évolution…</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PasteurKpiPeriod;
