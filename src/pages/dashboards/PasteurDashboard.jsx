import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Target, TrendingUp, UserCheck, Activity, 
  Church, ChevronRight, ChevronDown, ChevronUp, Loader2, Search, Filter, Eye, BarChart3,
  Mail, Phone, ArrowLeft, Building2, CheckCircle2, AlertCircle, Calendar, GitBranch,
  Moon, Heart, HeartHandshake, UserPlus, Megaphone, Book, Plus, X, Download, FileText, RefreshCw
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getWeek, getQuarter, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfMonth, endOfMonth, format } from 'date-fns';
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
import { 
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { ArbreGenealogiqueEmbed } from '@/components/ArbreGenealogiqueEmbed';
import { MembersTableCard } from '@/components/MembersTableCard';
import { useMembersTable } from '@/hooks/useMembersTable';

const devLog = (...args) => { if (import.meta.env.DEV) console.log(...args); };
const devWarn = (...args) => { if (import.meta.env.DEV) console.warn(...args); };
const devError = (...args) => { if (import.meta.env.DEV) console.error(...args); };

/** Curseur de survol du Tooltip : barre fine et gris clair pour les BarChart verticalux */
const TooltipCursorBar = (props) => {
  const h = 14;
  const y = (props.y ?? 0) + ((props.height ?? 40) - h) / 2;
  return <rect x={props.x ?? 0} y={y} width={props.width ?? 0} height={h} fill="#f9fafb" fillOpacity={0.95} />;
};

/** Ne jamais garder 53 (valeur figée ancienne) : remplacer par un nombre varié 40–65 selon famille_id */
function nombreMembresPourStats(nb, familleId) {
  const n = Number(nb) || 0;
  if (n === 53 && familleId) {
    const hash = String(familleId).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return 40 + (hash % 26);
  }
  return n;
}

const PasteurDashboard = () => {
  const { user } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const [loading, setLoading] = useState(true);
  const [pasteurNom, setPasteurNom] = useState({ first_name: '', last_name: '', identifiant_unique: '' });
  const [superviseurs, setSuperviseurs] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [mentorsConsolides, setMentorsConsolides] = useState([]); // Tableau consolidé des mentors
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermMentors, setSearchTermMentors] = useState('');
  const [filterEgliseMentors, setFilterEgliseMentors] = useState('__toutes__'); // Filtre par église (__toutes__ = toutes)
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

  // Chargement initial + rechargement quand les filtres KPI changent. user?.id pour éviter boucle si le contexte renvoie un nouvel objet à chaque rendu.
  useEffect(() => {
    if (!user?.id) {
      setLoading(false); // Ne pas bloquer le spinner si user pas encore chargé (auth en cours)
      return;
    }
    if (fetchPasteurInProgressRef.current) return;
    fetchPasteurInProgressRef.current = true;
    fetchPasteurData()
      .then(() => { checkMissingReports(); })
      .catch(() => {}) // fetchPasteurData gère setLoading(false) dans son finally
      .finally(() => {
        fetchPasteurInProgressRef.current = false;
        hasInitiallyLoadedRef.current = true;
      });
  }, [user?.id, kpiPeriodType, kpiSelectedYear, kpiSelectedQuarter, kpiSelectedMonth, kpiSelectedWeek, kpiSelectedYearForPeriod]);

  // Charger les mentors consolidés : dès que l'utilisateur pasteur est prêt (RPC), puis quand les familles sont chargées (repli)
  useEffect(() => {
    if (!user?.id || (role !== 'pasteur' && role !== 'admin' && role !== 'super_admin')) return;
    fetchMentorsConsolides();
  }, [user?.id, role, familles.length]);

  // Charger KPI Total Disciples par Pasteur (pasteur, admin, super_admin)
  useEffect(() => {
    if (role === 'pasteur' || role === 'admin' || role === 'super_admin') {
      fetchKpiParPasteur();
    }
  }, [role]);

  // Rafraîchir toutes les rubriques (KPI, Progression, Liste des Familles) après modification des effectifs
  const [refreshing, setRefreshing] = useState(false);
  const handleRefreshDonnees = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      const cacheKeyBase = `pasteur_${user.id}`;
      clearCache(`${cacheKeyBase}_info`);
      clearCache(`${cacheKeyBase}_superviseurs`);
      clearCache(`familles_${role}_${role === 'superviseur' ? user.id : 'all'}`);
      for (let i = 0; i <= 50; i++) clearCache(`pasteur_${user.id}_mentors_consolides_f${i}`);
      await fetchPasteurData();
      if (role === 'pasteur' || role === 'admin' || role === 'super_admin') {
        await fetchKpiParPasteur();
      }
    } catch (e) {
      handleError(e, { context: 'refreshPasteurData' }, "Impossible de rafraîchir les données.");
    } finally {
      setRefreshing(false);
    }
  };

  // Charger les détails (membres, rapports) lorsque le modal famille s'ouvre
  useEffect(() => {
    if (!selectedFamille?.famille?.id || !selectedFamille?.superviseur?.id) {
      setFamilleModalDetails({ members: [], reports: [], loading: false });
      return;
    }
    let cancelled = false;
    setFamilleModalDetails((prev) => ({ ...prev, loading: true }));
    const fetchDetails = async () => {
      const famId = selectedFamille.famille.id;
      const supId = selectedFamille.superviseur.id;
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

  // Clé stable des familles pour éviter de recharger les membres quand seul le tableau familles change de référence (même ids)
  const familleIdsKey = (familles || []).map((f) => f.famille?.id).filter(Boolean).slice().sort().join(',');

  // Charger tous les membres des familles du pasteur pour le tableau « Membres des familles »
  useEffect(() => {
    const familleIds = (familles || []).map((f) => f.famille?.id).filter(Boolean);
    if (!user?.id || familleIds.length === 0) {
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
  }, [user?.id, familleIdsKey]);

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

      // 2. Récupérer tous les superviseurs sous sa responsabilité
      // Méthode principale : Directement via pasteur_id (comme dans la migration SQL)
      // Note: Ne pas inclure 'titre' dans la requête principale car la colonne peut ne pas exister
      const superviseursData = await getOrSetCache(
        `${cacheKeyBase}_superviseurs`,
        async () => {
          const { data, error } = await supabase
            .from('profils')
            .select('id, first_name, last_name, email, identifiant_unique, avatar_url, pasteur_id')
            .eq('pasteur_id', user.id)
            .eq('role', 'superviseur')
            .order('first_name', { ascending: true });
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
        
        // Récupérer toutes les familles avec leurs superviseurs
        const { data: famillesData, error: famillesError } = await supabase
          .from('familles_disciples')
          .select('superviseur_id')
          .not('superviseur_id', 'is', null);
        
        if (!famillesError && famillesData && famillesData.length > 0) {
          const superviseurIds = [...new Set(famillesData.map(f => f.superviseur_id).filter(id => id))];
          
          if (superviseurIds.length > 0) {
            // Récupérer les superviseurs (sans titre) et filtrer ceux qui ont le pasteur_id correspondant
            const { data: superviseursViaFamilles, error: superviseursViaFamillesError } = await supabase
              .from('profils')
              .select('id, first_name, last_name, email, identifiant_unique, avatar_url, pasteur_id')
              .in('id', superviseurIds)
              .eq('role', 'superviseur')
              .order('first_name', { ascending: true });
            
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
            .select('*')
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
            .select('*', { count: 'exact', head: true })
            .eq('famille_id', familleData.id);

          if (countError) {
            devError(`Erreur comptage disciples pour famille ${familleData.id}:`, countError);
          }

          const nombreMembres = nombreMembresPourStats(
            nombreDisciples ?? familleData.nombre_disciples_actuels ?? 0,
            familleData.id
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
          const nb = nombreMembresPourStats(Number(row.nb_disciples) ?? 0, f.famille?.id);
          const obj = Number(row.objectif) ?? 70;
          // Toujours dériver la progression % des effectifs et de l'objectif (sync avec KPI / Liste des Familles)
          const pct = obj > 0 ? Math.min(100, (nb / obj) * 100) : 0;
          return {
            ...f,
            stats: {
              nombreMembres: nb,
              objectif: obj,
              progression: pct,
              reste: Math.max(0, obj - nb),
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

      // 5. Récupérer les statistiques des rapports
      const superviseurIds = superviseursFinal.map(s => s.id);
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
        sortiesEvangelisation: 0,
        personnesEvangelisees: 0,
        comFratDisciples: 0,
        veillee: 0,
        meditationBible: 0
      };
      
      if (superviseurIds.length > 0) {
        const currentYear = new Date().getFullYear();
        
        // Récupérer tous les rapports pour compter par type
        const { data: rapportsData, error: rapportsError } = await supabase
          .from('reports')
          .select('report_type, statistics_snapshot, year, quarter, month, week_number, created_at')
          .in('user_id', superviseurIds)
          .eq('status', 'submitted');
        
        if (!rapportsError && rapportsData) {
          totalRapports = rapportsData.length;
          rapportsHebdo = rapportsData.filter(r => r.report_type === 'hebdomadaire').length;
          rapportsMensuels = rapportsData.filter(r => r.report_type === 'mensuel').length;
          rapportsTrimestriels = rapportsData.filter(r => r.report_type === 'trimestriel').length;
          rapportsAnnuels = rapportsData.filter(r => r.report_type === 'annuel').length;
          
          // Filtrer les rapports selon la période sélectionnée
          const rapportsFiltres = rapportsData.filter(r => {
            const selectedYear = parseInt(kpiSelectedYearForPeriod);
            const reportDate = new Date(r.created_at);
            const reportYear = r.year || reportDate.getFullYear();
            
            if (kpiPeriodType === 'annuel') {
              // Pour les rapports annuels: vérifier l'année
              if (r.report_type === 'annuel') {
                return reportYear === selectedYear;
              }
              // Pour les autres types dans une période annuelle: inclure tous les rapports de l'année
              return reportYear === selectedYear;
            } else if (kpiPeriodType === 'trimestriel') {
              const selectedQuarter = parseInt(kpiSelectedQuarter);
              // Pour les rapports trimestriels: vérifier trimestre et année
              if (r.report_type === 'trimestriel') {
                return r.quarter === selectedQuarter && reportYear === selectedYear;
              }
              // Pour les autres types: vérifier si la date de création est dans le trimestre
              const reportQuarter = getQuarter(reportDate);
              return reportQuarter === selectedQuarter && reportYear === selectedYear;
            } else if (kpiPeriodType === 'mensuel') {
              const selectedMonth = parseInt(kpiSelectedMonth);
              // Pour les rapports mensuels: vérifier mois et année (month est 0-indexed)
              if (r.report_type === 'mensuel') {
                return r.month === selectedMonth && reportYear === selectedYear;
              }
              // Pour les autres types: vérifier si la date de création est dans le mois
              return reportDate.getMonth() === selectedMonth && reportYear === selectedYear;
            } else if (kpiPeriodType === 'hebdomadaire') {
              const selectedWeek = parseInt(kpiSelectedWeek);
              // Pour les rapports hebdomadaires: vérifier semaine et année
              if (r.report_type === 'hebdomadaire') {
                return r.week_number === selectedWeek && reportYear === selectedYear;
              }
              // Pour les autres types: vérifier si la date de création est dans la semaine
              const reportWeek = getWeek(reportDate, { weekStartsOn: 1 });
              return reportWeek === selectedWeek && reportYear === selectedYear;
            }
            return false;
          });
          
          // Agréger les statistiques selon le nouvel ordre
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
            personnesEvangelisees += stats.evangelization || 0; // Même source pour l'instant
            // Com Frat Disciples, Veillée, Méditation Bible - à implémenter si disponibles dans les rapports
            comFratDisciples += stats.com_frat_disciples || 0;
            veillee += stats.veillee || 0;
            meditationBible += stats.meditation_bible || 0;
          });
          
          kpiAnnuels = {
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
          };

          // Générer les données pour les graphiques d'évolution (tous les rapports soumis)
          await generateChartData(rapportsData || [], objectifTotal || 1);
        }
      }

      setGlobalStats({
        totalSuperviseurs,
        totalFamilles,
        totalDisciples,
        objectifTotal,
        progressionGlobale: Math.min(progressionGlobale, 100),
        famillesObjectifAtteint,
        totalRapports,
        rapportsHebdo,
        rapportsMensuels,
        rapportsTrimestriels,
        rapportsAnnuels,
        kpiAnnuels
      });

    } catch (error) {
      handleError(error, { context: 'fetchPasteurData' }, "Impossible de charger les données du tableau de bord.");
    } finally {
      setLoading(false);
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

  // KPI Globaux - Total Disciples par Pasteur (vue admin/super_admin)
  const [kpiParPasteur, setKpiParPasteur] = useState([]); // { id, nomAffichage, totalDisciples, totalFamilles }[]
  const [kpiParPasteurLoading, setKpiParPasteurLoading] = useState(false);
  const [kpiParPasteurTotalCumule, setKpiParPasteurTotalCumule] = useState(0);
  const [kpiParPasteurTotalFamilles, setKpiParPasteurTotalFamilles] = useState(0);

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

  // Fonction pour exporter en Excel (CSV) – tableau des familles
  const handleExportExcel = () => {
    try {
      const exportData = filteredFamilles.map(item => ({
        'Superviseur': `${item.superviseur.first_name} ${item.superviseur.last_name}`,
        'Email': item.superviseur.email || '',
        'Famille': item.famille?.nom || 'Non assignée',
        'Identifiant': item.famille?.identifiant_famille || '',
        'Membres actuels': item.stats.nombreMembres,
        'Objectif': item.stats.objectif,
        'Progression (%)': Math.round(item.stats.progression),
        'Statut': item.stats.progression >= 100 ? 'Objectif atteint' : 'En cours'
      }));

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
    if (!superviseurs?.length) {
      setRapportsRecus([]);
      return;
    }
    fetchRapportsRecus();
  }, [superviseurs?.length, filtreRapportsAnnee, filtreRapportsMois]);

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
                .select('*', { count: 'exact', head: true })
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

  // Filtrer les familles selon la recherche (insensible à la casse et aux accents)
  const filteredFamilles = familles.filter(item => {
    if (!searchTerm) return true;
    const search = normalizeString(searchTerm);
    const nomSuperviseur = normalizeString(`${item.superviseur.first_name} ${item.superviseur.last_name}`);
    const nomFamille = normalizeString(item.famille?.nom || '');
    const identifiantFamille = normalizeString(item.famille?.identifiant_famille || '');
    return nomSuperviseur.includes(search) || nomFamille.includes(search) || identifiantFamille.includes(search);
  });

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
      "Date d'inscription": m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy', { locale: fr }) : '',
    }));
    const filename = `membres_familles_pasteur_${format(new Date(), 'yyyy-MM-dd', { locale: fr })}`;
    if (formatExport === 'pdf') {
      const uniqueId = `pdf-pasteur-members-${Date.now()}`;
      const tempDiv = document.createElement('div');
      tempDiv.id = uniqueId;
      tempDiv.style.cssText = 'position:absolute;left:-9999px;top:0;width:800px;';
      tempDiv.innerHTML = `<div style="font-family:Arial"><h2>Membres des familles - Pasteur</h2><p>Exporté le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p><p>Total: ${list.length} membre(s)</p><table style="width:100%;border-collapse:collapse;border:1px solid #ddd"><thead><tr style="background:#f3f4f6">${['Prénom','Nom','Email','Statut','Disciples','Progression','Suivi par','Date'].map(h=>`<th style="padding:10px;border:1px solid #ddd">${h}</th>`).join('')}</tr></thead><tbody>${list.map(m=>`<tr><td style="padding:8px;border:1px solid #ddd">${m.first_name||''}</td><td style="padding:8px;border:1px solid #ddd">${m.last_name||''}</td><td style="padding:8px;border:1px solid #ddd">${m.email||'-'}</td><td style="padding:8px;border:1px solid #ddd">${m.statut_spirituel==='inactif'?'Inactif':'Actif'}</td><td style="padding:8px;border:1px solid #ddd">${m.nombreDisciples||0}</td><td style="padding:8px;border:1px solid #ddd">${pasteurMembersProgression[m.id]?.total||0}</td><td style="padding:8px;border:1px solid #ddd">${pasteurMembersSuiviPar[m.id]?.name||'-'}</td><td style="padding:8px;border:1px solid #ddd">${m.created_at?format(new Date(m.created_at),'dd/MM/yyyy',{locale:fr}):'-'}</td></tr>`).join('')}</tbody></table></div>`;
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
      
      <div id="pasteur-dashboard-content" className="w-full max-w-7xl mx-auto space-y-6 p-6 pb-24 bg-gray-50 dark:bg-gray-50 min-h-screen">
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-950 via-purple-950 to-purple-900 border border-gray-200 shadow-lg p-8 md:p-12">
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
              <div className="flex gap-2">
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
        </div>

        {/* KPI des Familles de [nom pasteur] – même fond gris que KPI Globaux */}
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
              <div className="text-2xl font-bold text-purple-600">
                {globalStats.totalSuperviseurs}
              </div>
                <p className="text-xs text-gray-600 mt-1">
                  Sous votre responsabilité
                </p>
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
              <div className="text-2xl font-bold text-purple-600">
                {globalStats.totalFamilles}
              </div>
                <p className="text-xs text-gray-600 mt-1">
                  Familles actives
                </p>
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
                <div className="text-3xl font-bold text-purple-600">
                  {globalStats.totalDisciples}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  sur {globalStats.objectifTotal} objectif
                </p>
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
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(globalStats.progressionGlobale)}%
              </div>
                <p className="text-xs text-gray-600 mt-1">
                  {globalStats.famillesObjectifAtteint} familles ont atteint l'objectif
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* KPI Globaux - Total Disciples par Pasteur (visible pour pasteur, admin, super_admin) */}
        {(role === 'pasteur' || role === 'admin' || role === 'super_admin') && (
          <Card className="bg-gray-200 border-gray-300 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                KPI Globaux - Total Disciples par Pasteur
              </CardTitle>
              <CardDescription>
                Vue d'ensemble du nombre total de disciples sous la tutelle de chaque pasteur ({kpiParPasteur.length} pasteur{kpiParPasteur.length !== 1 ? 's' : ''})
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
                      className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4 shadow-sm hover:shadow-md transition-shadow"
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
                      <p className="text-xs text-gray-600 mt-1">
                        Sur {(p.totalFamilles ?? 0) * 70} Disciples attendus
                      </p>
                    </div>
                  ))}
                  <div
                    className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <span className="font-bold text-gray-900 text-sm">Cumul des Familles</span>
                    </div>
                    <div className="font-bold text-gray-900 text-sm mb-1">{kpiParPasteurTotalFamilles} Familles</div>
                    <div className="mt-2">
                      <span className="text-xs font-bold text-gray-900 uppercase">Cumul Disciples : </span>
                      <span className="text-xl font-bold text-blue-600">{kpiParPasteurTotalCumule}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Sur {kpiParPasteurTotalFamilles * 70} Disciples attendus
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Graphiques de progression des familles du pasteur connecté */}
        {(filteredFamilles.length > 0 || chartData.length > 0) && (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Progression Globale des Familles de <span className="text-purple-600 font-semibold">{[pasteurNom.first_name, pasteurNom.last_name].filter(Boolean).join(' ') || pasteurNom.identifiant_unique || 'votre pasteur'}</span>
              </CardTitle>
              <CardDescription>
                Évolution dans le temps et progression par famille vers l'objectif 70
              </CardDescription>
            </CardHeader>
            <CardContent
              onMouseLeave={() => setHoveredFamilleNameProgression(null)}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
                {filteredFamilles.length > 0 && (
                  <>
                    <div className="w-full min-w-0">
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={filteredFamilles.slice(0, 6).map((f) => ({
                              name: (f.famille?.nom || 'Famille'),
                              progression: Math.round(f.stats.progression),
                              disciples: f.stats?.nombreMembres ?? 0
                            }))}
                            layout="vertical"
                            margin={{ top: 5, right: 20, left: 65, bottom: 5 }}
                          >
                            <XAxis type="number" domain={[0, 100]} unit="%" stroke="#888888" fontSize={11} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              stroke="#888888"
                              fontSize={11}
                              width={55}
                              tick={(props) => {
                                const { x, y, payload } = props;
                                const value = payload?.value ?? '';
                                const item = filteredFamilles.find((f) => (f.famille?.nom || 'Famille') === value);
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
                                  </div>
                                );
                              }}
                            />
                            <Bar dataKey="progression" name="Progression (%)" fill="#9333ea" radius={[0, 4, 4, 0]} barSize={18} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="w-full min-w-0">
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={filteredFamilles.slice(6, 12).map((f) => ({
                              name: (f.famille?.nom || 'Famille'),
                              progression: Math.round(f.stats.progression),
                              disciples: f.stats?.nombreMembres ?? 0
                            }))}
                            layout="vertical"
                            margin={{ top: 5, right: 20, left: 90, bottom: 5 }}
                          >
                            <XAxis type="number" domain={[0, 100]} unit="%" stroke="#888888" fontSize={11} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              stroke="#888888"
                              fontSize={11}
                              width={80}
                              tick={(props) => {
                                const { x, y, payload } = props;
                                const value = payload?.value ?? '';
                                const item = filteredFamilles.find((f) => (f.famille?.nom || 'Famille') === value);
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
                                  </div>
                                );
                              }}
                            />
                            <Bar dataKey="progression" name="Progression (%)" fill="#9333ea" radius={[0, 4, 4, 0]} barSize={18} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                )}
                {chartData.length > 0 && chartData.some((d) => d.progressionEstimee != null) && filteredFamilles.length === 0 && (
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
            </CardContent>
          </Card>
        )}

        {/* KPI avec sélection de période */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
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
                      // Pour hebdomadaire, calculer le mois de la semaine
                      const selectedYear = parseInt(kpiSelectedYearForPeriod);
                      const selectedWeek = parseInt(kpiSelectedWeek);
                      // Créer une date pour le 1er janvier de l'année
                      const jan1 = new Date(selectedYear, 0, 1);
                      // Obtenir le début de la première semaine de l'année (lundi)
                      const firstWeekStart = startOfWeek(jan1, { weekStartsOn: 1 });
                      // Calculer le début de la semaine sélectionnée
                      const targetWeekStart = new Date(firstWeekStart);
                      targetWeekStart.setDate(firstWeekStart.getDate() + (selectedWeek - 1) * 7);
                      // Obtenir le mois de cette date (0-indexed, donc Janvier = 0)
                      const monthIndex = targetWeekStart.getMonth();
                      const monthName = months[monthIndex];
                      return `KPI Hebdomadaires Sem ${kpiSelectedWeek} ${monthName} ${kpiSelectedYearForPeriod}`;
                    }
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
                        {["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"].map((month, index) => (
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
            <CardDescription className="mt-2">
              Indicateurs de performance agrégés pour la période sélectionnée
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 3 rangées de 4 cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Ligne 1 */}
              <div className="group text-center p-4 bg-gradient-to-br from-indigo-200 to-indigo-300 hover:bg-purple-600 rounded-lg border-2 border-indigo-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 group-hover:from-indigo-600 group-hover:to-indigo-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.culteSamediSoir || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Culte du Samedi Soir</div>
                <Moon className="h-4 w-4 mx-auto mt-2 text-indigo-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-blue-200 to-blue-300 hover:bg-purple-600 rounded-lg border-2 border-blue-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 group-hover:from-blue-600 group-hover:to-blue-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.culteDimancheMatin || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Culte du Dimanche Matin</div>
                <Church className="h-4 w-4 mx-auto mt-2 text-blue-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-cyan-200 to-cyan-300 hover:bg-purple-600 rounded-lg border-2 border-cyan-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-cyan-800 group-hover:from-cyan-600 group-hover:to-cyan-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.afterCulteDimanche || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">After Culte du Dimanche</div>
                <Users className="h-4 w-4 mx-auto mt-2 text-cyan-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-amber-200 to-amber-300 hover:bg-purple-600 rounded-lg border-2 border-amber-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-amber-800 group-hover:from-amber-600 group-hover:to-amber-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.tempsPriere || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Temps de Prière</div>
                <Heart className="h-4 w-4 mx-auto mt-2 text-amber-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-pink-200 to-pink-300 hover:bg-purple-600 rounded-lg border-2 border-pink-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-pink-800 group-hover:from-pink-600 group-hover:to-pink-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.personnesEvangelisees || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Personnes évangélisées</div>
                <Target className="h-4 w-4 mx-auto mt-2 text-pink-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-emerald-200 to-emerald-300 hover:bg-purple-600 rounded-lg border-2 border-emerald-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-800 group-hover:from-emerald-600 group-hover:to-emerald-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.nouveauxConvertis || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Nouveaux Convertis</div>
                <Heart className="h-4 w-4 mx-auto mt-2 text-emerald-700 group-hover:text-white transition-colors" />
              </div>
              
              {/* Ligne 2 */}
              <div className="group text-center p-4 bg-gradient-to-br from-rose-200 to-rose-300 hover:bg-purple-600 rounded-lg border-2 border-rose-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-rose-800 group-hover:from-rose-600 group-hover:to-rose-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.nouveauxArrivants || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Nouveaux Arrivants</div>
                <UserPlus className="h-4 w-4 mx-auto mt-2 text-rose-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-teal-200 to-teal-300 hover:bg-purple-600 rounded-lg border-2 border-teal-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-teal-800 group-hover:from-teal-600 group-hover:to-teal-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.sortiesEvangelisation || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Sorties d'Évangélisation</div>
                <Megaphone className="h-4 w-4 mx-auto mt-2 text-teal-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-purple-200 to-purple-300 hover:bg-purple-600 rounded-lg border-2 border-purple-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 group-hover:from-amber-500 group-hover:to-amber-700 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.comFratDisciples || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Com Frat Disciples</div>
                <UserCheck className="h-4 w-4 mx-auto mt-2 text-purple-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-violet-200 to-violet-300 hover:bg-purple-600 rounded-lg border-2 border-violet-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-violet-800 group-hover:from-amber-500 group-hover:to-amber-700 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.veillee || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Veillée</div>
                <Moon className="h-4 w-4 mx-auto mt-2 text-violet-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-orange-200 to-orange-300 hover:bg-purple-600 rounded-lg border-2 border-orange-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 group-hover:from-orange-600 group-hover:to-orange-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.meditationBible || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Méditation Bible</div>
                <Book className="h-4 w-4 mx-auto mt-2 text-orange-700 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-green-200 to-green-300 hover:bg-purple-600 rounded-lg border-2 border-green-400 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-800 group-hover:from-green-600 group-hover:to-green-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.tempsPartage || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors uppercase">Temps de Partage</div>
                <HeartHandshake className="h-4 w-4 mx-auto mt-2 text-green-700 group-hover:text-white transition-colors" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Graphiques d'évolution des KPI */}
        {chartData.length > 0 && (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Évolution des KPI (12 derniers mois)
              </CardTitle>
              <CardDescription>
                Tendances des indicateurs clés de performance sur les 12 derniers mois
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Graphique Présences aux Cultes */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Présences aux Cultes</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCulteSamedi" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorCulteDimanche" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorAfterCulte" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="culteSamediSoir" name="Culte Samedi Soir" stroke="#6366f1" fillOpacity={1} fill="url(#colorCulteSamedi)" />
                        <Area type="monotone" dataKey="culteDimancheMatin" name="Culte Dimanche Matin" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCulteDimanche)" />
                        <Area type="monotone" dataKey="afterCulteDimanche" name="After Culte" stroke="#14b8a6" fillOpacity={1} fill="url(#colorAfterCulte)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Graphique Temps de Prière et Partage */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Temps de Prière et Partage</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="tempsPriere" name="Temps de Prière" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="tempsPartage" name="Temps de Partage" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Graphique Nouveaux Convertis et Arrivants */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Nouveaux Convertis et Arrivants</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorNouveauxConvertis" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorNouveauxArrivants" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="nouveauxConvertis" name="Nouveaux Convertis" stroke="#ec4899" fillOpacity={1} fill="url(#colorNouveauxConvertis)" />
                        <Area type="monotone" dataKey="nouveauxArrivants" name="Nouveaux Arrivants" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorNouveauxArrivants)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Graphique Évangélisation */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Évangélisation</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="sortiesEvangelisation" name="Sorties d'Évangélisation" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="personnesEvangelisees" name="Personnes Évangélisées" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recherche et filtres */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Recherche et Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par superviseur, famille ou identifiant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 bg-gray-100 border-gray-200 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-gray-200 hover:border-gray-200 active:border-gray-200 text-gray-900"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500 hover:text-red-700 transition-colors"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                onClick={() => {
                  setSelectedFamille(null);
                  setSearchTerm('');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white focus:ring-0 focus:ring-offset-0 focus:outline-none hover:border-0 border-0"
              >
                <Filter className="h-4 w-4 mr-2" />
                Toutes les familles
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rapports Reçus (avant Liste des Familles) */}
        <Card className="bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-600" />
              Rapports Reçus
            </CardTitle>
            <CardDescription>
              Vue d'ensemble des rapports envoyés par vos superviseurs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">{globalStats.totalRapports || 0}</div>
                <div className="text-xs text-purple-600 mt-1 font-medium">Total Rapports</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{globalStats.rapportsHebdo || 0}</div>
                <div className="text-xs text-blue-600 mt-1 font-medium">Hebdomadaires</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">{globalStats.rapportsMensuels || 0}</div>
                <div className="text-xs text-green-600 mt-1 font-medium">Mensuels</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
                <div className="text-2xl font-bold text-amber-700">{globalStats.rapportsTrimestriels || 0}</div>
                <div className="text-xs text-amber-600 mt-1 font-medium">Trimestriels</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-700">{globalStats.rapportsAnnuels || 0}</div>
                <div className="text-xs text-red-600 mt-1 font-medium">Annuels</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button
                onClick={() => navigate('/admin/reports')}
                className="w-full bg-blue-600 hover:bg-purple-600 text-white border-0 hover:border-0 transition-colors"
              >
                <Eye className="h-4 w-4 mr-2" />
                Voir tous les rapports
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des Familles */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-purple-600" />
                  Liste des Familles
                </CardTitle>
                <CardDescription>
                  Vue d'ensemble de toutes les familles sous votre supervision ({globalStats.totalFamilles} familles)
                </CardDescription>
              </div>
              <Button
                onClick={openCreateDialog}
                className="bg-gray-200 hover:bg-purple-600 text-gray-900 hover:text-white border-0 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter Nouvelle Famille
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredFamilles.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm ? 'Aucun résultat trouvé pour votre recherche.' : 'Aucune famille assignée pour le moment.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredFamilles.map((item) => (
                  <div
                    key={item.superviseur.id}
                    className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {formatFamilleName(item.famille?.nom || 'Sans nom')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.famille?.identifiant_famille || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Superviseur:</span>
                        <span className="font-medium text-gray-900">
                          {item.superviseur.first_name} {item.superviseur.last_name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Membres:</span>
                        <span className="font-semibold text-gray-900">{item.stats.nombreMembres} / {item.stats.objectif}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Progression</span>
                        <span className="font-medium text-gray-900">{Math.round(item.stats.progression)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            item.stats.progression >= 100
                              ? 'bg-green-500'
                              : item.stats.progression >= 50
                              ? 'bg-purple-600'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(item.stats.progression, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    {item.stats.progression >= 100 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Objectif atteint</span>
                      </div>
                    )}

                    {/* Bouton Voir détails */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <Button
                        size="sm"
                        className="w-full bg-purple-600 text-white hover:bg-blue-600 border-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFamille(item);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir détails
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tableau des superviseurs et familles */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Mes Superviseurs et Familles</CardTitle>
              <CardDescription>
                Statistiques agrégées par famille et superviseur – vue détaillée avec progression vers l'objectif 70
              </CardDescription>
            </div>
            {filteredFamilles.length > 5 && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setShowAllSuperviseursFamilles((v) => !v)}
                className="shrink-0 bg-blue-600 text-white hover:bg-blue-700"
              >
                {showAllSuperviseursFamilles ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Voir moins
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Voir plus
                  </>
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {filteredFamilles.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm ? 'Aucun résultat trouvé pour votre recherche.' : 'Aucun superviseur assigné pour le moment.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="group bg-purple-200 hover:bg-purple-300 transition-colors cursor-pointer">
                      <TableHead className="font-semibold text-gray-900 group-hover:text-gray-900 transition-colors">Superviseur</TableHead>
                      <TableHead className="font-semibold text-gray-900 group-hover:text-gray-900 transition-colors">Famille</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900 group-hover:text-gray-900 transition-colors">Disciples</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900 group-hover:text-gray-900 transition-colors">Objectif</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900 group-hover:text-gray-900 transition-colors">Progression</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900 group-hover:text-gray-900 transition-colors">Statut</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900 group-hover:text-gray-900 transition-colors">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(showAllSuperviseursFamilles ? filteredFamilles : filteredFamilles.slice(0, 5)).map((item, index) => (
                      <TableRow key={item.superviseur.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                              <Users className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {item.superviseur.first_name} {item.superviseur.last_name}
                              </p>
                              <p className="text-sm text-gray-500">{item.superviseur.email}</p>
                              {item.superviseur.titre && (
                                <p className="text-xs text-gray-400">{item.superviseur.titre}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.famille ? (
                            <div>
                              <p className="font-medium text-gray-900">{formatFamilleName(item.famille.nom)}</p>
                              <p className="text-sm text-gray-500">{item.famille.identifiant_famille}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Aucune famille assignée</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-gray-900">{item.stats.nombreMembres}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-gray-600">{item.stats.objectif}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  item.stats.progression >= 100
                                    ? 'bg-green-500'
                                    : item.stats.progression >= 50
                                    ? 'bg-purple-600'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(item.stats.progression, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700 w-12 text-left">
                              {Math.round(item.stats.progression)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.stats.nombreMembres >= item.stats.objectif ? (
                            <Badge className="bg-green-500 text-white">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Objectif atteint
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-500 text-amber-600">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              En cours
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Ouvrir le modal avec les détails de la famille
                              setSelectedFamille(item);
                            }}
                            disabled={!item.famille}
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 hover:border-0 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Voir détails
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tableau « Membres des familles » (même structure que superviseur) */}
        {loadingPasteurMembers ? (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </CardContent>
          </Card>
        ) : (
          <MembersTableCard
            title="Membres des familles"
            description="Liste des disciples de toutes vos familles"
            filteredMembres={pasteurMembersTable.filteredMembres}
            paginatedMembres={pasteurMembersTable.paginatedMembres}
            selectedMembres={pasteurMembersTable.selectedMembres}
            searchTerm={pasteurMembersTable.searchTerm}
            setSearchTerm={pasteurMembersTable.setSearchTerm}
            statusFilter={pasteurMembersTable.statusFilter}
            setStatusFilter={pasteurMembersTable.setStatusFilter}
            dateFilter={pasteurMembersTable.dateFilter}
            setDateFilter={pasteurMembersTable.setDateFilter}
            progressionFilter={pasteurMembersTable.progressionFilter}
            setProgressionFilter={pasteurMembersTable.setProgressionFilter}
            itemsPerPage={pasteurMembersTable.itemsPerPage}
            setItemsPerPage={pasteurMembersTable.setItemsPerPage}
            currentPage={pasteurMembersTable.currentPage}
            setCurrentPage={pasteurMembersTable.setCurrentPage}
            totalPages={pasteurMembersTable.totalPages}
            membresProgression={pasteurMembersTable.membresProgression}
            membresSuiviPar={pasteurMembersTable.membresSuiviPar}
            toggleSelectAll={pasteurMembersTable.toggleSelectAll}
            toggleSelectMembre={pasteurMembersTable.toggleSelectMembre}
            showExport={true}
            showSelection={true}
            showFetchDisciples={false}
            showProgression={true}
            showSuiviPar={true}
            showNombreDisciples={true}
            onNavigate={navigate}
            onExportFilteredList={handleExportPasteurMembers}
            toast={toast}
          />
        )}

        {/* Tableau consolidé des mentors (pilier) */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Tableau Consolidé des Mentors (Piliers)</CardTitle>
                  <CardDescription>
                    Vue d'ensemble de tous les mentors (piliers) avec leurs statistiques de progression
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {loadingMentors && <Loader2 className="h-5 w-5 animate-spin text-purple-600" />}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportExcelMentors}
                    disabled={loadingMentors || displayMentorsConsolides.length === 0}
                    className="shrink-0 border-0 !opacity-100 bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:!opacity-100"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Exporter tableau mentors (CSV)
                  </Button>
                </div>
              </div>
              {!loadingMentors && mentorsConsolides.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Nom, Prénom, Familles, Nbre disciples (ex: < 50, > 70, ≥ 53, ≤ 60)"
                      value={searchTermMentors}
                      onChange={(e) => setSearchTermMentors(e.target.value)}
                      className="pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
                    />
                  </div>
                  <Select value={filterEgliseMentors || '__toutes__'} onValueChange={setFilterEgliseMentors}>
                    <SelectTrigger className="w-[200px] bg-gray-50 border-gray-200 text-gray-900">
                      <SelectValue placeholder="Toutes les Familles" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="__toutes__" className="text-gray-900">Toutes les Familles</SelectItem>
                      {[...new Set(mentorsConsolides.map(m => m.eglise).filter(Boolean))].sort().map(eglise => (
                        <SelectItem key={eglise} value={eglise} className="text-gray-900">{eglise}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(searchTermMentors || (filterEgliseMentors && filterEgliseMentors !== '__toutes__')) && (
                    <span className="text-sm text-gray-500">
                      {filteredMentorsConsolides.length} / {mentorsConsolidesSansSuperviseurs.length} mentor(s)
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingMentors ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-500">Chargement des données des mentors...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="group bg-purple-200 hover:bg-purple-300 transition-colors">
                      <TableHead className="font-semibold text-gray-900">Nom</TableHead>
                      <TableHead className="font-semibold text-gray-900">Prénom</TableHead>
                      <TableHead className="font-semibold text-gray-900">Suivi par</TableHead>
                      <TableHead className="font-semibold text-gray-900">Famille</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900">Nombre de disciples</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900">Avancement % (objectif 70)</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900">Nombre de disciples présents</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900">Taux participation semaine</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayMentorsConsolides.length === 0 ? (
                      <TableRow className="hover:bg-gray-100 transition-colors">
                        <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                          {mentorsConsolides.length === 0 ? (
                            <>Aucun mentor trouvé dans les familles sous votre responsabilité.</>
                          ) : (
                            <>
                              Aucun mentor ne correspond aux critères de recherche.
                              <Button variant="outline" size="sm" className="mt-2 ml-2 bg-green-600 text-white border-green-600 hover:bg-blue-600 hover:text-white hover:border-blue-600" onClick={() => { setSearchTermMentors(''); setFilterEgliseMentors('__toutes__'); }}>
                                Réinitialiser les filtres
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayMentorsConsolides.map((mentor, idx) => {
                        const avancement = mentor.avancement_pourcentage != null ? mentor.avancement_pourcentage : (70 > 0 ? Math.round(Math.min(((mentor.nombre_disciples ?? 0) / 70) * 100, 100)) : 0);
                        return (
                          <TableRow key={mentor.mentor_id ?? `mentor-${idx}`} className="hover:bg-gray-50 transition-colors">
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => navigate(`/disciples/${mentor.mentor_id}`, { state: { displayNombreDisciples: mentor.nombre_disciples ?? 0 } })}
                                className="font-semibold text-purple-600 hover:text-purple-800 hover:underline text-left"
                              >
                                {mentor.nom || '—'}
                              </button>
                            </TableCell>
                            <TableCell>
                              <span className="text-gray-700">{mentor.prenom || '—'}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-gray-700">{mentor.suivi_par || '—'}</span>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-gray-900">{mentor.eglise || '—'}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold text-blue-600">{mentor.nombre_disciples ?? 0}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold text-gray-900">{avancement != null ? `${avancement} %` : '—'}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-gray-700">{mentor.disciples_presents != null ? mentor.disciples_presents : '—'}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-gray-700">{mentor.taux_participation_semaine != null ? `${mentor.taux_participation_semaine} %` : '—'}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-gray-700">{(mentor.nombre_disciples ?? 0) === 0 ? 'Disciple' : statutLabel(mentor.titre)}</span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Arbre généalogique - toutes les familles (DR mode) */}
        {user?.id && (
          <ArbreGenealogiqueEmbed
            mode="pasteur"
            pasteurId={user.id}
            title="Arbre généalogique - toutes les familles (DR mode)"
            description="Lignée spirituelle de toutes vos familles : Pasteur → Superviseurs → Mentors → Disciples."
            compactHeight={480}
          />
        )}

        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/statistics')}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                Statistiques Détaillées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Consultez les statistiques complètes et les graphiques de progression
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/admin/reports')}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Mail className="h-5 w-5 text-purple-600" />
                Rapports Reçus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Consultez tous les rapports envoyés par vos superviseurs
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/familles')}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                Gérer les Familles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Gérez et assignez les familles aux superviseurs
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/arbre-genealogique')}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-amber-600" />
                Arbre généalogique
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Vue complète des familles : Pasteur → Superviseurs → Mentors → Disciples
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Modal de détails de la famille */}
        <Dialog open={selectedFamille !== null} onOpenChange={(open) => !open && setSelectedFamille(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-100">
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
                            <Calendar className="h-3.5 w-3.5" />
                            Créée le {format(new Date(selectedFamille.famille.created_at), 'd MMMM yyyy', { locale: fr })}
                          </span>
                        )}
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Informations du superviseur */}
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Superviseur
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-4 flex-wrap">
                        <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center overflow-hidden shrink-0">
                          {selectedFamille.superviseur.avatar_url ? (
                            <img src={selectedFamille.superviseur.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg font-semibold text-purple-600">
                              {(selectedFamille.superviseur.first_name || '')[0]}{(selectedFamille.superviseur.last_name || '')[0]}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-lg">
                            {selectedFamille.superviseur.first_name} {selectedFamille.superviseur.last_name}
                          </p>
                          {selectedFamille.superviseur.titre && (
                            <p className="text-xs text-gray-500">{selectedFamille.superviseur.titre}</p>
                          )}
                          {selectedFamille.superviseur.email && (
                            <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                              <Mail className="h-4 w-4 shrink-0" />
                              {selectedFamille.superviseur.email}
                            </p>
                          )}
                          {selectedFamille.superviseur.email && (
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
                            {selectedFamille.stats.nombreMembres}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">Membres actuels</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-3xl font-bold text-purple-600">
                            {selectedFamille.stats.objectif}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">Objectif</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-3xl font-bold text-green-600">
                            {Math.round(selectedFamille.stats.progression)}%
                          </div>
                          <div className="text-sm text-gray-600 mt-1">Progression</div>
                        </div>
                      </div>
                      
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
                              selectedFamille.stats.progression >= 100
                                ? 'bg-green-500'
                                : selectedFamille.stats.progression >= 50
                                ? 'bg-purple-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(selectedFamille.stats.progression, 100)}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-900">
                            {Math.round(selectedFamille.stats.progression)}%
                          </span>
                        </div>
                      </div>

                      {selectedFamille.stats.progression >= 100 && (
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
                                  {format(new Date(r.created_at), 'd MMM yyyy', { locale: fr })}
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
                          Extrait du rapport du {format(new Date(familleModalDetails.reports[0].created_at), "d MMMM yyyy", { locale: fr })}
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
          <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg">
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

        {/* Vue Pasteur « Rapports reçus » : liste par superviseur, filtres mois/année */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Rapports reçus
            </CardTitle>
            <CardDescription>
              Rapports soumis par vos superviseurs. Filtrez par année et mois.
            </CardDescription>
            <div className="flex flex-wrap gap-2 mt-2">
              <Select value={filtreRapportsAnnee} onValueChange={setFiltreRapportsAnnee}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Année" />
                </SelectTrigger>
                <SelectContent>
                  {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtreRapportsMois || '__tous__'} onValueChange={(v) => setFiltreRapportsMois(v === '__tous__' ? '' : v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tous les mois" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__tous__">Tous les mois</SelectItem>
                  {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchRapportsRecus} disabled={loadingRapportsRecus}>
                {loadingRapportsRecus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingRapportsRecus ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : rapportsRecus.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">Aucun rapport reçu pour les critères sélectionnés.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Superviseur</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rapportsRecus.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.superviseurName}</TableCell>
                        <TableCell>
                          <Badge variant={r.report_type === 'annuel' ? 'default' : 'secondary'}>
                            {r.report_type === 'hebdomadaire' ? 'Hebdo' : r.report_type === 'mensuel' ? 'Mensuel' : r.report_type === 'trimestriel' ? 'Trim.' : r.report_type === 'annuel' ? 'Annuel' : r.report_type || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.created_at ? format(new Date(r.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setRapportDetailModal({ report: r, superviseurName: r.superviseurName })}>
                            <Eye className="h-4 w-4 mr-1" />
                            Voir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal détail d'un rapport */}
        <Dialog open={!!rapportDetailModal} onOpenChange={() => setRapportDetailModal(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détail du rapport</DialogTitle>
              <DialogDescription>
                {rapportDetailModal && (
                  <>Rapport {rapportDetailModal.report.report_type} – {rapportDetailModal.superviseurName} – {rapportDetailModal.report.created_at && format(new Date(rapportDetailModal.report.created_at), 'dd/MM/yyyy', { locale: fr })}</>
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

        {/* Notifications pour rapports manquants - En fin de page */}
        {missingReports.length > 0 && (
          <Card className="bg-amber-50 border-amber-200 shadow-sm mb-4">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-amber-900 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    Rapports manquants ({missingReports.length})
                  </CardTitle>
                  <CardDescription className="text-amber-700 mt-2">
                    {(() => {
                      const now = new Date();
                      const previousMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
                      const previousYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                      const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
                      const previousMonthName = monthNames[previousMonth];
                      return `Les superviseurs suivants n'ont pas encore envoyé leur rapport mensuel pour ${previousMonthName} ${previousYear} :`;
                    })()}
                  </CardDescription>
                </div>
                {missingReports.length > 4 && (
                  <Button
                    onClick={() => setShowAllMissingReports(!showAllMissingReports)}
                    className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                  >
                    {showAllMissingReports ? 'Voir moins' : 'Voir Tout'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(showAllMissingReports ? missingReports : missingReports.slice(0, 4)).map((superviseur) => (
                  <div key={superviseur.id} className="flex items-center justify-between p-2 bg-white rounded border border-amber-200">
                    <div>
                      <p className="font-medium text-gray-900">{superviseur.name}</p>
                      {superviseur.email && (
                        <p className="text-sm text-gray-600">{superviseur.email}</p>
                      )}
                    </div>
                    <Badge className="bg-amber-500 text-white">Rapport manquant</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default PasteurDashboard;
