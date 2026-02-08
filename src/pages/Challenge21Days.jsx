
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Trophy, Target, Flame, ChevronRight, Share2, Award, AlertCircle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import DayCard from '@/components/DayCard';

// --- Static Content Data ---
const CHALLENGE_BLOCKS = [
  {
    id: 'block_1',
    title: 'Fondements',
    days: [1, 2, 3, 4],
    description: 'Bâtir sa vie sur le Roc'
  },
  {
    id: 'block_2',
    title: 'Identité',
    days: [5, 6, 7, 8, 9],
    description: 'Savoir qui je suis en Christ'
  },
  {
    id: 'block_3',
    title: 'Liberté',
    days: [10, 11, 12, 13, 14],
    description: 'Briser les chaînes'
  },
  {
    id: 'block_4',
    title: 'Autorité',
    days: [15, 16, 17, 18],
    description: 'Marcher dans la puissance'
  },
  {
    id: 'block_5',
    title: 'Victoire',
    days: [19, 20, 21],
    description: 'Entrer dans sa destinée'
  }
];

const DAYS_CONTENT = {
  1: { id: 'day_1', dayNumber: 1, title: 'La Nouvelle Naissance', verseReference: '2 Corinthiens 5:17', verseText: "Si quelqu'un est en Christ, il est une nouvelle créature. Les choses anciennes sont passées; voici, toutes choses sont devenues nouvelles.", content: "Bienvenue dans ce défi ! Aujourd'hui, réalisez que votre passé ne définit plus votre futur. En Christ, vous repartez à zéro avec un potentiel divin." },
  2: { id: 'day_2', dayNumber: 2, title: 'La Parole de Dieu', verseReference: 'Matthieu 4:4', verseText: "L'homme ne vivra pas de pain seulement, mais de toute parole qui sort de la bouche de Dieu.", content: "La Bible n'est pas un livre ordinaire, c'est votre nourriture spirituelle quotidienne. Prenez le temps de la lire aujourd'hui." },
  3: { id: 'day_3', dayNumber: 3, title: 'La Prière', verseReference: '1 Thessaloniciens 5:17', verseText: "Priez sans cesse.", content: "La prière est simplement une conversation avec votre Père céleste. Parlez-Lui simplement, Il vous écoute." },
  4: { id: 'day_4', dayNumber: 4, title: 'La Communion', verseReference: 'Hébreux 10:25', verseText: "N'abandonnons pas notre assemblée, comme c'est la coutume de quelques-uns...", content: "Nous ne sommes pas faits pour marcher seuls. Trouvez quelqu'un avec qui partager votre foi aujourd'hui." },
  
  5: { id: 'day_5', dayNumber: 5, title: 'Enfant de Dieu', verseReference: 'Jean 1:12', verseText: "Mais à tous ceux qui l'ont reçue, à ceux qui croient en son nom, elle a donné le pouvoir de devenir enfants de Dieu.", content: "Vous n'êtes pas un esclave, vous êtes un fils, une fille du Roi des rois." },
  6: { id: 'day_6', dayNumber: 6, title: 'Pardonné et Justifié', verseReference: 'Romains 8:1', verseText: "Il n'y a donc maintenant aucune condamnation pour ceux qui sont en Jésus-Christ.", content: "La culpabilité n'a plus sa place. Acceptez le pardon total de Dieu aujourd'hui." },
  7: { id: 'day_7', dayNumber: 7, title: 'Temple du Saint-Esprit', verseReference: '1 Corinthiens 6:19', verseText: "Ne savez-vous pas que votre corps est le temple du Saint-Esprit qui est en vous ?", content: "Dieu n'habite pas dans des bâtiments de pierre, Il habite en vous. Honorez votre corps." },
  8: { id: 'day_8', dayNumber: 8, title: 'Citoyen des Cieux', verseReference: 'Philippiens 3:20', verseText: "Mais notre cité à nous est dans les cieux...", content: "Vous êtes un ambassadeur du Ciel sur la terre. Représentez bien votre Royaume." },
  9: { id: 'day_9', dayNumber: 9, title: 'Sel et Lumière', verseReference: 'Matthieu 5:14', verseText: "Vous êtes la lumière du monde.", content: "Ne cachez pas votre foi. Brillez là où Dieu vous a placé." },

  10: { id: 'day_10', dayNumber: 10, title: 'Libre du Péché', verseReference: 'Jean 8:36', verseText: "Si donc le Fils vous affranchit, vous serez réellement libres.", content: "Le péché n'a plus de domination sur vous. Proclamez votre liberté." },
  11: { id: 'day_11', dayNumber: 11, title: 'Libre de la Peur', verseReference: '2 Timothée 1:7', verseText: "Car ce n'est pas un esprit de timidité que Dieu nous a donné...", content: "La peur est une menteuse. Affrontez votre journée avec courage." },
  12: { id: 'day_12', dayNumber: 12, title: 'Libre du Passé', verseReference: 'Ésaïe 43:18', verseText: "Ne pensez plus aux événements passés...", content: "Ne laissez pas vos échecs d'hier voler vos victoires d'aujourd'hui." },
  13: { id: 'day_13', dayNumber: 13, title: 'Le Pardon', verseReference: 'Colossiens 3:13', verseText: "Pardonnez-vous réciproquement.", content: "Le pardon est une clé qui ouvre la porte de votre propre prison." },
  14: { id: 'day_14', dayNumber: 14, title: 'La Vérité', verseReference: 'Jean 8:32', verseText: "Vous connaîtrez la vérité, et la vérité vous affranchira.", content: "Remplacez les mensonges de l'ennemi par la vérité de la Parole." },

  15: { id: 'day_15', dayNumber: 15, title: 'Le Nom de Jésus', verseReference: 'Philippiens 2:9-10', verseText: "Dieu l'a souverainement élevé et lui a donné le nom qui est au-dessus de tout nom.", content: "Il y a de la puissance dans le nom de Jésus. Utilisez-le !" },
  16: { id: 'day_16', dayNumber: 16, title: 'L\'Armure de Dieu', verseReference: 'Éphésiens 6:11', verseText: "Revêtez-vous de toutes les armes de Dieu...", content: "Vous êtes dans un combat spirituel. Ne sortez pas sans votre armure." },
  17: { id: 'day_17', dayNumber: 17, title: 'Résister', verseReference: 'Jacques 4:7', verseText: "Soumettez-vous donc à Dieu; résistez au diable, et il fuira loin de vous.", content: "Votre soumission à Dieu est votre plus grande force contre l'ennemi." },
  18: { id: 'day_18', dayNumber: 18, title: 'La Louange', verseReference: 'Psaume 22:3', verseText: "Pourtant tu es le Saint, Tu sièges au milieu des louanges d'Israël.", content: "La louange change l'atmosphère. Louez Dieu avant même de voir la réponse." },

  19: { id: 'day_19', dayNumber: 19, title: 'Plus que Vainqueurs', verseReference: 'Romains 8:37', verseText: "Mais dans toutes ces choses nous sommes plus que vainqueurs par celui qui nous a aimés.", content: "La victoire est déjà acquise. Marchez la tête haute." },
  20: { id: 'day_20', dayNumber: 20, title: 'La Persévérance', verseReference: 'Galates 6:9', verseText: "Ne nous lassons pas de faire le bien...", content: "La course n'est pas pour les plus rapides, mais pour ceux qui tiennent bon." },
  21: { id: 'day_21', dayNumber: 21, title: 'Vers la Destinée', verseReference: 'Jérémie 29:11', verseText: "Car je connais les projets que j'ai formés sur vous...", content: "Ce n'est que le début. Dieu a un plan merveilleux pour la suite de votre vie !" },
};

