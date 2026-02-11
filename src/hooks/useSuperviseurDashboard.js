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

  const handleErrorRef = useRef(handleError);
  handleErrorRef.current = handleError;

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

  // Superviseurs de la famille (même pasteur)
  const [superviseursFamille, setSuperviseursFamille] = useState([]);
  const [nombreMembresParSuperviseur, setNombreMembresParSuperviseur] = useState({});

  // Phase 2 regroupée : 1 appel RPC (membres + stats + progressions + disciples + suivi_par) + 1 RPC (superviseurs + nombre par superviseur)
  useEffect(() => {
    if (!famille?.id || !userId) {
      setMembres([]);
      setStats((s) => ({ ...s, nombreMembres: 0, progression: 0, reste: s.objectif || 70 }));
      setSuperviseursFamille([]);
      setNombreMembresParSuperviseur({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const pasteurId = pasteur?.id ?? famille.pasteur_id ?? null;
        const [phase2Res, phase2ExtraRes] = await Promise.all([
          supabase.rpc('get_superviseur_dashboard_phase2', { p_user_id: userId, p_famille_id: famille.id }),
          supabase.rpc('get_superviseur_dashboard_phase2_extra', { p_user_id: userId, p_pasteur_id: pasteurId }),
        ]);

        if (cancelled) return;

        // RPC phase2 : membres + stats + progressions + disciples_count + suivi_par
        if (phase2Res.error) throw phase2Res.error;
        const phase2 = phase2Res.data;
        if (phase2) {
          const rawMembres = phase2.membres || [];
          const disciplesCountMap = phase2.membres_disciples_count || {};
          const suiviParMap = phase2.membres_suivi_par || {};
          const list = rawMembres.map((m) => {
            const id = m.id;
            return {
              id,
              first_name: m.first_name,
              last_name: m.last_name,
              email: m.email,
              role: m.role || 'disciple',
              titre: m.titre,
              created_at: m.created_at,
              avatar_url: m.avatar_url,
              mentor_id: suiviParMap[id]?.id ?? null,
              nb_disciples: typeof disciplesCountMap[id] === 'number' ? disciplesCountMap[id] : 0,
              date_entree_famille: m.date_entree_famille,
              statut_spirituel: m.statut_spirituel ?? 'actif',
            };
          });
          setMembres(list);
          const objectif = Number(phase2.stats?.objectif) ?? Number(famille.objectif_disciples) ?? 70;
          const nombreMembres = phase2.stats?.nombreMembres ?? list.length;
          const progression = Number(phase2.stats?.progression) ?? (objectif > 0 ? Math.min(100, Math.round((nombreMembres / objectif) * 100)) : 0);
          const reste = Number(phase2.stats?.reste) ?? Math.max(0, objectif - nombreMembres);
          setStats({
            nombreMembres,
            objectif,
            progression,
            reste,
            disciples: list.filter((m) => ['disciple', 'mentor', 'pilier'].includes(m.role)).length,
            sunday_attendance_count: 0,
            evangelization: 0,
          });
          setMembresProgression(phase2.membres_progression || {});
          setMembresDisciplesCount(
            Object.fromEntries(list.map((m) => [m.id, m.nb_disciples ?? 0]))
          );
          setMembresSuiviPar(phase2.membres_suivi_par || {});
        }

        // RPC phase2_extra : superviseurs (même pasteur) + nombre de membres par superviseur
        if (!cancelled && phase2ExtraRes.data && !phase2ExtraRes.error) {
          const extra = phase2ExtraRes.data;
          const sups = extra.superviseurs_famille || [];
          setSuperviseursFamille(
            sups.map((s) => ({
              id: s.id,
              superviseur_id: s.id,
              nom: [s.first_name, s.last_name].filter(Boolean).join(' ').trim() || 'Superviseur',
            }))
          );
          setNombreMembresParSuperviseur(extra.nombre_membres_par_superviseur || {});
        } else if (!cancelled && phase2ExtraRes.error) {
          // Repli : requête directe si la RPC phase2_extra n'existe pas ou échoue
          const { data: fdData } = await supabase
            .from('familles_disciples')
            .select('id, superviseur_id, nom')
            .eq('pasteur_id', pasteurId);
          const data = fdData || [];
          setSuperviseursFamille(data);
          const counts = {};
          data.forEach((f) => {
            if (f.superviseur_id) counts[f.superviseur_id] = 0;
          });
          setNombreMembresParSuperviseur(counts);
        }
      } catch (err) {
        if (!cancelled) {
          handleErrorRef.current(err, { context: 'useSuperviseurDashboard.phase2' }, 'Impossible de charger les données du dashboard.');
          // Repli : requêtes directes (profils + familles_disciples)
          try {
            const { data: membresData, error: membresError } = await supabase
              .from('profils')
              .select('id, first_name, last_name, email, role, titre, created_at, avatar_url, mentor_id, nb_disciples, date_entree_famille')
              .eq('famille_id', famille.id);
            if (!cancelled && !membresError) {
              const list = (membresData || []).map((m) => ({ ...m, statut_spirituel: m.statut_spirituel ?? 'actif' }));
              setMembres(list);
              const objectif = Number(famille.objectif_disciples) || 70;
              const nombreMembres = list.length;
              setStats({
                nombreMembres,
                objectif,
                progression: objectif > 0 ? Math.min(100, Math.round((nombreMembres / objectif) * 100)) : 0,
                reste: Math.max(0, objectif - nombreMembres),
                disciples: list.filter((m) => m.role === 'disciple' || m.role === 'mentor' || m.role === 'pilier').length,
                sunday_attendance_count: 0,
                evangelization: 0,
              });
              setMembresProgression({});
              setMembresDisciplesCount(list.reduce((acc, m) => ({ ...acc, [m.id]: m.nb_disciples ?? 0 }), {}));
              setMembresSuiviPar({});
            }
            const pasteurId = pasteur?.id ?? famille.pasteur_id;
            if (pasteurId) {
              const { data: fdData } = await supabase
                .from('familles_disciples')
                .select('id, superviseur_id, nom')
                .eq('pasteur_id', pasteurId);
              const data = fdData || [];
              setSuperviseursFamille(data || []);
              const counts = {};
              (data || []).forEach((f) => { if (f.superviseur_id) counts[f.superviseur_id] = 0; });
              setNombreMembresParSuperviseur(counts);
            }
          } catch (_) {}
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [famille?.id, famille?.objectif_disciples, famille?.pasteur_id, pasteur?.id, userId]);

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
