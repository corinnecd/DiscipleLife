import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Heart,
  Users,
  AlertCircle,
  CheckCircle,
  Activity,
  BarChart3,
  PieChart,
  Calendar
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const SuiviPostCriseStats = () => {
  const { user } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSuivis: 0,
    suivisActifs: 0,
    suivisResolus: 0,
    tauxGuerison: 0,
    moyenneGravite: 0,
    suiviParType: [],
    suiviParStatut: [],
    evolutionMentale: [],
    evolutionSpirituelle: [],
    evolutionPhysique: []
  });

  const COLORS = {
    actif: '#ef4444',
    en_amelioration: '#f97316',
    stabilise: '#eab308',
    resolu: '#22c55e',
    archive: '#6b7280'
  };

  const TYPES_CRISE_COLORS = [
    '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#3b82f6', '#ef4444', '#14b8a6', '#f43f5e', '#a855f7'
  ];

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Déterminer la requête selon le rôle
      let suiviQuery = supabase.from('suivi_post_crise').select('*');
      let historiqueQuery = supabase.from('historique_guerison').select('*');

      // Si l'utilisateur n'est pas admin/pasteur/superviseur, filtrer par user_id
      if (!['admin', 'pasteur', 'superviseur'].includes(role)) {
        suiviQuery = suiviQuery.eq('user_id', user.id);
        historiqueQuery = historiqueQuery.eq('user_id', user.id);
      }

      const [{ data: suivis, error: suiviError }, { data: historique, error: historiqueError }] = await Promise.all([
        suiviQuery,
        historiqueQuery
      ]);

      if (suiviError) throw suiviError;
      if (historiqueError) throw historiqueError;

      // Calculer les statistiques
      const totalSuivis = suivis?.length || 0;
      const suivisActifs = suivis?.filter(s => s.statut === 'actif').length || 0;
      const suivisResolus = suivis?.filter(s => s.statut === 'resolu').length || 0;
      const tauxGuerison = totalSuivis > 0 ? ((suivisResolus / totalSuivis) * 100).toFixed(1) : 0;

      // Moyenne de gravité
      const moyenneGravite = totalSuivis > 0
        ? (suivis.reduce((acc, s) => acc + (s.gravite || 0), 0) / totalSuivis).toFixed(1)
        : 0;

      // Répartition par type de crise
      const suiviParType = Object.entries(
        suivis?.reduce((acc, s) => {
          acc[s.type_crise] = (acc[s.type_crise] || 0) + 1;
          return acc;
        }, {}) || {}
      ).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

      // Répartition par statut
      const suiviParStatut = Object.entries(
        suivis?.reduce((acc, s) => {
          acc[s.statut] = (acc[s.statut] || 0) + 1;
          return acc;
        }, {}) || {}
      ).map(([name, value]) => ({ name, value }));

      // Évolution des états (moyenne par mois)
      const evolutionData = {};
      historique?.forEach(entry => {
        const month = new Date(entry.date_suivi).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        if (!evolutionData[month]) {
          evolutionData[month] = { mental: [], spirituel: [], physique: [] };
        }
        evolutionData[month].mental.push(entry.etat_mental);
        evolutionData[month].spirituel.push(entry.etat_spirituel);
        evolutionData[month].physique.push(entry.etat_physique);
      });

      const evolutionMoyenne = Object.entries(evolutionData).map(([month, data]) => ({
        month,
        mental: (data.mental.reduce((a, b) => a + b, 0) / data.mental.length).toFixed(1),
        spirituel: (data.spirituel.reduce((a, b) => a + b, 0) / data.spirituel.length).toFixed(1),
        physique: (data.physique.reduce((a, b) => a + b, 0) / data.physique.length).toFixed(1)
      }));

      setStats({
        totalSuivis,
        suivisActifs,
        suivisResolus,
        tauxGuerison,
        moyenneGravite,
        suiviParType,
        suiviParStatut,
        evolutionMentale: evolutionMoyenne,
        evolutionSpirituelle: evolutionMoyenne,
        evolutionPhysique: evolutionMoyenne
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les statistiques."
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0518] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0518] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BarChart3 className="text-teal-400" size={32} />
                Statistiques - Suivi Post-Crise
              </h1>
              <p className="text-gray-400 mt-1">
                Vue d'ensemble de l'évolution et des tendances
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/suivi-post-crise')}
            className="bg-teal-600 hover:bg-teal-700"
          >
            Mes suivis
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-[#1a0b2e] border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                  <Users size={16} />
                  Total de suivis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.totalSuivis}</p>
                <p className="text-xs text-gray-500 mt-1">Tous statuts confondus</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-[#1a0b2e] border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                  <Activity size={16} />
                  Suivis actifs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-400">{stats.suivisActifs}</p>
                <p className="text-xs text-gray-500 mt-1">En cours d'accompagnement</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-[#1a0b2e] border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                  <CheckCircle size={16} />
                  Suivis résolus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-400">{stats.suivisResolus}</p>
                <p className="text-xs text-gray-500 mt-1">Guérison complète</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-[#1a0b2e] border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                  <TrendingUp size={16} />
                  Taux de guérison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-teal-400">{stats.tauxGuerison}%</p>
                <p className="text-xs text-gray-500 mt-1">Suivis résolus / total</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Répartition par type de crise */}
          <Card className="bg-[#1a0b2e] border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <PieChart className="text-teal-400" size={20} />
                Répartition par type de crise
              </CardTitle>
              <CardDescription className="text-gray-400">
                Distribution des crises par catégorie
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.suiviParType.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={stats.suiviParType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.suiviParType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={TYPES_CRISE_COLORS[index % TYPES_CRISE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a0b2e',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  Aucune donnée disponible
                </div>
              )}
            </CardContent>
          </Card>

          {/* Répartition par statut */}
          <Card className="bg-[#1a0b2e] border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="text-teal-400" size={20} />
                Répartition par statut
              </CardTitle>
              <CardDescription className="text-gray-400">
                État d'avancement des suivis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.suiviParStatut.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.suiviParStatut}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a0b2e',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" fill="#14b8a6">
                      {stats.suiviParStatut.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#14b8a6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  Aucune donnée disponible
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Évolution dans le temps */}
        <Card className="bg-[#1a0b2e] border-white/10 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="text-teal-400" size={20} />
              Évolution de la guérison
            </CardTitle>
            <CardDescription className="text-gray-400">
              Moyenne des états mental, spirituel et physique au fil du temps
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.evolutionMentale.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={stats.evolutionMentale}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis domain={[0, 10]} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a0b2e',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="mental" stroke="#60a5fa" strokeWidth={2} name="Mental" />
                  <Line type="monotone" dataKey="spirituel" stroke="#a78bfa" strokeWidth={2} name="Spirituel" />
                  <Line type="monotone" dataKey="physique" stroke="#34d399" strokeWidth={2} name="Physique" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-gray-400">
                Aucune donnée d'historique disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-[#1a0b2e] border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Gravité moyenne</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <AlertCircle className="text-orange-400" size={32} />
                <div>
                  <p className="text-3xl font-bold">{stats.moyenneGravite}/10</p>
                  <p className="text-sm text-gray-400">Niveau de gravité moyen des crises</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a0b2e] border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Recommandations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-300">
                {stats.suivisActifs > 0 && (
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-teal-400 mt-0.5 flex-shrink-0" />
                    <span>{stats.suivisActifs} suivi(s) actif(s) nécessitent votre attention</span>
                  </li>
                )}
                {stats.tauxGuerison < 30 && stats.totalSuivis > 5 && (
                  <li className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-orange-400 mt-0.5 flex-shrink-0" />
                    <span>Taux de guérison faible. Envisagez un accompagnement renforcé.</span>
                  </li>
                )}
                {stats.tauxGuerison >= 50 && (
                  <li className="flex items-start gap-2">
                    <Heart size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Excellent taux de guérison ! Continuez sur cette voie.</span>
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SuiviPostCriseStats;
