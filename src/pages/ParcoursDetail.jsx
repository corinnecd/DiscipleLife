import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Clock, CheckCircle, Circle, Lock, Play, Loader2,
  BookOpen, Award, TrendingUp
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Helmet } from 'react-helmet';
import { logger } from '@/lib/logger';

const ParcoursDetail = () => {
  const { parcoursId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [parcours, setParcours] = useState(null);
  const [modules, setModules] = useState([]);
  const [progression, setProgression] = useState(null);
  const [modulesCompletes, setModulesCompletes] = useState([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && parcoursId) {
      fetchParcoursData();
    }
  }, [user, parcoursId]);

  const fetchParcoursData = async () => {
    try {
      setLoading(true);

      // 1. Récupérer le parcours
      const { data: parcoursData, error: parcoursError } = await supabase
        .from('parcours_transformation')
        .select('*')
        .eq('id', parcoursId)
        .single();

      if (parcoursError) throw parcoursError;
      setParcours(parcoursData);

      // 2. Récupérer les modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules_parcours')
        .select('*')
        .eq('parcours_id', parcoursId)
        .eq('statut', 'actif')
        .order('ordre', { ascending: true });

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      // 3. Récupérer la progression de l'utilisateur
      const { data: progressionData, error: progressionError } = await supabase
        .from('user_parcours_progression')
        .select('*')
        .eq('user_id', user.id)
        .eq('parcours_id', parcoursId)
        .single();

      if (progressionError && progressionError.code !== 'PGRST116') {
        throw progressionError;
      }

      if (progressionData) {
        setProgression(progressionData);
        // Récupérer les modules complétés (passer les modules récupérés)
        await fetchModulesCompletes(progressionData.id, progressionData, modulesData || []);
      } else {
        // Créer une progression si elle n'existe pas
        await createProgression();
        // Récupérer la progression créée
        const { data: newProgression } = await supabase
          .from('user_parcours_progression')
          .select('*')
          .eq('user_id', user.id)
          .eq('parcours_id', parcoursId)
          .single();
        
        if (newProgression) {
          setProgression(newProgression);
          await fetchModulesCompletes(newProgression.id, newProgression, modulesData || []);
        }
      }

    } catch (error) {
      console.error('Error fetching parcours data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger le parcours',
        variant: 'destructive'
      });
      navigate('/transformation');
    } finally {
      setLoading(false);
    }
  };

  const fetchModulesCompletes = async (progressionId, currentProgression, modulesList) => {
    try {
      const { data, error } = await supabase
        .from('user_module_progression')
        .select('module_id')
        .eq('progression_id', progressionId)
        .eq('est_complete', true);

      if (error && error.code !== '42P01') throw error; // Table might not exist yet
      
      const completedIds = (data || []).map(m => m.module_id);
      setModulesCompletes(completedIds);

      // Utiliser la liste de modules passée en paramètre (pas l'état local qui peut ne pas être à jour)
      const modulesToCheck = modulesList || modules;
      
      // Vérifier si tous les modules sont complétés et mettre à jour le statut si nécessaire
      // On récupère d'abord la progression actuelle depuis la DB pour être sûr d'avoir les bonnes données
      const { data: dbProgression, error: fetchProgError } = await supabase
        .from('user_parcours_progression')
        .select('statut, progression_pourcentage, modules_completes')
        .eq('id', progressionId)
        .single();
      
      if (modulesToCheck.length > 0 && completedIds.length === modulesToCheck.length) {
        // Vérifier le statut depuis la DB, pas depuis l'état React
        const shouldUpdate = !dbProgression || dbProgression.statut !== 'termine' || dbProgression.progression_pourcentage !== 100;
        
        if (shouldUpdate) {
          // Ne pas inclure date_fin_reelle si la colonne n'existe pas encore
          // Ne pas inclure modules_completes car cela cause une erreur "expected JSON array"
          const updateData = {
            statut: 'termine',
            progression_pourcentage: 100,
            updated_at: new Date().toISOString()
          };
          
          const { error: updateError, data: updateResult } = await supabase
            .from('user_parcours_progression')
            .update(updateData)
            .eq('id', progressionId)
            .select();
          
          if (updateError) {
            console.error('❌ Erreur mise à jour statut parcours:', updateError);
            console.error('❌ Détails erreur:', {
              message: updateError.message,
              code: updateError.code,
              details: updateError.details,
              hint: updateError.hint
            });
          } else {
            // Rafraîchir la progression
            const { data: updatedProg } = await supabase
              .from('user_parcours_progression')
              .select('*')
              .eq('id', progressionId)
              .single();
            if (updatedProg) setProgression(updatedProg);
          }
        }
      }

      // Trouver le premier module non complété (utiliser modulesToCheck au lieu de modules)
      const modulesToCheckForIndex = modulesToCheck || modules;
      const firstIncomplete = modulesToCheckForIndex.findIndex((m, index) => {
        if (index === 0) return !completedIds.includes(m.id);
        return !completedIds.includes(m.id) && completedIds.includes(modulesToCheckForIndex[index - 1].id);
      });
      
      if (firstIncomplete !== -1) {
        setCurrentModuleIndex(firstIncomplete);
      } else if (modulesToCheckForIndex.length > 0 && completedIds.length === modulesToCheckForIndex.length) {
        setCurrentModuleIndex(modulesToCheckForIndex.length - 1);
      }
    } catch (error) {
      console.error('Error fetching completed modules:', error);
    }
  };

  const createProgression = async () => {
    try {
      // Vérifier d'abord si une progression existe déjà (pour éviter les doublons et erreurs UNIQUE)
      const { data: existing, error: checkError } = await supabase
        .from('user_parcours_progression')
        .select('*')
        .eq('user_id', user.id)
        .eq('parcours_id', parcoursId)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Erreur vérification progression existante:', checkError);
        throw checkError;
      }
      
      if (existing) {
        setProgression(existing);
        return existing;
      }
      
      // Ne pas inclure modules_completes car cela peut causer une erreur "expected JSON array"
      // Utiliser un statut valide selon le CHECK constraint: 'inscrit', 'en_cours', 'termine', 'abandonne', 'suspendu'
      const { data, error } = await supabase
        .from('user_parcours_progression')
        .insert([{
          user_id: user.id,
          parcours_id: parcoursId,
          date_debut: new Date().toISOString(),
          statut: 'en_cours', // Statut valide selon CHECK constraint
          progression_pourcentage: 0
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erreur création progression:', error);
        console.error('❌ Détails erreur:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      setProgression(data);
      return data;
    } catch (error) {
      console.error('❌ Error creating progression:', error);
      throw error;
    }
  };

  const handleCompleteModule = async (moduleId) => {
    try {

      // S'assurer que la progression existe AVANT de continuer
      let currentProgression = progression;
      if (!currentProgression) {
        try {
          const newProgression = await createProgression();
          if (!newProgression) {
            throw new Error('La création de progression a échoué');
          }
          currentProgression = newProgression;
          setProgression(newProgression);
          
          // Attendre un peu pour s'assurer que la progression est bien enregistrée
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Récupérer les modules complétés pour cette nouvelle progression (devrait être vide)
          const { data: completedModules, error: fetchModulesError } = await supabase
            .from('user_module_progression')
            .select('module_id')
            .eq('progression_id', currentProgression.id)
            .eq('est_complete', true);
            
          if (!fetchModulesError && completedModules) {
            setModulesCompletes(completedModules.map(m => m.module_id));
          }
        } catch (createError) {
          console.error('❌ Erreur lors de la création de progression:', createError);
          toast({
            title: 'Erreur',
            description: `Impossible de créer la progression: ${createError.message || 'Erreur inconnue'}`,
            variant: 'destructive'
          });
          return;
        }
      }

      // Vérifier que tous les modules précédents sont complétés
      const moduleIndex = modules.findIndex(m => m.id === moduleId);
      
      if (moduleIndex > 0) {
        const previousModules = modules.slice(0, moduleIndex);
        const allPreviousCompleted = previousModules.every(m => 
          modulesCompletes.includes(m.id)
        );


        if (!allPreviousCompleted) {
          toast({
            title: 'Module verrouillé',
            description: 'Vous devez compléter les modules précédents avant de continuer',
            variant: 'destructive'
          });
          return;
        }
      }

      // Vérifier si le module est déjà complété
      if (modulesCompletes.includes(moduleId)) {
        toast({
          title: 'Module déjà complété',
          description: 'Ce module a déjà été complété',
        });
        return;
      }

      
      // Vérifier si l'enregistrement existe déjà
      const { data: existingModuleProgression, error: checkError } = await supabase
        .from('user_module_progression')
        .select('id')
        .eq('progression_id', currentProgression.id)
        .eq('module_id', moduleId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Erreur vérification module:', checkError);
        throw checkError;
      }

      // Insérer ou mettre à jour selon le cas
      let insertError;
      if (existingModuleProgression) {
        // Mettre à jour l'enregistrement existant
        const { error } = await supabase
          .from('user_module_progression')
          .update({
            est_complete: true,
            date_completion: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingModuleProgression.id);
        insertError = error;
      } else {
        // Créer un nouvel enregistrement
        const { error } = await supabase
          .from('user_module_progression')
          .insert([{
            progression_id: currentProgression.id,
            module_id: moduleId,
            est_complete: true,
            date_completion: new Date().toISOString()
          }]);
        insertError = error;
      }

      if (insertError) {
        console.error('❌ Erreur insertion/modification module:', insertError);
        console.error('❌ Détails erreur:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        });
        throw insertError;
      }

      // Récupérer TOUS les modules complétés depuis la base de données pour être sûr d'avoir les bonnes données
      const { data: allCompletedModules, error: fetchModulesError } = await supabase
        .from('user_module_progression')
        .select('module_id')
        .eq('progression_id', currentProgression.id)
        .eq('est_complete', true);

      if (fetchModulesError) {
        console.error('❌ Erreur récupération modules complétés:', fetchModulesError);
      }

      const completedIdsFromDB = (allCompletedModules || []).map(m => m.module_id);
      
      // Mettre à jour l'état local avec les données de la DB
      setModulesCompletes(completedIdsFromDB);

      const newPercentage = Math.round((completedIdsFromDB.length / modules.length) * 100);
      const newModulesCompletes = completedIdsFromDB.length;
      const isAllCompleted = completedIdsFromDB.length === modules.length;

      // Préparer les données de mise à jour
      // Ne pas inclure modules_completes car cela cause une erreur "expected JSON array"
      // La colonne sera mise à jour automatiquement par un trigger ou calculée à la volée
      const updateData = {
        progression_pourcentage: isAllCompleted ? 100 : newPercentage,
        updated_at: new Date().toISOString()
      };

      // Si tous les modules sont complétés, finaliser le parcours
      if (isAllCompleted) {
        updateData.statut = 'termine';
        updateData.progression_pourcentage = 100;
        // Note: modules_completes n'est pas inclus car cela cause une erreur "expected JSON array"
      }

      const { error: updateError, data: updateResult } = await supabase
        .from('user_parcours_progression')
        .update(updateData)
        .eq('id', currentProgression.id)
        .select();

      if (updateError) {
        console.error('❌ Erreur mise à jour progression:', updateError);
        console.error('❌ Détails erreur:', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint
        });
        throw updateError;
      }

      
      if (updateResult && updateResult.length > 0) {
        const updated = updateResult[0];
        
        // Vérifier que la mise à jour a bien fonctionné
        if (isAllCompleted && updated.statut !== 'termine') {
          console.error('❌ ERREUR: Le statut devrait être "termine" mais est:', updated.statut);
        }
        if (isAllCompleted && updated.progression_pourcentage !== 100) {
          console.error('❌ ERREUR: La progression devrait être 100% mais est:', updated.progression_pourcentage);
        }
      } else {
        logger.warn('⚠️ Aucun résultat retourné par la mise à jour');
      }
      
      // Attendre un peu pour s'assurer que la base de données a bien enregistré
      await new Promise(resolve => setTimeout(resolve, 500));

      // Passer au module suivant si disponible
      if (moduleIndex < modules.length - 1 && !isAllCompleted) {
        setCurrentModuleIndex(moduleIndex + 1);
      }

      // Rafraîchir la progression locale pour vérifier que la mise à jour a bien fonctionné
      const { data: updatedProgression, error: fetchError } = await supabase
        .from('user_parcours_progression')
        .select('*')
        .eq('id', currentProgression.id)
        .single();

      if (fetchError) {
        console.error('❌ Erreur lors de la récupération de la progression mise à jour:', fetchError);
      } else if (updatedProgression) {
        setProgression(updatedProgression);
        
        // Vérifier une dernière fois que tout est correct
        if (isAllCompleted) {
          if (updatedProgression.statut !== 'termine') {
            console.error('❌ PROBLÈME: Le statut dans la DB est:', updatedProgression.statut, 'au lieu de "termine"');
          }
        }
      } else {
        logger.warn('⚠️ Aucune progression trouvée après mise à jour');
      }

      if (isAllCompleted) {
        // Vérifier une dernière fois que la mise à jour a bien fonctionné en relisant depuis la DB
        
        // Attendre un peu plus longtemps pour s'assurer que la DB est à jour
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Vérifier plusieurs fois que le statut est bien 'termine' (jusqu'à 3 tentatives)
        let finalCheck = null;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts && (!finalCheck || finalCheck.statut !== 'termine')) {
          attempts++;
          
          const { data: checkData, error: checkError } = await supabase
            .from('user_parcours_progression')
            .select('statut, progression_pourcentage, modules_completes')
            .eq('id', currentProgression.id)
            .single();
          
          if (checkError) {
            console.error('❌ Erreur lors de la vérification finale:', checkError);
            break;
          }
          
          finalCheck = checkData;
          
          if (finalCheck && finalCheck.statut === 'termine' && finalCheck.progression_pourcentage === 100) {
            break;
          } else if (finalCheck && finalCheck.progression_pourcentage === 100 && finalCheck.statut !== 'termine') {
            logger.warn(`⚠️ Progression à 100% mais statut="${finalCheck.statut}" au lieu de "termine". Tentative de correction...`);
            
            // Essayer de corriger le statut
            const { error: fixError } = await supabase
              .from('user_parcours_progression')
              .update({
                statut: 'termine',
                progression_pourcentage: 100,
                updated_at: new Date().toISOString()
              })
              .eq('id', currentProgression.id);
            
            if (fixError) {
              console.error('❌ Erreur lors de la correction du statut:', fixError);
            } else {
              // Attendre un peu avant de revérifier
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } else {
            // Attendre avant de réessayer
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        if (finalCheck) {
          
          if (finalCheck.statut !== 'termine' || finalCheck.progression_pourcentage !== 100) {
            console.error('❌ PROBLÈME: Les données ne sont pas correctes dans la DB après', maxAttempts, 'tentatives');
            console.error('  Attendu: statut=termine, progression=100%');
            console.error('  Reçu: statut=' + finalCheck.statut + ', progression=' + finalCheck.progression_pourcentage + '%');
          }
        }
        
        toast({
          title: 'Parcours terminé ! 🎉',
          description: 'Félicitations, vous avez terminé ce parcours à 100% !',
        });
        
        // Rediriger vers Transformation pour rafraîchir les données
        // Utiliser un timestamp unique pour forcer le rafraîchissement
        const refreshTimestamp = Date.now();
        navigate(`/transformation?refresh=${refreshTimestamp}&tab=statistiques`);
      } else {
        toast({
          title: 'Module complété !',
          description: 'Félicitations, vous avez terminé ce module',
        });
      }


    } catch (error) {
      console.error('❌ Error completing module:', error);
      console.error('Détails de l\'erreur:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast({
        title: 'Erreur',
        description: `Impossible de marquer le module comme complété: ${error.message || 'Erreur inconnue'}`,
        variant: 'destructive'
      });
    }
  };

  const isModuleLocked = (moduleIndex) => {
    if (moduleIndex === 0) return false;
    const previousModules = modules.slice(0, moduleIndex);
    return !previousModules.every(m => modulesCompletes.includes(m.id));
  };

  const isModuleCompleted = (moduleId) => {
    return modulesCompletes.includes(moduleId);
  };

  const canAccessModule = (moduleIndex) => {
    if (moduleIndex === 0) return true;
    return !isModuleLocked(moduleIndex);
  };

  const progressPercentage = modules.length > 0 
    ? Math.round((modulesCompletes.length / modules.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!parcours) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="bg-white border-gray-300">
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">Parcours introuvable</p>
            <Button onClick={() => navigate('/transformation')}>
              Retour à la bibliothèque
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{parcours.nom} | DiscipleLife</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="w-full max-w-screen-2xl mx-auto p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Forcer le rafraîchissement en ajoutant un timestamp à l'URL
                    navigate('/transformation?refresh=' + Date.now());
                  }}
                  className="text-gray-700 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-black">{parcours.nom}</h1>
                  <p className="text-sm text-gray-800 font-medium mt-1">{parcours.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge className="bg-blue-100 text-blue-700 border-0">
                  {parcours.niveau === 'debutant' ? 'Débutant' : 
                   parcours.niveau === 'intermediaire' ? 'Intermédiaire' : 
                   parcours.niveau === 'avance' ? 'Avancé' : parcours.niveau}
                </Badge>
                <span className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  {parcours.duree_jours} jours
                </span>
              </div>
            </div>

            {/* Barre de progression globale */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progression globale</span>
                <span className="text-sm font-semibold text-purple-600">
                  {modulesCompletes.length} / {modules.length} modules
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {progressPercentage}% complété
                </span>
                {progressPercentage === 100 && (
                  <Badge className="bg-green-500 text-white">
                    <Award className="w-3 h-3 mr-1" />
                    Parcours terminé
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="w-full max-w-screen-2xl mx-auto p-6">
          {modules.length === 0 ? (
            <Card className="bg-white border-gray-300 border-dashed">
              <CardContent className="py-16 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun module disponible</h3>
                <p className="text-gray-600 text-sm">Les modules de ce parcours seront bientôt disponibles.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Liste des modules (sidebar) */}
              <div className="lg:col-span-1">
                <Card className="bg-white border-gray-300 sticky top-24">
                  <CardHeader>
                    <CardTitle className="text-lg">Modules</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {modules.map((module, index) => {
                        const isCompleted = isModuleCompleted(module.id);
                        const isLocked = isModuleLocked(index);
                        const isCurrent = index === currentModuleIndex;

                        return (
                          <motion.div
                            key={module.id}
                            whileHover={{ x: 4 }}
                            className={`
                              p-3 rounded-lg border-2 cursor-pointer transition-all
                              ${isCurrent ? 'border-purple-600 bg-purple-50' : 'border-gray-200'}
                              ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:border-purple-300'}
                            `}
                            onClick={() => {
                              if (isLocked) {
                                toast({
                                  title: 'Module verrouillé',
                                  description: 'Vous devez compléter les modules précédents avant d\'accéder à ce module',
                                  variant: 'destructive'
                                });
                              } else {
                                setCurrentModuleIndex(index);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-1">
                                {isLocked ? (
                                  <Lock className="w-5 h-5 text-gray-400" />
                                ) : isCompleted ? (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                  <Circle className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-gray-500">
                                    Module {index + 1}
                                  </span>
                                  {isCompleted && (
                                    <Badge className="bg-green-500 text-white text-xs">
                                      Complété
                                    </Badge>
                                  )}
                                  {isLocked && (
                                    <Badge variant="outline" className="text-xs">
                                      Verrouillé
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                                  {module.titre}
                                </h4>
                                {module.duree_estimee && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                    <Clock className="w-3 h-3" />
                                    {module.duree_estimee} min
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Contenu du module actuel */}
              <div className="lg:col-span-2">
                {modules[currentModuleIndex] && (
                  <motion.div
                    key={modules[currentModuleIndex].id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <Card className="bg-white border-gray-300">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <Badge className="bg-purple-600 text-white mb-2">
                              Module {currentModuleIndex + 1} / {modules.length}
                            </Badge>
                            <CardTitle className="text-2xl text-black">
                              {modules[currentModuleIndex].titre}
                            </CardTitle>
                          </div>
                          {isModuleCompleted(modules[currentModuleIndex].id) && (
                            <Badge className="bg-green-500 text-white">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Complété
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {modules[currentModuleIndex].description && (
                          <p className="text-gray-700 leading-relaxed">
                            {modules[currentModuleIndex].description}
                          </p>
                        )}

                        {modules[currentModuleIndex].contenu && (
                          <div className="prose max-w-none">
                            <div 
                              className="text-gray-700 leading-relaxed"
                              dangerouslySetInnerHTML={{ 
                                __html: modules[currentModuleIndex].contenu 
                              }} 
                            />
                          </div>
                        )}

                        {modules[currentModuleIndex].ressources && (
                          <div className="border-t border-gray-200 pt-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Ressources</h4>
                            <div className="text-sm text-gray-600">
                              {modules[currentModuleIndex].ressources}
                            </div>
                          </div>
                        )}

                        {modules[currentModuleIndex].exercices && (
                          <div className="border-t border-gray-200 pt-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Exercices</h4>
                            <div className="text-sm text-gray-600">
                              {modules[currentModuleIndex].exercices}
                            </div>
                          </div>
                        )}

                        {(() => {
                          const hasPrevious = currentModuleIndex > 0;
                          const hasNext = currentModuleIndex < modules.length - 1;
                          const buttonCount = (hasPrevious ? 1 : 0) + (hasNext ? 1 : 0) + 1; // +1 pour "Module complété"
                          const shouldCenter = buttonCount === 2;
                          
                          return (
                            <div className={`flex items-center pt-4 border-t border-gray-200 ${
                              shouldCenter ? 'justify-center gap-2' : 'justify-between'
                            }`}>
                              <div className="flex items-center gap-2">
                                {hasPrevious && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentModuleIndex(currentModuleIndex - 1)}
                                  >
                                    <ArrowLeft className="w-4 h-4 mr-1" />
                                    Module précédent
                                  </Button>
                                )}
                                {hasNext && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentModuleIndex(currentModuleIndex + 1)}
                                    disabled={isModuleLocked(currentModuleIndex + 1)}
                                  >
                                    Module suivant
                                    <ArrowLeft className="w-4 h-4 ml-1 rotate-180" />
                                  </Button>
                                )}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleCompleteModule(modules[currentModuleIndex].id)}
                                disabled={isModuleCompleted(modules[currentModuleIndex].id)}
                                className={`${shouldCenter ? '' : 'ml-4'} ${
                                  isModuleCompleted(modules[currentModuleIndex].id)
                                    ? 'bg-green-500 text-white hover:bg-green-600 cursor-not-allowed'
                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                                }`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Module complété
                              </Button>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ParcoursDetail;

