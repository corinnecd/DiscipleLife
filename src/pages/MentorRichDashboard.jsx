import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  CalendarDays, 
  Mic, 
  MessageSquare, 
  ArrowRight, 
  MoreVertical, 
  Plus, 
  Heart, 
  HeartHandshake as Handshake, 
  BookOpen, 
  Smile, 
  ClipboardList,
  PlayCircle,
  X,
  List
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { getInitials, getAvatarColor, DISCIPLE_CATEGORIES } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MentorRichDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [disciples, setDisciples] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [stats, setStats] = useState({
    mesDisciples: 0,
    prieres: 0,
    echanges: 0,
    accompagnement: 0,
    etudeBiblique: 0,
    ontAccepteChrist: 0,
  });
  const [circlesStats, setCirclesStats] = useState({
    NonCroyants: { count: 0, total: 0 },
    NouveauxConvertis: { count: 0, total: 0 },
    DisciplesAffermis: { count: 0, total: 0 },
    FaiseursDeDisciples: { count: 0, total: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setShowWelcome(true);
    if (user) fetchMentorData();
  }, [user]);

  const fetchMentorData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Disciples
      const { data: disciplesData } = await supabase
        .from('profils')
        .select('*')
        .eq('mentor_id', user.id)
        .order('created_at', { ascending: false });
      
      const loadedDisciples = disciplesData || [];
      setDisciples(loadedDisciples);

      // Calculate Circle Stats from REAL data
      const total = loadedDisciples.length;
      const statsAcc = {
        NonCroyants: 0,
        NouveauxConvertis: 0,
        DisciplesAffermis: 0,
        FaiseursDeDisciples: 0
      };

      loadedDisciples.forEach(d => {
        const type = d.circle_type;
        if (type === "Non-croyant" || type === "unbelievers") {
            statsAcc.NonCroyants++;
        } else if (type === "Nouveau converti" || type === "newBelievers") {
            statsAcc.NouveauxConvertis++;
        } else if (type === "Disciple Affermi" || type === "established") {
            statsAcc.DisciplesAffermis++;
        } else if (type === "Faiseur de Disciples" || type === "makers") {
            statsAcc.FaiseursDeDisciples++;
        }
      });

      setCirclesStats({
        NonCroyants: { count: statsAcc.NonCroyants, total },
        NouveauxConvertis: { count: statsAcc.NouveauxConvertis, total },
        DisciplesAffermis: { count: statsAcc.DisciplesAffermis, total },
        FaiseursDeDisciples: { count: statsAcc.FaiseursDeDisciples, total }
      });


      // 2. Fetch Upcoming Events
      const { data: eventsData } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'scheduled')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(5);

      setUpcomingEvents(eventsData || []);

      // 3. Fetch richer stats counts
      const { count: totalPrayers } = await supabase
        .from('prayer_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: evangelizedAcceptedChrist } = await supabase
        .from('personnes_evangelisees')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('accepted_christ', true);

      setStats({
        mesDisciples: total,
        prieres: totalPrayers || 0,
        echanges: 0, 
        accompagnement: 0,
        etudeBiblique: 0,
        ontAccepteChrist: evangelizedAcceptedChrist || 0,
      });

    } catch (error) {
      console.error("Error fetching mentor data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatClick = (path) => {
    navigate(path);
  };

  // Static limits for progress bars (mock data)
  const statLimits = {
    mesDisciples: 30,
    prieres: 14,
    echanges: 20,
    accompagnement: 6,
    etudeBiblique: 8,
    ontAccepteChrist: 5,
  };

  const getPercentage = (count, total) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  return (
    <div className="space-y-8 relative">
      {/* Welcome Modal */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="sm:max-w-md bg-white text-slate-900 border-none rounded-2xl p-0 overflow-hidden">
             <div className="absolute right-4 top-4 z-10">
                <DialogClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500">
                        <X size={16} />
                    </Button>
                </DialogClose>
             </div>
             
             <div className="flex flex-col items-center text-center pt-10 pb-8 px-8">
                 <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mb-6 text-teal-600 animate-in zoom-in duration-300">
                     <div className="w-3 h-3 bg-teal-500 rounded-full" />
                 </div>
                 
                 <DialogTitle className="text-2xl font-bold mb-3">Bienvenue sur DiscipleLife !</DialogTitle>
                 <DialogDescription className="text-slate-500 text-base leading-relaxed mb-8">
                    Cette application est conçue pour vous aider à approfondir votre vie en Christ et à faire des disciples comme il l'a commandé.
                 </DialogDescription>

                 <Button 
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-6 rounded-xl flex items-center justify-center gap-2 group"
                    onClick={() => setShowWelcome(false)}
                 >
                    REGARDER L'INTRODUCTION
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                 </Button>
             </div>
             {/* Decorative corner shape */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50/50 rounded-bl-[100px] -z-10" />
        </DialogContent>
      </Dialog>


      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Mon Tableau de Bord</h1>
          <p className="text-gray-400">Gérez votre groupe, planifiez des rencontres et suivez la progression.</p>
        </div>
        <Button onClick={() => navigate('/circles')} className="bg-teal-500 hover:bg-teal-600 text-white gap-2">
            <UserPlus size={18} /> Ajouter un disciple
        </Button>
      </div>

      {/* 4 Spiritual Level Cards (Circles Overview) */}
      <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
             <h2 className="text-xl font-bold text-white">Aperçu de mes cercles</h2>
             <Button variant="link" className="text-teal-400 p-0 flex items-center gap-1" onClick={() => navigate('/circles')}>
                 Gérer les cercles <ArrowRight size={16} />
             </Button>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               {/* Non Croyants */}
               <Card className="bg-[#1e1429] border-t-4 border-t-rose-500 border-x-0 border-b-0 shadow-lg relative overflow-hidden group hover:bg-[#251833] transition-colors">
                   <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
                       <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center border-2 border-rose-500/20 group-hover:scale-110 transition-transform">
                           <span className="text-2xl font-bold text-rose-500">{circlesStats.NonCroyants.count}</span>
                       </div>
                       <div className="text-center">
                           <p className="text-[10px] sm:text-xs font-bold text-gray-300 tracking-wider uppercase">NON CROYANTS</p>
                           <p className="text-xs text-gray-500 mt-1">{getPercentage(circlesStats.NonCroyants.count, circlesStats.NonCroyants.total)}% du total</p>
                       </div>
                   </CardContent>
               </Card>

               {/* Nouveaux convertis */}
               <Card className="bg-[#1e1429] border-t-4 border-t-teal-400 border-x-0 border-b-0 shadow-lg relative overflow-hidden group hover:bg-[#251833] transition-colors">
                   <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
                       <div className="w-14 h-14 rounded-full bg-teal-400/10 flex items-center justify-center border-2 border-teal-400/20 group-hover:scale-110 transition-transform">
                           <span className="text-2xl font-bold text-teal-400">{circlesStats.NouveauxConvertis.count}</span>
                       </div>
                       <div className="text-center">
                           <p className="text-[10px] sm:text-xs font-bold text-gray-300 tracking-wider uppercase">NOUVEAUX CONVERTIS</p>
                           <p className="text-xs text-gray-500 mt-1">{getPercentage(circlesStats.NouveauxConvertis.count, circlesStats.NouveauxConvertis.total)}% du total</p>
                       </div>
                   </CardContent>
               </Card>

               {/* Disciples affermis */}
               <Card className="bg-[#1e1429] border-t-4 border-t-violet-500 border-x-0 border-b-0 shadow-lg relative overflow-hidden group hover:bg-[#251833] transition-colors">
                   <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
                       <div className="w-14 h-14 rounded-full bg-violet-500/10 flex items-center justify-center border-2 border-violet-500/20 group-hover:scale-110 transition-transform">
                           <span className="text-2xl font-bold text-violet-500">{circlesStats.DisciplesAffermis.count}</span>
                       </div>
                       <div className="text-center">
                           <p className="text-[10px] sm:text-xs font-bold text-gray-300 tracking-wider uppercase">DISCIPLES AFFERMIS</p>
                           <p className="text-xs text-gray-500 mt-1">{getPercentage(circlesStats.DisciplesAffermis.count, circlesStats.DisciplesAffermis.total)}% du total</p>
                       </div>
                   </CardContent>
               </Card>

               {/* Faiseurs de disciples */}
               <Card className="bg-[#1e1429] border-t-4 border-t-amber-400 border-x-0 border-b-0 shadow-lg relative overflow-hidden group hover:bg-[#251833] transition-colors">
                   <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
                       <div className="w-14 h-14 rounded-full bg-amber-400/10 flex items-center justify-center border-2 border-amber-400/20 group-hover:scale-110 transition-transform">
                           <span className="text-2xl font-bold text-amber-400">{circlesStats.FaiseursDeDisciples.count}</span>
                       </div>
                       <div className="text-center">
                           <p className="text-[10px] sm:text-xs font-bold text-gray-300 tracking-wider uppercase">FAISEURS DE DISCIPLES</p>
                           <p className="text-xs text-gray-500 mt-1">{getPercentage(circlesStats.FaiseursDeDisciples.count, circlesStats.FaiseursDeDisciples.total)}% du total</p>
                       </div>
                   </CardContent>
               </Card>
          </div>
      </div>

      {/* Main Stats (Compact) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Mes Disciples */}
        <div 
            className="group relative flex items-center gap-4 bg-[#231535] p-3 rounded-xl border border-white/5 hover:border-indigo-500/50 cursor-pointer transition-all overflow-hidden"
            onClick={() => handleStatClick('/disciples')}
        >
             <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                 <Users className="w-5 h-5 text-indigo-400" />
             </div>
             <div className="flex-1 min-w-0">
                 <div className="flex items-baseline justify-between mb-1">
                     <span className="text-white font-medium text-sm">Mes Disciples</span>
                     <div className="flex items-baseline gap-1">
                        <span className="text-white font-bold">{stats.mesDisciples}</span>
                        <span className="text-gray-500 text-xs">sur {statLimits.mesDisciples}</span>
                     </div>
                 </div>
                 <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                     <div className="h-full bg-indigo-500" style={{ width: `${(stats.mesDisciples / statLimits.mesDisciples) * 100}%` }} />
                 </div>
             </div>
        </div>

        {/* Prières */}
        <div 
            className="group relative flex items-center gap-4 bg-[#231535] p-3 rounded-xl border border-white/5 hover:border-pink-500/50 cursor-pointer transition-all overflow-hidden"
            onClick={() => handleStatClick('/prayer-requests')}
        >
             <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center shrink-0">
                 <Heart className="w-5 h-5 text-pink-400" />
             </div>
             <div className="flex-1 min-w-0">
                 <div className="flex items-baseline justify-between mb-1">
                     <span className="text-white font-medium text-sm">Prières</span>
                     <div className="flex items-baseline gap-1">
                        <span className="text-white font-bold">{stats.prieres}</span>
                        <span className="text-gray-500 text-xs">sur {statLimits.prieres}</span>
                     </div>
                 </div>
                 <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                     <div className="h-full bg-pink-500" style={{ width: `${(stats.prieres / statLimits.prieres) * 100}%` }} />
                 </div>
             </div>
        </div>

        {/* Échanges */}
        <div 
            className="group relative flex items-center gap-4 bg-[#231535] p-3 rounded-xl border border-white/5 hover:border-violet-500/50 cursor-pointer transition-all overflow-hidden"
            onClick={() => handleStatClick('/conversations')}
        >
             <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                 <MessageSquare className="w-5 h-5 text-violet-400" />
             </div>
             <div className="flex-1 min-w-0">
                 <div className="flex items-baseline justify-between mb-1">
                     <span className="text-white font-medium text-sm">Échanges</span>
                     <div className="flex items-baseline gap-1">
                        <span className="text-white font-bold">{stats.echanges}</span>
                        <span className="text-gray-500 text-xs">sur {statLimits.echanges}</span>
                     </div>
                 </div>
                 <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                     <div className="h-full bg-violet-500" style={{ width: `${(stats.echanges / statLimits.echanges) * 100}%` }} />
                 </div>
             </div>
        </div>

        {/* Accompagnement */}
        <div 
            className="group relative flex items-center gap-4 bg-[#231535] p-3 rounded-xl border border-white/5 hover:border-teal-500/50 cursor-pointer transition-all overflow-hidden"
            onClick={() => handleStatClick('/accompaniment')}
        >
             <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                 <ClipboardList className="w-5 h-5 text-teal-400" />
             </div>
             <div className="flex-1 min-w-0">
                 <div className="flex items-baseline justify-between mb-1">
                     <span className="text-white font-medium text-sm">Accompagnement</span>
                     <div className="flex items-baseline gap-1">
                        <span className="text-white font-bold">{stats.accompagnement}</span>
                        <span className="text-gray-500 text-xs">sur {statLimits.accompagnement}</span>
                     </div>
                 </div>
                 <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                     <div className="h-full bg-teal-500" style={{ width: `${(stats.accompagnement / statLimits.accompagnement) * 100}%` }} />
                 </div>
             </div>
        </div>

        {/* Étude Biblique */}
        <div 
            className="group relative flex items-center gap-4 bg-[#231535] p-3 rounded-xl border border-white/5 hover:border-amber-500/50 cursor-pointer transition-all overflow-hidden"
            onClick={() => handleStatClick('/meditations')}
        >
             <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                 <BookOpen className="w-5 h-5 text-amber-400" />
             </div>
             <div className="flex-1 min-w-0">
                 <div className="flex items-baseline justify-between mb-1">
                     <span className="text-white font-medium text-sm">Étude Biblique</span>
                     <div className="flex items-baseline gap-1">
                        <span className="text-white font-bold">{stats.etudeBiblique}</span>
                        <span className="text-gray-500 text-xs">sur {statLimits.etudeBiblique}</span>
                     </div>
                 </div>
                 <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                     <div className="h-full bg-amber-500" style={{ width: `${(stats.etudeBiblique / statLimits.etudeBiblique) * 100}%` }} />
                 </div>
             </div>
        </div>

        {/* Ont accepté Christ */}
        <div 
            className="group relative flex items-center gap-4 bg-[#231535] p-3 rounded-xl border border-white/5 hover:border-rose-500/50 cursor-pointer transition-all overflow-hidden"
            onClick={() => handleStatClick('/evangelization')}
        >
             <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                 <Smile className="w-5 h-5 text-rose-400" />
             </div>
             <div className="flex-1 min-w-0">
                 <div className="flex items-baseline justify-between mb-1">
                     <span className="text-white font-medium text-sm">Ont accepté Christ</span>
                     <div className="flex items-baseline gap-1">
                        <span className="text-white font-bold">{stats.ontAccepteChrist}</span>
                        <span className="text-gray-500 text-xs">sur {statLimits.ontAccepteChrist}</span>
                     </div>
                 </div>
                 <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                     <div className="h-full bg-rose-500" style={{ width: `${(stats.ontAccepteChrist / statLimits.ontAccepteChrist) * 100}%` }} />
                 </div>
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Disciples List BUTTON REPLACEMENT */}
        <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Mon Groupe</h2>
            </div>

            <Card className="bg-[#1a0b2e] border border-white/10 hover:border-teal-500/30 transition-all p-8 flex flex-col items-center justify-center text-center gap-4 group">
                 <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-8 h-8 text-teal-400" />
                 </div>
                 <div>
                     <h3 className="text-2xl font-bold text-white mb-2">Gérez vos disciples</h3>
                     <p className="text-gray-400 max-w-md mx-auto">
                        Accédez à la liste complète de vos disciples pour suivre leur progression, leurs besoins et gérer leurs informations.
                     </p>
                 </div>
                 <Button 
                    onClick={() => navigate('/disciples')} 
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-6 px-10 rounded-xl text-lg mt-4 shadow-lg shadow-teal-900/20 group-hover:shadow-teal-900/40"
                 >
                    Voir ma liste de disciples
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                 </Button>
            </Card>
        </div>

        {/* Right Col: Quick Schedule & Tools */}
        <div className="space-y-6">
            <Card className="bg-[#1a0b2e] border-white/10">
                <CardHeader>
                    <CardTitle className="text-white text-lg">Prochains Rendez-vous</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {upcomingEvents.length > 0 ? upcomingEvents.map(evt => (
                        <div key={evt.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                            <div className="flex flex-col items-center justify-center min-w-[3rem] p-1 bg-[#2b1b40] rounded">
                                <span className="text-xs text-indigo-400 font-bold uppercase">{format(new Date(evt.event_date), 'MMM', { locale: fr })}</span>
                                <span className="text-lg font-bold text-white">{format(new Date(evt.event_date), 'dd')}</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white line-clamp-1">{evt.disciple_name}</p>
                                <p className="text-xs text-gray-400">{format(new Date(evt.event_date), 'HH:mm')} • {evt.subject}</p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-sm text-gray-500 text-center py-4">Aucun RDV prévu.</p>
                    )}
                    <Button 
                        variant="outline" 
                        className="w-full border-dashed border-white/20 hover:border-white/40 text-gray-400 hover:text-white"
                        onClick={() => navigate('/scheduler')}
                    >
                        <Plus size={16} className="mr-2" /> Planifier un RDV
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white text-lg">Boîte à Outils</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                    <Button variant="secondary" className="h-24 flex flex-col gap-2 bg-white/10 hover:bg-white/20 border-0 transition-all">
                        <Mic size={28} className="text-orange-400" />
                        <span className="text-sm font-medium">Note Vocale</span>
                    </Button>
                    <Button 
                        variant="secondary" 
                        className="h-24 flex flex-col gap-2 bg-white/10 hover:bg-white/20 border-0 transition-all"
                        onClick={() => navigate('/prayer-requests')}
                    >
                        <MessageSquare size={28} className="text-blue-400" />
                        <span className="text-sm font-medium leading-tight">Ajouter un sujet de prière</span>
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default MentorRichDashboard;