const Challenge21Days = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('block_1');
  const [progressData, setProgressData] = useState({});
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [error, setError] = useState(null);

  // Fetch Progress
  useEffect(() => {
    if (user?.id) fetchProgress();
  }, [user]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('module_type', 'challenge_21');

      if (error) throw error;

      // Transform array to object for easier access { 'day_1': { ...data } }
      const progressMap = {};
      data?.forEach(item => {
        progressMap[item.item_id] = item;
      });
      setProgressData(progressMap);
      calculateStreak(data || []);
    } catch (error) {
      console.error('Error fetching progress:', error);
      setError("Impossible de charger votre progression. Veuillez vérifier votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = (data) => {
    // Only count completed items
    const completedItems = data
        .filter(i => i.status === 'completed' && i.completed_at)
        .map(i => new Date(i.completed_at).setHours(0,0,0,0))
        .sort((a, b) => b - a); // Descending order
    
    if (completedItems.length === 0) {
        setStreak(0);
        return;
    }

    // Unique dates set
    const uniqueDates = [...new Set(completedItems)];
    let currentStreak = 0;
    
    // Check if streak is active (today or yesterday must be present)
    const today = new Date().setHours(0,0,0,0);
    const yesterday = new Date(today - 86400000).setHours(0,0,0,0);

    // If neither today nor yesterday is in the list, streak is broken (0)
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
         setStreak(0);
         return;
    }

    // Calculate sequence
    let expectedDate = uniqueDates[0];
    
    for (let date of uniqueDates) {
        if (date === expectedDate) {
            currentStreak++;
            expectedDate = date - 86400000; // Expect previous day next
        } else {
            break;
        }
    }
    setStreak(currentStreak);
  };

  const getDayStatus = (dayNum) => {
    const dayId = `day_${dayNum}`;
    const previousDayId = `day_${dayNum - 1}`;
    
    // Check if current day is completed in DB
    if (progressData[dayId]?.status === 'completed') return 'completed';
    
    // Day 1 is always unlocked if not completed
    if (dayNum === 1) return 'available';

    // Check if previous day is completed
    if (progressData[previousDayId]?.status === 'completed') return 'available';

    return 'locked';
  };

  const handleToggleComplete = async (dayId, isCompleted) => {
    try {
      const status = isCompleted ? 'completed' : 'started'; 
      const completedAt = isCompleted ? new Date().toISOString() : null;
      const progress = isCompleted ? 100 : 0;

      // Optimistic update
      const newProgressData = {
          ...progressData,
          [dayId]: { 
              ...progressData[dayId], 
              status, 
              completed_at: completedAt,
              progress_percentage: progress 
          }
      };
      setProgressData(newProgressData);
      
      // Recalculate streak immediately
      const dataArray = Object.values(newProgressData);
      calculateStreak(dataArray);

      // DB Update
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          module_type: 'challenge_21',
          item_id: dayId,
          status: status,
          progress_percentage: progress,
          completed_at: completedAt,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, module_type, item_id' });

      if (error) throw error;

      if (isCompleted) {
        toast({
            title: "Félicitations ! 🎉",
            description: "Jour validé avec succès. Continuez sur votre lancée !",
            className: "bg-green-50 border-green-200 text-green-900"
        });
      }

    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder la progression."
      });
      fetchProgress(); // Revert on error
    }
  };

  const handleSaveNotes = async (dayId, notes) => {
      try {
        const currentData = progressData[dayId] || {};
        
        const { error: upsertError } = await supabase
          .from('user_progress')
          .upsert({
             user_id: user.id,
             module_type: 'challenge_21',
             item_id: dayId,
             status: currentData.status || 'started', 
             progress_percentage: currentData.progress_percentage || 0,
             completed_at: currentData.completed_at,
             notes: notes,
             updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, module_type, item_id' });

        if (upsertError) throw upsertError;
        
        // Update local state
        setProgressData(prev => ({
            ...prev,
            [dayId]: { ...prev[dayId], notes }
        }));

      } catch (error) {
          console.error("Error saving notes", error);
          toast({
              variant: "destructive",
              title: "Erreur",
              description: "Échec de la sauvegarde des notes."
          });
      }
  };

  // Calculate Global Stats
  const totalDays = 21;
  const completedDaysCount = Object.values(progressData).filter(d => d.status === 'completed').length;
  const globalProgress = Math.round((completedDaysCount / totalDays) * 100);

  if (loading && !progressData.length) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-4">
              <Loader2 size={48} className="animate-spin text-primary" />
              <p>Chargement de votre défi...</p>
          </div>
      );
  }

  if (error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-red-600 gap-4 p-8 text-center">
            <AlertCircle size={48} />
            <h3 className="text-xl font-bold">Une erreur est survenue</h3>
            <p>{error}</p>
            <Button onClick={fetchProgress} variant="outline">Réessayer</Button>
        </div>
      );
  }

  return (
    <>
      <Helmet>
        <title>Challenge 21 Jours | DiscipleLife</title>
      </Helmet>
      
      <div className="w-full max-w-screen-2xl mx-auto space-y-8 pb-12">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-8 shadow-xl">
           <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-10 -translate-y-10">
               <Target size={200} />
           </div>
           
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
               <div>
                   <h1 className="text-3xl font-bold mb-2">Challenge 21 Jours</h1>
                   <p className="text-indigo-100 max-w-lg">
                       Transformez votre vie spirituelle en 3 semaines. Une discipline quotidienne pour une destinée éternelle.
                   </p>
               </div>
               
               <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
                   <div className="text-center">
                       <div className="flex items-center justify-center gap-2 text-yellow-300 font-bold text-2xl">
                           <Flame className="fill-yellow-300" /> {streak}
                       </div>
                       <div className="text-xs text-indigo-200 uppercase tracking-wider font-semibold">Jours de suite</div>
                   </div>
                   <div className="w-px h-10 bg-white/20"></div>
                   <div className="text-center">
                       <div className="flex items-center justify-center gap-2 text-white font-bold text-2xl">
                           <Trophy className="text-yellow-400" /> {completedDaysCount}/21
                       </div>
                       <div className="text-xs text-indigo-200 uppercase tracking-wider font-semibold">Jours validés</div>
                   </div>
               </div>
           </div>

           <div className="mt-8 space-y-2">
               <div className="flex justify-between text-sm font-medium text-indigo-100">
                   <span>Progression globale</span>
                   <span>{globalProgress}%</span>
               </div>
               <Progress value={globalProgress} className="h-3 bg-indigo-900/50" indicatorClassName="bg-yellow-400" />
           </div>
        </div>

        {/* Blocks Navigation */}
        <Tabs defaultValue="block_1" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex flex-wrap h-auto w-full justify-start bg-transparent p-0 gap-2 mb-6">
                {CHALLENGE_BLOCKS.map((block, index) => {
                    // Calculate block progress
                    const blockTotal = block.days.length;
                    const blockCompleted = block.days.filter(d => progressData[`day_${d}`]?.status === 'completed').length;
                    const isUnlocked = index === 0 || CHALLENGE_BLOCKS[index - 1].days.every(d => progressData[`day_${d}`]?.status === 'completed');
                    
                    return (
                        <TabsTrigger 
                            key={block.id} 
                            value={block.id}
                            disabled={!isUnlocked && !loading} 
                            className="flex-1 min-w-[120px] flex flex-col items-start p-3 data-[state=active]:bg-white data-[state=active]:shadow-md border border-transparent data-[state=active]:border-slate-200 rounded-xl transition-all"
                        >
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Bloc {index + 1}</span>
                            <span className="font-bold text-slate-800 text-lg mb-2">{block.title}</span>
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-primary transition-all duration-500" 
                                    style={{ width: `${(blockCompleted / blockTotal) * 100}%` }} 
                                />
                            </div>
                        </TabsTrigger>
                    );
                })}
            </TabsList>

            {CHALLENGE_BLOCKS.map((block) => (
                <TabsContent key={block.id} value={block.id} className="mt-0 focus-visible:outline-none">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                           {block.title} <span className="text-slate-400 font-normal text-base">• {block.description}</span>
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {block.days.map((dayNum) => {
                            const day = DAYS_CONTENT[dayNum];
                            const status = getDayStatus(dayNum);
                            const dayId = `day_${dayNum}`;
                            
                            return (
                                <DayCard 
                                    key={dayNum}
                                    day={day}
                                    status={status}
                                    onToggleComplete={handleToggleComplete}
                                    onSaveNotes={handleSaveNotes}
                                    savedNotes={progressData[dayId]?.notes}
                                />
                            );
                        })}
                    </div>
                </TabsContent>
            ))}
        </Tabs>

        {completedDaysCount === 21 && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-yellow-300 to-yellow-500 p-8 rounded-2xl text-center shadow-xl text-yellow-950 mt-12"
            >
                <Award size={64} className="mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-2">Challenge Terminé !</h2>
                <p className="text-lg font-medium opacity-90 mb-6">Vous avez complété les 21 jours avec succès. Vous êtes un véritable champion spirituel !</p>
                <Button className="bg-white text-yellow-600 hover:bg-yellow-50 font-bold text-lg px-8 h-12">
                    <Share2 className="mr-2" size={20} /> Partager ma victoire
                </Button>
            </motion.div>
        )}
      </div>
    </>
  );
};

export default Challenge21Days;
