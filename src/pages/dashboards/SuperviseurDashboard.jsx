import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Target, TrendingUp, UserCheck, Activity, 
  Church, ChevronRight, Loader2, UserCircle, Eye, ArrowLeft, Camera, Sparkles, Zap, Trophy, Star, AlertCircle, Clock,
  Moon, Heart, HeartHandshake, UserPlus, Megaphone, Book, CheckCircle2, PlayCircle, GraduationCap, Download, FileText, History, Search, X, Calendar, User, ChevronDown, ChevronUp
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getWeek, getQuarter, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfMonth, endOfMonth, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { compressImage } from '@/lib/ImageCompression';
import { useToast } from '@/components/ui/use-toast';
import { exportElementToPDF, exportToExcel } from '@/lib/ExportUtils';
import { getOrSetCache, clearCache } from '@/lib/CacheUtils';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useSuperviseurData } from '@/hooks/useSuperviseurData';
import performanceMonitor from '@/lib/PerformanceMonitor';
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Brush, ReferenceLine
} from 'recharts';
import { WelcomeBanner } from './superviseur/WelcomeBanner';
import { ChartsKpi } from './superviseur/ChartsKpi';
import { StatsComparatives } from './superviseur/StatsComparatives';
import { ActiviteRecente } from './superviseur/ActiviteRecente';
import { AlertesSection } from './superviseur/AlertesSection';

