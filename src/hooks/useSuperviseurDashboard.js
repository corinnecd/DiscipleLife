/**
 * Hook useSuperviseurDashboard – Centralise la logique d'état et de chargement
 * du tableau de bord superviseur (phase 2, KPI, rapports, membres, exports).
 */
import { useEffect, useState, useRef } from 'react';
import { getWeek, getQuarter, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/customSupabaseClient';
import { getOrSetCache, clearCache } from '@/lib/CacheUtils';
import { useToast } from '@/components/ui/use-toast';
import { exportElementToPDF, exportToExcel } from '@/lib/ExportUtils';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useSuperviseurData } from '@/hooks/useSuperviseurData';
import performanceMonitor from '@/lib/PerformanceMonitor';
import { compressImage } from '@/lib/ImageCompression';

const PAGE_NAME = 'SuperviseurDashboard';
const LOAD_TIME_ALERT_MS = 4000;
const devLog = (...args) => { if (import.meta.env.DEV && typeof console !== 'undefined') console.log(...args); };

export function useSuperviseurDashboard(user) {
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const { famille, setFamille, superviseur, pasteur, setPasteur, loading: phase1Loading, refetch: refetchPhase1 } = useSuperviseurData(user?.id);

  const [loading, setLoading] = useState(true);
  const [superviseurNom, setSuperviseurNom] = useState({ first_name: '', last_name: '', titre: '' });
  const [stats, setStats] = useState({ nombreMembres: 0, objectif: 70, progression: 0, reste: 70 });
  const [familleAvatarFile, setFamilleAvatarFile] = useState(null);
  const [familleAvatarPreview, setFamilleAvatarPreview] = useState(null);
  const [uploadingFamilleAvatar, setUploadingFamilleAvatar] = useState(false);
  const [pasteurAvatarFile, setPasteurAvatarFile] = useState(null);
  const [pasteurAvatarPreview, setPasteurAvatarPreview] = useState(null);
  const [uploadingPasteurAvatar, setUploadingPasteurAvatar] = useState(false);
  const [reportReminder, setReportReminder] = useState(null);

  const [kpiPeriodType, setKpiPeriodType] = useState('annuel');
  const [kpiSelectedYear, setKpiSelectedYear] = useState('2025');
  const [kpiSelectedQuarter, setKpiSelectedQuarter] = useState(getQuarter(new Date()).toString());
  const [kpiSelectedMonth, setKpiSelectedMonth] = useState(new Date().getMonth().toString());
  const [kpiSelectedWeek, setKpiSelectedWeek] = useState(() => getWeek(new Date(), { weekStartsOn: 1 }).toString());
  const [kpiSelectedYearForPeriod, setKpiSelectedYearForPeriod] = useState('2025');

  const [chartData, setChartData] = useState([]);
  const [chartDataPreviousYear, setChartDataPreviousYear] = useState([]);
  const [formationVideoChartData, setFormationVideoChartData] = useState([]);
  const [statutsSpirituelsData, setStatutsSpirituelsData] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [rapports, setRapports] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const [activiteRecente, setActiviteRecente] = useState({
    inscriptionsSemaine: [], inscriptionsMois: [], inscriptionsTrimestre: [],
    dernieresInscriptions: [], derniersRapports: [], activitesFamille: []
  });
  const [statsComparatives, setStatsComparatives] = useState({ moyenneAutresFamilles: null, classement: null, totalFamilles: 0 });
  const [loadingStatsComparatives, setLoadingStatsComparatives] = useState(false);
  const [alertes, setAlertes] = useState({ disciplesInactifs: [], membresSansProgression: [] });
  const [kpiData, setKpiData] = useState({
    culteSamediSoir: 0, culteDimancheMatin: 0, afterCulteDimanche: 0, tempsPriere: 0, tempsPartage: 0,
    nouveauxConvertis: 0, nouveauxArrivants: 0, sortiesEvangelisation: 0, personnesEvangelisees: 0,
    comFratDisciples: 0, veillee: 0, meditationBible: 0, formationsTerminees: 0, formationsEnCours: 0, videosTerminees: 0
  });

  const [membres, setMembres] = useState([]);
  const [membresProgression, setMembresProgression] = useState({});
  const [membresDisciplesCount, setMembresDisciplesCount] = useState({});
  const [membresSuiviPar, setMembresSuiviPar] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [dateFilter, setDateFilter] = useState('');
  const [progressionFilter, setProgressionFilter] = useState('tous');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedMembres, setSelectedMembres] = useState([]);
  const [showSelectedModal, setShowSelectedModal] = useState(false);
  const [selectedMembreForDisciples, setSelectedMembreForDisciples] = useState(null);
  const [disciplesList, setDisciplesList] = useState([]);
  const [loadingDisciplesList, setLoadingDisciplesList] = useState(false);

  const [superviseursFamille, setSuperviseursFamille] = useState([]);
  const [nombreMembresParSuperviseur, setNombreMembresParSuperviseur] = useState({});
  const [selectedSuperviseur, setSelectedSuperviseur] = useState(null);
  const [showAllInactifs, setShowAllInactifs] = useState(false);
  const [showAllSansProgression, setShowAllSansProgression] = useState(false);

  const [disciplesDetaille, setDisciplesDetaille] = useState([]);
  const [loadingDisciplesDetaille, setLoadingDisciplesDetaille] = useState(false);
  const [mentorsConsolides, setMentorsConsolides] = useState([]);
  const [loadingMentorsConsolides, setLoadingMentorsConsolides] = useState(false);
  const [chartsLoaded, setChartsLoaded] = useState({
    formationVideo: false, statutsSpirituels: false, activiteRecente: false, statsComparatives: false
  });
  const [statsComparativesRequested, setStatsComparativesRequested] = useState(false);

  const formationVideoRef = useRef(null);
  const statutsSpirituelsRef = useRef(null);
  const activiteRecenteRef = useRef(null);
  const statsComparativesRef = useRef(null);
  const chartsLoadedRef = useRef(chartsLoaded);
  const statsComparativesLoadedForFamilleIdRef = useRef(null);
  const fetchStatsComparativesInProgressRef = useRef(false);
  const fetchSuperviseurInProgressRef = useRef(false);
  const hasInitiallyLoadedRef = useRef(false);
  const lastPhase2KeyRef = useRef(null);
  const disciplesDetailleLoadedForRef = useRef(null);

  useEffect(() => { chartsLoadedRef.current = chartsLoaded; }, [chartsLoaded]);
  useEffect(() => {
    if (superviseur) {
      setSuperviseurNom({ first_name: superviseur.first_name || '', last_name: superviseur.last_name || '', titre: superviseur.titre || '' });
    }
  }, [superviseur]);
  useEffect(() => { setFamilleAvatarPreview(famille?.avatar_url ?? null); }, [famille?.avatar_url]);
  useEffect(() => { setPasteurAvatarPreview(pasteur?.avatar_url ?? null); }, [pasteur?.avatar_url]);

  const checkNombreDisciples = (term, nombreDisciples) => {
    const t = term.trim();
    if (t.startsWith('>=') || t.startsWith('≥')) { const n = parseInt(t.substring(2).trim(), 10); return !isNaN(n) && nombreDisciples >= n; }
    if (t.startsWith('<=') || t.startsWith('≤')) { const n = parseInt(t.substring(2).trim(), 10); return !isNaN(n) && nombreDisciples <= n; }
    if (t.startsWith('>')) { const n = parseInt(t.substring(1).trim(), 10); return !isNaN(n) && nombreDisciples > n; }
    if (t.startsWith('<')) { const n = parseInt(t.substring(1).trim(), 10); return !isNaN(n) && nombreDisciples < n; }
    const num = parseInt(t, 10); if (!isNaN(num)) return nombreDisciples === num;
    return false;
  };

  const filteredMembres = membres
    .map(m => ({ ...m, nombreDisciples: membresDisciplesCount[m.id] ?? 0 }))
    .filter(m => {
      const matchSearch = !searchTerm || (m.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) || m.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) || checkNombreDisciples(searchTerm, m.nombreDisciples) || m.email?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'tous' || (statusFilter === 'actif' && m.statut_spirituel !== 'inactif') || (statusFilter === 'inactif' && m.statut_spirituel === 'inactif');
      const matchDate = !dateFilter || (m.created_at && new Date(m.created_at).toISOString().split('T')[0] === dateFilter);
      const prog = membresProgression[m.id];
      const matchProg = progressionFilter === 'tous' || (progressionFilter === 'avec' && prog && (prog.formations > 0 || prog.videos > 0)) || (progressionFilter === 'sans' && (!prog || (prog.formations === 0 && prog.videos === 0)));
      return matchSearch && matchStatus && matchDate && matchProg;
    })
    .sort((a, b) => (b.nombreDisciples || 0) - (a.nombreDisciples || 0) || `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase().localeCompare(`${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase()));

  const totalPages = Math.max(1, Math.ceil(filteredMembres.length / itemsPerPage));
  const paginatedMembres = filteredMembres.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const initialLoading = phase1Loading || (loading && !hasInitiallyLoadedRef.current);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const checkReportReminder = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = lastDay - now.getDate();
    if (daysLeft <= 5 && daysLeft >= 0) setReportReminder({ daysLeft, showReminder: true });
    else setReportReminder(null);
  };

  const updateDisciplesToMentors = async (disciplesCountMap, tousLesMembres) => {
    try {
      const toUpdate = tousLesMembres.filter(m => (disciplesCountMap[m.id] || 0) > 0 && m.role === 'disciple');
      if (toUpdate.length === 0) return;
      const promises = toUpdate.map(async (membre) => {
        const { error } = await supabase.from('profils').update({ role: 'mentor', is_approved_as_disciple_maker: true }).eq('id', membre.id);
        if (error) { handleError(error, { context: 'updateDisciplesToMentors', membreId: membre.id }, `Impossible de mettre à jour ${membre.first_name} ${membre.last_name}.`); return { success: false }; }
        return { success: true };
      });
      const results = await Promise.all(promises);
      const ok = results.filter(r => r.success).length;
      if (ok > 0) {
        toast({ title: 'Mise à jour réussie', description: `${ok} disciple(s) promus Mentor/Pilier.`, className: 'bg-green-50 border-green-200' });
        clearCache(`superviseur_${user?.id}_membres`); clearCache(`superviseur_${user?.id}_famille`);
        if (famille?.id) {
          clearCache(`superviseur_${user?.id}_phase2_membres_${famille.id}`); clearCache(`superviseur_${user?.id}_phase2_rpc_${famille.id}`);
          clearCache(`superviseur_${user?.id}_mentors_consolides_${famille.id}`); clearCache(`superviseur_${user?.id}_disciples_detaille`);
        }
        if (superviseur?.pasteur_id != null) clearCache(`superviseur_${user?.id}_phase2_extra_${superviseur.pasteur_id}`);
        clearCache(`superviseur_${user?.id}_phase2_extra_null`);
        fetchMentorsConsolides().catch(() => {});
      }
    } catch (err) {
      handleError(err, { context: 'updateDisciplesToMentors' }, 'Impossible de mettre à jour les statuts.');
    }
  };

  const fetchPhase2Data = async (familleData, superviseurData, pasteurData) => {
    if (!user?.id || !familleData) return;
    const pasteurId = superviseurData?.pasteur_id ?? null;
    const cacheKeyRpc = `superviseur_${user.id}_phase2_rpc_${familleData.id}`;
    const cacheKeyExtra = `superviseur_${user.id}_phase2_extra_${pasteurId ?? 'null'}`;
    let payload = null, extraPayload = null;
    try {
      const [phase2Result, extraResult] = await Promise.all([
        getOrSetCache(cacheKeyRpc, async () => {
          const { data, error } = await supabase.rpc('get_superviseur_dashboard_phase2', { p_user_id: user.id, p_famille_id: familleData.id });
          if (error) throw error; return data;
        }, 2 * 60 * 1000),
        getOrSetCache(cacheKeyExtra, async () => {
          const { data, error } = await supabase.rpc('get_superviseur_dashboard_phase2_extra', { p_user_id: user.id, p_pasteur_id: pasteurId });
          if (error) throw error; return data;
        }, 2 * 60 * 1000)
      ]);
      payload = phase2Result; extraPayload = extraResult;
    } catch (rpcErr) {
      try {
        payload = await getOrSetCache(cacheKeyRpc, async () => {
          const { data, error } = await supabase.rpc('get_superviseur_dashboard_phase2', { p_user_id: user.id, p_famille_id: familleData.id });
          if (error) throw error; return data;
        }, 2 * 60 * 1000);
      } catch (_) {}
    }
    let tousLesMembres = [];
    if (payload && typeof payload === 'object') {
      tousLesMembres = (payload.membres || []).map(m => ({ ...m, id: m.id, role: m.role || 'disciple', statut_spirituel: m.statut_spirituel || 'actif' }));
      setStats(payload.stats || { nombreMembres: 0, objectif: 70, progression: 0, reste: 70 });
      setMembres(tousLesMembres);
      setKpiData(prev => ({ ...prev, ...(payload.kpi_summary || {}) }));
      setMembresProgression(payload.membres_progression || {});
      setMembresDisciplesCount(payload.membres_disciples_count || {});
      setMembresSuiviPar(payload.membres_suivi_par || {});
      if (tousLesMembres.length > 0) updateDisciplesToMentors(payload.membres_disciples_count || {}, tousLesMembres).catch(() => {});
    } else {
      const cacheKeyMembres = `superviseur_${user.id}_phase2_membres_${familleData.id}`;
      const cached = await getOrSetCache(cacheKeyMembres, async () => {
        const { data: membresData, error } = await supabase.from('profils').select('id, first_name, last_name, email, avatar_url, created_at, role, mentor_id').eq('famille_id', familleData.id).order('created_at', { ascending: false });
        if (error) throw error;
        return { membresData: membresData || [], disciplesData: [] };
      }, 2 * 60 * 1000);
      if (!cached) return;
      const { membresData } = cached;
      tousLesMembres = (membresData || []).filter(p => p.id !== user.id).map(p => ({ ...p, statut_spirituel: 'actif', source: 'profils', role: p.role || 'disciple', parent_disciple_id: p.mentor_id || null }));
      const objectif = familleData.objectif_disciples || 70;
      setStats({ nombreMembres: tousLesMembres.length, objectif, progression: Math.min((tousLesMembres.length / objectif) * 100, 100), reste: Math.max(objectif - tousLesMembres.length, 0) });
      setMembres(tousLesMembres);
      if (tousLesMembres.length > 0) {
        const membreIds = tousLesMembres.map(m => m.id);
        const [progressionsRes, allProgressionsRes, videosRes, directRes] = await Promise.all([
          supabase.from('user_parcours_progression').select('id').in('user_id', membreIds),
          supabase.from('user_parcours_progression').select('id, user_id').in('user_id', membreIds),
          supabase.from('video_progress').select('disciple_id').in('disciple_id', membreIds).eq('is_completed', true),
          supabase.from('profils').select('mentor_id').in('mentor_id', membreIds)
        ]);
        const progressionIds = progressionsRes?.data?.map(p => p.id) || [];
        let formationsTermineesCount = 0, formationsEnCoursCount = 0;
        if (progressionIds.length > 0) {
          const [termRes, encoursRes] = await Promise.all([
            supabase.from('user_module_progression').select('id', { count: 'exact', head: true }).in('progression_id', progressionIds).eq('est_complete', true),
            supabase.from('user_module_progression').select('id', { count: 'exact', head: true }).in('progression_id', progressionIds).eq('est_complete', false)
          ]);
          formationsTermineesCount = termRes.count || 0; formationsEnCoursCount = encoursRes.count || 0;
        }
        const videosTermineesCount = videosRes?.data?.length || 0;
        setKpiData(prev => ({ ...prev, formationsTerminees: formationsTermineesCount, formationsEnCours: formationsEnCoursCount, videosTerminees: videosTermineesCount }));
        const progressionToUserMap = {}; (allProgressionsRes?.data || []).forEach(p => { progressionToUserMap[p.id] = p.user_id; });
        const progressionMap = {}; membreIds.forEach(mid => { progressionMap[mid] = { formations: 0, videos: 0, total: 0 }; });
        const formationsDataRes = progressionIds.length > 0 ? await supabase.from('user_module_progression').select('progression_id').in('progression_id', progressionIds).eq('est_complete', true) : { data: [] };
        (formationsDataRes?.data || []).forEach(f => { const uid = progressionToUserMap[f.progression_id]; if (uid && progressionMap[uid]) progressionMap[uid].formations += 1; });
        (videosRes?.data || []).forEach(v => { if (progressionMap[v.disciple_id]) progressionMap[v.disciple_id].videos += 1; });
        Object.keys(progressionMap).forEach(mid => { progressionMap[mid].total = progressionMap[mid].formations + progressionMap[mid].videos; });
        setMembresProgression(progressionMap);
        const disciplesCountMap = {}; tousLesMembres.forEach(m => { disciplesCountMap[m.id] = 0; });
        directRes.data?.forEach(d => { if (d.mentor_id && disciplesCountMap[d.mentor_id] !== undefined) disciplesCountMap[d.mentor_id] = (disciplesCountMap[d.mentor_id] || 0) + 1; });
        setMembresDisciplesCount(disciplesCountMap);
        updateDisciplesToMentors(disciplesCountMap, tousLesMembres).catch(() => {});
        const allProfilsData = (await supabase.from('profils').select('id, mentor_id, first_name, last_name').in('id', membreIds)).data || [];
        const profilsById = {}; allProfilsData.forEach(p => { profilsById[p.id] = p; });
        const uniqueMentorIds = [...new Set(allProfilsData.filter(p => p.mentor_id).map(p => p.mentor_id))];
        const { data: mentorsData } = uniqueMentorIds.length ? await supabase.from('profils').select('id, first_name, last_name').in('id', uniqueMentorIds) : { data: [] };
        const mentorsMap = {}; (mentorsData || []).forEach(p => { mentorsMap[p.id] = p; });
        const suiviParMap = {};
        tousLesMembres.forEach(membre => {
          const p = profilsById[membre.id];
          if (p?.mentor_id && mentorsMap[p.mentor_id]) suiviParMap[membre.id] = { name: `${mentorsMap[p.mentor_id].first_name || ''} ${mentorsMap[p.mentor_id].last_name || ''}`.trim(), id: p.mentor_id };
          else if (membre.source === 'profils' && membre.role !== 'superviseur') suiviParMap[membre.id] = { name: `${superviseurNom.first_name || ''} ${superviseurNom.last_name || ''}`.trim(), id: user.id };
        });
        setMembresSuiviPar(suiviParMap);
      }
    }
    let rapportsData = extraPayload?.rapports ?? null;
    if (rapportsData == null) {
      const { data, error } = await supabase.from('reports').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
      if (!error) rapportsData = data;
    }
    if (extraPayload?.superviseurs_famille) setSuperviseursFamille(Array.isArray(extraPayload.superviseurs_famille) ? extraPayload.superviseurs_famille : []);
    if (extraPayload?.nombre_membres_par_superviseur && typeof extraPayload.nombre_membres_par_superviseur === 'object') setNombreMembresParSuperviseur(extraPayload.nombre_membres_par_superviseur);
    setRapports(rapportsData || []);
    try { await fetchAlertes(); } catch (_) {}
    if (!extraPayload?.superviseurs_famille && superviseurData?.pasteur_id) {
      const { data: superviseursData, error: se } = await supabase.from('profils').select('id, first_name, last_name, email, avatar_url').eq('pasteur_id', superviseurData.pasteur_id).eq('role', 'superviseur').neq('id', user.id).order('first_name', { ascending: true });
      if (!se && superviseursData?.length > 0) {
        setSuperviseursFamille(superviseursData || []);
        const { data: allFamilles, error: fe } = await supabase.from('familles_disciples').select('id, superviseur_id').in('superviseur_id', superviseursData.map(s => s.id));
        const membresCountMap = {};
        if (!fe && allFamilles?.length > 0) {
          const sfMap = {}; const fIds = allFamilles.map(f => { sfMap[f.superviseur_id] = f.id; return f.id; });
          const { data: profilsCounts } = await supabase.from('profils').select('famille_id').in('famille_id', fIds);
          const membresParFamille = {}; profilsCounts?.forEach(p => { if (p.famille_id) membresParFamille[p.famille_id] = (membresParFamille[p.famille_id] || 0) + 1; });
          superviseursData.forEach(s => { membresCountMap[s.id] = sfMap[s.id] ? (membresParFamille[sfMap[s.id]] || 0) : 0; });
        }
        setNombreMembresParSuperviseur(membresCountMap);
      }
    }
  };

  const fetchAlertes = async () => {
    if (!famille || !user) return;
    const dateLimite = new Date(); dateLimite.setDate(dateLimite.getDate() - 30);
    const { data: membresInactifs } = await supabase.from('profils').select('id, first_name, last_name, last_activity, created_at').eq('famille_id', famille.id).or(`last_activity.lt.${dateLimite.toISOString()},last_activity.is.null`).order('created_at', { ascending: false });
    const { data: tousMembres } = await supabase.from('profils').select('id, first_name, last_name').eq('famille_id', famille.id);
    const allMemberIds = (tousMembres || []).map(m => m.id);
    const membresSansProgression = [];
    for (const memberId of allMemberIds) {
      const { data: memberProgressions } = await supabase.from('user_parcours_progression').select('id').eq('user_id', memberId);
      const memberProgressionIds = memberProgressions?.map(p => p.id) || [];
      let formations = 0;
      if (memberProgressionIds.length > 0) {
        const { count } = await supabase.from('user_module_progression').select('id', { count: 'exact', head: true }).in('progression_id', memberProgressionIds).eq('est_complete', true);
        formations = count || 0;
      }
      const { count: videos } = await supabase.from('video_progress').select('id', { count: 'exact', head: true }).eq('disciple_id', memberId).gt('progress_percentage', 0);
      if ((formations || 0) === 0 && (videos || 0) === 0) {
        const membre = tousMembres?.find(m => m.id === memberId);
        if (membre) membresSansProgression.push(membre);
      }
    }
    setAlertes({ disciplesInactifs: membresInactifs || [], membresSansProgression: membresSansProgression.slice(0, 10) });
  };

  useEffect(() => {
    if (!user?.id || phase1Loading || !famille?.id) return;
    const phase2Key = `${user.id}-${famille.id}`;
    if (lastPhase2KeyRef.current === phase2Key && hasInitiallyLoadedRef.current) return;
    if (fetchSuperviseurInProgressRef.current) return;
    fetchSuperviseurInProgressRef.current = true;
    lastPhase2KeyRef.current = phase2Key;
    performanceMonitor.startPageLoad(PAGE_NAME);
    setLoading(true);
    fetchPhase2Data(famille, superviseur, pasteur)
      .then(() => checkReportReminder())
      .finally(() => {
        setLoading(false);
        fetchSuperviseurInProgressRef.current = false;
        hasInitiallyLoadedRef.current = true;
        performanceMonitor.endPageLoad(PAGE_NAME);
        const pageStats = performanceMonitor.getPageStats(PAGE_NAME);
        if (pageStats?.loadTime != null && pageStats.loadTime > LOAD_TIME_ALERT_MS) {
          toast({ variant: 'destructive', title: 'Performance', description: `Le tableau de bord a mis ${Math.round(pageStats.loadTime / 1000)}s à charger.` });
        }
      });
  }, [user?.id, phase1Loading, famille?.id]);

  const generateChartData = (reportsData) => {
    if (!reportsData?.length) { setChartData([]); return; }
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const chartMap = {};
    reportsData.forEach(report => {
      const d = new Date(report.created_at);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${months[d.getMonth()]} ${d.getFullYear()}`;
      if (!chartMap[monthKey]) chartMap[monthKey] = { name: monthLabel, mois: monthKey, culteSamediSoir: 0, culteDimancheMatin: 0, afterCulteDimanche: 0, tempsPriere: 0, tempsPartage: 0, nouveauxConvertis: 0, nouveauxArrivants: 0, sortiesEvangelisation: 0, personnesEvangelisees: 0, comFratDisciples: 0, veillee: 0, meditationBible: 0 };
      const s = report.statistics_snapshot || {};
      chartMap[monthKey].culteSamediSoir += s.saturday_evening_count || 0;
      chartMap[monthKey].culteDimancheMatin += s.sunday_attendance_count || 0;
      chartMap[monthKey].afterCulteDimanche += s.after_culte_count || 0;
      chartMap[monthKey].tempsPriere += s.saturday_prayer_count || 0;
      chartMap[monthKey].tempsPartage += s.sunday_sharing_count || 0;
      chartMap[monthKey].nouveauxConvertis += s.nouveaux_convertis || 0;
      chartMap[monthKey].nouveauxArrivants += s.nouveaux_arrivants || 0;
      chartMap[monthKey].sortiesEvangelisation += s.evangelization || 0;
      chartMap[monthKey].personnesEvangelisees += s.evangelization || 0;
      chartMap[monthKey].comFratDisciples += s.com_frat_disciples || 0;
      chartMap[monthKey].veillee += s.veillee || 0;
      chartMap[monthKey].meditationBible += s.meditation_bible || 0;
    });
    const dataArray = Object.values(chartMap).sort((a, b) => a.mois.localeCompare(b.mois));
    setChartData(dataArray.slice(-12));
    const currentYear = new Date().getFullYear();
    setChartDataPreviousYear(dataArray.filter(d => parseInt(d.mois.split('-')[0], 10) === currentYear - 1));
  };

  useEffect(() => {
    if (!rapports?.length) {
      setKpiData(prev => ({ ...prev, culteSamediSoir: 0, culteDimancheMatin: 0, afterCulteDimanche: 0, tempsPriere: 0, tempsPartage: 0, nouveauxConvertis: 0, nouveauxArrivants: 0, sortiesEvangelisation: 0, personnesEvangelisees: 0, comFratDisciples: 0, veillee: 0, meditationBible: 0 }));
      return;
    }
    const selectedYear = parseInt(kpiSelectedYearForPeriod, 10) || new Date().getFullYear();
    const rapportsFiltres = rapports.filter(r => {
      const reportDate = new Date(r.created_at);
      const reportYear = r.year ?? reportDate.getFullYear();
      if (kpiPeriodType === 'annuel') return reportYear === selectedYear;
      if (kpiPeriodType === 'trimestriel') return (r.report_type === 'trimestriel' ? r.quarter === parseInt(kpiSelectedQuarter, 10) : getQuarter(reportDate) === parseInt(kpiSelectedQuarter, 10)) && reportYear === selectedYear;
      if (kpiPeriodType === 'mensuel') return (r.report_type === 'mensuel' ? r.month === parseInt(kpiSelectedMonth, 10) : reportDate.getMonth() === parseInt(kpiSelectedMonth, 10)) && reportYear === selectedYear;
      if (kpiPeriodType === 'hebdomadaire') return (r.report_type === 'hebdomadaire' ? r.week_number === parseInt(kpiSelectedWeek, 10) : getWeek(reportDate, { weekStartsOn: 1 }) === parseInt(kpiSelectedWeek, 10)) && reportYear === selectedYear;
      return false;
    });
    let culteSamediSoir = 0, culteDimancheMatin = 0, afterCulteDimanche = 0, tempsPriere = 0, tempsPartage = 0, nouveauxConvertis = 0, nouveauxArrivants = 0, sortiesEvangelisation = 0, personnesEvangelisees = 0, comFratDisciples = 0, veillee = 0, meditationBible = 0;
    rapportsFiltres.forEach(report => {
      const s = report.statistics_snapshot || {};
      culteSamediSoir += s.saturday_evening_count || 0; culteDimancheMatin += s.sunday_attendance_count || 0; afterCulteDimanche += s.after_culte_count || 0;
      tempsPriere += s.saturday_prayer_count || 0; tempsPartage += s.sunday_sharing_count || 0;
      nouveauxConvertis += s.nouveaux_convertis || 0; nouveauxArrivants += s.nouveaux_arrivants || 0;
      sortiesEvangelisation += s.evangelization || 0; personnesEvangelisees += s.evangelization || 0;
      comFratDisciples += s.com_frat_disciples || 0; veillee += s.veillee || 0; meditationBible += s.meditation_bible || 0;
    });
    setKpiData(prev => ({ ...prev, culteSamediSoir, culteDimancheMatin, afterCulteDimanche, tempsPriere, tempsPartage, nouveauxConvertis, nouveauxArrivants, sortiesEvangelisation, personnesEvangelisees, comFratDisciples, veillee, meditationBible }));
  }, [rapports, kpiPeriodType, kpiSelectedYear, kpiSelectedQuarter, kpiSelectedMonth, kpiSelectedWeek, kpiSelectedYearForPeriod]);

  useEffect(() => {
    if (rapports?.length > 0) generateChartData(rapports);
    else if (rapports?.length === 0) setChartData([]);
  }, [rapports]);

  const fetchDisciplesDetaille = async () => {
    if (!user?.id || !famille?.id) return;
    setLoadingDisciplesDetaille(true);
    try {
      const data = await getOrSetCache(`superviseur_${user.id}_disciples_detaille`, async () => {
        const { data: disciplesProfils, error: e1 } = await supabase.from('profils').select('id, first_name, last_name, spiritual_status, created_at, famille_id, mentor_id').eq('famille_id', famille.id).eq('role', 'disciple');
        if (e1) throw e1;
        if (!disciplesProfils?.length) return [];
        const out = await Promise.all(disciplesProfils.map(async (d) => {
          let mentorInfo = { prenom: '', nom: '', id: d.mentor_id };
          if (d.mentor_id) {
            const { data: mp } = await supabase.from('profils').select('id, first_name, last_name').eq('id', d.mentor_id).maybeSingle();
            if (mp) mentorInfo = { prenom: mp.first_name || '', nom: mp.last_name || '', id: mp.id };
          } else {
            const { data: mp } = await supabase.from('profils').select('id, first_name, last_name').eq('famille_id', d.famille_id).or('role.eq.mentor,is_approved_as_disciple_maker.eq.true').maybeSingle();
            if (mp) mentorInfo = { prenom: mp.first_name || '', nom: mp.last_name || '', id: mp.id };
          }
          const { data: lastPres } = await supabase.from('attendance_tracking').select('attendance_date').eq('disciple_id', d.id).eq('status', 'present').order('attendance_date', { ascending: false }).limit(1).maybeSingle();
          const dateDernierePresence = lastPres?.attendance_date ? format(new Date(lastPres.attendance_date), 'dd/MM/yyyy', { locale: fr }) : 'Jamais';
          const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const [prayers, appointments, attendance] = await Promise.all([
            supabase.from('prayer_requests').select('*', { count: 'exact', head: true }).eq('user_id', d.id).gte('created_at', thirtyDaysAgo.toISOString()),
            supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('disciple_id', d.id).gte('scheduled_date', thirtyDaysAgo.toISOString()),
            supabase.from('attendance_tracking').select('*', { count: 'exact', head: true }).eq('disciple_id', d.id).eq('status', 'present').gte('attendance_date', thirtyDaysAgo.toISOString())
          ]);
          const totalActivites = (prayers.count || 0) + (appointments.count || 0) + (attendance.count || 0);
          let niveauEngagement = 'Faible';
          if (totalActivites >= 10) niveauEngagement = 'Élevé'; else if (totalActivites >= 5) niveauEngagement = 'Moyen';
          const troisMoisAgo = new Date(); troisMoisAgo.setMonth(troisMoisAgo.getMonth() - 3);
          const isActif = lastPres?.attendance_date ? new Date(lastPres.attendance_date) >= troisMoisAgo : false;
          const today = new Date(); const lastSunday = new Date(today); lastSunday.setDate(today.getDate() - today.getDay());
          const lastSundayStr = format(lastSunday, 'yyyy-MM-dd');
          const { data: presenceDernierCulte } = await supabase.from('attendance_tracking').select('*', { count: 'exact', head: true }).eq('disciple_id', d.id).eq('attendance_type', 'sunday_worship').eq('status', 'present').eq('attendance_date', lastSundayStr);
          return { mentor_prenom: mentorInfo.prenom, mentor_nom: mentorInfo.nom, disciple_prenom: d.first_name || '', disciple_nom: d.last_name || '', statut_spirituel: d.spiritual_status || 'Non-croyant', date_ajout: d.created_at ? format(new Date(d.created_at), 'dd/MM/yyyy', { locale: fr }) : 'N/A', date_derniere_presence: dateDernierePresence, niveau_engagement: niveauEngagement, statut_actif: isActif, presence_dernier_culte: (presenceDernierCulte?.count || 0) > 0, disciple_id: d.id };
        }));
        return out;
      }, 2 * 60 * 1000);
      setDisciplesDetaille(data || []);
    } catch (err) {
      handleError(err, { context: 'fetchDisciplesDetaille' }, 'Impossible de charger les données détaillées des disciples.');
    } finally {
      setLoadingDisciplesDetaille(false);
    }
  };

  const fetchMentorsConsolides = async () => {
    if (!user?.id || !famille?.id) return;
    setLoadingMentorsConsolides(true);
    try {
      const cacheKey = `superviseur_${user.id}_mentors_consolides_${famille.id}`;
      const data = await getOrSetCache(cacheKey, async () => {
        const superviseurId = famille.superviseur_id ?? '00000000-0000-0000-0000-000000000000';
        // Tous les membres de la famille qui peuvent être mentors/piliers (hors superviseur) : role mentor/pilier, is_approved, ou nb_disciples > 0
        const { data: mentorsProfils, error: e1 } = await supabase
          .from('profils')
          .select('id, first_name, last_name, famille_id, titre, role, mentor_id, nb_disciples')
          .eq('famille_id', famille.id)
          .or('role.eq.mentor,role.eq.pilier,is_approved_as_disciple_maker.eq.true');
        if (e1) throw e1;
        const { data: extraProfils } = await supabase
          .from('profils')
          .select('id, first_name, last_name, famille_id, titre, role, mentor_id, nb_disciples')
          .eq('famille_id', famille.id)
          .gt('nb_disciples', 0);
        const seen = new Set();
        const allMentors = [];
        [...(mentorsProfils || []), ...(extraProfils || [])].forEach((p) => {
          if (p.id === superviseurId) return;
          if (seen.has(p.id)) return;
          seen.add(p.id);
          allMentors.push(p);
        });
        if (!allMentors.length) return [];
        const mentorIds = allMentors.map((m) => m.id);
        // Agrégation unique : nombre de disciples par mentor_id (source de vérité profils.mentor_id)
        const { data: disciplesRows, error: e2 } = await supabase.from('profils').select('mentor_id').in('mentor_id', mentorIds);
        if (e2) throw e2;
        const countByMentorId = {};
        mentorIds.forEach((mid) => { countByMentorId[mid] = 0; });
        (disciplesRows || []).forEach((r) => { if (r.mentor_id) countByMentorId[r.mentor_id] = (countByMentorId[r.mentor_id] || 0) + 1; });
        const suiviParNom = [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(' ').trim().toUpperCase() || (user?.email?.split('@')[0] || '—');
        const mentorIdsUniques = [...new Set(allMentors.map((p) => p.mentor_id).filter(Boolean))];
        let mentorNamesById = {};
        if (mentorIdsUniques.length > 0) {
          const { data: mentorProfils } = await supabase.from('profils').select('id, first_name, last_name').in('id', mentorIdsUniques);
          mentorNamesById = Object.fromEntries((mentorProfils || []).map((p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(' ').trim().toUpperCase() || '—']));
        }
        const statutFromTitre = (titre, role) => {
          const t = (titre || '').trim();
          if (/mentor/i.test(t) || role === 'mentor') return 'Mentor';
          if (/berger|pillier|pilier/i.test(t) || role === 'disciple_pillier') return 'Pilier';
          if (/disciple/i.test(t) || role === 'disciple') return 'Disciple';
          return 'Tutoré';
        };
        const now = new Date(); const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 }); const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });
        const allDiscipleIds = [];
        const mentorToDiscipleIds = {};
        const { data: allDisciples } = await supabase.from('profils').select('id, mentor_id').in('mentor_id', allMentors.map((m) => m.id));
        (allDisciples || []).forEach((d) => {
          if (!d.mentor_id) return;
          if (!mentorToDiscipleIds[d.mentor_id]) mentorToDiscipleIds[d.mentor_id] = [];
          mentorToDiscipleIds[d.mentor_id].push(d.id);
          allDiscipleIds.push(d.id);
        });
        let presenceByDiscipleId = {};
        let presenceSemaineByDiscipleId = {};
        if (allDiscipleIds.length > 0) {
          const [presenceRes, presenceSemaineRes] = await Promise.all([
            supabase.from('attendance_tracking').select('disciple_id').in('disciple_id', allDiscipleIds).eq('attendance_type', 'sunday_worship').eq('status', 'present'),
            supabase.from('attendance_tracking').select('disciple_id').in('disciple_id', allDiscipleIds).eq('attendance_type', 'sunday_worship').eq('status', 'present').gte('attendance_date', format(startOfCurrentWeek, 'yyyy-MM-dd')).lte('attendance_date', format(endOfCurrentWeek, 'yyyy-MM-dd'))
          ]);
          (presenceRes?.data || []).forEach((r) => { presenceByDiscipleId[r.disciple_id] = true; });
          (presenceSemaineRes?.data || []).forEach((r) => { presenceSemaineByDiscipleId[r.disciple_id] = true; });
        }
        const out = allMentors.map((mentor) => {
          const nombreDisciplesTotal = countByMentorId[mentor.id] ?? mentor.nb_disciples ?? 0;
          const avancementPourcentage = Math.min((nombreDisciplesTotal / 70) * 100, 100);
          const discipleIds = mentorToDiscipleIds[mentor.id] || [];
          const disciplesPresents = discipleIds.filter((id) => presenceByDiscipleId[id]).length;
          const presentSemaine = discipleIds.filter((id) => presenceSemaineByDiscipleId[id]).length;
          const tauxParticipationSemaine = nombreDisciplesTotal > 0 ? Math.round((presentSemaine / nombreDisciplesTotal) * 100) : 0;
          const suiviPar = mentor.mentor_id ? (mentorNamesById[mentor.mentor_id] || suiviParNom) : suiviParNom;
          const titre = mentor.titre || (mentor.role === 'mentor' ? 'Mentor' : mentor.role === 'disciple_pillier' ? 'Berger' : 'Disciple');
          const statut = nombreDisciplesTotal === 0 ? 'Disciple' : statutFromTitre(mentor.titre, mentor.role);
          return { mentor_id: mentor.id, nom: mentor.last_name || '', prenom: mentor.first_name || '', suivi_par: suiviPar || '—', eglise: famille.nom || 'N/A', titre, statut, nombre_disciples: nombreDisciplesTotal, avancement_pourcentage: Math.round(avancementPourcentage), presence_culte_samedi: 0, disciples_presents: disciplesPresents, taux_participation_semaine: tauxParticipationSemaine };
        });
        return out;
      }, 2 * 60 * 1000);
      setMentorsConsolides(data || []);
    } catch (err) {
      handleError(err, { context: 'fetchMentorsConsolides' }, 'Impossible de charger les données consolidées des mentors.');
    } finally {
      setLoadingMentorsConsolides(false);
    }
  };

  const handleRefreshMentorsConsolides = () => {
    if (famille?.id) clearCache(`superviseur_${user?.id}_mentors_consolides_${famille.id}`);
    fetchMentorsConsolides().catch(() => {});
  };

  useEffect(() => {
    if (!famille?.id || !user?.id) return;
    const key = `${user.id}-${famille.id}`;
    if (disciplesDetailleLoadedForRef.current === key) return;
    disciplesDetailleLoadedForRef.current = key;
    fetchDisciplesDetaille();
    fetchMentorsConsolides();
  }, [famille?.id, user?.id]);

  const generateFormationVideoChartData = async () => {
    if (!famille || !user) return;
    try {
      const { data: membresData } = await supabase.from('profils').select('id, created_at').eq('famille_id', famille.id);
      const allMemberIds = (membresData || []).map(m => m.id);
      if (!allMemberIds.length) { setFormationVideoChartData([]); return; }
      const { data: progressionsForChart } = await supabase.from('user_parcours_progression').select('id, user_id').in('user_id', allMemberIds);
      const progressionIdsForChart = progressionsForChart?.map(p => p.id) || [];
      const progressionToUserChartMap = {}; (progressionsForChart || []).forEach(p => { progressionToUserChartMap[p.id] = p.user_id; });
      let formationsData = [];
      if (progressionIdsForChart.length > 0) {
        const { data: formationsDataRaw } = await supabase.from('user_module_progression').select('progression_id, date_completion, created_at').in('progression_id', progressionIdsForChart).eq('est_complete', true).order('date_completion', { ascending: true });
        formationsData = (formationsDataRaw || []).map(f => ({ user_id: progressionToUserChartMap[f.progression_id], completed_at: f.date_completion, created_at: f.created_at }));
      }
      const { data: videosData } = await supabase.from('video_progress').select('disciple_id, completed_at, created_at').in('disciple_id', allMemberIds).eq('is_completed', true).order('completed_at', { ascending: true });
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      const chartMap = {};
      (formationsData || []).forEach(f => { const date = new Date(f.completed_at || f.created_at); const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; if (!chartMap[monthKey]) chartMap[monthKey] = { name: `${months[date.getMonth()]} ${date.getFullYear()}`, mois: monthKey, formations: 0, videos: 0 }; chartMap[monthKey].formations += 1; });
      (videosData || []).forEach(v => { const date = new Date(v.completed_at || v.created_at); const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; if (!chartMap[monthKey]) chartMap[monthKey] = { name: `${months[date.getMonth()]} ${date.getFullYear()}`, mois: monthKey, formations: 0, videos: 0 }; chartMap[monthKey].videos += 1; });
      setFormationVideoChartData(Object.values(chartMap).sort((a, b) => a.mois.localeCompare(b.mois)).slice(-12));
    } catch (err) { console.error('Erreur génération données formations/vidéos:', err); }
  };

  const calculateStatutsSpirituels = async () => {
    if (!famille || !user) return;
    try {
      const { data: membresData } = await supabase.from('profils').select('id').eq('famille_id', famille.id);
      const nombreMembres = (membresData || []).length;
      const statutsMap = { actif: nombreMembres, inactif: 0, nouveau_converti: 0, disciple_affermi: 0, autre: 0 };
      const colors = ['#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#6b7280'];
      const labels = { actif: 'Actifs', inactif: 'Inactifs', nouveau_converti: 'Nouveaux Convertis', disciple_affermi: 'Disciples Affermis', autre: 'Autres' };
      setStatutsSpirituelsData(Object.entries(statutsMap).filter(([, v]) => v > 0).map(([k, v], i) => ({ name: labels[k] || 'Autre', value: v, color: colors[i % colors.length] })));
    } catch (err) { console.error('Erreur calcul statuts spirituels:', err); }
  };

  const fetchActiviteRecente = async () => {
    if (!famille || !user) return;
    try {
      const maintenant = new Date(); const debutSemaine = startOfWeek(maintenant, { weekStartsOn: 1 }); const debutMois = startOfMonth(maintenant); const debutTrimestre = startOfQuarter(maintenant);
      const { data: toutesInscriptions } = await supabase.from('profils').select('id, first_name, last_name, created_at, avatar_url').eq('famille_id', famille.id).order('created_at', { ascending: false });
      const inscriptionsSemaine = (toutesInscriptions || []).filter(i => new Date(i.created_at) >= debutSemaine);
      const inscriptionsMois = (toutesInscriptions || []).filter(i => new Date(i.created_at) >= debutMois);
      const inscriptionsTrimestre = (toutesInscriptions || []).filter(i => new Date(i.created_at) >= debutTrimestre);
      const { data: rapportsRecents } = await supabase.from('reports').select('id, created_at, report_type, month, quarter, week_number, year').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
      const activites = [...(toutesInscriptions || []).slice(0, 5).map(i => ({ type: 'inscription', label: `${i.first_name} ${i.last_name} a rejoint la famille`, date: i.created_at, id: i.id, avatar: i.avatar_url })), ...(rapportsRecents || []).map(r => ({ type: 'rapport', label: `Rapport ${r.report_type} envoyé`, date: r.created_at, id: r.id }))].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
      setActiviteRecente({ inscriptionsSemaine, inscriptionsMois, inscriptionsTrimestre, dernieresInscriptions: (toutesInscriptions || []).slice(0, 5), derniersRapports: rapportsRecents || [], activitesFamille: activites });
    } catch (err) { console.error('Erreur récupération activité récente:', err); }
  };

  const fetchStatsComparatives = async () => {
    if (!famille?.id) return;
    try {
      const { data: toutesFamilles, error: fe } = await supabase.from('familles_disciples').select('id, nom, nombre_disciples_actuels, objectif_disciples, superviseur_id');
      if (fe) throw fe;
      if (!toutesFamilles?.length) { setStatsComparatives({ moyenneAutresFamilles: 0, classement: 1, totalFamilles: 0 }); return; }
      const famillesAvecStats = await Promise.all(toutesFamilles.map(async (f) => { const { count, error: pe } = await supabase.from('profils').select('id', { count: 'exact', head: true }).eq('famille_id', f.id); return { ...f, nombreMembresReel: pe ? 0 : (count || 0) }; }));
      const autresFamilles = famillesAvecStats.filter(f => f.id !== famille.id);
      const moyenne = autresFamilles.length > 0 ? Math.round(autresFamilles.reduce((s, f) => s + (f.nombreMembresReel || 0), 0) / autresFamilles.length) : 0;
      const sorted = [...famillesAvecStats].sort((a, b) => (b.nombreMembresReel || 0) - (a.nombreMembresReel || 0));
      const classement = sorted.findIndex(f => f.id === famille.id) + 1;
      setStatsComparatives({ moyenneAutresFamilles: moyenne, classement, totalFamilles: famillesAvecStats.length });
    } catch (err) {
      setStatsComparatives({ moyenneAutresFamilles: null, classement: null, totalFamilles: 0 });
    }
  };

  useEffect(() => {
    if (!statsComparativesRequested || !famille?.id || !user?.id) return;
    if (fetchStatsComparativesInProgressRef.current) return;
    if (statsComparativesLoadedForFamilleIdRef.current === famille.id) { setStatsComparativesRequested(false); return; }
    if (chartsLoadedRef.current?.statsComparatives && statsComparativesLoadedForFamilleIdRef.current !== null) { setStatsComparativesRequested(false); return; }
    let cancelled = false;
    fetchStatsComparativesInProgressRef.current = true;
    setLoadingStatsComparatives(true);
    fetchStatsComparatives().then(() => { if (!cancelled) { statsComparativesLoadedForFamilleIdRef.current = famille.id; setChartsLoaded(prev => ({ ...prev, statsComparatives: true })); } }).finally(() => { fetchStatsComparativesInProgressRef.current = false; setLoadingStatsComparatives(false); if (!cancelled) setStatsComparativesRequested(false); });
    return () => { cancelled = true; };
  }, [statsComparativesRequested, famille?.id, user?.id]);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportElementToPDF('superviseur-dashboard-content', `dashboard_superviseur_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.pdf`);
      toast({ title: 'Export réussi', description: 'Le PDF a été téléchargé.', className: 'bg-green-50 border-green-200' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'exporter le PDF." });
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const exportData = membres.map(m => ({ 'Nom': `${m.first_name} ${m.last_name}`, 'Email': m.email || '', 'Statut spirituel': m.statut_spirituel === 'inactif' ? 'Inactif' : 'Actif', "Date d'inscription": m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy', { locale: fr }) : '-' }));
      if (!exportData.length) { toast({ variant: 'destructive', title: 'Aucune donnée', description: 'Aucun membre à exporter.' }); return; }
      exportToExcel(exportData, `dashboard_superviseur_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}`);
      toast({ title: 'Export réussi', description: 'Le fichier CSV a été téléchargé.', className: 'bg-green-50 border-green-200' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'exporter le CSV." });
    }
  };

  const handleExportDisciplesDetailleExcel = () => {
    try {
      const exportData = disciplesDetaille.map(d => ({ 'Prénom Pilier': d.mentor_prenom || '', 'Nom Pilier': d.mentor_nom || '', 'Prénom Disciple': d.disciple_prenom || '', 'Nom Disciple': d.disciple_nom || '', 'Statut spirituel': d.statut_spirituel || '', "Date d'ajout": d.date_ajout || '', 'Date dernière présence': d.date_derniere_presence || '', "Niveau d'engagement": d.niveau_engagement || '', 'Statut (Actif/Inactif)': d.statut_actif ? 'Actif' : 'Inactif', 'Présence dernier culte': d.presence_dernier_culte ? 'Oui' : 'Non' }));
      if (!exportData.length) { toast({ variant: 'destructive', title: 'Export impossible', description: 'Aucun disciple à exporter.' }); return; }
      exportToExcel(exportData, `superviseur_tableau_disciples_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}`, { title: 'Tableau détaillé des disciples – Dashboard Superviseur', description: '10 colonnes', author: 'DiscipleLife' });
      toast({ title: 'Export réussi', description: `${exportData.length} disciple(s) exporté(s).`, className: 'bg-green-50 border-green-200' });
    } catch (err) {
      handleError(err, { context: 'handleExportDisciplesDetailleExcel' }, "Impossible d'exporter le tableau des disciples.");
    }
  };

  const handleExportMentorsConsolidesExcel = () => {
    try {
      const exportData = mentorsConsolides.map(m => ({ 'Nom': m.nom || '', 'Prénom': m.prenom || '', 'Suivi par': m.suivi_par || '—', 'Famille': m.eglise || '', 'Nombre de disciples': m.nombre_disciples ?? 0, 'Avancement % (objectif 70)': m.avancement_pourcentage != null ? m.avancement_pourcentage : '', 'Présence Culte Samedi': m.presence_culte_samedi != null ? m.presence_culte_samedi : '', 'Présence Culte Dimanche': m.disciples_presents != null ? m.disciples_presents : '', 'Taux participation semaine (%)': m.taux_participation_semaine != null ? m.taux_participation_semaine : '', 'Statut': m.statut || 'Disciple' }));
      if (!exportData.length) { toast({ variant: 'destructive', title: 'Export impossible', description: 'Aucun mentor à exporter.' }); return; }
      exportToExcel(exportData, `superviseur_mentors_consolides_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}`, { title: 'Tableau consolidé mentors (piliers)', author: 'DiscipleLife' });
      toast({ title: 'Export réussi', description: `${exportData.length} mentor(s) exporté(s).`, className: 'bg-green-50 border-green-200' });
    } catch (err) {
      handleError(err, { context: 'handleExportMentorsConsolidesExcel' }, "Impossible d'exporter le tableau des mentors.");
    }
  };

  const toggleSelectMembre = (membreId) => {
    setSelectedMembres(prev => prev.includes(membreId) ? prev.filter(id => id !== membreId) : [...prev, membreId]);
  };

  const toggleSelectAll = () => {
    setSelectedMembres(selectedMembres.length === paginatedMembres.length ? [] : paginatedMembres.map(m => m.id));
  };

  const handleFamilleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) { setFamilleAvatarFile(file); setFamilleAvatarPreview(URL.createObjectURL(file)); }
  };

  const handlePasteurAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) { setPasteurAvatarFile(file); setPasteurAvatarPreview(URL.createObjectURL(file)); }
  };

  const uploadFamilleAvatar = async () => {
    if (!familleAvatarFile || !famille) return;
    setUploadingFamilleAvatar(true);
    try {
      const compressed = await compressImage(familleAvatarFile, { maxWidth: 300, maxHeight: 300, quality: 0.85 });
      const fileName = `famille-avatars/${famille.id}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('resources').upload(fileName, compressed);
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from('resources').getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('familles_disciples').update({ avatar_url: publicData.publicUrl }).eq('id', famille.id);
      if (updateError) throw updateError;
      setFamilleAvatarPreview(publicData.publicUrl); setFamilleAvatarFile(null);
      toast({ title: 'Succès', description: 'Photo de la famille mise à jour.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de télécharger la photo.' });
    } finally {
      setUploadingFamilleAvatar(false);
    }
  };

  const uploadPasteurAvatar = async () => {
    if (!pasteurAvatarFile || !pasteur) return;
    setUploadingPasteurAvatar(true);
    try {
      const compressed = await compressImage(pasteurAvatarFile, { maxWidth: 300, maxHeight: 300, quality: 0.85 });
      const fileName = `pasteur-avatars/${pasteur.id}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('resources').upload(fileName, compressed);
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from('resources').getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('profils').update({ avatar_url: publicData.publicUrl }).eq('id', pasteur.id);
      if (updateError) throw updateError;
      setPasteurAvatarPreview(publicData.publicUrl); setPasteurAvatarFile(null);
      refetchPhase1();
      toast({ title: 'Succès', description: 'Photo du pasteur mise à jour.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de télécharger la photo.' });
    } finally {
      setUploadingPasteurAvatar(false);
    }
  };

  const fetchDisciplesOfMembre = async (membreId, membreName) => {
    if (!membreId) return;
    setLoadingDisciplesList(true);
    setSelectedMembreForDisciples({ id: membreId, name: membreName });
    try {
      const { data: disciplesData, error: disciplesError } = await supabase.from('profils').select('id, first_name, last_name, email, avatar_url, circle_type, created_at, mentor_id').eq('mentor_id', membreId).order('created_at', { ascending: false });
      if (disciplesError) throw disciplesError;
      if (!disciplesData?.length) { setDisciplesList([]); return; }
      const disciplesIds = disciplesData.map(d => d.id);
      const { data: sousDisciplesData } = await supabase.from('profils').select('mentor_id').in('mentor_id', disciplesIds);
      const disciplesSuivisMap = {};
      (sousDisciplesData || []).forEach(sd => { if (sd.mentor_id) disciplesSuivisMap[sd.mentor_id] = (disciplesSuivisMap[sd.mentor_id] || 0) + 1; });
      setDisciplesList(disciplesData.map(d => ({ ...d, first_name: d.first_name || '', last_name: d.last_name || '', name: `${d.first_name || ''} ${d.last_name || ''}`.trim(), email: d.email || null, avatar_url: d.avatar_url || null, circle_type: d.circle_type || null, created_at: d.created_at || null, disciplesSuivis: disciplesSuivisMap[d.id] || 0 })));
    } catch (err) {
      setDisciplesList([]);
    } finally {
      setLoadingDisciplesList(false);
    }
  };

  const handleExportFilteredList = async (format) => {
    try {
      if (!membres?.length) { toast({ title: 'Aucune donnée', description: 'Aucun membre disponible.', variant: 'destructive' }); return; }
      if (!filteredMembres?.length) { toast({ title: 'Aucune donnée', description: 'Aucun membre ne correspond aux filtres.', variant: 'destructive' }); return; }
      const exportData = filteredMembres.map(m => ({ 'Prénom': m.first_name || '', 'Nom': m.last_name || '', 'Email': m.email || '', 'Statut': m.statut_spirituel === 'inactif' ? 'Inactif' : 'Actif', 'Nombre de Disciples': m.nombreDisciples || 0, 'Formations terminées': membresProgression[m.id]?.formations || 0, 'Vidéos terminées': membresProgression[m.id]?.videos || 0, 'Total progression': membresProgression[m.id]?.total || 0, 'Suivi par': membresSuiviPar[m.id]?.name || '-', "Date d'inscription": m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy', { locale: fr }) : '' }));
      const filename = `membres_famille_${famille?.nom || 'export'}_${format(new Date(), 'yyyy-MM-dd', { locale: fr })}`;
      if (format === 'pdf') {
        const uniqueId = `pdf-export-${Date.now()}`;
        const tempDiv = document.createElement('div');
        tempDiv.id = uniqueId;
        tempDiv.style.cssText = 'position:absolute;left:-9999px;width:800px;padding:20px;background:#fff';
        tempDiv.innerHTML = `<div style="font-family:Arial"><h2>Liste des Membres - ${famille?.nom || 'Famille'}</h2><p>Exporté le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p><p>Total: ${filteredMembres.length} membre(s)</p><table style="width:100%;border-collapse:collapse;border:1px solid #ddd"><thead><tr style="background:#f3f4f6">${['Prénom','Nom','Email','Statut','Disciples','Progression','Suivi par','Date'].map(h=>`<th style="padding:10px;border:1px solid #ddd">${h}</th>`).join('')}</tr></thead><tbody>${filteredMembres.map(m=>`<tr><td style="padding:8px;border:1px solid #ddd">${m.first_name||''}</td><td style="padding:8px;border:1px solid #ddd">${m.last_name||''}</td><td style="padding:8px;border:1px solid #ddd">${m.email||'-'}</td><td style="padding:8px;border:1px solid #ddd">${m.statut_spirituel==='inactif'?'Inactif':'Actif'}</td><td style="padding:8px;border:1px solid #ddd">${m.nombreDisciples||0}</td><td style="padding:8px;border:1px solid #ddd">${membresProgression[m.id]?.total||0}</td><td style="padding:8px;border:1px solid #ddd">${membresSuiviPar[m.id]?.name||'-'}</td><td style="padding:8px;border:1px solid #ddd">${m.created_at?format(new Date(m.created_at),'dd/MM/yyyy',{locale:fr}):'-'}</td></tr>`).join('')}</tbody></table></div>`;
        document.body.appendChild(tempDiv);
        await new Promise(r=>setTimeout(r,100));
        await exportElementToPDF(uniqueId, `${filename}.pdf`, { title: 'Liste des Membres de la Famille', subtitle: famille ? `Famille: ${famille.nom}` : '', showHeader: true, showFooter: true, additionalInfo: { 'Superviseur': `${superviseurNom.first_name} ${superviseurNom.last_name}`, 'Nombre de membres': filteredMembres.length, 'Filtres appliqués': searchTerm || statusFilter !== 'tous' || dateFilter || progressionFilter !== 'tous' ? 'Oui' : 'Non' } });
        document.body.removeChild(tempDiv);
      } else {
        exportToExcel(exportData, filename, { title: 'Liste des Membres de la Famille', description: famille ? `Famille: ${famille.nom}` : '', additionalInfo: { 'Superviseur': `${superviseurNom.first_name} ${superviseurNom.last_name}`, 'Nombre de membres': filteredMembres.length.toString(), 'Filtres appliqués': searchTerm || statusFilter !== 'tous' || dateFilter || progressionFilter !== 'tous' ? 'Oui' : 'Non' } });
      }
      toast({ title: 'Export réussi', description: `La liste a été exportée en ${format.toUpperCase()}` });
    } catch (err) {
      toast({ title: 'Erreur', description: err?.message || "Impossible d'exporter la liste", variant: 'destructive' });
    }
  };

  const handleExportDisciplesList = async (format) => {
    if (!selectedMembreForDisciples || !disciplesList?.length) return;
    try {
      const exportData = disciplesList.map(d => ({ 'Prénom': d.first_name || '', 'Nom': d.last_name || '', 'Email': d.email || '', 'Type de cercle': d.circle_type || '', 'Disciples suivis': d.disciplesSuivis || 0, "Date d'ajout": d.created_at ? format(new Date(d.created_at), 'dd/MM/yyyy', { locale: fr }) : '' }));
      const filename = `disciples_${selectedMembreForDisciples.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd', { locale: fr })}`;
      if (format === 'pdf') {
        const uniqueId = `pdf-export-disciples-${Date.now()}`;
        const tempDiv = document.createElement('div');
        tempDiv.id = uniqueId;
        tempDiv.style.cssText = 'position:absolute;left:-9999px;width:800px;padding:20px;background:#fff';
        tempDiv.innerHTML = `<div style="font-family:Arial"><h2>Disciples de ${selectedMembreForDisciples.name}</h2><p>Exporté le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p><p>Total: ${disciplesList.length} disciple(s)</p><table style="width:100%;border-collapse:collapse;border:1px solid #ddd"><thead><tr style="background:#f3f4f6">${['Prénom','Nom','Email','Type','Disciples suivis'].map(h=>`<th style="padding:10px;border:1px solid #ddd">${h}</th>`).join('')}</tr></thead><tbody>${disciplesList.map(d=>`<tr><td style="padding:8px;border:1px solid #ddd">${d.first_name||''}</td><td style="padding:8px;border:1px solid #ddd">${d.last_name||''}</td><td style="padding:8px;border:1px solid #ddd">${d.email||'-'}</td><td style="padding:8px;border:1px solid #ddd">${d.circle_type||'-'}</td><td style="padding:8px;border:1px solid #ddd">${d.disciplesSuivis||0}</td></tr>`).join('')}</tbody></table></div>`;
        document.body.appendChild(tempDiv);
        await exportElementToPDF(uniqueId, `disciples_${selectedMembreForDisciples.name.replace(/\s+/g, '_')}`, { title: `Disciples de ${selectedMembreForDisciples.name}`, subtitle: 'Liste des disciples suivis par ce membre', showHeader: true, showFooter: true, additionalInfo: { 'Nombre de disciples': disciplesList.length.toString(), 'Membre suivi': selectedMembreForDisciples.name } });
        document.body.removeChild(tempDiv);
      } else {
        exportToExcel(exportData, filename, { title: `Disciples de ${selectedMembreForDisciples.name}`, description: 'Liste des disciples suivis par ce membre', additionalInfo: { 'Nombre de disciples': disciplesList.length.toString(), 'Membre suivi': selectedMembreForDisciples.name } });
      }
      toast({ title: 'Export réussi', description: `La liste des disciples a été exportée en ${format.toUpperCase()}` });
    } catch (err) {
      toast({ title: 'Erreur', description: "Impossible d'exporter la liste", variant: 'destructive' });
    }
  };

  const handleExportSelectedExcel = () => {
    const selectedData = filteredMembres.filter(m => selectedMembres.includes(m.id));
    const exportData = selectedData.map(m => ({ 'Prénom': m.first_name || '', 'Nom': m.last_name || '', 'Email': m.email || '', 'Statut': m.statut_spirituel === 'inactif' ? 'Inactif' : 'Actif', 'Nombre de Disciples': m.nombreDisciples || 0, 'Formations terminées': membresProgression[m.id]?.formations || 0, 'Vidéos terminées': membresProgression[m.id]?.videos || 0, 'Total progression': membresProgression[m.id]?.total || 0, "Date d'inscription": m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy', { locale: fr }) : '' }));
    exportToExcel(exportData, `membres_selectionnes_${format(new Date(), 'yyyy-MM-dd', { locale: fr })}`);
    toast({ title: 'Export réussi', description: `${selectedMembres.length} membre(s) exporté(s)` });
  };

  const handleExportSelectedPdf = async () => {
    try {
      const selectedData = filteredMembres.filter(m => selectedMembres.includes(m.id));
      const uniqueId = `pdf-export-${Date.now()}`;
      const tempDiv = document.createElement('div');
      tempDiv.id = uniqueId;
      tempDiv.style.cssText = 'position:absolute;left:-9999px;width:800px;padding:20px;background:#fff';
      tempDiv.innerHTML = `<div style="font-family:Arial"><h2>Membres Sélectionnés - ${famille?.nom || 'Famille'}</h2><p>Exporté le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p><p>Total: ${selectedData.length} membre(s)</p><table style="width:100%;border-collapse:collapse;border:1px solid #ddd"><thead><tr style="background:#f3f4f6">${['Prénom','Nom','Email','Statut','Disciples','Progression','Date'].map(h=>`<th style="padding:10px;border:1px solid #ddd">${h}</th>`).join('')}</tr></thead><tbody>${selectedData.map(m=>`<tr><td style="padding:8px;border:1px solid #ddd">${m.first_name||''}</td><td style="padding:8px;border:1px solid #ddd">${m.last_name||''}</td><td style="padding:8px;border:1px solid #ddd">${m.email||'-'}</td><td style="padding:8px;border:1px solid #ddd">${m.statut_spirituel==='inactif'?'Inactif':'Actif'}</td><td style="padding:8px;border:1px solid #ddd">${m.nombreDisciples||0}</td><td style="padding:8px;border:1px solid #ddd">${membresProgression[m.id]?.total||0}</td><td style="padding:8px;border:1px solid #ddd">${m.created_at?format(new Date(m.created_at),'dd/MM/yyyy',{locale:fr}):'-'}</td></tr>`).join('')}</tbody></table></div>`;
      document.body.appendChild(tempDiv);
      await exportElementToPDF(uniqueId, `membres_selectionnes_${format(new Date(), 'yyyy-MM-dd', { locale: fr })}.pdf`);
      document.body.removeChild(tempDiv);
      toast({ title: 'Export réussi', description: `${selectedMembres.length} membre(s) exporté(s) en PDF` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'exporter en PDF." });
    }
  };

  return {
    phase1Loading,
    loading,
    initialLoading: initialLoading,
    hasInitiallyLoadedRef,
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
    setStats,
    setMembres,
    setKpiData,
    setMembresProgression,
    setMembresDisciplesCount,
    setMembresSuiviPar,
    setRapports,
    setSuperviseursFamille,
    setNombreMembresParSuperviseur,
    setReportReminder,
    setChartData,
    setChartDataPreviousYear,
    setFormationVideoChartData,
    setStatutsSpirituelsData,
    setActiviteRecente,
    setStatsComparatives,
    setAlertes,
    setDisciplesDetaille,
    setMentorsConsolides,
    setLoading,
    setFamilleAvatarFile,
    setFamilleAvatarPreview,
    setPasteurAvatarFile,
    setPasteurAvatarPreview,
    setLoadingDisciplesList,
    setDisciplesList,
    user,
    handleError,
    devLog,
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
    handleRefreshMentorsConsolides,
    generateFormationVideoChartData,
    calculateStatutsSpirituels,
    fetchActiviteRecente,
    fetchStatsComparatives,
    chartsLoadedRef,
  };
}
