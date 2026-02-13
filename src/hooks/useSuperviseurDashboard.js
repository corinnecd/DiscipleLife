/**
 * Hook useSuperviseurDashboard – Données et état pour le tableau de bord superviseur.
 * Agrège phase 1 (famille, superviseur, pasteur), stats, membres, filtres et handlers.
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { useSuperviseurData } from '@/hooks/useSuperviseurData';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useMembersTable } from '@/hooks/useMembersTable';
import { supabase } from '@/lib/customSupabaseClient';
import { getOrSetCache } from '@/lib/CacheUtils';
import { exportToExcel, exportElementToPDF } from '@/lib/ExportUtils';

const PHASE2_CACHE_TTL_MS = 90 * 1000; // 1 min 30 — données dashboard superviseur

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
        const cacheKey = `superviseur_dashboard_phase2_${userId}_${famille.id}_${pasteurId ?? 'null'}`;
        const { phase2Res, phase2ExtraRes } = await getOrSetCache(
          cacheKey,
          async () => {
            const [p2, p2e] = await Promise.all([
              supabase.rpc('get_superviseur_dashboard_phase2', { p_user_id: userId, p_famille_id: famille.id }),
              supabase.rpc('get_superviseur_dashboard_phase2_extra', { p_user_id: userId, p_pasteur_id: pasteurId }),
            ]);
            if (p2.error) throw p2.error;
            return { phase2Res: p2, phase2ExtraRes: p2e };
          },
          PHASE2_CACHE_TTL_MS
        );

        if (cancelled) return;

        // RPC phase2 : membres + stats + progressions + disciples_count + suivi_par
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

  // Tableau détaillé « Mes disciples » (10 colonnes) : dérivé des membres + suivi par
  const disciplesDetaille = useMemo(() => {
    const list = membres || [];
    const suiviPar = membresSuiviPar || {};
    const progression = membresProgression || {};
    return list.map((m) => {
      const suivi = suiviPar[m.id];
      const nameParts = (suivi?.name || '').trim().split(/\s+/);
      const mentorPrenom = nameParts[0] || '—';
      const mentorNom = nameParts.length > 1 ? nameParts.slice(1).join(' ') : (nameParts[0] ? '—' : '—');
      const dateEntree = m.date_entree_famille || m.created_at;
      const dateAjout = dateEntree
        ? (() => { try { return format(new Date(dateEntree), 'dd/MM/yyyy', { locale: fr }); } catch (_) { return '—'; } })()
        : '—';
      const totalProg = progression[m.id]?.total ?? 0;
      const niveauEngagement = totalProg > 5 ? 'Élevé' : totalProg > 0 ? 'Moyen' : 'À évaluer';
      return {
        disciple_id: m.id,
        mentor_prenom: suivi ? mentorPrenom : '—',
        mentor_nom: suivi ? mentorNom : '—',
        disciple_prenom: m.first_name ?? '',
        disciple_nom: m.last_name ?? '',
        statut_spirituel: m.statut_spirituel || m.spiritual_stage || 'Non renseigné',
        date_ajout: dateAjout,
        date_derniere_presence: '—',
        niveau_engagement: niveauEngagement,
        statut_actif: m.statut_spirituel !== 'inactif',
        presence_dernier_culte: false,
      };
    });
  }, [membres, membresSuiviPar, membresProgression]);

  const [loadingDisciplesDetaille, setLoadingDisciplesDetaille] = useState(false);

  // Vue consolidée des mentors (piliers) : membres avec au moins 1 disciple ou rôle mentor/pilier
  const mentorsConsolides = useMemo(() => {
    const list = membres || [];
    const counts = membresDisciplesCount || {};
    const suiviPar = membresSuiviPar || {};
    const nomFamille = famille?.nom ?? '—';
    const objectif = 70;
    return list
      .filter((m) => {
        const nb = counts[m.id] ?? m.nb_disciples ?? 0;
        const role = (m.role || '').toLowerCase();
        return nb > 0 || role === 'mentor' || role === 'pilier';
      })
      .map((m) => {
        const nb = counts[m.id] ?? m.nb_disciples ?? 0;
        const avancement = objectif > 0 ? Math.min(100, Math.round((Number(nb) / objectif) * 100)) : 0;
        const suivi = suiviPar[m.id];
        const role = m.role || 'disciple';
        const statutLabel = role === 'pilier' ? 'Pilier' : role === 'mentor' ? 'Mentor' : nb > 0 ? 'Mentor' : 'Disciple';
        return {
          mentor_id: m.id,
          nom: m.last_name ?? '',
          prenom: m.first_name ?? '',
          suivi_par: suivi?.name ?? '—',
          eglise: nomFamille,
          nombre_disciples: nb,
          avancement_pourcentage: avancement,
          presence_culte_samedi: null,
          disciples_presents: null,
          taux_participation_semaine: null,
          statut: statutLabel,
        };
      })
      .sort((a, b) => (b.nombre_disciples ?? 0) - (a.nombre_disciples ?? 0));
  }, [membres, membresDisciplesCount, membresSuiviPar, famille?.nom]);

  const [loadingMentorsConsolides, setLoadingMentorsConsolides] = useState(false);

  // Lazy loading charts
  const [chartsLoaded, setChartsLoaded] = useState({ formationVideo: false, statutsSpirituels: false, activiteRecente: false, statsComparatives: false });
  const [statsComparativesRequested, setStatsComparativesRequested] = useState(false);
  const formationVideoRef = useRef(null);
  const statutsSpirituelsRef = useRef(null);
  const activiteRecenteRef = useRef(null);
  const statsComparativesRef = useRef(null);
  const chartsLoadedRef = useRef({ formationVideo: false, statutsSpirituels: false, activiteRecente: false, statsComparatives: false });

  // Garder chartsLoadedRef synchronisé avec chartsLoaded pour éviter que l'IntersectionObserver ne redéclenche en boucle
  useEffect(() => {
    chartsLoadedRef.current = chartsLoaded;
  }, [chartsLoaded]);

  // Charger les stats comparatives une seule fois à la demande (visible) — évite boucle / re-renders en cascade
  useEffect(() => {
    if (!statsComparativesRequested || !famille?.id) return;
    let cancelled = false;
    setLoadingStatsComparatives(true);
    (async () => {
      try {
        // Chargement minimal : pas de RPC dédiée pour l'instant ; on marque comme chargé pour stopper les re-demandes
        if (!cancelled) {
          setStatsComparatives({});
          setChartsLoaded((prev) => ({ ...prev, statsComparatives: true }));
          chartsLoadedRef.current = { ...chartsLoadedRef.current, statsComparatives: true };
          setStatsComparativesRequested(false);
        }
      } finally {
        if (!cancelled) setLoadingStatsComparatives(false);
      }
    })();
    return () => { cancelled = true; };
  }, [statsComparativesRequested, famille?.id]);

  const noop = useCallback(() => {}, []);
  const noopAsync = useCallback(async () => {}, []);

  const handleExportDisciplesDetailleExcel = useCallback(() => {
    if (!disciplesDetaille?.length) {
      toast({ variant: 'destructive', title: 'Export impossible', description: 'Aucun disciple à exporter.' });
      return;
    }
    try {
      const exportData = disciplesDetaille.map((d) => ({
        'Prénom pilier (mentor)': d.mentor_prenom,
        'Nom pilier (mentor)': d.mentor_nom,
        'Prénom disciple': d.disciple_prenom,
        'Nom disciple': d.disciple_nom,
        'Statut spirituel': d.statut_spirituel,
        "Date d'ajout": d.date_ajout,
        'Date dernière présence': d.date_derniere_presence,
        "Niveau d'engagement": d.niveau_engagement,
        'Statut (Actif/Inactif)': d.statut_actif ? 'Actif' : 'Inactif',
        'Présence dernier culte': d.presence_dernier_culte ? 'Oui' : 'Non',
      }));
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      exportToExcel(exportData, `superviseur_tableau_disciples_${timestamp}`, {
        title: 'Tableau détaillé des disciples – Superviseur',
        description: 'Prénom/Nom pilier (mentor), Prénom/Nom disciple, Statut spirituel, Date d\'ajout, Date dernière présence, Niveau d\'engagement, Statut Actif/Inactif, Présence dernier culte',
        author: 'DiscipleLife',
      });
      toast({ title: 'Export réussi', description: `${exportData.length} disciple(s) exporté(s).` });
    } catch (err) {
      handleError(err, { context: 'handleExportDisciplesDetailleExcel' }, 'Impossible d\'exporter le tableau des disciples.');
    }
  }, [disciplesDetaille, toast, handleError]);

  const handleExportMentorsConsolidesExcel = useCallback(() => {
    if (!mentorsConsolides?.length) {
      toast({ variant: 'destructive', title: 'Export impossible', description: 'Aucun mentor à exporter.' });
      return;
    }
    try {
      const exportData = mentorsConsolides.map((m) => ({
        'Nom': m.nom,
        'Prénom': m.prenom,
        'Suivi par': m.suivi_par ?? '—',
        'Famille (Église)': m.eglise,
        'Nombre de disciples': m.nombre_disciples ?? 0,
        'Avancement % (objectif 70)': m.avancement_pourcentage ?? 0,
        'Nombre de disciples présents': m.disciples_presents != null ? m.disciples_presents : '—',
        'Taux participation semaine (%)': m.taux_participation_semaine != null ? m.taux_participation_semaine : '—',
        'Statut': m.statut ?? '—',
      }));
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      exportToExcel(exportData, `superviseur_mentors_piliers_${timestamp}`, {
        title: 'Tableau consolidé des mentors (Piliers) – Superviseur',
        description: 'Nom, Prénom, Suivi par, Famille, Nombre de disciples, Avancement %, Disciples présents, Taux participation, Statut',
        author: 'DiscipleLife',
      });
      toast({ title: 'Export réussi', description: `${exportData.length} mentor(s) exporté(s).` });
    } catch (err) {
      handleError(err, { context: 'handleExportMentorsConsolidesExcel' }, 'Impossible d\'exporter le tableau des mentors.');
    }
  }, [mentorsConsolides, toast, handleError]);

  const safeFormatDate = useCallback((dateVal, fmt, opts) => {
    try { if (!dateVal) return ''; return format(new Date(dateVal), fmt, opts); } catch (_) { return ''; }
  }, []);

  const handleExportPDF = useCallback(async () => {
    setExporting(true);
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      await exportElementToPDF('superviseur-dashboard-content', `dashboard_superviseur_${timestamp}.pdf`);
      toast({ title: 'Export PDF réussi', description: 'Le tableau de bord a été exporté en PDF.' });
    } catch (err) {
      handleError(err, { context: 'handleExportPDF' }, 'Impossible d\'exporter le tableau de bord en PDF.');
    } finally {
      setExporting(false);
    }
  }, [toast, handleError]);

  const handleExportExcel = useCallback(() => {
    const list = filteredMembres || [];
    if (!list.length) {
      toast({ variant: 'destructive', title: 'Export impossible', description: 'Aucun membre à exporter avec les filtres actuels.' });
      return;
    }
    const exportData = list.map((m) => ({
      'Prénom': m.first_name || '',
      'Nom': m.last_name || '',
      'Email': m.email || '',
      'Statut': m.statut_spirituel === 'inactif' ? 'Inactif' : 'Actif',
      'Nombre de Disciples': membresDisciplesCount[m.id] ?? m.nb_disciples ?? 0,
      'Formations terminées': membresProgression[m.id]?.formations ?? 0,
      'Vidéos terminées': membresProgression[m.id]?.videos ?? 0,
      'Total progression': membresProgression[m.id]?.total ?? 0,
      'Suivi par': membresSuiviPar[m.id]?.name || '—',
      "Date d'inscription": m.created_at ? safeFormatDate(m.created_at, 'dd/MM/yyyy', { locale: fr }) : '',
    }));
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    try {
      exportToExcel(exportData, `superviseur_membres_famille_${timestamp}`, {
        title: 'Membres de la famille – Superviseur',
        description: 'Liste des membres (filtres appliqués)',
        additionalInfo: { 'Nombre de membres': list.length.toString() },
      });
      toast({ title: 'Export réussi', description: `${list.length} membre(s) exporté(s).` });
    } catch (err) {
      handleError(err, { context: 'handleExportExcel' }, 'Impossible d\'exporter la liste des membres.');
    }
  }, [filteredMembres, membresDisciplesCount, membresProgression, membresSuiviPar, toast, handleError, safeFormatDate]);

  const handleExportFilteredList = useCallback((formatExport) => {
    const list = filteredMembres || [];
    if (!list.length) {
      toast({ variant: 'destructive', title: 'Aucune donnée', description: 'Aucun membre ne correspond aux filtres.' });
      return;
    }
    const exportData = list.map((m) => ({
      'Prénom': m.first_name || '',
      'Nom': m.last_name || '',
      'Email': m.email || '',
      'Statut': m.statut_spirituel === 'inactif' ? 'Inactif' : 'Actif',
      'Nombre de Disciples': membresDisciplesCount[m.id] ?? m.nb_disciples ?? 0,
      'Total progression': membresProgression[m.id]?.total ?? 0,
      'Suivi par': membresSuiviPar[m.id]?.name || '—',
      "Date d'inscription": m.created_at ? safeFormatDate(m.created_at, 'dd/MM/yyyy', { locale: fr }) : '',
    }));
    const filename = `superviseur_membres_${format(new Date(), 'yyyy-MM-dd', { locale: fr })}`;
    if (formatExport === 'pdf') {
      const uniqueId = `pdf-superviseur-members-${Date.now()}`;
      const tempDiv = document.createElement('div');
      tempDiv.id = uniqueId;
      tempDiv.style.cssText = 'position:absolute;left:-9999px;top:0;width:800px;';
      tempDiv.innerHTML = `<div style="font-family:Arial"><h2>Membres de la famille - Superviseur</h2><p>Exporté le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p><p>Total: ${list.length} membre(s)</p><table style="width:100%;border-collapse:collapse;border:1px solid #ddd"><thead><tr style="background:#f3f4f6">${['Prénom','Nom','Email','Statut','Disciples','Progression','Suivi par','Date'].map(h=>`<th style="padding:10px;border:1px solid #ddd">${h}</th>`).join('')}</tr></thead><tbody>${list.map(m=>`<tr><td style="padding:8px;border:1px solid #ddd">${(m.first_name||'')}</td><td style="padding:8px;border:1px solid #ddd">${(m.last_name||'')}</td><td style="padding:8px;border:1px solid #ddd">${(m.email||'-')}</td><td style="padding:8px;border:1px solid #ddd">${m.statut_spirituel==='inactif'?'Inactif':'Actif'}</td><td style="padding:8px;border:1px solid #ddd">${membresDisciplesCount[m.id]??m.nb_disciples??0}</td><td style="padding:8px;border:1px solid #ddd">${membresProgression[m.id]?.total??0}</td><td style="padding:8px;border:1px solid #ddd">${membresSuiviPar[m.id]?.name||'-'}</td><td style="padding:8px;border:1px solid #ddd">${m.created_at?safeFormatDate(m.created_at,'dd/MM/yyyy',{locale:fr}):'-'}</td></tr>`).join('')}</tbody></table></div>`;
      document.body.appendChild(tempDiv);
      exportElementToPDF(uniqueId, `${filename}.pdf`, { title: 'Membres de la famille', subtitle: 'Superviseur', showHeader: true, showFooter: true }).finally(() => { try { document.getElementById(uniqueId)?.remove(); } catch (_) {} });
    } else {
      try {
        exportToExcel(exportData, filename, { title: 'Membres de la famille', description: 'Superviseur', additionalInfo: { 'Nombre de membres': list.length.toString() } });
        toast({ title: 'Export réussi', description: `${list.length} membre(s) exporté(s).` });
      } catch (err) {
        handleError(err, { context: 'handleExportFilteredList' }, 'Impossible d\'exporter la liste.');
      }
    }
  }, [filteredMembres, membresDisciplesCount, membresProgression, membresSuiviPar, toast, handleError, safeFormatDate]);

  const handleExportDisciplesList = useCallback((formatExport) => {
    const list = disciplesList || [];
    if (!list.length) {
      toast({ variant: 'destructive', title: 'Aucune donnée', description: 'Aucun disciple dans cette liste.' });
      return;
    }
    const exportData = list.map((m) => ({
      'Prénom': m.first_name || '',
      'Nom': m.last_name || '',
      'Email': m.email || '',
      "Date d'inscription": m.created_at ? safeFormatDate(m.created_at, 'dd/MM/yyyy', { locale: fr }) : '',
    }));
    const filename = `superviseur_disciples_membre_${format(new Date(), 'yyyy-MM-dd', { locale: fr })}`;
    if (formatExport === 'pdf') {
      const uniqueId = `pdf-superviseur-disciples-${Date.now()}`;
      const tempDiv = document.createElement('div');
      tempDiv.id = uniqueId;
      tempDiv.style.cssText = 'position:absolute;left:-9999px;top:0;width:800px;';
      tempDiv.innerHTML = `<div style="font-family:Arial"><h2>Disciples du membre - Superviseur</h2><p>Exporté le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p><p>Total: ${list.length}</p><table style="width:100%;border-collapse:collapse;border:1px solid #ddd"><thead><tr style="background:#f3f4f6"><th style="padding:10px;border:1px solid #ddd">Prénom</th><th style="padding:10px;border:1px solid #ddd">Nom</th><th style="padding:10px;border:1px solid #ddd">Email</th><th style="padding:10px;border:1px solid #ddd">Date</th></tr></thead><tbody>${list.map(m=>`<tr><td style="padding:8px;border:1px solid #ddd">${(m.first_name||'')}</td><td style="padding:8px;border:1px solid #ddd">${(m.last_name||'')}</td><td style="padding:8px;border:1px solid #ddd">${(m.email||'-')}</td><td style="padding:8px;border:1px solid #ddd">${m.created_at?safeFormatDate(m.created_at,'dd/MM/yyyy',{locale:fr}):'-'}</td></tr>`).join('')}</tbody></table></div>`;
      document.body.appendChild(tempDiv);
      exportElementToPDF(uniqueId, `${filename}.pdf`, { title: 'Disciples du membre', subtitle: 'Superviseur', showHeader: true, showFooter: true }).finally(() => { try { document.getElementById(uniqueId)?.remove(); } catch (_) {} });
    } else {
      try {
        exportToExcel(exportData, filename, { title: 'Disciples du membre', description: 'Superviseur', additionalInfo: { 'Nombre': list.length.toString() } });
        toast({ title: 'Export réussi', description: `${list.length} disciple(s) exporté(s).` });
      } catch (err) {
        handleError(err, { context: 'handleExportDisciplesList' }, 'Impossible d\'exporter la liste des disciples.');
      }
    }
  }, [disciplesList, toast, handleError, safeFormatDate]);

  const handleExportSelectedExcel = useCallback(() => {
    const list = (filteredMembres || []).filter((m) => selectedMembres.includes(m.id));
    if (!list.length) {
      toast({ variant: 'destructive', title: 'Export impossible', description: 'Aucun membre sélectionné.' });
      return;
    }
    const exportData = list.map((m) => ({
      'Prénom': m.first_name || '',
      'Nom': m.last_name || '',
      'Email': m.email || '',
      'Statut': m.statut_spirituel === 'inactif' ? 'Inactif' : 'Actif',
      'Nombre de Disciples': membresDisciplesCount[m.id] ?? m.nb_disciples ?? 0,
      'Suivi par': membresSuiviPar[m.id]?.name || '—',
      "Date d'inscription": m.created_at ? safeFormatDate(m.created_at, 'dd/MM/yyyy', { locale: fr }) : '',
    }));
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    try {
      exportToExcel(exportData, `superviseur_selection_${timestamp}`, {
        title: 'Membres sélectionnés – Superviseur',
        additionalInfo: { 'Nombre': list.length.toString() },
      });
      toast({ title: 'Export réussi', description: `${list.length} membre(s) exporté(s).` });
    } catch (err) {
      handleError(err, { context: 'handleExportSelectedExcel' }, 'Impossible d\'exporter la sélection.');
    }
  }, [filteredMembres, selectedMembres, membresDisciplesCount, membresSuiviPar, toast, handleError, safeFormatDate]);

  const handleExportSelectedPdf = useCallback(() => {
    const list = (filteredMembres || []).filter((m) => selectedMembres.includes(m.id));
    if (!list.length) {
      toast({ variant: 'destructive', title: 'Export impossible', description: 'Aucun membre sélectionné.' });
      return;
    }
    const uniqueId = `pdf-superviseur-selection-${Date.now()}`;
    const tempDiv = document.createElement('div');
    tempDiv.id = uniqueId;
    tempDiv.style.cssText = 'position:absolute;left:-9999px;top:0;width:800px;';
    tempDiv.innerHTML = `<div style="font-family:Arial"><h2>Membres sélectionnés - Superviseur</h2><p>Exporté le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p><p>Total: ${list.length}</p><table style="width:100%;border-collapse:collapse;border:1px solid #ddd"><thead><tr style="background:#f3f4f6">${['Prénom','Nom','Email','Statut','Disciples','Suivi par','Date'].map(h=>`<th style="padding:10px;border:1px solid #ddd">${h}</th>`).join('')}</tr></thead><tbody>${list.map(m=>`<tr><td style="padding:8px;border:1px solid #ddd">${(m.first_name||'')}</td><td style="padding:8px;border:1px solid #ddd">${(m.last_name||'')}</td><td style="padding:8px;border:1px solid #ddd">${(m.email||'-')}</td><td style="padding:8px;border:1px solid #ddd">${m.statut_spirituel==='inactif'?'Inactif':'Actif'}</td><td style="padding:8px;border:1px solid #ddd">${membresDisciplesCount[m.id]??m.nb_disciples??0}</td><td style="padding:8px;border:1px solid #ddd">${membresSuiviPar[m.id]?.name||'-'}</td><td style="padding:8px;border:1px solid #ddd">${m.created_at?safeFormatDate(m.created_at,'dd/MM/yyyy',{locale:fr}):'-'}</td></tr>`).join('')}</tbody></table></div>`;
    document.body.appendChild(tempDiv);
    exportElementToPDF(uniqueId, `superviseur_selection_${format(new Date(), 'yyyy-MM-dd', { locale: fr })}.pdf`, { title: 'Membres sélectionnés', subtitle: 'Superviseur', showHeader: true, showFooter: true }).finally(() => { try { document.getElementById(uniqueId)?.remove(); } catch (_) {} });
  }, [filteredMembres, selectedMembres, membresDisciplesCount, membresSuiviPar, safeFormatDate]);

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
    handleExportPDF,
    handleExportExcel,
    handleExportDisciplesDetailleExcel,
    handleExportMentorsConsolidesExcel,
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
    handleExportFilteredList,
    handleExportDisciplesList,
    handleExportSelectedExcel,
    handleExportSelectedPdf,
    fetchDisciplesDetaille: noopAsync,
    fetchMentorsConsolides: noopAsync,
    generateFormationVideoChartData: noopAsync,
    calculateStatutsSpirituels: noopAsync,
    fetchActiviteRecente: noopAsync,
    fetchStatsComparatives: noopAsync,
    chartsLoadedRef,
    handleError,
    devLog,
    setFormationVideoChartData,
    setStatutsSpirituelsData,
    setActiviteRecente,
  };
}

export default useSuperviseurDashboard;
