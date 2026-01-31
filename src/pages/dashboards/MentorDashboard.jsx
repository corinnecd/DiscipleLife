
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Heart, MessageCircle, UserCheck, BookOpen, 
  Calendar, MessageSquare, ChevronRight, Activity, Church, Clock, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { ArbreGenealogiqueEmbed } from '@/components/ArbreGenealogiqueEmbed';
import { getOrSetCache, clearCache } from '@/lib/CacheUtils';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useErrorHandler } from '@/hooks/useErrorHandler';

const MentorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { handleError } = useErrorHandler();
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
  const [reportReminder, setReportReminder] = useState(null); // { daysLeft: number, showReminder: boolean }
  const [famille, setFamille] = useState(null); // Famille du mentor (pour arbre généalogique)

  // Récupérer la famille du mentor (famille_id du profil)
  useEffect(() => {
    if (!user?.id) return;
    const abort = { current: false };
    (async () => {
      const { data: profil } = await supabase.from('profils').select('famille_id').eq('id', user.id).maybeSingle();
      if (abort.current || !profil?.famille_id) return;
      const { data: fam } = await supabase.from('familles_disciples').select('id, nom, pasteur_id, superviseur_id').eq('id', profil.famille_id).maybeSingle();
      if (!abort.current && fam) setFamille(fam);
    })();
    return () => { abort.current = true; };
  }, [user?.id]);

  // Fonction pour vérifier le rappel de rapport (5 jours avant la fin du mois)
  const checkReportReminder = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    
    // Calculer le dernier jour du mois en cours
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = now.getDate();
    
    // Calculer le nombre de jours restants jusqu'à la fin du mois
    const daysLeft = lastDayOfMonth - currentDay;
    
    // Afficher l'alerte si nous sommes à 5 jours ou moins de la fin du mois
    if (daysLeft <= 5 && daysLeft >= 0) {
      setReportReminder({
        daysLeft,
        showReminder: true
      });
    } else {
      setReportReminder(null);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMentorData();
      checkReportReminder();
    }
  }, [user]);

  const fetchMentorData = async () => {
    try {
      setLoading(true);
      
      // OPTIMISATION: Utiliser le cache pour les données du mentor (TTL: 2 minutes)
      const cacheKeyBase = `mentor_${user.id}`;
      
      // Récupérer les disciples avec cache
      const allDisciples = await getOrSetCache(
        `${cacheKeyBase}_disciples`,
        async () => {
          const { data, error } = await supabase
            .from('profils')
            .select('*')
            .eq('mentor_id', user.id);
          if (error) throw error;
          return data || [];
        },
        2 * 60 * 1000 // 2 minutes
      );
      
      const total = allDisciples.length;

      const countStatus = (term) => allDisciples.filter(d => 
        (d.circle_type || '').toLowerCase().includes(term)
      ).length;

      const nonCroyants = countStatus('unbeliever') + countStatus('non-croyant');
      const nouveaux = countStatus('newbeliever') + countStatus('nouveau');
      const affermis = countStatus('established') + countStatus('affermi');
      const faiseurs = countStatus('maker') + countStatus('faiseur');

      // OPTIMISATION: Paralléliser les requêtes pour les statistiques
      const discipleIds = allDisciples.map(d => d.id);
      const today = new Date();
      const lastSunday = new Date(today);
      lastSunday.setDate(today.getDate() - today.getDay());
      const lastSundayStr = format(lastSunday, 'yyyy-MM-dd');
      
      const [prayersResult, totalAttendanceResult, lastSundayResult] = await Promise.all([
        // Compteur de prières
        supabase
          .from('prayer_requests')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        // Total des présences au culte
        discipleIds.length > 0 
          ? supabase
              .from('attendance_tracking')
              .select('*', { count: 'exact', head: true })
              .eq('attendance_type', 'sunday_worship')
              .eq('status', 'present')
              .in('disciple_id', discipleIds)
          : Promise.resolve({ count: 0 }),
        // Présences au dernier dimanche
        discipleIds.length > 0
          ? supabase
              .from('attendance_tracking')
              .select('*', { count: 'exact', head: true })
              .eq('attendance_type', 'sunday_worship')
              .eq('status', 'present')
              .eq('attendance_date', lastSundayStr)
              .in('disciple_id', discipleIds)
          : Promise.resolve({ count: 0 })
      ]);

      const prayersCount = prayersResult.count || 0;
      const sundayAttendanceCount = totalAttendanceResult.count || 0;
      const lastSundayAttendance = lastSundayResult.count || 0;

      // Fetch disciples with prayer requests or appointments
      const disciplesWithActivity = await fetchDisciplesWithActivity(allDisciples);

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
      handleError(error, { context: 'fetchMentorData' }, "Impossible de charger les données du mentor.");
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
      handleError(error, { context: 'fetchDisciplesWithActivity' }, "Impossible de charger les disciples avec activité.");
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">Tableau de Bord Mentor</h1>
          <p className="text-gray-600">
            Gérez votre groupe, planifiez des rencontres et suivez la progression.
          </p>
        </div>
        
        {/* 2. Action Button */}
        <Button 
          onClick={() => navigate('/circles')}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-6 px-6 rounded-lg w-full sm:w-auto transition-all flex items-center gap-2"
        >
          <UserPlus size={20} />
          Ajouter un disciple
        </Button>
      </div>

      {/* Arbre généalogique de ma famille */}
      {famille?.id && (
        <ArbreGenealogiqueEmbed
          mode="family"
          famille={famille}
          title={`Arbre généalogique - ${famille.nom || 'Ma famille'}`}
          description="Lignée spirituelle de votre famille (Pasteur → Superviseur → Mentors → Disciples)."
          compactHeight={380}
        />
      )}

      {/* Alerte de rappel pour le rapport mensuel (5 jours avant la fin du mois) */}
      {reportReminder && reportReminder.showReminder && (
        <Card className="bg-blue-50 border-blue-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Rappel : Rapport mensuel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-900 font-medium">
                  {reportReminder.daysLeft === 0 
                    ? "⏰ Le mois se termine aujourd'hui ! N'oubliez pas d'envoyer votre rapport mensuel."
                    : reportReminder.daysLeft === 1
                    ? "⏰ Le mois se termine demain ! N'oubliez pas d'envoyer votre rapport mensuel."
                    : `⏰ Le mois se termine dans ${reportReminder.daysLeft} jours ! N'oubliez pas d'envoyer votre rapport mensuel.`
                  }
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  Vous pouvez envoyer votre rapport depuis la page "Envoyer un rapport".
                </p>
              </div>
              <Button
                onClick={() => navigate('/send-report')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Envoyer le rapport
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Summary Cards - Single Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {/* Total Disciples */}
        <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden">
          <CardContent className="p-6">
            <p className="text-gray-600 text-sm mb-2">Total Disciples</p>
            <div className="flex items-center gap-3">
              <Users className="text-purple-500 h-6 w-6" />
              <span className="text-4xl font-bold text-gray-900">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        {/* RDV à venir */}
        <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden">
          <CardContent className="p-6">
            <p className="text-gray-600 text-sm mb-2">RDV à venir</p>
            <div className="flex items-center gap-3">
              <Calendar className="text-purple-500 h-6 w-6" />
              <span className="text-4xl font-bold text-gray-900">{stats.meetingsCount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Messages Non Lus */}
        <Card className="bg-white border-gray-200 shadow-sm relative overflow-hidden">
          <CardContent className="p-6">
            <p className="text-gray-600 text-sm mb-2">Messages Non Lus</p>
            <div className="flex items-center gap-3">
              <MessageSquare className="text-purple-500 h-6 w-6" />
              <span className="text-4xl font-bold text-gray-900">{stats.unreadMessages}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Status Cards Grid - 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        {statusCards.map((card, idx) => (
          <Card key={idx} className="bg-white border-gray-200 shadow-sm relative overflow-hidden group h-full">
            <CardContent className="flex flex-col items-center justify-center py-8 px-4 h-full relative z-10">
              <div className={`w-16 h-16 rounded-full border-2 ${card.borderColor} bg-white flex items-center justify-center mb-4`}>
                 <span className={`text-3xl font-bold ${card.color}`}>{card.count}</span>
              </div>
              
              <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest text-center mb-2">
                {card.title}
              </h3>
              
              <p className="text-sm text-gray-600 font-medium">
                {getPercentage(card.count, stats.total)}% du total
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 4. Progression Globale */}
      <div className="space-y-4 mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Progression Globale</h2>
        <div className="grid grid-cols-1 gap-4">
          {metrics.map((metric, idx) => (
             <Card key={idx} className="bg-white border-gray-200 shadow-sm p-5">
                <div className="flex justify-between items-center mb-3">
                   <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${metric.bgIcon}`}>
                         <metric.icon size={20} className={metric.color} />
                      </div>
                      <span className="font-bold text-gray-900 text-lg">{metric.label}</span>
                   </div>
                   <div className="text-right flex items-end gap-2">
                      <span className="text-gray-900 font-bold text-2xl">{metric.value}</span>
                      <span className="text-gray-600 text-sm mb-1">sur {metric.target}</span>
                   </div>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden mt-1">
                   <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${getMetricPercentage(metric.value, metric.target)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full ${metric.barColor}`} 
                   />
                </div>
             </Card>
          ))}
        </div>
      </div>

      {/* 5. Mon Groupe Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Mon Groupe</h2>
          <Button variant="link" className="text-purple-600 hover:text-purple-700 p-0 h-auto" onClick={() => navigate('/disciples')}>
            Voir tout
          </Button>
        </div>
        
        <div className="space-y-3">
          {stats.disciplesList.length > 0 ? (
            stats.disciplesList.map((disciple, idx) => (
              <Card
                key={disciple.id}
                onClick={() => navigate(`/disciples/${disciple.id}`)}
                className="bg-white border-gray-200 shadow-sm p-4 cursor-pointer hover:border-purple-300 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full ${getAvatarColor(idx)} flex items-center justify-center text-white font-bold text-lg`}>
                      {getInitials(disciple.name)}
                    </div>
                    <div>
                      <h3 className="text-gray-900 font-semibold group-hover:text-purple-600 transition-colors">
                        {disciple.name}
                      </h3>
                      <p className="text-gray-600 text-sm capitalize">
                        {disciple.circle_type || 'Inconnu'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="text-gray-400 group-hover:text-purple-600 transition-colors" size={20} />
                </div>
              </Card>
            ))
          ) : (
            <Card className="bg-white border-gray-200 shadow-sm text-center p-8">
              <p className="text-gray-600">Aucun disciple pour le moment.</p>
            </Card>
          )}
        </div>
      </div>

    </div>
  );
};

export default MentorDashboard;
