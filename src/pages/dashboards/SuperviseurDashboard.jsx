import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Target, TrendingUp, UserCheck, Activity, 
  Church, ChevronRight, Loader2, UserCircle, Eye, ArrowLeft, Camera, Sparkles, Zap, Trophy, Star, AlertCircle, Clock,
  Moon, Heart, HeartHandshake, UserPlus, Megaphone, Book, CheckCircle2, PlayCircle, GraduationCap
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getWeek, getQuarter, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfMonth, endOfMonth, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
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
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const SuperviseurDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [famille, setFamille] = useState(null);
  const [pasteur, setPasteur] = useState(null);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous'); // tous, actif, inactif
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showAllMembres, setShowAllMembres] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSuperviseurData();
      checkReportReminder();
    }
  }, [user, kpiPeriodType, kpiSelectedYear, kpiSelectedQuarter, kpiSelectedMonth, kpiSelectedWeek, kpiSelectedYearForPeriod]);

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

  const fetchSuperviseurData = async () => {
    try {
      setLoading(true);

      // 1. Récupérer la famille du superviseur
      const { data: familleData, error: familleError } = await supabase
        .from('familles_disciples')
        .select('*')
        .eq('superviseur_id', user.id)
        .maybeSingle();

      if (familleError) throw familleError;

      if (!familleData) {
        console.warn('Aucune famille trouvée pour ce superviseur');
        setLoading(false);
        return;
      }

      setFamille(familleData);
      if (familleData?.avatar_url) {
        setFamilleAvatarPreview(familleData.avatar_url);
      }

      // 2. Récupérer les informations du superviseur (nom, titre et pasteur)
      // Note: Si la colonne 'titre' n'existe pas encore, on la récupère avec une requête conditionnelle
      const { data: superviseurData, error: superviseurError } = await supabase
        .from('profils')
        .select('first_name, last_name, pasteur_id')
        .eq('id', user.id)
        .single();
      
      // Essayer de récupérer le titre séparément si la colonne existe
      let titre = '';
      try {
        const { data: titreData } = await supabase
          .from('profils')
          .select('titre')
          .eq('id', user.id)
          .single();
        titre = titreData?.titre || '';
      } catch (e) {
        // La colonne titre n'existe pas encore, on continue sans
        console.log('Colonne titre non disponible, migration 058 nécessaire');
      }

      if (superviseurError) throw superviseurError;

      // Stocker le nom et le titre du superviseur
      if (superviseurData) {
        const nomSuperviseur = {
          first_name: superviseurData.first_name || '',
          last_name: superviseurData.last_name || '',
          titre: titre || ''
        };
        console.log('Superviseur nom chargé:', nomSuperviseur);
        setSuperviseurNom(nomSuperviseur);
      } else {
        console.warn('Aucune donnée superviseur trouvée');
      }

      if (superviseurData?.pasteur_id) {
        const { data: pasteurData, error: pasteurError } = await supabase
          .from('profils')
          .select('id, first_name, last_name, identifiant_unique, avatar_url')
          .eq('id', superviseurData.pasteur_id)
          .single();

        if (!pasteurError && pasteurData) {
          setPasteur(pasteurData);
          if (pasteurData?.avatar_url) {
            setPasteurAvatarPreview(pasteurData.avatar_url);
          }
        }
      }

      // 3. Calculer les statistiques
      const nombreMembres = familleData.nombre_disciples_actuels || 0;
      const objectif = familleData.objectif_disciples || 70;
      const progression = Math.min((nombreMembres / objectif) * 100, 100);
      const reste = Math.max(objectif - nombreMembres, 0);

      setStats({
        nombreMembres,
        objectif,
        progression,
        reste
      });

      // 4. Récupérer les membres de la famille
      const { data: membresData, error: membresError } = await supabase
        .from('profils')
        .select('id, first_name, last_name, email, avatar_url, statut_spirituel, created_at')
        .eq('famille_id', familleData.id)
        .eq('role', 'disciple')
        .order('created_at', { ascending: false });

      if (!membresError && membresData) {
        setMembres(membresData || []);
        
        // Récupérer les statistiques de formations et vidéos des membres
        const membreIds = membresData.map(m => m.id);
        
        if (membreIds.length > 0) {
          // Formations terminées (is_completed = true)
          const { count: formationsTermineesCount } = await supabase
            .from('user_module_progression')
            .select('*', { count: 'exact', head: true })
            .in('user_id', membreIds)
            .eq('is_completed', true);
          
          // Formations en cours (is_completed = false et progress > 0)
          const { count: formationsEnCoursCount } = await supabase
            .from('user_module_progression')
            .select('*', { count: 'exact', head: true })
            .in('user_id', membreIds)
            .eq('is_completed', false)
            .gt('progress', 0);
          
          // Vidéos terminées (is_completed = true dans video_progress)
          const { count: videosTermineesCount } = await supabase
            .from('video_progress')
            .select('*', { count: 'exact', head: true })
            .in('disciple_id', membreIds)
            .eq('is_completed', true);
          
          setKpiData(prev => ({
            ...prev,
            formationsTerminees: formationsTermineesCount || 0,
            formationsEnCours: formationsEnCoursCount || 0,
            videosTerminees: videosTermineesCount || 0
          }));
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
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données superviseur:', error);
    } finally {
      setLoading(false);
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
  };

  // Filtrer les membres
  const filteredMembres = membres.filter(membre => {
    const matchesSearch = searchTerm === '' || 
      `${membre.first_name} ${membre.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (membre.email && membre.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'tous' || 
      (statusFilter === 'actif' && membre.statut_spirituel !== 'inactif') ||
      (statusFilter === 'inactif' && membre.statut_spirituel === 'inactif');
    
    return matchesSearch && matchesStatus;
  });

  // Limiter à 12 membres si showAllMembres est false
  const displayedMembres = showAllMembres ? filteredMembres : filteredMembres.slice(0, 12);
  
  // Pagination uniquement si on affiche tous les membres
  const totalPages = showAllMembres ? Math.ceil(filteredMembres.length / itemsPerPage) : 1;
  const paginatedMembres = showAllMembres 
    ? displayedMembres.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
    : displayedMembres;

  // Réinitialiser la page si nécessaire
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

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

  if (loading) {
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
      
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
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
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-950 via-purple-950 to-purple-900 border border-gray-200 shadow-lg p-8 md:p-12">
            <div className="relative z-10 flex items-start justify-between gap-6">
              <div className="flex-1 max-w-3xl">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-bold text-white mb-4 whitespace-nowrap"
                >
                  BIENVENUE dans la Famille de {superviseurNom.titre === 'Pasteur' ? 'Pasteur ' : ''}{superviseurNom.first_name} {superviseurNom.last_name} « <span className="text-amber-400">{famille.nom}</span> »
                </motion.h1>
                <p className="text-xl text-white/90 mb-4 leading-relaxed">
                  Ici, vous êtes chez vous.
                </p>
                <p className="text-lg text-white/90 leading-relaxed">
                  Un espace de partage, de soutien et de croissance spirituelle, où chacun est accompagné dans sa marche avec Dieu afin de devenir de véritables disciples de Christ.
                </p>
              </div>
              {/* Icône/Personnage représentant la famille - Positionnée à droite et en bas */}
              <div className="flex-shrink-0 self-end mt-8 md:mt-12 mr-4 md:mr-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30"
                >
                  {famille.nom.toLowerCase().includes('déterminé') || famille.nom.toLowerCase().includes('determine') ? (
                    <Target className="w-12 h-12 md:w-14 md:h-14 text-white" strokeWidth={2.5} />
                  ) : famille.nom.toLowerCase().includes('victoire') || famille.nom.toLowerCase().includes('victory') ? (
                    <Trophy className="w-12 h-12 md:w-14 md:h-14 text-white" strokeWidth={2.5} />
                  ) : famille.nom.toLowerCase().includes('étoile') || famille.nom.toLowerCase().includes('star') ? (
                    <Star className="w-12 h-12 md:w-14 md:h-14 text-white" strokeWidth={2.5} />
                  ) : famille.nom.toLowerCase().includes('feu') || famille.nom.toLowerCase().includes('fire') ? (
                    <Zap className="w-12 h-12 md:w-14 md:h-14 text-white" strokeWidth={2.5} />
                  ) : (
                    <Sparkles className="w-12 h-12 md:w-14 md:h-14 text-white" strokeWidth={2.5} />
                  )}
                </motion.div>
              </div>
            </div>
            
            {/* Background Decorative Circles */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          </div>
        )}
        
        {/* En-tête avec nom de la famille et pasteur */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-white border-gray-200 shadow-sm">
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
                  <div>{famille.nom} ({famille.identifiant_famille})</div>
                  {user?.email && (
                    <div className="mt-1 text-sm text-gray-500">{user.email}</div>
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
                    <span className="text-lg font-semibold text-orange-600">{stats.reste} Disciples</span>
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

          {/* Carte du Pasteur de tutelle */}
          <Card className="bg-white border-gray-200 shadow-sm">
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
        </div>

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
                Disciples à évangéliser
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.reste}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                avant l'objectif
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
                        <Line type="monotone" dataKey="sortiesEvangelisation" name="Sorties d'Évangélisation" stroke="#14b8a6" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="personnesEvangelisees" name="Personnes évangélisées" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAllMembres(!showAllMembres);
                  setCurrentPage(1);
                }}
                className="bg-white border-gray-200 text-gray-900 hover:bg-blue-600 hover:text-white shrink-0"
              >
                {showAllMembres ? 'Voir moins' : 'Voir tout'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Barre de recherche et filtres */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-gray-200 border-gray-300 text-gray-900 placeholder:text-gray-600"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-[180px] bg-white border-gray-200 text-gray-900 [&>svg]:text-purple-600 [&>span]:text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="tous" className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">Tous les statuts</SelectItem>
                  <SelectItem value="actif" className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">Actifs</SelectItem>
                  <SelectItem value="inactif" className="text-gray-900 hover:bg-gray-100 hover:text-gray-500">Inactifs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table des membres */}
            {paginatedMembres.length > 0 ? (
              <>
                <div className="rounded-md border border-gray-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-purple-200 hover:bg-purple-300 text-gray-900">
                        <TableHead className="w-[60px]">Photo</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Statut spirituel</TableHead>
                        <TableHead>Date d'inscription</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMembres.map((membre) => (
                        <TableRow key={membre.id} className="hover:bg-gray-50">
                          <TableCell>
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={membre.avatar_url} alt={`${membre.first_name} ${membre.last_name}`} />
                              <AvatarFallback className="bg-purple-100 text-purple-600">
                                {membre.first_name?.charAt(0) || ''}{membre.last_name?.charAt(0) || ''}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium">
                            {membre.first_name} {membre.last_name}
                          </TableCell>
                          <TableCell className="text-gray-600">
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
                          <TableCell className="text-gray-600">
                            {membre.created_at ? format(new Date(membre.created_at), 'dd/MM/yyyy', { locale: fr }) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                      Page {currentPage} sur {totalPages} ({filteredMembres.length} membre{filteredMembres.length > 1 ? 's' : ''})
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
                      >
                        Précédent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== 'tous' 
                    ? 'Aucun membre ne correspond à vos critères de recherche.'
                    : 'Aucun membre dans cette famille pour le moment.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default SuperviseurDashboard;
