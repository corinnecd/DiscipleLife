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
          console.log('✅ Tous les modules sont complétés, mise à jour du statut du parcours...');
          console.log('📊 Modules complétés:', completedIds.length, '/', modulesToCheck.length);
          console.log('📊 Statut actuel dans DB:', dbProgression?.statut || 'non trouvé');
          console.log('📊 Progression actuelle dans DB:', dbProgression?.progression_pourcentage || 0, '%');
          
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
            console.log('✅ Statut du parcours mis à jour à "termine"');
            console.log('📊 Résultat mise à jour:', updateResult);
            // Rafraîchir la progression
            const { data: updatedProg } = await supabase
              .from('user_parcours_progression')
              .select('*')
              .eq('id', progressionId)
              .single();
            if (updatedProg) {
              console.log('✅ Progression rafraîchie:', updatedProg);
              setProgression(updatedProg);
            }
          }
        } else {
          console.log('✅ Parcours déjà marqué comme terminé dans la DB');
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
      console.log('➕ Création progression pour parcours:', parcoursId, 'user:', user?.id);
      
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
        console.log('✅ Progression existe déjà:', existing);
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
      
      console.log('✅ Progression créée avec succès:', data);
      setProgression(data);
      return data;
    } catch (error) {
      console.error('❌ Error creating progression:', error);
      throw error;
    }
  };

  const handleCompleteModule = async (moduleId) => {
    try {
      console.log('🔄 Début handleCompleteModule pour module:', moduleId);
      console.log('📊 Progression actuelle:', progression);
      console.log('✅ Modules complétés:', modulesCompletes);

      // S'assurer que la progression existe AVANT de continuer
      let currentProgression = progression;
      if (!currentProgression) {
        console.log('⚠️ Pas de progression, création en cours...');
        try {
          const newProgression = await createProgression();
          if (!newProgression) {
            throw new Error('La création de progression a échoué');
          }
          currentProgression = newProgression;
          setProgression(newProgression);
          console.log('✅ Progression créée et récupérée:', currentProgression);
          
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
      console.log('📍 Index du module:', moduleIndex);
      
      if (moduleIndex > 0) {
        const previousModules = modules.slice(0, moduleIndex);
        const allPreviousCompleted = previousModules.every(m => 
          modulesCompletes.includes(m.id)
        );

        console.log('🔍 Modules précédents:', previousModules.map(m => m.titre));
        console.log('✅ Tous complétés?', allPreviousCompleted);

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

      console.log('💾 Insertion dans user_module_progression...');
      
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
        console.log('🔄 Mise à jour module progression existante:', existingModuleProgression.id);
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
        console.log('➕ Création nouvelle progression module');
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

      console.log('✅ Module marqué comme complété dans la base');

      // Récupérer TOUS les modules complétés depuis la base de données pour être sûr d'avoir les bonnes données
      console.log('🔄 Récupération des modules complétés depuis la DB...');
      const { data: allCompletedModules, error: fetchModulesError } = await supabase
        .from('user_module_progression')
        .select('module_id')
        .eq('progression_id', currentProgression.id)
        .eq('est_complete', true);

      if (fetchModulesError) {
        console.error('❌ Erreur récupération modules complétés:', fetchModulesError);
      }

      const completedIdsFromDB = (allCompletedModules || []).map(m => m.module_id);
      console.log('📊 Modules complétés depuis la DB:', completedIdsFromDB.length, completedIdsFromDB);
      
      // Mettre à jour l'état local avec les données de la DB
      setModulesCompletes(completedIdsFromDB);

      const newPercentage = Math.round((completedIdsFromDB.length / modules.length) * 100);
      const newModulesCompletes = completedIdsFromDB.length;
      const isAllCompleted = completedIdsFromDB.length === modules.length;

      console.log('📊 État actuel des modules:');
      console.log('  - Modules complétés (depuis DB):', completedIdsFromDB.length, completedIdsFromDB);
      console.log('  - Module actuel complété:', moduleId);
      console.log('  - Nombre total de modules:', modules.length);
      console.log('  - Modules dans le parcours:', modules.map(m => ({ id: m.id, titre: m.titre })));
      console.log('📈 Nouvelle progression:', newPercentage, '% -', newModulesCompletes, 'modules');
      console.log('🎯 Tous les modules complétés?', isAllCompleted, `(${completedIdsFromDB.length} === ${modules.length})`);

      // Préparer les données de mise à jour
      // Ne pas inclure modules_completes car cela cause une erreur "expected JSON array"
      // La colonne sera mise à jour automatiquement par un trigger ou calculée à la volée
      const updateData = {
        progression_pourcentage: isAllCompleted ? 100 : newPercentage,
        updated_at: new Date().toISOString()
      };

      // Si tous les modules sont complétés, finaliser le parcours
      if (isAllCompleted) {
        console.log('🎉 Tous les modules sont complétés, finalisation du parcours...');
        console.log('📊 Nombre total de modules:', modules.length);
        console.log('📊 Modules complétés depuis DB:', completedIdsFromDB.length);
        updateData.statut = 'termine';
        updateData.progression_pourcentage = 100;
        // Note: modules_completes n'est pas inclus car cela cause une erreur "expected JSON array"
        // Note: date_fin_reelle n'est pas ajoutée car la colonne n'existe pas encore dans la DB
        console.log('📊 Données de mise à jour complètes:', updateData);
      }

      console.log('📤 Mise à jour de la progression avec:', updateData);
      console.log('🆔 ID de la progression à mettre à jour:', currentProgression.id);

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

      console.log('✅ Progression mise à jour avec succès');
      console.log('📊 Résultat de la mise à jour:', updateResult);
      
      if (updateResult && updateResult.length > 0) {
        const updated = updateResult[0];
        console.log('✅ Vérification des données mises à jour:');
        console.log('  - Statut:', updated.statut);
        console.log('  - Progression:', updated.progression_pourcentage, '%');
        console.log('  - Modules complétés:', updated.modules_completes);
        
        // Vérifier que la mise à jour a bien fonctionné
        if (isAllCompleted && updated.statut !== 'termine') {
          console.error('❌ ERREUR: Le statut devrait être "termine" mais est:', updated.statut);
        }
        if (isAllCompleted && updated.progression_pourcentage !== 100) {
          console.error('❌ ERREUR: La progression devrait être 100% mais est:', updated.progression_pourcentage);
        }
      } else {
        console.warn('⚠️ Aucun résultat retourné par la mise à jour');
      }
      
      // Attendre un peu pour s'assurer que la base de données a bien enregistré
      await new Promise(resolve => setTimeout(resolve, 500));

      // Passer au module suivant si disponible
      if (moduleIndex < modules.length - 1 && !isAllCompleted) {
        console.log('➡️ Passage au module suivant:', moduleIndex + 1);
        setCurrentModuleIndex(moduleIndex + 1);
      }

      // Rafraîchir la progression locale pour vérifier que la mise à jour a bien fonctionné
      console.log('🔄 Vérification de la progression mise à jour...');
      const { data: updatedProgression, error: fetchError } = await supabase
        .from('user_parcours_progression')
        .select('*')
        .eq('id', currentProgression.id)
        .single();

      if (fetchError) {
        console.error('❌ Erreur lors de la récupération de la progression mise à jour:', fetchError);
      } else if (updatedProgression) {
        console.log('✅ Progression récupérée après mise à jour:');
        console.log('  - Statut:', updatedProgression.statut);
        console.log('  - Progression:', updatedProgression.progression_pourcentage, '%');
        console.log('  - Modules complétés:', updatedProgression.modules_completes);
        setProgression(updatedProgression);
        
        // Vérifier une dernière fois que tout est correct
        if (isAllCompleted) {
          if (updatedProgression.statut !== 'termine') {
            console.error('❌ PROBLÈME: Le statut dans la DB est:', updatedProgression.statut, 'au lieu de "termine"');
          } else {
            console.log('✅ CONFIRMÉ: Le parcours est bien marqué comme "termine" dans la base de données');
          }
        }
      } else {
        console.warn('⚠️ Aucune progression trouvée après mise à jour');
      }

      if (isAllCompleted) {
        // Vérifier une dernière fois que la mise à jour a bien fonctionné en relisant depuis la DB
        console.log('🔍 Vérification finale avant redirection...');
        
        // Attendre un peu plus longtemps pour s'assurer que la DB est à jour
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Vérifier plusieurs fois que le statut est bien 'termine' (jusqu'à 3 tentatives)
        let finalCheck = null;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts && (!finalCheck || finalCheck.statut !== 'termine')) {
          attempts++;
          console.log(`🔄 Tentative ${attempts}/${maxAttempts} de vérification du statut...`);
          
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
            console.log('✅ CONFIRMÉ: Le parcours est bien terminé à 100% dans la base de données');
            break;
          } else if (finalCheck && finalCheck.progression_pourcentage === 100 && finalCheck.statut !== 'termine') {
            console.warn(`⚠️ Progression à 100% mais statut="${finalCheck.statut}" au lieu de "termine". Tentative de correction...`);
            
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
              console.log('✅ Statut corrigé avec succès');
              // Attendre un peu avant de revérifier
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } else {
            // Attendre avant de réessayer
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        if (finalCheck) {
          console.log('✅ Vérification finale - Données dans la DB:');
          console.log('  - Statut:', finalCheck.statut);
          console.log('  - Progression:', finalCheck.progression_pourcentage, '%');
          console.log('  - Modules complétés:', finalCheck.modules_completes);
          
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
        console.log('🔄 Redirection vers Transformation avec rafraîchissement...');
        const refreshTimestamp = Date.now();
        navigate(`/transformation?refresh=${refreshTimestamp}&tab=statistiques`);
      } else {
        toast({
          title: 'Module complété !',
          description: 'Félicitations, vous avez terminé ce module',
        });
      }

      console.log('✅ handleCompleteModule terminé avec succès');

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
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
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
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          {modules.length === 0 ? (
            <Card className="bg-white border-gray-300">
              <CardContent className="py-12 text-center">
                <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Aucun module disponible pour ce parcours</p>
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

