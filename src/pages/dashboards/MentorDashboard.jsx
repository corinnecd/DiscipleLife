
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Heart, MessageCircle, UserCheck, BookOpen, 
  Calendar, MessageSquare, ChevronRight, Activity, Church
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const MentorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    nonCroyants: 0,
    nouveauxConvertis: 0,
    disciplesAffermis: 0,
    faiseursDisciples: 0,
    prayersCount: 0,
    bibleStudiesCount: 0,
    acceptedChristCount: 0,
    meetingsCount: 3, // Mocked as per request/image
    unreadMessages: 0, // Mocked as per request/image
    sundayAttendanceCount: 0, // Nombre total de présences au culte du dimanche
    lastSundayAttendance: 0, // Nombre de présences au dernier dimanche
    disciplesList: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchMentorData();
  }, [user]);

  const fetchMentorData = async () => {
    try {
      setLoading(true);
      
      const { data: disciples } = await supabase
        .from('cercle_personnes')
        .select('*')
        .eq('user_id', user.id);
      
      const allDisciples = disciples || [];
      const total = allDisciples.length;

      const countStatus = (term) => allDisciples.filter(d => 
        (d.circle_type || '').toLowerCase().includes(term)
      ).length;

      const nonCroyants = countStatus('unbeliever') + countStatus('non-croyant');
      const nouveaux = countStatus('newbeliever') + countStatus('nouveau');
      const affermis = countStatus('established') + countStatus('affermi');
      const faiseurs = countStatus('maker') + countStatus('faiseur');

      const { count: prayersCount } = await supabase
        .from('prayer_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch disciples with prayer requests or appointments
      const disciplesWithActivity = await fetchDisciplesWithActivity(allDisciples);

      // Fetch Sunday attendance statistics
      const discipleIds = allDisciples.map(d => d.id);
      let sundayAttendanceCount = 0;
      let lastSundayAttendance = 0;
      
      if (discipleIds.length > 0) {
        // Calculer le dernier dimanche
        const today = new Date();
        const lastSunday = new Date(today);
        lastSunday.setDate(today.getDate() - today.getDay()); // Dernier dimanche
        
        // Total des présences au culte
        const { count: totalAttendance } = await supabase
          .from('attendance_tracking')
          .select('*', { count: 'exact', head: true })
          .eq('attendance_type', 'sunday_worship')
          .eq('status', 'present')
          .in('disciple_id', discipleIds);
        
        sundayAttendanceCount = totalAttendance || 0;
        
        // Présences au dernier dimanche
        const lastSundayStr = format(lastSunday, 'yyyy-MM-dd');
        const { count: lastSundayCount } = await supabase
          .from('attendance_tracking')
          .select('*', { count: 'exact', head: true })
          .eq('attendance_type', 'sunday_worship')
          .eq('status', 'present')
          .eq('attendance_date', lastSundayStr)
          .in('disciple_id', discipleIds);
        
        lastSundayAttendance = lastSundayCount || 0;
      }

      setStats({
        total,
        nonCroyants,
        nouveauxConvertis: nouveaux,
        disciplesAffermis: affermis,
        faiseursDisciples: faiseurs,
        prayersCount: prayersCount || 5, 
        bibleStudiesCount: 3, 
        acceptedChristCount: 0,
        meetingsCount: 3,
        unreadMessages: 0,
        sundayAttendanceCount,
        lastSundayAttendance,
        disciplesList: disciplesWithActivity.slice(0, 3) // Only 3 disciples with prayer requests or appointments
      });

    } catch (error) {
      console.error("Error fetching mentor data", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDisciplesWithActivity = async (allDisciples) => {
    try {
      if (!allDisciples || allDisciples.length === 0) return [];

      // Get all disciple IDs and names (filter out null/undefined)
      const discipleIds = allDisciples.map(d => d.id).filter(Boolean);
      const discipleNames = allDisciples.map(d => d.name).filter(Boolean);

      if (discipleIds.length === 0 && discipleNames.length === 0) return [];

      // Fetch appointments for these disciples (where mentor is current user)
      let appointments = [];
      if (discipleIds.length > 0) {
        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select('disciple_id')
          .eq('mentor_id', user.id)
          .eq('status', 'scheduled')
          .in('disciple_id', discipleIds);
        appointments = appointmentsData || [];
      }

      // Fetch prayer requests for these disciples (by name)
      let prayerRequests = [];
      if (discipleNames.length > 0) {
        const { data: prayerRequestsData } = await supabase
          .from('prayer_requests')
          .select('disciple_name')
          .eq('user_id', user.id)
          .in('disciple_name', discipleNames);
        prayerRequests = prayerRequestsData || [];
      }

      // Get unique disciple IDs from appointments
      const discipleIdsWithAppointments = new Set(
        appointments.map(a => a.disciple_id).filter(Boolean)
      );

      // Get unique disciple names from prayer requests
      const discipleNamesWithPrayers = new Set(
        prayerRequests.map(p => p.disciple_name).filter(Boolean)
      );

      // Filter disciples who have either an appointment or a prayer request
      const activeDisciples = allDisciples.filter(disciple => {
        if (!disciple || !disciple.id) return false;
        const hasAppointment = discipleIdsWithAppointments.has(disciple.id);
        const hasPrayerRequest = disciple.name && discipleNamesWithPrayers.has(disciple.name);
        return hasAppointment || hasPrayerRequest;
      });

      return activeDisciples;
    } catch (error) {
      console.error("Error fetching disciples with activity", error);
      return [];
    }
  };

  const getPercentage = (val, total) => {
    if (total === 0) return 0;
    return Math.round((val / total) * 100);
  };

  const getMetricPercentage = (val, target) => {
    return Math.min(100, Math.round((val / target) * 100));
  };

  const statusCards = [
    { 
      title: "NON CROYANTS", 
      count: stats.nonCroyants, 
      color: "text-[#ff4b6e]", 
      borderColor: "border-[#ff4b6e]", 
      gradient: "from-[#ff4b6e]/20 to-transparent" 
    },
    { 
      title: "NOUVEAUX CONVERTIS", 
      count: stats.nouveauxConvertis, 
      color: "text-[#2dd4bf]", 
      borderColor: "border-[#2dd4bf]", 
      gradient: "from-[#2dd4bf]/20 to-transparent" 
    },
    { 
      title: "DISCIPLES AFFERMIS", 
      count: stats.disciplesAffermis, 
      color: "text-[#8b5cf6]", 
      borderColor: "border-[#8b5cf6]", 
      gradient: "from-[#8b5cf6]/20 to-transparent" 
    },
    { 
      title: "FAISEURS DE DISCIPLES", 
      count: stats.faiseursDisciples, 
      color: "text-[#fbbf24]", 
      borderColor: "border-[#fbbf24]", 
      gradient: "from-[#fbbf24]/20 to-transparent" 
    }
  ];

  const metrics = [
    { label: "Mes Disciples", value: stats.total, target: 30, icon: Users, color: "text-blue-400", barColor: "bg-blue-500", bgIcon: "bg-blue-500/10" },
    { label: "Prières", value: stats.prayersCount, target: 14, icon: Heart, color: "text-purple-400", barColor: "bg-purple-500", bgIcon: "bg-purple-500/10" },
    { label: "Échanges", value: 12, target: 20, icon: MessageCircle, color: "text-indigo-400", barColor: "bg-indigo-500", bgIcon: "bg-indigo-500/10" }, 
    { label: "Accompagnement", value: 2, target: 6, icon: UserCheck, color: "text-teal-400", barColor: "bg-teal-500", bgIcon: "bg-teal-500/10" }, 
    { label: "Étude Biblique", value: stats.bibleStudiesCount, target: 8, icon: BookOpen, color: "text-amber-400", barColor: "bg-amber-500", bgIcon: "bg-amber-500/10" }, 
    { label: "Ont accepté Christ", value: stats.acceptedChristCount, target: 5, icon: Heart, color: "text-rose-400", barColor: "bg-rose-500", bgIcon: "bg-rose-500/10" },
    { label: "Présences au Culte", value: stats.lastSundayAttendance, target: stats.total || 1, icon: Church, color: "text-teal-400", barColor: "bg-teal-500", bgIcon: "bg-teal-500/10" },
  ];

  const getInitials = (name) => {
    if (!name) return "??";
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (index) => {
    const colors = ["bg-[#8b5cf6]", "bg-[#3b82f6]", "bg-[#fbbf24]", "bg-[#ef4444]", "bg-[#10b981]"];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* 1. Header Section */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Tableau de Bord Mentor</h1>
          <p className="text-gray-400 mt-1 text-base">
            Gérez votre groupe, planifiez des rencontres et suivez la progression.
          </p>
        </div>
        
        {/* 2. Action Button */}
        <Button 
          onClick={() => navigate('/circles')}
          className="bg-[#14b8a6] hover:bg-[#0d9488] text-white font-semibold py-6 px-6 rounded-lg w-full sm:w-auto shadow-lg shadow-[#14b8a6]/20 transition-all flex items-center gap-2"
        >
          <UserPlus size={20} />
          Ajouter un disciple
        </Button>
      </div>

      {/* 2. Summary Cards - Single Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {/* Total Disciples */}
        <Card className="bg-[#1e1b4b]/40 border-0 shadow-lg relative overflow-hidden">
          <CardContent className="p-6">
            <p className="text-gray-400 text-sm mb-2">Total Disciples</p>
            <div className="flex items-center gap-3">
              <Users className="text-[#2dd4bf] h-6 w-6" />
              <span className="text-4xl font-bold text-white">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        {/* RDV à venir */}
        <Card className="bg-[#1e1b4b]/40 border-0 shadow-lg relative overflow-hidden">
          <CardContent className="p-6">
            <p className="text-gray-400 text-sm mb-2">RDV à venir</p>
            <div className="flex items-center gap-3">
              <Calendar className="text-[#8b5cf6] h-6 w-6" />
              <span className="text-4xl font-bold text-white">{stats.meetingsCount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Messages Non Lus */}
        <Card className="bg-[#1e1b4b]/40 border-0 shadow-lg relative overflow-hidden">
          <CardContent className="p-6">
            <p className="text-gray-400 text-sm mb-2">Messages Non Lus</p>
            <div className="flex items-center gap-3">
              <MessageSquare className="text-[#fbbf24] h-6 w-6" />
              <span className="text-4xl font-bold text-white">{stats.unreadMessages}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Status Cards Grid - 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        {statusCards.map((card, idx) => (
          <Card key={idx} className="bg-[#150a24] border-0 relative overflow-hidden group h-full">
            {/* Top Border Line */}
            <div className={`absolute top-0 left-0 w-24 h-1 bg-gradient-to-r ${card.gradient.split(' ')[0]} to-transparent rounded-full`} />
            <div className={`absolute top-0 right-0 w-8 h-1 bg-gradient-to-l ${card.gradient.split(' ')[0]} to-transparent rounded-full opacity-30`} />
            
            <CardContent className="flex flex-col items-center justify-center py-8 px-4 h-full relative z-10">
              <div className={`w-16 h-16 rounded-full border-2 ${card.borderColor} bg-opacity-10 flex items-center justify-center mb-4 bg-black/20`}>
                 <span className={`text-3xl font-bold ${card.color}`}>{card.count}</span>
              </div>
              
              <h3 className="text-xs font-extrabold text-white uppercase tracking-widest text-center mb-2">
                {card.title}
              </h3>
              
              <p className="text-sm text-gray-500 font-medium">
                {getPercentage(card.count, stats.total)}% du total
              </p>
            </CardContent>
            
            {/* Background Glow Effect */}
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-5 bg-gradient-to-br ${card.gradient}`} />
          </Card>
        ))}
      </div>

      {/* 4. Progression Globale */}
      <div className="space-y-4 mt-8">
        <h2 className="text-xl font-bold text-white mb-4">Progression Globale</h2>
        <div className="grid grid-cols-1 gap-4">
          {metrics.map((metric, idx) => (
             <div key={idx} className="bg-[#150a24] p-5 rounded-xl flex flex-col justify-center border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex justify-between items-center mb-3">
                   <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${metric.bgIcon}`}>
                         <metric.icon size={20} className={metric.color} />
                      </div>
                      <span className="font-bold text-white text-lg">{metric.label}</span>
                   </div>
                   <div className="text-right flex items-end gap-2">
                      <span className="text-white font-bold text-2xl">{metric.value}</span>
                      <span className="text-gray-500 text-sm mb-1">sur {metric.target}</span>
                   </div>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-[#0f0518] rounded-full overflow-hidden mt-1">
                   <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${getMetricPercentage(metric.value, metric.target)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full ${metric.barColor}`} 
                   />
                </div>
             </div>
          ))}
        </div>
      </div>

      {/* 5. Mon Groupe Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Mon Groupe</h2>
          <Button variant="link" className="text-[#14b8a6] hover:text-[#0d9488] p-0 h-auto" onClick={() => navigate('/disciples')}>
            Voir tout
          </Button>
        </div>
        
        <div className="space-y-3">
          {stats.disciplesList.length > 0 ? (
            stats.disciplesList.map((disciple, idx) => (
              <div 
                key={disciple.id}
                onClick={() => navigate(`/disciples/${disciple.id}`)}
                className="flex items-center justify-between bg-[#150a24] p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-[#1e0e33] transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${getAvatarColor(idx)} flex items-center justify-center text-white font-bold text-lg`}>
                    {getInitials(disciple.name)}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold group-hover:text-[#2dd4bf] transition-colors">
                      {disciple.name}
                    </h3>
                    <p className="text-gray-500 text-sm capitalize">
                      {disciple.circle_type || 'Inconnu'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-gray-600 group-hover:text-white transition-colors" size={20} />
              </div>
            ))
          ) : (
            <div className="text-center p-8 bg-[#150a24] rounded-xl border border-white/5">
              <p className="text-gray-400">Aucun disciple pour le moment.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default MentorDashboard;
