import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Heart, Target, TrendingUp, Calendar, CheckCircle, Clock,
  ArrowRight, Loader2, Plus, Edit2, Trash2, Play, Star, Award,
  FileText, BarChart3, Sparkles, ChevronRight, X, Save
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Helmet } from 'react-helmet';

const Transformation = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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

  // États pour les évaluations
  const [evaluations, setEvaluations] = useState([]);
  const [evaluationsLoading, setEvaluationsLoading] = useState(true);
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

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // Rafraîchir les données quand on revient sur la page
  useEffect(() => {
    if (user && location.pathname === '/transformation') {
      console.log('🔄 Rafraîchissement des données (retour sur la page)', location.search);
      fetchAllData();
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
      await Promise.all([
        fetchParcours(),
        fetchUserProgression(),
        fetchJournalEntries(),
        fetchEvaluations()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // ========== FONCTIONS POUR LES PARCOURS ==========
  const fetchParcours = async () => {
    try {
      setParcoursLoading(true);
      
      // D'abord, essayer sans filtre pour voir ce qui existe
      const { data: allData, error: allError } = await supabase
        .from('parcours_transformation')
        .select('*')
        .order('ordre_affichage', { ascending: true });

      console.log('🔍 Tous les parcours (sans filtre):', allData);
      
      // Ensuite, avec le filtre statut
      const { data, error } = await supabase
        .from('parcours_transformation')
        .select('*')
        .eq('statut', 'actif')
        .order('ordre_affichage', { ascending: true });

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw error;
      }
      
      console.log('✅ Parcours actifs récupérés:', data);
      console.log('📊 Nombre de parcours:', data?.length || 0);
      
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
      
      console.log('✨ Parcours uniques après déduplication:', uniqueParcours.length);
      setParcours(uniqueParcours);
      
      if (uniqueParcours.length === 0) {
        console.warn('⚠️ Aucun parcours trouvé. Vérifiez:');
        console.warn('   1. Les migrations SQL ont-elles été exécutées ?');
        console.warn('   2. Y a-t-il des données dans parcours_transformation ?');
        console.warn('   3. Les RLS policies permettent-elles la lecture ?');
      }
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
    setIsParcoursDialogOpen(true);
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
        // Mettre à jour le statut si déjà inscrit
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
        console.log('➕ Création nouvelle progression pour parcours:', parcoursId);
        const { data: newProgression, error } = await supabase
          .from('user_parcours_progression')
          .insert({
            user_id: user.id,
            parcours_id: parcoursId,
            date_debut: new Date().toISOString(),
            statut: 'en_cours',
            progression_pourcentage: 0,
            modules_completes: 0
          })
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

      toast({
        title: 'Parcours annulé',
        description: 'Vous pouvez le reprendre à tout moment depuis la bibliothèque',
      });

      setIsCancelDialogOpen(false);
      setParcoursToCancel(null);
      await fetchUserProgression();
      await fetchParcours();
    } catch (error) {
      console.error('Error canceling parcours:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'annuler le parcours',
        variant: 'destructive'
      });
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

  // Fonction pour vérifier si un parcours est déjà inscrit
  const isParcoursInscrit = (parcoursId) => {
    return userProgression.some(prog => 
      prog.parcours_id === parcoursId && 
      (prog.statut === 'inscrit' || prog.statut === 'en_cours' || prog.statut === 'suspendu')
    );
  };

  // ========== FONCTIONS POUR LA PROGRESSION ==========
  const fetchUserProgression = async () => {
    if (!user?.id) {
      console.warn('⚠️ Pas d\'utilisateur connecté, impossible de récupérer les progressions');
      setUserProgression([]);
      setProgressionLoading(false);
      return;
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
        return;
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
          has_parcours: !!p.parcours_transformation,
          date_debut: p.date_debut
        })));
      }
      
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
    } catch (error) {
      console.error('Error fetching progression:', error);
    } finally {
      setProgressionLoading(false);
    }
  };

  // ========== FONCTIONS POUR LE JOURNAL ==========
  const fetchJournalEntries = async () => {
    try {
      setJournalLoading(true);
      const { data, error } = await supabase
        .from('journal_transformation')
        .select('*')
        .eq('user_id', user.id)
        .order('date_entree', { ascending: false })
        .limit(50);

      if (error) throw error;
      setJournalEntries(data || []);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
    } finally {
      setJournalLoading(false);
    }
  };

  const handleSaveJournal = async () => {
    try {
      const journalData = {
        ...journalFormData,
        user_id: user.id,
        contenu: journalFormData.contenu || journalFormData.titre
      };

      if (editingJournalId) {
        const { error } = await supabase
          .from('journal_transformation')
          .update(journalData)
          .eq('id', editingJournalId);

        if (error) throw error;
        toast({
          title: 'Succès',
          description: 'Entrée de journal mise à jour',
        });
      } else {
        const { error } = await supabase
          .from('journal_transformation')
          .insert(journalData);

        if (error) throw error;
        toast({
          title: 'Succès',
          description: 'Entrée de journal créée',
        });
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
      await fetchJournalEntries();
    } catch (error) {
      console.error('Error saving journal:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder l\'entrée',
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
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Transformation</h1>
            <p className="text-gray-600">Édifier, construire, guérir et transformer votre vie en Christ</p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-white mb-6">
              <TabsTrigger value="bibliotheque" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <BookOpen className="w-4 h-4 mr-2" />
                Bibliothèque
              </TabsTrigger>
              <TabsTrigger value="mes-formations" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <Play className="w-4 h-4 mr-2" />
                Mes Formations
              </TabsTrigger>
              <TabsTrigger value="progression" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <TrendingUp className="w-4 h-4 mr-2" />
                Mes Parcours
              </TabsTrigger>
              <TabsTrigger value="journal" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <FileText className="w-4 h-4 mr-2" />
                Journal
              </TabsTrigger>
              <TabsTrigger value="evaluations" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <BarChart3 className="w-4 h-4 mr-2" />
                Évaluations
              </TabsTrigger>
            </TabsList>

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
                <Card className="bg-white">
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
              ) : userProgression.filter(prog => prog.statut === 'en_cours' || prog.statut === 'inscrit').length === 0 ? (
                <Card className="bg-white">
                  <CardContent className="py-12 text-center">
                    <Play className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">Vous n'avez démarré aucune formation</p>
                    <Button onClick={() => setActiveTab('bibliotheque')} className="bg-purple-600 text-white">
                      Découvrir les formations
                    </Button>
                  </CardContent>
                </Card>
              ) : (() => {
                const progressionsActives = userProgression.filter(prog => 
                  prog.statut === 'en_cours' || prog.statut === 'inscrit'
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
                    const categorieInfo = parcour?.categorie ? getCategorieInfo(parcour.categorie) : null;
                    return (
                      <Card key={prog.id} className="bg-white">
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
                                  prog.statut === 'termine' ? 'bg-green-500' :
                                  prog.statut === 'en_cours' ? 'bg-blue-500' :
                                  prog.statut === 'abandonne' ? 'bg-red-500' :
                                  'bg-gray-500'
                                }>
                                  {prog.statut}
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
                                <span>{prog.progression_pourcentage}%</span>
                              </div>
                              <Progress value={prog.progression_pourcentage} className="h-2" />
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
                              {prog.statut !== 'en_cours' && (
                                <Button
                                  className="flex-1 bg-purple-600 text-white"
                                  onClick={() => handleStartParcours(prog.parcours_id)}
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  Commencer le programme
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                className="bg-white border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
                                onClick={() => handleCancelParcours(prog)}
                              >
                                Annuler le programme
                              </Button>
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
                <Card className="bg-white">
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
                      <Card key={prog.id} className="bg-white">
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

              {journalLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : journalEntries.length === 0 ? (
                <Card className="bg-white">
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
              ) : (
                <div className="space-y-4">
                  {journalEntries.map((entry) => (
                    <Card key={entry.id} className="bg-white">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditJournal(entry)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 whitespace-pre-wrap">{entry.contenu}</p>
                        {entry.thematique && (
                          <Badge variant="outline" className="mt-3">
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

              {evaluationsLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : evaluations.length === 0 ? (
                <Card className="bg-white">
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
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {evaluations.map((evaluation) => (
                    <Card key={evaluation.id} className="bg-white">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-gray-900 capitalize">
                              {evaluation.domaine_evalue.replace('_', ' ')}
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
                            <p className="font-medium text-gray-900 capitalize">{evaluation.type_evaluation}</p>
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
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialog: Détails du Parcours */}
      <Dialog open={isParcoursDialogOpen} onOpenChange={setIsParcoursDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">{selectedParcours?.nom}</DialogTitle>
            <DialogDescription className="text-gray-600">
              {selectedParcours?.description}
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
              className="bg-gray-800 text-white border-gray-800 hover:bg-white hover:text-black hover:border-gray-300 transition-colors"
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
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl">
          <DialogHeader>
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
                placeholder="Ex: Guérison, Finances, Discipulat..."
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

      {/* Dialog: Évaluation */}
      <Dialog open={isEvaluationDialogOpen} onOpenChange={setIsEvaluationDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl">
          <DialogHeader>
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
                  <SelectContent className="bg-gray-200 border-none text-gray-600">
                    <SelectItem value="mensuelle" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Mensuelle</SelectItem>
                    <SelectItem value="trimestrielle" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Trimestrielle</SelectItem>
                    <SelectItem value="annuelle" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Annuelle</SelectItem>
                    <SelectItem value="personnalisee" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Personnalisée</SelectItem>
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
                  <SelectContent className="bg-gray-200 border-none text-gray-600">
                    <SelectItem value="relation_dieu" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Relation avec Dieu</SelectItem>
                    <SelectItem value="priere" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Prière</SelectItem>
                    <SelectItem value="parole" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Parole de Dieu</SelectItem>
                    <SelectItem value="service" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Service</SelectItem>
                    <SelectItem value="communaute" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Communauté</SelectItem>
                    <SelectItem value="finances" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Finances</SelectItem>
                    <SelectItem value="sante" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Santé</SelectItem>
                    <SelectItem value="relations" className="text-gray-600 focus:bg-gray-100 focus:!text-gray-900">Relations</SelectItem>
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
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
          <DialogHeader>
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
    </>
  );
};

export default Transformation;

