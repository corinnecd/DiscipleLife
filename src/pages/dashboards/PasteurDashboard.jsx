import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Target, TrendingUp, UserCheck, Activity, 
  Church, ChevronRight, Loader2, Search, Filter, Eye, BarChart3,
  Mail, Phone, ArrowLeft, Building2, CheckCircle2, AlertCircle, Calendar,
  Moon, Heart, HeartHandshake, UserPlus, Megaphone, Book, Plus, X
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getWeek, getQuarter, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
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

const PasteurDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pasteurNom, setPasteurNom] = useState({ first_name: '', last_name: '', identifiant_unique: '' });
  const [superviseurs, setSuperviseurs] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamille, setSelectedFamille] = useState(null);
  
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

  useEffect(() => {
    if (user) {
      fetchPasteurData();
    }
  }, [user, kpiPeriodType, kpiSelectedYear, kpiSelectedQuarter, kpiSelectedMonth, kpiSelectedWeek, kpiSelectedYearForPeriod]);

  const fetchPasteurData = async () => {
    try {
      setLoading(true);

      // 1. Récupérer les informations du pasteur
      const { data: pasteurData, error: pasteurError } = await supabase
        .from('profils')
        .select('first_name, last_name, identifiant_unique, email')
        .eq('id', user.id)
        .single();

      if (pasteurError) throw pasteurError;

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
      const { data: superviseursData, error: superviseursError } = await supabase
        .from('profils')
        .select('id, first_name, last_name, email, identifiant_unique, avatar_url, pasteur_id')
        .eq('pasteur_id', user.id)
        .eq('role', 'superviseur')
        .order('first_name', { ascending: true });

      if (superviseursError) {
        console.error('Erreur lors de la récupération des superviseurs:', superviseursError);
      }

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

  // Filtrer les familles selon la recherche (insensible à la casse et aux accents)
  const filteredFamilles = familles.filter(item => {
    if (!searchTerm) return true;
    const search = normalizeString(searchTerm);
    const nomSuperviseur = normalizeString(`${item.superviseur.first_name} ${item.superviseur.last_name}`);
    const nomFamille = normalizeString(item.famille?.nom || '');
    const identifiantFamille = normalizeString(item.famille?.identifiant_famille || '');
    return nomSuperviseur.includes(search) || nomFamille.includes(search) || identifiantFamille.includes(search);
  });

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

        {/* Bandeau de bienvenue */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-950 via-purple-950 to-purple-900 border border-gray-200 shadow-lg p-8 md:p-12">
          <div className="relative z-10">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold text-white mb-4"
            >
              Bienvenue, <span className="bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">{pasteurNom.first_name} {pasteurNom.last_name}</span>
            </motion.h1>
            <p className="text-xl text-white/90 mb-4 leading-relaxed">
              Vous êtes le Pasteur Référent des Superviseurs de votre grande famille.
            </p>
            <p className="text-lg text-white/90 leading-relaxed">
              Gérez et suivez la progression de tous vos superviseurs et leurs familles de disciples.
            </p>
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
                      return `KPI Hebdomadaires Sem ${kpiSelectedWeek} ${kpiSelectedYearForPeriod}`;
                    }
                  })()}
                </CardTitle>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={kpiPeriodType} onValueChange={setKpiPeriodType}>
                  <SelectTrigger className="w-[140px] bg-purple-600 border-0 text-white focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-white hover:bg-purple-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="hebdomadaire" className="text-gray-900 hover:bg-gray-100">Hebdomadaire</SelectItem>
                    <SelectItem value="mensuel" className="text-gray-900 hover:bg-gray-100">Mensuel</SelectItem>
                    <SelectItem value="trimestriel" className="text-gray-900 hover:bg-gray-100">Trimestriel</SelectItem>
                    <SelectItem value="annuel" className="text-gray-900 hover:bg-gray-100">Annuel</SelectItem>
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
                        return <SelectItem key={year} value={year.toString()} className="text-gray-900 hover:bg-gray-100">{year}</SelectItem>;
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
                        <SelectItem value="1" className="text-gray-900 hover:bg-gray-100">Trimestre 1</SelectItem>
                        <SelectItem value="2" className="text-gray-900 hover:bg-gray-100">Trimestre 2</SelectItem>
                        <SelectItem value="3" className="text-gray-900 hover:bg-gray-100">Trimestre 3</SelectItem>
                        <SelectItem value="4" className="text-gray-900 hover:bg-gray-100">Trimestre 4</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={kpiSelectedYearForPeriod} onValueChange={setKpiSelectedYearForPeriod}>
                      <SelectTrigger className="w-[100px] bg-gray-100 border-0 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none [&>span]:text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {Array.from({ length: 7 }, (_, i) => {
                          const year = 2025 + i;
                          return <SelectItem key={year} value={year.toString()} className="text-gray-900 hover:bg-gray-100">{year}</SelectItem>;
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
                          <SelectItem key={index} value={index.toString()} className="text-gray-900 hover:bg-gray-100">{month}</SelectItem>
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
                          return <SelectItem key={year} value={year.toString()} className="text-gray-900 hover:bg-gray-100">{year}</SelectItem>;
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
                          <SelectItem key={i + 1} value={(i + 1).toString()} className="text-gray-900 hover:bg-gray-100">Semaine {i + 1}</SelectItem>
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
                          return <SelectItem key={year} value={year.toString()} className="text-gray-900 hover:bg-gray-100">{year}</SelectItem>;
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
              <div className="group text-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:bg-purple-600 rounded-lg border border-indigo-200 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 group-hover:from-indigo-600 group-hover:to-indigo-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.culteSamediSoir || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors">Culte du Samedi Soir</div>
                <Moon className="h-4 w-4 mx-auto mt-2 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:bg-purple-600 rounded-lg border border-blue-200 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 group-hover:from-blue-600 group-hover:to-blue-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.culteDimancheMatin || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors">Culte du Dimanche Matin</div>
                <Church className="h-4 w-4 mx-auto mt-2 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 hover:bg-purple-600 rounded-lg border border-cyan-200 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-cyan-800 group-hover:from-cyan-600 group-hover:to-cyan-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.afterCulteDimanche || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors">After Culte du Dimanche</div>
                <Users className="h-4 w-4 mx-auto mt-2 text-cyan-600 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 hover:bg-purple-600 rounded-lg border border-amber-200 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-amber-800 group-hover:from-amber-600 group-hover:to-amber-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.tempsPriere || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors">Temps de Prière</div>
                <Heart className="h-4 w-4 mx-auto mt-2 text-amber-600 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-pink-50 to-pink-100 hover:bg-purple-600 rounded-lg border border-pink-200 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-pink-800 group-hover:from-pink-600 group-hover:to-pink-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.personnesEvangelisees || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors">Personnes évangélisées</div>
                <Target className="h-4 w-4 mx-auto mt-2 text-pink-600 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 hover:bg-purple-600 rounded-lg border border-emerald-200 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-800 group-hover:from-emerald-600 group-hover:to-emerald-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.nouveauxConvertis || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors">Nouveaux Convertis</div>
                <Heart className="h-4 w-4 mx-auto mt-2 text-emerald-600 group-hover:text-white transition-colors" />
              </div>
              
              {/* Ligne 2 */}
              <div className="group text-center p-4 bg-gradient-to-br from-rose-50 to-rose-100 hover:bg-purple-600 rounded-lg border border-rose-200 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-rose-800 group-hover:from-rose-600 group-hover:to-rose-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.nouveauxArrivants || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors">Nouveaux Arrivants</div>
                <UserPlus className="h-4 w-4 mx-auto mt-2 text-rose-600 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-teal-50 to-teal-100 hover:bg-purple-600 rounded-lg border border-teal-200 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-teal-800 group-hover:from-teal-600 group-hover:to-teal-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.sortiesEvangelisation || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors">Sorties d'Évangélisation</div>
                <Megaphone className="h-4 w-4 mx-auto mt-2 text-teal-600 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:bg-purple-600 rounded-lg border border-purple-200 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 group-hover:from-amber-500 group-hover:to-amber-700 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.comFratDisciples || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors">Com Frat Disciples</div>
                <UserCheck className="h-4 w-4 mx-auto mt-2 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-violet-50 to-violet-100 hover:bg-purple-600 rounded-lg border border-violet-200 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-violet-800 group-hover:from-amber-500 group-hover:to-amber-700 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.veillee || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors">Veillée</div>
                <Moon className="h-4 w-4 mx-auto mt-2 text-violet-600 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 hover:bg-purple-600 rounded-lg border border-orange-200 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 group-hover:from-orange-600 group-hover:to-orange-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.meditationBible || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors">Méditation Bible</div>
                <Book className="h-4 w-4 mx-auto mt-2 text-orange-600 group-hover:text-white transition-colors" />
              </div>
              <div className="group text-center p-4 bg-gradient-to-br from-green-50 to-green-100 hover:bg-purple-600 rounded-lg border border-green-200 hover:border-purple-600 transition-colors cursor-pointer">
                <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-800 group-hover:from-green-600 group-hover:to-green-800 bg-clip-text text-transparent">
                  {globalStats.kpiAnnuels?.tempsPartage || 0}
                </div>
                <div className="text-xs text-gray-900 group-hover:text-gray-900 mt-1 font-medium transition-colors">Temps de Partage</div>
                <HeartHandshake className="h-4 w-4 mx-auto mt-2 text-green-600 group-hover:text-white transition-colors" />
              </div>
            </div>
          </CardContent>
        </Card>

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
                    className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedFamille(item)}
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
                    <TableRow className="group hover:bg-purple-300 transition-colors cursor-pointer">
                      <TableHead className="font-semibold group-hover:text-gray-900 transition-colors">Superviseur</TableHead>
                      <TableHead className="font-semibold group-hover:text-gray-900 transition-colors">Famille</TableHead>
                      <TableHead className="font-semibold text-center group-hover:text-gray-900 transition-colors">Membres</TableHead>
                      <TableHead className="font-semibold text-center group-hover:text-gray-900 transition-colors">Objectif</TableHead>
                      <TableHead className="font-semibold text-center group-hover:text-gray-900 transition-colors">Progression</TableHead>
                      <TableHead className="font-semibold text-center group-hover:text-gray-900 transition-colors">Statut</TableHead>
                      <TableHead className="font-semibold text-center group-hover:text-gray-900 transition-colors">Actions</TableHead>
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
                            onClick={() => {
                              // Naviguer vers le détail de la famille
                              if (item.famille) {
                                navigate(`/familles/${item.famille.id}`);
                              }
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
      </div>
    </>
  );
};

export default PasteurDashboard;
