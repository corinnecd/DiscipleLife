
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { 
  Trophy, 
  Medal, 
  Star, 
  TrendingUp, 
  Users, 
  Calendar, 
  Shield, 
  Crown,
  Flame,
  Zap,
  Loader2,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';

// Badge Definitions
const BADGES = {
  'first_step': { id: 'first_step', label: 'Premier Pas', icon: '👣', desc: 'Compléter votre première activité' },
  'prayer_warrior': { id: 'prayer_warrior', label: 'Guerrier de Prière', icon: '🙏', desc: 'Soumettre 10 requêtes de prière' },
  'disciple_maker': { id: 'disciple_maker', label: 'Faiseur de Disciples', icon: '👥', desc: 'Ajouter 3 disciples' },
  'video_scholar': { id: 'video_scholar', label: 'Erudit Vidéo', icon: '📺', desc: 'Regarder 5 heures de contenu Impact X' },
  'streak_master': { id: 'streak_master', label: 'Maître de la Constance', icon: '🔥', desc: '7 jours consécutifs d\'activité' },
  'evangelist': { id: 'evangelist', label: 'Évangéliste', icon: '📢', desc: 'Partager l\'évangile avec 5 personnes' }
};

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5000];

const ImpactXLeaderboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all_time');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, timeFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch User Stats
      let { data: myStats, error: myStatsError } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (myStatsError && myStatsError.code !== 'PGRST116') throw myStatsError;

      // If no stats exist, create initial record
      if (!myStats) {
         const { data: newStats, error: createError } = await supabase
            .from('user_points')
            .insert([{ user_id: user.id, points: 0, level: 1, badges: [] }])
            .select()
            .single();
         if (!createError) myStats = newStats;
      }

      setUserStats(myStats);

      // 2. Fetch Leaderboard (Top 50)
      // In a real scenario with time filters, we'd sum activities table.
      // For simplified demo, we assume user_points tracks all-time, 
      // and we simulate filtering or just show all-time points.
      // Let's stick to all-time points for the main ranking table to keep it fast.
      const { data: rankingData, error: rankingError } = await supabase
        .from('user_points')
        .select(`
            *,
            profils:user_id (first_name, last_name, avatar_url, role)
        `)
        .order('points', { ascending: false })
        .limit(50);

      if (rankingError) throw rankingError;
      setLeaderboard(rankingData || []);

      // 3. Fetch Recent Activities for User
      const { data: activitiesData } = await supabase
         .from('leaderboard_activities')
         .select('*')
         .eq('user_id', user.id)
         .order('created_at', { ascending: false })
         .limit(5);
         
      setRecentActivities(activitiesData || []);

    } catch (error) {
      console.error("Leaderboard error:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger le classement."
      });
    } finally {
      setLoading(false);
    }
  };

  const getLevelProgress = (points) => {
      // Find current level threshold
      let currentLevelIdx = 0;
      for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
          if (points >= LEVEL_THRESHOLDS[i]) currentLevelIdx = i;
          else break;
      }
      
      const currentThreshold = LEVEL_THRESHOLDS[currentLevelIdx];
      const nextThreshold = LEVEL_THRESHOLDS[currentLevelIdx + 1] || currentThreshold * 1.5;
      
      const progress = ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
      return {
          currentLevel: currentLevelIdx + 1,
          nextThreshold,
          progress: Math.min(100, Math.max(0, progress))
      };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
      </div>
    );
  }

  const { currentLevel, nextThreshold, progress } = getLevelProgress(userStats?.points || 0);
  const userRank = leaderboard.findIndex(u => u.user_id === user.id) + 1;
  const userBadges = userStats?.badges || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <Helmet>
        <title>Classement Impact X | DiscipleLife</title>
      </Helmet>

      {/* Hero Header */}
      <div className="relative bg-gradient-to-b from-purple-900/20 to-slate-950 pt-10 pb-8 px-4 border-b border-white/5">
         <div className="w-full max-w-screen-2xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
                        <Trophy className="h-8 w-8 text-yellow-500" />
                        Classement Impact X
                    </h1>
                    <p className="text-slate-400 mt-2 max-w-lg">
                        Gagnez des points en complétant des vidéos, en invitant des disciples et en restant constant dans votre progression spirituelle.
                    </p>
                </div>

                {/* User Quick Stats Card */}
                {userStats && (
                    <Card className="bg-slate-900/80 border-purple-500/30 backdrop-blur-sm w-full md:w-auto min-w-[300px]">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="relative">
                                <Avatar className="h-16 w-16 border-2 border-purple-500">
                                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                                    <AvatarFallback className="bg-purple-900 text-purple-200">
                                        {getInitials(user?.email)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full border border-slate-900">
                                    Lvl {currentLevel}
                                </div>
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-white">Rang #{userRank > 0 ? userRank : '-'}</span>
                                    <span className="text-purple-400 font-mono text-sm">{userStats.points} pts</span>
                                </div>
                                <Progress value={progress} className="h-2 bg-slate-800" indicatorClassName="bg-gradient-to-r from-purple-500 to-pink-500" />
                                <div className="text-xs text-slate-500 text-right">
                                    {Math.floor(nextThreshold - userStats.points)} pts pour le niveau {currentLevel + 1}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
         </div>
      </div>

      <div className="w-full max-w-screen-2xl mx-auto p-4 md:p-8 space-y-8">
         
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Leaderboard */}
            <div className="lg:col-span-2 space-y-6">
               <div className="flex items-center justify-between bg-slate-900/50 p-1 rounded-lg border border-white/5 inline-flex">
                   <Tabs defaultValue="all_time" value={timeFilter} onValueChange={setTimeFilter}>
                      <TabsList className="bg-transparent border-0">
                         <TabsTrigger value="this_week" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Cette Semaine</TabsTrigger>
                         <TabsTrigger value="this_month" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Ce Mois</TabsTrigger>
                         <TabsTrigger value="all_time" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Toujours</TabsTrigger>
                      </TabsList>
                   </Tabs>
               </div>

               <Card className="bg-slate-900 border-slate-800 overflow-hidden">
                  <div className="p-0">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase text-slate-500 font-medium">
                              <th className="p-4 w-16 text-center">Rang</th>
                              <th className="p-4">Disciple</th>
                              <th className="p-4 text-center">Niveau</th>
                              <th className="p-4 text-right">Points</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                           {leaderboard.map((entry, index) => {
                              const rank = index + 1;
                              const isMe = entry.user_id === user.id;
                              
                              return (
                                 <motion.tr 
                                    key={entry.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`group hover:bg-slate-800/50 transition-colors ${isMe ? 'bg-purple-900/10 border-l-2 border-purple-500' : ''}`}
                                 >
                                    <td className="p-4 text-center">
                                       {rank === 1 && <Crown className="h-6 w-6 text-yellow-400 mx-auto" />}
                                       {rank === 2 && <Medal className="h-6 w-6 text-slate-300 mx-auto" />}
                                       {rank === 3 && <Medal className="h-6 w-6 text-amber-600 mx-auto" />}
                                       {rank > 3 && <span className="font-mono text-slate-500 font-bold">{rank}</span>}
                                    </td>
                                    <td className="p-4">
                                       <div className="flex items-center gap-3">
                                          <Avatar className="h-10 w-10 border border-slate-700">
                                              <AvatarImage src={entry.profils?.avatar_url} />
                                              <AvatarFallback className={`${getAvatarColor(entry.profils?.first_name)} text-white`}>
                                                  {getInitials(entry.profils?.first_name)}
                                              </AvatarFallback>
                                          </Avatar>
                                          <div>
                                              <div className={`font-medium ${isMe ? 'text-purple-400' : 'text-slate-200'}`}>
                                                  {entry.profils?.first_name} {entry.profils?.last_name}
                                                  {isMe && <Badge className="ml-2 bg-purple-500/20 text-purple-300 text-[10px] py-0">Moi</Badge>}
                                              </div>
                                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                                 <Shield size={10} /> {entry.profils?.role || 'Disciple'}
                                              </div>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="p-4 text-center">
                                       <Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-300">
                                          Lvl {entry.level}
                                       </Badge>
                                    </td>
                                    <td className="p-4 text-right font-mono font-bold text-slate-100">
                                       {entry.points.toLocaleString()}
                                    </td>
                                 </motion.tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               </Card>
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
               {/* Badges Section */}
               <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                     <CardTitle className="text-white flex items-center gap-2">
                        <Medal className="h-5 w-5 text-pink-500" />
                        Badges ({userBadges.length}/{Object.keys(BADGES).length})
                     </CardTitle>
                  </CardHeader>
                  <CardContent>
                     <div className="grid grid-cols-3 gap-4">
                        {Object.values(BADGES).map((badge) => {
                           const isUnlocked = userBadges.includes(badge.id); // In real DB this might be array of objects, simple string array for now
                           return (
                              <div 
                                key={badge.id} 
                                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-center transition-all ${isUnlocked ? 'bg-purple-900/20 border-purple-500/30' : 'bg-slate-950 border-slate-800 opacity-50 grayscale'}`}
                                title={badge.desc}
                              >
                                 <div className="text-2xl">{badge.icon}</div>
                                 <div className="text-[10px] font-medium text-slate-300 leading-tight">
                                    {badge.label}
                                 </div>
                                 {!isUnlocked && <Lock className="h-3 w-3 text-slate-600 mt-1" />}
                              </div>
                           );
                        })}
                     </div>
                  </CardContent>
               </Card>
               
               {/* Streaks Card */}
               <Card className="bg-gradient-to-br from-orange-900/20 to-slate-900 border-orange-500/20">
                  <CardContent className="p-6 flex items-center justify-between">
                     <div>
                        <div className="text-sm text-orange-200 font-medium mb-1">Série Actuelle</div>
                        <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                           {userStats?.streak || 0} <span className="text-sm font-normal text-orange-400">jours</span>
                        </div>
                     </div>
                     <div className="h-14 w-14 rounded-full bg-orange-500/20 flex items-center justify-center animate-pulse">
                        <Flame className="h-8 w-8 text-orange-500" />
                     </div>
                  </CardContent>
               </Card>

               {/* Recent Achievements */}
               <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                     <CardTitle className="text-white flex items-center gap-2 text-base">
                        <Zap className="h-4 w-4 text-blue-400" />
                        Activités Récentes
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     {recentActivities.length > 0 ? recentActivities.map((act) => (
                        <div key={act.id} className="flex items-start gap-3 text-sm">
                           <div className="mt-0.5 min-w-[4px] h-4 rounded-full bg-blue-500" />
                           <div>
                              <p className="text-slate-300">{act.activity_type.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-slate-500">
                                 +{act.points_earned} pts • {new Date(act.created_at).toLocaleDateString()}
                              </p>
                           </div>
                        </div>
                     )) : (
                        <p className="text-sm text-slate-500 italic">Aucune activité récente.</p>
                     )}
                  </CardContent>
               </Card>
            </div>
         </div>
      </div>
    </div>
  );
};

export default ImpactXLeaderboard;
