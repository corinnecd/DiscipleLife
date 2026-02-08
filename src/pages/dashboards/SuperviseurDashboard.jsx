import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Target, TrendingUp, UserCheck, Activity, 
  Church, ChevronRight, Loader2, UserCircle, Eye, Camera, Sparkles, Zap, Trophy, Star, AlertCircle,
  Moon, Heart, HeartHandshake, UserPlus, Megaphone, Book, CheckCircle2, PlayCircle, Download, FileText, History, Search, X, Calendar, User, ChevronDown, ChevronUp
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet';
import { useSuperviseurDashboard } from '@/hooks/useSuperviseurDashboard';
import { WelcomeBanner } from './superviseur/WelcomeBanner';
import { FamillePasteurCards } from './superviseur/FamillePasteurCards';
import { SuperviseursFamilleCard } from './superviseur/SuperviseursFamilleCard';
import { StatsRapidesEtActions } from './superviseur/StatsRapidesEtActions';
import { KpiSection } from './superviseur/KpiSection';
import { ChartsKpi } from './superviseur/ChartsKpi';
import { StatsComparatives } from './superviseur/StatsComparatives';
import { ActiviteRecente } from './superviseur/ActiviteRecente';
import { AlertesSection } from './superviseur/AlertesSection';
import { MembresListCard } from './superviseur/MembresListCard';
import { SuperviseurModals } from './superviseur/SuperviseurModals';
import { TableauDetailleDisciples } from './superviseur/TableauDetailleDisciples';
import { TableauMentorsPiliers } from './superviseur/TableauMentorsPiliers';
import { ChartsSupplementaires } from './superviseur/ChartsSupplementaires';
import { ArbreGenealogiqueEmbed } from '@/components/ArbreGenealogiqueEmbed';
import { ReportReminderCard } from './superviseur/ReportReminderCard';
import { SuperviseurDashboardHeader } from './superviseur/SuperviseurDashboardHeader';
const SuperviseurDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dashboard = useSuperviseurDashboard(user);
  const {
    phase1Loading,
    loading,
    initialLoading,
    famille,
    setFamille,
    superviseur,
    pasteur,
    setPasteur,
    refetchPhase1,
    superviseurNom,
    stats,
    familleAvatarFile,
    familleAvatarPreview,
    uploadingFamilleAvatar,
    pasteurAvatarFile,
    pasteurAvatarPreview,
    uploadingPasteurAvatar,
    reportReminder,
    kpiPeriodType,
    setKpiPeriodType,
    kpiSelectedYear,
    setKpiSelectedYear,
    kpiSelectedQuarter,
    setKpiSelectedQuarter,
    kpiSelectedMonth,
    setKpiSelectedMonth,
    kpiSelectedWeek,
    setKpiSelectedWeek,
    kpiSelectedYearForPeriod,
    setKpiSelectedYearForPeriod,
    chartData,
    chartDataPreviousYear,
    formationVideoChartData,
    statutsSpirituelsData,
    exporting,
    rapports,
    showHistory,
    setShowHistory,
    activiteRecente,
    statsComparatives,
    loadingStatsComparatives,
    alertes,
    kpiData,
    membres,
    membresProgression,
    membresDisciplesCount,
    membresSuiviPar,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    progressionFilter,
    setProgressionFilter,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    selectedMembres,
    setSelectedMembres,
    showSelectedModal,
    setShowSelectedModal,
    selectedMembreForDisciples,
    setSelectedMembreForDisciples,
    disciplesList,
    setDisciplesList,
    loadingDisciplesList,
    superviseursFamille,
    nombreMembresParSuperviseur,
    selectedSuperviseur,
    setSelectedSuperviseur,
    showAllInactifs,
    setShowAllInactifs,
    showAllSansProgression,
    setShowAllSansProgression,
    disciplesDetaille,
    loadingDisciplesDetaille,
    mentorsConsolides,
    loadingMentorsConsolides,
    handleRefreshMentorsConsolides,
    chartsLoaded,
    setChartsLoaded,
    statsComparativesRequested,
    setStatsComparativesRequested,
    formationVideoRef,
    statutsSpirituelsRef,
    activiteRecenteRef,
    statsComparativesRef,
    filteredMembres,
    totalPages,
    paginatedMembres,
    toast,
    handleExportPDF,
    handleExportExcel,
    handleExportDisciplesDetailleExcel,
    handleExportMentorsConsolidesExcel,
    toggleSelectMembre,
    toggleSelectAll,
    handleFamilleAvatarChange,
    handlePasteurAvatarChange,
    uploadFamilleAvatar,
    uploadPasteurAvatar,
    fetchDisciplesOfMembre,
    handleExportFilteredList,
    handleExportDisciplesList,
    handleExportSelectedExcel,
    handleExportSelectedPdf,
    fetchDisciplesDetaille,
    fetchMentorsConsolides,
    generateFormationVideoChartData,
    calculateStatutsSpirituels,
    fetchActiviteRecente,
    fetchStatsComparatives,
    chartsLoadedRef,
    handleError,
    devLog,
    setDisciplesDetaille,
    setMentorsConsolides,
    setFormationVideoChartData,
    setStatutsSpirituelsData,
    setActiviteRecente,
  } = dashboard;

  // Hook pour détecter la visibilité d'un élément (IntersectionObserver) - Lazy loading des graphiques
  useEffect(() => {
    if (!user) return; // Ne pas observer si les données principales ne sont pas chargées

    const observers = [];

    // Observer pour "Évolution des Formations et Vidéos"
    if (formationVideoRef.current) {
      const observer1 = new IntersectionObserver(
        async ([entry]) => {
          if (entry.isIntersecting && !chartsLoaded.formationVideo) {
            setChartsLoaded(prev => ({ ...prev, formationVideo: true }));
            try {
              await generateFormationVideoChartData();
              devLog('✅ Données formations/vidéos générées (lazy loading)');
            } catch (error) {
              handleError(error, { context: 'generateFormationVideoChartData', lazyLoad: true }, "Impossible de générer les données des formations et vidéos.");
            }
          }
        },
        { threshold: 0.1 }
      );
      observer1.observe(formationVideoRef.current);
      observers.push({ observer: observer1, element: formationVideoRef.current });
    }

    // Observer pour "Répartition des Statuts Spirituels"
    if (statutsSpirituelsRef.current) {
      const observer2 = new IntersectionObserver(
        async ([entry]) => {
          if (entry.isIntersecting && !chartsLoaded.statutsSpirituels) {
            setChartsLoaded(prev => ({ ...prev, statutsSpirituels: true }));
            try {
              await calculateStatutsSpirituels();
              devLog('✅ Statuts spirituels calculés (lazy loading)');
            } catch (error) {
              handleError(error, { context: 'calculateStatutsSpirituels', lazyLoad: true }, "Impossible de calculer la répartition des statuts spirituels.");
            }
          }
        },
        { threshold: 0.1 }
      );
      observer2.observe(statutsSpirituelsRef.current);
      observers.push({ observer: observer2, element: statutsSpirituelsRef.current });
    }

    // Observer pour "Activité Récente"
    if (activiteRecenteRef.current) {
      const observer3 = new IntersectionObserver(
        async ([entry]) => {
          if (entry.isIntersecting && !chartsLoaded.activiteRecente) {
            setChartsLoaded(prev => ({ ...prev, activiteRecente: true }));
            try {
              await fetchActiviteRecente();
              devLog('✅ Activité récente récupérée (lazy loading)');
            } catch (error) {
              handleError(error, { context: 'fetchActiviteRecente', lazyLoad: true }, "Impossible de récupérer l'activité récente.");
            }
          }
        },
        { threshold: 0.1 }
      );
      observer3.observe(activiteRecenteRef.current);
      observers.push({ observer: observer3, element: activiteRecenteRef.current });
    }

    // Observer pour "Statistiques Comparatives" — plus de setInterval : on demande le chargement, un useEffect (statsComparativesRequested + famille) le fait
    if (statsComparativesRef.current) {
      const observer4 = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !chartsLoadedRef.current.statsComparatives) {
            setStatsComparativesRequested(true);
          }
        },
        { threshold: 0.1 }
      );
      observer4.observe(statsComparativesRef.current);
      observers.push({ observer: observer4, element: statsComparativesRef.current });
    }

    // Nettoyage
    return () => {
      observers.forEach(({ observer, element }) => {
        if (element) observer.unobserve(element);
      });
    };
  }, [user?.id]);

  // Spinner pleine page au premier chargement (pas à chaque refetch KPI)
  if (initialLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!famille) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">
              Aucune famille assignée à votre compte superviseur.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Tableau de bord Superviseur - DiscipleLife</title>
      </Helmet>
      
      <div id="superviseur-dashboard-content" className="space-y-6 p-6 bg-gray-50 min-h-screen">
        <SuperviseurDashboardHeader onBack={() => navigate(-1)} />

        <ReportReminderCard
          reportReminder={reportReminder}
          onGoToSendReport={() => navigate('/send-report')}
        />

        {/* Bandeau de bienvenue */}
        {famille && (
          <WelcomeBanner
            famille={famille}
            superviseurNom={superviseurNom}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            exporting={exporting}
          />
        )}
        
        {/* En-tête avec nom de la famille et pasteur */}
        <FamillePasteurCards
          famille={famille}
          user={user}
          stats={stats}
          superviseurNom={superviseurNom}
          pasteur={pasteur}
          familleAvatarPreview={familleAvatarPreview}
          familleAvatarFile={familleAvatarFile}
          uploadingFamilleAvatar={uploadingFamilleAvatar}
          onFamilleAvatarChange={handleFamilleAvatarChange}
          uploadFamilleAvatar={uploadFamilleAvatar}
          pasteurAvatarPreview={pasteurAvatarPreview}
          pasteurAvatarFile={pasteurAvatarFile}
          uploadingPasteurAvatar={uploadingPasteurAvatar}
          onPasteurAvatarChange={handlePasteurAvatarChange}
          uploadPasteurAvatar={uploadPasteurAvatar}
        />

        {/* Liste des superviseurs de la famille */}
        <SuperviseursFamilleCard
          superviseursFamille={superviseursFamille}
          nombreMembresParSuperviseur={nombreMembresParSuperviseur}
          onSelectSuperviseur={setSelectedSuperviseur}
        />

        {/* Statistiques rapides + Actions rapides */}
        <StatsRapidesEtActions
          stats={stats}
          onNavigate={navigate}
          onShowHistory={() => setShowHistory(true)}
        />

        {/* Section KPI avec filtres de période */}
        <KpiSection
          kpiPeriodType={kpiPeriodType}
          setKpiPeriodType={setKpiPeriodType}
          kpiSelectedYearForPeriod={kpiSelectedYearForPeriod}
          setKpiSelectedYearForPeriod={setKpiSelectedYearForPeriod}
          kpiSelectedQuarter={kpiSelectedQuarter}
          setKpiSelectedQuarter={setKpiSelectedQuarter}
          kpiSelectedMonth={kpiSelectedMonth}
          setKpiSelectedMonth={setKpiSelectedMonth}
          kpiSelectedWeek={kpiSelectedWeek}
          setKpiSelectedWeek={setKpiSelectedWeek}
          kpiData={kpiData}
        />

        {/* Graphiques d'évolution des KPI */}
        <ChartsKpi chartData={chartData} />

        {/* Section Activité Récente */}
        <div ref={activiteRecenteRef}>
          <ActiviteRecente
            activiteRecente={activiteRecente}
            onMemberClick={(id) => navigate(`/disciples/${id}`)}
          />
        </div>

        {/* Statistiques Comparatives */}
        <div ref={statsComparativesRef}>
          <StatsComparatives
            statsComparatives={statsComparatives}
            loadingStatsComparatives={loadingStatsComparatives}
            stats={stats}
          />
        </div>

        {/* Notifications/Alertes */}
        <AlertesSection
          alertes={alertes}
          showAllInactifs={showAllInactifs}
          setShowAllInactifs={setShowAllInactifs}
          showAllSansProgression={showAllSansProgression}
          setShowAllSansProgression={setShowAllSansProgression}
        />

        {/* Liste des membres de la famille */}
        <MembresListCard
          filteredMembres={filteredMembres}
          paginatedMembres={paginatedMembres}
          selectedMembres={selectedMembres}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          progressionFilter={progressionFilter}
          setProgressionFilter={setProgressionFilter}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
          membresProgression={membresProgression}
          membresSuiviPar={membresSuiviPar}
          toggleSelectAll={toggleSelectAll}
          toggleSelectMembre={toggleSelectMembre}
          setShowSelectedModal={setShowSelectedModal}
          onNavigate={navigate}
          onExportFilteredList={handleExportFilteredList}
          onExportSelection={handleExportSelectedExcel}
          onFetchDisciples={fetchDisciplesOfMembre}
          toast={toast}
        />

        <TableauDetailleDisciples
          loading={loadingDisciplesDetaille}
          disciples={disciplesDetaille}
          onNavigate={navigate}
          onExportExcel={handleExportDisciplesDetailleExcel}
        />

        <TableauMentorsPiliers
          loading={loadingMentorsConsolides}
          mentors={mentorsConsolides}
          onExportExcel={handleExportMentorsConsolidesExcel}
          onNavigate={navigate}
          onRefresh={handleRefreshMentorsConsolides}
        />

        {famille?.id && (
          <ArbreGenealogiqueEmbed
            mode="family"
            famille={famille}
            title={`Arbre généalogique - ${famille.nom || 'Ma famille'}`}
            description="Lignée spirituelle de votre famille (Pasteur → Superviseur → Mentors → Disciples)."
            compactHeight={420}
          />
        )}

        <ChartsSupplementaires
          formationVideoChartData={formationVideoChartData}
          formationVideoRef={formationVideoRef}
          chartData={chartData}
          chartDataPreviousYear={chartDataPreviousYear}
          statutsSpirituelsData={statutsSpirituelsData}
          statutsSpirituelsRef={statutsSpirituelsRef}
        />

        <SuperviseurModals
          selectedMembreForDisciples={selectedMembreForDisciples}
          setSelectedMembreForDisciples={setSelectedMembreForDisciples}
          disciplesList={disciplesList}
          setDisciplesList={setDisciplesList}
          loadingDisciplesList={loadingDisciplesList}
          onExportDisciplesList={handleExportDisciplesList}
          onNavigate={navigate}
          showSelectedModal={showSelectedModal}
          setShowSelectedModal={setShowSelectedModal}
          selectedMembres={selectedMembres}
          filteredMembres={filteredMembres}
          membresProgression={membresProgression}
          famille={famille}
          onExportSelectedExcel={handleExportSelectedExcel}
          onExportSelectedPdf={handleExportSelectedPdf}
          onFetchDisciples={fetchDisciplesOfMembre}
          showHistory={showHistory}
          setShowHistory={setShowHistory}
          rapports={rapports}
          selectedSuperviseur={selectedSuperviseur}
          setSelectedSuperviseur={setSelectedSuperviseur}
          nombreMembresParSuperviseur={nombreMembresParSuperviseur}
        />
      </div>
    </>
  );
};

export default SuperviseurDashboard;
