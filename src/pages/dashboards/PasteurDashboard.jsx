import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Target, TrendingUp, UserCheck, Activity, 
  Church, ChevronRight, Loader2, Search, Filter, Eye, BarChart3,
  Mail, Phone, ArrowLeft, Building2, CheckCircle2, AlertCircle, Calendar,
  Moon, Heart, HeartHandshake, UserPlus, Megaphone, Book, Plus, X, Download, FileText
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
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { exportElementToPDF, exportToExcel } from '@/lib/ExportUtils';
import { getOrSetCache, clearCache } from '@/lib/CacheUtils';
import { motion } from 'framer-motion';
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
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const PasteurDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pasteurNom, setPasteurNom] = useState({ first_name: '', last_name: '', identifiant_unique: '' });
  const [superviseurs, setSuperviseurs] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [mentorsConsolides, setMentorsConsolides] = useState([]); // Tableau consolidé des mentors
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermMentors, setSearchTermMentors] = useState(''); // Recherche spécifique pour les mentors
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

  // Statistiques par pasteur
  const [pasteursStats, setPasteursStats] = useState([]);
  const [totalCumuleDisciples, setTotalCumuleDisciples] = useState(0);
  const [loadingPasteursStats, setLoadingPasteursStats] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPasteurData();
      checkMissingReports();
      // Appeler fetchAllPasteursStats indépendamment pour éviter les dépendances
      fetchAllPasteursStats();
    }
  }, [user, kpiPeriodType, kpiSelectedYear, kpiSelectedQuarter, kpiSelectedMonth, kpiSelectedWeek, kpiSelectedYearForPeriod]);

  // Appeler fetchAllPasteursStats aussi au montage du composant
  useEffect(() => {
    if (user && !loading) {
      console.log('🔄 Appel fetchAllPasteursStats depuis useEffect dédié');
      fetchAllPasteursStats();
    }
  }, [user, loading]);

  // Charger les mentors consolidés après le chargement des familles
  useEffect(() => {
    if (familles.length > 0 && user) {
      fetchMentorsConsolides();
    }
  }, [familles, user]);

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
            console.error('Erreur lors de la récupération des superviseurs:', error);
            throw error;
          }
          return data || [];
        },
        2 * 60 * 1000 // 2 minutes
      );

      const superviseursError = null; // Pas d'erreur si le cache fonctionne

      // Ne pas essayer de récupérer 'titre' car la colonne n'existe pas
      let superviseursFinal = superviseursData || [];
      
      if (!superviseursFinal || superviseursFinal.length === 0) {
        console.log('Aucun superviseur trouvé via pasteur_id, tentative via familles...');
        
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
              superviseursFinal = superviseursViaFamilles.filter(s => s.pasteur_id === user.id);
              
              console.log('Superviseurs trouvés via familles et filtrés par pasteur_id:', superviseursFinal.length);
            }
          }
        }
      }

      console.log('Total superviseurs récupérés pour pasteur', user.id, ':', superviseursFinal?.length || 0);
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
            console.error(`Erreur famille pour superviseur ${superviseur.id}:`, familleError);
            // Ne pas retourner null, continuer avec famille: null
          }

          // Prendre la première famille si plusieurs existent
          const familleData = famillesData && famillesData.length > 0 ? famillesData[0] : null;

          if (!familleData) {
            console.warn(`⚠️ Superviseur ${superviseur.first_name} ${superviseur.last_name} (${superviseur.id}) n'a pas de famille assignée`);
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

          // Compter les disciples de la famille
          const { count: nombreDisciples, error: countError } = await supabase
            .from('profils')
            .select('*', { count: 'exact', head: true })
            .eq('famille_id', familleData.id)
            .eq('role', 'disciple');

          if (countError) {
            console.error(`Erreur comptage disciples pour famille ${familleData.id}:`, countError);
          }

          const nombreMembres = nombreDisciples || familleData.nombre_disciples_actuels || 0;
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
      const famillesValides = famillesAvecStats.filter(f => f !== null);
      setFamilles(famillesValides);

      // Identifier les superviseurs sans famille
      const superviseursSansFamille = famillesValides.filter(f => f.famille === null);
      if (superviseursSansFamille.length > 0) {
        console.warn('⚠️ Superviseurs sans famille:', superviseursSansFamille.map(s => `${s.superviseur.first_name} ${s.superviseur.last_name} (${s.superviseur.id})`));
      }

      // 4. Calculer les statistiques globales
      // Utiliser directement la longueur de superviseursFinal pour le nombre de superviseurs
      const totalSuperviseurs = superviseursFinal?.length || 0;
      console.log('Total superviseurs calculé:', totalSuperviseurs, 'sur', superviseursFinal?.length || 0);
      // Le nombre de familles devrait correspondre au nombre de superviseurs (chaque superviseur a une famille)
      const totalFamilles = famillesValides.filter(f => f.famille !== null).length;
      console.log('Total familles trouvées:', totalFamilles, 'sur', totalSuperviseurs, 'superviseurs');
      
      // Si le nombre de familles ne correspond pas, afficher un avertissement
      if (totalFamilles < totalSuperviseurs) {
        console.warn(`⚠️ ATTENTION: ${totalSuperviseurs - totalFamilles} superviseur(s) n'ont pas de famille assignée`);
      }
      const totalDisciples = famillesValides.reduce((sum, f) => sum + f.stats.nombreMembres, 0);
      const objectifTotal = famillesValides.reduce((sum, f) => sum + f.stats.objectif, 0);
      const progressionGlobale = objectifTotal > 0 ? (totalDisciples / objectifTotal) * 100 : 0;
      const famillesObjectifAtteint = famillesValides.filter(f => f.stats.nombreMembres >= f.stats.objectif).length;

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
          await generateChartData(rapportsData || []);
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
      console.error('Erreur lors du chargement des données pasteur:', error);
    } finally {
      setLoading(false);
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
      console.error('Erreur lors du chargement des superviseurs:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la liste des superviseurs',
        variant: 'destructive',
      });
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
      console.error('Erreur lors de la création de la famille:', error);
      toast({
        title: 'Erreur',
        description: "Impossible de créer la famille. Vérifiez que l'identifiant est unique.",
        variant: 'destructive',
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // État pour les données des graphiques d'évolution
  const [chartData, setChartData] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [missingReports, setMissingReports] = useState([]);
  const [showAllMissingReports, setShowAllMissingReports] = useState(false);

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
  };

  // Fonction pour exporter en PDF
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `dashboard_pasteur_${timestamp}.pdf`;
      await exportElementToPDF('pasteur-dashboard-content', filename);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  // Fonction pour exporter en Excel (CSV)
  const handleExportExcel = () => {
    try {
      // Préparer les données pour l'export
      const exportData = familles.map(item => ({
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
        return;
      }

      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `dashboard_pasteur_${timestamp}`;
      exportToExcel(exportData, filename);
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
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
      console.error('Erreur lors de la vérification des rapports manquants:', error);
    }
  };

  // Fonction pour récupérer les statistiques de tous les pasteurs
  const fetchAllPasteursStats = async () => {
    try {
      setLoadingPasteursStats(true);
      console.log('🔍 Début récupération stats pasteurs...');
      const cacheKey = 'all_pasteurs_stats';
      
      const statsData = await getOrSetCache(
        cacheKey,
        async () => {
          // Récupérer tous les pasteurs
          const { data: pasteursData, error: pasteursError } = await supabase
            .from('profils')
            .select('id, first_name, last_name, email')
            .eq('role', 'pasteur')
            .order('first_name', { ascending: true });

          if (pasteursError) {
            console.error('❌ Erreur récupération pasteurs:', pasteursError);
            throw pasteursError;
          }
          
          console.log('📊 Pasteurs trouvés:', pasteursData?.length || 0, pasteursData);
          
          if (!pasteursData || pasteursData.length === 0) {
            console.warn('⚠️ Aucun pasteur trouvé dans la base de données');
            return [];
          }

          // Pour chaque pasteur, calculer le total de disciples sous sa tutelle
          const pasteursAvecStats = await Promise.all(
            pasteursData.map(async (pasteur) => {
              console.log(`🔍 Traitement pasteur: ${pasteur.first_name} ${pasteur.last_name} (${pasteur.id})`);
              
              // 1. Récupérer tous les superviseurs sous sa responsabilité
              const { data: superviseursData, error: superviseursError } = await supabase
                .from('profils')
                .select('id, first_name, last_name')
                .eq('pasteur_id', pasteur.id)
                .eq('role', 'superviseur');

              if (superviseursError) {
                console.error(`❌ Erreur récupération superviseurs pour pasteur ${pasteur.id}:`, superviseursError);
              }

              const superviseurIds = superviseursData?.map(s => s.id) || [];
              console.log(`  📋 Superviseurs trouvés: ${superviseurIds.length}`, superviseursData?.map(s => `${s.first_name} ${s.last_name}`));

              if (superviseurIds.length === 0) {
                console.log(`  ⚠️ Aucun superviseur pour pasteur ${pasteur.first_name} ${pasteur.last_name}`);
                return {
                  pasteur_id: pasteur.id,
                  prenom: pasteur.first_name || '',
                  nom: pasteur.last_name || '',
                  email: pasteur.email || '',
                  total_disciples: 0
                };
              }

              // 2. Récupérer toutes les familles de ces superviseurs
              const { data: famillesData, error: famillesError } = await supabase
                .from('familles_disciples')
                .select('id, nom, superviseur_id')
                .in('superviseur_id', superviseurIds);

              if (famillesError) {
                console.error(`❌ Erreur récupération familles pour pasteur ${pasteur.id}:`, famillesError);
              }

              const familleIds = famillesData?.map(f => f.id) || [];
              console.log(`  🏠 Familles trouvées: ${familleIds.length}`, famillesData?.map(f => f.nom));

              if (familleIds.length === 0) {
                console.log(`  ⚠️ Aucune famille pour pasteur ${pasteur.first_name} ${pasteur.last_name}`);
                return {
                  pasteur_id: pasteur.id,
                  prenom: pasteur.first_name || '',
                  nom: pasteur.last_name || '',
                  email: pasteur.email || '',
                  total_disciples: 0
                };
              }

              // 3. Compter tous les membres de ces familles (disciples + superviseurs)
              // Compter les disciples
              const { count: countDisciples, error: countDisciplesError } = await supabase
                .from('profils')
                .select('*', { count: 'exact', head: true })
                .in('famille_id', familleIds)
                .eq('role', 'disciple');

              if (countDisciplesError) {
                console.error(`❌ Erreur comptage disciples pour pasteur ${pasteur.id}:`, countDisciplesError);
              } else {
                console.log(`  👥 Disciples comptés: ${countDisciples || 0}`);
              }

              // Compter les superviseurs de ces familles (ils ont aussi un famille_id)
              const { count: countSuperviseurs, error: countSuperviseursError } = await supabase
                .from('profils')
                .select('*', { count: 'exact', head: true })
                .in('famille_id', familleIds)
                .eq('role', 'superviseur')
                .in('id', superviseurIds); // S'assurer que ce sont bien les superviseurs de ce pasteur

              if (countSuperviseursError) {
                console.error(`❌ Erreur comptage superviseurs pour pasteur ${pasteur.id}:`, countSuperviseursError);
              } else {
                console.log(`  👤 Superviseurs comptés: ${countSuperviseurs || 0}`);
              }

              const totalMembres = (countDisciples || 0) + (countSuperviseurs || 0);
              
              console.log(`  ✅ Pasteur ${pasteur.first_name} ${pasteur.last_name}: ${countDisciples || 0} disciples + ${countSuperviseurs || 0} superviseurs = ${totalMembres} membres`);

              return {
                pasteur_id: pasteur.id,
                prenom: pasteur.first_name || '',
                nom: pasteur.last_name || '',
                email: pasteur.email || '',
                total_disciples: totalMembres
              };
            })
          );

          return pasteursAvecStats;
        },
        2 * 60 * 1000 // Cache 2 minutes
      );

      console.log('✅ Stats pasteurs récupérées:', statsData?.length || 0, statsData);
      setPasteursStats(statsData || []);
      
      // Calculer le total cumulé
      const totalCumule = (statsData || []).reduce((sum, p) => sum + (p.total_disciples || 0), 0);
      console.log('📈 Total cumulé disciples:', totalCumule);
      setTotalCumuleDisciples(totalCumule);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des stats des pasteurs:', error);
      setPasteursStats([]);
      setTotalCumuleDisciples(0);
    } finally {
      setLoadingPasteursStats(false);
      console.log('✅ Chargement stats pasteurs terminé');
    }
  };

  // Fonction pour récupérer les mentors consolidés avec leurs stats
  const fetchMentorsConsolides = async () => {
    try {
      setLoadingMentors(true);
      const cacheKeyBase = `pasteur_${user.id}_mentors_consolides`;
      
      const mentorsData = await getOrSetCache(
        cacheKeyBase,
        async () => {
          // Récupérer tous les mentors (role='mentor' ou is_approved_as_disciple_maker=true) des familles sous la responsabilité du pasteur
          const familleIds = familles.filter(f => f.famille?.id).map(f => f.famille.id);
          
          if (familleIds.length === 0) return [];

          // Récupérer tous les profils avec role='mentor' ou is_approved_as_disciple_maker=true qui appartiennent aux familles
          const { data: mentorsProfils, error: mentorsError } = await supabase
            .from('profils')
            .select('id, first_name, last_name, famille_id')
            .in('famille_id', familleIds)
            .or('role.eq.mentor,is_approved_as_disciple_maker.eq.true');

          if (mentorsError) throw mentorsError;

          if (!mentorsProfils || mentorsProfils.length === 0) return [];

          // Pour chaque mentor, calculer les stats
          const mentorsAvecStats = await Promise.all(
            mentorsProfils.map(async (mentor) => {
              // 1. Récupérer le nom de la famille (église)
              const famille = familles.find(f => f.famille?.id === mentor.famille_id);
              const nomEglise = famille?.famille?.nom || 'N/A';

              // 2. Compter le nombre de disciples (depuis cercle_personnes où user_id = mentor.id)
              const { count: nombreDisciples, error: countError } = await supabase
                .from('cercle_personnes')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', mentor.id);

              if (countError) console.error(`Erreur comptage disciples pour mentor ${mentor.id}:`, countError);
              const nombreDisciplesTotal = nombreDisciples || 0;

              // 3. Calculer l'avancement % (nombreDisciples / 70 * 100)
              const objectif = 70;
              const avancementPourcentage = Math.min((nombreDisciplesTotal / objectif) * 100, 100);

              // 4. Récupérer les IDs des disciples pour calculer les présences
              const { data: disciplesData } = await supabase
                .from('cercle_personnes')
                .select('id')
                .eq('user_id', mentor.id);

              const discipleIds = disciplesData?.map(d => d.id) || [];

              // 5. Compter les disciples présents à l'église (depuis attendance_tracking)
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

              // 6. Calculer le taux de participation de la semaine en cours
              const now = new Date();
              const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 }); // Lundi
              const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 }); // Dimanche
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
                nom: mentor.last_name || '',
                prenom: mentor.first_name || '',
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
      console.error('Erreur lors de la récupération des mentors consolidés:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les données des mentors.',
      });
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

  // Filtrer les mentors consolidés selon la recherche (insensible à la casse et aux accents)
  const filteredMentors = mentorsConsolides.filter(mentor => {
    if (!searchTermMentors) return true;
    const search = normalizeString(searchTermMentors);
    const nomMentor = normalizeString(`${mentor.prenom} ${mentor.nom}`);
    const nomEglise = normalizeString(mentor.eglise || '');
    return nomMentor.includes(search) || nomEglise.includes(search);
  });

  // Fonction pour exporter le tableau consolidé des mentors en Excel (CSV)
  const handleExportMentorsExcel = () => {
    try {
      const exportData = filteredMentors.map(mentor => ({
        Nom: mentor.nom || '',
        Prénom: mentor.prenom || '',
        Église: mentor.eglise || 'N/A',
        'Nombre de Disciples': mentor.nombre_disciples || 0,
        'Avancement (%)': mentor.avancement_pourcentage || 0,
        'Disciples Présents': mentor.disciples_presents || 0,
        'Taux Participation Semaine (%)': mentor.taux_participation_semaine || 0
      }));

      if (exportData.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Aucune donnée',
          description: 'Aucune donnée à exporter.',
        });
        return;
      }

      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `dashboard_pasteur_mentors_consolides_${timestamp}.xlsx`;
      exportToExcel(exportData, filename, {
        title: 'Tableau Consolidé des Mentors (Piliers)',
        description: `Export des mentors consolidés - ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
        author: user?.email || 'DiscipleLife'
      });
    } catch (error) {
      console.error('Erreur lors de l\'export Excel des mentors:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'exporter les données des mentors.',
      });
    }
  };

  if (loading) {
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
      
      <div id="pasteur-dashboard-content" className="space-y-6 p-6 bg-gray-50 min-h-screen">
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
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-bold text-white mb-4"
                >
                  Bienvenue, <span className="bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">
                    {pasteurNom.first_name || ''}{pasteurNom.first_name && pasteurNom.last_name ? ' ' : ''}{pasteurNom.last_name || ''}
                  </span>
                </motion.h1>
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

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Superviseurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
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
              <div className="text-3xl font-bold text-purple-600">
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
              <div className="text-3xl font-bold text-purple-600">
                {Math.round(globalStats.progressionGlobale)}%
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {globalStats.famillesObjectifAtteint} familles ont atteint l'objectif
              </p>
            </CardContent>
          </Card>
        </div>

        {/* KPI Globaux - Total Disciples par Pasteur */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              KPI Globaux - Total Disciples par Pasteur
            </CardTitle>
            <CardDescription>
              Vue d'ensemble du nombre total de disciples sous la tutelle de chaque pasteur
              {pasteursStats.length > 0 && ` (${pasteursStats.length} pasteur${pasteursStats.length > 1 ? 's' : ''})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPasteursStats ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Chargement des statistiques...</p>
              </div>
            ) : pasteursStats.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-500">Aucun pasteur trouvé dans la base de données.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* Cartes pour chaque pasteur */}
                {pasteursStats.map((pasteur) => (
                  <Card
                    key={pasteur.pasteur_id}
                    className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <Church className="h-4 w-4 text-purple-600" />
                        {pasteur.prenom} {pasteur.nom}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-purple-600">
                        {pasteur.total_disciples || 0}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Total Disciples
                      </p>
                    </CardContent>
                  </Card>
                ))}

                {/* Carte Total Cumulé */}
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      Total Cumulé
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {totalCumuleDisciples}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Tous les Disciples
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistiques des rapports */}
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
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Mes Superviseurs et Familles</CardTitle>
            <CardDescription>
              Vue détaillée de tous les superviseurs sous votre responsabilité et leurs familles
            </CardDescription>
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
                      <TableHead className="font-semibold text-center text-gray-900 group-hover:text-gray-900 transition-colors">Membres</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900 group-hover:text-gray-900 transition-colors">Objectif</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900 group-hover:text-gray-900 transition-colors">Progression</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900 group-hover:text-gray-900 transition-colors">Statut</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900 group-hover:text-gray-900 transition-colors">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFamilles.map((item, index) => (
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

        {/* Tableau consolidé des mentors (pilier) */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Tableau Consolidé des Mentors (Piliers)</CardTitle>
                <CardDescription>
                  Vue d'ensemble de tous les mentors (piliers) avec leurs statistiques de progression ({filteredMentors.length} mentor{filteredMentors.length > 1 ? 's' : ''})
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {loadingMentors && (
                  <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportMentorsExcel}
                  disabled={exporting || filteredMentors.length === 0}
                  className="gap-2"
                >
                  <Download size={16} />
                  Exporter CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Barre de recherche pour les mentors */}
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Rechercher un mentor (nom, prénom, église)..."
                  value={searchTermMentors}
                  onChange={(e) => setSearchTermMentors(e.target.value)}
                  className="pl-10 bg-white border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                />
                {searchTermMentors && (
                  <button
                    onClick={() => setSearchTermMentors('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500 hover:text-red-700 transition-colors"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {loadingMentors ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-500">Chargement des données des mentors...</p>
              </div>
            ) : filteredMentors.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTermMentors 
                    ? 'Aucun mentor trouvé pour votre recherche.' 
                    : 'Aucun mentor trouvé dans les familles sous votre responsabilité.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="group bg-purple-200 hover:bg-purple-300 transition-colors">
                      <TableHead className="font-semibold text-gray-900 group-hover:text-gray-900 transition-colors">Nom</TableHead>
                      <TableHead className="font-semibold text-gray-900 group-hover:text-gray-900 transition-colors">Prénom</TableHead>
                      <TableHead className="font-semibold text-gray-900 group-hover:text-gray-900 transition-colors">Église</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900 group-hover:text-gray-900 transition-colors">Nombre de Disciples</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900 group-hover:text-gray-900 transition-colors">Avancement (%)</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900 group-hover:text-gray-900 transition-colors">Disciples Présents</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900 group-hover:text-gray-900 transition-colors">Taux Participation Semaine (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMentors.map((mentor) => (
                      <TableRow key={mentor.mentor_id} className="hover:bg-gray-50 transition-colors">
                        <TableCell>
                          <span className="font-semibold text-gray-900">{mentor.nom}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-gray-900">{mentor.prenom}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-700">{mentor.eglise}</span>
                        </TableCell>
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

        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  placeholder="Ex: LES DÉTERMINÉS"
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
                  placeholder="Ex: FAM027"
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
                    {superviseursOptions.map((sup) => (
                      <SelectItem key={sup.id} value={sup.id}>
                        {`${sup.first_name || ''} ${sup.last_name || ''}`.trim() ||
                          sup.email}
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
