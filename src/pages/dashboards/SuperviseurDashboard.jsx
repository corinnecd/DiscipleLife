import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Target, TrendingUp, UserCheck, Activity, 
  Church, ChevronRight, Loader2, UserCircle, Eye, Camera, Sparkles, Zap, Trophy, Star, AlertCircle,
  Moon, Heart, HeartHandshake, UserPlus, Megaphone, Book, CheckCircle2, PlayCircle, Download, FileText, History, Search, X, Calendar, User, ChevronDown, ChevronUp
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getWeek, getQuarter, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfMonth, endOfMonth, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet';
import { compressImage } from '@/lib/ImageCompression';
import { useToast } from '@/components/ui/use-toast';
import { exportElementToPDF, exportToExcel } from '@/lib/ExportUtils';
import { getOrSetCache, clearCache } from '@/lib/CacheUtils';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useSuperviseurData } from '@/hooks/useSuperviseurData';
import performanceMonitor from '@/lib/PerformanceMonitor';
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
import { ReportReminderCard } from './superviseur/ReportReminderCard';
import { SuperviseurDashboardHeader } from './superviseur/SuperviseurDashboardHeader';

const PAGE_NAME = 'SuperviseurDashboard';
const LOAD_TIME_ALERT_MS = 4000; // Seuil au-delà duquel on affiche une alerte performance
const devLog = (...args) => { if (import.meta.env.DEV) devLog(...args); }; // §5.4 Qualité : logs uniquement en dev

const SuperviseurDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const { famille, setFamille, superviseur, pasteur, setPasteur, loading: phase1Loading, refetch: refetchPhase1 } = useSuperviseurData(user?.id);
  const [loading, setLoading] = useState(true);
  const [superviseurNom, setSuperviseurNom] = useState({ first_name: '', last_name: '', titre: '' });
  const [stats, setStats] = useState({
    nombreMembres: 0,
    objectif: 70,
    progression: 0,
    reste: 70
  });
  const [familleAvatarFile, setFamilleAvatarFile] = useState(null);
  const [familleAvatarPreview, setFamilleAvatarPreview] = useState(null);
  const [uploadingFamilleAvatar, setUploadingFamilleAvatar] = useState(false);
  const [pasteurAvatarFile, setPasteurAvatarFile] = useState(null);
  const [pasteurAvatarPreview, setPasteurAvatarPreview] = useState(null);
  const [uploadingPasteurAvatar, setUploadingPasteurAvatar] = useState(false);
  const [reportReminder, setReportReminder] = useState(null); // { daysLeft: number, showReminder: boolean }

  // Filtres de période pour les KPI
  const [kpiPeriodType, setKpiPeriodType] = useState('annuel'); // annuel, trimestriel, mensuel, hebdomadaire
  const [kpiSelectedYear, setKpiSelectedYear] = useState('2025');
  const [kpiSelectedQuarter, setKpiSelectedQuarter] = useState(getQuarter(new Date()).toString());
  const [kpiSelectedMonth, setKpiSelectedMonth] = useState(new Date().getMonth().toString());
  const [kpiSelectedWeek, setKpiSelectedWeek] = useState(() => {
    const now = new Date();
    return getWeek(now, { weekStartsOn: 1 }).toString();
  });
  const [kpiSelectedYearForPeriod, setKpiSelectedYearForPeriod] = useState('2025');

  // État pour les données des graphiques d'évolution
  const [chartData, setChartData] = useState([]);
  const [chartDataPreviousYear, setChartDataPreviousYear] = useState([]); // Pour comparaison année
  const [formationVideoChartData, setFormationVideoChartData] = useState([]); // Évolution formations/vidéos
  const [statutsSpirituelsData, setStatutsSpirituelsData] = useState([]); // Données pour camembert statuts
  const [exporting, setExporting] = useState(false);
  const [rapports, setRapports] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // État pour activité récente
  const [activiteRecente, setActiviteRecente] = useState({
    inscriptionsSemaine: [],
    inscriptionsMois: [],
    inscriptionsTrimestre: [],
    dernieresInscriptions: [],
    derniersRapports: [],
    activitesFamille: []
  });
  
  // État pour statistiques comparatives
  const [statsComparatives, setStatsComparatives] = useState({
    moyenneAutresFamilles: null,
    classement: null,
    totalFamilles: 0
  });
  const [loadingStatsComparatives, setLoadingStatsComparatives] = useState(false);
  
  // État pour notifications/alertes
  const [alertes, setAlertes] = useState({
    disciplesInactifs: [],
    membresSansProgression: []
  });
  const [kpiData, setKpiData] = useState({
    culteSamediSoir: 0,
    culteDimancheMatin: 0,
    afterCulteDimanche: 0,
    tempsPriere: 0,
    tempsPartage: 0,
    nouveauxConvertis: 0,
    nouveauxArrivants: 0,
    sortiesEvangelisation: 0,
    personnesEvangelisees: 0,
    comFratDisciples: 0,
    veillee: 0,
    meditationBible: 0,
    formationsTerminees: 0,
    formationsEnCours: 0,
    videosTerminees: 0
  });

  // État pour la liste des membres
  const [membres, setMembres] = useState([]);
  const [membresProgression, setMembresProgression] = useState({}); // { memberId: { formations: 0, videos: 0 } }
  const [membresDisciplesCount, setMembresDisciplesCount] = useState({}); // { memberId: nombreDeDisciples }
  const [membresSuiviPar, setMembresSuiviPar] = useState({}); // { memberId: { name: 'Nom Prénom', id: 'uuid' } }
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous'); // tous, actif, inactif
  const [dateFilter, setDateFilter] = useState(''); // Filtre par date d'inscription
  const [progressionFilter, setProgressionFilter] = useState('tous'); // tous, avec, sans
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedMembres, setSelectedMembres] = useState([]); // Pour sélection multiple
  const [showSelectedModal, setShowSelectedModal] = useState(false); // Modal pour afficher la sélection
  const [selectedMembreForDisciples, setSelectedMembreForDisciples] = useState(null);
  const [disciplesList, setDisciplesList] = useState([]);
  const [loadingDisciplesList, setLoadingDisciplesList] = useState(false);

  // État pour la liste des superviseurs de la famille
  const [superviseursFamille, setSuperviseursFamille] = useState([]);
  const [nombreMembresParSuperviseur, setNombreMembresParSuperviseur] = useState({}); // { superviseurId: nombreMembres }
  const [selectedSuperviseur, setSelectedSuperviseur] = useState(null); // Pour afficher la fiche du superviseur
  const [showAllInactifs, setShowAllInactifs] = useState(false); // Pour afficher tous les disciples inactifs
  const [showAllSansProgression, setShowAllSansProgression] = useState(false); // Pour afficher tous les membres sans progression
  
  // États pour les tableaux détaillés
  const [disciplesDetaille, setDisciplesDetaille] = useState([]); // Tableau détaillé des disciples (10 colonnes)
  const [loadingDisciplesDetaille, setLoadingDisciplesDetaille] = useState(false);
  const [mentorsConsolides, setMentorsConsolides] = useState([]); // Tableau consolidé des mentors
  const [loadingMentorsConsolides, setLoadingMentorsConsolides] = useState(false);
  // États pour le lazy loading des graphiques
  const [chartsLoaded, setChartsLoaded] = useState({
    formationVideo: false,
    statutsSpirituels: false,
    activiteRecente: false,
    statsComparatives: false
  });

  // Refs pour le lazy loading des graphiques
  const formationVideoRef = React.useRef(null);
  const statutsSpirituelsRef = React.useRef(null);
  const activiteRecenteRef = React.useRef(null);
  const statsComparativesRef = React.useRef(null);
  const chartsLoadedRef = React.useRef(chartsLoaded);

  // Garder la ref à jour pour éviter de recréer les observers à chaque changement de chartsLoaded
  useEffect(() => {
    chartsLoadedRef.current = chartsLoaded;
  }, [chartsLoaded]);

  // Dériver superviseurNom et aperçus avatar depuis les données phase 1 (hook useSuperviseurData)
  useEffect(() => {
    if (superviseur) {
      setSuperviseurNom({
        first_name: superviseur.first_name || '',
        last_name: superviseur.last_name || '',
        titre: superviseur.titre || ''
      });
    }
  }, [superviseur]);
  useEffect(() => {
    setFamilleAvatarPreview(famille?.avatar_url ?? null);
  }, [famille?.avatar_url]);
  useEffect(() => {
    setPasteurAvatarPreview(pasteur?.avatar_url ?? null);
  }, [pasteur?.avatar_url]);

  // Déclencher le chargement des stats comparatives quand la section est visible ET famille est prête (évite setInterval)
  const [statsComparativesRequested, setStatsComparativesRequested] = useState(false);
  // Effet borné : un seul chargement par (famille.id) quand la zone est visible, pas de re-fetch en double
  const statsComparativesLoadedForFamilleIdRef = useRef(null);
  const fetchStatsComparativesInProgressRef = useRef(false);

  // Garde anti double-fetch : évite d'enchaîner plusieurs appels si les deps changent pendant un fetch
  const fetchSuperviseurInProgressRef = useRef(false);
  // Spinner pleine page uniquement au premier chargement ; pas à chaque refetch (ex. changement année KPI)
  const hasInitiallyLoadedRef = useRef(false);

  // Phase 2 : membres, stats, KPI, etc. Ne tourne que lorsque la phase 1 (useSuperviseurData) est prête.
  // Instrumentation PerformanceMonitor (étape 5) : startPageLoad / endPageLoad + alerte si temps > seuil
  useEffect(() => {
    if (!user?.id || phase1Loading) return;
    if (fetchSuperviseurInProgressRef.current) return;
    fetchSuperviseurInProgressRef.current = true;
    performanceMonitor.startPageLoad(PAGE_NAME);
    setLoading(true);
    fetchPhase2Data(famille, superviseur, pasteur)
      .then(() => { checkReportReminder(); })
      .finally(() => {
        setLoading(false);
        fetchSuperviseurInProgressRef.current = false;
        hasInitiallyLoadedRef.current = true;
        performanceMonitor.endPageLoad(PAGE_NAME);
        const pageStats = performanceMonitor.getPageStats(PAGE_NAME);
        if (pageStats?.loadTime != null && pageStats.loadTime > LOAD_TIME_ALERT_MS) {
          toast({
            variant: 'destructive',
            title: 'Performance',
            description: `Le tableau de bord a mis ${Math.round(pageStats.loadTime / 1000)}s à charger. Consultez /admin/performance pour les métriques.`
          });
        }
      });
  }, [user?.id, phase1Loading, famille?.id, kpiPeriodType, kpiSelectedYear, kpiSelectedQuarter, kpiSelectedMonth, kpiSelectedWeek, kpiSelectedYearForPeriod]);

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
  }, [user?.id]); // Refs et statsComparativesRequested : pas dans les deps pour limiter les recréations d'observers

  // Fonction pour mettre à jour automatiquement le statut des disciples ayant des disciples → Mentor/Pilier
  // ⚠️ IMPORTANT : Ne pas appeler fetchPhase2Data/refetchPhase1 ici pour éviter les boucles infinies
  const updateDisciplesToMentors = async (disciplesCountMap, tousLesMembres) => {
    try {
      // Identifier les membres qui ont des disciples (> 0) et qui ont actuellement le rôle "disciple"
      const membresAUpdater = tousLesMembres.filter(membre => {
        const nombreDisciples = disciplesCountMap[membre.id] || 0;
        return nombreDisciples > 0 && membre.role === 'disciple';
      });

      if (membresAUpdater.length === 0) {
        devLog('✅ Aucun disciple à mettre à jour en Mentor/Pilier');
        return;
      }

      devLog(`🔄 Mise à jour de ${membresAUpdater.length} disciple(s) en Mentor/Pilier:`, 
        membresAUpdater.map(m => `${m.first_name} ${m.last_name} (${disciplesCountMap[m.id]} disciples)`));

      // Mettre à jour tous les membres en une seule fois avec Promise.all
      const updatePromises = membresAUpdater.map(async (membre) => {
        const { error: updateError } = await supabase
          .from('profils')
          .update({ 
            role: 'mentor', 
            is_approved_as_disciple_maker: true 
          })
          .eq('id', membre.id);

        if (updateError) {
          console.error(`❌ Erreur lors de la mise à jour de ${membre.first_name} ${membre.last_name}:`, updateError);
          handleError(updateError, { context: 'updateDisciplesToMentors', membreId: membre.id }, 
            `Impossible de mettre à jour le statut de ${membre.first_name} ${membre.last_name}.`);
          return { success: false, membreId: membre.id, error: updateError };
        }

        devLog(`✅ ${membre.first_name} ${membre.last_name} mis à jour en Mentor/Pilier`);
        return { success: true, membreId: membre.id };
      });

      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        toast({
          title: 'Mise à jour réussie',
          description: `${successCount} disciple(s) ont été automatiquement promus Mentor/Pilier car ils ont des disciples.`,
          className: "bg-green-50 border-green-200"
        });

        // ⚠️ IMPORTANT : Ne PAS appeler fetchPhase2Data/refetchPhase1 ici pour éviter la boucle infinie
        // Les données seront mises à jour au prochain chargement naturel de la page
        // Invalider le cache pour que les prochaines requêtes soient fraîches
        clearCache(`superviseur_${user.id}_membres`);
        clearCache(`superviseur_${user.id}_famille`);
        if (famille?.id) {
          clearCache(`superviseur_${user.id}_phase2_membres_${famille.id}`);
          clearCache(`superviseur_${user.id}_phase2_rpc_${famille.id}`);
        }
        if (superviseur?.pasteur_id != null) {
          clearCache(`superviseur_${user.id}_phase2_extra_${superviseur.pasteur_id}`);
        }
        clearCache(`superviseur_${user.id}_phase2_extra_null`);
      }

      if (failureCount > 0) {
        toast({
          variant: 'destructive',
          title: 'Erreurs lors de la mise à jour',
          description: `${failureCount} mise(s) à jour ont échoué.`,
        });
      }
    } catch (error) {
      console.error('❌ Erreur générale lors de la mise à jour des disciples en mentors:', error);
      handleError(error, { context: 'updateDisciplesToMentors' }, 
        "Impossible de mettre à jour automatiquement les statuts des disciples.");
    }
  };

  // Fonction pour vérifier le rappel de rapport (5 jours avant la fin du mois)
  const checkReportReminder = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    
    // Calculer le dernier jour du mois en cours
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = now.getDate();
    
    // Calculer le nombre de jours restants jusqu'à la fin du mois
    const daysLeft = lastDayOfMonth - currentDay;
    
    // Afficher l'alerte si nous sommes à 5 jours ou moins de la fin du mois
    if (daysLeft <= 5 && daysLeft >= 0) {
      setReportReminder({
        daysLeft,
        showReminder: true
      });
    } else {
      setReportReminder(null);
    }
  };

  // Fonction pour récupérer les données détaillées des disciples (10 colonnes)
  const fetchDisciplesDetaille = async () => {
    try {
      setLoadingDisciplesDetaille(true);
      const cacheKeyBase = `superviseur_${user.id}_disciples_detaille`;
      
      const disciplesData = await getOrSetCache(
        cacheKeyBase,
        async () => {
          if (!famille || !famille.id) return [];

          // Récupérer tous les disciples de la famille
          const { data: disciplesProfils, error: disciplesError } = await supabase
            .from('profils')
            .select('id, first_name, last_name, spiritual_status, created_at, famille_id')
            .eq('famille_id', famille.id)
            .eq('role', 'disciple');

          if (disciplesError) throw disciplesError;
          if (!disciplesProfils || disciplesProfils.length === 0) return [];

          // Pour chaque disciple, récupérer les données détaillées
          const disciplesAvecDetails = await Promise.all(
            disciplesProfils.map(async (disciple) => {
              let mentorInfo = { prenom: '', nom: '', id: disciple.mentor_id || null };
              if (disciple.mentor_id) {
                const { data: mentorProfil } = await supabase
                  .from('profils')
                  .select('id, first_name, last_name')
                  .eq('id', disciple.mentor_id)
                  .maybeSingle();
                if (mentorProfil) {
                  mentorInfo = { prenom: mentorProfil.first_name || '', nom: mentorProfil.last_name || '', id: mentorProfil.id };
                }
              } else {
                const { data: mentorProfil } = await supabase
                  .from('profils')
                  .select('id, first_name, last_name')
                  .eq('famille_id', disciple.famille_id)
                  .or('role.eq.mentor,is_approved_as_disciple_maker.eq.true')
                  .maybeSingle();
                if (mentorProfil) {
                  mentorInfo = { prenom: mentorProfil.first_name || '', nom: mentorProfil.last_name || '', id: mentorProfil.id };
                }
              }

              // 2. Date d'ajout (created_at du disciple)
              const dateAjout = disciple.created_at ? format(new Date(disciple.created_at), 'dd/MM/yyyy', { locale: fr }) : 'N/A';

              // 3. Date dernière présence (depuis attendance_tracking)
              const { data: dernierePresenceData } = await supabase
                .from('attendance_tracking')
                .select('attendance_date')
                .eq('disciple_id', disciple.id)
                .eq('status', 'present')
                .order('attendance_date', { ascending: false })
                .limit(1)
                .maybeSingle();

              const dateDernierePresence = dernierePresenceData?.attendance_date 
                ? format(new Date(dernierePresenceData.attendance_date), 'dd/MM/yyyy', { locale: fr })
                : 'Jamais';

              // 4. Niveau d'engagement (calculé à partir des activités récentes)
              // Compter les activités des 30 derniers jours
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              
              const [prayersCount, appointmentsCount, attendanceCount] = await Promise.all([
                supabase.from('prayer_requests').select('*', { count: 'exact', head: true }).eq('user_id', disciple.id).gte('created_at', thirtyDaysAgo.toISOString()),
                supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('disciple_id', disciple.id).gte('scheduled_date', thirtyDaysAgo.toISOString()),
                supabase.from('attendance_tracking').select('*', { count: 'exact', head: true }).eq('disciple_id', disciple.id).eq('status', 'present').gte('attendance_date', thirtyDaysAgo.toISOString())
              ]);

              const totalActivites = (prayersCount.count || 0) + (appointmentsCount.count || 0) + (attendanceCount.count || 0);
              let niveauEngagement = 'Faible';
              if (totalActivites >= 10) niveauEngagement = 'Élevé';
              else if (totalActivites >= 5) niveauEngagement = 'Moyen';

              // 5. Statut Actif/Inactif (basé sur la dernière présence > 3 mois = inactif)
              const troisMoisAgo = new Date();
              troisMoisAgo.setMonth(troisMoisAgo.getMonth() - 3);
              const isActif = dernierePresenceData?.attendance_date 
                ? new Date(dernierePresenceData.attendance_date) >= troisMoisAgo
                : false;

              // 6. Présence au dernier culte (dimanche de la semaine dernière)
              const today = new Date();
              const lastSunday = new Date(today);
              lastSunday.setDate(today.getDate() - today.getDay());
              const lastSundayStr = format(lastSunday, 'yyyy-MM-dd');

              const { data: presenceDernierCulte } = await supabase
                .from('attendance_tracking')
                .select('*', { count: 'exact', head: true })
                .eq('disciple_id', disciple.id)
                .eq('attendance_type', 'sunday_worship')
                .eq('status', 'present')
                .eq('attendance_date', lastSundayStr);

              const presenceDernierCulteBool = (presenceDernierCulte?.count || 0) > 0;

              return {
                mentor_prenom: mentorInfo.prenom,
                mentor_nom: mentorInfo.nom,
                disciple_prenom: disciple.first_name || '',
                disciple_nom: disciple.last_name || '',
                statut_spirituel: disciple.spiritual_status || 'Non-croyant',
                date_ajout: dateAjout,
                date_derniere_presence: dateDernierePresence,
                niveau_engagement: niveauEngagement,
                statut_actif: isActif,
                presence_dernier_culte: presenceDernierCulteBool,
                disciple_id: disciple.id
              };
            })
          );

          return disciplesAvecDetails;
        },
        2 * 60 * 1000 // Cache 2 minutes
      );

      setDisciplesDetaille(disciplesData || []);
    } catch (error) {
      handleError(error, { context: 'fetchDisciplesDetaille' }, "Impossible de charger les données détaillées des disciples.");
    } finally {
      setLoadingDisciplesDetaille(false);
    }
  };

  // Fonction pour récupérer les mentors consolidés
  const fetchMentorsConsolides = async () => {
    try {
      setLoadingMentorsConsolides(true);
      const cacheKeyBase = `superviseur_${user.id}_mentors_consolides`;
      
      const mentorsData = await getOrSetCache(
        cacheKeyBase,
        async () => {
          if (!famille || !famille.id) return [];

          // Récupérer tous les mentors (pilier) de la famille
          const { data: mentorsProfils, error: mentorsError } = await supabase
            .from('profils')
            .select('id, first_name, last_name, famille_id')
            .eq('famille_id', famille.id)
            .or('role.eq.mentor,is_approved_as_disciple_maker.eq.true');

          if (mentorsError) throw mentorsError;
          if (!mentorsProfils || mentorsProfils.length === 0) return [];

          // Pour chaque mentor, calculer les stats
          const mentorsAvecStats = await Promise.all(
            mentorsProfils.map(async (mentor) => {
              // 1. Nom et Prénom
              const nom = mentor.last_name || '';
              const prenom = mentor.first_name || '';

              // 2. Église (nom de la famille)
              const nomEglise = famille.nom || 'N/A';

              const { count: nombreDisciples } = await supabase
                .from('profils')
                .select('*', { count: 'exact', head: true })
                .eq('mentor_id', mentor.id);

              const nombreDisciplesTotal = nombreDisciples || 0;

              // 4. Avancement % (nombreDisciples / 70 * 100)
              const objectif = 70;
              const avancementPourcentage = Math.min((nombreDisciplesTotal / objectif) * 100, 100);

              const { data: disciplesData } = await supabase
                .from('profils')
                .select('id')
                .eq('mentor_id', mentor.id);

              const discipleIds = disciplesData?.map(d => d.id) || [];
              let disciplesPresents = 0;
              if (discipleIds.length > 0) {
                const { count: countPresents } = await supabase
                  .from('attendance_tracking')
                  .select('*', { count: 'exact', head: true })
                  .in('disciple_id', discipleIds)
                  .eq('attendance_type', 'sunday_worship')
                  .eq('status', 'present');
                disciplesPresents = countPresents || 0;
              }

              // 6. Taux de participation de la semaine en cours
              const now = new Date();
              const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 });
              const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });
              const startOfWeekStr = format(startOfCurrentWeek, 'yyyy-MM-dd');
              const endOfWeekStr = format(endOfCurrentWeek, 'yyyy-MM-dd');

              let tauxParticipationSemaine = 0;
              if (discipleIds.length > 0 && nombreDisciplesTotal > 0) {
                const { count: presentsSemaine } = await supabase
                  .from('attendance_tracking')
                  .select('*', { count: 'exact', head: true })
                  .in('disciple_id', discipleIds)
                  .eq('attendance_type', 'sunday_worship')
                  .eq('status', 'present')
                  .gte('attendance_date', startOfWeekStr)
                  .lte('attendance_date', endOfWeekStr);
                
                const presentsSemaineCount = presentsSemaine || 0;
                tauxParticipationSemaine = Math.round((presentsSemaineCount / nombreDisciplesTotal) * 100);
              }

              return {
                mentor_id: mentor.id,
                nom,
                prenom,
                eglise: nomEglise,
                nombre_disciples: nombreDisciplesTotal,
                avancement_pourcentage: Math.round(avancementPourcentage),
                presence_culte_samedi: 0,
                disciples_presents: disciplesPresents,
                taux_participation_semaine: tauxParticipationSemaine
              };
            })
          );

          return mentorsAvecStats;
        },
        2 * 60 * 1000 // Cache 2 minutes
      );

      setMentorsConsolides(mentorsData || []);
    } catch (error) {
      handleError(error, { context: 'fetchMentorsConsolides' }, "Impossible de charger les données consolidées des mentors.");
    } finally {
      setLoadingMentorsConsolides(false);
    }
  };

  // Charger les données détaillées après le chargement des données principales (user?.id pour stabilité, éviter boucles)
  useEffect(() => {
    if (famille?.id && user?.id) {
      fetchDisciplesDetaille();
      fetchMentorsConsolides();
    }
  }, [famille?.id, user?.id]);

  const fetchPhase2Data = async (familleData, superviseurData, pasteurData) => {
    try {
      if (!user?.id || !familleData) return;

      const pasteurId = superviseurData?.pasteur_id ?? null;
      const cacheKeyRpc = `superviseur_${user.id}_phase2_rpc_${familleData.id}`;
      const cacheKeyExtra = `superviseur_${user.id}_phase2_extra_${pasteurId ?? 'null'}`;

      // Étape 3 : appels RPC en parallèle (094 phase2 + 095 phase2_extra) pour regrouper les requêtes
      let payload = null;
      let extraPayload = null;
      try {
        const [phase2Result, extraResult] = await Promise.all([
          getOrSetCache(
            cacheKeyRpc,
            async () => {
              const { data, error } = await supabase.rpc('get_superviseur_dashboard_phase2', {
                p_user_id: user.id,
                p_famille_id: familleData.id
              });
              if (error) throw error;
              return data;
            },
            2 * 60 * 1000
          ),
          getOrSetCache(
            cacheKeyExtra,
            async () => {
              const { data, error } = await supabase.rpc('get_superviseur_dashboard_phase2_extra', {
                p_user_id: user.id,
                p_pasteur_id: pasteurId
              });
              if (error) throw error;
              return data;
            },
            2 * 60 * 1000
          )
        ]);
        payload = phase2Result;
        extraPayload = extraResult;
      } catch (rpcErr) {
        console.warn('RPC dashboard superviseur non disponible, repli appels directs:', rpcErr?.message);
        try {
          payload = await getOrSetCache(
            cacheKeyRpc,
            async () => {
              const { data, error } = await supabase.rpc('get_superviseur_dashboard_phase2', {
                p_user_id: user.id,
                p_famille_id: familleData.id
              });
              if (error) throw error;
              return data;
            },
            2 * 60 * 1000
          );
        } catch (e) {
          // garder payload null, repli complet ci‑dessous
        }
      }

      let tousLesMembres = [];
      if (payload && typeof payload === 'object') {
        tousLesMembres = (payload.membres || []).map(m => ({
          ...m,
          id: m.id,
          role: m.role || 'disciple',
          statut_spirituel: m.statut_spirituel || 'actif'
        }));
        setStats(payload.stats || { nombreMembres: 0, objectif: 70, progression: 0, reste: 70 });
        setMembres(tousLesMembres);
        setKpiData(prev => ({ ...prev, ...(payload.kpi_summary || {}) }));
        setMembresProgression(payload.membres_progression || {});
        setMembresDisciplesCount(payload.membres_disciples_count || {});
        setMembresSuiviPar(payload.membres_suivi_par || {});
        if (tousLesMembres.length > 0) {
          updateDisciplesToMentors(payload.membres_disciples_count || {}, tousLesMembres).catch(err => {
            console.error('Erreur lors de la mise à jour automatique des statuts:', err);
          });
        }
      } else {
        // Repli : appels directs (ancienne logique) si RPC absente ou échec
        const cacheKeyMembres = `superviseur_${user.id}_phase2_membres_${familleData.id}`;
        const cachedMembres = await getOrSetCache(
          cacheKeyMembres,
          async () => {
            const { data: membresData, error: membresError } = await supabase
              .from('profils')
              .select('id, first_name, last_name, email, avatar_url, created_at, role, mentor_id')
              .eq('famille_id', familleData.id)
              .order('created_at', { ascending: false });
            if (membresError) throw membresError;
            return { membresData: membresData || [], disciplesData: [] };
          },
          2 * 60 * 1000
        );
        if (!cachedMembres) return;
        const { membresData, disciplesData } = cachedMembres;
        tousLesMembres = [];
        if (membresData) {
          membresData.forEach(profil => {
            if (profil.id === user.id) return;
            tousLesMembres.push({ ...profil, statut_spirituel: 'actif', source: 'profils', role: profil.role || 'disciple', parent_disciple_id: profil.mentor_id || null });
          });
        }
        const objectif = familleData.objectif_disciples || 70;
        const nombreMembres = tousLesMembres.length;
        const progression = nombreMembres > 0 ? Math.min((nombreMembres / objectif) * 100, 100) : 0;
        const reste = Math.max(objectif - nombreMembres, 0);
        setStats({ nombreMembres, objectif, progression, reste });
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
            formationsTermineesCount = termRes.count || 0;
            formationsEnCoursCount = encoursRes.count || 0;
          }
          const formationsDataRes = progressionIds.length > 0
            ? await supabase.from('user_module_progression').select('progression_id').in('progression_id', progressionIds).eq('est_complete', true)
            : { data: [] };
          const videosTermineesCount = videosRes?.data?.length || 0;
          setKpiData(prev => ({ ...prev, formationsTerminees: formationsTermineesCount, formationsEnCours: formationsEnCoursCount, videosTerminees: videosTermineesCount }));
          const progressionToUserMap = {};
          (allProgressionsRes?.data || []).forEach(p => { progressionToUserMap[p.id] = p.user_id; });
          const progressionMap = {};
          membreIds.forEach(mid => { progressionMap[mid] = { formations: 0, videos: 0, total: 0 }; });
          (formationsDataRes?.data || []).forEach(f => {
            const uid = progressionToUserMap[f.progression_id];
            if (uid && progressionMap[uid]) progressionMap[uid].formations += 1;
          });
          (videosRes?.data || []).forEach(v => {
            if (progressionMap[v.disciple_id]) progressionMap[v.disciple_id].videos += 1;
          });
          Object.keys(progressionMap).forEach(mid => { progressionMap[mid].total = progressionMap[mid].formations + progressionMap[mid].videos; });
          setMembresProgression(progressionMap);
          const disciplesCountMap = {};
          tousLesMembres.forEach(m => { disciplesCountMap[m.id] = 0; });
          directRes.data?.forEach(d => { if (d.mentor_id && disciplesCountMap[d.mentor_id] !== undefined) disciplesCountMap[d.mentor_id] = (disciplesCountMap[d.mentor_id] || 0) + 1; });
          setMembresDisciplesCount(disciplesCountMap);
          updateDisciplesToMentors(disciplesCountMap, tousLesMembres).catch(() => {});
          const allProfilsData = (await supabase.from('profils').select('id, mentor_id, first_name, last_name').in('id', membreIds)).data || [];
          const profilsById = {};
          allProfilsData.forEach(p => { profilsById[p.id] = p; });
          const uniqueMentorIds = [...new Set(allProfilsData.filter(p => p.mentor_id).map(p => p.mentor_id))];
          const { data: mentorsData } = uniqueMentorIds.length ? await supabase.from('profils').select('id, first_name, last_name').in('id', uniqueMentorIds) : { data: [] };
          const mentorsMap = {}; (mentorsData || []).forEach(p => { mentorsMap[p.id] = p; });
          const suiviParMap = {};
          tousLesMembres.forEach(membre => {
            const p = profilsById[membre.id];
            if (p?.mentor_id && mentorsMap[p.mentor_id]) {
              const mentor = mentorsMap[p.mentor_id];
              suiviParMap[membre.id] = { name: `${mentor.first_name || ''} ${mentor.last_name || ''}`.trim(), id: p.mentor_id };
            } else if (membre.source === 'profils' && membre.role !== 'superviseur') {
              suiviParMap[membre.id] = { name: `${superviseurNom.first_name || ''} ${superviseurNom.last_name || ''}`.trim(), id: user.id };
            }
          });
          setMembresSuiviPar(suiviParMap);
        }
      }

      // 5. Rapports + superviseurs famille : depuis RPC phase2_extra si disponible, sinon appels directs
      let rapportsData = extraPayload?.rapports ?? null;
      if (rapportsData == null) {
        const { data, error: rapportsError } = await supabase
          .from('reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        if (!rapportsError) rapportsData = data;
      }
      if (extraPayload?.superviseurs_famille) {
        setSuperviseursFamille(Array.isArray(extraPayload.superviseurs_famille) ? extraPayload.superviseurs_famille : []);
      }
      if (extraPayload?.nombre_membres_par_superviseur && typeof extraPayload.nombre_membres_par_superviseur === 'object') {
        setNombreMembresParSuperviseur(extraPayload.nombre_membres_par_superviseur);
      }

      if (rapportsData && rapportsData.length >= 0) {
        // Filtrer les rapports selon la période sélectionnée
        const rapportsFiltres = rapportsData.filter(r => {
          const selectedYear = parseInt(kpiSelectedYearForPeriod);
          const reportDate = new Date(r.created_at);
          const reportYear = r.year || reportDate.getFullYear();
          
          if (kpiPeriodType === 'annuel') {
            return reportYear === selectedYear;
          } else if (kpiPeriodType === 'trimestriel') {
            const selectedQuarter = parseInt(kpiSelectedQuarter);
            if (r.report_type === 'trimestriel') {
              return r.quarter === selectedQuarter && reportYear === selectedYear;
            }
            const reportQuarter = getQuarter(reportDate);
            return reportQuarter === selectedQuarter && reportYear === selectedYear;
          } else if (kpiPeriodType === 'mensuel') {
            const selectedMonth = parseInt(kpiSelectedMonth);
            if (r.report_type === 'mensuel') {
              return r.month === selectedMonth && reportYear === selectedYear;
            }
            return reportDate.getMonth() === selectedMonth && reportYear === selectedYear;
          } else if (kpiPeriodType === 'hebdomadaire') {
            const selectedWeek = parseInt(kpiSelectedWeek);
            if (r.report_type === 'hebdomadaire') {
              return r.week_number === selectedWeek && reportYear === selectedYear;
            }
            const reportWeek = getWeek(reportDate, { weekStartsOn: 1 });
            return reportWeek === selectedWeek && reportYear === selectedYear;
          }
          return false;
        });

        // Calculer les KPIs pour la période sélectionnée
        let culteSamediSoir = 0;
        let culteDimancheMatin = 0;
        let afterCulteDimanche = 0;
        let tempsPriere = 0;
        let tempsPartage = 0;
        let nouveauxConvertis = 0;
        let nouveauxArrivants = 0;
        let sortiesEvangelisation = 0;
        let personnesEvangelisees = 0;
        let comFratDisciples = 0;
        let veillee = 0;
        let meditationBible = 0;

        rapportsFiltres.forEach(report => {
          const stats = report.statistics_snapshot || {};
          culteSamediSoir += stats.saturday_evening_count || 0;
          culteDimancheMatin += stats.sunday_attendance_count || 0;
          afterCulteDimanche += stats.after_culte_count || 0;
          tempsPriere += stats.saturday_prayer_count || 0;
          tempsPartage += stats.sunday_sharing_count || 0;
          nouveauxConvertis += stats.nouveaux_convertis || 0;
          nouveauxArrivants += stats.nouveaux_arrivants || 0;
          sortiesEvangelisation += stats.evangelization || 0;
          personnesEvangelisees += stats.evangelization || 0;
          comFratDisciples += stats.com_frat_disciples || 0;
          veillee += stats.veillee || 0;
          meditationBible += stats.meditation_bible || 0;
        });

        setKpiData(prev => ({
          ...prev,
          culteSamediSoir,
          culteDimancheMatin,
          afterCulteDimanche,
          tempsPriere,
          tempsPartage,
          nouveauxConvertis,
          nouveauxArrivants,
          sortiesEvangelisation,
          personnesEvangelisees,
          comFratDisciples,
          veillee,
          meditationBible
        }));

        // Générer les données pour les graphiques d'évolution (tous les rapports soumis)
        await generateChartData(rapportsData || []);
        
        // Stocker les rapports pour l'historique
        setRapports(rapportsData || []);
      }
      
      // 6. OPTIMISATION: Charger les données supplémentaires de manière paresseuse
      devLog('📊 Données principales chargées. Les graphiques seront chargés de manière paresseuse.');
      
      try {
        await fetchAlertes();
        devLog('✅ Alertes récupérées');
      } catch (error) {
        console.error('❌ Erreur récupération alertes:', error);
      }

      // Superviseurs famille + nombre membres : déjà remplis par RPC phase2_extra si disponible
      if (!extraPayload?.superviseurs_famille && superviseurData?.pasteur_id) {
        const { data: superviseursData, error: superviseursError } = await supabase
          .from('profils')
          .select('id, first_name, last_name, email, avatar_url')
          .eq('pasteur_id', superviseurData.pasteur_id)
          .eq('role', 'superviseur')
          .neq('id', user.id)
          .order('first_name', { ascending: true });

        if (!superviseursError && superviseursData?.length > 0) {
          setSuperviseursFamille(superviseursData || []);
          const superviseurIds = superviseursData.map(s => s.id);
          const { data: allFamilles, error: famillesError } = await supabase
            .from('familles_disciples')
            .select('id, superviseur_id')
            .in('superviseur_id', superviseurIds);
          const membresCountMap = {};
          if (!famillesError && allFamilles?.length > 0) {
            const superviseurToFamilleMap = {};
            const familleIds = allFamilles.map(f => { superviseurToFamilleMap[f.superviseur_id] = f.id; return f.id; });
            const profilsCountsResult = await supabase.from('profils').select('famille_id').in('famille_id', familleIds);
            const membresParFamille = {};
            profilsCountsResult.data?.forEach(p => { if (p.famille_id) membresParFamille[p.famille_id] = (membresParFamille[p.famille_id] || 0) + 1; });
            superviseursData.forEach(s => {
              const fid = superviseurToFamilleMap[s.id];
              membresCountMap[s.id] = fid ? (membresParFamille[fid] || 0) : 0;
            });
          }
          setNombreMembresParSuperviseur(membresCountMap);
        }
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données superviseur:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour exporter en PDF
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `dashboard_superviseur_${timestamp}.pdf`;
      await exportElementToPDF('superviseur-dashboard-content', filename);
      toast({ title: 'Export réussi', description: 'Le PDF a été téléchargé.', className: 'bg-green-50 border-green-200' });
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'exporter le PDF." });
    } finally {
      setExporting(false);
    }
  };

  // Fonction pour exporter en Excel (CSV)
  const handleExportExcel = () => {
    try {
      const exportData = membres.map(membre => ({
        'Nom': `${membre.first_name} ${membre.last_name}`,
        'Email': membre.email || '',
        'Statut spirituel': membre.statut_spirituel === 'inactif' ? 'Inactif' : 'Actif',
        'Date d\'inscription': membre.created_at ? format(new Date(membre.created_at), 'dd/MM/yyyy', { locale: fr }) : '-'
      }));

      if (exportData.length === 0) {
        toast({ variant: 'destructive', title: 'Aucune donnée', description: 'Aucun membre à exporter.' });
        return;
      }

      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `dashboard_superviseur_${timestamp}`;
      exportToExcel(exportData, filename);
      toast({ title: 'Export réussi', description: 'Le fichier CSV a été téléchargé.', className: 'bg-green-50 border-green-200' });
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'exporter le CSV." });
    }
  };

  // Export CSV du tableau détaillé des disciples (10 colonnes)
  const handleExportDisciplesDetailleExcel = () => {
    try {
      const exportData = disciplesDetaille.map(d => ({
        'Prénom Pilier': d.mentor_prenom || '',
        'Nom Pilier': d.mentor_nom || '',
        'Prénom Disciple': d.disciple_prenom || '',
        'Nom Disciple': d.disciple_nom || '',
        'Statut spirituel': d.statut_spirituel || '',
        "Date d'ajout": d.date_ajout || '',
        'Date dernière présence': d.date_derniere_presence || '',
        "Niveau d'engagement": d.niveau_engagement || '',
        'Statut (Actif/Inactif)': d.statut_actif ? 'Actif' : 'Inactif',
        'Présence dernier culte': d.presence_dernier_culte ? 'Oui' : 'Non',
      }));
      if (exportData.length === 0) {
        toast({ variant: 'destructive', title: 'Export impossible', description: 'Aucun disciple à exporter.' });
        return;
      }
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      exportToExcel(exportData, `superviseur_tableau_disciples_${timestamp}`, {
        title: 'Tableau détaillé des disciples – Dashboard Superviseur',
        description: '10 colonnes : Pilier, Disciple, Statut, Dates, Engagement, Présence',
        author: 'DiscipleLife',
      });
      toast({ title: 'Export réussi', description: `${exportData.length} disciple(s) exporté(s).`, className: 'bg-green-50 border-green-200' });
    } catch (error) {
      handleError(error, { context: 'handleExportDisciplesDetailleExcel' }, "Impossible d'exporter le tableau des disciples.");
    }
  };

  // Export CSV du tableau consolidé des mentors (piliers) – rapport au pasteur
  const handleExportMentorsConsolidesExcel = () => {
    try {
      const exportData = mentorsConsolides.map(m => ({
        'Nom': m.nom || '',
        'Prénom': m.prenom || '',
        'Familles': m.eglise || '',
        'Nombre de disciples': m.nombre_disciples ?? 0,
        'Avancement % (objectif 70)': m.avancement_pourcentage != null ? m.avancement_pourcentage : '',
        'Présence Culte Samedi': m.presence_culte_samedi != null ? m.presence_culte_samedi : '',
        'Présence Culte Dimanche': m.disciples_presents != null ? m.disciples_presents : '',
        'Taux participation semaine (%)': m.taux_participation_semaine != null ? m.taux_participation_semaine : '',
      }));
      if (exportData.length === 0) {
        toast({ variant: 'destructive', title: 'Export impossible', description: 'Aucun mentor à exporter.' });
        return;
      }
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      exportToExcel(exportData, `superviseur_mentors_consolides_${timestamp}`, {
        title: 'Tableau consolidé mentors (piliers) – Dashboard Superviseur',
        description: 'Nom, Prénom, Familles, Nombre de disciples, Avancement %, Présence Culte Samedi, Présence Culte Dimanche, Taux participation',
        author: 'DiscipleLife',
      });
      toast({ title: 'Export réussi', description: `${exportData.length} mentor(s) exporté(s).`, className: 'bg-green-50 border-green-200' });
    } catch (error) {
      handleError(error, { context: 'handleExportMentorsConsolidesExcel' }, "Impossible d'exporter le tableau des mentors.");
    }
  };

  // Fonction pour générer les données historiques des graphiques
  const generateChartData = async (reportsData) => {
    if (!reportsData || reportsData.length === 0) {
      setChartData([]);
      return;
    }

    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jui", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    const chartMap = {};

    // Grouper les rapports par mois
    reportsData.forEach(report => {
      const reportDate = new Date(report.created_at);
      const monthKey = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${months[reportDate.getMonth()]} ${reportDate.getFullYear()}`;

      if (!chartMap[monthKey]) {
        chartMap[monthKey] = {
          name: monthLabel,
          mois: monthKey,
          culteSamediSoir: 0,
          culteDimancheMatin: 0,
          afterCulteDimanche: 0,
          tempsPriere: 0,
          tempsPartage: 0,
          nouveauxConvertis: 0,
          nouveauxArrivants: 0,
          sortiesEvangelisation: 0,
          personnesEvangelisees: 0,
          comFratDisciples: 0,
          veillee: 0,
          meditationBible: 0
        };
      }

      const stats = report.statistics_snapshot || {};
      chartMap[monthKey].culteSamediSoir += stats.saturday_evening_count || 0;
      chartMap[monthKey].culteDimancheMatin += stats.sunday_attendance_count || 0;
      chartMap[monthKey].afterCulteDimanche += stats.after_culte_count || 0;
      chartMap[monthKey].tempsPriere += stats.saturday_prayer_count || 0;
      chartMap[monthKey].tempsPartage += stats.sunday_sharing_count || 0;
      chartMap[monthKey].nouveauxConvertis += stats.nouveaux_convertis || 0;
      chartMap[monthKey].nouveauxArrivants += stats.nouveaux_arrivants || 0;
      chartMap[monthKey].sortiesEvangelisation += stats.evangelization || 0;
      chartMap[monthKey].personnesEvangelisees += stats.evangelization || 0;
      chartMap[monthKey].comFratDisciples += stats.com_frat_disciples || 0;
      chartMap[monthKey].veillee += stats.veillee || 0;
      chartMap[monthKey].meditationBible += stats.meditation_bible || 0;
    });

    // Convertir en tableau et trier par date
    const dataArray = Object.values(chartMap).sort((a, b) => a.mois.localeCompare(b.mois));
    
    // Prendre les 12 derniers mois
    setChartData(dataArray.slice(-12));
    
    // Générer aussi les données de l'année précédente pour comparaison
    const currentYear = new Date().getFullYear();
    const previousYearData = dataArray.filter(d => {
      const year = parseInt(d.mois.split('-')[0]);
      return year === currentYear - 1;
    });
    setChartDataPreviousYear(previousYearData);
  };
  
  // Fonction pour générer les données d'évolution des formations/vidéos
  const generateFormationVideoChartData = async () => {
    if (!famille || !user) return;
    
    try {
      // Récupérer les membres de la famille
      const { data: membresData } = await supabase
        .from('profils')
        .select('id, created_at')
        .eq('famille_id', famille.id);
      
      const allMemberIds = (membresData || []).map(m => m.id);
      
      if (allMemberIds.length === 0) {
        setFormationVideoChartData([]);
        return;
      }
      
      // Récupérer les formations terminées par mois
      // D'abord récupérer les progression_id pour ces membres
      const { data: progressionsForChart } = await supabase
        .from('user_parcours_progression')
        .select('id, user_id')
        .in('user_id', allMemberIds);
      
      const progressionIdsForChart = progressionsForChart?.map(p => p.id) || [];
      const progressionToUserChartMap = {};
      progressionsForChart?.forEach(p => {
        progressionToUserChartMap[p.id] = p.user_id;
      });
      
      let formationsData = [];
      if (progressionIdsForChart.length > 0) {
        const { data: formationsDataRaw } = await supabase
          .from('user_module_progression')
          .select('progression_id, date_completion, created_at')
          .in('progression_id', progressionIdsForChart)
          .eq('est_complete', true)
          .order('date_completion', { ascending: true });
        
        // Mapper progression_id vers user_id
        formationsData = formationsDataRaw?.map(f => ({
          user_id: progressionToUserChartMap[f.progression_id],
          completed_at: f.date_completion,
          created_at: f.created_at
        })) || [];
      }
      
      // Récupérer les vidéos terminées par mois
      const { data: videosData } = await supabase
        .from('video_progress')
        .select('disciple_id, completed_at, created_at')
        .in('disciple_id', allMemberIds)
        .eq('is_completed', true)
        .order('completed_at', { ascending: true });
      
      const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jui", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
      const chartMap = {};
      
      // Grouper les formations par mois
      (formationsData || []).forEach(formation => {
        const date = new Date(formation.completed_at || formation.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = `${months[date.getMonth()]} ${date.getFullYear()}`;
        
        if (!chartMap[monthKey]) {
          chartMap[monthKey] = {
            name: monthLabel,
            mois: monthKey,
            formations: 0,
            videos: 0
          };
        }
        chartMap[monthKey].formations += 1;
      });
      
      // Grouper les vidéos par mois
      (videosData || []).forEach(video => {
        const date = new Date(video.completed_at || video.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = `${months[date.getMonth()]} ${date.getFullYear()}`;
        
        if (!chartMap[monthKey]) {
          chartMap[monthKey] = {
            name: monthLabel,
            mois: monthKey,
            formations: 0,
            videos: 0
          };
        }
        chartMap[monthKey].videos += 1;
      });
      
      const dataArray = Object.values(chartMap).sort((a, b) => a.mois.localeCompare(b.mois));
      setFormationVideoChartData(dataArray.slice(-12));
    } catch (error) {
      console.error('Erreur génération données formations/vidéos:', error);
    }
  };
  
  // Fonction pour calculer les statuts spirituels pour le camembert
  const calculateStatutsSpirituels = async () => {
    if (!famille || !user) return;
    
    try {
      // La colonne statut_spirituel n'existe pas dans profils
      // On utilise une valeur par défaut pour tous les membres
      const { data: membresData } = await supabase
        .from('profils')
        .select('id')
        .eq('famille_id', famille.id);
      
      const statutsMap = {
        'actif': 0,
        'inactif': 0,
        'nouveau_converti': 0,
        'disciple_affermi': 0,
        'autre': 0
      };
      
      // Par défaut, tous les membres sont considérés comme actifs
      // car la colonne statut_spirituel n'existe pas
      const nombreMembres = (membresData || []).length;
      statutsMap['actif'] = nombreMembres;
      
      const colors = ['#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#6b7280'];
      const labels = {
        'actif': 'Actifs',
        'inactif': 'Inactifs',
        'nouveau_converti': 'Nouveaux Convertis',
        'disciple_affermi': 'Disciples Affermis',
        'autre': 'Autres'
      };
      
      const data = Object.entries(statutsMap)
        .filter(([_, value]) => value > 0)
        .map(([key, value], index) => ({
          name: labels[key] || 'Autre',
          value: value,
          color: colors[index % colors.length]
        }));
      
      setStatutsSpirituelsData(data);
    } catch (error) {
      console.error('Erreur calcul statuts spirituels:', error);
    }
  };
  
  // Fonction pour récupérer l'activité récente
  const fetchActiviteRecente = async () => {
    if (!famille || !user) return;
    
    try {
      // Calculer les dates de début pour chaque période
      const maintenant = new Date();
      const debutSemaine = startOfWeek(maintenant, { weekStartsOn: 1 });
      const debutMois = startOfMonth(maintenant);
      const debutTrimestre = startOfQuarter(maintenant);
      
      // Récupérer toutes les inscriptions de la famille
      const { data: toutesInscriptions } = await supabase
        .from('profils')
        .select('id, first_name, last_name, created_at, avatar_url')
        .eq('famille_id', famille.id)
        .order('created_at', { ascending: false });
      
      // Filtrer par période
      const inscriptionsSemaine = (toutesInscriptions || []).filter(inscription => {
        const dateInscription = new Date(inscription.created_at);
        return dateInscription >= debutSemaine;
      });
      
      const inscriptionsMois = (toutesInscriptions || []).filter(inscription => {
        const dateInscription = new Date(inscription.created_at);
        return dateInscription >= debutMois;
      });
      
      const inscriptionsTrimestre = (toutesInscriptions || []).filter(inscription => {
        const dateInscription = new Date(inscription.created_at);
        return dateInscription >= debutTrimestre;
      });
      
      // Dernières inscriptions (5 derniers membres)
      const dernieresInscriptions = (toutesInscriptions || []).slice(0, 5);
      
      // Derniers rapports (5 derniers)
      const { data: rapportsRecents } = await supabase
        .from('reports')
        .select('id, created_at, report_type, month, quarter, week_number, year')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Activités récentes (combinaison des deux triées par date)
      const activites = [
        ...(dernieresInscriptions || []).map(i => ({
          type: 'inscription',
          label: `${i.first_name} ${i.last_name} a rejoint la famille`,
          date: i.created_at,
          id: i.id,
          avatar: i.avatar_url
        })),
        ...(rapportsRecents || []).map(r => ({
          type: 'rapport',
          label: `Rapport ${r.report_type} envoyé`,
          date: r.created_at,
          id: r.id
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
      
      setActiviteRecente({
        inscriptionsSemaine: inscriptionsSemaine || [],
        inscriptionsMois: inscriptionsMois || [],
        inscriptionsTrimestre: inscriptionsTrimestre || [],
        dernieresInscriptions: dernieresInscriptions || [],
        derniersRapports: rapportsRecents || [],
        activitesFamille: activites
      });
    } catch (error) {
      console.error('Erreur récupération activité récente:', error);
    }
  };
  
  // Fonction pour récupérer les statistiques comparatives (appelée quand famille est déjà prête via le useEffect dédié)
  const fetchStatsComparatives = async () => {
    if (!famille || !famille.id) return;
    
    try {
      devLog('📊 Début calcul stats comparatives pour famille:', famille.id);
      
      // Ne pas réinitialiser les stats ici : loadingStatsComparatives gère l'affichage du spinner
      
      // Récupérer toutes les familles avec leurs statistiques
      const { data: toutesFamilles, error: famillesError } = await supabase
        .from('familles_disciples')
        .select('id, nom, nombre_disciples_actuels, objectif_disciples, superviseur_id');
      
      if (famillesError) {
        throw famillesError;
      }
      
      if (!toutesFamilles || toutesFamilles.length === 0) {
        devLog('⚠️ Aucune famille trouvée');
        setStatsComparatives({
          moyenneAutresFamilles: 0,
          classement: 1,
          totalFamilles: 0
        });
        return;
      }
      
      devLog(`📊 ${toutesFamilles.length} familles trouvées`);
      
      // Calculer les nombres réels de membres pour chaque famille
      const famillesAvecStats = await Promise.all(
        toutesFamilles.map(async (f) => {
          try {
            // Récupérer les membres depuis profils
            const { count: membresProfils, error: profilsError } = await supabase
              .from('profils')
              .select('id', { count: 'exact', head: true })
              .eq('famille_id', f.id);
            
            if (profilsError) {
              console.error(`Erreur profils pour famille ${f.id}:`, profilsError);
            }
            
            const totalMembres = membresProfils || 0;
            return {
              ...f,
              nombreMembresReel: totalMembres
            };
          } catch (error) {
            console.error(`Erreur calcul stats pour famille ${f.id}:`, error);
            return {
              ...f,
              nombreMembresReel: 0
            };
          }
        })
      );
      
      // Calculer la moyenne (sans inclure la famille actuelle)
      const autresFamilles = famillesAvecStats.filter(f => f.id !== famille.id);
      const sommeMembres = autresFamilles.length > 0 
        ? autresFamilles.reduce((sum, f) => sum + f.nombreMembresReel, 0)
        : 0;
      const moyenne = autresFamilles.length > 0 
        ? Math.round(sommeMembres / autresFamilles.length)
        : 0;
      
      // Trouver le classement de la famille actuelle
      const familleActuelle = famillesAvecStats.find(f => f.id === famille.id);
      const nombreMembresActuels = familleActuelle?.nombreMembresReel || stats.nombreMembres;
      
      const classement = famillesAvecStats
        .sort((a, b) => b.nombreMembresReel - a.nombreMembresReel)
        .findIndex(f => f.id === famille.id) + 1;
      
      devLog('✅ Stats comparatives calculées:', {
        moyenne,
        classement,
        totalFamilles: famillesAvecStats.length,
        nombreMembresActuels
      });
      
      setStatsComparatives({
        moyenneAutresFamilles: moyenne,
        classement: classement,
        totalFamilles: famillesAvecStats.length
      });
    } catch (error) {
      console.error('❌ Erreur récupération stats comparatives:', error);
      // En cas d'erreur, définir un état par défaut pour éviter le message "Calcul en cours..."
      setStatsComparatives({
        moyenneAutresFamilles: null,
        classement: null,
        totalFamilles: 0
      });
    }
  };

  // Charger les stats comparatives quand la section est visible ET famille prête (effet borné, plus de setInterval)
  // user?.id (et pas user) pour éviter boucle si le contexte renvoie un nouvel objet à chaque rendu
  // statsComparativesLoadedForFamilleIdRef : au plus un chargement par famille quand la zone est visible
  // chartsLoadedRef pour éviter closure obsolète sans ajouter chartsLoaded aux deps (limiter re-runs)
  useEffect(() => {
    if (!statsComparativesRequested || !famille?.id || !user?.id) return;
    if (fetchStatsComparativesInProgressRef.current) return; // pas de double fetch
    if (statsComparativesLoadedForFamilleIdRef.current === famille.id) {
      setStatsComparativesRequested(false);
      return;
    }
    if (chartsLoadedRef.current?.statsComparatives && statsComparativesLoadedForFamilleIdRef.current !== null) {
      setStatsComparativesRequested(false);
      return;
    }
    let cancelled = false;
    fetchStatsComparativesInProgressRef.current = true;
    setLoadingStatsComparatives(true);
    fetchStatsComparatives()
      .then(() => {
        if (!cancelled) {
          statsComparativesLoadedForFamilleIdRef.current = famille.id;
          setChartsLoaded(prev => ({ ...prev, statsComparatives: true }));
        }
      })
      .finally(() => {
        fetchStatsComparativesInProgressRef.current = false;
        setLoadingStatsComparatives(false);
        if (!cancelled) setStatsComparativesRequested(false);
      });
    return () => { cancelled = true; };
  }, [statsComparativesRequested, famille?.id, user?.id]);
  
  // Fonction pour récupérer les alertes
  const fetchAlertes = async () => {
    if (!famille || !user) return;
    
    try {
      // Disciples inactifs depuis plus de 30 jours
      const dateLimite = new Date();
      dateLimite.setDate(dateLimite.getDate() - 30);
      
      const { data: membresInactifs } = await supabase
        .from('profils')
        .select('id, first_name, last_name, last_activity, created_at')
        .eq('famille_id', famille.id)
        .or(`last_activity.lt.${dateLimite.toISOString()},last_activity.is.null`)
        .order('created_at', { ascending: false });
      
      // Membres sans progression de formation (aucune formation terminée ni en cours)
      const { data: tousMembres } = await supabase
        .from('profils')
        .select('id, first_name, last_name')
        .eq('famille_id', famille.id);
      
      const allMemberIds = (tousMembres || []).map(m => m.id);
      
      const membresSansProgression = [];
      if (allMemberIds.length > 0) {
        for (const memberId of allMemberIds) {
          // Récupérer les progression_id pour ce membre
          const { data: memberProgressions } = await supabase
            .from('user_parcours_progression')
            .select('id')
            .eq('user_id', memberId);
          
          const memberProgressionIds = memberProgressions?.map(p => p.id) || [];
          
          let formations = 0;
          if (memberProgressionIds.length > 0) {
            const { count: formationsCount } = await supabase
              .from('user_module_progression')
              .select('id', { count: 'exact', head: true })
              .in('progression_id', memberProgressionIds)
              .eq('est_complete', true);
            formations = formationsCount || 0;
          }
          
          const { count: videos } = await supabase
            .from('video_progress')
            .select('id', { count: 'exact', head: true })
            .eq('disciple_id', memberId)
            .gt('progress_percentage', 0);
          
          if ((formations || 0) === 0 && (videos || 0) === 0) {
            const membre = tousMembres?.find(m => m.id === memberId) || 
                          disciplesData?.find(d => d.id === memberId);
            if (membre) {
              membresSansProgression.push(membre);
            }
          }
        }
      }
      
      setAlertes({
        disciplesInactifs: membresInactifs || [],
        membresSansProgression: membresSansProgression.slice(0, 10) // Limiter à 10
      });
    } catch (error) {
      console.error('Erreur récupération alertes:', error);
    }
  };

  // Fonction helper pour détecter et appliquer les opérateurs de comparaison
  const checkNombreDisciples = (searchTerm, nombreDisciples) => {
    const trimmed = searchTerm.trim();
    
    // Détecter >= ou ≥
    if (trimmed.startsWith('>=') || trimmed.startsWith('≥')) {
      const num = parseInt(trimmed.substring(2).trim());
      if (!isNaN(num)) {
        return nombreDisciples >= num;
      }
    }
    
    // Détecter <= ou ≤
    if (trimmed.startsWith('<=') || trimmed.startsWith('≤')) {
      const num = parseInt(trimmed.substring(2).trim());
      if (!isNaN(num)) {
        return nombreDisciples <= num;
      }
    }
    
    // Détecter >
    if (trimmed.startsWith('>')) {
      const num = parseInt(trimmed.substring(1).trim());
      if (!isNaN(num)) {
        return nombreDisciples > num;
      }
    }
    
    // Détecter <
    if (trimmed.startsWith('<')) {
      const num = parseInt(trimmed.substring(1).trim());
      if (!isNaN(num)) {
        return nombreDisciples < num;
      }
    }
    
    // Recherche exacte si c'est un nombre simple
    const searchNum = parseInt(trimmed);
    if (!isNaN(searchNum)) {
      return nombreDisciples === searchNum;
    }
    
    return false;
  };

  // Filtrer les membres
  const filteredMembres = membres
    .map(membre => {
      const nombreDisciples = membresDisciplesCount[membre.id] ?? 0;
      // Log pour déboguer si le nombre est 0
      if (nombreDisciples === 0 && Object.keys(membresDisciplesCount).length > 0) {
        devLog(`🔍 Membre ${membre.first_name} ${membre.last_name} (${membre.id}): nombreDisciples = ${nombreDisciples}, disponible dans map: ${membre.id in membresDisciplesCount}`);
      }
      return {
        ...membre,
        nombreDisciples
      };
    })
    .filter(membre => {
      // Recherche simultanée dans prénom, nom, et nombre de disciples
      const matchesSearch = searchTerm === '' || (() => {
        const searchLower = searchTerm.toLowerCase();
        // Recherche dans prénom
        const matchesPrenom = membre.first_name?.toLowerCase().includes(searchLower) || false;
        // Recherche dans nom
        const matchesNom = membre.last_name?.toLowerCase().includes(searchLower) || false;
        // Recherche dans nombre de disciples avec opérateurs de comparaison
        const matchesNombre = checkNombreDisciples(searchTerm, membre.nombreDisciples);
        // Recherche dans email
        const matchesEmail = membre.email?.toLowerCase().includes(searchLower) || false;
        
        return matchesPrenom || matchesNom || matchesNombre || matchesEmail;
      })();
      
      const matchesStatus = statusFilter === 'tous' || 
        (statusFilter === 'actif' && membre.statut_spirituel !== 'inactif') ||
        (statusFilter === 'inactif' && membre.statut_spirituel === 'inactif');
      
      // Filtre par date d'inscription
      const matchesDate = !dateFilter || (() => {
        if (!membre.created_at) return false;
        const membreDate = new Date(membre.created_at).toISOString().split('T')[0];
        return membreDate === dateFilter;
      })();
      
      // Filtre par progression
      const matchesProgression = progressionFilter === 'tous' || (() => {
        const progression = membresProgression[membre.id];
        if (progressionFilter === 'avec') {
          return progression && (progression.formations > 0 || progression.videos > 0);
        }
        if (progressionFilter === 'sans') {
          return !progression || (progression.formations === 0 && progression.videos === 0);
        }
        return true;
      })();
      
      return matchesSearch && matchesStatus && matchesDate && matchesProgression;
    })
    .sort((a, b) => {
      // Tri décroissant par nombre de disciples
      const aCount = a.nombreDisciples || 0;
      const bCount = b.nombreDisciples || 0;
      // Si même nombre de disciples, trier par nom
      if (bCount === aCount) {
        const aName = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
        const bName = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
        return aName.localeCompare(bName);
      }
      return bCount - aCount;
    });

  // Toujours utiliser la pagination pour afficher les membres
  const totalPages = Math.ceil(filteredMembres.length / itemsPerPage);
  const paginatedMembres = filteredMembres.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Réinitialiser la page si nécessaire
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Fonction pour récupérer les disciples d'un membre (même logique que DiscipleDetail.jsx)
  const fetchDisciplesOfMembre = async (membreId, membreName) => {
    if (!membreId) return;

    setLoadingDisciplesList(true);
    setSelectedMembreForDisciples({ id: membreId, name: membreName });
    
    try {
      const { data: disciplesData, error: disciplesError } = await supabase
        .from('profils')
        .select('id, first_name, last_name, email, avatar_url, circle_type, created_at, mentor_id')
        .eq('mentor_id', membreId)
        .order('created_at', { ascending: false });

      if (disciplesError) throw disciplesError;

      if (!disciplesData || disciplesData.length === 0) {
        setDisciplesList([]);
        return;
      }

      const disciplesIds = disciplesData.map(d => d.id);
      const { data: sousDisciplesData, error: sousDisciplesError } = await supabase
        .from('profils')
        .select('mentor_id')
        .in('mentor_id', disciplesIds);

      if (sousDisciplesError) throw sousDisciplesError;

      const disciplesSuivisMap = {};
      if (sousDisciplesData) {
        sousDisciplesData.forEach(sousDisciple => {
          const parentId = sousDisciple.mentor_id;
          if (parentId) disciplesSuivisMap[parentId] = (disciplesSuivisMap[parentId] || 0) + 1;
        });
      }

      const disciplesAvecCompte = disciplesData.map(discipleItem => ({
        id: discipleItem.id,
        first_name: discipleItem.first_name || '',
        last_name: discipleItem.last_name || '',
        name: `${(discipleItem.first_name || '')} ${(discipleItem.last_name || '')}`.trim(),
        email: discipleItem.email || null,
        avatar_url: discipleItem.avatar_url || null,
        circle_type: discipleItem.circle_type || null,
        created_at: discipleItem.created_at || null,
        disciplesSuivis: disciplesSuivisMap[discipleItem.id] || 0
      }));

      setDisciplesList(disciplesAvecCompte);
    } catch (error) {
      console.error('Erreur lors de la récupération des disciples suivis:', error);
      setDisciplesList([]);
    } finally {
      setLoadingDisciplesList(false);
    }
  };

  // Fonctions d'export
  const handleExportFilteredList = async (format) => {
    try {
      // Vérifier que membres existe
      if (!membres || membres.length === 0) {
        toast({
          title: 'Aucune donnée',
          description: 'Aucun membre disponible dans la famille.',
          variant: 'destructive',
        });
        return;
      }

      // Vérifier que filteredMembres existe et n'est pas vide
      if (!filteredMembres || filteredMembres.length === 0) {
        toast({
          title: 'Aucune donnée',
          description: 'Aucun membre ne correspond aux filtres appliqués.',
          variant: 'destructive',
        });
        return;
      }

      devLog('📊 Export démarré:', { format, nombreMembres: filteredMembres.length, totalMembres: membres.length });

      const exportData = filteredMembres.map(membre => ({
        'Prénom': membre.first_name || '',
        'Nom': membre.last_name || '',
        'Email': membre.email || '',
        'Statut': membre.statut_spirituel === 'inactif' ? 'Inactif' : 'Actif',
        'Nombre de Disciples': membre.nombreDisciples || 0,
        'Formations terminées': membresProgression[membre.id]?.formations || 0,
        'Vidéos terminées': membresProgression[membre.id]?.videos || 0,
        'Total progression': membresProgression[membre.id]?.total || 0,
        'Suivi par': membresSuiviPar[membre.id]?.name || '-',
        'Date d\'inscription': membre.created_at ? format(new Date(membre.created_at), 'dd/MM/yyyy', { locale: fr }) : ''
      }));

      const filename = `membres_famille_${famille?.nom || 'export'}_${format(new Date(), 'yyyy-MM-dd', { locale: fr })}`;
      
      if (format === 'pdf') {
        const tempDiv = document.createElement('div');
        const uniqueId = `pdf-export-${Date.now()}`;
        tempDiv.id = uniqueId;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = '800px';
        tempDiv.style.padding = '20px';
        tempDiv.style.backgroundColor = '#ffffff';
        tempDiv.innerHTML = `
          <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #9333ea; margin-bottom: 10px;">Liste des Membres - ${famille?.nom || 'Famille'}</h2>
            <p style="color: #666; margin-bottom: 5px;">Exporté le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p>
            <p style="color: #666; margin-bottom: 20px;">Total: ${filteredMembres.length} membre(s)</p>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Prénom</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Nom</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Email</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Statut</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Disciples</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Progression</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Suivi par</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Date</th>
                </tr>
              </thead>
              <tbody>
                ${filteredMembres.map(m => `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${m.first_name || ''}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${m.last_name || ''}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${m.email || '-'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${m.statut_spirituel === 'inactif' ? 'Inactif' : 'Actif'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${m.nombreDisciples || 0}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${membresProgression[m.id]?.total || 0}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${membresSuiviPar[m.id]?.name || '-'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy', { locale: fr }) : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        document.body.appendChild(tempDiv);
        
        // Attendre que l'élément soit dans le DOM
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const pdfFilename = `${filename}.pdf`;
        devLog('📄 Tentative export PDF:', { uniqueId, pdfFilename });
        
        try {
          await exportElementToPDF(uniqueId, pdfFilename, {
            title: 'Liste des Membres de la Famille',
            subtitle: famille ? `Famille: ${famille.nom}` : '',
            showHeader: true,
            showFooter: true,
            additionalInfo: {
              'Superviseur': `${superviseurNom.first_name} ${superviseurNom.last_name}`,
              'Nombre de membres': filteredMembres.length,
              'Filtres appliqués': searchTerm || statusFilter !== 'tous' || dateFilter || progressionFilter !== 'tous' ? 'Oui' : 'Non'
            }
          });
          devLog('✅ Export PDF réussi');
          document.body.removeChild(tempDiv);
        } catch (pdfError) {
          console.error('❌ Erreur export PDF:', pdfError);
          document.body.removeChild(tempDiv);
          throw pdfError;
        }
      } else {
        devLog('📊 Tentative export Excel:', { filename, nombreLignes: exportData.length });
        try {
          exportToExcel(exportData, filename, {
            title: 'Liste des Membres de la Famille',
            description: famille ? `Famille: ${famille.nom}` : '',
            additionalInfo: {
              'Superviseur': `${superviseurNom.first_name} ${superviseurNom.last_name}`,
              'Nombre de membres': filteredMembres.length.toString(),
              'Filtres appliqués': searchTerm || statusFilter !== 'tous' || dateFilter || progressionFilter !== 'tous' ? 'Oui' : 'Non'
            }
          });
          devLog('✅ Export Excel réussi');
        } catch (excelError) {
          console.error('❌ Erreur export Excel:', excelError);
          throw excelError;
        }
      }
      
      toast({
        title: 'Export réussi',
        description: `La liste a été exportée en ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('❌ Erreur export complète:', error);
      toast({
        title: 'Erreur',
        description: `Impossible d'exporter la liste: ${error.message || 'Erreur inconnue'}`,
        variant: 'destructive',
      });
    }
  };

  const handleExportDisciplesList = async (format) => {
    if (!selectedMembreForDisciples || disciplesList.length === 0) return;
    
    try {
      const exportData = disciplesList.map(disciple => ({
        'Prénom': disciple.first_name || '',
        'Nom': disciple.last_name || '',
        'Email': disciple.email || '',
        'Type de cercle': disciple.circle_type || '',
        'Disciples suivis': disciple.disciplesSuivis || 0,
        'Date d\'ajout': disciple.created_at ? format(new Date(disciple.created_at), 'dd/MM/yyyy', { locale: fr }) : ''
      }));

      const filename = `disciples_${selectedMembreForDisciples.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd', { locale: fr })}`;
      
      if (format === 'pdf') {
        const tempDiv = document.createElement('div');
        const uniqueId = `pdf-export-disciples-${Date.now()}`;
        tempDiv.id = uniqueId;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = '800px';
        tempDiv.style.padding = '20px';
        tempDiv.style.backgroundColor = '#ffffff';
        tempDiv.innerHTML = `
          <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #9333ea; margin-bottom: 10px;">Disciples de ${selectedMembreForDisciples.name}</h2>
            <p style="color: #666; margin-bottom: 5px;">Exporté le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p>
            <p style="color: #666; margin-bottom: 20px;">Total: ${disciplesList.length} disciple(s)</p>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Prénom</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Nom</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Email</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Type</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Disciples suivis</th>
                </tr>
              </thead>
              <tbody>
                ${disciplesList.map(d => `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${d.first_name || ''}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${d.last_name || ''}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${d.email || '-'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${d.circle_type || '-'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${d.disciplesSuivis || 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        document.body.appendChild(tempDiv);
        const pdfFilename = `disciples_${selectedMembreForDisciples.name.replace(/\s+/g, '_')}`;
        await exportElementToPDF(uniqueId, pdfFilename, {
          title: `Disciples de ${selectedMembreForDisciples.name}`,
          subtitle: `Liste des disciples suivis par ce membre`,
          showHeader: true,
          showFooter: true,
          additionalInfo: {
            'Nombre de disciples': disciplesList.length.toString(),
            'Membre suivi': selectedMembreForDisciples.name
          }
        });
        document.body.removeChild(tempDiv);
      } else {
        exportToExcel(exportData, filename, {
          title: `Disciples de ${selectedMembreForDisciples.name}`,
          description: `Liste des disciples suivis par ce membre`,
          additionalInfo: {
            'Nombre de disciples': disciplesList.length.toString(),
            'Membre suivi': selectedMembreForDisciples.name
          }
        });
      }
      
      toast({
        title: 'Export réussi',
        description: `La liste des disciples a été exportée en ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'exporter la liste',
        variant: 'destructive',
      });
    }
  };

  const handleExportSelectedExcel = () => {
    const selectedData = filteredMembres.filter(m => selectedMembres.includes(m.id));
    const exportData = selectedData.map(membre => ({
      'Prénom': membre.first_name || '',
      'Nom': membre.last_name || '',
      'Email': membre.email || '',
      'Statut': membre.statut_spirituel === 'inactif' ? 'Inactif' : 'Actif',
      'Nombre de Disciples': membre.nombreDisciples || 0,
      'Formations terminées': membresProgression[membre.id]?.formations || 0,
      'Vidéos terminées': membresProgression[membre.id]?.videos || 0,
      'Total progression': membresProgression[membre.id]?.total || 0,
      'Date d\'inscription': membre.created_at ? format(new Date(membre.created_at), 'dd/MM/yyyy', { locale: fr }) : ''
    }));
    const filename = `membres_selectionnes_${format(new Date(), 'yyyy-MM-dd', { locale: fr })}`;
    exportToExcel(exportData, filename);
    toast({ title: 'Export réussi', description: `${selectedMembres.length} membre(s) exporté(s)`, });
  };

  const handleExportSelectedPdf = async () => {
    try {
      const selectedData = filteredMembres.filter(m => selectedMembres.includes(m.id));
      const tempDiv = document.createElement('div');
      const uniqueId = `pdf-export-${Date.now()}`;
      tempDiv.id = uniqueId;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.padding = '20px';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.innerHTML = `
        <div style="font-family: Arial, sans-serif;">
          <h2 style="color: #9333ea; margin-bottom: 10px;">Membres Sélectionnés - ${famille?.nom || 'Famille'}</h2>
          <p style="color: #666; margin-bottom: 5px;">Exporté le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p>
          <p style="color: #666; margin-bottom: 20px;">Total: ${selectedData.length} membre(s)</p>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Prénom</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Nom</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Email</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Statut</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Disciples</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Progression</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #111;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${selectedData.map(m => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${m.first_name || ''}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${m.last_name || ''}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${m.email || '-'}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${m.statut_spirituel === 'inactif' ? 'Inactif' : 'Actif'}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${m.nombreDisciples || 0}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${membresProgression[m.id]?.total || 0}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; color: #111;">${m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy', { locale: fr }) : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      document.body.appendChild(tempDiv);
      const filename = `membres_selectionnes_${format(new Date(), 'yyyy-MM-dd', { locale: fr })}.pdf`;
      await exportElementToPDF(uniqueId, filename);
      document.body.removeChild(tempDiv);
      toast({ title: 'Export réussi', description: `${selectedMembres.length} membre(s) exporté(s) en PDF`, });
    } catch (error) {
      console.error('Erreur export PDF:', error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'exporter en PDF. Veuillez réessayer.', });
    }
  };

  // Fonctions pour sélection multiple
  const toggleSelectMembre = (membreId) => {
    setSelectedMembres(prev => 
      prev.includes(membreId) 
        ? prev.filter(id => id !== membreId)
        : [...prev, membreId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMembres.length === paginatedMembres.length) {
      setSelectedMembres([]);
    } else {
      setSelectedMembres(paginatedMembres.map(m => m.id));
    }
  };

  const handleFamilleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFamilleAvatarFile(file);
      const objectUrl = URL.createObjectURL(file);
      setFamilleAvatarPreview(objectUrl);
    }
  };

  const handlePasteurAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPasteurAvatarFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPasteurAvatarPreview(objectUrl);
    }
  };

  const uploadFamilleAvatar = async () => {
    if (!familleAvatarFile || !famille) return;
    
    setUploadingFamilleAvatar(true);
    try {
      const compressedFile = await compressImage(familleAvatarFile, {
        maxWidth: 300,
        maxHeight: 300,
        quality: 0.85
      });

      const fileName = `famille-avatars/${famille.id}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('resources')
        .getPublicUrl(fileName);

      // Mettre à jour la famille avec l'avatar
      const { error: updateError } = await supabase
        .from('familles_disciples')
        .update({ avatar_url: publicData.publicUrl })
        .eq('id', famille.id);

      if (updateError) throw updateError;

      setFamilleAvatarPreview(publicData.publicUrl);
      setFamilleAvatarFile(null);
      toast({
        title: "Succès",
        description: "Photo de la famille mise à jour avec succès."
      });
    } catch (error) {
      console.error('Erreur upload avatar famille:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de télécharger la photo."
      });
    } finally {
      setUploadingFamilleAvatar(false);
    }
  };

  const uploadPasteurAvatar = async () => {
    if (!pasteurAvatarFile || !pasteur) return;
    
    setUploadingPasteurAvatar(true);
    try {
      const compressedFile = await compressImage(pasteurAvatarFile, {
        maxWidth: 300,
        maxHeight: 300,
        quality: 0.85
      });

      const fileName = `pasteur-avatars/${pasteur.id}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('resources')
        .getPublicUrl(fileName);

      // Mettre à jour le pasteur avec l'avatar
      const { error: updateError } = await supabase
        .from('profils')
        .update({ avatar_url: publicData.publicUrl })
        .eq('id', pasteur.id);

      if (updateError) throw updateError;

      setPasteurAvatarPreview(publicData.publicUrl);
      setPasteurAvatarFile(null);
      refetchPhase1();
      toast({
        title: "Succès",
        description: "Photo du pasteur mise à jour avec succès."
      });
    } catch (error) {
      console.error('Erreur upload avatar pasteur:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de télécharger la photo."
      });
    } finally {
      setUploadingPasteurAvatar(false);
    }
  };

  // Spinner pleine page uniquement au premier chargement (pas à chaque refetch KPI)
  if (phase1Loading || (loading && !hasInitiallyLoadedRef.current)) {
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
        />

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
