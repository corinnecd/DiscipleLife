import React from 'react';
import {
  Users, Target, UserCheck, Building2, BarChart3, Mail, Loader2, RefreshCw,
  Church, TrendingUp, GitBranch, Info, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Vue d'ensemble du dashboard pasteur : KPI 4 cartes, graphique Progression vers objectif 70, KPI par pasteur, actions rapides.
 */
const PasteurOverview = ({
  pasteurNom,
  globalStats,
  familles,
  setSelectedFamille,
  kpiParPasteur,
  kpiParPasteurLoading,
  kpiParPasteurTotalCumule,
  kpiParPasteurTotalFamilles,
  overviewChartRef,
  overviewChartInView,
  activeTab,
  famillesForProgressionChart,
  progressionFilter,
  setProgressionFilter,
  progressionSort,
  setProgressionSort,
  hoveredFamilleNameProgression,
  setHoveredFamilleNameProgression,
  TAB_KEYS,
  setActiveTab,
  setSelectedPasteurIdForFamilies,
  navigate,
  handleRefreshDonnees,
  refreshing,
  loading,
  role,
}) => {
  return (
    <div className="space-y-6">
      {/* KPI des Familles */}
      <div className="rounded-xl bg-gray-200 border border-gray-300 p-4 md:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            KPI des Familles de {[pasteurNom.first_name, pasteurNom.last_name].filter(Boolean).join(' ') || pasteurNom.identifiant_unique || 'votre pasteur'}
          </h2>
          <Button
            type="button"
            size="sm"
            onClick={handleRefreshDonnees}
            disabled={refreshing || loading}
            className="shrink-0 bg-blue-600 text-white border-0 hover:bg-purple-600 hover:text-white"
          >
            {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Rafraîchir
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Superviseurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{globalStats.totalSuperviseurs}</div>
              <p className="text-xs text-gray-600 mt-1">Sous votre responsabilité</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                Familles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{globalStats.totalFamilles}</div>
              <p className="text-xs text-gray-600 mt-1">Familles actives</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-purple-600" />
                Disciples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{globalStats.totalDisciples}</div>
              <p className="text-xs text-gray-600 mt-1">sur {globalStats.objectifTotal} objectif</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-600" />
                Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{Math.round(globalStats.progressionGlobale)}%</div>
              <p className="text-xs text-gray-600 mt-1">{globalStats.famillesObjectifAtteint} familles ont atteint l&apos;objectif</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alertes : Familles sous objectif */}
      {(() => {
        const famillesSousObjectif = (familles || []).filter((f) => f.stats && typeof f.stats.progression === 'number' && f.stats.progression < 100);
        if (famillesSousObjectif.length === 0) return null;
        return (
          <Card className="bg-white border-gray-200 shadow-sm border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Familles sous objectif ({famillesSousObjectif.length})
              </CardTitle>
              <CardDescription>
                Cliquez sur une famille pour ouvrir sa fiche et voir les détails.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {famillesSousObjectif.slice(0, 10).map((item) => (
                  <li key={item.famille?.id || item.superviseur_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedFamille(item)}
                      className="text-left w-full text-sm text-purple-700 hover:text-purple-900 hover:underline font-medium"
                    >
                      {item.famille?.nom || 'Famille'} — {Math.round(item.stats?.progression ?? 0)}% ({item.stats?.nombreMembres ?? 0} / {item.stats?.objectif ?? 70})
                    </button>
                  </li>
                ))}
              </ul>
              {famillesSousObjectif.length > 10 && (
                <p className="text-xs text-gray-500 mt-2">
                  et {famillesSousObjectif.length - 10} autre(s) — voir l&apos;onglet Familles ou le graphique ci-dessous.
                </p>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Graphique phare : Progression vers l'objectif 70 */}
      <Card ref={overviewChartRef} className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Progression vers l&apos;objectif 70
          </CardTitle>
          <CardDescription>
            Cliquez sur une barre pour ouvrir la fiche famille. Filtres et tri ci-dessous ; voir l&apos;onglet KPI & Période pour la liste complète avec pagination.
          </CardDescription>
        </CardHeader>
        <CardContent onMouseLeave={() => setHoveredFamilleNameProgression(null)}>
          {(overviewChartInView || activeTab === TAB_KEYS.OVERVIEW) && familles.length > 0 && (
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
          )}
          {(overviewChartInView || activeTab === TAB_KEYS.OVERVIEW) && famillesForProgressionChart.length > 0 ? (
            <div className="w-full overflow-visible">
              {/* Zone fixe au-dessus du graphique : infobulle toujours visible + détail au survol (position absolue pour éviter le sursaut) */}
              <div className="relative min-h-[4.5rem] mb-3">
                <p className="flex items-center gap-2 text-sm text-gray-600" role="status" aria-live="polite">
                  <Info className="h-4 w-4 shrink-0 text-purple-500" aria-hidden />
                  Survoler les barres de progression, pour afficher plus de détails.
                </p>
                {hoveredFamilleNameProgression && (() => {
                  const item = famillesForProgressionChart.find((f) => (f.famille?.nom || 'Famille') === hoveredFamilleNameProgression);
                  const progression = Math.round(item?.stats?.progression ?? 0);
                  const disciples = item?.stats?.nombreMembres ?? 0;
                  return (
                    <div
                      className="absolute right-0 top-0 z-10 rounded-lg border border-gray-200 bg-white shadow-sm px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 hover:border-purple-300 transition-colors"
                      role="button"
                      tabIndex={0}
                      onClick={() => item && setSelectedFamille(item)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item && setSelectedFamille(item); } }}
                      aria-label={`Voir la fiche famille ${hoveredFamilleNameProgression}`}
                    >
                      <span className="font-semibold text-purple-600">{hoveredFamilleNameProgression} — Progression : {progression}%</span>
                      <span className="text-gray-700"> — Soit {disciples} Disciples. </span>
                      <span className="text-xs text-purple-600">Cliquez pour voir la fiche famille</span>
                    </div>
                  );
                })()}
              </div>
              <div style={{ minHeight: 320, height: Math.max(320, famillesForProgressionChart.length * 36) }}>
                <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={famillesForProgressionChart.map((f) => ({
                    name: (f.famille?.nom || 'Famille'),
                    progression: Math.round(f.stats?.progression ?? 0),
                    disciples: f.stats?.nombreMembres ?? 0,
                  }))}
                  layout="vertical"
                  margin={{ top: 10, right: 24, left: 130, bottom: 16 }}
                  barCategoryGap={4}
                  onClick={(chartData) => {
                    const payload = chartData?.activePayload?.[0]?.payload;
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
                    width={120}
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
                    cursor={false}
                    content={({ active, payload }) => {
                      queueMicrotask(() => {
                        setHoveredFamilleNameProgression(active && payload?.length ? payload[0].payload.name : null);
                      });
                      return null;
                    }}
                  />
                  <Bar dataKey="progression" name="Progression (%)" fill="#9333ea" radius={[0, 4, 4, 0]} barSize={10} />
                </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (overviewChartInView || activeTab === TAB_KEYS.OVERVIEW) && famillesForProgressionChart.length === 0 && familles.length > 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">Aucune famille ne correspond à ce filtre. Essayez « Toutes » ou « En cours ».</p>
          ) : (overviewChartInView || activeTab === TAB_KEYS.OVERVIEW) && familles.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">Aucune famille pour l&apos;instant.</p>
          ) : (
            <div className="h-[120px] flex items-center justify-center text-gray-400 text-sm">Chargement du graphique…</div>
          )}
        </CardContent>
      </Card>

      {/* KPI Globaux - Total Disciples par Pasteur */}
      {(role === 'pasteur' || role === 'admin' || role === 'super_admin') && (
        <Card className="bg-gradient-to-br from-gray-200 via-gray-100 to-blue-100 border-gray-300 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              KPI Globaux - Total Disciples par Pasteur
            </CardTitle>
            <CardDescription>
              Vue d&apos;ensemble du nombre total de disciples sous la tutelle de chaque pasteur ({kpiParPasteur.length} pasteur{kpiParPasteur.length !== 1 ? 's' : ''})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {kpiParPasteurLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {kpiParPasteur.map((p) => (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedPasteurIdForFamilies(p.id);
                      setActiveTab(TAB_KEYS.FAMILIES);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedPasteurIdForFamilies(p.id);
                        setActiveTab(TAB_KEYS.FAMILIES);
                      }
                    }}
                    aria-label={`Voir les familles de ${p.nomAffichage}`}
                    className="rounded-xl border border-gray-200 bg-gradient-to-br from-purple-50 to-white p-4 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Church className="h-5 w-5 text-purple-600" />
                      <span className="font-bold text-gray-900 text-sm uppercase tracking-wide">{p.nomAffichage}</span>
                    </div>
                    <div className="font-bold text-gray-900 text-sm mb-1">{p.totalFamilles ?? 0} Familles</div>
                    <div className="mt-2">
                      <span className="text-xs font-bold text-gray-900 uppercase">Total Disciples : </span>
                      <span className="text-2xl font-bold text-purple-600">{p.totalDisciples}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Sur {(p.totalFamilles ?? 0) * 70} Disciples attendus</p>
                    <p className="text-xs text-purple-600 mt-2 font-medium">Cliquez pour voir les familles</p>
                  </div>
                ))}
                <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <span className="font-bold text-gray-900 text-sm">Cumul des Familles</span>
                  </div>
                  <div className="font-bold text-gray-900 text-sm mb-1">{kpiParPasteurTotalFamilles} Familles</div>
                  <div className="mt-2">
                    <span className="text-xs font-bold text-gray-900 uppercase">Cumul Disciples : </span>
                    <span className="text-xl font-bold text-blue-600">{kpiParPasteurTotalCumule}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Sur {kpiParPasteurTotalFamilles * 70} Disciples attendus</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions rapides */}
      <nav className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Actions rapides du dashboard">
        <Card
          role="button"
          tabIndex={0}
          aria-label="Aller à l'onglet KPI et graphiques"
          className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          onClick={() => setActiveTab(TAB_KEYS.KPI)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab(TAB_KEYS.KPI); } }}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              KPI & Graphiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Indicateurs et évolution par période</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          aria-label="Consulter les rapports reçus"
          className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          onClick={() => navigate('/admin/reports')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/admin/reports'); } }}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-600" />
              Rapports Reçus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Consultez les rapports de vos superviseurs</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          aria-label="Aller à l'onglet Familles"
          className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          onClick={() => setActiveTab(TAB_KEYS.FAMILIES)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab(TAB_KEYS.FAMILIES); } }}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              Gérer les Familles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Liste et détails des familles</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          aria-label="Voir l'arbre généalogique"
          className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          onClick={() => navigate('/arbre-genealogique')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/arbre-genealogique'); } }}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-amber-600" />
              Arbre généalogique
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Vue complète Pasteur → Superviseurs → Disciples</p>
          </CardContent>
        </Card>
      </nav>
    </div>
  );
};

export default PasteurOverview;
