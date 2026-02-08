/**
 * Hook useSuperviseurDashboard – Données et état pour le tableau de bord superviseur.
 * Agrège phase 1 (famille, superviseur, pasteur), stats, membres, filtres et handlers.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useSuperviseurData } from '@/hooks/useSuperviseurData';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useMembersTable } from '@/hooks/useMembersTable';
import { supabase } from '@/lib/customSupabaseClient';

const devLog = (...args) => { if (import.meta.env.DEV) console.log(...args); };

export function useSuperviseurDashboard(user) {
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const userId = user?.id ?? null;

  // Phase 1 : famille, superviseur, pasteur
  const {
    famille,
    setFamille,
    superviseur,
    pasteur,
    setPasteur,
    loading: phase1Loading,
    refetch: refetchPhase1,
  } = useSuperviseurData(userId);

  const superviseurNom = superviseur
    ? { first_name: superviseur.first_name || '', last_name: superviseur.last_name || '', titre: superviseur.titre || '' }
    : { first_name: '', last_name: '', titre: '' };

  // Stats (nombreMembres, objectif, progression, reste)
  const [stats, setStats] = useState({
    nombreMembres: 0,
    objectif: 70,
    progression: 0,
    reste: 70,
    disciples: 0,
    sunday_attendance_count: 0,
    evangelization: 0,
  });

  // Membres de la famille + métadonnées
  const [membres, setMembres] = useState([]);
  const [membresProgression, setMembresProgression] = useState({});
  const [membresDisciplesCount, setMembresDisciplesCount] = useState({});
  const [membresSuiviPar, setMembresSuiviPar] = useState({});
  const [loading, setLoading] = useState(true);

  const tableState = useMembersTable(membres, {
    membresProgression,
    membresDisciplesCount,
    membresSuiviPar,
  });

  const {
    filteredMembres,
    paginatedMembres,
    totalPages,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    progressionFilter,
    setProgressionFilter,
    itemsPerPage,
    setItemsPerPage,
    currentPage,
    setCurrentPage,
    selectedMembres,
    setSelectedMembres,
    toggleSelectAll,
    toggleSelectMembre,
    membresProgression: _mp,
    membresSuiviPar: _msp,
  } = tableState;

  // Charger membres + stats quand famille est disponible
  useEffect(() => {
    if (!famille?.id) {
      setMembres([]);
      setStats((s) => ({ ...s, nombreMembres: 0, progression: 0, reste: s.objectif || 70 }));
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data: membresData, error: membresError } = await supabase
          .from('profils')
          .select('id, first_name, last_name, email, role, titre, created_at, avatar_url, mentor_id, nb_disciples, date_entree_famille')
          .eq('famille_id', famille.id);
        if (membresError) throw membresError;
        if (cancelled) return;
        const list = (membresData || []).map((m) => ({ ...m, statut_spirituel: m.statut_spirituel ?? 'actif' }));
        setMembres(list);
        const objectif = Number(famille.objectif_disciples) || 70;
        const nombreMembres = list.length;
        const progression = objectif > 0 ? Math.min(100, Math.round((nombreMembres / objectif) * 100)) : 0;
        const reste = Math.max(0, objectif - nombreMembres);
        setStats({
          nombreMembres,
          objectif,
          progression,
          reste,
          disciples: list.filter((m) => m.role === 'disciple' || m.role === 'mentor' || m.role === 'pilier').length,
          sunday_attendance_count: 0,
          evangelization: 0,
        });
        setMembresProgression({});
        setMembresDisciplesCount(list.reduce((acc, m) => ({ ...acc, [m.id]: m.nb_disciples ?? 0 }), {}));
        setMembresSuiviPar({});
      } catch (err) {
        if (!cancelled) handleError(err, { context: 'useSuperviseurDashboard.membres' }, 'Impossible de charger les membres.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [famille?.id, famille?.objectif_disciples, handleError]);

  // Superviseurs de la famille (même famille = même pasteur)
  const [superviseursFamille, setSuperviseursFamille] = useState([]);
  const [nombreMembresParSuperviseur, setNombreMembresParSuperviseur] = useState({});
  useEffect(() => {
    if (!famille?.id) return;
    supabase
      .from('familles_disciples')
      .select('id, superviseur_id, nom')
      .eq('pasteur_id', pasteur?.id ?? famille.pasteur_id)
      .then(({ data }) => {
        setSuperviseursFamille(data || []);
        const counts = {};
        (data || []).forEach((f) => {
          if (f.superviseur_id) counts[f.superviseur_id] = 0;
        });
        setNombreMembresParSuperviseur(counts);
      });
  }, [famille?.id, famille?.pasteur_id, pasteur?.id]);

  const initialLoading = Boolean(userId && phase1Loading);

  // Report reminder (5 jours avant fin du mois)
  const reportReminder = (() => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysLeft = Math.ceil((endOfMonth - now) / (24 * 60 * 60 * 1000));
    return {
      showReminder: daysLeft >= 0 && daysLeft <= 5,
      daysLeft: Math.max(0, daysLeft),
    };
  })();

  // Avatars
  const [familleAvatarFile, setFamilleAvatarFile] = useState(null);
  const [familleAvatarPreview, setFamilleAvatarPreview] = useState(null);
  const [uploadingFamilleAvatar, setUploadingFamilleAvatar] = useState(false);
  const [pasteurAvatarFile, setPasteurAvatarFile] = useState(null);
  const [pasteurAvatarPreview, setPasteurAvatarPreview] = useState(null);
  const [uploadingPasteurAvatar, setUploadingPasteurAvatar] = useState(false);

  // KPI période
  const currentYear = new Date().getFullYear();
  const [kpiPeriodType, setKpiPeriodType] = useState('hebdomadaire');
  const [kpiSelectedYear, setKpiSelectedYear] = useState(currentYear);
  const [kpiSelectedQuarter, setKpiSelectedQuarter] = useState('1');
  const [kpiSelectedMonth, setKpiSelectedMonth] = useState('1');
  const [kpiSelectedWeek, setKpiSelectedWeek] = useState('1');
  const [kpiSelectedYearForPeriod, setKpiSelectedYearForPeriod] = useState(String(currentYear));

  // Données graphiques / KPI
  const [chartData, setChartData] = useState([]);
  const [chartDataPreviousYear, setChartDataPreviousYear] = useState([]);
  const [formationVideoChartData, setFormationVideoChartData] = useState([]);
  const [statutsSpirituelsData, setStatutsSpirituelsData] = useState([]);
  const [kpiData, setKpiData] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [rapports, setRapports] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activiteRecente, setActiviteRecente] = useState([]);
  const [statsComparatives, setStatsComparatives] = useState(null);
  const [loadingStatsComparatives, setLoadingStatsComparatives] = useState(false);
  const [alertes, setAlertes] = useState([]);

  // Modals / sélection
  const [showSelectedModal, setShowSelectedModal] = useState(false);
  const [selectedMembreForDisciples, setSelectedMembreForDisciples] = useState(null);
  const [disciplesList, setDisciplesList] = useState([]);
  const [loadingDisciplesList, setLoadingDisciplesList] = useState(false);
  const [selectedSuperviseur, setSelectedSuperviseur] = useState(null);
  const [showAllInactifs, setShowAllInactifs] = useState(false);
  const [showAllSansProgression, setShowAllSansProgression] = useState(false);

  // Tableaux détaillés
  const [disciplesDetaille, setDisciplesDetaille] = useState([]);
  const [loadingDisciplesDetaille, setLoadingDisciplesDetaille] = useState(false);
  const [mentorsConsolides, setMentorsConsolides] = useState([]);
  const [loadingMentorsConsolides, setLoadingMentorsConsolides] = useState(false);

  // Lazy loading charts
  const [chartsLoaded, setChartsLoaded] = useState({ formationVideo: false, statutsSpirituels: false, activiteRecente: false, statsComparatives: false });
  const [statsComparativesRequested, setStatsComparativesRequested] = useState(false);
  const formationVideoRef = useRef(null);
  const statutsSpirituelsRef = useRef(null);
  const activiteRecenteRef = useRef(null);
  const statsComparativesRef = useRef(null);
  const chartsLoadedRef = useRef({ formationVideo: false, statutsSpirituels: false, activiteRecente: false, statsComparatives: false });

  const noop = useCallback(() => {}, []);
  const noopAsync = useCallback(async () => {}, []);

  return {
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
    handleRefreshMentorsConsolides: noopAsync,
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
    handleExportPDF: noop,
    handleExportExcel: noop,
    handleExportDisciplesDetailleExcel: noop,
    handleExportMentorsConsolidesExcel: noop,
    toggleSelectMembre,
    toggleSelectAll,
    handleFamilleAvatarChange: (e) => {
      const file = e?.target?.files?.[0];
      if (file) setFamilleAvatarFile(file);
    },
    handlePasteurAvatarChange: (e) => {
      const file = e?.target?.files?.[0];
      if (file) setPasteurAvatarFile(file);
    },
    uploadFamilleAvatar: noopAsync,
    uploadPasteurAvatar: noopAsync,
    fetchDisciplesOfMembre: noopAsync,
    handleExportFilteredList: noop,
    handleExportDisciplesList: noop,
    handleExportSelectedExcel: noop,
    handleExportSelectedPdf: noop,
    fetchDisciplesDetaille: noopAsync,
    fetchMentorsConsolides: noopAsync,
    generateFormationVideoChartData: noopAsync,
    calculateStatutsSpirituels: noopAsync,
    fetchActiviteRecente: noopAsync,
    fetchStatsComparatives: noopAsync,
    chartsLoadedRef,
    handleError,
    devLog,
    setDisciplesDetaille,
    setMentorsConsolides,
    setFormationVideoChartData,
    setStatutsSpirituelsData,
    setActiviteRecente,
  };
}

export default useSuperviseurDashboard;
