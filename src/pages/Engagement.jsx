import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Award, Trophy, Target, TrendingUp, Activity, Users, BookOpen,
  Heart, Calendar, Gift, Star, Zap, BarChart3, PieChart,
  ArrowRight, Loader2, CheckCircle, Clock, Flame, Bell, X,
  Footprints, GraduationCap, BookOpen as BookOpenIcon, Crown
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Helmet } from 'react-helmet';

const Engagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  // Fonction helper pour obtenir l'icône d'un badge
  const getBadgeIcon = (badge) => {
    // Si l'icône est un emoji, l'afficher directement
    if (badge?.icone && /[\u{1F300}-\u{1F9FF}]/u.test(badge.icone)) {
      return <span className="text-4xl">{badge.icone}</span>;
    }
    
    // Mapping des noms de badges vers des icônes Lucide React
    const iconMap = {
      'Premier Pas': <Footprints className="w-10 h-10 text-purple-600" />,
      'Étudiant': <GraduationCap className="w-10 h-10 text-purple-600" />,
      'Apprenti': <BookOpenIcon className="w-10 h-10 text-purple-600" />,
      'Érudit': <BookOpenIcon className="w-10 h-10 text-purple-600" />,
      'Fidèle': <Heart className="w-10 h-10 text-purple-600" />,
      'Assidu': <Activity className="w-10 h-10 text-purple-600" />,
      'Pilier': <Award className="w-10 h-10 text-purple-600" />,
      'Guerrier de Prière': <Target className="w-10 h-10 text-purple-600" />,
      'Intercesseur': <Heart className="w-10 h-10 text-purple-600" />,
      'Maître de Prière': <Trophy className="w-10 h-10 text-purple-600" />,
      'Serviteur': <Users className="w-10 h-10 text-purple-600" />,
      'Bénévole': <Zap className="w-10 h-10 text-purple-600" />,
      'Ministre': <Star className="w-10 h-10 text-purple-600" />,
      'Connecté': <Users className="w-10 h-10 text-purple-600" />,
      'Actif': <Flame className="w-10 h-10 text-purple-600" />,
      'Leader': <Star className="w-10 h-10 text-purple-600" />,
      'Débutant': <Award className="w-10 h-10 text-purple-600" />,
      'Engagé': <Trophy className="w-10 h-10 text-purple-600" />,
      'Passionné': <Flame className="w-10 h-10 text-purple-600" />,
      'Dévoué': <Crown className="w-10 h-10 text-purple-600" />,
      'Exemplaire': <Trophy className="w-10 h-10 text-purple-600" />,
      'Équilibré': <Target className="w-10 h-10 text-purple-600" />,
      'Constance': <Calendar className="w-10 h-10 text-purple-600" />,
      'Persévérance': <TrendingUp className="w-10 h-10 text-purple-600" />,
      'Faiseur de Disciples': <Users className="w-10 h-10 text-purple-600" />,
      'Évangéliste': <Target className="w-10 h-10 text-purple-600" />,
      'Champion': <Trophy className="w-10 h-10 text-purple-600" />
    };

    // Retourner l'icône mappée ou l'emoji par défaut
    return iconMap[badge?.nom] || <span className="text-4xl">{badge?.icone || '🏆'}</span>;
  };

  // États pour les scores
  const [currentScore, setCurrentScore] = useState(null);
  const [scoresHistory, setScoresHistory] = useState([]);
  
  // États pour les badges
  const [userBadges, setUserBadges] = useState([]);
  const [availableBadges, setAvailableBadges] = useState([]);
  
  // États pour les programmes
  const [programmes, setProgrammes] = useState([]);
  const [userProgrammes, setUserProgrammes] = useState([]);
  
  // États pour l'historique
  const [engagementHistory, setEngagementHistory] = useState([]);
  
  // États pour les notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAllData();
      fetchNotifications();
      generateProactiveNotifications();
    }
  }, [user]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCurrentScore(),
        fetchScoresHistory(),
        fetchUserBadges(),
        fetchAvailableBadges(),
        fetchProgrammes(),
        fetchUserProgrammes(),
        fetchEngagementHistory(),
        fetchNotifications()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les données d\'engagement.'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentScore = async () => {
    try {
      const currentMonth = format(new Date(), 'yyyy-MM');
      const { data, error } = await supabase
        .from('engagement_scores')
        .select('*')
        .eq('user_id', user.id)
        .eq('mois', currentMonth)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setCurrentScore(data);
      } else {
        // Créer un score par défaut
        setCurrentScore({
          score_total: 0,
          score_presence: 0,
          score_priere: 0,
          score_resources: 0,
          score_service: 0,
          score_communaute: 0
        });
      }
    } catch (error) {
      console.error('Erreur fetchCurrentScore:', error);
    }
  };

  const fetchScoresHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('engagement_scores')
        .select('*')
        .eq('user_id', user.id)
        .order('mois', { ascending: false })
        .limit(6);

      if (error) throw error;
      setScoresHistory(data || []);
    } catch (error) {
      console.error('Erreur fetchScoresHistory:', error);
    }
  };

  const fetchUserBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          *,
          badges (*)
        `)
        .eq('user_id', user.id)
        .order('date_obtention', { ascending: false });

      if (error) throw error;
      setUserBadges(data || []);
    } catch (error) {
      console.error('Erreur fetchUserBadges:', error);
    }
  };

  const fetchAvailableBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('statut', 'actif')
        .order('points_requis', { ascending: true });

      if (error) throw error;
      setAvailableBadges(data || []);
    } catch (error) {
      console.error('Erreur fetchAvailableBadges:', error);
    }
  };

  const fetchProgrammes = async () => {
    try {
      const { data, error } = await supabase
        .from('programmes_fidelisation')
        .select('*')
        .eq('statut', 'actif')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProgrammes(data || []);
    } catch (error) {
      console.error('Erreur fetchProgrammes:', error);
    }
  };

  const fetchUserProgrammes = async () => {
    try {
      const { data, error } = await supabase
        .from('user_programmes')
        .select(`
          *,
          programmes_fidelisation (*)
        `)
        .eq('user_id', user.id)
        .order('date_inscription', { ascending: false });

      if (error) throw error;
      setUserProgrammes(data || []);
    } catch (error) {
      console.error('Erreur fetchUserProgrammes:', error);
    }
  };

  const fetchEngagementHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('engagement_history')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setEngagementHistory(data || []);
    } catch (error) {
      console.error('Erreur fetchEngagementHistory:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('engagement_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('lu', false)
        .order('date_creation', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Erreur fetchNotifications:', error);
    }
  };

  const generateProactiveNotifications = async () => {
    try {
      // Appeler la fonction SQL pour générer les notifications proactives
      const { error } = await supabase.rpc('generer_notifications_proactives', {
        p_user_id: user.id
      });

      if (error) {
        // Si la fonction n'existe pas encore, on ignore l'erreur
        if (error.code !== '42883') {
          console.error('Erreur generateProactiveNotifications:', error);
        }
      } else {
        // Rafraîchir les notifications après génération
        fetchNotifications();
      }
    } catch (error) {
      console.error('Erreur generateProactiveNotifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('engagement_notifications')
        .update({ lu: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Retirer la notification de la liste
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Erreur markNotificationAsRead:', error);
    }
  };

  const handleJoinProgramme = async (programmeId) => {
    try {
      const { error } = await supabase
        .from('user_programmes')
        .insert({
          user_id: user.id,
          programme_id: programmeId,
          statut: 'inscrit',
          date_debut: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      toast({
        title: 'Inscription réussie',
        description: 'Vous êtes maintenant inscrit à ce programme !'
      });

      fetchUserProgrammes();
    } catch (error) {
      console.error('Erreur handleJoinProgramme:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de s\'inscrire au programme.'
      });
    }
  };

  // Préparer les données pour les graphiques
  const chartData = scoresHistory.map(score => ({
    mois: format(new Date(score.mois + '-01'), 'MMM', { locale: fr }),
    total: score.score_total,
    presence: score.score_presence,
    priere: score.score_priere,
    resources: score.score_resources,
    service: score.score_service,
    communaute: score.score_communaute
  })).reverse();

  const pieData = currentScore ? [
    { name: 'Présence', value: currentScore.score_presence, color: '#8b5cf6' },
    { name: 'Prière', value: currentScore.score_priere, color: '#ec4899' },
    { name: 'Ressources', value: currentScore.score_resources, color: '#06b6d4' },
    { name: 'Service', value: currentScore.score_service, color: '#10b981' },
    { name: 'Communauté', value: currentScore.score_communaute, color: '#f59e0b' }
  ].filter(item => item.value > 0) : [];

  const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de votre engagement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Engagement & Fidélisation - Disciple Life</title>
      </Helmet>
      <div className="max-w-7xl mx-auto pb-20 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Award className="w-6 h-6 text-purple-600" />
                Engagement & Fidélisation
              </h1>
              <p className="text-gray-600">
                Suivez votre progression et restez engagé dans votre croissance spirituelle
              </p>
            </div>
            {/* Bouton Notifications */}
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="w-5 h-5 text-purple-600" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </Button>
              {/* Dropdown Notifications */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowNotifications(false)}
                      className="h-6 w-6"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Aucune notification</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {notifications.map((notification) => {
                        const getIcon = () => {
                          switch (notification.type_notification) {
                            case 'badge_obtenu':
                              return '🎉';
                            case 'suggestion_action':
                              return '💡';
                            case 'rappel_activite':
                              return '📅';
                            case 'objectif_atteint':
                              return '✅';
                            case 'encouragement':
                              return '💝';
                            default:
                              return '🔔';
                          }
                        };
                        return (
                          <div
                            key={notification.id}
                            className="p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="text-2xl">{getIcon()}</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 text-sm mb-1">
                                  {notification.titre}
                                </div>
                                <div className="text-sm text-gray-600 mb-2">
                                  {notification.message}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {format(new Date(notification.date_creation), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => markNotificationAsRead(notification.id)}
                                className="h-6 w-6 shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/50">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-none">
              <BarChart3 className="w-4 h-4 mr-2 text-purple-500" />
              Tableau de bord
            </TabsTrigger>
            <TabsTrigger value="badges" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-none">
              <Trophy className="w-4 h-4 mr-2 text-purple-500" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="programmes" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-none">
              <Target className="w-4 h-4 mr-2 text-purple-500" />
              Programmes
            </TabsTrigger>
            <TabsTrigger value="historique" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-none">
              <Activity className="w-4 h-4 mr-2 text-purple-500" />
              Historique
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
              {/* Score Global */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="bg-white border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-600">Score Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600">
                      {currentScore?.score_total || 0}
                    </div>
                    <Progress 
                      value={Math.min((currentScore?.score_total || 0) / 10, 100)} 
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      Présence
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600">
                      {currentScore?.score_presence || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-pink-500" />
                      Prière
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-pink-500">
                      {currentScore?.score_priere || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-cyan-500" />
                      Ressources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-cyan-500">
                      {currentScore?.score_resources || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-500" />
                      Communauté
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-500">
                      {currentScore?.score_communaute || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Graphiques */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Évolution des Scores</CardTitle>
                    <CardDescription className="text-gray-600">
                      Progression sur les 6 derniers mois
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="mois" stroke="#6b7280" />
                          <YAxis stroke="#6b7280" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }}
                          />
                          <Legend />
                          <Area type="monotone" dataKey="total" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Aucune donnée disponible</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Répartition par Catégorie</CardTitle>
                    <CardDescription className="text-gray-600">
                      Score du mois en cours
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Aucune donnée disponible</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Badges Obtenus */}
                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      Mes Badges ({userBadges.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userBadges.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {userBadges.map((userBadge) => (
                          <div
                            key={userBadge.id}
                            className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center"
                          >
                            <div className="flex items-center justify-center mb-2">
                              {getBadgeIcon(userBadge.badges)}
                            </div>
                            <div className="font-semibold text-gray-900 text-sm">
                              {userBadge.badges?.nom || 'Badge'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {format(new Date(userBadge.date_obtention), 'dd/MM/yyyy', { locale: fr })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Aucun badge obtenu pour le moment</p>
                        <p className="text-sm mt-2">Continuez à vous engager pour débloquer des badges !</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Badges Disponibles */}
                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <Star className="w-5 h-5 text-purple-600" />
                      Badges Disponibles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {availableBadges.length > 0 ? (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {availableBadges.map((badge) => {
                          const hasBadge = userBadges.some(ub => ub.badge_id === badge.id);
                          return (
                            <div
                              key={badge.id}
                              className={`p-4 rounded-lg border ${
                                hasBadge
                                  ? 'bg-purple-50 border-purple-300'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center">
                                  {getBadgeIcon(badge)}
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900">{badge.nom}</div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    {badge.description}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-2">
                                    {badge.points_requis > 0 && `${badge.points_requis} points requis`}
                                  </div>
                                </div>
                                {hasBadge && (
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Aucun badge disponible</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
          </TabsContent>

          {/* Programmes Tab */}
          <TabsContent value="programmes" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Programmes Disponibles */}
                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      Programmes Disponibles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {programmes.length > 0 ? (
                      <div className="space-y-4">
                        {programmes.map((programme) => {
                          const isJoined = userProgrammes.some(up => up.programme_id === programme.id);
                          return (
                            <div
                              key={programme.id}
                              className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900 mb-1">
                                    {programme.nom}
                                  </h3>
                                  <p className="text-sm text-gray-600 mb-2">
                                    {programme.description}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {programme.duree_jours} jours
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {!isJoined && (
                                <Button
                                  onClick={() => handleJoinProgramme(programme.id)}
                                  className="w-full bg-purple-600 hover:bg-purple-700"
                                  size="sm"
                                >
                                  S'inscrire
                                </Button>
                              )}
                              {isJoined && (
                                <Badge className="bg-green-100 text-green-700 border-green-300">
                                  Inscrit
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Aucun programme disponible</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Mes Programmes */}
                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-500" />
                      Mes Programmes ({userProgrammes.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userProgrammes.length > 0 ? (
                      <div className="space-y-4">
                        {userProgrammes.map((userProgramme) => (
                          <div
                            key={userProgramme.id}
                            className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                          >
                            <div className="mb-3">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {userProgramme.programmes_fidelisation?.nom || 'Programme'}
                              </h3>
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                                  <span>Progression</span>
                                  <span>{userProgramme.progression}%</span>
                                </div>
                                <Progress value={userProgramme.progression} className="h-2" />
                              </div>
                              <Badge className={`mt-2 ${
                                userProgramme.statut === 'termine' ? 'bg-green-100 text-green-700' :
                                userProgramme.statut === 'en_cours' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {userProgramme.statut}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Flame className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Vous n'êtes inscrit à aucun programme</p>
                        <p className="text-sm mt-2">Rejoignez un programme pour commencer !</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
          </TabsContent>

          {/* Historique Tab */}
          <TabsContent value="historique" className="space-y-6">
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    Historique des Actions
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Dernières actions enregistrées
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {engagementHistory.length > 0 ? (
                    <div className="space-y-3">
                      {engagementHistory.map((action) => {
                        const actionLabels = {
                          presence: 'Présence',
                          priere: 'Prière',
                          resource: 'Ressource',
                          service: 'Service',
                          communaute: 'Communauté'
                        };
                        const actionColors = {
                          presence: 'text-purple-600',
                          priere: 'text-pink-500',
                          resource: 'text-cyan-500',
                          service: 'text-green-500',
                          communaute: 'text-orange-500'
                        };
                        return (
                          <div
                            key={action.id}
                            className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center`}>
                                <Activity className={`w-5 h-5 ${actionColors[action.action_type] || 'text-gray-600'}`} />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {actionLabels[action.action_type] || action.action_type}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {format(new Date(action.date), 'dd MMMM yyyy', { locale: fr })}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-purple-600">
                                +{action.points} pts
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Aucune action enregistrée</p>
                    </div>
                  )}
                </CardContent>
              </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Engagement;