const PAGE_NAME = 'SuperviseurDashboard';
const LOAD_TIME_ALERT_MS = 4000; // Seuil au-delà duquel on affiche une alerte performance

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
              console.log('✅ Données formations/vidéos générées (lazy loading)');
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
              console.log('✅ Statuts spirituels calculés (lazy loading)');
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
              console.log('✅ Activité récente récupérée (lazy loading)');
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
        console.log('✅ Aucun disciple à mettre à jour en Mentor/Pilier');
        return;
      }

      console.log(`🔄 Mise à jour de ${membresAUpdater.length} disciple(s) en Mentor/Pilier:`, 
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

        console.log(`✅ ${membre.first_name} ${membre.last_name} mis à jour en Mentor/Pilier`);
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
              // 1. Trouver le mentor (pilier) du disciple depuis cercle_personnes
              const { data: cercleData } = await supabase
                .from('cercle_personnes')
                .select('user_id, first_name, last_name')
                .eq('id', disciple.id)
                .maybeSingle();

              const mentorPrenom = cercleData?.first_name || '';
              const mentorNom = cercleData?.last_name || '';
              const mentorId = cercleData?.user_id || null;

              // Si pas de mentor dans cercle_personnes, chercher dans profils (mentor avec famille_id)
              let mentorInfo = { prenom: mentorPrenom, nom: mentorNom, id: mentorId };
              if (!mentorId) {
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

              // 3. Nombre de disciples (depuis cercle_personnes)
              const { count: nombreDisciples } = await supabase
                .from('cercle_personnes')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', mentor.id);

              const nombreDisciplesTotal = nombreDisciples || 0;

              // 4. Avancement % (nombreDisciples / 70 * 100)
              const objectif = 70;
              const avancementPourcentage = Math.min((nombreDisciplesTotal / objectif) * 100, 100);

              // 5. Nombre de disciples présents à l'église
              const { data: disciplesData } = await supabase
                .from('cercle_personnes')
                .select('id')
                .eq('user_id', mentor.id);

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

      // Étape 3 : un seul appel RPC agrégé (migration 094) au lieu de ~15+ appels
      const cacheKeyRpc = `superviseur_${user.id}_phase2_rpc_${familleData.id}`;
      let payload = null;
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
          2 * 60 * 1000 // 2 minutes
        );
      } catch (rpcErr) {
        console.warn('RPC get_superviseur_dashboard_phase2 non disponible (exécuter migration 094), repli appels directs:', rpcErr?.message);
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
            const [membresResult, disciplesResult] = await Promise.all([
              supabase.from('profils').select('id, first_name, last_name, email, avatar_url, created_at, role').eq('famille_id', familleData.id).order('created_at', { ascending: false }),
              supabase.from('cercle_personnes').select('id, first_name, last_name, email, avatar_url, created_at, start_date, parent_disciple_id, user_id').eq('user_id', user.id)
            ]);
            const { data: membresData, error: membresError } = membresResult;
            const { data: disciplesData, error: disciplesError } = disciplesResult;
            if (membresError) throw membresError;
            if (disciplesError) throw disciplesError;
            return { membresData: membresData || [], disciplesData: disciplesData || [] };
          },
          2 * 60 * 1000
        );
        if (!cachedMembres) return;
        const { membresData, disciplesData } = cachedMembres;
        tousLesMembres = [];
        if (membresData) {
          membresData.forEach(profil => {
            if (profil.id === user.id) return;
            tousLesMembres.push({ ...profil, statut_spirituel: 'actif', source: 'profils', role: profil.role || 'disciple' });
          });
        }
        if (disciplesData) {
          disciplesData.forEach(disciple => {
            if (tousLesMembres.some(m => m.id === disciple.id)) return;
            tousLesMembres.push({
              id: disciple.id,
              first_name: disciple.first_name || '',
              last_name: disciple.last_name || '',
              email: disciple.email || null,
              avatar_url: disciple.avatar_url || null,
              created_at: disciple.start_date || disciple.created_at || null,
              statut_spirituel: 'actif',
              role: 'disciple',
              source: 'cercle_personnes',
              parent_disciple_id: disciple.parent_disciple_id || null
            });
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
          const [progressionsRes, allProgressionsRes, videosRes, directRes, subRes] = await Promise.all([
            supabase.from('user_parcours_progression').select('id').in('user_id', membreIds),
            supabase.from('user_parcours_progression').select('id, user_id').in('user_id', membreIds),
            supabase.from('video_progress').select('disciple_id').in('disciple_id', membreIds).eq('is_completed', true),
            supabase.from('cercle_personnes').select('user_id').in('user_id', membreIds),
            supabase.from('cercle_personnes').select('parent_disciple_id').in('parent_disciple_id', membreIds)
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
          const directDisciplesResult = directRes;
          const subDisciplesResult = subRes;
          const disciplesCountMap = {};
          tousLesMembres.forEach(m => { disciplesCountMap[m.id] = 0; });
          directDisciplesResult.data?.forEach(d => { if (d.user_id && disciplesCountMap[d.user_id] !== undefined) disciplesCountMap[d.user_id] = (disciplesCountMap[d.user_id] || 0) + 1; });
          subDisciplesResult.data?.forEach(d => { if (d.parent_disciple_id && disciplesCountMap[d.parent_disciple_id] !== undefined) disciplesCountMap[d.parent_disciple_id] = (disciplesCountMap[d.parent_disciple_id] || 0) + 1; });
          setMembresDisciplesCount(disciplesCountMap);
          updateDisciplesToMentors(disciplesCountMap, tousLesMembres).catch(() => {});
          const allCercleData = (await supabase.from('cercle_personnes').select('id, user_id, parent_disciple_id, first_name, last_name').in('id', membreIds)).data || [];
          const cercleMap = {};
          allCercleData.forEach(c => { cercleMap[c.id] = c; });
          const uniqueUserIds = [...new Set(allCercleData.filter(c => c.user_id).map(c => c.user_id))];
          const uniqueParentIds = [...new Set(allCercleData.filter(c => c.parent_disciple_id).map(c => c.parent_disciple_id))];
          const [profilsData, parentDisciplesData] = await Promise.all([
            uniqueUserIds.length ? supabase.from('profils').select('id, first_name, last_name').in('id', uniqueUserIds) : { data: [] },
            uniqueParentIds.length ? supabase.from('cercle_personnes').select('id, first_name, last_name').in('id', uniqueParentIds) : { data: [] }
          ]);
          const profilsMap = {}; (profilsData.data || []).forEach(p => { profilsMap[p.id] = p; });
          const parentsMap = {}; (parentDisciplesData.data || []).forEach(p => { parentsMap[p.id] = p; });
          const suiviParMap = {};
          tousLesMembres.forEach(membre => {
            const c = cercleMap[membre.id];
            if (c?.parent_disciple_id && parentsMap[c.parent_disciple_id]) {
              const p = parentsMap[c.parent_disciple_id];
              suiviParMap[membre.id] = { name: `${p.first_name || ''} ${p.last_name || ''}`.trim(), id: c.parent_disciple_id };
            } else if (c?.user_id && profilsMap[c.user_id]) {
              const pr = profilsMap[c.user_id];
              suiviParMap[membre.id] = { name: `${pr.first_name || ''} ${pr.last_name || ''}`.trim(), id: c.user_id };
            } else if (membre.source === 'profils' && membre.role !== 'superviseur') {
              suiviParMap[membre.id] = { name: `${superviseurNom.first_name || ''} ${superviseurNom.last_name || ''}`.trim(), id: user.id };
            }
          });
          setMembresSuiviPar(suiviParMap);
        }
      }

      // 5. Récupérer les rapports du superviseur pour les graphiques
      const { data: rapportsData, error: rapportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (!rapportsError && rapportsData) {
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
      // Ces données seront chargées uniquement quand les sections correspondantes sont visibles
      console.log('📊 Données principales chargées. Les graphiques seront chargés de manière paresseuse.');
      
      // Seules les alertes sont chargées immédiatement car elles sont importantes
      try {
        await fetchAlertes();
        console.log('✅ Alertes récupérées');
      } catch (error) {
        console.error('❌ Erreur récupération alertes:', error);
      }

      // 6. OPTIMISATION: Récupérer les autres superviseurs de la famille (même pasteur_id) avec calculs groupés
      if (superviseurData?.pasteur_id) {
        const { data: superviseursData, error: superviseursError } = await supabase
          .from('profils')
          .select('id, first_name, last_name, email, avatar_url')
          .eq('pasteur_id', superviseurData.pasteur_id)
          .eq('role', 'superviseur')
          .neq('id', user.id) // Exclure le superviseur actuel
          .order('first_name', { ascending: true });

        if (!superviseursError && superviseursData) {
          setSuperviseursFamille(superviseursData || []);
          
          // OPTIMISATION: Récupérer toutes les familles et compter les membres en requêtes groupées
          const membresCountMap = {};
          if (superviseursData.length > 0) {
            const superviseurIds = superviseursData.map(s => s.id);
            
            // Récupérer toutes les familles des superviseurs en une seule requête
            const { data: allFamilles, error: famillesError } = await supabase
              .from('familles_disciples')
              .select('id, superviseur_id')
              .in('superviseur_id', superviseurIds);

            if (!famillesError && allFamilles) {
              // Créer un map superviseur_id -> famille_id
              const superviseurToFamilleMap = {};
              const familleIds = [];
              allFamilles.forEach(famille => {
                superviseurToFamilleMap[famille.superviseur_id] = famille.id;
                familleIds.push(famille.id);
              });

              // Récupérer tous les comptages en requêtes groupées
              const [profilsCountsResult, cercleCountsResult] = await Promise.all([
                // Compter les membres depuis profils pour toutes les familles
                familleIds.length > 0
                  ? supabase
                      .from('profils')
                      .select('famille_id')
                      .in('famille_id', familleIds)
                  : Promise.resolve({ data: [] }),
                // Compter les membres depuis cercle_personnes pour tous les superviseurs
                supabase
                  .from('cercle_personnes')
                  .select('user_id')
                  .in('user_id', superviseurIds)
              ]);

              // Compter les membres par famille depuis profils
              const membresParFamille = {};
              profilsCountsResult.data?.forEach(p => {
                if (p.famille_id) {
                  membresParFamille[p.famille_id] = (membresParFamille[p.famille_id] || 0) + 1;
                }
              });

              // Compter les membres par superviseur depuis cercle_personnes
              const membresParSuperviseur = {};
              cercleCountsResult.data?.forEach(c => {
                if (c.user_id) {
                  membresParSuperviseur[c.user_id] = (membresParSuperviseur[c.user_id] || 0) + 1;
                }
              });

              // Calculer le total pour chaque superviseur
              superviseursData.forEach(superviseur => {
                const familleId = superviseurToFamilleMap[superviseur.id];
                const membresProfils = familleId ? (membresParFamille[familleId] || 0) : 0;
                const membresCercle = membresParSuperviseur[superviseur.id] || 0;
                membresCountMap[superviseur.id] = membresProfils + membresCercle;
              });
            }
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
      
      const { data: disciplesData } = await supabase
        .from('cercle_personnes')
        .select('id, created_at')
        .eq('user_id', user.id);
      
      const allMemberIds = [
        ...(membresData || []).map(m => m.id),
        ...(disciplesData || []).map(d => d.id)
      ];
      
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
      console.log('📊 Début calcul stats comparatives pour famille:', famille.id);
      
      // Ne pas réinitialiser les stats ici : loadingStatsComparatives gère l'affichage du spinner
      
      // Récupérer toutes les familles avec leurs statistiques
      const { data: toutesFamilles, error: famillesError } = await supabase
        .from('familles_disciples')
        .select('id, nom, nombre_disciples_actuels, objectif_disciples, superviseur_id');
      
      if (famillesError) {
        throw famillesError;
      }
      
      if (!toutesFamilles || toutesFamilles.length === 0) {
        console.log('⚠️ Aucune famille trouvée');
        setStatsComparatives({
          moyenneAutresFamilles: 0,
          classement: 1,
          totalFamilles: 0
        });
        return;
      }
      
      console.log(`📊 ${toutesFamilles.length} familles trouvées`);
      
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
            
            // Récupérer les membres depuis cercle_personnes
            let membresCercle = 0;
            if (f.superviseur_id) {
              const { count, error: cercleError } = await supabase
                .from('cercle_personnes')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', f.superviseur_id);
              
              if (!cercleError) {
                membresCercle = count || 0;
              } else {
                console.error(`Erreur cercle pour famille ${f.id}:`, cercleError);
              }
            }
            
            const totalMembres = (membresProfils || 0) + membresCercle;
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
      
      console.log('✅ Stats comparatives calculées:', {
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
      
      const { data: disciplesData } = await supabase
        .from('cercle_personnes')
        .select('id, first_name, last_name')
        .eq('user_id', user.id);
      
      const allMemberIds = [
        ...(tousMembres || []).map(m => m.id),
        ...(disciplesData || []).map(d => d.id)
      ];
      
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
        console.log(`🔍 Membre ${membre.first_name} ${membre.last_name} (${membre.id}): nombreDisciples = ${nombreDisciples}, disponible dans map: ${membre.id in membresDisciplesCount}`);
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
      // Récupérer tous les disciples qui ont ce membre comme user_id (mentor/superviseur)
      const { data: disciplesData, error: disciplesError } = await supabase
        .from('cercle_personnes')
        .select('id, first_name, last_name, name, email, avatar_url, circle_type, created_at, parent_disciple_id')
        .eq('user_id', membreId)
        .order('created_at', { ascending: false });

      if (disciplesError) throw disciplesError;

      if (!disciplesData || disciplesData.length === 0) {
        setDisciplesList([]);
        return;
      }

      // Pour chaque disciple, compter combien de disciples ils suivent eux-mêmes
      const disciplesIds = disciplesData.map(d => d.id);
      const { data: sousDisciplesData, error: sousDisciplesError } = await supabase
        .from('cercle_personnes')
        .select('parent_disciple_id')
        .in('parent_disciple_id', disciplesIds);

      if (sousDisciplesError) throw sousDisciplesError;

      // Créer un map pour compter les disciples suivis par chaque disciple
      const disciplesSuivisMap = {};
      if (sousDisciplesData) {
        sousDisciplesData.forEach(sousDisciple => {
          const parentId = sousDisciple.parent_disciple_id;
          disciplesSuivisMap[parentId] = (disciplesSuivisMap[parentId] || 0) + 1;
        });
      }

      // Enrichir les données avec le nombre de disciples suivis
      const disciplesAvecCompte = disciplesData.map(discipleItem => ({
        id: discipleItem.id,
        first_name: discipleItem.first_name || '',
        last_name: discipleItem.last_name || '',
        name: discipleItem.name || `${discipleItem.first_name || ''} ${discipleItem.last_name || ''}`.trim(),
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

      console.log('📊 Export démarré:', { format, nombreMembres: filteredMembres.length, totalMembres: membres.length });

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
        console.log('📄 Tentative export PDF:', { uniqueId, pdfFilename });
        
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
          console.log('✅ Export PDF réussi');
          document.body.removeChild(tempDiv);
        } catch (pdfError) {
          console.error('❌ Erreur export PDF:', pdfError);
          document.body.removeChild(tempDiv);
          throw pdfError;
        }
      } else {
        console.log('📊 Tentative export Excel:', { filename, nombreLignes: exportData.length });
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
          console.log('✅ Export Excel réussi');
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
        {/* Bouton retour */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        {/* Alerte de rappel pour le rapport mensuel (5 jours avant la fin du mois) */}
        {reportReminder && reportReminder.showReminder && (
          <Card className="bg-blue-50 border-blue-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Rappel : Rapport mensuel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-900 font-medium">
                    {reportReminder.daysLeft === 0 
                      ? "⏰ Le mois se termine aujourd'hui ! N'oubliez pas d'envoyer votre rapport mensuel."
                      : reportReminder.daysLeft === 1
                      ? "⏰ Le mois se termine demain ! N'oubliez pas d'envoyer votre rapport mensuel."
                      : `⏰ Le mois se termine dans ${reportReminder.daysLeft} jours ! N'oubliez pas d'envoyer votre rapport mensuel.`
                    }
                  </p>
                  <p className="text-sm text-blue-700 mt-2">
                    Vous pouvez envoyer votre rapport depuis la page "Envoyer un rapport".
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/send-report')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Envoyer le rapport
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
        <div className="grid gap-4 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
          <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Users className="h-5 w-5 text-purple-600" />
                  {(() => {
                    const nomComplet = `${superviseurNom.titre === 'Pasteur' ? 'Pasteur ' : ''}${superviseurNom.first_name || ''} ${superviseurNom.last_name || ''}`.trim();
                    return nomComplet ? `Famille de ${nomComplet}` : 'Ma Famille';
                  })()}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  <span>{famille.nom} ({famille.identifiant_famille})</span>
                  {user?.email && (
                    <span className="block mt-1 text-sm text-gray-500">{user.email}</span>
                  )}
                </CardDescription>
              </div>
              <div className="relative">
                <label htmlFor="famille-avatar" className="cursor-pointer">
                  <Avatar className="w-20 h-20 border-2 border-purple-200 hover:border-purple-400 transition-colors">
                    <AvatarImage src={familleAvatarPreview} alt={famille.nom} />
                    <AvatarFallback className="bg-purple-100 text-purple-600 text-lg">
                      {famille.nom.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-1.5 border-2 border-white shadow-sm hover:bg-purple-700 transition-colors">
                    <Camera className="h-3 w-3 text-white" />
                  </div>
                </label>
                <input
                  id="famille-avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFamilleAvatarChange}
                />
                {familleAvatarFile && (
                  <Button
                    size="sm"
                    onClick={uploadFamilleAvatar}
                    disabled={uploadingFamilleAvatar}
                    className="mt-2 w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {uploadingFamilleAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Enregistrer'
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Objectif</span>
                  <span className="text-lg font-semibold text-gray-900">{stats.objectif} disciples</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Membres actuels</span>
                  <span className="text-lg font-semibold text-purple-600">{stats.nombreMembres}</span>
                </div>
                {stats.reste > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Il manque</span>
                    <span className="text-lg font-semibold text-red-600">{stats.reste} Disciples</span>
                  </div>
                )}
                {stats.nombreMembres > stats.objectif && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Objectif Atteint</span>
                    <span className="text-lg font-semibold text-green-600">+ {stats.nombreMembres - stats.objectif} Disciples</span>
                  </div>
                )}
              </div>
              
              {/* Barre de progression */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progression</span>
                  <span className="font-medium">{stats.progression.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.progression}%` }}
                    transition={{ duration: 0.5 }}
                    className={cn(
                      "h-3 rounded-full",
                      stats.progression >= 100 ? "bg-green-500" : "bg-purple-600"
                    )}
                  />
                </div>
              </div>

              {stats.nombreMembres >= stats.objectif && (
                <Badge className="mt-4 bg-green-500 text-white">
                  <Target className="h-3 w-3 mr-1" />
                  Objectif atteint ! 🎉
                </Badge>
              )}
            </CardContent>
          </Card>
          </motion.div>

          {/* Carte du Pasteur de tutelle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
          <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Church className="h-5 w-5 text-purple-600" />
                  {pasteur ? `${pasteur.first_name} ${pasteur.last_name}` : 'Pasteur de tutelle'}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {pasteur ? `Pasteur de tutelle de la famille ${famille.nom}` : 'Responsable de votre famille'}
                </CardDescription>
              </div>
              <div className="relative">
                <label htmlFor="pasteur-avatar" className="cursor-pointer">
                  <Avatar className="w-20 h-20 border-2 border-purple-200 hover:border-purple-400 transition-colors">
                    {pasteur ? (
                      <>
                        <AvatarImage src={pasteurAvatarPreview || pasteur.avatar_url} alt={`${pasteur.first_name} ${pasteur.last_name}`} />
                        <AvatarFallback className="bg-purple-100 text-purple-600 text-lg">
                          {pasteur.first_name?.charAt(0) || ''}{pasteur.last_name?.charAt(0) || ''}
                        </AvatarFallback>
                      </>
                    ) : (
                      <AvatarFallback className="bg-gray-100 text-gray-400 text-lg">
                        <UserCircle className="h-8 w-8" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-1.5 border-2 border-white shadow-sm hover:bg-purple-700 transition-colors">
                    <Camera className="h-3 w-3 text-white" />
                  </div>
                </label>
                <input
                  id="pasteur-avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePasteurAvatarChange}
                  disabled={!pasteur}
                />
                {pasteurAvatarFile && (
                  <Button
                    size="sm"
                    onClick={uploadPasteurAvatar}
                    disabled={uploadingPasteurAvatar || !pasteur}
                    className="mt-2 w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {uploadingPasteurAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Enregistrer'
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {pasteur ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <UserCircle className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {pasteur.identifiant_unique}
                      </p>
                      <p className="text-sm text-gray-600">
                        {pasteur.first_name} {pasteur.last_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 pt-2 border-t border-gray-200 italic">
                    <p className="font-medium text-purple-600 mb-1">Matthieu 4:19 (LSG)</p>
                    <p className="text-gray-700">Jésus leur dit : Suivez-moi, et je vous ferai pêcheurs d'hommes.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-4">
                  <p className="text-sm text-gray-500">
                    Pasteur de tutelle non assigné
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          </motion.div>
        </div>

        {/* Liste des superviseurs de la famille */}
        {superviseursFamille.length > 0 && (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Users className="h-5 w-5 text-purple-600" />
                Autres Superviseurs de la famille
              </CardTitle>
              <CardDescription className="text-gray-600">
                Autres superviseurs sous la même tutelle pastorale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {superviseursFamille.map((superviseur) => (
                  <div
                    key={superviseur.id}
                    onClick={() => setSelectedSuperviseur(superviseur)}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors cursor-pointer"
                  >
                    <Avatar className="h-10 w-10 border border-gray-200">
                      <AvatarImage src={superviseur.avatar_url} alt={`${superviseur.first_name} ${superviseur.last_name}`} />
                      <AvatarFallback className="bg-purple-100 text-purple-600 text-sm">
                        {superviseur.first_name?.charAt(0) || ''}{superviseur.last_name?.charAt(0) || ''}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {superviseur.first_name} {superviseur.last_name}
                      </p>
                      {superviseur.titre && (
                        <p className="text-xs text-gray-500">{superviseur.titre}</p>
                      )}
                      {superviseur.email && (
                        <p className="text-xs text-gray-600 truncate">{superviseur.email}</p>
                      )}
                      {nombreMembresParSuperviseur[superviseur.id] !== undefined && (
                        <div className="flex items-center gap-1 mt-1">
                          <Users className="h-3 w-3 text-purple-600" />
                          <span className="text-xs font-semibold text-purple-600">
                            {nombreMembresParSuperviseur[superviseur.id] || 0} membre{nombreMembresParSuperviseur[superviseur.id] !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistiques rapides */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900">
                Membres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.nombreMembres}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                sur {stats.objectif} objectif
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900">
                Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.progression.toFixed(0)}%
              </div>
              <p className="text-xs text-gray-600 mt-1">
                vers l'objectif
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900">
                {stats.nombreMembres >= stats.objectif ? 'Continuons d\'évangéliser' : 'Disciples à évangéliser'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.nombreMembres >= stats.objectif ? 'text-green-600' : 'text-red-600'}`}>
                {stats.nombreMembres >= stats.objectif ? `+ ${stats.nombreMembres - stats.objectif}` : stats.reste}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {stats.nombreMembres >= stats.objectif ? 'Objectif atteint' : 'avant l\'objectif'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions rapides */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Button
                variant="outline"
                className="group justify-start bg-white border-gray-200 hover:bg-amber-500 hover:border-amber-500 text-gray-900 hover:text-white transition-colors"
                onClick={() => navigate('/familles')}
              >
                <Eye className="h-4 w-4 mr-2 text-purple-600 group-hover:text-white transition-colors" />
                Voir ma famille
              </Button>
              <Button
                variant="outline"
                className="group justify-start bg-white border-gray-200 hover:bg-amber-500 hover:border-amber-500 text-gray-900 hover:text-white transition-colors"
                onClick={() => navigate('/attendance')}
              >
                <Activity className="h-4 w-4 mr-2 text-purple-600 group-hover:text-white transition-colors" />
                Suivi de présence
              </Button>
              <Button
                variant="outline"
                className="group justify-start bg-white border-gray-200 hover:bg-amber-500 hover:border-amber-500 text-gray-900 hover:text-white transition-colors"
                onClick={() => navigate('/statistics')}
              >
                <TrendingUp className="h-4 w-4 mr-2 text-purple-600 group-hover:text-white transition-colors" />
                Statistiques
              </Button>
              <Button
                variant="outline"
                className="group justify-start bg-white border-gray-200 hover:bg-amber-500 hover:border-amber-500 text-gray-900 hover:text-white transition-colors"
                onClick={() => setShowHistory(true)}
              >
                <History className="h-4 w-4 mr-2 text-purple-600 group-hover:text-white transition-colors" />
                Voir l'historique
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section KPI avec filtres de période */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">
                {(() => {
                  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
                  if (kpiPeriodType === 'annuel') {
                    return `KPI Annuels ${kpiSelectedYearForPeriod}`;
                  } else if (kpiPeriodType === 'trimestriel') {
                    return `KPI Trimestriels T${kpiSelectedQuarter} ${kpiSelectedYearForPeriod}`;
                  } else if (kpiPeriodType === 'mensuel') {
                    const monthName = months[parseInt(kpiSelectedMonth)];
                    return `KPI Mensuels ${monthName} ${kpiSelectedYearForPeriod}`;
                  } else {
                    const selectedYear = parseInt(kpiSelectedYearForPeriod);
                    const selectedWeek = parseInt(kpiSelectedWeek);
                    const jan1 = new Date(selectedYear, 0, 1);
                    const firstWeekStart = startOfWeek(jan1, { weekStartsOn: 1 });
                    const targetWeekStart = new Date(firstWeekStart);
                    targetWeekStart.setDate(firstWeekStart.getDate() + (selectedWeek - 1) * 7);
                    const monthIndex = targetWeekStart.getMonth();
                    const monthName = months[monthIndex];
                    return `KPI Hebdomadaires Sem ${kpiSelectedWeek} ${monthName} ${kpiSelectedYearForPeriod}`;
                  }
                })()}
              </CardTitle>
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
                      <SelectTrigger className="w-[120px] bg-purple-600 border-0 text-white focus:ring-0 focus:ring-offset-0 focus:outline-none hover:bg-purple-700 [&>span]:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {[1, 2, 3, 4].map(q => (
                          <SelectItem key={q} value={q.toString()} className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">T{q}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  </>
                )}

                {kpiPeriodType === 'mensuel' && (
                  <>
                    <Select value={kpiSelectedMonth} onValueChange={setKpiSelectedMonth}>
                      <SelectTrigger className="w-[140px] bg-gray-100 border-0 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 max-h-[200px]">
                        {["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"].map((month, index) => (
                          <SelectItem key={index} value={index.toString()} className="text-gray-900 hover:bg-gray-100 hover:text-gray-600">{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
            <CardDescription className="mt-2">
              Indicateurs de performance pour la période sélectionnée
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 3 rangées de 4 cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Ligne 1 */}
              <div className="group text-center p-4 bg-gradient-to-br from-indigo-200 to-indigo-300 hover:bg-purple-600 rounded-lg border-2 border-indigo-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 group-hover:from-indigo-600 group-hover:to-indigo-800 bg-clip-text text-transparent">
                  {kpiData.culteSamediSoir || 0}
                </div>
                <div className="text-sm text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Culte du Samedi Soir</div>
                <Moon className="h-5 w-5 mx-auto mt-2 text-indigo-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-blue-200 to-blue-300 hover:bg-purple-600 rounded-lg border-2 border-blue-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 group-hover:from-blue-600 group-hover:to-blue-800 bg-clip-text text-transparent">
                  {kpiData.culteDimancheMatin || 0}
                </div>
                <div className="text-sm text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Culte du Dimanche Matin</div>
                <Church className="h-5 w-5 mx-auto mt-2 text-blue-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-cyan-200 to-cyan-300 hover:bg-purple-600 rounded-lg border-2 border-cyan-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-cyan-800 group-hover:from-cyan-600 group-hover:to-cyan-800 bg-clip-text text-transparent">
                  {kpiData.afterCulteDimanche || 0}
                </div>
                <div className="text-sm text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">After Culte du Dimanche</div>
                <Users className="h-5 w-5 mx-auto mt-2 text-cyan-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-amber-200 to-amber-300 hover:bg-purple-600 rounded-lg border-2 border-amber-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-amber-800 group-hover:from-amber-600 group-hover:to-amber-800 bg-clip-text text-transparent">
                  {kpiData.tempsPriere || 0}
                </div>
                <div className="text-sm text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Temps de Prière</div>
                <Heart className="h-5 w-5 mx-auto mt-2 text-amber-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-pink-200 to-pink-300 hover:bg-purple-600 rounded-lg border-2 border-pink-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-pink-800 group-hover:from-pink-600 group-hover:to-pink-800 bg-clip-text text-transparent">
                  {kpiData.personnesEvangelisees || 0}
                </div>
                <div className="text-sm text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Personnes évangélisées</div>
                <Target className="h-5 w-5 mx-auto mt-2 text-pink-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-emerald-200 to-emerald-300 hover:bg-purple-600 rounded-lg border-2 border-emerald-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-800 group-hover:from-emerald-600 group-hover:to-emerald-800 bg-clip-text text-transparent">
                  {kpiData.nouveauxConvertis || 0}
                </div>
                <div className="text-sm text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Nouveaux Convertis</div>
                <Heart className="h-5 w-5 mx-auto mt-2 text-emerald-700 group-hover:text-white transition-colors" />
              </div>
              
              {/* Ligne 2 */}
              <div className="group text-center p-4 bg-gradient-to-br from-rose-200 to-rose-300 hover:bg-purple-600 rounded-lg border-2 border-rose-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-to-r from-rose-600 to-rose-800 group-hover:from-rose-600 group-hover:to-rose-800 bg-clip-text text-transparent">
                  {kpiData.nouveauxArrivants || 0}
                </div>
                <div className="text-sm text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Nouveaux Arrivants</div>
                <UserPlus className="h-5 w-5 mx-auto mt-2 text-rose-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-teal-200 to-teal-300 hover:bg-purple-600 rounded-lg border-2 border-teal-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-teal-800 group-hover:from-teal-600 group-hover:to-teal-800 bg-clip-text text-transparent">
                  {kpiData.sortiesEvangelisation || 0}
                </div>
                <div className="text-sm text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Sorties d'Évangélisation</div>
                <Megaphone className="h-5 w-5 mx-auto mt-2 text-teal-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-purple-200 to-purple-300 hover:bg-purple-600 rounded-lg border-2 border-purple-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 group-hover:from-amber-500 group-hover:to-amber-700 bg-clip-text text-transparent">
                  {kpiData.comFratDisciples || 0}
                </div>
                <div className="text-sm text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Com Frat Disciples</div>
                <UserCheck className="h-5 w-5 mx-auto mt-2 text-purple-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-violet-200 to-violet-300 hover:bg-purple-600 rounded-lg border-2 border-violet-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-violet-800 group-hover:from-amber-500 group-hover:to-amber-700 bg-clip-text text-transparent">
                  {kpiData.veillee || 0}
                </div>
                <div className="text-sm text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Veillée</div>
                <Moon className="h-5 w-5 mx-auto mt-2 text-violet-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-orange-200 to-orange-300 hover:bg-purple-600 rounded-lg border-2 border-orange-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 group-hover:from-orange-600 group-hover:to-orange-800 bg-clip-text text-transparent">
                  {kpiData.meditationBible || 0}
                </div>
                <div className="text-sm text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Méditation Bible</div>
                <Book className="h-5 w-5 mx-auto mt-2 text-orange-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-green-200 to-green-300 hover:bg-purple-600 rounded-lg border-2 border-green-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-800 group-hover:from-green-600 group-hover:to-green-800 bg-clip-text text-transparent">
                  {kpiData.tempsPartage || 0}
                </div>
                <div className="text-sm text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Temps de Partage</div>
                <HeartHandshake className="h-5 w-5 mx-auto mt-2 text-green-700 group-hover:text-white transition-colors" />
              </div>
              
              {/* Ligne 4 - Nouvelles cartes */}
              <div className="group text-center p-4 bg-gradient-to-br from-blue-200 to-blue-300 hover:bg-purple-600 rounded-lg border-2 border-blue-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 group-hover:from-blue-600 group-hover:to-blue-800 bg-clip-text text-transparent">
                  {kpiData.formationsTerminees || 0}
                </div>
                <div className="text-sm text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Formations Terminées</div>
                <CheckCircle2 className="h-5 w-5 mx-auto mt-2 text-blue-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-yellow-200 to-yellow-300 hover:bg-purple-600 rounded-lg border-2 border-yellow-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-800 group-hover:from-yellow-600 group-hover:to-yellow-800 bg-clip-text text-transparent">
                  {kpiData.formationsEnCours || 0}
                </div>
                <div className="text-sm text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Formations en Cours</div>
                <GraduationCap className="h-5 w-5 mx-auto mt-2 text-yellow-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-red-200 to-red-300 hover:bg-purple-600 rounded-lg border-2 border-red-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-800 group-hover:from-red-600 group-hover:to-red-800 bg-clip-text text-transparent">
                  {kpiData.videosTerminees || 0}
                </div>
                <div className="text-sm text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Vidéos Terminées</div>
                <PlayCircle className="h-5 w-5 mx-auto mt-2 text-red-700 group-hover:text-white transition-colors" />
              </div>
            </div>
          </CardContent>
        </Card>

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
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Membres de la famille ({filteredMembres.length})
                </CardTitle>
                <CardDescription className="mt-1">
                  Liste complète des disciples de votre famille
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {selectedMembres.length > 0 && (
                  <div className="flex items-center gap-2 mr-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {selectedMembres.length} sélectionné{selectedMembres.length > 1 ? 's' : ''}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedMembres.length === 1) {
                          // Si un seul membre sélectionné, ouvrir sa fiche de détail
                          const selectedId = selectedMembres[0];
                          navigate(`/disciples/${selectedId}`);
                        } else {
                          // Si plusieurs membres sélectionnés, ouvrir le modal
                          setShowSelectedModal(true);
                        }
                      }}
                      className="bg-white border-gray-200 text-gray-900 hover:bg-purple-600 hover:text-white shrink-0"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ouvrir
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSelectedModal(true)}
                      className="bg-white border-gray-200 text-gray-900 hover:bg-blue-600 hover:text-white shrink-0"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Voir sélection
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
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
                        toast({
                          title: 'Export réussi',
                          description: `${selectedMembres.length} membre(s) exporté(s)`,
                        });
                      }}
                      className="bg-white border-gray-200 text-gray-900 hover:bg-green-600 hover:text-white shrink-0"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Exporter sélection
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportFilteredList('excel')}
                    className="bg-white border-gray-200 text-gray-900 hover:bg-green-600 hover:text-white shrink-0"
                    disabled={filteredMembres.length === 0}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportFilteredList('pdf')}
                    className="bg-white border-gray-200 text-gray-900 hover:bg-red-600 hover:text-white shrink-0"
                    disabled={filteredMembres.length === 0}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Barre de recherche et filtres */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-5 w-5 text-purple-600" />
                <h3 className="text-sm font-semibold text-gray-900">Recherche et Filtres</h3>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                    <Input
                      placeholder="Rechercher par prénom, nom, nombre de disciples... (ex: >=5, <=10, >3, <2)"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-10 pr-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setCurrentPage(1);
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors"
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Select value={statusFilter} onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-[180px] bg-white border-gray-300 text-gray-900 [&>svg]:text-purple-600 [&>span]:text-gray-900 hover:border-purple-500">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="tous" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">Tous les statuts</SelectItem>
                      <SelectItem value="actif" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">Actifs</SelectItem>
                      <SelectItem value="inactif" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">Inactifs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-600 mb-1 block">Date d'inscription</Label>
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => {
                        setDateFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                  <div className="w-[200px]">
                    <Label className="text-xs text-gray-600 mb-1 block">Progression</Label>
                    <Select value={progressionFilter} onValueChange={(value) => {
                      setProgressionFilter(value);
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger className="w-full bg-white border-gray-300 text-gray-900 [&>svg]:text-purple-600 [&>span]:text-gray-900 hover:border-purple-500">
                        <SelectValue placeholder="Progression" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="tous" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">Tous</SelectItem>
                        <SelectItem value="avec" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">Avec progression</SelectItem>
                        <SelectItem value="sans" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">Sans progression</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-[150px]">
                    <Label className="text-xs text-gray-600 mb-1 block">Par page</Label>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                      setItemsPerPage(parseInt(value));
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger className="w-full bg-white border-gray-300 text-gray-900 [&>svg]:text-purple-600 [&>span]:text-gray-900 hover:border-purple-500">
                        <SelectValue placeholder="Par page" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="10" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">10 par page</SelectItem>
                        <SelectItem value="25" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">25 par page</SelectItem>
                        <SelectItem value="50" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">50 par page</SelectItem>
                        <SelectItem value="100" className="text-gray-900 hover:bg-purple-50 hover:text-purple-600">100 par page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Table des membres */}
            {paginatedMembres.length > 0 ? (
              <>
                <div className="rounded-md border border-gray-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-purple-200 hover:bg-purple-300 text-gray-900">
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={selectedMembres.length === paginatedMembres.length && paginatedMembres.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="w-[60px]">Photo</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Statut spirituel</TableHead>
                        <TableHead className="text-center">Nombre de Disciples</TableHead>
                        <TableHead>Progression</TableHead>
                        <TableHead>Suivi par</TableHead>
                        <TableHead>Date d'inscription</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMembres.map((membre) => (
                        <TableRow key={membre.id} className={`hover:bg-gray-50 hover:text-black ${selectedMembres.includes(membre.id) ? 'bg-blue-50' : ''}`}>
                          <TableCell className="hover:text-black">
                            <Checkbox
                              checked={selectedMembres.includes(membre.id)}
                              onCheckedChange={() => toggleSelectMembre(membre.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={membre.avatar_url} alt={`${membre.first_name} ${membre.last_name}`} />
                              <AvatarFallback className="bg-purple-100 text-purple-600">
                                {membre.first_name?.charAt(0) || ''}{membre.last_name?.charAt(0) || ''}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium hover:text-black">
                            <div 
                              className="flex items-center gap-2 cursor-pointer hover:text-purple-600 transition-colors"
                              onClick={() => navigate(`/disciples/${membre.id}`)}
                            >
                              <span className="text-gray-900">{membre.first_name} {membre.last_name}</span>
                              <Eye className="h-4 w-4 text-gray-400 hover:text-purple-600" />
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600 hover:text-black">
                            {membre.email || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={membre.statut_spirituel === 'inactif' ? 'destructive' : 'default'}
                              className={
                                membre.statut_spirituel === 'inactif' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
                              }
                            >
                              {membre.statut_spirituel === 'inactif' ? 'Inactif' : 'Actif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center hover:text-black">
                            <button
                              onClick={() => {
                                fetchDisciplesOfMembre(membre.id, `${membre.first_name} ${membre.last_name}`);
                              }}
                              className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 hover:border-blue-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                            >
                              {membre.nombreDisciples || 0}
                            </button>
                          </TableCell>
                          <TableCell className="text-gray-600 hover:text-black">
                            {membresProgression[membre.id] ? (
                              <div className="flex flex-col gap-1">
                                <div className="text-xs">
                                  <span className="font-semibold text-purple-600">{membresProgression[membre.id].formations}</span> formations
                                </div>
                                <div className="text-xs">
                                  <span className="font-semibold text-red-600">{membresProgression[membre.id].videos}</span> vidéos
                                </div>
                                <div className="text-xs font-medium text-gray-900">
                                  Total: {membresProgression[membre.id].total}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-600 hover:text-black">
                            {membresSuiviPar[membre.id] ? (
                              <span className="text-sm font-medium text-gray-900">
                                {membresSuiviPar[membre.id].name}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-600 hover:text-black">
                            {membre.created_at ? format(new Date(membre.created_at), 'dd/MM/yyyy', { locale: fr }) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== 'tous' || dateFilter || progressionFilter !== 'tous'
                    ? 'Aucun membre ne correspond à vos critères de recherche.'
                    : 'Aucun membre dans cette famille pour le moment.'}
                </p>
              </div>
            )}

            {/* Pagination et affichage détaillé - Toujours visible */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t-2 border-purple-200 bg-purple-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-900">
                {filteredMembres.length > 0 ? (
                  <>
                    <span className="text-purple-600 font-bold">Page {currentPage}</span> sur <span className="text-purple-600 font-bold">{totalPages}</span> - 
                    Affichage de <span className="text-blue-600 font-bold">{((currentPage - 1) * itemsPerPage) + 1}</span> à <span className="text-blue-600 font-bold">{Math.min(currentPage * itemsPerPage, filteredMembres.length)}</span> sur <span className="text-purple-600 font-bold text-lg">{filteredMembres.length}</span> membre{filteredMembres.length > 1 ? 's' : ''}
                  </>
                ) : (
                  <span className="text-gray-600">Aucun membre trouvé</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedMembres.length === 0) {
                      toast({
                        title: 'Aucune sélection',
                        description: 'Veuillez sélectionner au moins un membre.',
                        variant: 'destructive'
                      });
                      return;
                    }
                    if (selectedMembres.length === 1) {
                      // Si un seul membre sélectionné, ouvrir sa fiche de détail
                      const selectedId = selectedMembres[0];
                      navigate(`/disciples/${selectedId}`);
                    } else {
                      // Si plusieurs membres sélectionnés, ouvrir le modal
                      setShowSelectedModal(true);
                    }
                  }}
                  className="bg-white border-gray-300 text-gray-900 hover:bg-blue-600 hover:text-white hover:border-blue-600"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ouvrir
                </Button>
                {totalPages > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="bg-white border-gray-300 text-gray-900 hover:bg-purple-100 hover:border-purple-400 hover:text-purple-700"
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="bg-white border-gray-300 text-gray-900 hover:bg-purple-100 hover:border-purple-400 hover:text-purple-700"
                    >
                      Suivant
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tableau détaillé des disciples (10 colonnes) */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Tableau Détaillé des Disciples</CardTitle>
                <CardDescription>
                  Vue détaillée de tous les disciples avec leurs informations de suivi
                </CardDescription>
              </div>
              {loadingDisciplesDetaille && (
                <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingDisciplesDetaille ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-500">Chargement des données détaillées...</p>
              </div>
            ) : disciplesDetaille.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucun disciple trouvé dans votre famille.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-purple-200 hover:bg-purple-300">
                      <TableHead className="font-semibold text-gray-900">Prénom Pilier</TableHead>
                      <TableHead className="font-semibold text-gray-900">Nom Pilier</TableHead>
                      <TableHead className="font-semibold text-gray-900">Prénom Disciple</TableHead>
                      <TableHead className="font-semibold text-gray-900">Nom Disciple</TableHead>
                      <TableHead className="font-semibold text-gray-900">Statut</TableHead>
                      <TableHead className="font-semibold text-gray-900">Date d'ajout</TableHead>
                      <TableHead className="font-semibold text-gray-900">Date Dernière Présence</TableHead>
                      <TableHead className="font-semibold text-gray-900">Niveau d'Engagement</TableHead>
                      <TableHead className="font-semibold text-gray-900">Statut (Actif/Inactif)</TableHead>
                      <TableHead className="font-semibold text-gray-900">Présence Dernier Culte</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disciplesDetaille.map((disciple) => (
                      <TableRow key={disciple.disciple_id} className="hover:bg-gray-50 hover:text-black">
                        <TableCell className="font-semibold text-gray-900">{disciple.mentor_prenom || '-'}</TableCell>
                        <TableCell className="font-semibold text-gray-900">{disciple.mentor_nom || '-'}</TableCell>
                        <TableCell 
                          className="font-semibold text-gray-900 cursor-pointer hover:text-purple-600"
                          onClick={() => navigate(`/disciples/${disciple.disciple_id}`)}
                        >
                          {disciple.disciple_prenom}
                        </TableCell>
                        <TableCell 
                          className="font-semibold text-gray-900 cursor-pointer hover:text-purple-600"
                          onClick={() => navigate(`/disciples/${disciple.disciple_id}`)}
                        >
                          {disciple.disciple_nom}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-purple-200 text-purple-700">
                            {disciple.statut_spirituel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-700">{disciple.date_ajout}</TableCell>
                        <TableCell className="text-gray-700">{disciple.date_derniere_presence}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              disciple.niveau_engagement === 'Élevé' 
                                ? 'border-green-200 text-green-700 bg-green-50'
                                : disciple.niveau_engagement === 'Moyen'
                                ? 'border-amber-200 text-amber-700 bg-amber-50'
                                : 'border-red-200 text-red-700 bg-red-50'
                            }
                          >
                            {disciple.niveau_engagement}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={disciple.statut_actif ? 'default' : 'secondary'}
                            className={disciple.statut_actif ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}
                          >
                            {disciple.statut_actif ? 'Actif' : 'Inactif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {disciple.presence_dernier_culte ? (
                            <Badge className="bg-green-500 text-white">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Oui
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-200 text-red-700">
                              <X className="h-3 w-3 mr-1" />
                              Non
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tableau consolidé des mentors (piliers) */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Tableau Consolidé des Mentors (Piliers)</CardTitle>
                <CardDescription>
                  Vue d'ensemble de tous les mentors (piliers) avec leurs statistiques de progression
                </CardDescription>
              </div>
              {loadingMentorsConsolides && (
                <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingMentorsConsolides ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-500">Chargement des données des mentors...</p>
              </div>
            ) : mentorsConsolides.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucun mentor trouvé dans votre famille.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-purple-200 hover:bg-purple-300">
                      <TableHead className="font-semibold text-gray-900">Nom</TableHead>
                      <TableHead className="font-semibold text-gray-900">Prénom</TableHead>
                      <TableHead className="font-semibold text-gray-900">Église</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900">Nombre de Disciples</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900">Avancement (%)</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900">Disciples Présents</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900">Taux Participation Semaine (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mentorsConsolides.map((mentor) => (
                      <TableRow key={mentor.mentor_id} className="hover:bg-gray-50 hover:text-black">
                        <TableCell className="font-semibold text-gray-900">{mentor.nom}</TableCell>
                        <TableCell className="font-semibold text-gray-900">{mentor.prenom}</TableCell>
                        <TableCell className="text-gray-700">{mentor.eglise}</TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-gray-900">{mentor.nombre_disciples}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  mentor.avancement_pourcentage >= 100
                                    ? 'bg-green-500'
                                    : mentor.avancement_pourcentage >= 50
                                    ? 'bg-purple-600'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(mentor.avancement_pourcentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700 w-12 text-left">
                              {mentor.avancement_pourcentage}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-gray-900">{mentor.disciples_presents}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${
                            mentor.taux_participation_semaine >= 70
                              ? 'text-green-600'
                              : mentor.taux_participation_semaine >= 50
                              ? 'text-amber-600'
                              : 'text-red-600'
                          }`}>
                            {mentor.taux_participation_semaine}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Graphiques supplémentaires : Évolution formations/vidéos */}
        <Card ref={formationVideoRef} className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              Évolution des Formations et Vidéos (12 derniers mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formationVideoChartData.length > 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="h-[400px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={formationVideoChartData} 
                    margin={{ top: 10, right: 30, left: 0, bottom: 80 }}
                  >
                    <XAxis 
                      dataKey="name" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      vertical={false} 
                      stroke="#e5e7eb"
                      opacity={0.5}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '5 5' }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="line"
                    />
                    <Brush 
                      dataKey="name" 
                      height={30}
                      stroke="#8b5cf6"
                      tickFormatter={() => ''}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="formations" 
                      name="Formations Terminées" 
                      stroke="#8b5cf6" 
                      strokeWidth={3} 
                      dot={{ r: 5, fill: '#8b5cf6' }}
                      activeDot={{ r: 8, fill: '#7c3aed' }}
                      animationDuration={1000}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="videos" 
                      name="Vidéos Terminées" 
                      stroke="#ef4444" 
                      strokeWidth={3} 
                      dot={{ r: 5, fill: '#ef4444' }}
                      activeDot={{ r: 8, fill: '#dc2626' }}
                      animationDuration={1000}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            ) : (
              <div className="h-[300px] w-full flex items-center justify-center text-gray-500">
                <p>Aucune donnée disponible pour le moment</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Graphique : Comparaison année en cours vs année précédente */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Comparaison Annuelle : {new Date().getFullYear()} vs {new Date().getFullYear() - 1}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 && chartDataPreviousYear.length > 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="h-[400px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={[
                      { 
                        name: 'Année en cours', 
                        value: chartData.reduce((sum, d) => sum + d.culteDimancheMatin, 0),
                        fill: '#8b5cf6'
                      },
                      { 
                        name: 'Année précédente', 
                        value: chartDataPreviousYear.reduce((sum, d) => sum + d.culteDimancheMatin, 0),
                        fill: '#a78bfa'
                      }
                    ]} 
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <XAxis 
                      dataKey="name" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      vertical={false} 
                      stroke="#e5e7eb"
                      opacity={0.5}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                    />
                    <ReferenceLine y={0} stroke="#888888" />
                    <Bar 
                      dataKey="value" 
                      radius={[8, 8, 0, 0]}
                      animationDuration={1000}
                    >
                      {[
                        { name: 'Année en cours', value: chartData.reduce((sum, d) => sum + d.culteDimancheMatin, 0), fill: '#8b5cf6' },
                        { name: 'Année précédente', value: chartDataPreviousYear.reduce((sum, d) => sum + d.culteDimancheMatin, 0), fill: '#a78bfa' }
                      ].map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.fill} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            ) : (
              <div className="h-[300px] w-full flex items-center justify-center text-gray-500">
                <p>Données insuffisantes pour la comparaison (besoin de données sur 2 années)</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Graphique en camembert : Répartition des statuts spirituels */}
        <Card ref={statutsSpirituelsRef} className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Répartition des Statuts Spirituels
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statutsSpirituelsData.length > 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="h-[400px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statutsSpirituelsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent, value }) => 
                        `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={120}
                      innerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={3}
                      animationDuration={1000}
                    >
                      {statutsSpirituelsData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value, name, props) => [
                        `${value} (${((value / statutsSpirituelsData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)}%)`,
                        props.payload.name
                      ]}
                    />
                    <Legend 
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            ) : (
              <div className="h-[300px] w-full flex items-center justify-center text-gray-500">
                <p>Aucune donnée de statut disponible</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal Liste des Disciples */}
        <Dialog open={selectedMembreForDisciples !== null} onOpenChange={(open) => {
          if (!open) {
            setSelectedMembreForDisciples(null);
            setDisciplesList([]);
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white text-gray-900 border-gray-200">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Disciples de {selectedMembreForDisciples?.name}
                </DialogTitle>
                <DialogDescription>
                  Liste des disciples suivis par ce membre ({disciplesList.length})
                </DialogDescription>
              </div>
              {disciplesList.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportDisciplesList('excel')}
                    className="bg-white border-gray-200 text-gray-900 hover:bg-green-600 hover:text-white"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportDisciplesList('pdf')}
                    className="bg-white border-gray-200 text-gray-900 hover:bg-red-600 hover:text-white"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {loadingDisciplesList ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : disciplesList.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun disciple suivi par ce membre.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {disciplesList.map((disciple) => (
                    <div
                      key={disciple.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => {
                        navigate(`/disciples/${disciple.id}`);
                        setSelectedMembreForDisciples(null);
                      }}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={disciple.avatar_url} />
                        <AvatarFallback className="bg-purple-100 text-purple-600">
                          {disciple.first_name?.charAt(0)}{disciple.last_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {disciple.first_name} {disciple.last_name}
                        </p>
                        {disciple.email && (
                          <p className="text-xs text-gray-600 truncate">{disciple.email}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {disciple.circle_type && (
                            <Badge variant="outline" className="text-xs">
                              {disciple.circle_type}
                            </Badge>
                          )}
                          {disciple.disciplesSuivis !== undefined && (
                            <span className="text-xs text-gray-600 flex items-center gap-1">
                              <Users className="h-3 w-3 text-purple-600" />
                              {disciple.disciplesSuivis > 0 ? (
                                <span>{disciple.disciplesSuivis} Disciple{disciple.disciplesSuivis > 1 ? 's' : ''}</span>
                              ) : (
                                <span>0 Disciple</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <Eye className="h-4 w-4 text-gray-400 hover:text-purple-600" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedMembreForDisciples(null);
                  setDisciplesList([]);
                }}
                className="bg-white border-gray-200 text-gray-900 hover:bg-purple-600 hover:text-white hover:border-purple-600"
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Membres Sélectionnés */}
        <Dialog open={showSelectedModal} onOpenChange={setShowSelectedModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white text-gray-900 border-gray-200">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Membres Sélectionnés ({selectedMembres.length})
                  </DialogTitle>
                  <DialogDescription>
                    Liste des membres sélectionnés avec leurs détails
                  </DialogDescription>
                </div>
                {selectedMembres.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
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
                        toast({
                          title: 'Export réussi',
                          description: `${selectedMembres.length} membre(s) exporté(s) en Excel`,
                        });
                      }}
                      className="bg-white border-gray-200 text-gray-900 hover:bg-green-600 hover:text-white"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
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
                          toast({
                            title: 'Export réussi',
                            description: `${selectedMembres.length} membre(s) exporté(s) en PDF`,
                          });
                        } catch (error) {
                          console.error('Erreur export PDF:', error);
                          toast({
                            variant: 'destructive',
                            title: 'Erreur',
                            description: 'Impossible d\'exporter en PDF. Veuillez réessayer.',
                          });
                        }
                      }}
                      className="bg-white border-gray-200 text-gray-900 hover:bg-red-600 hover:text-white"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                )}
              </div>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {selectedMembres.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun membre sélectionné.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {filteredMembres
                    .filter(m => selectedMembres.includes(m.id))
                    .map((membre) => (
                      <div
                        key={membre.id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar className="w-14 h-14">
                            <AvatarImage src={membre.avatar_url} />
                            <AvatarFallback className="bg-purple-100 text-purple-600 text-lg">
                              {membre.first_name?.charAt(0)}{membre.last_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-base font-bold text-gray-900">
                                {membre.first_name} {membre.last_name}
                              </h3>
                              <Badge 
                                variant={membre.statut_spirituel === 'inactif' ? 'destructive' : 'default'}
                                className={
                                  membre.statut_spirituel === 'inactif' 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }
                              >
                                {membre.statut_spirituel === 'inactif' ? 'Inactif' : 'Actif'}
                              </Badge>
                            </div>
                            {membre.email && (
                              <p className="text-sm text-gray-600 mb-2">{membre.email}</p>
                            )}
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3 text-blue-600" />
                                <span className="font-semibold text-blue-700">{membre.nombreDisciples || 0}</span> Disciple{membre.nombreDisciples !== 1 ? 's' : ''}
                              </div>
                              {membre.created_at && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-gray-500" />
                                  <span>Inscrit le {format(new Date(membre.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                                </div>
                              )}
                            </div>
                            {membresProgression[membre.id] && (
                              <div className="flex items-center gap-3 text-xs mb-2">
                                <span className="flex items-center gap-1">
                                  <span className="font-semibold text-purple-600">{membresProgression[membre.id].formations}</span> formations
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="font-semibold text-red-600">{membresProgression[membre.id].videos}</span> vidéos
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="font-semibold text-gray-900">Total: {membresProgression[membre.id].total}</span>
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {membre.nombreDisciples > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  // Fermer le modal des membres sélectionnés d'abord
                                  setShowSelectedModal(false);
                                  // Attendre un peu pour que le modal se ferme
                                  await new Promise(resolve => setTimeout(resolve, 100));
                                  // Puis récupérer et afficher les disciples
                                  await fetchDisciplesOfMembre(membre.id, `${membre.first_name} ${membre.last_name}`);
                                }}
                                className="bg-blue-600 text-white border-blue-600 hover:bg-purple-600 hover:border-purple-600 hover:text-white"
                              >
                                <Users className="h-4 w-4 mr-1" />
                                Voir disciples
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigate(`/disciples/${membre.id}`);
                                setShowSelectedModal(false);
                              }}
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Détails
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowSelectedModal(false)}
                className="bg-white border-gray-200 text-gray-900 hover:bg-purple-600 hover:text-white hover:border-purple-600"
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Historique des rapports */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white text-gray-900 border-gray-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-purple-600" />
                Historique des rapports
              </DialogTitle>
              <DialogDescription>
                Consultez vos rapports précédents
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {rapports.length === 0 ? (
                <p className="text-center text-gray-600 py-8">Aucun rapport envoyé pour le moment.</p>
              ) : (
                <div className="space-y-3">
                  {rapports.slice(0, 10).map((report) => {
                    const stats = report.statistics_snapshot || {};
                    const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
                    const reportPeriod = report.report_type === 'hebdomadaire' 
                      ? `Semaine ${report.week_number} ${report.year}`
                      : report.report_type === 'trimestriel'
                      ? `Trimestre ${report.quarter} ${report.year}`
                      : report.report_type === 'annuel'
                      ? `Année ${report.year}`
                      : `${months[report.month]} ${report.year}`;
                    
                    return (
                      <Card key={report.id} className="bg-white border-gray-200 shadow-sm">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={report.status === 'submitted' ? 'default' : 'secondary'} className="bg-purple-100 text-purple-800">
                                  {report.report_type}
                                </Badge>
                                <span className="text-sm text-gray-600">{reportPeriod}</span>
                                <span className="text-xs text-gray-500">
                                  {format(new Date(report.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-sm mt-2">
                                <p><span className="text-gray-600">Disciples:</span> <span className="font-bold text-purple-600">{stats.disciples || 0}</span></p>
                                <p><span className="text-gray-600">Présences:</span> <span className="font-bold text-blue-600">{stats.sunday_attendance_count || 0}</span></p>
                                <p><span className="text-gray-600">Évangélisations:</span> <span className="font-bold text-orange-600">{stats.evangelization || 0}</span></p>
                              </div>
                              {report.content && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{report.content}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowHistory(false)}
                className="bg-white border-gray-200 text-gray-900 hover:bg-purple-600 hover:text-white hover:border-purple-600"
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Fiche Superviseur */}
        <Dialog open={selectedSuperviseur !== null} onOpenChange={(open) => {
          if (!open) setSelectedSuperviseur(null);
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-gray-900 border-gray-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-purple-600" />
                Fiche Superviseur
              </DialogTitle>
              <DialogDescription>
                Informations détaillées du superviseur
              </DialogDescription>
            </DialogHeader>
            
            {selectedSuperviseur && (
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <Avatar className="h-20 w-20 border-2 border-purple-200">
                    <AvatarImage src={selectedSuperviseur.avatar_url} alt={`${selectedSuperviseur.first_name} ${selectedSuperviseur.last_name}`} />
                    <AvatarFallback className="bg-purple-100 text-purple-600 text-lg">
                      {selectedSuperviseur.first_name?.charAt(0) || ''}{selectedSuperviseur.last_name?.charAt(0) || ''}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedSuperviseur.first_name} {selectedSuperviseur.last_name}
                    </h3>
                    {selectedSuperviseur.titre && (
                      <p className="text-sm text-gray-600 mt-1">{selectedSuperviseur.titre}</p>
                    )}
                    {selectedSuperviseur.email && (
                      <p className="text-sm text-gray-600 mt-1">{selectedSuperviseur.email}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-600" />
                        Membres de la famille
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {nombreMembresParSuperviseur[selectedSuperviseur.id] || 0}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        membre{nombreMembresParSuperviseur[selectedSuperviseur.id] !== 1 ? 's' : ''} au total
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedSuperviseur(null)}
                className="bg-white border-gray-200 text-gray-900 hover:bg-purple-600 hover:text-white hover:border-purple-600"
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default SuperviseurDashboard;
