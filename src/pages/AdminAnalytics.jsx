
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Users, 
  UserCheck, 
  Target, 
  Heart, 
  FileText, 
  TrendingUp, 
  Download,
  Calendar,
  Activity,
  Award,
  Share
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { exportElementToPDF } from '@/lib/ExportUtils';

const AdminAnalytics = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [timeRange, setTimeRange] = useState('30days');
  
  // Data States
  const [kpiData, setKpiData] = useState({
    totalDisciples: 0,
    totalMentors: 0,
    totalEvangelized: 0,
    totalPrayers: 0,
    totalChallenges: 0,
    totalReports: 0
  });

  const [chartsData, setChartsData] = useState({
    growth: [],
    evangelization: [],
    prayers: [],
    rolesDistribution: []
  });

  const [topPerformers, setTopPerformers] = useState({
    mentors: [],
    disciples: [],
    evangelists: []
  });

  useEffect(() => {
    fetchAnalyticsData();
    const interval = setInterval(fetchAnalyticsData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      
      // 1. Fetch KPI Counts
      const [
        { count: disciplesCount },
        { count: mentorsCount },
        { count: evangelizedCount },
        { count: prayersCount },
        { count: reportsCount }
      ] = await Promise.all([
        supabase.from('profils').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
        supabase.from('profils').select('*', { count: 'exact', head: true }).eq('role', 'mentor'),
        supabase.from('personnes_evangelisees').select('*', { count: 'exact', head: true }),
        supabase.from('prayer_requests').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true })
      ]);
      
      const { count: challengesCount } = await supabase
        .from('user_challenge_progress')
        .select('*', { count: 'exact', head: true })
        .eq('is_completed', true);

      setKpiData({
        totalDisciples: disciplesCount || 0,
        totalMentors: mentorsCount || 0,
        totalEvangelized: evangelizedCount || 0,
        totalPrayers: prayersCount || 0,
        totalChallenges: challengesCount || 0,
        totalReports: reportsCount || 0
      });

      // 2. Fetch Growth Charts Data
      const months = eachMonthOfInterval({
        start: subMonths(now, 11),
        end: now
      });

      const growthPromises = months.map(async (month) => {
         const start = startOfMonth(month).toISOString();
         const end = endOfMonth(month).toISOString();
         
         const { count: newUsers } = await supabase.from('profils')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', start)
            .lte('created_at', end);
            
         const { count: newEvan } = await supabase.from('personnes_evangelisees')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', start)
            .lte('created_at', end);

         return {
            name: format(month, 'MMM', { locale: fr }),
            fullDate: format(month, 'MMM yyyy', { locale: fr }),
            disciples: newUsers || 0,
            evangelized: newEvan || 0
         };
      });

      const growthData = await Promise.all(growthPromises);
      setChartsData(prev => ({ ...prev, growth: growthData }));

      // 3. Top Performers (Simplified)
      const { data: mentorsWithDisciples } = await supabase
        .from('disciples')
        .select('mentor_id')
        .limit(500);
        
      if (mentorsWithDisciples) {
         const mentorCounts = {};
         mentorsWithDisciples.forEach(d => {
             if (d.mentor_id) mentorCounts[d.mentor_id] = (mentorCounts[d.mentor_id] || 0) + 1;
         });
         
         const topMentorIds = Object.entries(mentorCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
            
         if (topMentorIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profils')
                .select('id, first_name, last_name, avatar_url')
                .in('id', topMentorIds.map(([id]) => id));
                
            const processedMentors = topMentorIds.map(([id, count]) => {
                const profile = profiles?.find(p => p.id === id);
                return {
                    id,
                    name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
                    count
                };
            });
            setTopPerformers(prev => ({ ...prev, mentors: processedMentors }));
         }
      }

    } catch (error) {
      console.error("Analytics Error:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les données."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
        await exportElementToPDF('analytics-dashboard', `analytics_dashboard_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        toast({ title: "Export réussi", description: "Le tableau de bord a été exporté en PDF." });
    } catch (error) {
        toast({ variant: "destructive", title: "Erreur Export", description: "Échec de la génération du PDF." });
    } finally {
        setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-8 pb-20" id="analytics-dashboard">
      <Helmet>
        <title>Analytiques & Rapports | Admin</title>
      </Helmet>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tableau de Bord Analytique</h1>
            <p className="text-slate-500">Vue d'ensemble de la croissance et de l'impact.</p>
         </div>
         
         <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
               <SelectTrigger className="w-[180px] bg-white">
                  <Calendar className="mr-2 h-4 w-4 text-slate-400" />
                  <SelectValue placeholder="Période" />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="7days">7 derniers jours</SelectItem>
                  <SelectItem value="30days">30 derniers jours</SelectItem>
                  <SelectItem value="90days">3 mois</SelectItem>
                  <SelectItem value="1year">12 mois</SelectItem>
               </SelectContent>
            </Select>
            
            <Button 
                variant="outline" 
                onClick={handleExportPDF} 
                className="bg-white"
                disabled={exporting}
            >
               {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share className="mr-2 h-4 w-4" />}
               Export PDF
            </Button>
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard 
            title="Total Disciples" 
            value={kpiData.totalDisciples} 
            icon={Users} 
            color="text-blue-600" 
            bg="bg-blue-100" 
          />
          <KpiCard 
            title="Mentors Actifs" 
            value={kpiData.totalMentors} 
            icon={UserCheck} 
            color="text-indigo-600" 
            bg="bg-indigo-100" 
          />
          <KpiCard 
            title="Ames Gagnées" 
            value={kpiData.totalEvangelized} 
            icon={Heart} 
            color="text-rose-600" 
            bg="bg-rose-100" 
          />
          <KpiCard 
            title="Prières" 
            value={kpiData.totalPrayers} 
            icon={HandsPrayingIcon} 
            color="text-amber-600" 
            bg="bg-amber-100" 
          />
          <KpiCard 
            title="Challenges" 
            value={kpiData.totalChallenges} 
            icon={Target} 
            color="text-emerald-600" 
            bg="bg-emerald-100" 
          />
          <KpiCard 
            title="Rapports" 
            value={kpiData.totalReports} 
            icon={FileText} 
            color="text-slate-600" 
            bg="bg-slate-100" 
          />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200">
            <CardHeader>
               <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Croissance de la Communauté
               </CardTitle>
               <CardDescription>Comparaison des nouveaux disciples et âmes évangélisées (12 mois)</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartsData.growth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                           <linearGradient id="colorDisciple" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                           </linearGradient>
                           <linearGradient id="colorEvan" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="disciples" name="Nouveaux Inscrits" stroke="#3b82f6" fillOpacity={1} fill="url(#colorDisciple)" />
                        <Area type="monotone" dataKey="evangelized" name="Évangélisations" stroke="#f43f5e" fillOpacity={1} fill="url(#colorEvan)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
         </Card>

         <Card className="shadow-sm border-slate-200">
            <CardHeader>
               <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Top Mentors
               </CardTitle>
               <CardDescription>Mentors avec le plus de disciples actifs</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                  {topPerformers.mentors.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-8">Données insuffisantes</p>
                  ) : (
                      topPerformers.mentors.map((mentor, i) => (
                         <div key={mentor.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                             <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                                   {i + 1}
                                </div>
                                <div className="text-sm font-medium">{mentor.name}</div>
                             </div>
                             <Badge variant="secondary" className="font-mono">
                                {mentor.count}
                             </Badge>
                         </div>
                      ))
                  )}
               </div>
            </CardContent>
         </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <MetricCard 
            title="Taux d'Engagement" 
            metric="Activité Hebdo" 
            value="Coming Soon" 
            subtext="Basé sur les connexions"
            icon={Activity}
         />
         <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-md">
            <CardHeader>
               <CardTitle className="text-lg text-white/90">Impact Global</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-4xl font-bold mb-2">
                  {Math.floor((kpiData.totalEvangelized / (kpiData.totalDisciples || 1)) * 100)}%
               </div>
               <p className="text-indigo-100 text-sm">Ratio Évangélisation / Disciple</p>
               <div className="mt-4 h-2 bg-black/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white/40" style={{ width: '65%' }}></div>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
};

const HandsPrayingIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 11 8-8 1.4 1.4a.6.6 0 0 1 .1.8L8 12" />
    <path d="M12 2a5 5 0 0 1 5 5v5" />
    <path d="M15 14a2 2 0 0 0-2-2h-3a2 2 0 0 0-2 2v7h7z" />
    <path d="M7 16a2 2 0 0 0-2-2H3v7h7" />
  </svg>
);

const KpiCard = ({ title, value, icon: Icon, color, bg }) => (
  <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
     <CardContent className="p-4 flex items-center justify-between">
        <div>
           <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{title}</p>
           <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        </div>
        <div className={`p-3 rounded-full ${bg} ${color}`}>
           <Icon size={20} />
        </div>
     </CardContent>
  </Card>
);

const MetricCard = ({ title, metric, value, subtext, icon: Icon }) => (
   <Card className="shadow-sm border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
         <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
         <Icon className="h-4 w-4 text-slate-400" />
      </CardHeader>
      <CardContent>
         <div className="text-2xl font-bold">{value}</div>
         <p className="text-xs text-slate-500 mt-1">{metric}</p>
         {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
      </CardContent>
   </Card>
);

export default AdminAnalytics;
