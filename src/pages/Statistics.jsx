
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { supabase } from '@/lib/customSupabaseClient';
import { getOrSetCache, clearCache } from '@/lib/CacheUtils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPES = {
  SUNDAY_WORSHIP: "sunday_worship",
  SUNDAY_SHARING: "sunday_sharing",
  SATURDAY_PRAYER: "saturday_prayer"
};

const Statistics = () => {
  const { user } = useAuth();
  const { isMentor, canHaveDisciples } = useRole();
  const navigate = useNavigate();
  const isMentorView = isMentor || canHaveDisciples;
  
  const [loading, setLoading] = useState(true);
  const [disciples, setDisciples] = useState([]);
  const [stats, setStats] = useState([]);

  useEffect(() => {
    if (user && isMentorView) {
      fetchData();
    }
  }, [user, isMentorView]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // OPTIMISATION: Utiliser le cache pour les données de statistiques (TTL: 2 minutes)
      const cacheKey = `statistics_${user.id}`;
      
      const result = await getOrSetCache(
        cacheKey,
        async () => {
          // Récupérer les disciples (source = profils, mentor_id = moi)
          const { data: profilsData, error: profilsError } = await supabase
            .from('profils')
            .select('id, first_name, last_name, email')
            .eq('mentor_id', user.id)
            .order('first_name');
          
          if (profilsError) throw profilsError;

          // Les id profils sont déjà les id utilisateur si le disciple a un compte
          const disciplesWithUserIds = await Promise.all(
            (profilsData || []).map(async (disciple) => {
              let discipleUserId = disciple.id;
              
              if (disciple.email) {
                const { data: profilData } = await supabase
                  .from('profils')
                  .select('id')
                  .eq('email', disciple.email)
                  .maybeSingle();
                
                if (profilData) {
                  discipleUserId = profilData.id;
                }
              }
              
              return {
                ...disciple,
                name: `${(disciple.first_name || '')} ${(disciple.last_name || '')}`.trim(),
                disciple_user_id: discipleUserId
              };
            })
          );

          return { disciples: disciplesWithUserIds };
        },
        2 * 60 * 1000 // 2 minutes
      );

      const disciplesWithUserIds = result.disciples;
      setDisciples(disciplesWithUserIds);

      // Calculer les 3 derniers mois
      const now = new Date();
      const months = [];
      for (let i = 0; i < 3; i++) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        months.push({
          date: monthDate,
          start: monthStart.toISOString().split('T')[0],
          end: monthEnd.toISOString().split('T')[0],
          label: format(monthDate, 'MMMM yyyy', { locale: fr })
        });
      }

      // OPTIMISATION: Utiliser le cache pour les événements mentor (TTL: 5 minutes)
      const eventsCacheKey = `statistics_events_${user.id}`;
      const eventsData = await getOrSetCache(
        eventsCacheKey,
        async () => {
          const { data, error } = await supabase
            .from('mentor_events')
            .select('*')
            .eq('mentor_id', user.id)
            .eq('day_of_week', 4) // Jeudi = 4
            .eq('recurrence', 'hebdomadaire');
          if (error) throw error;
          return data || [];
        },
        5 * 60 * 1000 // 5 minutes
      );

      const thursdayPrayerEvent = eventsData && eventsData.length > 0 ? eventsData[0] : null;

      // Créer une map pour les noms des disciples
      const discipleNameMap = {};
      disciplesWithUserIds.forEach(d => {
        if (d.disciple_user_id) {
          discipleNameMap[d.disciple_user_id] = d.name || `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Disciple sans nom';
        }
      });

      // Récupérer toutes les absences pour les 3 mois (tous les disciples)
      const allDiscipleUserIds = disciplesWithUserIds
        .filter(d => d.disciple_user_id)
        .map(d => d.disciple_user_id);

      // Récupérer toutes les absences pour tous les disciples
      const { data: allAbsencesData } = await supabase
        .from('attendance_tracking')
        .select('*')
        .in('disciple_id', allDiscipleUserIds)
        .eq('status', 'absent')
        .gte('attendance_date', months[2].start)
        .lte('attendance_date', months[0].end)
        .order('attendance_date', { ascending: false });

      // Grouper les absences par mois
      const absencesByMonth = months.map(month => {
        const monthAbsences = (allAbsencesData || []).filter(
          a => a.attendance_date >= month.start && a.attendance_date <= month.end
        );

        // Grouper par disciple
        const absencesByDisciple = {};
        monthAbsences.forEach(absence => {
          const discipleId = absence.disciple_id;
          if (!absencesByDisciple[discipleId]) {
            absencesByDisciple[discipleId] = [];
          }
          absencesByDisciple[discipleId].push({
            date: absence.attendance_date,
            reason: absence.absence_reason || 'Aucun motif'
          });
        });

        // Convertir en tableau avec noms
        const discipleAbsencesList = Object.keys(absencesByDisciple).map(discipleId => ({
          discipleId,
          discipleName: discipleNameMap[discipleId] || 'Disciple inconnu',
          absences: absencesByDisciple[discipleId]
        }));

        return {
          month: month.label,
          monthStart: month.start,
          discipleAbsencesList
        };
      });

      // Récupérer les stats pour chaque disciple
      const disciplesStats = await Promise.all(
        disciplesWithUserIds
          .filter(d => d.disciple_user_id) // Seulement ceux avec un compte
          .map(async (disciple) => {
            const discipleUserId = disciple.disciple_user_id;
            
            // Récupérer toutes les présences/absences pour les 3 mois
            const { data: attendanceData } = await supabase
              .from('attendance_tracking')
              .select('*')
              .eq('disciple_id', discipleUserId)
              .gte('attendance_date', months[2].start) // Le mois le plus ancien
              .lte('attendance_date', months[0].end) // Le mois le plus récent
              .order('attendance_date', { ascending: false });

            // Grouper par mois
            const monthlyStats = months.map(month => {
              const monthAttendance = (attendanceData || []).filter(
                a => a.attendance_date >= month.start && a.attendance_date <= month.end
              );

              // Séparer présences et absences
              const presences = monthAttendance.filter(a => a.status === 'present');
              const absences = monthAttendance.filter(a => a.status === 'absent');

              return {
                month: month.label,
                monthStart: month.start,
                presences: presences.length,
                absences: absences.length
              };
            });

            // Récupérer les présences au partage (sunday_sharing)
            const { count: sharingCount } = await supabase
              .from('attendance_tracking')
              .select('*', { count: 'exact', head: true })
              .eq('disciple_id', discipleUserId)
              .eq('attendance_type', TYPES.SUNDAY_SHARING)
              .eq('status', 'present')
              .gte('attendance_date', months[2].start)
              .lte('attendance_date', months[0].end);

            // Récupérer les présences au temps de prière jeudi (si événement existe)
            let thursdayPrayerCount = 0;
            if (thursdayPrayerEvent) {
              const { count } = await supabase
                .from('attendance_tracking')
                .select('*', { count: 'exact', head: true })
                .eq('disciple_id', discipleUserId)
                .eq('attendance_type', thursdayPrayerEvent.id)
                .eq('status', 'present')
                .gte('attendance_date', months[2].start)
                .lte('attendance_date', months[0].end);
              thursdayPrayerCount = count || 0;
            }

            // Récupérer les méditations de la parole (ebook_readings)
            const { count: meditationCount } = await supabase
              .from('ebook_readings')
              .select('*', { count: 'exact', head: true })
              .eq('disciple_id', discipleUserId)
              .gte('created_at', months[2].start)
              .lte('created_at', months[0].end);

            return {
              discipleId: disciple.id,
              discipleName: disciple.name || `${disciple.first_name || ''} ${disciple.last_name || ''}`.trim() || 'Disciple sans nom',
              monthlyStats,
              sharingAttendance: sharingCount || 0,
              thursdayPrayerAttendance: thursdayPrayerCount,
              meditationAttendance: meditationCount || 0
            };
          })
      );

      setStats({ disciplesStats, absencesByMonth });
    } catch (error) {
      console.error("Error fetching statistics", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isMentorView) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 sm:px-6">
        {/* Bouton retour */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mes Statistiques</h1>
          <p className="text-gray-600 mt-1">Cette section est réservée aux mentors.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 sm:px-6">
      {/* Bouton retour */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mes Statistiques</h1>
        <p className="text-gray-600 mt-1">Assiduité mensuelle de vos disciples sur 3 mois</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <span className="text-gray-600 ml-3">Chargement des statistiques...</span>
        </div>
      ) : !stats.disciplesStats || stats.disciplesStats.length === 0 ? (
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-6 text-center text-gray-600">
            Aucun disciple avec compte utilisateur trouvé.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Section des absences par mois */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 text-xl">Absences par Mois (3 derniers mois)</CardTitle>
              <CardDescription className="text-gray-600">Tous les disciples absents avec motifs d'absence</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {stats.absencesByMonth.map((monthData, monthIndex) => (
                <div key={monthIndex} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="text-gray-900 font-semibold text-lg mb-4">{monthData.month}</h3>
                  {monthData.discipleAbsencesList.length === 0 ? (
                    <p className="text-gray-600 text-sm">Aucune absence enregistrée ce mois-ci</p>
                  ) : (
                    <div className="space-y-3">
                      {monthData.discipleAbsencesList.map((discipleAbsence, discIndex) => {
                        const absencesText = discipleAbsence.absences.map((abs, absIndex) => {
                          const date = new Date(abs.date);
                          const formattedDate = format(date, 'dd', { locale: fr });
                          return (
                            <span key={absIndex}>
                              {formattedDate} ({abs.reason})
                              {absIndex < discipleAbsence.absences.length - 1 && ', '}
                            </span>
                          );
                        });
                        
                        return (
                          <div key={discIndex} className="text-sm text-gray-700 bg-white rounded p-3 border border-gray-200">
                            <span className="font-medium text-gray-900">{discipleAbsence.discipleName}</span>
                            {' : '}
                            <span className="text-red-400">{absencesText}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section des stats par disciple */}
          <div className="space-y-6">
            {stats.disciplesStats.map((discipleStat, index) => (
            <Card key={discipleStat.discipleId || index} className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 text-xl">{discipleStat.discipleName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Assiduité mensuelle sur 3 mois */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Assiduité Mensuelle (3 derniers mois)</h3>
                  <div className="space-y-4">
                    {discipleStat.monthlyStats.map((monthStat, monthIndex) => (
                      <div key={monthIndex} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-gray-900 font-medium">{monthStat.month}</h4>
                          <div className="flex gap-4 text-sm">
                            <span className="text-green-600">
                              <span className="font-semibold">{monthStat.presences}</span> présences
                            </span>
                            <span className="text-red-600">
                              <span className="font-semibold">{monthStat.absences}</span> absences
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Autres assiduités */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="text-gray-600 text-sm mb-2">Temps de Partage</h4>
                    <p className="text-2xl font-bold text-purple-600">{discipleStat.sharingAttendance}</p>
                    <p className="text-xs text-gray-600 mt-1">présences sur 3 mois</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="text-gray-600 text-sm mb-2">Prière Jeudi</h4>
                    <p className="text-2xl font-bold text-purple-600">{discipleStat.thursdayPrayerAttendance}</p>
                    <p className="text-xs text-gray-600 mt-1">présences sur 3 mois</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="text-gray-600 text-sm mb-2">Méditation de la Parole</h4>
                    <p className="text-2xl font-bold text-purple-600">{discipleStat.meditationAttendance}</p>
                    <p className="text-xs text-gray-600 mt-1">sessions sur 3 mois</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;
