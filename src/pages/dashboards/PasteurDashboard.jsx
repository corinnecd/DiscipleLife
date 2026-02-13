import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, Target, TrendingUp, UserCheck, Activity, 
  Church, ChevronRight, ChevronDown, ChevronUp, Loader2, Search, Filter, Eye, BarChart3,
  Mail, Phone, ArrowLeft, Building2, CheckCircle2, AlertCircle, Calendar as CalendarIcon, GitBranch,
  Moon, Heart, HeartHandshake, UserPlus, Megaphone, Book, Plus, X, Download, FileText, RefreshCw,
  LayoutDashboard
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { getWeek, getQuarter, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { exportElementToPDF, exportToExcel } from '@/lib/ExportUtils';
import { getOrSetCache, clearCache } from '@/lib/CacheUtils';
import { Helmet } from 'react-helmet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMembersTable } from '@/hooks/useMembersTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PasteurOverview from '@/pages/dashboards/pasteur/PasteurOverview';
import PasteurFamilies from '@/pages/dashboards/pasteur/PasteurFamilies';
import PasteurKpiPeriod from '@/pages/dashboards/pasteur/PasteurKpiPeriod';
import PasteurMembers from '@/pages/dashboards/pasteur/PasteurMembers';
import PasteurReports from '@/pages/dashboards/pasteur/PasteurReports';

const devLog = (...args) => { if (import.meta.env.DEV) console.log(...args); };
const devWarn = (...args) => { if (import.meta.env.DEV) console.warn(...args); };
const devError = (...args) => { if (import.meta.env.DEV) console.error(...args); };

/** Afficher le nombre réel de membres (plus de correction artificielle). */
function nombreMembresPourStats(nb) {
  return Number(nb) || 0;
}

const TAB_KEYS = { OVERVIEW: 'overview', KPI: 'kpi', FAMILIES: 'families', MEMBERS: 'members', REPORTS: 'reports' };

const PasteurDashboard = () => {
  const { user } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const activeTab = searchParams.get('tab') || TAB_KEYS.OVERVIEW;
  const setActiveTab = (tab) => setSearchParams({ tab });
  const [loading, setLoading] = useState(true);
  const [pasteurNom, setPasteurNom] = useState({ first_name: '', last_name: '', identifiant_unique: '' });
  const [superviseurs, setSuperviseurs] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [mentorsConsolides, setMentorsConsolides] = useState([]); // Tableau consolidé des mentors
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermMentors, setSearchTermMentors] = useState('');
  const [filterEgliseMentors, setFilterEgliseMentors] = useState('__toutes__'); // Filtre par église (__toutes__ = toutes)
  const [selectedPasteurIdForFamilies, setSelectedPasteurIdForFamilies] = useState(null); // Clic carte KPI → afficher les familles de ce pasteur
  const [famillesForSelectedPasteur, setFamillesForSelectedPasteur] = useState([]);
  const [loadingFamillesForPasteur, setLoadingFamillesForPasteur] = useState(false);
  const [selectedFamille, setSelectedFamille] = useState(null);
  const [familleModalDetails, setFamilleModalDetails] = useState({ members: [], reports: [], loading: false });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [superviseursOptions, setSuperviseursOptions] = useState([]);
  const [createForm, setCreateForm] = useState({
    nom: '',
    identifiant_famille: '',
    statut: 'actif',
    objectif_disciples: 70,
    superviseur_id: '',
  });

  // Tableau « Membres des familles » (même structure que superviseur)
  const [pasteurMembers, setPasteurMembers] = useState([]);
  const [pasteurMembersProgression, setPasteurMembersProgression] = useState({});
  const [pasteurMembersDisciplesCount, setPasteurMembersDisciplesCount] = useState({});
  const [pasteurMembersSuiviPar, setPasteurMembersSuiviPar] = useState({});
  const [loadingPasteurMembers, setLoadingPasteurMembers] = useState(false);
  const pasteurMembersTable = useMembersTable(pasteurMembers, {
    membresProgression: pasteurMembersProgression,
    membresDisciplesCount: pasteurMembersDisciplesCount,
    membresSuiviPar: pasteurMembersSuiviPar,
  });
  
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
  
  // Statistiques globales
  const [globalStats, setGlobalStats] = useState({
    totalSuperviseurs: 0,
    totalFamilles: 0,
    totalDisciples: 0,
    objectifTotal: 0,
    progressionGlobale: 0,
    famillesObjectifAtteint: 0,
    totalRapports: 0,
    rapportsHebdo: 0,
    rapportsMensuels: 0,
    rapportsTrimestriels: 0,
    rapportsAnnuels: 0,
    kpiAnnuels: {
      culteSamediSoir: 0,
      culteDimancheMatin: 0,
      afterCulteDimanche: 0,
      tempsPriere: 0,
      tempsPartage: 0,
      nouveauxConvertis: 0,
      nouveauxArrivants: 0,
      amesRevenues: 0,
      neRepondPlus: 0,
      sortiesEvangelisation: 0,
      personnesEvangelisees: 0,
      comFratDisciples: 0,
      veillee: 0,
      meditationBible: 0
    }
  });

  // Garde anti double-fetch (évite boucle / chargement infini si user ou filtres changent pendant le fetch)
  const fetchPasteurInProgressRef = useRef(false);
  // Spinner pleine page uniquement au premier chargement (pas à chaque refetch KPI)
  const hasInitiallyLoadedRef = useRef(false);

  // Chargement initial : core uniquement (pasteur, superviseurs, familles, 4 KPI). Données KPI période chargées par onglet.
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    if (fetchPasteurInProgressRef.current) return;
    fetchPasteurInProgressRef.current = true;
    fetchPasteurData()
      .then(() => { checkMissingReports(); })
      .catch(() => {})
      .finally(() => {
        fetchPasteurInProgressRef.current = false;
        hasInitiallyLoadedRef.current = true;
      });
  }, [user?.id]);

  // Charger les mentors consolidés uniquement quand l'onglet Vue d'ensemble est actif
  useEffect(() => {
    if (!user?.id || activeTab !== TAB_KEYS.OVERVIEW || (role !== 'pasteur' && role !== 'admin' && role !== 'super_admin')) return;
    fetchMentorsConsolides();
  }, [user?.id, role, activeTab, familles.length]);

  // Charger KPI Total Disciples par Pasteur uniquement quand l'onglet Vue d'ensemble est actif
  useEffect(() => {
    if (activeTab !== TAB_KEYS.OVERVIEW) return;
    if (role === 'pasteur' || role === 'admin' || role === 'super_admin') {
      fetchKpiParPasteur();
    }
  }, [activeTab, role]);

  // Charger les données KPI / rapports uniquement quand l'onglet KPI & Période est actif (cache TTL 2 min)
  useEffect(() => {
    if (activeTab !== TAB_KEYS.KPI || !user?.id) return;
    fetchKpiTabData();
  }, [activeTab, user?.id, superviseurs.length, kpiPeriodType, kpiSelectedYearForPeriod, kpiSelectedQuarter, kpiSelectedMonth, kpiSelectedWeek]);

  // Quand on ouvre l'onglet Familles avec un pasteur sélectionné (clic sur une carte KPI), charger ses familles si ce n'est pas le pasteur connecté
  useEffect(() => {
    if (activeTab !== TAB_KEYS.FAMILIES || !selectedPasteurIdForFamilies) return;
    if (selectedPasteurIdForFamilies === user?.id) {
      setFamillesForSelectedPasteur([]);
      return;
    }
    fetchFamillesForPasteur(selectedPasteurIdForFamilies);
  }, [activeTab, selectedPasteurIdForFamilies, user?.id]);

  // Rafraîchir toutes les rubriques (KPI, Progression, Liste des Familles) après modification des effectifs
  const [refreshing, setRefreshing] = useState(false);
  const handleRefreshDonnees = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      const cacheKeyBase = `pasteur_${user.id}`;
      clearCache(`${cacheKeyBase}_info`);
      clearCache(`${cacheKeyBase}_superviseurs`);
      clearCache(`pasteur_${user.id}_rapports_${kpiPeriodType}_${kpiSelectedYearForPeriod}_${kpiSelectedQuarter}_${kpiSelectedMonth}_${kpiSelectedWeek}`);
      clearCache(`familles_${role}_${role === 'superviseur' ? user.id : 'all'}`);
      for (let i = 0; i <= 50; i++) clearCache(`pasteur_${user.id}_mentors_consolides_f${i}`);
      await fetchPasteurData();
      if (activeTab === TAB_KEYS.OVERVIEW) {
        if (role === 'pasteur' || role === 'admin' || role === 'super_admin') await fetchKpiParPasteur();
        await fetchMentorsConsolides();
      } else if (activeTab === TAB_KEYS.KPI) {
        await fetchKpiTabData();
      } else if (activeTab === TAB_KEYS.REPORTS) {
        await fetchRapportsRecus();
      }
    } catch (e) {
      handleError(e, { context: 'refreshPasteurData' }, "Impossible de rafraîchir les données.");
    } finally {
      setRefreshing(false);
    }
  };

  // Charger les détails (membres, rapports) lorsque le modal famille s'ouvre
  useEffect(() => {
    const famId = selectedFamille?.famille?.id;
    const supId = selectedFamille?.superviseur?.id;
    if (!famId || !supId) {
      setFamilleModalDetails({ members: [], reports: [], loading: false });
      return;
    }
    let cancelled = false;
    setFamilleModalDetails((prev) => ({ ...prev, loading: true }));
    const fetchDetails = async () => {
      const [membersRes, reportsRes] = await Promise.all([
        supabase
          .from('profils')
          .select('id, first_name, last_name, email, avatar_url, created_at')
          .eq('famille_id', famId)
          .eq('role', 'disciple')
          .order('first_name'),
        supabase
          .from('reports')
          .select('id, report_type, created_at, month, year, quarter, week_number, content, statistics_snapshot')
          .eq('user_id', supId)
          .eq('status', 'submitted')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      if (cancelled) return;
      setFamilleModalDetails({
        members: membersRes.data || [],
        reports: reportsRes.data || [],
        loading: false,
      });
    };
    fetchDetails();
    return () => { cancelled = true; };
  }, [selectedFamille?.famille?.id, selectedFamille?.superviseur?.id]);

  const safeFormatDate = (dateVal, fmt, opts) => {
    if (dateVal == null || dateVal === '') return '—';
    const d = new Date(dateVal);
    if (Number.isNaN(d.getTime())) return '—';
    return format(d, fmt, opts);
  };

  // Clé stable des familles pour éviter de recharger les membres quand seul le tableau familles change de référence (même ids)
  const familleIdsKey = (familles || []).map((f) => f.famille?.id).filter(Boolean).slice().sort().join(',');

  // Charger tous les membres des familles du pasteur uniquement quand l'onglet Membres est actif
  useEffect(() => {
    const familleIds = (familles || []).map((f) => f.famille?.id).filter(Boolean);
    if (!user?.id || activeTab !== TAB_KEYS.MEMBERS) return;
    if (familleIds.length === 0) {
      setPasteurMembers([]);
      setPasteurMembersProgression({});
      setPasteurMembersDisciplesCount({});
      setPasteurMembersSuiviPar({});
      return;
    }
    let cancelled = false;
    setLoadingPasteurMembers(true);
    (async () => {
      try {
        const { data: profilsData, error } = await supabase
          .from('profils')
          .select('id, first_name, last_name, email, avatar_url, created_at, role, mentor_id, spiritual_stage')
          .in('famille_id', familleIds)
          .neq('id', user.id)
          .in('role', ['disciple', 'mentor'])
          .order('created_at', { ascending: false });
        if (error) throw error;
        const members = (profilsData || []).map((p) => ({
          ...p,
          statut_spirituel: (p.spiritual_stage === 'inactif' || p.spiritual_stage === 'inactive') ? 'inactif' : 'actif',
        }));
        if (cancelled) return;
        setPasteurMembers(members);
        const mentorIds = [...new Set((members || []).map((m) => m.mentor_id).filter(Boolean))];
        if (mentorIds.length === 0) {
          setPasteurMembersDisciplesCount({});
          setPasteurMembersSuiviPar({});
          setPasteurMembersProgression({});
          return;
        }
        const [countRes, mentorsRes] = await Promise.all([
          supabase.from('profils').select('mentor_id').in('mentor_id', mentorIds),
          supabase.from('profils').select('id, first_name, last_name').in('id', mentorIds),
        ]);
        if (cancelled) return;
        const countByMentor = {};
        (countRes.data || []).forEach((r) => {
          if (r.mentor_id) countByMentor[r.mentor_id] = (countByMentor[r.mentor_id] || 0) + 1;
        });
        const suiviByMentor = {};
        (mentorsRes.data || []).forEach((m) => {
          suiviByMentor[m.id] = { name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || '—' };
        });
        setPasteurMembersDisciplesCount(countByMentor);
        setPasteurMembersSuiviPar(suiviByMentor);
        setPasteurMembersProgression({});
      } catch (e) {
        if (!cancelled) handleError(e, { context: 'fetchPasteurMembers' }, 'Impossible de charger les membres des familles.');
      } finally {
        if (!cancelled) setLoadingPasteurMembers(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, activeTab, familleIdsKey]);

  const fetchPasteurData = async () => {
    try {
      setLoading(true);

      // OPTIMISATION: Utiliser le cache pour les données du pasteur (TTL: 2 minutes)
      const cacheKeyBase = `pasteur_${user.id}`;

      // 1. Récupérer les informations du pasteur avec cache
      const pasteurData = await getOrSetCache(
        `${cacheKeyBase}_info`,
        async () => {
          const { data, error } = await supabase
            .from('profils')
            .select('first_name, last_name, identifiant_unique, email')
            .eq('id', user.id)
            .single();
          if (error) throw error;
          return data;
        },
        2 * 60 * 1000 // 2 minutes
      );

      if (pasteurData) {
        setPasteurNom({
          first_name: pasteurData.first_name || '',
          last_name: pasteurData.last_name || '',
          identifiant_unique: pasteurData.identifiant_unique || ''
        });
      }

      // 2. Récupérer tous les superviseurs sous sa responsabilité (sans limite artificielle pour afficher toutes les familles)
      // Méthode principale : Directement via pasteur_id (comme dans la migration SQL)
      // Note: .limit(1000) explicite pour éviter qu'un paramètre API projet (ex. 10) ne tronque la liste
      const superviseursData = await getOrSetCache(
        `${cacheKeyBase}_superviseurs`,
        async () => {
          const { data, error } = await supabase
            .from('profils')
            .select('id, first_name, last_name, email, identifiant_unique, avatar_url, pasteur_id')
            .eq('pasteur_id', user.id)
            .eq('role', 'superviseur')
            .order('first_name', { ascending: true })
            .limit(1000);
          if (error) {
            devError('Erreur lors de la récupération des superviseurs:', error);
            throw error;
          }
          return data || [];
        },
        2 * 60 * 1000 // 2 minutes
      );

      const superviseursError = null; // Pas d'erreur si le cache fonctionne

      // Récupérer les titres séparément si la colonne existe
      let superviseursAvecTitres = superviseursData || [];
      if (superviseursAvecTitres.length > 0) {
        superviseursAvecTitres = await Promise.all(
          superviseursAvecTitres.map(async (superviseur) => {
            let titre = '';
            try {
              const { data: titreData } = await supabase
                .from('profils')
                .select('titre')
                .eq('id', superviseur.id)
                .maybeSingle();
              titre = titreData?.titre || '';
            } catch (e) {
              // Colonne titre n'existe pas, on continue sans
            }
            return { ...superviseur, titre };
          })
        );
      }

      // Si aucun superviseur trouvé via pasteur_id, essayer via les familles (comme FamillesDisciples.jsx)
      let superviseursFinal = superviseursAvecTitres || [];
      
      if (!superviseursAvecTitres || superviseursAvecTitres.length === 0) {
        devLog('Aucun superviseur trouvé via pasteur_id, tentative via familles...');
        
        // Récupérer toutes les familles avec leurs superviseurs (limite haute pour ne pas en oublier)
        const { data: famillesData, error: famillesError } = await supabase
          .from('familles_disciples')
          .select('superviseur_id')
          .not('superviseur_id', 'is', null)
          .limit(1000);
        
        if (!famillesError && famillesData && famillesData.length > 0) {
          const superviseurIds = [...new Set(famillesData.map(f => f.superviseur_id).filter(id => id))];
          
          if (superviseurIds.length > 0) {
            // Récupérer les superviseurs (sans titre) et filtrer ceux qui ont le pasteur_id correspondant
            const { data: superviseursViaFamilles, error: superviseursViaFamillesError } = await supabase
              .from('profils')
              .select('id, first_name, last_name, email, identifiant_unique, avatar_url, pasteur_id')
              .in('id', superviseurIds)
              .eq('role', 'superviseur')
              .order('first_name', { ascending: true })
              .limit(1000);
            
            if (!superviseursViaFamillesError && superviseursViaFamilles) {
              // Filtrer uniquement ceux qui ont le pasteur_id correspondant
              const superviseursFiltres = superviseursViaFamilles.filter(s => s.pasteur_id === user.id);
              
              // Ajouter les titres séparément
              superviseursFinal = await Promise.all(
                superviseursFiltres.map(async (superviseur) => {
                  let titre = '';
                  try {
                    const { data: titreData } = await supabase
                      .from('profils')
                      .select('titre')
                      .eq('id', superviseur.id)
                      .maybeSingle();
                    titre = titreData?.titre || '';
                  } catch (e) {
                    // Colonne titre n'existe pas, on continue sans
                  }
                  return { ...superviseur, titre };
                })
              );
              
              devLog('Superviseurs trouvés via familles et filtrés par pasteur_id:', superviseursFinal.length);
            }
          }
        }
      }

      devLog('Total superviseurs récupérés pour pasteur', user.id, ':', superviseursFinal?.length || 0);
      setSuperviseurs(superviseursFinal || []);

      // 3. Pour chaque superviseur, récupérer sa famille et calculer les stats
      const famillesAvecStats = await Promise.all(
        (superviseursFinal || []).map(async (superviseur) => {
          // Récupérer la famille du superviseur (prendre la première si plusieurs existent)
          const { data: famillesData, error: familleError } = await supabase
            .from('familles_disciples')
            .select('id, superviseur_id, nom, identifiant_famille, statut, objectif_disciples, nombre_disciples_actuels, created_at')
            .eq('superviseur_id', superviseur.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (familleError) {
            devError(`Erreur famille pour superviseur ${superviseur.id}:`, familleError);
            // Ne pas retourner null, continuer avec famille: null
          }

          // Prendre la première famille si plusieurs existent
          const familleData = famillesData && famillesData.length > 0 ? famillesData[0] : null;

          if (!familleData) {
            devWarn(`⚠️ Superviseur ${superviseur.first_name} ${superviseur.last_name} (${superviseur.id}) n'a pas de famille assignée`);
            return {
              superviseur,
              famille: null,
              stats: {
                nombreMembres: 0,
                objectif: 70,
                progression: 0,
                reste: 70
              }
            };
          }

          // Effectifs par famille (repli) : source unique = profils (plus de cercle_personnes)
          const { count: nombreDisciples, error: countError } = await supabase
            .from('profils')
            .select('id', { count: 'exact', head: true })
            .eq('famille_id', familleData.id);

          if (countError) {
            devError(`Erreur comptage disciples pour famille ${familleData.id}:`, countError);
          }

          const nombreMembres = nombreMembresPourStats(
            nombreDisciples ?? familleData.nombre_disciples_actuels ?? 0
          );
          const objectif = familleData.objectif_disciples || 70;
          const progression = Math.min((nombreMembres / objectif) * 100, 100);
          const reste = Math.max(objectif - nombreMembres, 0);

          return {
            superviseur,
            famille: familleData,
            stats: {
              nombreMembres,
              objectif,
              progression,
              reste
            }
          };
        })
      );

      // Filtrer les nulls (ne devrait pas y en avoir maintenant)
      let famillesValides = famillesAvecStats.filter(f => f !== null);

      // RPC progression par famille (contourne RLS) pour remplir les barres de progression
      const { data: progressionParFamille, error: progressionErr } = await supabase.rpc('get_progression_par_famille_pasteur', { p_pasteur_id: user.id });
      if (!progressionErr && Array.isArray(progressionParFamille) && progressionParFamille.length > 0) {
        const bySuperviseur = progressionParFamille.reduce((acc, row) => {
          acc[row.superviseur_id] = row;
          return acc;
        }, {});
        famillesValides = famillesValides.map((f) => {
          const row = bySuperviseur[f.superviseur?.id];
          if (!row) return f;
          const nb = nombreMembresPourStats(Number(row.nb_disciples) ?? 0);
          const obj = Number(row.objectif) ?? 70;
          // Toujours dériver la progression % des effectifs et de l'objectif (sync avec KPI / Liste des Familles)
          const pct = obj > 0 ? Math.min(100, (nb / obj) * 100) : 0;
          return {
            ...f,
            stats: {
              ...f.stats,
              nombreMembres: nb,
              objectif: obj,
              progression: pct,
              reste: Math.max(0, obj - nb),
            },
          };
        });
      }

      // Enrichir avec dernier rapport par superviseur (disciples présents, taux participation) pour tableau consolidé 7 colonnes
      const superviseurIds = famillesValides.map((f) => f.superviseur?.id).filter(Boolean);
      if (superviseurIds.length > 0) {
        const { data: lastReports } = await supabase
          .from('reports')
          .select('user_id, statistics_snapshot')
          .in('user_id', superviseurIds)
          .eq('status', 'submitted')
          .order('created_at', { ascending: false });
        const lastBySuperviseur = {};
        (lastReports || []).forEach((r) => {
          if (r.user_id && lastBySuperviseur[r.user_id] == null) lastBySuperviseur[r.user_id] = r.statistics_snapshot || {};
        });
        famillesValides = famillesValides.map((f) => {
          const snap = lastBySuperviseur[f.superviseur?.id];
          if (!snap) return f;
          const disciples_presents = snap.sunday_attendance_count != null ? snap.sunday_attendance_count : undefined;
          const taux_participation_semaine = snap.taux_participation_semaine != null ? snap.taux_participation_semaine : undefined;
          return {
            ...f,
            stats: {
              ...f.stats,
              ...(disciples_presents != null && { disciples_presents }),
              ...(taux_participation_semaine != null && { taux_participation_semaine }),
            },
          };
        });
      }

      setFamilles(famillesValides);

      // Identifier les superviseurs sans famille
      const superviseursSansFamille = famillesValides.filter(f => f.famille === null);
      if (superviseursSansFamille.length > 0) {
        devWarn('⚠️ Superviseurs sans famille:', superviseursSansFamille.map(s => `${s.superviseur.first_name} ${s.superviseur.last_name} (${s.superviseur.id})`));
      }

      // 4. Calculer les statistiques globales
      // Utiliser directement la longueur de superviseursFinal pour le nombre de superviseurs
      const totalSuperviseurs = superviseursFinal?.length || 0;
      devLog('Total superviseurs calculé:', totalSuperviseurs, 'sur', superviseursFinal?.length || 0);
      // Le nombre de familles devrait correspondre au nombre de superviseurs (chaque superviseur a une famille)
      let totalFamilles = famillesValides.filter(f => f.famille !== null).length;
      devLog('Total familles trouvées:', totalFamilles, 'sur', totalSuperviseurs, 'superviseurs');
      
      // Si le nombre de familles ne correspond pas, afficher un avertissement
      if (totalFamilles < totalSuperviseurs) {
        devWarn(`⚠️ ATTENTION: ${totalSuperviseurs - totalFamilles} superviseur(s) n'ont pas de famille assignée`);
      }
      let totalDisciples = famillesValides.reduce((sum, f) => sum + f.stats.nombreMembres, 0);
      let objectifTotal = famillesValides.reduce((sum, f) => sum + f.stats.objectif, 0);
      let progressionGlobale = objectifTotal > 0 ? (totalDisciples / objectifTotal) * 100 : 0;
      let famillesObjectifAtteint = famillesValides.filter(f => f.stats.nombreMembres >= f.stats.objectif).length;

      // RPC KPI familles (source = profils, contourne RLS) pour disciples et progression corrects
      const { data: kpiFamillesRows, error: kpiFamillesErr } = await supabase.rpc('get_kpi_familles_pour_pasteur', { p_pasteur_id: user.id });
      if (!kpiFamillesErr && kpiFamillesRows && kpiFamillesRows.length > 0) {
        const k = kpiFamillesRows[0];
        const _td = Number(k.total_disciples);
        const _tf = Number(k.total_familles);
        const _ot = Number(k.objectif_total);
        const _fo = Number(k.familles_objectif_atteint);
        if (Number.isFinite(_td)) totalDisciples = _td;
        if (Number.isFinite(_tf)) totalFamilles = _tf;
        if (Number.isFinite(_ot)) objectifTotal = _ot;
        if (Number.isFinite(_fo)) famillesObjectifAtteint = _fo;
        progressionGlobale = objectifTotal > 0 ? Math.min(100, (totalDisciples / objectifTotal) * 100) : 0;
      }

      // Core uniquement : rapports/KPI chargés par onglet (fetchKpiTabData quand onglet KPI actif)
      const defaultKpiAnnuels = {
        culteSamediSoir: 0,
        culteDimancheMatin: 0,
        afterCulteDimanche: 0,
        tempsPriere: 0,
        tempsPartage: 0,
        nouveauxConvertis: 0,
        nouveauxArrivants: 0,
        amesRevenues: 0,
        neRepondPlus: 0,
        sortiesEvangelisation: 0,
        personnesEvangelisees: 0,
        comFratDisciples: 0,
        veillee: 0,
        meditationBible: 0
      };
      setGlobalStats({
        totalSuperviseurs,
        totalFamilles,
        totalDisciples,
        objectifTotal,
        progressionGlobale: Math.min(progressionGlobale, 100),
        famillesObjectifAtteint,
        totalRapports: 0,
        rapportsHebdo: 0,
        rapportsMensuels: 0,
        rapportsTrimestriels: 0,
        rapportsAnnuels: 0,
        kpiAnnuels: defaultKpiAnnuels
      });

    } catch (error) {
      handleError(error, { context: 'fetchPasteurData' }, "Impossible de charger les données du tableau de bord.");
    } finally {
      setLoading(false);
    }
  };

  // Clé de cache pour les rapports KPI (par période)
  const getKpiRapportsCacheKey = () =>
    `pasteur_${user?.id}_rapports_${kpiPeriodType}_${kpiSelectedYearForPeriod}_${kpiSelectedQuarter}_${kpiSelectedMonth}_${kpiSelectedWeek}`;

  // Charger les données KPI / rapports uniquement quand l'onglet KPI est actif (avec cache TTL 2 min)
  const fetchKpiTabData = async () => {
    const superviseurIds = (superviseurs || []).map((s) => s.id);
    if (!user?.id || superviseurIds.length === 0) {
      setLoadingKpiTab(false);
      setKpiAnnuelsBreakdown({
        personnesEvangelisees: [],
        nouveauxConvertis: [],
        nouveauxArrivants: [],
        amesRevenues: [],
        neRepondPlus: []
      });
      return;
    }
    setLoadingKpiTab(true);
    try {
      const objectifTotal = globalStats.objectifTotal || 1;
      const cacheKey = getKpiRapportsCacheKey();
      const rapportsData = await getOrSetCache(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('reports')
            .select('user_id, report_type, statistics_snapshot, year, quarter, month, week_number, created_at')
            .in('user_id', superviseurIds)
            .eq('status', 'submitted');
          if (error) throw error;
          return data || [];
        },
        2 * 60 * 1000
      );

      let totalRapports = 0;
      let rapportsHebdo = 0;
      let rapportsMensuels = 0;
      let rapportsTrimestriels = 0;
      let rapportsAnnuels = 0;
      let kpiAnnuels = {
        culteSamediSoir: 0,
        culteDimancheMatin: 0,
        afterCulteDimanche: 0,
        tempsPriere: 0,
        tempsPartage: 0,
        nouveauxConvertis: 0,
        nouveauxArrivants: 0,
        amesRevenues: 0,
        neRepondPlus: 0,
        sortiesEvangelisation: 0,
        personnesEvangelisees: 0,
        comFratDisciples: 0,
        veillee: 0,
        meditationBible: 0
      };

      if (rapportsData && rapportsData.length > 0) {
        totalRapports = rapportsData.length;
        rapportsHebdo = rapportsData.filter((r) => r.report_type === 'hebdomadaire').length;
        rapportsMensuels = rapportsData.filter((r) => r.report_type === 'mensuel').length;
        rapportsTrimestriels = rapportsData.filter((r) => r.report_type === 'trimestriel').length;
        rapportsAnnuels = rapportsData.filter((r) => r.report_type === 'annuel').length;

        const rapportsFiltres = rapportsData.filter((r) => {
          const selectedYear = parseInt(kpiSelectedYearForPeriod, 10);
          const reportDate = new Date(r.created_at);
          const reportYear = r.year || reportDate.getFullYear();
          if (kpiPeriodType === 'annuel') {
            return reportYear === selectedYear;
          }
          if (kpiPeriodType === 'trimestriel') {
            const selectedQuarter = parseInt(kpiSelectedQuarter, 10);
            if (r.report_type === 'trimestriel') {
              return r.quarter === selectedQuarter && reportYear === selectedYear;
            }
            return getQuarter(reportDate) === selectedQuarter && reportYear === selectedYear;
          }
          if (kpiPeriodType === 'mensuel') {
            const selectedMonth = parseInt(kpiSelectedMonth, 10);
            if (r.report_type === 'mensuel') {
              return r.month === selectedMonth && reportYear === selectedYear;
            }
            return reportDate.getMonth() === selectedMonth && reportYear === selectedYear;
          }
          if (kpiPeriodType === 'hebdomadaire') {
            const selectedWeek = parseInt(kpiSelectedWeek, 10);
            if (r.report_type === 'hebdomadaire') {
              return r.week_number === selectedWeek && reportYear === selectedYear;
            }
            return getWeek(reportDate, { weekStartsOn: 1 }) === selectedWeek && reportYear === selectedYear;
          }
          return false;
        });

        const breakdownByUser = {
          personnesEvangelisees: {},
          nouveauxConvertis: {},
          nouveauxArrivants: {},
          amesRevenues: {},
          neRepondPlus: {}
        };
        rapportsFiltres.forEach((report) => {
          const stats = report.statistics_snapshot || {};
          const uid = report.user_id;
          kpiAnnuels.culteSamediSoir += stats.saturday_evening_count || 0;
          kpiAnnuels.culteDimancheMatin += stats.sunday_attendance_count || 0;
          kpiAnnuels.afterCulteDimanche += stats.after_culte_count || 0;
          kpiAnnuels.tempsPriere += stats.saturday_prayer_count || 0;
          kpiAnnuels.tempsPartage += stats.sunday_sharing_count || 0;
          kpiAnnuels.nouveauxConvertis += stats.nouveaux_convertis || 0;
          kpiAnnuels.nouveauxArrivants += stats.nouveaux_arrivants || 0;
          kpiAnnuels.amesRevenues += stats.ames_revenues || 0;
          kpiAnnuels.neRepondPlus += stats.ne_repond_plus || 0;
          kpiAnnuels.sortiesEvangelisation += stats.evangelization || 0;
          kpiAnnuels.personnesEvangelisees += stats.evangelization || 0;
          kpiAnnuels.comFratDisciples += stats.com_frat_disciples || 0;
          kpiAnnuels.veillee += stats.veillee || 0;
          kpiAnnuels.meditationBible += stats.meditation_bible || 0;
          if (uid) {
            breakdownByUser.personnesEvangelisees[uid] = (breakdownByUser.personnesEvangelisees[uid] || 0) + (stats.evangelization || 0);
            breakdownByUser.nouveauxConvertis[uid] = (breakdownByUser.nouveauxConvertis[uid] || 0) + (stats.nouveaux_convertis || 0);
            breakdownByUser.nouveauxArrivants[uid] = (breakdownByUser.nouveauxArrivants[uid] || 0) + (stats.nouveaux_arrivants || 0);
            breakdownByUser.amesRevenues[uid] = (breakdownByUser.amesRevenues[uid] || 0) + (stats.ames_revenues || 0);
            breakdownByUser.neRepondPlus[uid] = (breakdownByUser.neRepondPlus[uid] || 0) + (stats.ne_repond_plus || 0);
          }
        });

        const toBreakdownArray = (byUser) =>
          Object.entries(byUser)
            .map(([userId, value]) => {
              const f = (familles || []).find((x) => x.superviseur?.id === userId);
              const familleNom = f?.famille?.nom || 'Famille';
              const superviseurNom = f?.superviseur
                ? `${f.superviseur.first_name || ''} ${f.superviseur.last_name || ''}`.trim() || '—'
                : '—';
              return { familleNom, superviseurNom, value };
            })
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        setKpiAnnuelsBreakdown({
          personnesEvangelisees: toBreakdownArray(breakdownByUser.personnesEvangelisees),
          nouveauxConvertis: toBreakdownArray(breakdownByUser.nouveauxConvertis),
          nouveauxArrivants: toBreakdownArray(breakdownByUser.nouveauxArrivants),
          amesRevenues: toBreakdownArray(breakdownByUser.amesRevenues),
          neRepondPlus: toBreakdownArray(breakdownByUser.neRepondPlus)
        });
      } else {
        setKpiAnnuelsBreakdown({
          personnesEvangelisees: [],
          nouveauxConvertis: [],
          nouveauxArrivants: [],
          amesRevenues: [],
          neRepondPlus: []
        });
      }

      setGlobalStats((prev) => ({
        ...prev,
        totalRapports,
        rapportsHebdo,
        rapportsMensuels,
        rapportsTrimestriels,
        rapportsAnnuels,
        kpiAnnuels
      }));

      await generateChartData(rapportsData || [], objectifTotal);
    } catch (error) {
      handleError(error, { context: 'fetchKpiTabData' }, "Impossible de charger les KPI de la période.");
      setKpiAnnuelsBreakdown({
        personnesEvangelisees: [],
        nouveauxConvertis: [],
        nouveauxArrivants: [],
        amesRevenues: [],
        neRepondPlus: []
      });
    } finally {
      setLoadingKpiTab(false);
    }
  };

  // KPI Globaux - Total Disciples par Pasteur (pasteur, admin, super_admin)
  // Priorité : RPC get_kpi_disciples_par_pasteur (source = profils) ; repli sur requêtes directes.
  const fetchKpiParPasteur = async () => {
    if (role !== 'pasteur' && role !== 'admin' && role !== 'super_admin') return;
    setKpiParPasteurLoading(true);
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_kpi_disciples_par_pasteur');
      if (!rpcError && Array.isArray(rpcData) && rpcData.length >= 0) {
        const result = (rpcData || []).map((row) => ({
          id: row.pasteur_id,
          nomAffichage: row.nom_affichage || '',
          totalDisciples: Number(row.total_disciples) || 0,
          totalFamilles: Number(row.total_familles) || 0,
        }));
        setKpiParPasteur(result);
        setKpiParPasteurTotalCumule(result.reduce((s, r) => s + r.totalDisciples, 0));
        setKpiParPasteurTotalFamilles(result.reduce((s, r) => s + (r.totalFamilles || 0), 0));
        return;
      }
      // Repli : compter les profils par famille (même source que Liste des Familles et KPI des Familles)
      const { data: pasteurs, error: errP } = await supabase
        .from('profils')
        .select('id, first_name, last_name, identifiant_unique')
        .eq('role', 'pasteur')
        .order('identifiant_unique');
      if (errP) throw errP;
      if (!pasteurs?.length) {
        setKpiParPasteur([]);
        setKpiParPasteurTotalCumule(0);
        setKpiParPasteurTotalFamilles(0);
        return;
      }
      const { data: superviseurs, error: errS } = await supabase
        .from('profils')
        .select('id, pasteur_id')
        .eq('role', 'superviseur')
        .not('pasteur_id', 'is', null);
      if (errS) throw errS;
      const superviseursByPasteur = {};
      (superviseurs || []).forEach(s => {
        if (!superviseursByPasteur[s.pasteur_id]) superviseursByPasteur[s.pasteur_id] = [];
        superviseursByPasteur[s.pasteur_id].push(s.id);
      });
      const { data: famillesRows } = await supabase
        .from('familles_disciples')
        .select('id, superviseur_id');
      const familleIds = (famillesRows || []).map(f => f.id).filter(Boolean);
      let countsByFamille = {};
      if (familleIds.length > 0) {
        const { data: rpcCounts } = await supabase.rpc('get_nombre_profils_par_familles', { p_famille_ids: familleIds });
        (rpcCounts || []).forEach((row) => {
          const fid = row.famille_id ?? row.familleId;
          const nb = Number(row.nb_profils ?? row.nbProfils) || 0;
          if (fid) countsByFamille[fid] = nb;
        });
        if (Object.keys(countsByFamille).length === 0) {
          for (const f of famillesRows || []) {
            const { count } = await supabase.from('profils').select('id', { count: 'exact', head: true }).eq('famille_id', f.id);
            countsByFamille[f.id] = count ?? 0;
          }
        }
      }
      const result = pasteurs.map(p => {
        const supIds = superviseursByPasteur[p.id] || [];
        const famillesPasteur = (famillesRows || []).filter(f => supIds.includes(f.superviseur_id));
        const total = famillesPasteur.reduce((sum, f) => sum + (countsByFamille[f.id] || 0), 0);
        const totalFamilles = famillesPasteur.length;
        const nomAffichage = (`${p.first_name || ''} ${p.last_name || ''}`.trim() || p.identifiant_unique || 'Pasteur').toUpperCase();
        return { id: p.id, nomAffichage, totalDisciples: total, totalFamilles };
      });
      setKpiParPasteur(result);
      setKpiParPasteurTotalCumule(result.reduce((s, r) => s + r.totalDisciples, 0));
      setKpiParPasteurTotalFamilles(result.reduce((s, r) => s + (r.totalFamilles || 0), 0));
    } catch (e) {
      handleError(e, { context: 'fetchKpiParPasteur' }, "Impossible de charger les KPI par pasteur.");
      setKpiParPasteur([]);
      setKpiParPasteurTotalCumule(0);
      setKpiParPasteurTotalFamilles(0);
    } finally {
      setKpiParPasteurLoading(false);
    }
  };

  // Charger les familles d'un pasteur donné (pour affichage onglet Familles après clic sur une carte KPI)
  const fetchFamillesForPasteur = async (pasteurId) => {
    if (!pasteurId) {
      setFamillesForSelectedPasteur([]);
      return;
    }
    setLoadingFamillesForPasteur(true);
    try {
      const { data: superviseursData, error: supErr } = await supabase
        .from('profils')
        .select('id, first_name, last_name, email, identifiant_unique, avatar_url, pasteur_id')
        .eq('pasteur_id', pasteurId)
        .eq('role', 'superviseur')
        .order('first_name', { ascending: true });
      if (supErr) throw supErr;
      const superviseursList = superviseursData || [];
      const famillesAvecStats = await Promise.all(
        superviseursList.map(async (superviseur) => {
          const { data: famillesData, error: familleError } = await supabase
            .from('familles_disciples')
            .select('id, superviseur_id, nom, identifiant_famille, statut, objectif_disciples, nombre_disciples_actuels, created_at')
            .eq('superviseur_id', superviseur.id)
            .order('created_at', { ascending: false })
            .limit(1);
          if (familleError || !famillesData?.length) {
            return { superviseur, famille: null, stats: { nombreMembres: 0, objectif: 70, progression: 0, reste: 70 } };
          }
          const familleData = famillesData[0];
          const { count: nombreDisciples } = await supabase
            .from('profils')
            .select('id', { count: 'exact', head: true })
            .eq('famille_id', familleData.id);
          const nombreMembres = nombreMembresPourStats(nombreDisciples ?? familleData.nombre_disciples_actuels ?? 0);
          const objectif = familleData.objectif_disciples || 70;
          const progression = Math.min((nombreMembres / objectif) * 100, 100);
          return {
            superviseur,
            famille: familleData,
            stats: { nombreMembres, objectif, progression, reste: Math.max(0, objectif - nombreMembres) },
          };
        })
      );
      setFamillesForSelectedPasteur(famillesAvecStats.filter(f => f.famille != null));
    } catch (e) {
      handleError(e, { context: 'fetchFamillesForPasteur' }, "Impossible de charger les familles de ce pasteur.");
      setFamillesForSelectedPasteur([]);
    } finally {
      setLoadingFamillesForPasteur(false);
    }
  };

  // Fonction pour normaliser une chaîne (supprimer les accents et mettre en minuscules)
  const normalizeString = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Supprime les accents
  };

  // Fonction pour formater le nom de famille (mettre "Les" en majuscules et ajouter "LES" si absent)
  const formatFamilleName = (nom) => {
    if (!nom) return '';
    // Si le nom commence déjà par "Les" ou "LES", on le met en majuscules
    if (/^Les\s+/i.test(nom)) {
      return nom.replace(/^Les\s+/i, 'LES ');
    }
    // Sinon, on ajoute "LES " au début
    return `LES ${nom}`;
  };

  // Charger les superviseurs pour le formulaire de création
  const loadSuperviseursOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('profils')
        .select('id, first_name, last_name, email')
        .eq('role', 'superviseur')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setSuperviseursOptions(data || []);
    } catch (error) {
      handleError(error, { context: 'loadSuperviseursOptions' }, "Impossible de charger la liste des superviseurs.");
    }
  };

  // Ouvrir le dialog de création
  const openCreateDialog = async () => {
    const nextIndex = familles.length + 1;
    const defaultIdentifiant = `FAM${String(nextIndex).padStart(3, '0')}`;

    setCreateForm({
      nom: '',
      identifiant_famille: defaultIdentifiant,
      statut: 'actif',
      objectif_disciples: 70,
      superviseur_id: '',
    });

    if (superviseursOptions.length === 0) {
      await loadSuperviseursOptions();
    }
    setIsCreateDialogOpen(true);
  };

  // Créer une nouvelle famille
  const handleCreateFamille = async (e) => {
    e?.preventDefault();
    if (!createForm.nom || !createForm.identifiant_famille || !createForm.superviseur_id) {
      toast({
        title: 'Champs manquants',
        description: 'Merci de renseigner le nom, l\'identifiant et le superviseur de la famille.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreateLoading(true);
      const { error } = await supabase
        .from('familles_disciples')
        .insert({
          nom: createForm.nom.trim(),
          identifiant_famille: createForm.identifiant_famille.trim(),
          statut: createForm.statut,
          objectif_disciples: Number(createForm.objectif_disciples) || 70,
          nombre_disciples_actuels: 0,
          superviseur_id: createForm.superviseur_id,
        });

      if (error) throw error;

      // Recharger les données
      await fetchPasteurData();

      setIsCreateDialogOpen(false);
      toast({
        title: 'Famille créée',
        description: `La famille "${createForm.nom}" a été ajoutée avec succès.`,
      });
    } catch (error) {
      handleError(error, { context: 'handleCreateFamille' }, "Impossible de créer la famille. Vérifiez que l'identifiant est unique.");
    } finally {
      setCreateLoading(false);
    }
  };

  // État pour les données des graphiques d'évolution
  const [chartData, setChartData] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [missingReports, setMissingReports] = useState([]);
  const [showAllMissingReports, setShowAllMissingReports] = useState(false);
  const [showAllSuperviseursFamilles, setShowAllSuperviseursFamilles] = useState(false);
  // Vue Pasteur « Rapports reçus » : liste des rapports par superviseur, filtres mois/année
  const [rapportsRecus, setRapportsRecus] = useState([]);
  const [loadingRapportsRecus, setLoadingRapportsRecus] = useState(false);
  const [filtreRapportsAnnee, setFiltreRapportsAnnee] = useState(new Date().getFullYear().toString());
  const [filtreRapportsMois, setFiltreRapportsMois] = useState(''); // '' = tous les mois
  const [rapportDetailModal, setRapportDetailModal] = useState(null); // { report, superviseurName }
  const [hoveredFamilleNameProgression, setHoveredFamilleNameProgression] = useState(null); // nom de famille au survol (graphique Progression Globale)
  const [kpiAnnuelsBreakdown, setKpiAnnuelsBreakdown] = useState({ personnesEvangelisees: [], nouveauxConvertis: [], nouveauxArrivants: [], amesRevenues: [], neRepondPlus: [] });
  const [kpiDetailModal, setKpiDetailModal] = useState(null); // { title, data: [{ familleNom, superviseurNom, value }] }
  const [hoveredKpiBarName, setHoveredKpiBarName] = useState(null); // libellé Y au survol (graphique KPI période)
  const [evolutionVisibleSeries, setEvolutionVisibleSeries] = useState({
    culteSamediSoir: true,
    culteDimancheMatin: true,
    afterCulteDimanche: true,
    tempsPriere: true,
    tempsPartage: true,
    nouveauxConvertis: true,
    nouveauxArrivants: true,
    sortiesEvangelisation: true,
    personnesEvangelisees: true
  });
  const evolutionChartsRef = useRef(null);
  const [evolutionChartsInView, setEvolutionChartsInView] = useState(false);
  const overviewChartRef = useRef(null);
  const [overviewChartInView, setOverviewChartInView] = useState(false);
  const prefetchStartedRef = useRef({ kpi: false, reports: false });

  // Prefetch au survol des onglets : charger les données en arrière-plan pour affichage immédiat au clic
  const handleTabHover = (tabKey) => {
    if (tabKey === TAB_KEYS.KPI && !prefetchStartedRef.current.kpi) {
      prefetchStartedRef.current.kpi = true;
      fetchKpiTabData();
    }
    if (tabKey === TAB_KEYS.REPORTS && !prefetchStartedRef.current.reports && superviseurs?.length) {
      prefetchStartedRef.current.reports = true;
      fetchRapportsRecus();
    }
  };

  // Lazy load du graphique phare Vue d'ensemble (IntersectionObserver)
  useEffect(() => {
    if (activeTab !== TAB_KEYS.OVERVIEW) return;
    const el = overviewChartRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) setOverviewChartInView(true); },
      { rootMargin: '100px', threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeTab]);

  // Lazy load des graphiques d'évolution (IntersectionObserver)
  useEffect(() => {
    const el = evolutionChartsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) setEvolutionChartsInView(true); },
      { rootMargin: '80px', threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeTab]);

  // KPI Globaux - Total Disciples par Pasteur (vue admin/super_admin)
  const [kpiParPasteur, setKpiParPasteur] = useState([]); // { id, nomAffichage, totalDisciples, totalFamilles }[]
  const [kpiParPasteurLoading, setKpiParPasteurLoading] = useState(false);
  const [kpiParPasteurTotalCumule, setKpiParPasteurTotalCumule] = useState(0);
  const [kpiParPasteurTotalFamilles, setKpiParPasteurTotalFamilles] = useState(0);
  const [loadingKpiTab, setLoadingKpiTab] = useState(false);

  // Fonction pour générer les données historiques des graphiques
  const generateChartData = async (reportsData, objectifTotal = 1) => {
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
          meditationBible: 0,
          disciplesDeclares: 0,
          progressionEstimee: 0
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
      // Disciples déclarés dans le rapport (snapshot peut utiliser "disciples" ou autre clé)
      const disciples = stats.disciples ?? stats.total_disciples ?? 0;
      chartMap[monthKey].disciplesDeclares += Number(disciples) || 0;
    });

    // Calculer progressionEstimee par mois (disciples déclarés / objectif total)
    Object.keys(chartMap).forEach(k => {
      chartMap[k].progressionEstimee = objectifTotal > 0
        ? Math.min(100, Math.round((chartMap[k].disciplesDeclares / objectifTotal) * 100))
        : 0;
    });

    // Convertir en tableau et trier par date
    const dataArray = Object.values(chartMap).sort((a, b) => a.mois.localeCompare(b.mois));
    
    // Prendre les 12 derniers mois
    setChartData(dataArray.slice(-12));
  };

  // Fonction pour exporter en PDF
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `dashboard_pasteur_${timestamp}.pdf`;
      await exportElementToPDF('pasteur-dashboard-content', filename);
      toast({ title: 'Export PDF réussi', description: 'Le tableau de bord a été exporté en PDF.' });
    } catch (error) {
      handleError(error, { context: 'handleExportPDF' }, "Impossible d'exporter le tableau de bord en PDF.");
    } finally {
      setExporting(false);
    }
  };

  // Fonction pour exporter en Excel (CSV) – tableau des familles (aligné tableau consolidé 7 colonnes)
  const handleExportExcel = () => {
    try {
      const exportData = filteredFamilles.map(item => {
        const sup = item.superviseur;
        const st = item.stats || {};
        return {
          'Nom': sup?.last_name ?? '',
          'Prénom (superviseur)': sup?.first_name ?? '',
          'Église (famille)': item.famille?.nom ?? 'Non assignée',
          'Nombre de disciples': st.nombreMembres ?? 0,
          'Avancement % vers objectif 70': typeof st.progression === 'number' ? Math.round(st.progression) : '',
          'Nombre de disciples présents': st.disciples_presents != null ? st.disciples_presents : '',
          'Taux de participation de la semaine': st.taux_participation_semaine != null ? `${st.taux_participation_semaine} %` : '',
          'Email': sup?.email ?? '',
          'Identifiant famille': item.famille?.identifiant_famille ?? '',
          'Objectif': st.objectif ?? 70,
          'Statut': (st.progression ?? 0) >= 100 ? 'Objectif atteint' : 'En cours',
        };
      });

      if (exportData.length === 0) {
        toast({ variant: 'destructive', title: 'Export impossible', description: 'Aucune famille à exporter avec les filtres actuels.' });
        return;
      }

      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      exportToExcel(exportData, `dashboard_pasteur_familles_${timestamp}`, {
        title: 'Tableau des familles – Dashboard Pasteur',
        description: 'Familles sous la responsabilité du pasteur',
        author: 'DiscipleLife',
      });
      toast({ title: 'Export réussi', description: `${exportData.length} famille(s) exportée(s).` });
    } catch (error) {
      handleError(error, { context: 'handleExportExcel' }, "Impossible d'exporter les familles.");
    }
  };

  // Fonction pour vérifier les rapports manquants
  const checkMissingReports = async () => {
    try {
      const now = new Date();
      const currentDay = now.getDate();
      
      // L'alerte n'apparaît qu'à partir du 1er jour du mois suivant
      // Si nous ne sommes pas au moins le 1er jour du mois, ne pas afficher l'alerte
      if (currentDay < 1) {
        setMissingReports([]);
        return;
      }

      // Calculer le mois précédent
      const previousMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1; // 0-indexed
      const previousYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

      // Déterminer le type de rapport attendu (mensuel pour le mois précédent)
      const expectedReportType = 'mensuel';
      
      // Récupérer tous les superviseurs du pasteur
      const { data: superviseursData } = await supabase
        .from('profils')
        .select('id, first_name, last_name, email')
        .eq('pasteur_id', user.id)
        .eq('role', 'superviseur');

      if (!superviseursData || superviseursData.length === 0) {
        setMissingReports([]);
        return;
      }

      const superviseurIds = superviseursData.map(s => s.id);

      // Vérifier quels superviseurs ont envoyé leur rapport mensuel pour le mois précédent
      const { data: rapportsData } = await supabase
        .from('reports')
        .select('user_id, month, year, report_type')
        .in('user_id', superviseurIds)
        .eq('report_type', expectedReportType)
        .eq('month', previousMonth)
        .eq('year', previousYear)
        .eq('status', 'submitted');

      const superviseursAvecRapport = new Set(
        (rapportsData || []).map(r => r.user_id)
      );

      // Identifier les superviseurs sans rapport
      const manquants = superviseursData
        .filter(s => !superviseursAvecRapport.has(s.id))
        .map(s => ({
          id: s.id,
          name: `${s.first_name} ${s.last_name}`,
          email: s.email
        }));

      setMissingReports(manquants);

      // Afficher une notification si des rapports manquent (seulement à partir du 1er jour du mois)
      if (manquants.length > 0 && currentDay >= 1) {
        const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        const previousMonthName = monthNames[previousMonth];
        toast({
          variant: 'destructive',
          title: `${manquants.length} rapport(s) manquant(s)`,
          description: `${manquants.length} superviseur(s) n'ont pas encore envoyé leur rapport mensuel pour ${previousMonthName} ${previousYear}.`,
        });
      }
    } catch (error) {
      handleError(error, { context: 'checkMissingReports' }, "Impossible de vérifier les rapports manquants.");
    }
  };

  // Vue Pasteur « Rapports reçus » : liste des rapports soumis par les superviseurs, filtres mois/année
  const fetchRapportsRecus = async () => {
    if (!superviseurs?.length) {
      setRapportsRecus([]);
      return;
    }
    setLoadingRapportsRecus(true);
    try {
      const superviseurIds = superviseurs.map(s => s.id);
      let query = supabase
        .from('reports')
        .select('id, user_id, report_type, created_at, month, year, quarter, week_number, content, statistics_snapshot')
        .in('user_id', superviseurIds)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false })
        .limit(200);
      const yearNum = parseInt(filtreRapportsAnnee, 10);
      if (!Number.isNaN(yearNum)) {
        query = query.eq('year', yearNum);
      }
      if (filtreRapportsMois !== '' && filtreRapportsMois !== '__tous__') {
        const monthNum = parseInt(filtreRapportsMois, 10);
        if (!Number.isNaN(monthNum)) query = query.eq('month', monthNum);
      }
      const { data: reportsData, error } = await query;
      if (error) throw error;
      const superviseurById = Object.fromEntries(superviseurs.map(s => [s.id, s]));
      const list = (reportsData || []).map(r => ({
        ...r,
        superviseurName: superviseurById[r.user_id]
          ? `${superviseurById[r.user_id].first_name || ''} ${superviseurById[r.user_id].last_name || ''}`.trim()
          : 'Superviseur',
      }));
      setRapportsRecus(list);
    } catch (error) {
      handleError(error, { context: 'fetchRapportsRecus' }, "Impossible de charger les rapports reçus.");
      setRapportsRecus([]);
    } finally {
      setLoadingRapportsRecus(false);
    }
  };

  useEffect(() => {
    if (activeTab !== TAB_KEYS.REPORTS || !superviseurs?.length) {
      if (activeTab !== TAB_KEYS.REPORTS) return;
      setRapportsRecus([]);
      return;
    }
    fetchRapportsRecus();
  }, [activeTab, superviseurs?.length, filtreRapportsAnnee, filtreRapportsMois]);

  // Fonction pour récupérer les mentors consolidés (disciples-mentors ayant des disciples, familles actives)
  const fetchMentorsConsolides = async () => {
    try {
      setLoadingMentors(true);
      const cacheKeyBase = `pasteur_${user.id}_mentors_consolides_f${familles.length}`;
      
      const mentorsData = await getOrSetCache(
        cacheKeyBase,
        async () => {
          // Priorité : RPC qui retourne mentors/piliers avec disciples (contourne RLS)
          const { data: rpcRows, error: rpcError } = await supabase.rpc('get_mentors_avec_disciples_pour_pasteur', {
            p_pasteur_id: user.id,
          });
          if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
            const roleToTitre = (r) => (r === 'superviseur' ? 'Superviseur' : r === 'mentor' ? 'Mentor' : r === 'disciple_pillier' ? 'Berger' : r === 'disciple' ? 'Disciple' : r || 'Disciple');
            const objectif = 70;
            return rpcRows.map((row) => {
              const nb = Number(row.nombre_disciples) || 0;
              return {
                mentor_id: row.user_id,
                nom: row.last_name || '',
                prenom: row.first_name || '',
                eglise: row.famille_nom || 'N/A',
                suivi_par: row.suivi_par_nom || '—',
                nombre_disciples: nb,
                titre: row.titre || roleToTitre(row.role_profil),
                avancement_pourcentage: objectif > 0 ? Math.round(Math.min((nb / objectif) * 100, 100)) : 0,
                presence_culte_samedi: 0,
                disciples_presents: 0,
                taux_participation_semaine: 0,
              };
            });
          }
          // Repli : requêtes directes (comptages cercle peuvent être 0 si RLS bloque)
          const familleIds = familles.filter(f => f.famille?.id).map(f => f.famille.id);
          if (familleIds.length === 0) return [];

          const { data: mentorsProfils, error: mentorsError } = await supabase
            .from('profils')
            .select('id, first_name, last_name, famille_id, titre, role, mentor_id')
            .in('famille_id', familleIds)
            .neq('role', 'superviseur');

          if (mentorsError) throw mentorsError;
          const profilsSansSuperviseurs = (mentorsProfils || []).filter((p) => p.role !== 'superviseur');
          if (profilsSansSuperviseurs.length === 0) return [];

          const mentorIdsUniques = [...new Set(profilsSansSuperviseurs.map((p) => p.mentor_id).filter(Boolean))];
          let mentorNamesById = {};
          if (mentorIdsUniques.length > 0) {
            const { data: mentorProfils } = await supabase.from('profils').select('id, first_name, last_name').in('id', mentorIdsUniques);
            mentorNamesById = Object.fromEntries(
              (mentorProfils || []).map((p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(' ').trim().toUpperCase() || '—'])
            );
          }

          const mentorsAvecStats = await Promise.all(
            profilsSansSuperviseurs.map(async (mentor) => {
              const superviseurDeLaFamille = familles.find(f => f.famille?.id === mentor.famille_id);
              const nomEglise = superviseurDeLaFamille?.famille?.nom || 'N/A';
              const sup = superviseurDeLaFamille?.superviseur;
              const suiviParSuperviseur = sup ? [sup.first_name || '', sup.last_name || ''].map(s => String(s).trim()).join(' ').trim().toUpperCase() || '—' : '—';
              const suiviPar = mentor.mentor_id ? (mentorNamesById[mentor.mentor_id] || suiviParSuperviseur) : suiviParSuperviseur;
              // Nombre de disciples du mentor : source = profils (mentor_id)
              const { count: nombreDisciples } = await supabase
                .from('profils')
                .select('id', { count: 'exact', head: true })
                .eq('mentor_id', mentor.id);
              const nombreDisciplesTotal = nombreDisciples || 0;
              const objectif = 70;
              const avancementPourcentage = Math.min((nombreDisciplesTotal / objectif) * 100, 100);
              const titre = mentor.titre || (mentor.role === 'mentor' ? 'Mentor' : mentor.role === 'disciple_pillier' ? 'Berger' : 'Disciple');
              return {
                mentor_id: mentor.id,
                nom: mentor.last_name || '',
                prenom: mentor.first_name || '',
                eglise: nomEglise,
                suivi_par: suiviPar,
                nombre_disciples: nombreDisciplesTotal,
                titre,
                avancement_pourcentage: Math.round(avancementPourcentage),
                presence_culte_samedi: 0,
                disciples_presents: 0,
                taux_participation_semaine: 0,
              };
            })
          );
          return mentorsAvecStats.filter((m) => m.nombre_disciples > 0);
        },
        2 * 60 * 1000 // Cache 2 minutes
      );

      setMentorsConsolides(mentorsData || []);
    } catch (error) {
      handleError(error, { context: 'fetchMentorsConsolides' }, "Impossible de charger les données des mentors.");
    } finally {
      setLoadingMentors(false);
    }
  };

  // Liste des familles à afficher : du pasteur connecté (familles) ou du pasteur sélectionné via carte KPI (famillesForSelectedPasteur)
  const famillesToShow = (selectedPasteurIdForFamilies && selectedPasteurIdForFamilies !== user?.id)
    ? famillesForSelectedPasteur
    : familles;

  // Filtrer les familles selon la recherche (insensible à la casse et aux accents)
  const filteredFamilles = famillesToShow.filter(item => {
    if (!searchTerm) return true;
    const search = normalizeString(searchTerm);
    const nomSuperviseur = normalizeString(`${item.superviseur.first_name} ${item.superviseur.last_name}`);
    const nomFamille = normalizeString(item.famille?.nom || '');
    const identifiantFamille = normalizeString(item.famille?.identifiant_famille || '');
    return nomSuperviseur.includes(search) || nomFamille.includes(search) || identifiantFamille.includes(search);
  });

  // Filtres et tri pour le graphique "Progression des familles" (onglet KPI)
  const [progressionFilter, setProgressionFilter] = useState('toutes'); // 'toutes' | 'objectif_atteint' | 'en_cours'
  const [progressionSort, setProgressionSort] = useState('progression'); // 'progression' | 'disciples' | 'nom'
  const famillesForProgressionChart = React.useMemo(() => {
    let list = familles.filter(f => f.famille != null);
    if (progressionFilter === 'objectif_atteint') list = list.filter(f => (f.stats?.progression ?? 0) >= 100);
    if (progressionFilter === 'en_cours') list = list.filter(f => (f.stats?.progression ?? 0) < 100);
    list = [...list];
    if (progressionSort === 'progression') list.sort((a, b) => (b.stats?.progression ?? 0) - (a.stats?.progression ?? 0));
    else if (progressionSort === 'disciples') list.sort((a, b) => (b.stats?.nombreMembres ?? 0) - (a.stats?.nombreMembres ?? 0));
    else if (progressionSort === 'nom') list.sort((a, b) => (a.famille?.nom || '').localeCompare(b.famille?.nom || ''));
    return list;
  }, [familles, progressionFilter, progressionSort]);

  // Uniquement les disciples qui ont des disciples (pas les superviseurs) : piliers / mentors
  const mentorsConsolidesSansSuperviseurs = mentorsConsolides.filter(m => (m.titre || '').toLowerCase() !== 'superviseur');
  // Parser le champ recherche : ex. "< 50", "> 70", "≥ 53", "≤ 60" pour filtre Nbre disciples, le reste = recherche texte
  const parseSearchMentors = (term) => {
    const t = (term || '').trim();
    const match = t.match(/^\s*(>=|<=|<|>|\u2264|\u2265)\s*(\d+)\s*(.*)$/); // \u2264=≤ \u2265=≥ (>= et <= avant < et >)
    if (!match) return { op: null, x: null, text: t };
    let op = match[1];
    if (op === '\u2264') op = '<='; else if (op === '\u2265') op = '>=';
    return { op, x: Number(match[2]), text: (match[3] || '').trim() };
  };
  const searchMentorsParsed = parseSearchMentors(searchTermMentors);
  // Filtrer par recherche (nom, prénom, famille), par famille et par Nbre disciples (si op + x dans la recherche)
  const filteredMentorsConsolides = mentorsConsolidesSansSuperviseurs.filter(m => {
    const matchEglise = filterEgliseMentors === '__toutes__' || !filterEgliseMentors || (m.eglise === filterEgliseMentors);
    const nb = Number(m.nombre_disciples) ?? 0;
    let matchNbreDisciples = true;
    if (searchMentorsParsed.op != null && searchMentorsParsed.x != null) {
      if (searchMentorsParsed.op === '<') matchNbreDisciples = nb < searchMentorsParsed.x;
      else if (searchMentorsParsed.op === '>') matchNbreDisciples = nb > searchMentorsParsed.x;
      else if (searchMentorsParsed.op === '>=') matchNbreDisciples = nb >= searchMentorsParsed.x;
      else if (searchMentorsParsed.op === '<=') matchNbreDisciples = nb <= searchMentorsParsed.x;
    }
    const matchSearch = !searchMentorsParsed.text || (() => {
      const search = normalizeString(searchMentorsParsed.text);
      const nom = normalizeString(m.nom || '');
      const prenom = normalizeString(m.prenom || '');
      const eglise = normalizeString(m.eglise || '');
      return nom.includes(search) || prenom.includes(search) || eglise.includes(search);
    })();
    return matchSearch && matchEglise && matchNbreDisciples;
  });

  /** Libellé Statut pour le tableau : Mentor, Pilier, Disciple, Tutoré */
  const statutLabel = (titre) => {
    const t = (titre || '').trim();
    if (/mentor/i.test(t)) return 'Mentor';
    if (/berger|pillier|pilier/i.test(t)) return 'Pilier';
    if (/disciple/i.test(t)) return 'Disciple';
    return 'Tutoré';
  };

  /** Répartition d’affichage pour varier les effectifs : 25%→0, 10%→1, 20%→2–5, 40%→6–8, 5%→9–12 (en base beaucoup n’ont qu’1 disciple). */
  /** Affichage avec effectifs réels (RPC / profils) pour cohérence tableau ↔ fiche détail. */
  const displayMentorsConsolides = Array.isArray(filteredMentorsConsolides) ? filteredMentorsConsolides : [];

  // Fonction pour exporter en Excel (CSV) – tableau consolidé avec Suivi par, Famille, Statut
  const handleExportExcelMentors = () => {
    try {
      const exportData = displayMentorsConsolides.map(m => ({
        'Nom': m.nom || '',
        'Prénom': m.prenom || '',
        'Suivi par': m.suivi_par || '—',
        'Famille': m.eglise || '',
        'Nombre de disciples': m.nombre_disciples ?? 0,
        'Avancement % (objectif 70)': m.avancement_pourcentage != null ? m.avancement_pourcentage : '',
        'Nombre de disciples présents': m.disciples_presents != null ? m.disciples_presents : '',
        'Taux participation semaine (%)': m.taux_participation_semaine != null ? m.taux_participation_semaine : '',
        'Statut': (m.nombre_disciples ?? 0) === 0 ? 'Disciple' : statutLabel(m.titre),
      }));

      if (exportData.length === 0) {
        toast({ variant: 'destructive', title: 'Export impossible', description: 'Aucun mentor à exporter avec les filtres actuels.' });
        return;
      }

      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      exportToExcel(exportData, `dashboard_pasteur_mentors_${timestamp}`, {
        title: 'Tableau consolidé mentors (Piliers) – Dashboard Pasteur',
        description: 'Nom, Prénom, Suivi par, Famille, Nombre de disciples, Avancement %, Nombre de disciples présents, Taux participation semaine, Statut',
        author: 'DiscipleLife',
      });
      toast({ title: 'Export réussi', description: `${exportData.length} mentor(s) exporté(s).` });
    } catch (error) {
      handleError(error, { context: 'handleExportExcelMentors' }, "Impossible d'exporter le tableau des mentors.");
    }
  };

  const handleExportPasteurMembers = (formatExport) => {
    const list = pasteurMembersTable.filteredMembres || [];
    if (!list.length) {
      toast({ title: 'Aucune donnée', description: 'Aucun membre ne correspond aux filtres.', variant: 'destructive' });
      return;
    }
    const exportData = list.map((m) => ({
      'Prénom': m.first_name || '',
      'Nom': m.last_name || '',
      'Email': m.email || '',
      'Statut': m.statut_spirituel === 'inactif' ? 'Inactif' : 'Actif',
      'Nombre de Disciples': m.nombreDisciples || 0,
      'Formations terminées': pasteurMembersProgression[m.id]?.formations || 0,
      'Vidéos terminées': pasteurMembersProgression[m.id]?.videos || 0,
      'Total progression': pasteurMembersProgression[m.id]?.total || 0,
      'Suivi par': pasteurMembersSuiviPar[m.id]?.name || '-',
      "Date d'inscription": m.created_at ? safeFormatDate(m.created_at, 'dd/MM/yyyy', { locale: fr }) : '',
    }));
    const filename = `membres_familles_pasteur_${format(new Date(), 'yyyy-MM-dd', { locale: fr })}`;
    if (formatExport === 'pdf') {
      const uniqueId = `pdf-pasteur-members-${Date.now()}`;
      const tempDiv = document.createElement('div');
      tempDiv.id = uniqueId;
      tempDiv.style.cssText = 'position:absolute;left:-9999px;top:0;width:800px;';
      tempDiv.innerHTML = `<div style="font-family:Arial"><h2>Membres des familles - Pasteur</h2><p>Exporté le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p><p>Total: ${list.length} membre(s)</p><table style="width:100%;border-collapse:collapse;border:1px solid #ddd"><thead><tr style="background:#f3f4f6">${['Prénom','Nom','Email','Statut','Disciples','Progression','Suivi par','Date'].map(h=>`<th style="padding:10px;border:1px solid #ddd">${h}</th>`).join('')}</tr></thead><tbody>${list.map(m=>`<tr><td style="padding:8px;border:1px solid #ddd">${m.first_name||''}</td><td style="padding:8px;border:1px solid #ddd">${m.last_name||''}</td><td style="padding:8px;border:1px solid #ddd">${m.email||'-'}</td><td style="padding:8px;border:1px solid #ddd">${m.statut_spirituel==='inactif'?'Inactif':'Actif'}</td><td style="padding:8px;border:1px solid #ddd">${m.nombreDisciples||0}</td><td style="padding:8px;border:1px solid #ddd">${pasteurMembersProgression[m.id]?.total||0}</td><td style="padding:8px;border:1px solid #ddd">${pasteurMembersSuiviPar[m.id]?.name||'-'}</td><td style="padding:8px;border:1px solid #ddd">${m.created_at?safeFormatDate(m.created_at,'dd/MM/yyyy',{locale:fr}):'-'}</td></tr>`).join('')}</tbody></table></div>`;
      document.body.appendChild(tempDiv);
      exportElementToPDF(uniqueId, `${filename}.pdf`, { title: 'Membres des familles', subtitle: 'Pasteur', showHeader: true, showFooter: true }).finally(() => { try { document.getElementById(uniqueId)?.remove(); } catch (_) {} });
    } else {
      exportToExcel(exportData, filename, { title: 'Membres des familles', description: 'Pasteur', additionalInfo: { 'Nombre de membres': list.length.toString() } });
    }
  };

  // Spinner pleine page uniquement au premier chargement (pas à chaque refetch KPI)
  if (loading && !hasInitiallyLoadedRef.current) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard Pasteur - DiscipleLife</title>
      </Helmet>
      
      <div id="pasteur-dashboard-content" className="w-full max-w-screen-2xl mx-auto space-y-6 p-6 pb-24 bg-gray-50 dark:bg-gray-50 min-h-screen">
        {/* Bouton retour */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        {/* Bandeau de bienvenue */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-950 via-purple-950 to-purple-900 border border-gray-200 shadow-lg p-8 md:p-12" aria-label="Bienvenue et export du dashboard">
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white mb-4">
                  Bienvenue, <span className="bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">
                    {pasteurNom.first_name || ''}{pasteurNom.first_name && pasteurNom.last_name ? ' ' : ''}{pasteurNom.last_name || ''}
                  </span>
                </h1>
                <p className="text-xl text-white/90 mb-4 leading-relaxed">
                  Vous êtes le Pasteur Référent des Superviseurs de votre grande famille.
                </p>
                <p className="text-lg text-white/90 leading-relaxed">
                  Gérez et suivez la progression de tous vos superviseurs et leurs familles de disciples.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => navigate('/signup?mode=add')}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/30"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Ajouter un membre
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/arbre-genealogique')}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/30"
                >
                  <GitBranch className="h-4 w-4 mr-2" />
                  Mon arbre
                </Button>
                <Button
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {exporting ? 'Export...' : 'PDF'}
                </Button>
                <Button
                  onClick={handleExportExcel}
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>
          </div>
          
          {/* Background Decorative Circles */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" aria-label="Navigation du dashboard pasteur">
          <TabsList className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto gap-2 p-2 bg-gray-200 border border-gray-300 rounded-xl" role="tablist" aria-label="Onglets : Vue d'ensemble, KPI et Période, Familles, Membres et Mentors, Rapports">
            <TabsTrigger value={TAB_KEYS.OVERVIEW} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-800 data-[state=active]:border-transparent data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Vue d&apos;ensemble</span>
            </TabsTrigger>
            <TabsTrigger value={TAB_KEYS.KPI} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-800 data-[state=active]:border-transparent data-[state=active]:bg-purple-600 data-[state=active]:text-white" onMouseEnter={() => handleTabHover(TAB_KEYS.KPI)}>
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">KPI & Période</span>
            </TabsTrigger>
            <TabsTrigger value={TAB_KEYS.FAMILIES} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-800 data-[state=active]:border-transparent data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Building2 className="h-4 w-4 shrink-0" />
              Familles
            </TabsTrigger>
            <TabsTrigger value={TAB_KEYS.MEMBERS} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-800 data-[state=active]:border-transparent data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Users className="h-4 w-4 shrink-0" />
              Membres & Mentors
            </TabsTrigger>
            <TabsTrigger value={TAB_KEYS.REPORTS} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-800 data-[state=active]:border-transparent data-[state=active]:bg-purple-600 data-[state=active]:text-white" onMouseEnter={() => handleTabHover(TAB_KEYS.REPORTS)}>
              <Mail className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Rapports</span>
            </TabsTrigger>
          </TabsList>

        {/* Onglet Vue d'ensemble */}
        <TabsContent value={TAB_KEYS.OVERVIEW} className="space-y-6 mt-4">
          <PasteurOverview
            pasteurNom={pasteurNom}
            globalStats={globalStats}
            familles={familles}
            setSelectedFamille={setSelectedFamille}
            kpiParPasteur={kpiParPasteur}
            kpiParPasteurLoading={kpiParPasteurLoading}
            kpiParPasteurTotalCumule={kpiParPasteurTotalCumule}
            kpiParPasteurTotalFamilles={kpiParPasteurTotalFamilles}
            overviewChartRef={overviewChartRef}
            overviewChartInView={overviewChartInView}
            activeTab={activeTab}
            famillesForProgressionChart={famillesForProgressionChart}
            progressionFilter={progressionFilter}
            setProgressionFilter={setProgressionFilter}
            progressionSort={progressionSort}
            setProgressionSort={setProgressionSort}
            hoveredFamilleNameProgression={hoveredFamilleNameProgression}
            setHoveredFamilleNameProgression={setHoveredFamilleNameProgression}
            TAB_KEYS={TAB_KEYS}
            setActiveTab={setActiveTab}
            setSelectedPasteurIdForFamilies={setSelectedPasteurIdForFamilies}
            navigate={navigate}
            handleRefreshDonnees={handleRefreshDonnees}
            refreshing={refreshing}
            loading={loading}
            role={role}
          />
        </TabsContent>

        {/* Onglet KPI & Période */}
        <TabsContent value={TAB_KEYS.KPI} className="space-y-6 mt-4">
          <PasteurKpiPeriod
            pasteurNom={pasteurNom}
            loadingKpiTab={loadingKpiTab}
            filteredFamilles={filteredFamilles}
            chartData={chartData}
            famillesForProgressionChart={famillesForProgressionChart}
            familles={familles}
            progressionFilter={progressionFilter}
            setProgressionFilter={setProgressionFilter}
            progressionSort={progressionSort}
            setProgressionSort={setProgressionSort}
            hoveredFamilleNameProgression={hoveredFamilleNameProgression}
            setHoveredFamilleNameProgression={setHoveredFamilleNameProgression}
            setSelectedFamille={setSelectedFamille}
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
            globalStats={globalStats}
            kpiAnnuelsBreakdown={kpiAnnuelsBreakdown}
            kpiDetailModal={kpiDetailModal}
            setKpiDetailModal={setKpiDetailModal}
            hoveredKpiBarName={hoveredKpiBarName}
            setHoveredKpiBarName={setHoveredKpiBarName}
            evolutionChartsRef={evolutionChartsRef}
            evolutionChartsInView={evolutionChartsInView}
            evolutionVisibleSeries={evolutionVisibleSeries}
            setEvolutionVisibleSeries={setEvolutionVisibleSeries}
          />
        </TabsContent>


        {/* Onglet Familles */}
        <TabsContent value={TAB_KEYS.FAMILIES} className="space-y-6 mt-4">
          <PasteurFamilies
            selectedPasteurIdForFamilies={selectedPasteurIdForFamilies}
            setSelectedPasteurIdForFamilies={setSelectedPasteurIdForFamilies}
            kpiParPasteur={kpiParPasteur}
            user={user}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            setSelectedFamille={setSelectedFamille}
            famillesToShow={famillesToShow}
            globalStats={globalStats}
            loadingFamillesForPasteur={loadingFamillesForPasteur}
            filteredFamilles={filteredFamilles}
            formatFamilleName={formatFamilleName}
            openCreateDialog={openCreateDialog}
            showAllSuperviseursFamilles={showAllSuperviseursFamilles}
            setShowAllSuperviseursFamilles={setShowAllSuperviseursFamilles}
          />
        </TabsContent>

        {/* Onglet Membres & Mentors */}
        <TabsContent value={TAB_KEYS.MEMBERS} className="space-y-6 mt-4">
          <PasteurMembers
            loadingPasteurMembers={loadingPasteurMembers}
            pasteurMembersTable={pasteurMembersTable}
            navigate={navigate}
            onExportFilteredList={handleExportPasteurMembers}
            toast={toast}
            loadingMentors={loadingMentors}
            displayMentorsConsolides={displayMentorsConsolides}
            mentorsConsolidesSansSuperviseurs={mentorsConsolidesSansSuperviseurs}
            mentorsConsolides={mentorsConsolides}
            searchTermMentors={searchTermMentors}
            setSearchTermMentors={setSearchTermMentors}
            filterEgliseMentors={filterEgliseMentors}
            setFilterEgliseMentors={setFilterEgliseMentors}
            filteredMentorsConsolidesLength={filteredMentorsConsolides.length}
            onExportExcelMentors={handleExportExcelMentors}
            statutLabel={statutLabel}
          />
        </TabsContent>

        {/* Onglet Rapports */}
        <TabsContent value={TAB_KEYS.REPORTS} className="space-y-6 mt-4">
          <PasteurReports
            globalStats={globalStats}
            navigate={navigate}
            loadingRapportsRecus={loadingRapportsRecus}
            rapportsRecus={rapportsRecus}
            filtreRapportsAnnee={filtreRapportsAnnee}
            filtreRapportsMois={filtreRapportsMois}
            setFiltreRapportsAnnee={setFiltreRapportsAnnee}
            setFiltreRapportsMois={setFiltreRapportsMois}
            onFetchRapportsRecus={fetchRapportsRecus}
            setRapportDetailModal={setRapportDetailModal}
            missingReports={missingReports}
            showAllMissingReports={showAllMissingReports}
            setShowAllMissingReports={setShowAllMissingReports}
          />
        </TabsContent>
        </Tabs>

        {/* Modal de détails de la famille */}
        <Dialog open={selectedFamille !== null} onOpenChange={(open) => !open && setSelectedFamille(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-100" aria-label="Détails de la famille">
            {selectedFamille && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-black flex items-center gap-3">
                    <Building2 className="h-6 w-6 text-purple-600" />
                    {formatFamilleName(selectedFamille.famille?.nom || 'Famille sans nom')}
                  </DialogTitle>
                  <DialogDescription className="text-blue-600">
                    {selectedFamille.famille?.identifiant_famille || 'N/A'}
                    {(selectedFamille.famille?.statut || selectedFamille.famille?.created_at) && (
                      <span className="flex items-center gap-3 mt-2 flex-wrap">
                        {selectedFamille.famille?.statut && (
                          <Badge variant={selectedFamille.famille.statut === 'actif' ? 'default' : 'secondary'} className={selectedFamille.famille.statut === 'actif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}>
                            {selectedFamille.famille.statut === 'actif' ? 'Actif' : 'Inactif'}
                          </Badge>
                        )}
                        {selectedFamille.famille?.created_at && (
                          <span className="text-xs text-black flex items-center gap-1">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            Créée le {safeFormatDate(selectedFamille.famille.created_at, 'd MMMM yyyy', { locale: fr })}
                          </span>
                        )}
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Informations du superviseur */}
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Superviseur
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-4 flex-wrap">
                        <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center overflow-hidden shrink-0">
                          {selectedFamille.superviseur?.avatar_url ? (
                            <img src={selectedFamille.superviseur.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg font-semibold text-purple-600">
                              {(selectedFamille.superviseur?.first_name || '')[0]}{(selectedFamille.superviseur?.last_name || '')[0]}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-lg">
                            {selectedFamille.superviseur?.first_name} {selectedFamille.superviseur?.last_name}
                          </p>
                          {selectedFamille.superviseur?.titre && (
                            <p className="text-xs text-gray-500">{selectedFamille.superviseur.titre}</p>
                          )}
                          {selectedFamille.superviseur?.email && (
                            <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                              <Mail className="h-4 w-4 shrink-0" />
                              {selectedFamille.superviseur.email}
                            </p>
                          )}
                          {selectedFamille.superviseur?.email && (
                            <a
                              href={`mailto:${selectedFamille.superviseur.email}`}
                              className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:underline"
                            >
                              <Mail className="h-4 w-4" />
                              Contacter
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Statistiques de progression */}
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900">Progression</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-3xl font-bold text-blue-600">
                            {selectedFamille.stats?.nombreMembres ?? '—'}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">Membres actuels</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-3xl font-bold text-purple-600">
                            {selectedFamille.stats?.objectif ?? '—'}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">Objectif</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-3xl font-bold text-green-600">
                            {selectedFamille.stats != null ? `${Math.round(selectedFamille.stats.progression)}%` : '—'}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">Progression</div>
                        </div>
                      </div>
                      
                      {(selectedFamille.stats != null) && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600">Barre de progression</span>
                          <span className="font-medium text-gray-900">
                            {selectedFamille.stats.nombreMembres} / {selectedFamille.stats.objectif}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 relative">
                          <div
                            className={`h-4 rounded-full ${
                              (selectedFamille.stats.progression ?? 0) >= 100
                                ? 'bg-green-500'
                                : (selectedFamille.stats.progression ?? 0) >= 50
                                ? 'bg-purple-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(selectedFamille.stats.progression ?? 0, 100)}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-900">
                            {Math.round(selectedFamille.stats.progression ?? 0)}%
                          </span>
                        </div>
                      </div>
                      )}

                      {(selectedFamille.stats?.progression ?? 0) >= 100 && (
                        <div className="mt-4 flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">Objectif atteint !</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Liste des membres */}
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-purple-600" />
                        Membres ({familleModalDetails.members.length})
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        Disciples de la famille
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {familleModalDetails.loading ? (
                        <div className="flex items-center justify-center py-8 text-gray-500">
                          <Loader2 className="h-6 w-6 animate-spin mr-2" />
                          Chargement…
                        </div>
                      ) : familleModalDetails.members.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4">Aucun membre enregistré pour le moment.</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {familleModalDetails.members.map((m) => (
                            <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                              <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center shrink-0 overflow-hidden">
                                {m.avatar_url ? (
                                  <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-sm font-medium text-purple-600">
                                    {(m.first_name || '')[0]}{(m.last_name || '')[0]}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900 truncate">
                                  {m.first_name} {m.last_name}
                                </p>
                                {m.email && <p className="text-xs text-gray-500 truncate">{m.email}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Historique des rapports */}
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                        Historique des rapports ({familleModalDetails.reports.length})
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        Derniers rapports envoyés par le superviseur
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {familleModalDetails.loading ? (
                        <div className="flex items-center justify-center py-6 text-gray-500">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      ) : familleModalDetails.reports.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">Aucun rapport envoyé pour le moment.</p>
                      ) : (
                        <ul className="space-y-2 max-h-40 overflow-y-auto">
                          {familleModalDetails.reports.map((r) => {
                            const typeLabel = { hebdomadaire: 'Hebdomadaire', mensuel: 'Mensuel', trimestriel: 'Trimestriel', annuel: 'Annuel' }[r.report_type] || r.report_type;
                            const period = r.report_type === 'mensuel' && r.month != null
                              ? `${['Janv.','Févr.','Mars','Avr.','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.'][r.month]} ${r.year || ''}`
                              : r.report_type === 'trimestriel' && r.quarter
                              ? `T${r.quarter} ${r.year || ''}`
                              : r.report_type === 'hebdomadaire' && r.week_number
                              ? `Sem. ${r.week_number} ${r.year || ''}`
                              : r.year || '';
                            return (
                              <li key={r.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-900">{typeLabel}</span>
                                  {period && <span className="text-xs text-gray-500">— {period}</span>}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {safeFormatDate(r.created_at, 'd MMM yyyy', { locale: fr })}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  {/* Derniers indicateurs (dernier rapport) */}
                  {familleModalDetails.reports.length > 0 && familleModalDetails.reports[0].statistics_snapshot && (
                    <Card className="bg-white border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-purple-600" />
                          Derniers indicateurs
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                          Extrait du rapport du {safeFormatDate(familleModalDetails.reports[0].created_at, "d MMMM yyyy", { locale: fr })}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const s = familleModalDetails.reports[0].statistics_snapshot;
                          const items = [
                            { label: 'Disciples', value: s.disciples ?? '—', color: 'text-blue-600' },
                            { label: 'Présence culte dim.', value: s.sunday_attendance_count ?? '—', color: 'text-indigo-600' },
                            { label: 'Présence culte sam.', value: s.saturday_evening_count ?? '—', color: 'text-purple-600' },
                            { label: 'Évangélisations', value: s.evangelization ?? '—', color: 'text-amber-600' },
                            { label: 'Nouveaux convertis', value: s.nouveaux_convertis ?? '—', color: 'text-green-600' },
                          ];
                          return (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                              {items.map((i) => (
                                <div key={i.label} className="bg-gray-50 rounded-lg p-3 text-center">
                                  <div className={`text-lg font-bold ${i.color}`}>{i.value}</div>
                                  <div className="text-xs text-gray-600 mt-0.5">{i.label}</div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}

                  {/* Actions */}
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedFamille(null)}
                      className="border-gray-200 hover:bg-blue-600 hover:text-white"
                    >
                      Fermer
                    </Button>
                    {selectedFamille.famille && (
                      <Button
                        onClick={() => {
                          navigate('/familles');
                          setSelectedFamille(null);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Gérer les familles
                      </Button>
                    )}
                  </DialogFooter>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog création famille */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="bg-gray-100 border-gray-200 text-gray-900 max-w-lg" aria-label="Créer une nouvelle famille">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Créer une nouvelle famille de 70</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateFamille} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="famille-nom">Nom de la famille</Label>
                <Input
                  id="famille-nom"
                  value={createForm.nom}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, nom: e.target.value }))
                  }
                  placeholder={familles.length > 0 ? `Ex: ${familles[0].famille?.nom || 'LES DÉTERMINÉS'}` : 'Ex: LES DÉTERMINÉS'}
                  className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="famille-id">Identifiant</Label>
                <Input
                  id="famille-id"
                  value={createForm.identifiant_famille}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      identifiant_famille: e.target.value,
                    }))
                  }
                  placeholder={familles.length > 0 ? `Ex: ${familles[familles.length - 1].famille?.identifiant_famille || createForm.identifiant_famille}` : `Ex: ${createForm.identifiant_famille || 'FAM001'}`}
                  className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="objectif">Objectif de disciples</Label>
                  <Input
                    id="objectif"
                    type="number"
                    min={1}
                    value={createForm.objectif_disciples}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        objectif_disciples: e.target.value,
                      }))
                    }
                    className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select
                    value={createForm.statut}
                    onValueChange={(value) =>
                      setCreateForm((prev) => ({ ...prev, statut: value }))
                    }
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900">
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Superviseur *</Label>
                <Select
                  value={createForm.superviseur_id}
                  onValueChange={(value) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      superviseur_id: value,
                    }))
                  }
                  required
                >
                  <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900">
                    <SelectValue placeholder="Choisir un superviseur" />
                  </SelectTrigger>
                  <SelectContent>
                    {superviseursOptions.filter((sup) => sup.id).map((sup) => (
                      <SelectItem key={sup.id} value={String(sup.id)}>
                        {`${sup.first_name || ''} ${sup.last_name || ''}`.trim() ||
                          sup.email || '—'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-purple-600 text-white hover:bg-purple-700"
                  disabled={createLoading}
                >
                  {createLoading ? 'Création...' : 'Créer la famille'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal détail d'un rapport */}
        <Dialog open={!!rapportDetailModal} onOpenChange={() => setRapportDetailModal(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-gray-100 text-gray-900 border-gray-200" aria-label="Détail du rapport">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Détail du rapport</DialogTitle>
              <DialogDescription className="text-gray-700">
                {rapportDetailModal && (
                  <>Rapport {rapportDetailModal.report?.report_type ?? '—'} – {rapportDetailModal.superviseurName ?? '—'} – {safeFormatDate(rapportDetailModal.report?.created_at, 'dd/MM/yyyy', { locale: fr })}</>
                )}
              </DialogDescription>
            </DialogHeader>
            {rapportDetailModal?.report?.statistics_snapshot && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(rapportDetailModal.report.statistics_snapshot).map(([key, val]) => (
                  <div key={key} className="flex justify-between border-b pb-1">
                    <span className="text-gray-600">{key.replace(/_/g, ' ')}</span>
                    <span className="font-medium">{String(val)}</span>
                  </div>
                ))}
              </div>
            )}
            {rapportDetailModal?.report?.content && (
              <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{rapportDetailModal.report.content}</div>
            )}
            {rapportDetailModal && !rapportDetailModal.report?.statistics_snapshot && !rapportDetailModal.report?.content && (
              <p className="text-gray-500 text-sm">Aucun contenu détaillé.</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default PasteurDashboard;
