import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Heart, Target, TrendingUp, Calendar, CheckCircle, Clock,
  ArrowRight, Loader2, Plus, Edit2, Trash2, Play, Star, Award,
  FileText, BarChart3, Sparkles, ChevronRight, X, Save, Search, Filter,
  Download, Share2, FileDown
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { getOrSetCache, clearCache } from '@/lib/CacheUtils';
import { useToast } from '@/components/ui/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Helmet } from 'react-helmet';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';

const Transformation = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { handleError } = useErrorHandler();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bibliotheque');
  const [selectedCategorie, setSelectedCategorie] = useState('toutes');

  // États pour les parcours
  const [parcours, setParcours] = useState([]);
  const [parcoursLoading, setParcoursLoading] = useState(true);
  const [selectedParcours, setSelectedParcours] = useState(null);
  const [modules, setModules] = useState([]);
  const [isParcoursDialogOpen, setIsParcoursDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [parcoursToCancel, setParcoursToCancel] = useState(null);

  // États pour la progression
  const [userProgression, setUserProgression] = useState([]);
  const [progressionLoading, setProgressionLoading] = useState(true);

  // États pour le journal
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalLoading, setJournalLoading] = useState(true);
  const [isDeleteJournalDialogOpen, setIsDeleteJournalDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [isJournalDialogOpen, setIsJournalDialogOpen] = useState(false);
  const [editingJournalId, setEditingJournalId] = useState(null);
  const [journalFormData, setJournalFormData] = useState({
    date_entree: new Date().toISOString().split('T')[0],
    titre: '',
    contenu: '',
    thematique: '',
    emotions: [],
    revelations: '',
    actions_prises: '',
    gratitude: '',
    prieres: '',
    tags: []
  });

  // États pour les filtres du journal
  const [journalSearchQuery, setJournalSearchQuery] = useState('');
  const [journalFilterThematique, setJournalFilterThematique] = useState('toutes');
  const [journalFilterDateDebut, setJournalFilterDateDebut] = useState('');
  const [journalFilterDateFin, setJournalFilterDateFin] = useState('');

  // États pour les évaluations
  const [evaluations, setEvaluations] = useState([]);
  const [evaluationsLoading, setEvaluationsLoading] = useState(true);

  // États pour les statistiques
  const [statsData, setStatsData] = useState({
    parcoursCompletes: 0,
    parcoursEnCours: 0,
    progressionMoyenne: 0,
    modulesCompletes: 0,
    evaluationsCount: 0,
    journalEntriesCount: 0,
    progressionParCategorie: [],
    progressionParMois: [],
    scoresEvaluations: [],
    top5FormationsSuivies: [],
    top5FormationsTerminees: []
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [isStatsDetailDialogOpen, setIsStatsDetailDialogOpen] = useState(false);
  // État pour stocker les statuts et progressions corrigés (basés sur les modules complétés)
  const [correctedProgressions, setCorrectedProgressions] = useState({});
  const [statsDetailData, setStatsDetailData] = useState({
    type: '',
    title: '',
    items: [],
    rawData: [] // Stocker les données brutes pour générer les certificats
  });
  // États pour la vue par disciple
  const [disciples, setDisciples] = useState([]);
  const [selectedDisciple, setSelectedDisciple] = useState(null);
  const [discipleSearchQuery, setDiscipleSearchQuery] = useState('');
  const [isDiscipleViewDialogOpen, setIsDiscipleViewDialogOpen] = useState(false);
  const [discipleFormations, setDiscipleFormations] = useState({
    completes: [],
    enCours: []
  });
  const [discipleFormationsLoading, setDiscipleFormationsLoading] = useState(false);
  const [isEvaluationDialogOpen, setIsEvaluationDialogOpen] = useState(false);
  const [evaluationFormData, setEvaluationFormData] = useState({
    date_evaluation: new Date().toISOString().split('T')[0],
    type_evaluation: 'mensuelle',
    domaine_evalue: 'relation_dieu',
    score: 50,
    points_forts: [],
    axes_amelioration: [],
    notes: ''
  });

  // États pour les filtres des évaluations
  const [evaluationFilterDomaine, setEvaluationFilterDomaine] = useState('tous');
  const [evaluationFilterType, setEvaluationFilterType] = useState('tous');
  const [evaluationFilterDateDebut, setEvaluationFilterDateDebut] = useState('');
  const [evaluationFilterDateFin, setEvaluationFilterDateFin] = useState('');

  // États pour les ressources de guérison et restauration
  const [ressourcesGuerison, setRessourcesGuerison] = useState([]);
  const [ressourcesGuerisonLoading, setRessourcesGuerisonLoading] = useState(true);
  const [ressourcesFilterType, setRessourcesFilterType] = useState('tous');
  const [ressourcesSearchQuery, setRessourcesSearchQuery] = useState('');
  const [selectedRessource, setSelectedRessource] = useState(null);
  const [isRessourceDialogOpen, setIsRessourceDialogOpen] = useState(false);

  // États pour le suivi post-crise
  const [suivisPostCrise, setSuivisPostCrise] = useState([]);
  const [suivisPostCriseLoading, setSuivisPostCriseLoading] = useState(true);
  const [isSuiviDialogOpen, setIsSuiviDialogOpen] = useState(false);
  const [isHistoriqueDialogOpen, setIsHistoriqueDialogOpen] = useState(false);
  const [selectedSuivi, setSelectedSuivi] = useState(null);
  const [historiqueSuivi, setHistoriqueSuivi] = useState([]);
  const [suiviFormData, setSuiviFormData] = useState({
    date_debut: new Date().toISOString().split('T')[0],
    type_crise: 'autre',
    description: '',
    gravite: 5,
    objectifs: [],
    etat_actuel: '',
    besoins_specifiques: [],
    ressources_utilisees: [],
    prochaine_action: '',
    date_prochaine_action: '',
    rappel_actif: true,
    frequence_rappels: 'hebdomadaire',
    statut: 'actif',
    notes: ''
  });
  const [historiqueFormData, setHistoriqueFormData] = useState({
    date_suivi: new Date().toISOString().split('T')[0],
    etat_mental: 5,
    etat_spirituel: 5,
    etat_physique: 5,
    progres_observes: '',
    defis_rencontres: '',
    victoires: '',
    versets_bibliques: [],
    prieres_exaucees: [],
    actions_prises: [],
    notes: ''
  });
  const [editingSuiviId, setEditingSuiviId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // Rafraîchir les données quand on revient sur la page
  useEffect(() => {
    if (user && location.pathname === '/transformation') {
      console.log('🔄 Rafraîchissement des données (retour sur la page)', location.search);
      
      // Forcer un rafraîchissement complet des données
      const refreshData = async () => {
        try {
          await fetchAllData();
          console.log('✅ Données rafraîchies avec succès');
        } catch (error) {
          handleError(error, { context: 'refreshData' }, "Erreur lors du rafraîchissement des données.");
        }
      };
      
      refreshData();
      
      // Gérer l'onglet depuis l'URL
      const params = new URLSearchParams(location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['bibliotheque', 'mes-formations', 'progression', 'journal', 'evaluations', 'statistiques', 'ressources-guerison', 'suivi-post-crise'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, [location.pathname, location.search, user]);

  // Rafraîchir aussi quand la page redevient visible (si l'utilisateur revient d'un autre onglet)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && location.pathname === '/transformation') {
        console.log('🔄 Page visible, rafraîchissement des données');
        fetchAllData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, location.pathname]);

  // Réinitialiser les modules quand le dialog se ferme
  useEffect(() => {
    if (!isParcoursDialogOpen) {
      setModules([]);
      setSelectedParcours(null);
    }
  }, [isParcoursDialogOpen]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      // Récupérer toutes les données en parallèle (fetchStatsData récupère ses propres données depuis la DB)
      await Promise.all([
        fetchParcours(),
        fetchUserProgression(),
        fetchJournalEntries(),
        fetchEvaluations(),
        fetchStatsData(),
        fetchDisciples(),
        fetchRessourcesGuerison(),
        fetchSuivisPostCrise()
      ]);
    } catch (error) {
      handleError(error, { context: 'fetchData' }, "Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  };

  // ========== FONCTIONS POUR LES PARCOURS ==========
  const CACHE_TTL_MS = 2 * 60 * 1000; // 2 min (§9.1 Étape 4 – extension cache)

  const fetchParcours = async () => {
    try {
      setParcoursLoading(true);
      const data = await getOrSetCache(
        'transformation_parcours_actifs',
        async () => {
          const { data: raw, error } = await supabase
            .from('parcours_transformation')
            .select('*')
            .eq('statut', 'actif')
            .order('ordre_affichage', { ascending: true });
          if (error) throw error;
          return raw || [];
        },
        CACHE_TTL_MS
      );
      
      // Supprimer les doublons basés sur le nom (garder le premier)
      const uniqueParcours = [];
      const seenNames = new Set();
      (data || []).forEach(parcour => {
        const key = parcour.nom || parcour.thematique || parcour.id;
        if (!seenNames.has(key)) {
          seenNames.add(key);
          uniqueParcours.push(parcour);
        }
      });
      
      setParcours(uniqueParcours);
      
    } catch (error) {
      console.error('❌ Error fetching parcours:', error);
      toast({
        title: 'Erreur',
        description: `Impossible de charger les parcours: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setParcoursLoading(false);
    }
  };

  const fetchModules = async (parcoursId) => {
    try {
      // Réinitialiser les modules avant de charger les nouveaux
      setModules([]);
      
      console.log('🔍 Récupération des modules pour parcours_id:', parcoursId);
      
      const { data, error } = await supabase
        .from('modules_parcours')
        .select('*')
        .eq('parcours_id', parcoursId)
        .eq('statut', 'actif')
        .order('ordre', { ascending: true });

      if (error) {
        console.error('❌ Erreur lors de la récupération des modules:', error);
        throw error;
      }
      
      console.log('✅ Modules récupérés:', data?.length || 0, 'modules pour parcours', parcoursId);
      console.log('📋 Détails des modules:', data);
      
      setModules(data || []);
    } catch (error) {
      console.error('❌ Error fetching modules:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les modules',
        variant: 'destructive'
      });
    }
  };

  const handleViewParcours = async (parcours) => {
    console.log('👆 Clic sur parcours:', parcours.nom, 'ID:', parcours.id);
    setSelectedParcours(parcours);
    await fetchModules(parcours.id);
    console.log('✅ Ouverture de la modale, selectedParcours:', parcours);
    setIsParcoursDialogOpen(true);
    console.log('✅ isParcoursDialogOpen devrait être true maintenant');
  };

  const handleStartParcours = async (parcoursId) => {
    try {
      console.log('🚀 Démarrage du parcours:', parcoursId);
      
      // Vérifier si l'utilisateur est déjà inscrit
      const { data: existing, error: checkError } = await supabase
        .from('user_parcours_progression')
        .select('id, statut')
        .eq('user_id', user.id)
        .eq('parcours_id', parcoursId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Erreur vérification:', checkError);
        throw checkError;
      }

      if (existing) {
        // Si le parcours est déjà terminé, ne pas le réinitialiser
        if (existing.statut === 'termine') {
          console.log('⚠️ Parcours déjà terminé, redirection vers la page de détail');
          toast({
            title: 'Parcours déjà terminé',
            description: 'Ce parcours est déjà complété à 100%. Redirection vers la page de détail...',
          });
          // Naviguer vers la page de détail pour voir le parcours terminé
          navigate(`/transformation/${parcoursId}`);
          return;
        }
        
        // Mettre à jour le statut si déjà inscrit (mais pas terminé)
        console.log('🔄 Mise à jour progression existante:', existing.id, 'statut actuel:', existing.statut);
        const { error } = await supabase
          .from('user_parcours_progression')
          .update({
            statut: 'en_cours',
            date_debut: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) {
          console.error('❌ Erreur mise à jour:', error);
          throw error;
        }
        console.log('✅ Progression mise à jour avec succès');
      } else {
        // Créer une nouvelle inscription
        // Ne pas inclure modules_completes car cela cause une erreur "expected JSON array"
        console.log('➕ Création nouvelle progression pour parcours:', parcoursId);
        const { data: newProgression, error } = await supabase
          .from('user_parcours_progression')
          .insert([{
            user_id: user.id,
            parcours_id: parcoursId,
            date_debut: new Date().toISOString(),
            statut: 'en_cours',
            progression_pourcentage: 0
          }])
          .select()
          .single();

        if (error) {
          console.error('❌ Erreur création progression:', error);
          throw error;
        }
        console.log('✅ Progression créée avec succès:', newProgression);
      }

      // Rafraîchir les données avant de naviguer
      console.log('🔄 Rafraîchissement des données...');
      await fetchUserProgression();
      await fetchParcours();
      
      // Naviguer vers la page de détail du parcours
      navigate(`/transformation/${parcoursId}`);
    } catch (error) {
      console.error('❌ Error starting parcours:', error);
      toast({
        title: 'Erreur',
        description: `Impossible de démarrer le parcours: ${error.message || 'Erreur inconnue'}`,
        variant: 'destructive'
      });
    }
  };

  const handleCancelParcours = (progression) => {
    setParcoursToCancel(progression);
    setIsCancelDialogOpen(true);
  };

  const confirmCancelParcours = async () => {
    try {
      const { error } = await supabase
        .from('user_parcours_progression')
        .update({ statut: 'abandonne' })
        .eq('id', parcoursToCancel.id);

      if (error) throw error;

      setIsCancelDialogOpen(false);
      setParcoursToCancel(null);
      
      // Rafraîchir toutes les données, y compris les statistiques
      await Promise.all([
        fetchUserProgression(),
        fetchParcours(),
        fetchStatsData() // Mettre à jour les statistiques pour exclure les parcours annulés
      ]);
    } catch (error) {
      console.error('Error canceling parcours:', error);
    }
  };

  // Fonction de réinitialisation pour les tests - Remet toutes les formations en "non complétées"
  const resetAllFormations = async () => {
    if (!user) {
      console.error('❌ Pas d\'utilisateur connecté');
      return;
    }

    try {
      console.log('🔄 Réinitialisation de toutes les formations pour les tests...');
      
      // 1. Récupérer toutes les progressions de l'utilisateur
      const { data: progressions, error: progError } = await supabase
        .from('user_parcours_progression')
        .select('id')
        .eq('user_id', user.id);

      if (progError) {
        console.error('❌ Erreur récupération progressions:', progError);
        throw progError;
      }

      if (!progressions || progressions.length === 0) {
        console.log('ℹ️ Aucune progression trouvée');
        return;
      }

      const progressionIds = progressions.map(p => p.id);
      console.log(`📊 ${progressionIds.length} progressions trouvées`);

      // 2. Supprimer tous les modules complétés
      console.log('🗑️ Suppression des modules complétés...');
      const { error: deleteModulesError } = await supabase
        .from('user_module_progression')
        .delete()
        .in('progression_id', progressionIds);

      if (deleteModulesError) {
        console.error('❌ Erreur suppression modules:', deleteModulesError);
        throw deleteModulesError;
      }
      console.log('✅ Modules complétés supprimés');

      // 3. Remettre toutes les progressions à "en_cours" avec progression 0%
      // S'assurer de remettre TOUS les statuts (termine, abandonne, etc.) à "en_cours"
      console.log('🔄 Remise à zéro des progressions...');
      console.log('📊 Progressions à réinitialiser:', progressions.map(p => p.id));
      
      // Mettre à jour toutes les progressions, peu importe leur statut actuel
      const { error: updateError } = await supabase
        .from('user_parcours_progression')
        .update({
          statut: 'en_cours',
          progression_pourcentage: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('❌ Erreur mise à jour progressions:', updateError);
        throw updateError;
      }
      console.log('✅ Progressions remises à zéro (statut: en_cours, progression: 0%)');
      
      // Vérifier que la mise à jour a bien fonctionné
      const { data: verifyData, error: verifyError } = await supabase
        .from('user_parcours_progression')
        .select('id, statut, progression_pourcentage')
        .eq('user_id', user.id);
      
      if (verifyError) {
        console.error('❌ Erreur vérification:', verifyError);
      } else {
        console.log('✅ Vérification après réinitialisation:');
        verifyData?.forEach(p => {
          console.log(`  - Progression ${p.id}: statut=${p.statut}, progression=${p.progression_pourcentage}%`);
        });
      }

      // 4. Rafraîchir toutes les données
      console.log('🔄 Rafraîchissement des données...');
      await Promise.all([
        fetchUserProgression(),
        fetchParcours(),
        fetchStatsData()
      ]);

      console.log('✅ Réinitialisation terminée avec succès !');
      
    } catch (error) {
      console.error('❌ Erreur lors de la réinitialisation:', error);
    }
  };

  // Fonction pour obtenir le label et la couleur de la catégorie
  const getCategorieInfo = (categorie) => {
    const categories = {
      'identite_christ': { label: 'Identité en Christ', color: 'bg-blue-500', textColor: 'text-blue-600', borderColor: 'border-blue-500' },
      'fondements_royaume': { label: 'Les Fondements du Royaume', color: 'bg-purple-500', textColor: 'text-purple-600', borderColor: 'border-purple-500' },
      'restauration_ame': { label: 'Restauration de l\'âme', color: 'bg-pink-500', textColor: 'text-pink-600', borderColor: 'border-pink-500' },
      'deploiement': { label: 'Déploiement', color: 'bg-green-500', textColor: 'text-green-600', borderColor: 'border-green-500' },
      'finances': { label: 'Finances', color: 'bg-yellow-500', textColor: 'text-yellow-600', borderColor: 'border-yellow-500' },
      'vie_famille': { label: 'Vie de Famille', color: 'bg-orange-500', textColor: 'text-orange-600', borderColor: 'border-orange-500' },
      'marcher_esprit': { label: 'Marcher par l\'esprit', color: 'bg-indigo-500', textColor: 'text-indigo-600', borderColor: 'border-indigo-500' },
      'discipolat': { label: 'Discipolat', color: 'bg-teal-500', textColor: 'text-teal-600', borderColor: 'border-teal-500' }
    };
    return categories[categorie] || { label: categorie, color: 'bg-gray-500', textColor: 'text-gray-600', borderColor: 'border-gray-500' };
  };

  // Liste de toutes les catégories
  const toutesCategories = [
    'identite_christ',
    'fondements_royaume',
    'restauration_ame',
    'deploiement',
    'finances',
    'vie_famille',
    'marcher_esprit',
    'discipolat'
  ];

  // Filtrer les parcours par catégorie
  const filteredParcours = selectedCategorie === 'toutes' 
    ? parcours.filter(p => p.nom && p.nom !== 'Parcours sans nom')
    : parcours.filter(p => p.categorie === selectedCategorie && p.nom && p.nom !== 'Parcours sans nom');

  // Compter les parcours par catégorie
  const getParcoursCountByCategorie = (categorie) => {
    return parcours.filter(p => 
      p.categorie === categorie && 
      p.nom && 
      p.nom !== 'Parcours sans nom' &&
      p.statut === 'actif'
    ).length;
  };

  const totalParcours = parcours.filter(p => 
    p.nom && 
    p.nom !== 'Parcours sans nom' &&
    p.statut === 'actif'
  ).length;

  // Fonction pour vérifier si un parcours est déjà inscrit (inclut les parcours terminés)
  const isParcoursInscrit = (parcoursId) => {
    return userProgression.some(prog => 
      prog.parcours_id === parcoursId && 
      (prog.statut === 'inscrit' || prog.statut === 'en_cours' || prog.statut === 'suspendu' || prog.statut === 'termine')
    );
  };

  // ========== FONCTIONS POUR LA PROGRESSION ==========
  const fetchUserProgression = async () => {
    if (!user?.id) {
      console.warn('⚠️ Pas d\'utilisateur connecté, impossible de récupérer les progressions');
      setUserProgression([]);
      setProgressionLoading(false);
      return [];
    }
    
    try {
      setProgressionLoading(true);
      console.log('🔄 Début fetchUserProgression pour user:', user.id);
      
      const { data, error } = await supabase
        .from('user_parcours_progression')
        .select(`
          *,
          parcours_transformation (
            id,
            nom,
            description,
            thematique,
            duree_jours,
            categorie
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur récupération progression:', error);
        console.error('❌ Détails erreur:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        toast({
          title: 'Erreur',
          description: `Impossible de récupérer les progressions: ${error.message}`,
          variant: 'destructive'
        });
        setUserProgression([]);
        return [];
      }
      
      console.log('✅ Progression récupérée:', data?.length || 0, 'parcours');
      
      if (!data || data.length === 0) {
        console.log('⚠️ Aucune progression trouvée pour l\'utilisateur:', user.id);
      } else {
        console.log('📊 Toutes les progressions:', data.map(p => ({
          id: p.id,
          parcours_id: p.parcours_id,
          parcours_nom: p.parcours_transformation?.nom || 'NOM MANQUANT',
          statut: p.statut,
          progression_pourcentage: p.progression_pourcentage,
          modules_completes: p.modules_completes,
          date_fin_reelle: p.date_fin_reelle,
          has_parcours: !!p.parcours_transformation,
          date_debut: p.date_debut
        })));
        
        // Log des parcours complétés
        const completes = data.filter(p => p.statut === 'termine');
        console.log('✅ Parcours complétés trouvés dans fetchUserProgression:', completes.length);
        completes.forEach(p => {
          console.log(`  ✓ ${p.parcours_transformation?.nom || 'Sans nom'}: ${p.progression_pourcentage}% (modules: ${p.modules_completes})`);
        });
      }
      
      // Vérifier et corriger automatiquement les formations complétées
      // Si tous les modules sont complétés mais le statut n'est pas "termine", corriger
      const corrected = {};
      for (const progression of data || []) {
        // Vérifier si tous les modules sont complétés
        try {
          // Récupérer le nombre total de modules du parcours
          const { data: modulesData, error: modulesError } = await supabase
            .from('modules_parcours')
            .select('id')
            .eq('parcours_id', progression.parcours_id)
            .eq('statut', 'actif');
          
          if (!modulesError && modulesData && modulesData.length > 0) {
            const totalModules = modulesData.length;
            
            // Récupérer le nombre de modules complétés
            const { data: completedModules, error: completedError } = await supabase
              .from('user_module_progression')
              .select('module_id')
              .eq('progression_id', progression.id)
              .eq('est_complete', true);
            
            if (!completedError && completedModules) {
              const completedCount = completedModules.length;
              
              // Si tous les modules sont complétés, mettre à jour le statut
              if (completedCount === totalModules && totalModules > 0) {
                // Stocker la correction pour l'affichage
                corrected[progression.id] = {
                  statut: 'termine',
                  progression_pourcentage: 100
                };
                
                // Si le statut dans la DB n'est pas "termine", corriger
                if (progression.statut !== 'termine' || progression.progression_pourcentage !== 100) {
                  console.log(`🔧 Correction automatique: Progression ${progression.id} - Tous les modules complétés (${completedCount}/${totalModules}), mise à jour à "termine"`);
                  
                  // Si le statut est "abandonne", on le remet d'abord à "en_cours"
                  if (progression.statut === 'abandonne') {
                    await supabase
                      .from('user_parcours_progression')
                      .update({
                        statut: 'en_cours',
                        progression_pourcentage: 100,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', progression.id);
                    
                    // Attendre un peu avant de mettre à jour à "termine"
                    await new Promise(resolve => setTimeout(resolve, 200));
                  }
                  
                  // Mettre à jour à "termine"
                  const { error: updateError } = await supabase
                    .from('user_parcours_progression')
                    .update({
                      statut: 'termine',
                      progression_pourcentage: 100,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', progression.id);
                  
                  if (updateError) {
                    console.error(`❌ Erreur correction progression ${progression.id}:`, updateError);
                  } else {
                    console.log(`✅ Progression ${progression.id} corrigée: statut mis à "termine"`);
                    // Mettre à jour localement
                    progression.statut = 'termine';
                    progression.progression_pourcentage = 100;
                  }
                }
              } else {
                // Recalculer la progression si nécessaire
                const correctPercentage = Math.round((completedCount / totalModules) * 100);
                if (progression.progression_pourcentage !== correctPercentage) {
                  corrected[progression.id] = {
                    statut: progression.statut,
                    progression_pourcentage: correctPercentage
                  };
                  
                  // Mettre à jour dans la DB
                  await supabase
                    .from('user_parcours_progression')
                    .update({
                      progression_pourcentage: correctPercentage,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', progression.id);
                  progression.progression_pourcentage = correctPercentage;
                }
              }
            }
          }
        } catch (error) {
          console.error(`❌ Erreur vérification modules pour progression ${progression.id}:`, error);
        }
      }
      
      // Mettre à jour l'état des progressions corrigées
      setCorrectedProgressions(corrected);
      
      // Filtrer les progressions avec statut en_cours ou inscrit
      const progressionsActives = (data || []).filter(p => 
        p.statut === 'en_cours' || p.statut === 'inscrit'
      );
      console.log('🎯 Progressions actives (en_cours ou inscrit):', progressionsActives.length);
      if (progressionsActives.length > 0) {
        console.log('📋 Détails progressions actives:', progressionsActives.map(p => ({
          id: p.id,
          parcours_nom: p.parcours_transformation?.nom || 'NOM MANQUANT',
          statut: p.statut,
          has_parcours: !!p.parcours_transformation,
          date_debut: p.date_debut
        })));
      } else {
        console.log('⚠️ Aucune progression active trouvée');
        console.log('📋 Statuts des progressions:', data?.map(p => p.statut) || []);
      }
      
      setUserProgression(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching progression:', error);
      return [];
    } finally {
      setProgressionLoading(false);
    }
  };

  // ========== FONCTIONS POUR LE JOURNAL ==========
  const fetchJournalEntries = async () => {
    if (!user?.id) return;
    try {
      setJournalLoading(true);
      const data = await getOrSetCache(
        `transformation_journal_${user.id}`,
        async () => {
          const { data: raw, error } = await supabase
            .from('journal_transformation')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) throw error;
          return raw || [];
        },
        CACHE_TTL_MS
      );
      setJournalEntries(data || []);
    } catch (error) {
      console.error('❌ Error fetching journal entries:', error);
      setJournalEntries([]);
    } finally {
      setJournalLoading(false);
    }
  };

  const handleSaveJournal = async () => {
    try {
      // Préparer les données à enregistrer (uniquement les colonnes qui existent dans la table)
      const journalData = {
        user_id: user.id,
        contenu: journalFormData.contenu || journalFormData.titre || '',
        thematique: journalFormData.thematique || null
      };

      // Ajouter les champs optionnels seulement s'ils ont des valeurs
      if (journalFormData.titre) {
        journalData.titre = journalFormData.titre;
      }

      console.log('💾 Données à enregistrer:', journalData);

      if (editingJournalId) {
        const { error } = await supabase
          .from('journal_transformation')
          .update(journalData)
          .eq('id', editingJournalId);

        if (error) {
          console.error('❌ Erreur lors de la mise à jour:', error);
          throw error;
        }
        // Toast supprimé
      } else {
        const { error } = await supabase
          .from('journal_transformation')
          .insert(journalData);

        if (error) {
          console.error('❌ Erreur lors de l\'insertion:', error);
          throw error;
        }
        // Toast supprimé
      }

      setIsJournalDialogOpen(false);
      setEditingJournalId(null);
      setJournalFormData({
        date_entree: new Date().toISOString().split('T')[0],
        titre: '',
        contenu: '',
        thematique: '',
        emotions: [],
        revelations: '',
        actions_prises: '',
        gratitude: '',
        prieres: '',
        tags: []
      });
      clearCache(`transformation_journal_${user.id}`);
      await fetchJournalEntries();
    } catch (error) {
      console.error('❌ Error saving journal:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder l\'entrée',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteJournal = (entry) => {
    setEntryToDelete(entry);
    setIsDeleteJournalDialogOpen(true);
  };

  const confirmDeleteJournal = async () => {
    if (!entryToDelete) return;

    try {
      const { error } = await supabase
        .from('journal_transformation')
        .delete()
        .eq('id', entryToDelete.id);

      if (error) {
        console.error('❌ Erreur lors de la suppression:', error);
        throw error;
      }

      // Toast supprimé

      setIsDeleteJournalDialogOpen(false);
      setEntryToDelete(null);
      clearCache(`transformation_journal_${user.id}`);
      await fetchJournalEntries();
    } catch (error) {
      console.error('❌ Error deleting journal:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer l\'entrée',
        variant: 'destructive'
      });
    }
  };

  const handleEditJournal = (entry) => {
    setEditingJournalId(entry.id);
    setJournalFormData({
      date_entree: entry.date_entree,
      titre: entry.titre || '',
      contenu: entry.contenu,
      thematique: entry.thematique || '',
      emotions: entry.emotions || [],
      revelations: entry.revelations || '',
      actions_prises: entry.actions_prises || '',
      gratitude: entry.gratitude || '',
      prieres: entry.prieres || '',
      tags: entry.tags || []
    });
    setIsJournalDialogOpen(true);
  };

  // Fonction de filtrage pour le journal
  const getFilteredJournalEntries = () => {
    return journalEntries.filter(entry => {
      // Filtre par recherche textuelle
      if (journalSearchQuery) {
        const query = journalSearchQuery.toLowerCase();
        const titre = (entry.titre || '').toLowerCase();
        const contenu = (entry.contenu || '').toLowerCase();
        if (!titre.includes(query) && !contenu.includes(query)) {
          return false;
        }
      }

      // Filtre par thématique
      if (journalFilterThematique !== 'toutes' && entry.thematique !== journalFilterThematique) {
        return false;
      }

      // Filtre par date début
      if (journalFilterDateDebut) {
        const entryDate = new Date(entry.date_entree);
        const filterDate = new Date(journalFilterDateDebut);
        if (entryDate < filterDate) {
          return false;
        }
      }

      // Filtre par date fin
      if (journalFilterDateFin) {
        const entryDate = new Date(entry.date_entree);
        const filterDate = new Date(journalFilterDateFin);
        if (entryDate > filterDate) {
          return false;
        }
      }

      return true;
    });
  };

  // Thématiques prédéfinies
  const THEMATIQUES_PREDEFINIES = [
    'Discipolat',
    'Guérison',
    'Finances',
    'Relations',
    'Prière',
    'Parole de Dieu',
    'Ministère',
    'Évangélisation',
    'Famille',
    'Travail',
    'Santé',
    'Confiance en soi',
    'ImpactX',
    'Restauration de l\'âme',
    'Transformation'
  ];

  // Obtenir les thématiques uniques pour le filtre (prédéfinies + celles des entrées existantes)
  const getUniqueThematiques = () => {
    // Récupérer les thématiques des entrées existantes
    let thematiquesEntrees = [];
    if (journalEntries && journalEntries.length > 0) {
      const allThematiques = journalEntries.map(entry => entry?.thematique);
      thematiquesEntrees = allThematiques
        .filter(thematique => thematique && typeof thematique === 'string' && thematique.trim() !== '');
    }
    
    // Combiner les thématiques prédéfinies avec celles des entrées
    const toutesThematiques = [...new Set([...THEMATIQUES_PREDEFINIES, ...thematiquesEntrees])];
    
    // Trier par ordre alphabétique
    return toutesThematiques.sort((a, b) => a.localeCompare(b, 'fr'));
  };

  // Fonction de filtrage pour les évaluations
  const getFilteredEvaluations = () => {
    return evaluations.filter(evaluation => {
      // Filtre par domaine
      if (evaluationFilterDomaine !== 'tous' && evaluation.domaine_evalue !== evaluationFilterDomaine) {
        return false;
      }

      // Filtre par type
      if (evaluationFilterType !== 'tous' && evaluation.type_evaluation !== evaluationFilterType) {
        return false;
      }

      // Filtre par date début
      if (evaluationFilterDateDebut) {
        const evalDate = new Date(evaluation.date_evaluation);
        const filterDate = new Date(evaluationFilterDateDebut);
        if (evalDate < filterDate) {
          return false;
        }
      }

      // Filtre par date fin
      if (evaluationFilterDateFin) {
        const evalDate = new Date(evaluation.date_evaluation);
        const filterDate = new Date(evaluationFilterDateFin);
        if (evalDate > filterDate) {
          return false;
        }
      }

      return true;
    });
  };

  // Fonction helper pour obtenir le label d'un domaine
  const getDomaineLabelForStats = (domaine) => {
    const labels = {
      'relation_dieu': 'Relation avec Dieu',
      'priere': 'Prière',
      'parole': 'Parole de Dieu',
      'service': 'Service',
      'communaute': 'Communauté',
      'temperament': 'Tempérament',
      'finances': 'Finances',
      'sante': 'Santé',
      'relations': 'Relations',
      'autre': 'Autre'
    };
    return labels[domaine] || domaine.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Fonction pour récupérer les statistiques
  // Récupère toujours les données depuis la base de données pour avoir les données les plus récentes
  const fetchStatsData = async () => {
    if (!user) return;
    
    try {
      setStatsLoading(true);
      
      // TOUJOURS récupérer les données depuis la base de données pour avoir les données les plus récentes
      // Cela garantit que "Parcours Complétés" utilise les données les plus à jour
      console.log('📊 Récupération des données depuis la base de données pour les statistiques');
      
      const { data, error: progError } = await supabase
        .from('user_parcours_progression')
        .select(`
          *,
          parcours_transformation (
            nom,
            categorie
          )
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (progError) {
        console.error('❌ Erreur récupération progressions:', progError);
        throw progError;
      }
      const progressions = data || [];
      
      console.log('📊 Progressions utilisées pour les statistiques (depuis Mes Formations):', progressions?.length || 0);
      if (progressions && progressions.length > 0) {
        console.log('📋 Détails des progressions:');
        progressions.forEach(p => {
          console.log(`  - ${p.parcours_transformation?.nom || 'Sans nom'}: statut=${p.statut}, progression=${p.progression_pourcentage}%, modules=${p.modules_completes}`);
        });
      }

      // Récupérer les modules complétés
      // Exclure les progressions avec statut 'abandonne' ou supprimées
      const progressionsActives = progressions?.filter(p => 
        p.statut !== 'abandonne' && p.statut !== 'supprime'
      ) || [];
      const progressionIds = progressionsActives.map(p => p.id);
      let modulesCompletes = [];
      if (progressionIds.length > 0) {
        const { data: modData, error: modError } = await supabase
          .from('user_module_progression')
          .select('*')
          .in('progression_id', progressionIds)
          .eq('est_complete', true);

        if (modError) throw modError;
        modulesCompletes = modData || [];
      }
      
      console.log('📊 Modules complétés calculés pour progressions actives:', modulesCompletes.length, '(progressions actives:', progressionsActives.length, '/ total:', progressions?.length || 0, ')');

      // DÉSACTIVÉ TEMPORAIREMENT : Vérification et correction des parcours complétés
      // Cette logique cause une erreur de contrainte CHECK, donc on la désactive pour l'instant
      // Le statut sera mis à jour directement dans ParcoursDetail.jsx quand un module est complété
      console.log('⚠️ Vérification et correction des parcours complétés DÉSACTIVÉE (pour éviter l\'erreur de contrainte CHECK)');
      /*
      console.log('🔍 Vérification et correction des parcours complétés...');
      for (const progression of progressions || []) {
        if (progression.statut !== 'termine') {
          // Récupérer tous les modules du parcours
          const { data: parcoursModules, error: modulesError } = await supabase
            .from('modules_parcours')
            .select('id')
            .eq('parcours_id', progression.parcours_id)
            .eq('statut', 'actif');

          if (modulesError) {
            console.error('❌ Erreur récupération modules:', modulesError);
            continue;
          }

          const totalModules = parcoursModules?.length || 0;
          if (totalModules === 0) continue;

          // Compter les modules complétés pour cette progression
          const completedModulesForProgression = modulesCompletes.filter(
            m => m.progression_id === progression.id
          );
          const completedCount = completedModulesForProgression.length;

          console.log(`🔍 Vérification parcours "${progression.parcours_transformation?.nom || progression.parcours_id}":`);
          console.log(`  - Total modules: ${totalModules}`);
          console.log(`  - Modules complétés: ${completedCount}`);
          console.log(`  - Statut actuel: ${progression.statut}`);
          console.log(`  - Progression: ${progression.progression_pourcentage}%`);

          // Si tous les modules sont complétés, mettre à jour le statut
          if (completedCount === totalModules && totalModules > 0) {
            console.log(`✅ Parcours "${progression.parcours_transformation?.nom || progression.parcours_id}" a tous ses modules complétés (${completedCount}/${totalModules}), mise à jour du statut...`);
            
            // Ne pas inclure modules_completes car cela cause une erreur "expected JSON array"
            const { error: updateError } = await supabase
              .from('user_parcours_progression')
              .update({
                statut: 'termine',
                progression_pourcentage: 100,
                updated_at: new Date().toISOString()
              })
              .eq('id', progression.id);

            if (updateError) {
              console.error(`❌ Erreur mise à jour parcours ${progression.id}:`, updateError);
            } else {
              console.log(`✅ Statut du parcours ${progression.id} mis à jour à "termine"`);
              // Mettre à jour la progression locale
              progression.statut = 'termine';
              progression.progression_pourcentage = 100;
              progression.modules_completes = totalModules;
            }
          }
        }
      }
      */

      // Récupérer les évaluations
      const { data: evals, error: evalError } = await supabase
        .from('evaluations_croissance')
        .select('*')
        .eq('user_id', user.id)
        .order('date_evaluation', { ascending: false });

      if (evalError) throw evalError;

      // Calculer les statistiques
      console.log('📊 Calcul des statistiques...');
      console.log('📋 Toutes les progressions récupérées:', progressions?.length || 0);
      console.log('📋 Détails de toutes les progressions:', progressions?.map(p => ({
        id: p.id,
        parcours_nom: p.parcours_transformation?.nom,
        statut: p.statut,
        progression_pourcentage: p.progression_pourcentage,
        modules_completes: p.modules_completes
      })) || []);
      
      // DEBUG: Vérifier les statuts uniques trouvés
      const statutsUniques = [...new Set(progressions?.map(p => p.statut) || [])];
      console.log('🔍 Statuts uniques trouvés dans toutes les progressions:', statutsUniques);
      
      // Vérifier si tous les modules sont complétés pour chaque progression active
      // Cela permet de compter les formations complétées même si le statut n'est pas encore "termine" dans la DB
      const parcoursCompletesVerifies = [];
      for (const progression of progressionsActives) {
        // Si le statut est déjà "termine", l'inclure directement
        if (progression.statut === 'termine') {
          parcoursCompletesVerifies.push(progression.id);
          continue;
        }
        
        // Sinon, vérifier si tous les modules sont complétés
        try {
          // Récupérer le nombre total de modules du parcours
          const { data: modulesData, error: modulesError } = await supabase
            .from('modules_parcours')
            .select('id')
            .eq('parcours_id', progression.parcours_id)
            .eq('statut', 'actif');
          
          if (!modulesError && modulesData && modulesData.length > 0) {
            const totalModules = modulesData.length;
            
            // Récupérer le nombre de modules complétés pour cette progression
            const completedModulesForProgression = modulesCompletes.filter(
              m => m.progression_id === progression.id
            );
            const completedCount = completedModulesForProgression.length;
            
            // Si tous les modules sont complétés, considérer le parcours comme complété
            if (completedCount === totalModules && totalModules > 0) {
              console.log(`✅ Parcours "${progression.parcours_transformation?.nom || progression.parcours_id}" a tous ses modules complétés (${completedCount}/${totalModules}), considéré comme complété`);
              parcoursCompletesVerifies.push(progression.id);
              
              // Corriger le statut dans la DB si nécessaire
              if (progression.statut !== 'termine' || progression.progression_pourcentage !== 100) {
                console.log(`🔧 Correction automatique du statut pour le parcours ${progression.id}...`);
                
                // Si le statut est "abandonne", on le remet d'abord à "en_cours"
                if (progression.statut === 'abandonne') {
                  await supabase
                    .from('user_parcours_progression')
                    .update({
                      statut: 'en_cours',
                      progression_pourcentage: 100,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', progression.id);
                  
                  await new Promise(resolve => setTimeout(resolve, 200));
                }
                
                // Mettre à jour à "termine"
                const { error: updateError } = await supabase
                  .from('user_parcours_progression')
                  .update({
                    statut: 'termine',
                    progression_pourcentage: 100,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', progression.id);
                
                if (updateError) {
                  console.error(`❌ Erreur correction progression ${progression.id}:`, updateError);
                } else {
                  console.log(`✅ Progression ${progression.id} corrigée: statut mis à "termine"`);
                  // Mettre à jour localement
                  progression.statut = 'termine';
                  progression.progression_pourcentage = 100;
                }
              }
            }
          }
        } catch (error) {
          console.error(`❌ Erreur vérification modules pour progression ${progression.id}:`, error);
        }
      }
      
      // Compter les parcours complétés (ceux avec statut "termine" OU tous les modules complétés)
      const parcoursCompletes = parcoursCompletesVerifies.length;
      const parcoursEnCours = progressionsActives.filter(p => p.statut === 'en_cours' && !parcoursCompletesVerifies.includes(p.id)).length || 0;
      
      console.log('📊 Parcours complétés (vérifiés):', parcoursCompletes);
      console.log('📊 Parcours en cours:', parcoursEnCours);
      
      // DEBUG: Vérifier aussi les parcours avec progression 100% mais statut différent (hors abandonnés)
      const parcours100Pourcent = progressionsActives.filter(p => p.progression_pourcentage === 100 && p.statut !== 'termine' && !parcoursCompletesVerifies.includes(p.id)) || [];
      if (parcours100Pourcent.length > 0) {
        console.warn('⚠️ ATTENTION: Parcours à 100% mais statut différent de "termine":', parcours100Pourcent.map(p => ({
          nom: p.parcours_transformation?.nom,
          statut: p.statut,
          progression: p.progression_pourcentage
        })));
        
        // CORRECTION AUTOMATIQUE : Mettre à jour le statut des parcours à 100% qui ne sont pas marqués comme 'termine'
        console.log('🔧 Correction automatique des parcours à 100% avec statut incorrect...');
        for (const parcours of parcours100Pourcent) {
          try {
            console.log(`🔧 Correction du parcours "${parcours.parcours_transformation?.nom || parcours.parcours_id}"...`);
            const { error: fixError } = await supabase
              .from('user_parcours_progression')
              .update({
                statut: 'termine',
                progression_pourcentage: 100,
                updated_at: new Date().toISOString()
              })
              .eq('id', parcours.id);
            
            if (fixError) {
              console.error(`❌ Erreur lors de la correction du parcours ${parcours.id}:`, fixError);
            } else {
              console.log(`✅ Parcours ${parcours.id} corrigé avec succès (statut mis à 'termine')`);
              // Mettre à jour la progression locale pour refléter le changement
              parcours.statut = 'termine';
            }
          } catch (error) {
            console.error(`❌ Erreur lors de la correction du parcours ${parcours.id}:`, error);
          }
        }
        
        // Recompter les parcours complétés après correction
        const parcoursCompletesApresCorrection = progressionsActives.filter(p => p.statut === 'termine').length || 0;
        console.log('✅ Parcours complétés après correction:', parcoursCompletesApresCorrection);
      }
      
      // Afficher les détails des parcours en cours (hors abandonnés)
      const parcoursEnCoursList = progressionsActives.filter(p => p.statut === 'en_cours') || [];
      console.log('📚 PARCOURS EN COURS (statut="en_cours"):', parcoursEnCours, 'parcours');
      if (parcoursEnCoursList.length > 0) {
        console.log('📋 Détails des parcours en cours:');
        parcoursEnCoursList.forEach(p => {
          console.log(`  - ${p.parcours_transformation?.nom || 'Sans nom'}: statut="${p.statut}", progression=${p.progression_pourcentage}%`);
        });
      }
      
      // Afficher les détails des parcours complétés (vérifiés)
      const parcoursCompletesList = progressionsActives.filter(p => parcoursCompletesVerifies.includes(p.id)) || [];
      console.log('✅ PARCOURS COMPLÉTÉS (vérifiés - statut="termine" OU tous modules complétés):', parcoursCompletes, 'parcours');
      if (parcoursCompletesList.length > 0) {
        console.log('📋 Détails des parcours complétés:');
        parcoursCompletesList.forEach(p => {
          console.log(`  - ${p.parcours_transformation?.nom || 'Sans nom'}: statut="${p.statut}", progression=${p.progression_pourcentage}%`);
        });
      } else {
        console.log('⚠️ Aucun parcours complété trouvé');
        // Afficher tous les statuts uniques pour debug (progressions actives uniquement)
        const statutsUniquesActives = [...new Set(progressionsActives.map(p => p.statut) || [])];
        console.log('📊 Statuts uniques trouvés dans les progressions actives:', statutsUniquesActives);
        // Chercher les parcours actifs avec progression 100%
        const parcours100PourcentActifs = progressionsActives.filter(p => p.progression_pourcentage === 100) || [];
        console.log('🔍 Parcours actifs avec progression_pourcentage=100%:', parcours100PourcentActifs.length);
        if (parcours100PourcentActifs.length > 0) {
          console.log('📋 Détails des parcours actifs à 100% (mais statut différent de "termine"):');
          parcours100PourcentActifs.forEach(p => {
            console.log(`  - ${p.parcours_transformation?.nom || 'Sans nom'}: statut="${p.statut}", progression=${p.progression_pourcentage}%`);
          });
        }
      }
      
      // Calculer la progression moyenne uniquement pour les progressions actives (hors abandonnés)
      const progressionMoyenne = progressionsActives.length > 0
        ? Math.round(progressionsActives.reduce((sum, p) => sum + (p.progression_pourcentage || 0), 0) / progressionsActives.length)
        : 0;
      const modulesCompletesCount = modulesCompletes?.length || 0;
      const evaluationsCount = evals?.length || 0;
      
      // Récupérer les entrées de journal
      const { data: journalData, error: journalError } = await supabase
        .from('journal_transformation')
        .select('id')
        .eq('user_id', user.id);
      
      if (journalError) throw journalError;
      const journalEntriesCount = journalData?.length || 0;

      // Progression par catégorie (uniquement pour les progressions actives)
      const progressionParCategorie = {};
      progressionsActives.forEach(p => {
        const categorie = p.parcours_transformation?.categorie || 'autre';
        if (!progressionParCategorie[categorie]) {
          progressionParCategorie[categorie] = { total: 0, completes: 0, progression: 0 };
        }
        progressionParCategorie[categorie].total++;
        if (p.statut === 'termine') progressionParCategorie[categorie].completes++;
        progressionParCategorie[categorie].progression += p.progression_pourcentage || 0;
      });

      const progressionParCategorieArray = Object.entries(progressionParCategorie).map(([categorie, data]) => ({
        categorie: getCategorieInfo(categorie).label,
        total: data.total,
        completes: data.completes,
        progression: Math.round(data.progression / data.total)
      }));

      // Progression par mois (6 derniers mois)
      const progressionParMois = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        
        const progressionsMois = progressions?.filter(p => {
          const dateDebut = p.date_debut ? new Date(p.date_debut) : null;
          return dateDebut && dateDebut >= monthStart && dateDebut <= monthEnd;
        }) || [];

        progressionParMois.push({
          mois: format(monthDate, 'MMM yyyy', { locale: fr }),
          parcours: progressionsMois.length,
          progression: progressionsMois.length > 0
            ? Math.round(progressionsMois.reduce((sum, p) => sum + (p.progression_pourcentage || 0), 0) / progressionsMois.length)
            : 0
        });
      }

      // Scores des évaluations dans le temps
      const scoresEvaluations = evals?.map(evaluation => ({
        date: format(new Date(evaluation.date_evaluation), 'dd MMM yyyy', { locale: fr }),
        score: evaluation.score,
        domaine: getDomaineLabelForStats(evaluation.domaine_evalue)
      })) || [];

      // =========================
      // Participants par parcours (vue globale)
      // =========================
      // 1) Toutes les progressions (tous les disciples)
      const { data: allProgressions, error: allProgError } = await supabase
        .from('user_parcours_progression')
        .select(`
          id,
          user_id,
          statut,
          parcours_id,
          parcours_transformation (
            nom
          )
        `);

      if (allProgError) throw allProgError;

      const { data: disciplesData, error: disciplesError } = await supabase
        .from('profils')
        .select('id, first_name, last_name, mentor_id');

      if (disciplesError) throw disciplesError;

      const discipleNameByUserId = new Map();
      (disciplesData || []).forEach((disciple) => {
        const fullName = `${(disciple.first_name || '')} ${(disciple.last_name || '')}`.trim() || 'Disciple';
        discipleNameByUserId.set(disciple.id, fullName);
        if (disciple.mentor_id) {
          discipleNameByUserId.set(disciple.mentor_id, discipleNameByUserId.get(disciple.mentor_id) || fullName);
        }
      });

      const completesMap = new Map();
      const enCoursMap = new Map();

      // Vérifier pour chaque progression si tous les modules sont complétés
      // Cela permet d'inclure les parcours complétés même si le statut n'est pas encore "termine" dans la DB
      const progressionsCompletesVerifiees = new Set();
      
      // Récupérer tous les modules complétés pour toutes les progressions
      const allProgressionIds = (allProgressions || []).map(p => p.id);
      let allModulesCompletes = [];
      if (allProgressionIds.length > 0) {
        const { data: allModData, error: allModError } = await supabase
          .from('user_module_progression')
          .select('progression_id, module_id')
          .in('progression_id', allProgressionIds)
          .eq('est_complete', true);
        
        if (!allModError && allModData) {
          allModulesCompletes = allModData || [];
        }
      }
      
      // Récupérer tous les modules de tous les parcours pour vérifier la complétion
      const allParcoursIds = [...new Set((allProgressions || []).map(p => p.parcours_id))];
      const parcoursModulesMap = new Map();
      if (allParcoursIds.length > 0) {
        const { data: allParcoursModules, error: parcoursModError } = await supabase
          .from('modules_parcours')
          .select('id, parcours_id')
          .in('parcours_id', allParcoursIds)
          .eq('statut', 'actif');
        
        if (!parcoursModError && allParcoursModules) {
          (allParcoursModules || []).forEach(module => {
            if (!parcoursModulesMap.has(module.parcours_id)) {
              parcoursModulesMap.set(module.parcours_id, []);
            }
            parcoursModulesMap.get(module.parcours_id).push(module.id);
          });
        }
      }

      (allProgressions || []).forEach((p) => {
        const name = discipleNameByUserId.get(p.user_id);
        if (!name) return;

        const parcoursId = p.parcours_id;
        const parcoursNom = p.parcours_transformation?.nom || 'Parcours';

        // Vérifier si tous les modules sont complétés
        const totalModules = parcoursModulesMap.get(parcoursId)?.length || 0;
        let isAllModulesCompleted = false;
        
        if (totalModules > 0) {
          const completedModulesForProgression = allModulesCompletes.filter(
            m => m.progression_id === p.id
          );
          const completedCount = completedModulesForProgression.length;
          isAllModulesCompleted = completedCount === totalModules;
        }

        let targetMap = null;
        
        // PARCOURS COMPLÉTÉS : uniquement ceux qui sont terminés
        // - Statut = 'termine' OU tous les modules complétés
        if (p.statut === 'termine' || isAllModulesCompleted) {
          targetMap = completesMap;
          progressionsCompletesVerifiees.add(p.id);
        }
        // PARCOURS EN COURS : uniquement ceux qui sont démarrés mais pas terminés
        // - Statut = 'en_cours' ET pas tous les modules complétés
        else if (p.statut === 'en_cours' && !isAllModulesCompleted) {
          targetMap = enCoursMap;
        }
        // Ignorer les autres statuts (inscrit, suspendu, abandonne, etc.)
        else {
          return;
        }

        if (!targetMap) return;

        if (!targetMap.has(parcoursId)) {
          targetMap.set(parcoursId, {
            parcoursId,
            parcoursNom,
            participants: new Set()
          });
        }

        const entry = targetMap.get(parcoursId);
        entry.participants.add(name);
      });

      const mapToArray = (map) =>
        Array.from(map.values()).map((entry) => ({
          parcoursId: entry.parcoursId,
          parcoursNom: entry.parcoursNom,
          participants: Array.from(entry.participants).sort((a, b) =>
            a.localeCompare(b, 'fr'),
          )
        }));

      // Calculer les top 5 avant de mettre à jour statsData
      // Compter le nombre total de participants par formation (toutes progressions confondues)
      const formationsStats = new Map();
      
      (allProgressions || []).forEach((p) => {
        const parcoursId = p.parcours_id;
        const parcoursNom = p.parcours_transformation?.nom || 'Parcours';
        
        if (!formationsStats.has(parcoursId)) {
          formationsStats.set(parcoursId, {
            parcoursId,
            parcoursNom,
            totalParticipants: 0,
            participantsTermines: 0
          });
        }
        
        const stat = formationsStats.get(parcoursId);
        stat.totalParticipants++;
        
        // Vérifier si cette progression est terminée
        const totalModules = parcoursModulesMap.get(parcoursId)?.length || 0;
        let isCompleted = false;
        
        if (p.statut === 'termine') {
          isCompleted = true;
        } else if (totalModules > 0) {
          const completedModulesForProgression = allModulesCompletes.filter(
            m => m.progression_id === p.id
          );
          const completedCount = completedModulesForProgression.length;
          isCompleted = completedCount === totalModules;
        }
        
        if (isCompleted) {
          stat.participantsTermines++;
        }
      });
      
      // Convertir en tableau et calculer les pourcentages
      const formationsArray = Array.from(formationsStats.values()).map(formation => ({
        ...formation,
        pourcentageTermines: formation.totalParticipants > 0
          ? Math.round((formation.participantsTermines / formation.totalParticipants) * 100)
          : 0
      }));
      
      // Trier et prendre le top 3
      const top3Suivies = [...formationsArray]
        .sort((a, b) => b.totalParticipants - a.totalParticipants)
        .slice(0, 3)
        .map((formation, index) => ({
          ...formation,
          rang: index + 1
        }));
      
      const top3Terminees = [...formationsArray]
        .filter(f => f.participantsTermines > 0)
        .sort((a, b) => b.participantsTermines - a.participantsTermines)
        .slice(0, 3)
        .map((formation, index) => ({
          ...formation,
          rang: index + 1
        }));

      setStatsData({
        parcoursCompletes,
        parcoursEnCours,
        progressionMoyenne,
        modulesCompletes: modulesCompletesCount,
        evaluationsCount,
        journalEntriesCount,
        progressionParCategorie: progressionParCategorieArray,
        progressionParMois,
        scoresEvaluations,
        top5FormationsSuivies: top3Suivies,
        top5FormationsTerminees: top3Terminees
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les statistiques',
        variant: 'destructive'
      });
    } finally {
      setStatsLoading(false);
    }
  };

  // Fonction pour ouvrir le détail d'une statistique
  const handleOpenStatsDetail = async (type) => {
    if (!user) return;
    
    try {
      let items = [];
      let title = '';
      
      // Récupérer les progressions avec les détails des parcours
      const { data: progressions, error } = await supabase
        .from('user_parcours_progression')
        .select(`
          *,
          parcours_transformation (
            nom,
            categorie
          )
        `)
        .eq('user_id', user.id)
        .order('date_debut', { ascending: false });

      if (error) throw error;

      switch (type) {
        case 'parcours-completes':
          // Récupérer tous les modules complétés pour vérifier la complétion
          const progressionIds = progressions?.map(p => p.id) || [];
          let allModulesCompletes = [];
          if (progressionIds.length > 0) {
            const { data: modData } = await supabase
              .from('user_module_progression')
              .select('progression_id, module_id')
              .in('progression_id', progressionIds)
              .eq('est_complete', true);
            allModulesCompletes = modData || [];
          }
          
          // Récupérer tous les modules de tous les parcours
          const allParcoursIds = [...new Set(progressions?.map(p => p.parcours_id) || [])];
          const parcoursModulesMap = new Map();
          if (allParcoursIds.length > 0) {
            const { data: parcoursModules } = await supabase
              .from('modules_parcours')
              .select('id, parcours_id')
              .in('parcours_id', allParcoursIds)
              .eq('statut', 'actif');
            
            if (parcoursModules) {
              parcoursModules.forEach(module => {
                if (!parcoursModulesMap.has(module.parcours_id)) {
                  parcoursModulesMap.set(module.parcours_id, []);
                }
                parcoursModulesMap.get(module.parcours_id).push(module.id);
              });
            }
          }
          
          // Filtrer les parcours complétés (statut 'termine' OU tous les modules complétés)
          const completesProgressions = progressions?.filter(p => {
            if (p.statut === 'termine') return true;
            
            // Vérifier si tous les modules sont complétés
            const totalModules = parcoursModulesMap.get(p.parcours_id)?.length || 0;
            if (totalModules > 0) {
              const completedModulesForProgression = allModulesCompletes.filter(
                m => m.progression_id === p.id
              );
              const completedCount = completedModulesForProgression.length;
              return completedCount === totalModules;
            }
            return false;
          }) || [];
          
          items = completesProgressions.map(p => ({
            nom: p.parcours_transformation?.nom || 'Parcours sans nom',
            date_debut: p.date_debut ? format(new Date(p.date_debut), 'dd MMMM yyyy', { locale: fr }) : 'Non définie',
            date_fin: p.date_fin_reelle ? format(new Date(p.date_fin_reelle), 'dd MMMM yyyy', { locale: fr }) : 
                     (p.date_fin ? format(new Date(p.date_fin), 'dd MMMM yyyy', { locale: fr }) : 'Non définie'),
            statut: 'Terminé',
            progression: p.progression_pourcentage || 100
          }));
          title = 'Parcours Complétés';
          // Stocker les données brutes pour générer les certificats
          setStatsDetailData({
            type,
            title,
            items,
            rawData: completesProgressions
          });
          setIsStatsDetailDialogOpen(true);
          return; // Sortir de la fonction ici
          
        case 'parcours-en-cours':
          items = progressions
            ?.filter(p => p.statut === 'en_cours')
            .map(p => ({
              nom: p.parcours_transformation?.nom || 'Parcours sans nom',
              date_debut: p.date_debut ? format(new Date(p.date_debut), 'dd MMMM yyyy', { locale: fr }) : 'Non définie',
              date_fin: p.date_fin ? format(new Date(p.date_fin), 'dd MMMM yyyy', { locale: fr }) : 'En cours',
              statut: 'En cours',
              progression: p.progression_pourcentage || 0
            })) || [];
          title = 'Parcours en Cours';
          break;
          
        case 'modules-completes':
          // Récupérer les modules complétés avec les détails des parcours
          const moduleProgressionIds = progressions?.map(p => p.id) || [];
          if (moduleProgressionIds.length > 0) {
            const { data: modulesData, error: modError } = await supabase
              .from('user_module_progression')
              .select(`
                *,
                modules_parcours (
                  titre
                )
              `)
              .eq('est_complete', true)
              .in('progression_id', moduleProgressionIds);

            if (modError) throw modError;
            
            // Mapper les modules avec les informations des progressions
            items = modulesData?.map(m => {
              const progression = progressions?.find(p => p.id === m.progression_id);
              return {
                nom: m.modules_parcours?.titre || 'Module sans nom',
                parcours_nom: progression?.parcours_transformation?.nom || 'Parcours sans nom',
                date_debut: progression?.date_debut 
                  ? format(new Date(progression.date_debut), 'dd MMMM yyyy', { locale: fr }) 
                  : 'Non définie',
                date_fin: m.date_completion 
                  ? format(new Date(m.date_completion), 'dd MMMM yyyy', { locale: fr }) 
                  : 'Non définie',
                statut: progression?.statut === 'termine' ? 'Terminé' : 'En cours'
              };
            }) || [];
          }
          title = 'Modules Complétés';
          break;
          
        case 'evaluations':
          const { data: evals, error: evalError } = await supabase
            .from('evaluations_croissance')
            .select('*')
            .eq('user_id', user.id)
            .order('date_evaluation', { ascending: false });

          if (evalError) throw evalError;
          
          items = evals?.map(e => ({
            nom: getDomaineLabelForStats(e.domaine_evalue),
            date_debut: format(new Date(e.date_evaluation), 'dd MMMM yyyy', { locale: fr }),
            date_fin: format(new Date(e.date_evaluation), 'dd MMMM yyyy', { locale: fr }),
            statut: 'Terminé',
            score: e.score
          })) || [];
          title = 'Évaluations';
          break;
          
        case 'journal-entries':
          const { data: journalData, error: journalError } = await supabase
            .from('journal_transformation')
            .select('*')
            .eq('user_id', user.id)
            .order('date_entree', { ascending: false });

          if (journalError) throw journalError;
          
          items = journalData?.map(j => ({
            nom: j.titre || 'Entrée sans titre',
            date_debut: format(new Date(j.date_entree), 'dd MMMM yyyy', { locale: fr }),
            date_fin: format(new Date(j.date_entree), 'dd MMMM yyyy', { locale: fr }),
            statut: 'Terminé',
            thematique: j.thematique
          })) || [];
          title = 'Entrées Journal';
          break;
      }

      setStatsDetailData({
        type,
        title,
        items,
        rawData: [] // Pas de données brutes pour les autres types
      });
      setIsStatsDetailDialogOpen(true);
    } catch (error) {
      console.error('Erreur lors de la récupération des détails:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les détails',
        variant: 'destructive'
      });
    }
  };

  // Fonctions d'export et partage
  const handleExportCSV = () => {
    try {
      if (!statsData || Object.keys(statsData).length === 0) {
        console.error('❌ Aucune donnée à exporter');
        return;
      }

      const csvData = [
        ['Statistique', 'Valeur'],
        ['Parcours Complétés', statsData.parcoursCompletes || 0],
        ['Parcours en Cours', statsData.parcoursEnCours || 0],
        ['Progression Moyenne (%)', statsData.progressionMoyenne || 0],
        ['Modules Complétés', statsData.modulesCompletes || 0],
        ['Évaluations', statsData.evaluationsCount || 0],
        ['Entrées Journal', statsData.journalEntriesCount || 0]
      ];

      const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `statistiques_transformation_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ Export CSV réussi');
    } catch (error) {
      console.error('❌ Erreur lors de l\'export CSV:', error);
    }
  };

  const handleExportJSON = () => {
    try {
      if (!statsData || Object.keys(statsData).length === 0) {
        console.error('❌ Aucune donnée à exporter');
        return;
      }

      const jsonData = {
        date_export: new Date().toISOString(),
        statistiques: statsData
      };

      const jsonContent = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `statistiques_transformation_${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ Export JSON réussi');
    } catch (error) {
      console.error('❌ Erreur lors de l\'export JSON:', error);
    }
  };

  const handleShareProgression = async () => {
    try {
      if (!statsData || Object.keys(statsData).length === 0) {
        console.error('❌ Aucune donnée à partager');
        return;
      }

      const shareText = `📊 Ma progression sur DiscipleLife :
✅ ${statsData.parcoursCompletes || 0} parcours complétés
📚 ${statsData.parcoursEnCours || 0} parcours en cours
📈 ${statsData.progressionMoyenne || 0}% de progression moyenne
📖 ${statsData.modulesCompletes || 0} modules complétés
📝 ${statsData.evaluationsCount || 0} évaluations réalisées
✍️ ${statsData.journalEntriesCount || 0} entrées de journal`;

      console.log('🔍 Tentative de partage:', shareText);

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Ma progression DiscipleLife',
            text: shareText
          });
          console.log('✅ Partage réussi via Web Share API');
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.warn('⚠️ Partage Web Share API échoué, copie dans le presse-papiers:', error);
            // Copier dans le presse-papiers si le partage échoue
            try {
              await navigator.clipboard.writeText(shareText);
              console.log('✅ Texte copié dans le presse-papiers');
            } catch (clipboardError) {
              console.error('❌ Erreur lors de la copie dans le presse-papiers:', clipboardError);
            }
          } else {
            console.log('ℹ️ Partage annulé par l\'utilisateur');
          }
        }
      } else {
        console.log('ℹ️ Web Share API non disponible, copie dans le presse-papiers');
        // Fallback: copier dans le presse-papiers
        try {
          await navigator.clipboard.writeText(shareText);
          console.log('✅ Texte copié dans le presse-papiers');
        } catch (clipboardError) {
          console.error('❌ Erreur lors de la copie dans le presse-papiers:', clipboardError);
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors du partage:', error);
    }
  };

  // Fonction pour générer un certificat PDF
  const generateCertificatePDF = async (progressionData) => {
    try {
      // Récupérer le nom de l'utilisateur
      let userName = 'Disciple';
      
      const { data: profileData } = await supabase
        .from('profils')
        .select('first_name, last_name')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        userName = `${(profileData.first_name || '')} ${(profileData.last_name || '')}`.trim() || 'Disciple';
      }

      const parcoursNom = progressionData.parcours_transformation?.nom || 'Parcours de Transformation';
      const dateFin = progressionData.date_fin_reelle || progressionData.date_fin || new Date();
      const dateFinFormatted = format(new Date(dateFin), 'dd MMMM yyyy', { locale: fr });

      // Créer le PDF
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Couleurs
      const primaryColor = [147, 51, 234]; // Purple
      const secondaryColor = [59, 130, 246]; // Blue
      const textColor = [31, 41, 55]; // Gray-800

      // Fond gris très clair
      doc.setFillColor(248, 248, 248);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Bordure décorative
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(2);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

      // Titre principal
      doc.setFontSize(32);
      doc.setTextColor(...primaryColor);
      doc.setFont(undefined, 'bold');
      doc.text('CERTIFICAT DE COMPLÉTION', pageWidth / 2, 50, { align: 'center' });

      // Sous-titre
      doc.setFontSize(18);
      doc.setTextColor(...textColor);
      doc.setFont(undefined, 'normal');
      doc.text('de Formation DiscipleLife', pageWidth / 2, 65, { align: 'center' });

      // Ligne décorative
      doc.setDrawColor(...secondaryColor);
      doc.setLineWidth(1);
      doc.line(50, 75, pageWidth - 50, 75);

      // Texte principal
      doc.setFontSize(16);
      doc.setTextColor(...textColor);
      doc.setFont(undefined, 'normal');
      const text1 = 'Ceci certifie que';
      doc.text(text1, pageWidth / 2, 100, { align: 'center' });

      // Nom du disciple
      doc.setFontSize(24);
      doc.setTextColor(...primaryColor);
      doc.setFont(undefined, 'bold');
      doc.text(userName, pageWidth / 2, 120, { align: 'center' });

      // Texte de complétion
      doc.setFontSize(16);
      doc.setTextColor(...textColor);
      doc.setFont(undefined, 'normal');
      const text2 = 'a complété avec succès le parcours de formation';
      doc.text(text2, pageWidth / 2, 140, { align: 'center' });

      // Nom du parcours
      doc.setFontSize(20);
      doc.setTextColor(...primaryColor);
      doc.setFont(undefined, 'bold');
      // Gérer les noms longs
      const parcoursLines = doc.splitTextToSize(parcoursNom, pageWidth - 60);
      doc.text(parcoursLines, pageWidth / 2, 160, { align: 'center' });

      // Date
      doc.setFontSize(14);
      doc.setTextColor(...textColor);
      doc.setFont(undefined, 'normal');
      doc.text(`Date de complétion : ${dateFinFormatted}`, pageWidth / 2, 190, { align: 'center' });

      // Signature et sceau
      doc.setFontSize(12);
      doc.setTextColor(...textColor);
      doc.setFont(undefined, 'italic');
      doc.text('DiscipleLife - Transformation', pageWidth / 2, pageHeight - 30, { align: 'center' });

      // Numéro de certificat (optionnel)
      const certNumber = `CERT-${progressionData.id?.substring(0, 8).toUpperCase() || 'XXXX'}-${format(new Date(), 'yyyyMMdd')}`;
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(`N° ${certNumber}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

      // Sauvegarder le PDF
      const fileName = `Certificat_${parcoursNom.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      
      console.log('📄 Génération du certificat PDF pour:', userName, '-', parcoursNom);
      console.log('📄 Nom du fichier:', fileName);
      
      try {
        doc.save(fileName);
        console.log('✅ Certificat PDF généré et téléchargé avec succès');
      } catch (saveError) {
        console.error('❌ Erreur lors de la sauvegarde du PDF:', saveError);
        throw saveError;
      }

    } catch (error) {
      console.error('❌ Erreur lors de la génération du certificat:', error);
      toast({
        title: 'Erreur',
        description: `Impossible de générer le certificat PDF: ${error.message || 'Erreur inconnue'}`,
        variant: 'destructive'
      });
    }
  };

  // ========== FONCTIONS POUR LA VUE PAR DISCIPLE ==========
  const fetchDisciples = async () => {
    try {
      const { data, error } = await supabase
        .from('profils')
        .select('id, first_name, last_name, mentor_id')
        .order('first_name', { ascending: true });

      if (error) throw error;

      const disciplesList = (data || []).map(disciple => ({
        id: disciple.id,
        user_id: disciple.id,
        name: `${(disciple.first_name || '')} ${(disciple.last_name || '')}`.trim() || 'Disciple'
      }));

      setDisciples(disciplesList);
    } catch (error) {
      console.error('Erreur lors de la récupération des disciples:', error);
    }
  };

  const fetchDiscipleFormations = async (discipleUserId) => {
    if (!discipleUserId || !selectedDisciple) {
      console.error('❌ fetchDiscipleFormations: discipleUserId ou selectedDisciple est manquant');
      return;
    }

    try {
      setDiscipleFormationsLoading(true);
      
      // Réinitialiser les données avant de charger les nouvelles
      setDiscipleFormations({
        completes: [],
        enCours: []
      });

      console.log('🔍 Récupération des formations pour disciple:', selectedDisciple?.name);
      let query = supabase
        .from('user_parcours_progression')
        .select(`
          *,
          parcours_transformation (
            nom,
            categorie
          )
        `);

      // Source unique : profils. La progression est liée au disciple par user_id (= id du profil disciple).
      const targetUserId = selectedDisciple?.id || discipleUserId;
      query = query.eq('user_id', targetUserId);

      const { data: progressions, error: progError } = await query.order('date_debut', { ascending: false });

      if (progError) {
        console.error('❌ Erreur lors de la récupération des progressions:', progError);
        throw progError;
      }

      console.log(`✅ ${progressions?.length || 0} progressions trouvées pour user_id ${discipleUserId}`);
      if (progressions && progressions.length > 0) {
        console.log('📋 Détails des progressions:', progressions.map(p => ({
          id: p.id,
          parcours_id: p.parcours_id,
          nom: p.parcours_transformation?.nom,
          user_id: p.user_id
        })));
      }

      // Récupérer tous les modules complétés
      const progressionIds = progressions?.map(p => p.id) || [];
      let allModulesCompletes = [];
      if (progressionIds.length > 0) {
        const { data: modData } = await supabase
          .from('user_module_progression')
          .select('progression_id, module_id')
          .in('progression_id', progressionIds)
          .eq('est_complete', true);
        allModulesCompletes = modData || [];
      }

      // Récupérer tous les modules de tous les parcours
      const allParcoursIds = [...new Set(progressions?.map(p => p.parcours_id) || [])];
      const parcoursModulesMap = new Map();
      if (allParcoursIds.length > 0) {
        const { data: parcoursModules } = await supabase
          .from('modules_parcours')
          .select('id, parcours_id')
          .in('parcours_id', allParcoursIds)
          .eq('statut', 'actif');
        
        if (parcoursModules) {
          parcoursModules.forEach(module => {
            if (!parcoursModulesMap.has(module.parcours_id)) {
              parcoursModulesMap.set(module.parcours_id, []);
            }
            parcoursModulesMap.get(module.parcours_id).push(module.id);
          });
        }
      }

      // Séparer les formations complétées et en cours
      const completes = [];
      const enCours = [];

      (progressions || []).forEach(p => {
        const parcoursNom = p.parcours_transformation?.nom || 'Parcours sans nom';
        const totalModules = parcoursModulesMap.get(p.parcours_id)?.length || 0;
        let isCompleted = false;
        let progressionPourcentage = p.progression_pourcentage || 0;

        if (p.statut === 'termine') {
          isCompleted = true;
        } else if (totalModules > 0) {
          const completedModulesForProgression = allModulesCompletes.filter(
            m => m.progression_id === p.id
          );
          const completedCount = completedModulesForProgression.length;
          isCompleted = completedCount === totalModules;
          progressionPourcentage = Math.round((completedCount / totalModules) * 100);
        }

        const formationData = {
          id: p.id,
          parcours_id: p.parcours_id,
          nom: parcoursNom,
          date_debut: p.date_debut ? format(new Date(p.date_debut), 'dd MMMM yyyy', { locale: fr }) : 'Non définie',
          date_fin: p.date_fin_reelle ? format(new Date(p.date_fin_reelle), 'dd MMMM yyyy', { locale: fr }) : 
                   (p.date_fin ? format(new Date(p.date_fin), 'dd MMMM yyyy', { locale: fr }) : 'En cours'),
          progression: progressionPourcentage,
          statut: isCompleted ? 'Terminé' : 'En cours'
        };

        if (isCompleted) {
          completes.push(formationData);
        } else if (p.statut === 'en_cours' || p.statut === 'inscrit') {
          enCours.push(formationData);
        }
      });

      console.log(`📊 Formations récupérées pour user_id ${discipleUserId} - Complétées: ${completes.length}, En cours: ${enCours.length}`);

      setDiscipleFormations({
        completes,
        enCours
      });
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des formations du disciple:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer les formations du disciple',
        variant: 'destructive'
      });
    } finally {
      setDiscipleFormationsLoading(false);
    }
  };

  const handleDiscipleSelect = async (disciple) => {
    console.log('👤 Disciple sélectionné:', disciple);
    if (!disciple.user_id) {
      console.error('❌ Le disciple sélectionné n\'a pas de user_id:', disciple);
      toast({
        title: 'Erreur',
        description: 'Ce disciple n\'a pas d\'identifiant utilisateur associé',
        variant: 'destructive'
      });
      return;
    }
    
    setSelectedDisciple(disciple);
    setDiscipleSearchQuery(disciple.name);
    
    // Réinitialiser les formations avant de charger les nouvelles
    setDiscipleFormations({
      completes: [],
      enCours: []
    });
    
    await fetchDiscipleFormations(disciple.user_id);
    setIsDiscipleViewDialogOpen(true);
  };

  const filteredDisciples = disciples.filter(disciple =>
    disciple.name.toLowerCase().includes(discipleSearchQuery.toLowerCase())
  );

  // ========== FONCTIONS POUR LES ÉVALUATIONS ==========
  const fetchEvaluations = async () => {
    try {
      setEvaluationsLoading(true);
      const { data, error } = await supabase
        .from('evaluations_croissance')
        .select('*')
        .eq('user_id', user.id)
        .order('date_evaluation', { ascending: false })
        .limit(20);

      if (error) throw error;
      setEvaluations(data || []);
    } catch (error) {
      console.error('Error fetching evaluations:', error);
    } finally {
      setEvaluationsLoading(false);
    }
  };

  const handleSaveEvaluation = async () => {
    try {
      const { error } = await supabase
        .from('evaluations_croissance')
        .insert({
          ...evaluationFormData,
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Évaluation enregistrée',
      });

      setIsEvaluationDialogOpen(false);
      setEvaluationFormData({
        date_evaluation: new Date().toISOString().split('T')[0],
        type_evaluation: 'mensuelle',
        domaine_evalue: 'relation_dieu',
        score: 50,
        points_forts: [],
        axes_amelioration: [],
        notes: ''
      });
      await fetchEvaluations();
    } catch (error) {
      console.error('Error saving evaluation:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer l\'évaluation',
        variant: 'destructive'
      });
    }
  };

  // ========== FONCTIONS POUR LES RESSOURCES DE GUÉRISON ET RESTAURATION ==========
  const fetchRessourcesGuerison = async () => {
    try {
      setRessourcesGuerisonLoading(true);
      // Récupérer les ressources de la table resources avec filtre par catégorie de guérison/restauration
      // On peut aussi utiliser les parcours de restauration
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('resources')
        .select('*')
        .or('category.ilike.%guerison%,category.ilike.%restauration%,category.ilike.%guérison%,category.ilike.%restoration%,type.ilike.%guerison%,type.ilike.%restauration%')
        .order('created_at', { ascending: false });

      // Récupérer aussi les parcours de restauration
      const { data: parcoursRestauration, error: parcoursError } = await supabase
        .from('parcours_transformation')
        .select('*')
        .or('categorie.eq.restauration_ame,thematique.ilike.%guerison%,thematique.ilike.%restauration%,thematique.ilike.%guérison%,nom.ilike.%guerison%,nom.ilike.%restauration%,nom.ilike.%guérison%')
        .eq('statut', 'actif')
        .order('ordre_affichage', { ascending: true });

      if (resourcesError && resourcesError.code !== 'PGRST116') {
        console.error('Erreur récupération ressources:', resourcesError);
      }
      if (parcoursError) {
        console.error('Erreur récupération parcours restauration:', parcoursError);
      }

      // Combiner les ressources et les parcours
      const allRessources = [
        ...(resourcesData || []).map(r => ({
          ...r,
          type_resource: 'resource',
          id_resource: r.id
        })),
        ...(parcoursRestauration || []).map(p => ({
          ...p,
          type_resource: 'parcours',
          id_resource: p.id,
          title: p.nom,
          description: p.description,
          category: p.categorie || 'restauration_ame'
        }))
      ];

      setRessourcesGuerison(allRessources);
    } catch (error) {
      console.error('Error fetching ressources guérison:', error);
      setRessourcesGuerison([]);
    } finally {
      setRessourcesGuerisonLoading(false);
    }
  };

  // ========== FONCTIONS POUR LE SUIVI POST-CRISE ==========
  const fetchSuivisPostCrise = async () => {
    try {
      setSuivisPostCriseLoading(true);
      const { data, error } = await supabase
        .from('suivi_post_crise')
        .select('*')
        .eq('user_id', user.id)
        .order('date_debut', { ascending: false });

      if (error) throw error;
      setSuivisPostCrise(data || []);
    } catch (error) {
      console.error('Error fetching suivis post-crise:', error);
      setSuivisPostCrise([]);
    } finally {
      setSuivisPostCriseLoading(false);
    }
  };

  const fetchHistoriqueSuivi = async (suiviId) => {
    try {
      const { data, error } = await supabase
        .from('historique_guerison')
        .select('*')
        .eq('suivi_id', suiviId)
        .order('date_suivi', { ascending: false });

      if (error) throw error;
      setHistoriqueSuivi(data || []);
    } catch (error) {
      console.error('Error fetching historique:', error);
      setHistoriqueSuivi([]);
    }
  };

  const handleSaveSuivi = async () => {
    try {
      const suiviData = {
        ...suiviFormData,
        user_id: user.id,
        date_prochaine_action: suiviFormData.date_prochaine_action || null,
        objectifs: Array.isArray(suiviFormData.objectifs) ? suiviFormData.objectifs : [],
        besoins_specifiques: Array.isArray(suiviFormData.besoins_specifiques) ? suiviFormData.besoins_specifiques : [],
        ressources_utilisees: Array.isArray(suiviFormData.ressources_utilisees) ? suiviFormData.ressources_utilisees : []
      };

      if (editingSuiviId) {
        const { error } = await supabase
          .from('suivi_post_crise')
          .update(suiviData)
          .eq('id', editingSuiviId);

        if (error) throw error;
        toast({ title: 'Succès', description: 'Suivi mis à jour' });
      } else {
        const { error } = await supabase
          .from('suivi_post_crise')
          .insert([suiviData]);

        if (error) throw error;
        toast({ title: 'Succès', description: 'Suivi créé' });
      }

      setIsSuiviDialogOpen(false);
      setEditingSuiviId(null);
      setSuiviFormData({
        date_debut: new Date().toISOString().split('T')[0],
        type_crise: 'autre',
        description: '',
        gravite: 5,
        objectifs: [],
        etat_actuel: '',
        besoins_specifiques: [],
        ressources_utilisees: [],
        prochaine_action: '',
        date_prochaine_action: '',
        rappel_actif: true,
        frequence_rappels: 'hebdomadaire',
        statut: 'actif',
        notes: ''
      });
      await fetchSuivisPostCrise();
    } catch (error) {
      handleError(error, { context: 'handleSaveSuivi' }, "Impossible d'enregistrer le suivi.");
    }
  };

  const handleSaveHistorique = async () => {
    if (!selectedSuivi) return;

    try {
      const historiqueData = {
        ...historiqueFormData,
        suivi_id: selectedSuivi.id,
        versets_bibliques: Array.isArray(historiqueFormData.versets_bibliques) ? historiqueFormData.versets_bibliques : [],
        prieres_exaucees: Array.isArray(historiqueFormData.prieres_exaucees) ? historiqueFormData.prieres_exaucees : [],
        actions_prises: Array.isArray(historiqueFormData.actions_prises) ? historiqueFormData.actions_prises : []
      };

      const { error } = await supabase
        .from('historique_guerison')
        .insert([historiqueData]);

      if (error) throw error;

      toast({ title: 'Succès', description: 'Entrée d\'historique ajoutée' });
      setIsHistoriqueDialogOpen(false);
      setHistoriqueFormData({
        date_suivi: new Date().toISOString().split('T')[0],
        etat_mental: 5,
        etat_spirituel: 5,
        etat_physique: 5,
        progres_observes: '',
        defis_rencontres: '',
        victoires: '',
        versets_bibliques: [],
        prieres_exaucees: [],
        actions_prises: [],
        notes: ''
      });
      await fetchHistoriqueSuivi(selectedSuivi.id);
    } catch (error) {
      handleError(error, { context: 'handleSaveHistorique' }, "Impossible d'enregistrer l'historique.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Transformation | DiscipleLife</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="w-full max-w-[1800px] mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Transformation</h1>
                <p className="text-gray-600">Édifier, construire, guérir et transformer votre vie en Christ</p>
              </div>
              <div className="relative">
                <div className="relative">
                    <Input
                      type="text"
                      placeholder="Suivre un disciple : Taper son nom"
                      value={discipleSearchQuery}
                      onChange={(e) => setDiscipleSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (disciples.length === 0) {
                          fetchDisciples();
                        }
                      }}
                      className="w-64 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                    />
                  {discipleSearchQuery && filteredDisciples.length > 0 && !isDiscipleViewDialogOpen && (
                    <div className="absolute top-full left-0 w-64 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                      {filteredDisciples.map((disciple) => (
                        <button
                          key={disciple.id}
                          onClick={() => handleDiscipleSelect(disciple)}
                          className="w-full text-left px-4 py-2 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                        >
                          {disciple.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="nav-tabs-list grid w-full grid-cols-4 md:grid-cols-6 lg:grid-cols-8 bg-white mb-6 gap-1">
              <TabsTrigger 
                value="bibliotheque" 
                className="nav-tab hover:bg-purple-600 hover:text-white data-[state=active]:bg-purple-600 data-[state=active]:text-white focus:outline-none focus:ring-0 transition-colors"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Bibliothèque
              </TabsTrigger>
              <TabsTrigger 
                value="mes-formations" 
                className="nav-tab hover:bg-purple-600 hover:text-white data-[state=active]:bg-purple-600 data-[state=active]:text-white focus:outline-none focus:ring-0 transition-colors"
              >
                <Play className="w-4 h-4 mr-2" />
                Mes Formations
              </TabsTrigger>
              <TabsTrigger 
                value="progression" 
                className="nav-tab hover:bg-purple-600 hover:text-white data-[state=active]:bg-purple-600 data-[state=active]:text-white focus:outline-none focus:ring-0 transition-colors"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Mes Parcours
              </TabsTrigger>
              <TabsTrigger 
                value="journal" 
                className="nav-tab hover:bg-purple-600 hover:text-white data-[state=active]:bg-purple-600 data-[state=active]:text-white focus:outline-none focus:ring-0 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                Journal
              </TabsTrigger>
              <TabsTrigger 
                value="evaluations" 
                className="nav-tab hover:bg-purple-600 hover:text-white data-[state=active]:bg-purple-600 data-[state=active]:text-white focus:outline-none focus:ring-0 transition-colors"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Évaluations
              </TabsTrigger>
              <TabsTrigger 
                value="statistiques" 
                className="nav-tab hover:bg-purple-600 hover:text-white data-[state=active]:bg-purple-600 data-[state=active]:text-white focus:outline-none focus:ring-0 transition-colors"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Statistiques
              </TabsTrigger>
              <TabsTrigger 
                value="ressources-guerison" 
                className="nav-tab hover:bg-purple-600 hover:text-white data-[state=active]:bg-purple-600 data-[state=active]:text-white focus:outline-none focus:ring-0 transition-colors"
              >
                <Heart className="w-4 h-4 mr-2" />
                Guérison
              </TabsTrigger>
              <TabsTrigger 
                value="suivi-post-crise" 
                className="nav-tab hover:bg-purple-600 hover:text-white data-[state=active]:bg-purple-600 data-[state=active]:text-white focus:outline-none focus:ring-0 transition-colors"
                title="Suivi Post-Crise"
              >
                <Target className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Suivi Post-Crise</span>
                <span className="sm:hidden">Post-Crise</span>
              </TabsTrigger>
            </TabsList>
            <style jsx>{`
              .nav-tabs-list:hover .nav-tab[data-state="active"]:not(:hover) {
                background-color: transparent !important;
                color: rgb(75 85 99) !important;
              }
            `}</style>

            {/* Tab Content: Bibliothèque */}
            <TabsContent value="bibliotheque" className="space-y-6">
                {/* Filtres par catégorie */}
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Filtrer par catégorie</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedCategorie === 'toutes' ? 'default' : 'outline'}
                    size="sm"
                    className={
                      selectedCategorie === 'toutes'
                        ? 'bg-purple-600 text-white relative'
                        : 'bg-transparent border-gray-300 text-gray-700 hover:bg-gray-50 relative'
                    }
                    onClick={() => setSelectedCategorie('toutes')}
                  >
                    Toutes
                    {totalParcours > 0 && (
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                        selectedCategorie === 'toutes' 
                          ? 'bg-white/20 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {totalParcours}
                      </span>
                    )}
                  </Button>
                  {toutesCategories.map((cat) => {
                    const catInfo = getCategorieInfo(cat);
                    const count = getParcoursCountByCategorie(cat);
                    // Classes de hover dynamiques selon la catégorie
                    const hoverClasses = {
                      'identite_christ': 'hover:bg-blue-500 hover:text-white',
                      'fondements_royaume': 'hover:bg-purple-500 hover:text-white',
                      'restauration_ame': 'hover:bg-pink-500 hover:text-white',
                      'deploiement': 'hover:bg-green-500 hover:text-white',
                      'finances': 'hover:bg-yellow-500 hover:text-white',
                      'vie_famille': 'hover:bg-orange-500 hover:text-white',
                      'marcher_esprit': 'hover:bg-indigo-500 hover:text-white',
                      'discipolat': 'hover:bg-teal-500 hover:text-white'
                    };
                    return (
                      <Button
                        key={cat}
                        variant={selectedCategorie === cat ? 'default' : 'outline'}
                        size="sm"
                        className={
                          selectedCategorie === cat
                            ? `${catInfo.color} text-white relative`
                            : `bg-transparent ${catInfo.borderColor} ${catInfo.textColor} ${hoverClasses[cat] || 'hover:bg-gray-500 hover:text-white'} relative transition-colors duration-200`
                        }
                        onClick={() => setSelectedCategorie(cat)}
                      >
                        {catInfo.label}
                        <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                          selectedCategorie === cat 
                            ? 'bg-white/20 text-white' 
                            : count > 0 
                              ? `${catInfo.color} text-white` 
                              : 'bg-gray-200 text-gray-500'
                        }`}>
                          {count}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {parcoursLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : filteredParcours.length === 0 ? (
                <Card className="bg-white border-gray-200">
                  <CardContent className="py-12 text-center">
                    <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Aucun parcours disponible pour le moment</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredParcours.map((parcour) => {
                    const isInscrit = isParcoursInscrit(parcour.id);
                    const categorieInfo = getCategorieInfo(parcour.categorie);
                    return (
                      <motion.div
                        key={parcour.id}
                        whileHover={{ y: -4 }}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex flex-col gap-2">
                              {isInscrit && (
                                <Badge className="bg-green-500 text-white text-xs">
                                  Inscrit
                                </Badge>
                              )}
                              {parcour.niveau && (
                                <Badge className="bg-blue-100 text-blue-700 text-xs capitalize border-0">
                                  {parcour.niveau === 'debutant' ? 'Débutant' : 
                                   parcour.niveau === 'intermediaire' ? 'Intermédiaire' : 
                                   parcour.niveau === 'avance' ? 'Avancé' : parcour.niveau}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {parcour.categorie && (
                            <Badge className={`${categorieInfo.color} text-white text-xs mb-2`}>
                              {categorieInfo.label}
                            </Badge>
                          )}
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{parcour.nom}</h3>
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{parcour.description}</p>
                          <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {parcour.duree_jours} jours
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 bg-transparent border-purple-600 text-purple-600 hover:bg-purple-400 hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewParcours(parcour);
                              }}
                            >
                              Voir détails
                            </Button>
                            {isInscrit ? (
                              <Button
                                size="sm"
                                className="flex-1 bg-purple-600 text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartParcours(parcour.id);
                                }}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Continuer
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="flex-1 bg-purple-600 text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartParcours(parcour.id);
                                }}
                              >
                                Commencer
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Tab Content: Mes Formations */}
            <TabsContent value="mes-formations" className="space-y-6">
              {progressionLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : userProgression.filter(prog => prog.statut === 'en_cours' || prog.statut === 'inscrit' || prog.statut === 'termine').length === 0 ? (
                <Card className="bg-white border-gray-200">
                  <CardContent className="py-12 text-center">
                    <Play className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">Vous n'avez démarré aucune formation</p>
                    <Button onClick={() => setActiveTab('bibliotheque')} className="bg-purple-600 text-white">
                      Découvrir les formations
                    </Button>
                  </CardContent>
                </Card>
              ) : (() => {
                // Afficher les parcours en cours, inscrits ET terminés dans "Mes Formations"
                const progressionsActives = userProgression.filter(prog => 
                  prog.statut === 'en_cours' || prog.statut === 'inscrit' || prog.statut === 'termine'
                );
                console.log('📋 Onglet Mes Formations - Progressions actives:', progressionsActives.length);
                console.log('📊 Détails progressions actives:', progressionsActives.map(p => ({
                  id: p.id,
                  parcours_id: p.parcours_id,
                  parcours_nom: p.parcours_transformation?.nom || 'NOM MANQUANT',
                  statut: p.statut,
                  has_parcours: !!p.parcours_transformation
                })));
                
                if (progressionsActives.length === 0 && userProgression.length > 0) {
                  console.warn('⚠️ Aucune progression active mais des progressions existent:', userProgression.map(p => ({
                    id: p.id,
                    statut: p.statut,
                    parcours_nom: p.parcours_transformation?.nom || 'NOM MANQUANT'
                  })));
                }
                
                return (
                  <div className="space-y-6">
                    {progressionsActives.map((prog) => {
                    const parcour = prog.parcours_transformation;
                    if (!parcour) {
                      console.warn('⚠️ Progression sans parcours:', prog.id);
                      return null;
                    }
                    
                    // Utiliser les valeurs corrigées si disponibles, sinon utiliser les valeurs de la DB
                    const corrected = correctedProgressions[prog.id];
                    const actualStatut = corrected?.statut || prog.statut;
                    const actualProgression = corrected?.progression_pourcentage ?? (prog.progression_pourcentage || 0);
                    
                    const categorieInfo = parcour?.categorie ? getCategorieInfo(parcour.categorie) : null;
                    return (
                      <Card key={prog.id} className="bg-white border-gray-200">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {categorieInfo && (
                                  <Badge className={`${categorieInfo.color} text-white text-xs`}>
                                    {categorieInfo.label}
                                  </Badge>
                                )}
                                <Badge className={
                                  actualStatut === 'termine' ? 'bg-green-500 text-white' :
                                  actualStatut === 'en_cours' ? 'bg-blue-500 text-white' :
                                  actualStatut === 'abandonne' ? 'bg-red-500 text-white' :
                                  'bg-gray-500 text-white'
                                }>
                                  {actualStatut === 'termine' ? 'Terminé' :
                                   actualStatut === 'en_cours' ? 'En cours' :
                                   actualStatut === 'inscrit' ? 'Inscrit' :
                                   actualStatut === 'abandonne' ? 'Abandonné' :
                                   actualStatut}
                                </Badge>
                              </div>
                              <CardTitle className="text-gray-900">{parcour?.nom || 'Parcours'}</CardTitle>
                              <CardDescription className="text-gray-600 mt-1">
                                {parcour?.thematique}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                                <span>Progression</span>
                                <span>{actualProgression === 100 ? 100 : actualProgression}%</span>
                              </div>
                              <Progress value={actualProgression === 100 ? 100 : actualProgression} className="h-2" />
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                              <div>
                                <span className="text-gray-500">Modules complétés</span>
                                <p className="font-semibold text-gray-900">{prog.modules_completes}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-gray-500 block">Date de début</span>
                                <p className="font-semibold text-gray-900">
                                  {prog.date_debut ? format(new Date(prog.date_debut), 'dd/MM/yyyy', { locale: fr }) : '-'}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 justify-center">
                              {actualStatut !== 'termine' && actualStatut !== 'en_cours' && (
                                <Button
                                  className="flex-1 bg-purple-600 text-white"
                                  onClick={() => handleStartParcours(prog.parcours_id)}
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  Commencer le programme
                                </Button>
                              )}
                              {actualStatut !== 'termine' && (
                                <Button
                                  variant="outline"
                                  className="bg-white border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
                                  onClick={() => handleCancelParcours(prog)}
                                >
                                  Annuler le programme
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                );
              })()}
            </TabsContent>

            {/* Tab Content: Mes Parcours */}
            <TabsContent value="progression" className="space-y-6">
              {progressionLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : userProgression.filter(prog => prog.statut === 'en_cours' || prog.statut === 'inscrit').length === 0 ? (
                <Card className="bg-white border-gray-200">
                  <CardContent className="py-12 text-center">
                    <Target className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">Vous n'avez pas encore démarré de parcours</p>
                    <Button onClick={() => setActiveTab('bibliotheque')} className="bg-purple-600 text-white">
                      Découvrir les parcours
                    </Button>
                  </CardContent>
                </Card>
              ) : (() => {
                const progressionsActives = userProgression.filter(prog => 
                  prog.statut === 'en_cours' || prog.statut === 'inscrit'
                );
                console.log('📋 Onglet Mes Parcours - Progressions actives:', progressionsActives.length);
                console.log('📊 Détails:', progressionsActives.map(p => ({
                  id: p.id,
                  parcours_nom: p.parcours_transformation?.nom,
                  statut: p.statut,
                  has_parcours: !!p.parcours_transformation
                })));
                
                if (progressionsActives.length === 0) {
                  console.log('⚠️ Aucune progression active trouvée. Toutes les progressions:', userProgression.map(p => ({
                    id: p.id,
                    statut: p.statut,
                    parcours_nom: p.parcours_transformation?.nom
                  })));
                }
                
                return (
                  <div className="space-y-6">
                    {progressionsActives.map((prog) => {
                    const parcour = prog.parcours_transformation;
                    if (!parcour) {
                      console.warn('⚠️ Progression sans parcours:', prog.id);
                      return null;
                    }
                    return (
                      <Card key={prog.id} className="bg-white border-gray-200">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-gray-900">{parcour?.nom || 'Parcours'}</CardTitle>
                              <CardDescription className="text-gray-600 mt-1">
                                {parcour?.thematique}
                              </CardDescription>
                            </div>
                            <Badge className={
                              prog.statut === 'termine' ? 'bg-green-500' :
                              prog.statut === 'en_cours' ? 'bg-blue-500' :
                              'bg-gray-500'
                            }>
                              {prog.statut}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                                <span>Progression</span>
                                <span>{prog.progression_pourcentage}%</span>
                              </div>
                              <Progress value={prog.progression_pourcentage} className="h-2" />
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Modules complétés</span>
                                <p className="font-semibold text-gray-900">{prog.modules_completes}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-gray-500 block">Date de début</span>
                                <p className="font-semibold text-gray-900">
                                  {prog.date_debut ? format(new Date(prog.date_debut), 'dd/MM/yyyy', { locale: fr }) : '-'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                );
              })()}
            </TabsContent>

            {/* Tab Content: Journal */}
            <TabsContent value="journal" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Journal Personnel</h2>
                <Button
                  onClick={() => {
                    setEditingJournalId(null);
                    setJournalFormData({
                      date_entree: new Date().toISOString().split('T')[0],
                      titre: '',
                      contenu: '',
                      thematique: '',
                      emotions: [],
                      revelations: '',
                      actions_prises: '',
                      gratitude: '',
                      prieres: '',
                      tags: []
                    });
                    setIsJournalDialogOpen(true);
                  }}
                  className="bg-purple-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle entrée
                </Button>
              </div>

              {/* Filtres du Journal */}
              <Card className="bg-white border-gray-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Recherche textuelle */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Rechercher..."
                        value={journalSearchQuery}
                        onChange={(e) => setJournalSearchQuery(e.target.value)}
                        className="pl-10 bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    {/* Filtre par thématique */}
                    <Select value={journalFilterThematique} onValueChange={setJournalFilterThematique}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 !text-gray-900 z-[200] max-h-60 overflow-y-auto">
                        <SelectItem value="toutes" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Toutes les thématiques</SelectItem>
                        {getUniqueThematiques().map(thematique => (
                          <SelectItem key={thematique} value={thematique} className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">
                            {thematique}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Filtre par date début */}
                    <Input
                      type="date"
                      placeholder="Date début"
                      value={journalFilterDateDebut}
                      onChange={(e) => setJournalFilterDateDebut(e.target.value)}
                      className="bg-white border-gray-300 text-gray-900"
                    />

                    {/* Filtre par date fin */}
                    <Input
                      type="date"
                      placeholder="Date fin"
                      value={journalFilterDateFin}
                      onChange={(e) => setJournalFilterDateFin(e.target.value)}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>

                  {/* Boutons de réinitialisation */}
                  {(journalSearchQuery || journalFilterThematique !== 'toutes' || journalFilterDateDebut || journalFilterDateFin) && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setJournalSearchQuery('');
                          setJournalFilterThematique('toutes');
                          setJournalFilterDateDebut('');
                          setJournalFilterDateFin('');
                        }}
                        className="bg-gray-600 text-white border-gray-600 hover:bg-white hover:text-black hover:border-gray-300"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Réinitialiser les filtres
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {journalLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : journalEntries.length === 0 ? (
                <Card className="bg-white border-gray-200">
                  <CardContent className="py-12 text-center">
                    <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">Aucune entrée dans votre journal</p>
                    <Button
                      onClick={() => setIsJournalDialogOpen(true)}
                      className="bg-purple-600 text-white"
                    >
                      Créer votre première entrée
                    </Button>
                  </CardContent>
                </Card>
              ) : getFilteredJournalEntries().length === 0 ? (
                <Card className="bg-white border-gray-200">
                  <CardContent className="py-12 text-center">
                    <Filter className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">Aucune entrée ne correspond aux filtres sélectionnés</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setJournalSearchQuery('');
                        setJournalFilterThematique('toutes');
                        setJournalFilterDateDebut('');
                        setJournalFilterDateFin('');
                      }}
                      className="bg-gray-800 text-white border-gray-600 hover:bg-white hover:text-black hover:border-gray-300"
                    >
                      Réinitialiser les filtres
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {getFilteredJournalEntries().map((entry) => (
                    <Card key={entry.id} className="bg-white border-gray-200">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-gray-900 mb-1">
                              {entry.titre || format(new Date(entry.date_entree), 'dd MMMM yyyy', { locale: fr })}
                            </CardTitle>
                            <CardDescription className="text-gray-600">
                              {format(new Date(entry.date_entree), 'dd MMMM yyyy', { locale: fr })}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditJournal(entry)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteJournal(entry)}
                              className="bg-red-600 text-white border-red-600 hover:bg-red-700 hover:text-white"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer l'entrée
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 whitespace-pre-wrap">{entry.contenu}</p>
                        {entry.thematique && (
                          <Badge className="mt-3 bg-blue-600 text-white border-none">
                            {entry.thematique}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab Content: Évaluations */}
            <TabsContent value="evaluations" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Évaluations de Croissance</h2>
                <Button
                  onClick={() => setIsEvaluationDialogOpen(true)}
                  className="bg-purple-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle évaluation
                </Button>
              </div>

              {/* Filtres des Évaluations */}
              <Card className="bg-white border-gray-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Filtre par domaine */}
                    <Select value={evaluationFilterDomaine} onValueChange={setEvaluationFilterDomaine}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 !text-gray-900 z-[200]">
                        <SelectItem value="tous" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Tous les domaines</SelectItem>
                        <SelectItem value="relation_dieu" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Relation avec Dieu</SelectItem>
                        <SelectItem value="priere" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Prière</SelectItem>
                        <SelectItem value="parole" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Parole de Dieu</SelectItem>
                        <SelectItem value="service" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Service</SelectItem>
                        <SelectItem value="communaute" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Communauté</SelectItem>
                        <SelectItem value="temperament" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Tempérament</SelectItem>
                        <SelectItem value="finances" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Finances</SelectItem>
                        <SelectItem value="sante" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Santé</SelectItem>
                        <SelectItem value="relations" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Relations</SelectItem>
                        <SelectItem value="autre" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Autre</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Filtre par type */}
                    <Select value={evaluationFilterType} onValueChange={setEvaluationFilterType}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 !text-gray-900 z-[200]">
                        <SelectItem value="tous" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Tous les types</SelectItem>
                        <SelectItem value="initiale" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Initiale</SelectItem>
                        <SelectItem value="mensuelle" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Mensuelle</SelectItem>
                        <SelectItem value="trimestrielle" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Trimestrielle</SelectItem>
                        <SelectItem value="annuelle" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Annuelle</SelectItem>
                        <SelectItem value="personnalisee" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Personnalisée</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Filtre par date début */}
                    <Input
                      type="date"
                      placeholder="Date début"
                      value={evaluationFilterDateDebut}
                      onChange={(e) => setEvaluationFilterDateDebut(e.target.value)}
                      className="bg-white border-gray-300 text-gray-900"
                    />

                    {/* Filtre par date fin */}
                    <Input
                      type="date"
                      placeholder="Date fin"
                      value={evaluationFilterDateFin}
                      onChange={(e) => setEvaluationFilterDateFin(e.target.value)}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>

                  {/* Boutons de réinitialisation */}
                  {(evaluationFilterDomaine !== 'tous' || evaluationFilterType !== 'tous' || evaluationFilterDateDebut || evaluationFilterDateFin) && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEvaluationFilterDomaine('tous');
                          setEvaluationFilterType('tous');
                          setEvaluationFilterDateDebut('');
                          setEvaluationFilterDateFin('');
                        }}
                        className="bg-gray-600 text-white border-gray-600 hover:bg-white hover:text-black hover:border-gray-300"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Réinitialiser les filtres
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {evaluationsLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : evaluations.length === 0 ? (
                <Card className="bg-white border-gray-200">
                  <CardContent className="py-12 text-center">
                    <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">Aucune évaluation enregistrée</p>
                    <Button
                      onClick={() => setIsEvaluationDialogOpen(true)}
                      className="bg-purple-600 text-white"
                    >
                      Créer votre première évaluation
                    </Button>
                  </CardContent>
                </Card>
              ) : getFilteredEvaluations().length === 0 ? (
                <Card className="bg-white border-gray-200">
                  <CardContent className="py-12 text-center">
                    <Filter className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">Aucune évaluation ne correspond aux filtres sélectionnés</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEvaluationFilterDomaine('tous');
                        setEvaluationFilterType('tous');
                        setEvaluationFilterDateDebut('');
                        setEvaluationFilterDateFin('');
                      }}
                      className="bg-gray-800 text-white border-gray-600 hover:bg-white hover:text-black hover:border-gray-300"
                    >
                      Réinitialiser les filtres
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {getFilteredEvaluations().map((evaluation) => {
                    const getDomaineLabel = (domaine) => {
                      const labels = {
                        'relation_dieu': 'Relation avec Dieu',
                        'priere': 'Prière',
                        'parole': 'Parole de Dieu',
                        'service': 'Service',
                        'communaute': 'Communauté',
                        'temperament': 'Tempérament',
                        'finances': 'Finances',
                        'sante': 'Santé',
                        'relations': 'Relations',
                        'autre': 'Autre'
                      };
                      return labels[domaine] || domaine.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    };

                    const getTypeLabel = (type) => {
                      const labels = {
                        'initiale': 'Initiale',
                        'mensuelle': 'Mensuelle',
                        'trimestrielle': 'Trimestrielle',
                        'annuelle': 'Annuelle',
                        'personnalisee': 'Personnalisée'
                      };
                      return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
                    };

                    return (
                      <Card key={evaluation.id} className="bg-white border-gray-200">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-gray-900">
                                {getDomaineLabel(evaluation.domaine_evalue)}
                              </CardTitle>
                              <CardDescription className="text-gray-600">
                                {format(new Date(evaluation.date_evaluation), 'dd MMMM yyyy', { locale: fr })}
                              </CardDescription>
                            </div>
                            <Badge className="bg-purple-600">
                              {evaluation.score}/100
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-gray-500">Type:</span>
                              <p className="font-medium text-gray-900">{getTypeLabel(evaluation.type_evaluation)}</p>
                            </div>
                            {evaluation.notes && (
                              <div>
                                <span className="text-sm text-gray-500">Notes:</span>
                                <p className="text-gray-700">{evaluation.notes}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Tab Content: Statistiques */}
              <TabsContent value="statistiques" className="space-y-6">
                {statsLoading ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  </div>
                ) : (
                  <>
                    {/* Bouton de réinitialisation pour les tests */}
                    <Card className="bg-yellow-50 border-yellow-200">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-yellow-800">
                              🔧 Mode Test : Réinitialiser toutes les formations
                            </p>
                            <p className="text-xs text-yellow-600 mt-1">
                              Remet toutes les formations en "non complétées" pour reprendre les tests depuis le début
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={resetAllFormations}
                            className="bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700 hover:text-white"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Réinitialiser toutes les formations
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  {/* Cartes de statistiques */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card 
                      className="bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleOpenStatsDetail('parcours-completes')}
                    >
                      <CardHeader>
                        <CardTitle className="text-gray-700 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          Formations terminées
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-600">{statsData.parcoursCompletes}</div>
                        <p className="text-sm text-gray-600 mt-1">Formations complétées</p>
                      </CardContent>
                    </Card>

                    <Card 
                      className="bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleOpenStatsDetail('parcours-en-cours')}
                    >
                      <CardHeader>
                        <CardTitle className="text-gray-700 flex items-center gap-2">
                          <Play className="w-5 h-5 text-blue-500" />
                          Parcours en Cours
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{statsData.parcoursEnCours}</div>
                        <p className="text-sm text-gray-600 mt-1">Formations actives</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-gray-700 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-purple-500" />
                          Progression Moyenne
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-purple-600">{statsData.progressionMoyenne}%</div>
                        <Progress 
                          value={statsData.progressionMoyenne} 
                          className="mt-2 h-1.5 bg-gray-200" 
                          indicatorClassName="bg-gray-700"
                        />
                      </CardContent>
                    </Card>

                    <Card 
                      className="bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleOpenStatsDetail('modules-completes')}
                    >
                      <CardHeader>
                        <CardTitle className="text-gray-700 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-indigo-500" />
                          Modules Complétés
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-indigo-600">{statsData.modulesCompletes}</div>
                        <p className="text-sm text-gray-600 mt-1">Modules terminés</p>
                      </CardContent>
                    </Card>

                    <Card 
                      className="bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleOpenStatsDetail('evaluations')}
                    >
                      <CardHeader>
                        <CardTitle className="text-gray-700 flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-yellow-500" />
                          Évaluations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-yellow-600">{statsData.evaluationsCount}</div>
                        <p className="text-sm text-gray-600 mt-1">Évaluations réalisées</p>
                      </CardContent>
                    </Card>

                    <Card 
                      className="bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleOpenStatsDetail('journal-entries')}
                    >
                      <CardHeader>
                        <CardTitle className="text-gray-700 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-pink-500" />
                          Entrées Journal
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-pink-600">{statsData.journalEntriesCount}</div>
                        <p className="text-sm text-gray-600 mt-1">Entrées de journal</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Top 3 des formations */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {/* Top 3 des formations suivies */}
                    <Card className="bg-white border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-gray-700 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-blue-500" />
                          Top 3 des formations suivies
                        </CardTitle>
                        <CardDescription>Les formations les plus suivies par les participants</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {statsData.top5FormationsSuivies.length === 0 ? (
                          <p className="text-sm text-gray-600">Aucune formation suivie pour le moment.</p>
                        ) : (
                          <div className="space-y-4">
                            {statsData.top5FormationsSuivies.map((formation) => (
                              <div
                                key={formation.parcoursId}
                                className="border-t border-gray-100 pt-3 first:border-t-0 first:pt-0"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-semibold text-blue-600">
                                      N° <span className="text-blue-600">{formation.rang}</span> {formation.parcoursNom}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">
                                      Nbre de participants : <span className="font-semibold text-blue-600">{formation.totalParticipants}</span> - <span className="font-semibold text-blue-600">{formation.pourcentageTermines}%</span>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Top 3 des formations terminées */}
                    <Card className="bg-white border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-gray-700 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          Top 3 des formations terminées
                        </CardTitle>
                        <CardDescription>Les formations les plus terminées par les participants</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {statsData.top5FormationsTerminees.length === 0 ? (
                          <p className="text-sm text-gray-600">Aucune formation terminée pour le moment.</p>
                        ) : (
                          <div className="space-y-4">
                            {statsData.top5FormationsTerminees.map((formation) => (
                              <div
                                key={formation.parcoursId}
                                className="border-t border-gray-100 pt-3 first:border-t-0 first:pt-0"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-semibold text-green-600">
                                      N° <span className="text-green-600">{formation.rang}</span> {formation.parcoursNom}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">
                                      Nbre de participants : <span className="font-semibold text-green-600">{formation.participantsTermines}</span> - <span className="font-semibold text-green-600">{formation.pourcentageTermines}%</span>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Graphiques */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                    {/* Graphique de progression par mois */}
                    <Card className="bg-white border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-gray-700">Progression Mensuelle</CardTitle>
                        <CardDescription>Évolution des parcours démarrés (6 derniers mois)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={statsData.progressionParMois}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="mois" stroke="#888888" fontSize={12} />
                            <YAxis stroke="#888888" fontSize={12} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="parcours" stroke="#9333ea" strokeWidth={2} name="Parcours" />
                            <Line type="monotone" dataKey="progression" stroke="#3b82f6" strokeWidth={2} name="Progression %" />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Graphique de progression par catégorie */}
                    {statsData.progressionParCategorie.length > 0 && (
                      <Card className="bg-white border-gray-200">
                        <CardHeader>
                          <CardTitle className="text-gray-700">Progression par Catégorie</CardTitle>
                          <CardDescription>Répartition des parcours par catégorie</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={statsData.progressionParCategorie}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="categorie" stroke="#888888" fontSize={12} angle={-45} textAnchor="end" height={80} />
                              <YAxis stroke="#888888" fontSize={12} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="completes" fill="#10b981" name="Complétés" />
                              <Bar dataKey="total" fill="#3b82f6" name="Total" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}

                    {/* Graphique des scores d'évaluations */}
                    {statsData.scoresEvaluations.length > 0 && (
                      <Card className="bg-white border-gray-200 lg:col-span-2">
                        <CardHeader>
                          <CardTitle className="text-gray-700">Évolution des Scores d'Évaluations</CardTitle>
                          <CardDescription>Progression des scores dans le temps</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={statsData.scoresEvaluations}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="date" stroke="#888888" fontSize={12} />
                              <YAxis stroke="#888888" fontSize={12} domain={[0, 100]} />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2} name="Score" />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Boutons d'export et partage */}
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-gray-700">Export et Partage</CardTitle>
                      <CardDescription>Exporter vos données ou partager votre progression</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-4">
                        <Button
                          onClick={handleExportCSV}
                          className="bg-purple-600 text-white hover:bg-purple-700"
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          Exporter en CSV
                        </Button>
                        <Button
                          onClick={handleExportJSON}
                          className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          Exporter en JSON
                        </Button>
                        <Button
                          onClick={handleShareProgression}
                          className="bg-green-600 text-white hover:bg-green-700"
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Partager la Progression
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Tab Content: Ressources de Guérison et Restauration */}
            <TabsContent value="ressources-guerison" className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Ressources de Guérison et Restauration</h2>
                  <p className="text-gray-600 mt-1">Catalogue de ressources spécialisées pour votre transformation</p>
                </div>
              </div>

              {/* Filtres et recherche */}
              <Card className="bg-white border-gray-200">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Rechercher une ressource..."
                        value={ressourcesSearchQuery}
                        onChange={(e) => setRessourcesSearchQuery(e.target.value)}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <Select value={ressourcesFilterType} onValueChange={setRessourcesFilterType}>
                      <SelectTrigger className="w-full md:w-[200px] bg-white border-gray-300 text-gray-900">
                        <SelectValue placeholder="Type de ressource" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 !text-gray-900 z-[200]">
                        <SelectItem value="tous" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Tous les types</SelectItem>
                        <SelectItem value="resource" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Ressources</SelectItem>
                        <SelectItem value="parcours" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Parcours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Liste des ressources */}
              {ressourcesGuerisonLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ressourcesGuerison
                    .filter(r => {
                      if (ressourcesFilterType !== 'tous' && r.type_resource !== ressourcesFilterType) return false;
                      if (ressourcesSearchQuery && !r.title?.toLowerCase().includes(ressourcesSearchQuery.toLowerCase()) && !r.description?.toLowerCase().includes(ressourcesSearchQuery.toLowerCase())) return false;
                      return true;
                    })
                    .map((ressource) => (
                      <Card 
                        key={ressource.id_resource} 
                        className="bg-white border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => {
                          setSelectedRessource(ressource);
                          setIsRessourceDialogOpen(true);
                        }}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-gray-900 text-lg">{ressource.title || ressource.nom}</CardTitle>
                            <Badge className={ressource.type_resource === 'parcours' ? 'bg-purple-500' : 'bg-blue-500'}>
                              {ressource.type_resource === 'parcours' ? 'Parcours' : 'Ressource'}
                            </Badge>
                          </div>
                          <CardDescription className="text-gray-600 mt-2">
                            {ressource.description?.substring(0, 100)}...
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button className="w-full bg-purple-600 text-white hover:bg-purple-700">
                            Voir les détails
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  {ressourcesGuerison.filter(r => {
                    if (ressourcesFilterType !== 'tous' && r.type_resource !== ressourcesFilterType) return false;
                    if (ressourcesSearchQuery && !r.title?.toLowerCase().includes(ressourcesSearchQuery.toLowerCase()) && !r.description?.toLowerCase().includes(ressourcesSearchQuery.toLowerCase())) return false;
                    return true;
                  }).length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">Aucune ressource de guérison trouvée</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Tab Content: Suivi Post-Crise */}
            <TabsContent value="suivi-post-crise" className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Suivi Post-Crise</h2>
                  <p className="text-gray-600 mt-1">Système de suivi personnalisé avec alertes et historique de guérison</p>
                </div>
                <Button 
                  onClick={() => {
                    setEditingSuiviId(null);
                    setSuiviFormData({
                      date_debut: new Date().toISOString().split('T')[0],
                      type_crise: 'autre',
                      description: '',
                      gravite: 5,
                      objectifs: [],
                      etat_actuel: '',
                      besoins_specifiques: [],
                      ressources_utilisees: [],
                      prochaine_action: '',
                      date_prochaine_action: '',
                      rappel_actif: true,
                      frequence_rappels: 'hebdomadaire',
                      statut: 'actif',
                      notes: ''
                    });
                    setIsSuiviDialogOpen(true);
                  }}
                  className="bg-purple-600 text-white hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau Suivi
                </Button>
              </div>

              {/* Liste des suivis */}
              {suivisPostCriseLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  {suivisPostCrise.map((suivi) => (
                    <Card key={suivi.id} className="bg-white border-gray-200">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-gray-900">
                              {suivi.type_crise.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </CardTitle>
                            <CardDescription className="text-gray-600 mt-1">
                              Débuté le {format(new Date(suivi.date_debut), 'dd MMMM yyyy', { locale: fr })}
                            </CardDescription>
                          </div>
                          <Badge className={
                            suivi.statut === 'resolu' ? 'bg-green-500' :
                            suivi.statut === 'en_amelioration' ? 'bg-blue-500' :
                            suivi.statut === 'stabilise' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }>
                            {suivi.statut.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Gravité</p>
                            <Progress value={suivi.gravite * 10} className="h-2 mt-1 [&>div]:bg-red-500" />
                            <p className="text-xs text-gray-500 mt-1">{suivi.gravite}/10</p>
                          </div>
                          {suivi.description && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">Description</p>
                              <p className="text-sm text-gray-600">{suivi.description}</p>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSuivi(suivi);
                                fetchHistoriqueSuivi(suivi.id);
                                setIsHistoriqueDialogOpen(true);
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Historique
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingSuiviId(suivi.id);
                                setSuiviFormData({
                                  ...suivi,
                                  date_debut: suivi.date_debut,
                                  date_prochaine_action: suivi.date_prochaine_action || '',
                                  objectifs: Array.isArray(suivi.objectifs) ? suivi.objectifs : [],
                                  besoins_specifiques: Array.isArray(suivi.besoins_specifiques) ? suivi.besoins_specifiques : [],
                                  ressources_utilisees: Array.isArray(suivi.ressources_utilisees) ? suivi.ressources_utilisees : []
                                });
                                setIsSuiviDialogOpen(true);
                              }}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Modifier
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {suivisPostCrise.length === 0 && (
                    <div className="text-center py-12">
                      <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">Aucun suivi post-crise enregistré</p>
                      <Button 
                        onClick={() => setIsSuiviDialogOpen(true)}
                        className="bg-purple-600 text-white hover:bg-purple-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Créer un nouveau suivi
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialog: Détails des Statistiques */}
      <Dialog open={isStatsDetailDialogOpen} onOpenChange={setIsStatsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-gray-200 text-gray-900 [&>button]:hidden">
          <div className="absolute right-4 top-4 z-50">
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <DialogHeader className="pr-10">
            <DialogTitle className="text-gray-900">{statsDetailData.title}</DialogTitle>
            <DialogDescription className="text-gray-600">
              Liste détaillée des éléments
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {statsDetailData.items.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <p>Aucun élément à afficher</p>
              </div>
            ) : (
              <div className="space-y-4">
                {statsDetailData.items.map((item, index) => {
                  const rawDataItem = statsDetailData.rawData[index];
                  return (
                  <Card key={index} className="bg-white border-gray-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-gray-900 text-lg">
                          {item.nom}
                          {item.parcours_nom && (
                            <span className="text-sm text-gray-600 font-normal ml-2">
                              ({item.parcours_nom})
                            </span>
                          )}
                        </CardTitle>
                        {statsDetailData.type === 'parcours-completes' && rawDataItem && (
                          <Button
                            size="sm"
                            onClick={() => generateCertificatePDF(rawDataItem)}
                            className="bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2"
                          >
                            <Award className="w-4 h-4" />
                            Télécharger le certificat
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Date de début</p>
                          <p className="text-sm font-medium text-gray-900">{item.date_debut}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Date de fin</p>
                          <p className="text-sm font-medium text-gray-900">{item.date_fin}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Statut</p>
                          <Badge 
                            className={
                              item.statut === 'Terminé' 
                                ? 'bg-green-100 text-green-700 border-green-200' 
                                : 'bg-blue-100 text-blue-700 border-blue-200'
                            }
                          >
                            {item.statut}
                          </Badge>
                        </div>
                        {item.progression !== undefined && (
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Progression</p>
                            <p className="text-sm font-medium text-gray-900">{item.progression}%</p>
                          </div>
                        )}
                        {item.score !== undefined && (
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Score</p>
                            <p className="text-sm font-medium text-gray-900">{item.score}/100</p>
                          </div>
                        )}
                        {item.thematique && (
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Thématique</p>
                            <Badge className="bg-blue-600 text-white border-none">{item.thematique}</Badge>
                          </div>
                        )}
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
              onClick={() => setIsStatsDetailDialogOpen(false)}
              className="bg-gray-800 text-white border-gray-800 hover:bg-white hover:text-black hover:border-gray-300"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Détails du Parcours */}
      <Dialog open={isParcoursDialogOpen} onOpenChange={setIsParcoursDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-gray-200 text-gray-900 [&>button]:hidden" style={{ backgroundColor: 'white', zIndex: 200 }}>
          <div className="absolute right-4 top-4 z-50">
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <DialogHeader className="pr-10">
            <DialogTitle className="text-gray-900">{selectedParcours?.nom || 'Détails du parcours'}</DialogTitle>
            <DialogDescription className="text-gray-600">
              {selectedParcours?.description || 'Chargement...'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-4 text-sm text-gray-700">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-600" />
                {selectedParcours?.duree_jours} jours
              </span>
              <Badge className="bg-blue-100 text-blue-700 border-0">
                {selectedParcours?.niveau === 'debutant' ? 'Débutant' : 
                 selectedParcours?.niveau === 'intermediaire' ? 'Intermédiaire' : 
                 selectedParcours?.niveau === 'avance' ? 'Avancé' : selectedParcours?.niveau}
              </Badge>
            </div>
            {modules.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Modules du parcours</h4>
                <div className="space-y-2">
                  {modules.map((module, index) => (
                    <div key={module.id} className="flex items-start gap-3 p-3 bg-gray-100 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{module.titre}</h5>
                        <p className="text-sm text-gray-700">{module.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{module.duree_estimee} min</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsParcoursDialogOpen(false)} 
              className="bg-gray-800 text-white border-gray-600 hover:bg-white hover:text-black hover:border-gray-300 transition-colors"
            >
              Fermer
            </Button>
            <Button
              onClick={() => {
                if (selectedParcours?.id) {
                  handleStartParcours(selectedParcours.id);
                  setIsParcoursDialogOpen(false);
                }
              }}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              Commencer ce parcours
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Journal */}
      <Dialog open={isJournalDialogOpen} onOpenChange={setIsJournalDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl [&>button]:hidden">
          <div className="absolute right-4 top-4 z-50">
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <DialogHeader className="pr-10">
            <DialogTitle className="text-gray-900">
              {editingJournalId ? 'Modifier l\'entrée' : 'Nouvelle entrée de journal'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="date_entree" className="text-gray-900">Date</Label>
              <Input
                id="date_entree"
                type="date"
                value={journalFormData.date_entree}
                onChange={(e) => setJournalFormData({ ...journalFormData, date_entree: e.target.value })}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <Label htmlFor="titre" className="text-gray-900">Titre (optionnel)</Label>
              <Input
                id="titre"
                value={journalFormData.titre}
                onChange={(e) => setJournalFormData({ ...journalFormData, titre: e.target.value })}
                placeholder="Titre de votre entrée"
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <Label htmlFor="contenu" className="text-gray-900">Contenu</Label>
              <Textarea
                id="contenu"
                value={journalFormData.contenu}
                onChange={(e) => setJournalFormData({ ...journalFormData, contenu: e.target.value })}
                placeholder="Écrivez vos pensées, réflexions, prières..."
                rows={8}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <Label htmlFor="thematique" className="text-gray-900">Thématique (optionnel)</Label>
              <Input
                id="thematique"
                value={journalFormData.thematique}
                onChange={(e) => setJournalFormData({ ...journalFormData, thematique: e.target.value })}
                placeholder="Ex: Guérison, Finances, Discipolat..."
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsJournalDialogOpen(false)} className="bg-white border border-gray-300 text-purple-600 hover:bg-gray-50">
              Annuler
            </Button>
            <Button onClick={handleSaveJournal} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Vue par Disciple */}
      <Dialog open={isDiscipleViewDialogOpen} onOpenChange={(open) => {
        setIsDiscipleViewDialogOpen(open);
        if (!open) {
          // Réinitialiser la sélection quand on ferme la modale
          setSelectedDisciple(null);
          setDiscipleSearchQuery('');
        }
      }}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-4xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <div className="absolute right-4 top-4 z-50">
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <DialogHeader className="pr-10">
            <DialogTitle className="text-gray-900">
              Formations de {selectedDisciple?.name || 'Disciple'}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Vue détaillée des formations terminées et en cours
            </DialogDescription>
            {selectedDisciple?.user_id === user?.id && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Note :</strong> Les formations affichées sont celles de l'utilisateur connecté. 
                  Pour voir les formations individuelles de chaque disciple, chaque disciple doit avoir son propre compte utilisateur.
                </p>
              </div>
            )}
          </DialogHeader>
          <div className="mt-6 space-y-6">
            {discipleFormationsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <>
                {/* Formations terminées */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Formations terminées ({discipleFormations.completes.length})
                  </h3>
                  {discipleFormations.completes.length === 0 ? (
                    <p className="text-sm text-gray-600">Aucune formation terminée</p>
                  ) : (
                    <div className="space-y-3">
                      {discipleFormations.completes.map((formation) => (
                        <Card key={formation.id} className="bg-white border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-2">{formation.nom}</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Date de début:</span>
                                    <p className="text-gray-900">{formation.date_debut}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Date de fin:</span>
                                    <p className="text-gray-900">{formation.date_fin}</p>
                                  </div>
                                </div>
                              </div>
                              <Badge className="bg-green-500 text-white">Terminé</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Formations en cours */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    Formations en cours ({discipleFormations.enCours.length})
                  </h3>
                  {discipleFormations.enCours.length === 0 ? (
                    <p className="text-sm text-gray-600">Aucune formation en cours</p>
                  ) : (
                    <div className="space-y-3">
                      {discipleFormations.enCours.map((formation) => (
                        <Card key={formation.id} className="bg-white border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-2">{formation.nom}</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                  <div>
                                    <span className="text-gray-500">Date de début:</span>
                                    <p className="text-gray-900">{formation.date_debut}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Progression:</span>
                                    <p className="text-gray-900 font-semibold text-blue-600">{formation.progression}%</p>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <Progress value={formation.progression} className="h-2" />
                                </div>
                              </div>
                              <Badge className="bg-blue-500 text-white">En cours</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setIsDiscipleViewDialogOpen(false)} 
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Évaluation */}
      <Dialog open={isEvaluationDialogOpen} onOpenChange={setIsEvaluationDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl [&>button]:hidden">
          <div className="absolute right-4 top-4 z-50">
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <DialogHeader className="pr-10">
            <DialogTitle className="text-gray-900">Nouvelle évaluation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="date_evaluation" className="text-gray-900">Date</Label>
              <Input
                id="date_evaluation"
                type="date"
                value={evaluationFormData.date_evaluation}
                onChange={(e) => setEvaluationFormData({ ...evaluationFormData, date_evaluation: e.target.value })}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type_evaluation" className="text-gray-900">Type</Label>
                <Select
                  value={evaluationFormData.type_evaluation}
                  onValueChange={(value) => setEvaluationFormData({ ...evaluationFormData, type_evaluation: value })}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 !text-gray-900 z-[200]">
                    <SelectItem value="mensuelle" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Mensuelle</SelectItem>
                    <SelectItem value="trimestrielle" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Trimestrielle</SelectItem>
                    <SelectItem value="annuelle" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Annuelle</SelectItem>
                    <SelectItem value="personnalisee" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Personnalisée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="domaine_evalue" className="text-gray-900">Domaine</Label>
                <Select
                  value={evaluationFormData.domaine_evalue}
                  onValueChange={(value) => setEvaluationFormData({ ...evaluationFormData, domaine_evalue: value })}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 !text-gray-900 z-[200]">
                    <SelectItem value="relation_dieu" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Relation avec Dieu</SelectItem>
                    <SelectItem value="priere" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Prière</SelectItem>
                    <SelectItem value="parole" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Parole de Dieu</SelectItem>
                    <SelectItem value="service" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Service</SelectItem>
                    <SelectItem value="communaute" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Communauté</SelectItem>
                    <SelectItem value="temperament" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Tempérament</SelectItem>
                    <SelectItem value="finances" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Finances</SelectItem>
                    <SelectItem value="sante" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Santé</SelectItem>
                    <SelectItem value="relations" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Relations</SelectItem>
                    <SelectItem value="autre" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="score" className="text-gray-900">Score (0-100)</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="100"
                value={evaluationFormData.score}
                onChange={(e) => setEvaluationFormData({ ...evaluationFormData, score: parseInt(e.target.value) })}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <Label htmlFor="notes" className="text-gray-900">Notes</Label>
              <Textarea
                id="notes"
                value={evaluationFormData.notes}
                onChange={(e) => setEvaluationFormData({ ...evaluationFormData, notes: e.target.value })}
                placeholder="Vos observations, réflexions..."
                rows={4}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsEvaluationDialogOpen(false)} className="bg-white border border-gray-300 text-purple-600 hover:bg-gray-50">
              Annuler
            </Button>
            <Button onClick={handleSaveEvaluation} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Annulation avec message d'encouragement */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md [&>button]:hidden">
          <div className="absolute right-4 top-4 z-50">
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <DialogHeader className="pr-10">
            <DialogTitle className="text-gray-900">Annuler la formation ?</DialogTitle>
            <DialogDescription className="text-gray-600">
              Êtes-vous sûr de vouloir annuler cette formation ?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900 mb-1">Message d'encouragement</h4>
                  <p className="text-sm text-yellow-800">
                    Nous vous encourageons à poursuivre cette formation. Chaque étape vous rapproche de votre transformation en Christ. 
                    Votre progression actuelle est de <strong>{parcoursToCancel?.progression_pourcentage || 0}%</strong>. 
                    Ne renoncez pas maintenant, vous êtes sur le bon chemin !
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Si vous annulez, vous pourrez toujours reprendre cette formation plus tard depuis la bibliothèque.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsCancelDialogOpen(false)} className="bg-white border border-gray-300 text-purple-600 hover:bg-gray-50">
              Continuer la formation
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancelParcours}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Annuler quand même
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmation de suppression d'entrée de journal */}
      <Dialog open={isDeleteJournalDialogOpen} onOpenChange={setIsDeleteJournalDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md [&>button]:hidden">
          <div className="absolute right-4 top-4 z-50">
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <DialogHeader className="pr-10">
            <DialogTitle className="text-gray-900">Supprimer cette entrée ?</DialogTitle>
            <DialogDescription className="text-gray-600">
              Êtes-vous sûr de vouloir supprimer définitivement cette entrée de journal ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {entryToDelete && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 font-medium mb-1">
                  {entryToDelete.titre || format(new Date(entryToDelete.date_entree), 'dd MMMM yyyy', { locale: fr })}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(entryToDelete.date_entree), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setIsDeleteJournalDialogOpen(false)} 
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteJournal}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ressource de Guérison */}
      <Dialog open={isRessourceDialogOpen} onOpenChange={setIsRessourceDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-3xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <div className="absolute right-4 top-4 z-50">
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <DialogHeader className="pr-10">
            <DialogTitle className="text-gray-900 text-2xl">
              {selectedRessource?.title || selectedRessource?.nom}
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              {selectedRessource?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-4">
            {selectedRessource?.type_resource === 'parcours' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-800">
                  <strong>Type :</strong> Parcours de Transformation
                </p>
                {selectedRessource?.categorie && (
                  <p className="text-sm text-purple-700 mt-1">
                    <strong>Catégorie :</strong> {selectedRessource.categorie.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                )}
                {selectedRessource?.duree_jours && (
                  <p className="text-sm text-purple-700 mt-1">
                    <strong>Durée estimée :</strong> {selectedRessource.duree_jours} jours
                  </p>
                )}
              </div>
            )}
            {selectedRessource?.type_resource === 'resource' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Type :</strong> Ressource
                </p>
                {selectedRessource?.category && (
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Catégorie :</strong> {selectedRessource.category}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setIsRessourceDialogOpen(false)} 
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Suivi Post-Crise */}
      <Dialog open={isSuiviDialogOpen} onOpenChange={setIsSuiviDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-3xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <div className="absolute right-4 top-4 z-50">
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <DialogHeader className="pr-10">
            <DialogTitle className="text-gray-900">
              {editingSuiviId ? 'Modifier le suivi' : 'Nouveau suivi post-crise'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date_debut" className="text-gray-900">Date de début</Label>
                <Input
                  id="date_debut"
                  type="date"
                  value={suiviFormData.date_debut}
                  onChange={(e) => setSuiviFormData({ ...suiviFormData, date_debut: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <Label htmlFor="type_crise" className="text-gray-900">Type de crise</Label>
                <Select
                  value={suiviFormData.type_crise}
                  onValueChange={(value) => setSuiviFormData({ ...suiviFormData, type_crise: value })}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 !text-gray-900 z-[200]">
                    <SelectItem value="deuil" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Deuil</SelectItem>
                    <SelectItem value="divorce" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Divorce</SelectItem>
                    <SelectItem value="maladie" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Maladie</SelectItem>
                    <SelectItem value="chomage" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Chômage</SelectItem>
                    <SelectItem value="trauma" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Trauma</SelectItem>
                    <SelectItem value="depression" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Dépression</SelectItem>
                    <SelectItem value="addiction" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Addiction</SelectItem>
                    <SelectItem value="conflit_familial" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Conflit Familial</SelectItem>
                    <SelectItem value="crise_spirituelle" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Crise Spirituelle</SelectItem>
                    <SelectItem value="autre" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="gravite" className="text-gray-900">Gravité (1-10)</Label>
              <Input
                id="gravite"
                type="number"
                min="1"
                max="10"
                value={suiviFormData.gravite}
                onChange={(e) => setSuiviFormData({ ...suiviFormData, gravite: parseInt(e.target.value) })}
                className="bg-white border-gray-300 text-gray-900"
              />
              <Progress value={suiviFormData.gravite * 10} className="h-2 mt-2 [&>div]:bg-red-500" />
            </div>
            <div>
              <Label htmlFor="description" className="text-gray-900">Description</Label>
              <Textarea
                id="description"
                value={suiviFormData.description}
                onChange={(e) => setSuiviFormData({ ...suiviFormData, description: e.target.value })}
                placeholder="Décrivez la situation..."
                rows={4}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div>
              <Label htmlFor="etat_actuel" className="text-gray-900">État actuel</Label>
              <Textarea
                id="etat_actuel"
                value={suiviFormData.etat_actuel}
                onChange={(e) => setSuiviFormData({ ...suiviFormData, etat_actuel: e.target.value })}
                placeholder="Comment vous sentez-vous actuellement ?"
                rows={3}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="frequence_rappels" className="text-gray-900">Fréquence des rappels</Label>
                <Select
                  value={suiviFormData.frequence_rappels}
                  onValueChange={(value) => setSuiviFormData({ ...suiviFormData, frequence_rappels: value })}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 !text-gray-900 z-[200]">
                    <SelectItem value="quotidien" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Quotidien</SelectItem>
                    <SelectItem value="hebdomadaire" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Hebdomadaire</SelectItem>
                    <SelectItem value="bihebdomadaire" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Bihebdomadaire</SelectItem>
                    <SelectItem value="mensuel" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Mensuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="statut" className="text-gray-900">Statut</Label>
                <Select
                  value={suiviFormData.statut}
                  onValueChange={(value) => setSuiviFormData({ ...suiviFormData, statut: value })}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 !text-gray-900 z-[200]">
                    <SelectItem value="actif" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Actif</SelectItem>
                    <SelectItem value="en_amelioration" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">En Amélioration</SelectItem>
                    <SelectItem value="stabilise" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Stabilisé</SelectItem>
                    <SelectItem value="resolu" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Résolu</SelectItem>
                    <SelectItem value="archive" className="!text-gray-900 focus:bg-gray-300 hover:bg-gray-300 focus:!text-gray-900 cursor-pointer">Archivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="notes" className="text-gray-900">Notes</Label>
              <Textarea
                id="notes"
                value={suiviFormData.notes}
                onChange={(e) => setSuiviFormData({ ...suiviFormData, notes: e.target.value })}
                placeholder="Notes personnelles..."
                rows={3}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSuiviDialogOpen(false)} className="bg-white border border-gray-300 text-purple-600 hover:bg-gray-50">
              Annuler
            </Button>
            <Button onClick={handleSaveSuivi} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Historique de Guérison */}
      <Dialog open={isHistoriqueDialogOpen} onOpenChange={setIsHistoriqueDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-4xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <div className="absolute right-4 top-4 z-50">
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <DialogHeader className="pr-10">
            <DialogTitle className="text-gray-900">
              Historique de Guérison
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Suivi de l'évolution de votre guérison
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-6">
            {/* Formulaire pour ajouter une nouvelle entrée */}
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Nouvelle entrée d'historique</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date_suivi" className="text-gray-900">Date</Label>
                    <Input
                      id="date_suivi"
                      type="date"
                      value={historiqueFormData.date_suivi}
                      onChange={(e) => setHistoriqueFormData({ ...historiqueFormData, date_suivi: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="etat_mental" className="text-gray-900">État Mental (1-10)</Label>
                    <Input
                      id="etat_mental"
                      type="number"
                      min="1"
                      max="10"
                      value={historiqueFormData.etat_mental}
                      onChange={(e) => setHistoriqueFormData({ ...historiqueFormData, etat_mental: parseInt(e.target.value) })}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                  <div>
                    <Label htmlFor="etat_spirituel" className="text-gray-900">État Spirituel (1-10)</Label>
                    <Input
                      id="etat_spirituel"
                      type="number"
                      min="1"
                      max="10"
                      value={historiqueFormData.etat_spirituel}
                      onChange={(e) => setHistoriqueFormData({ ...historiqueFormData, etat_spirituel: parseInt(e.target.value) })}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                  <div>
                    <Label htmlFor="etat_physique" className="text-gray-900">État Physique (1-10)</Label>
                    <Input
                      id="etat_physique"
                      type="number"
                      min="1"
                      max="10"
                      value={historiqueFormData.etat_physique}
                      onChange={(e) => setHistoriqueFormData({ ...historiqueFormData, etat_physique: parseInt(e.target.value) })}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="progres_observes" className="text-gray-900">Progrès observés</Label>
                  <Textarea
                    id="progres_observes"
                    value={historiqueFormData.progres_observes}
                    onChange={(e) => setHistoriqueFormData({ ...historiqueFormData, progres_observes: e.target.value })}
                    placeholder="Quels progrès avez-vous observés ?"
                    rows={3}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <div>
                  <Label htmlFor="victoires" className="text-gray-900">Victoires</Label>
                  <Textarea
                    id="victoires"
                    value={historiqueFormData.victoires}
                    onChange={(e) => setHistoriqueFormData({ ...historiqueFormData, victoires: e.target.value })}
                    placeholder="Quelles victoires avez-vous remportées ?"
                    rows={2}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <Button onClick={handleSaveHistorique} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  Ajouter cette entrée
                </Button>
              </CardContent>
            </Card>

            {/* Liste de l'historique */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Historique</h3>
              {historiqueSuivi.length === 0 ? (
                <p className="text-gray-600 text-center py-8">Aucune entrée d'historique pour le moment</p>
              ) : (
                historiqueSuivi.map((entry) => (
                  <Card key={entry.id} className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-gray-900 text-base">
                        {format(new Date(entry.date_suivi), 'dd MMMM yyyy', { locale: fr })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">État Mental</p>
                          <Progress value={entry.etat_mental * 10} className="h-2 mt-1" />
                          <p className="text-xs text-gray-500 mt-1">{entry.etat_mental}/10</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">État Spirituel</p>
                          <Progress value={entry.etat_spirituel * 10} className="h-2 mt-1" />
                          <p className="text-xs text-gray-500 mt-1">{entry.etat_spirituel}/10</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">État Physique</p>
                          <Progress value={entry.etat_physique * 10} className="h-2 mt-1" />
                          <p className="text-xs text-gray-500 mt-1">{entry.etat_physique}/10</p>
                        </div>
                      </div>
                      {entry.progres_observes && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-700">Progrès observés</p>
                          <p className="text-sm text-gray-600">{entry.progres_observes}</p>
                        </div>
                      )}
                      {entry.victoires && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-700">Victoires</p>
                          <p className="text-sm text-gray-600">{entry.victoires}</p>
                        </div>
                      )}
                      {entry.notes && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Notes</p>
                          <p className="text-sm text-gray-600">{entry.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setIsHistoriqueDialogOpen(false)} 
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Transformation;

