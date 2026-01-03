
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Video, BarChart2, Megaphone, Send, Info, Church, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const SendReport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [discipleCount, setDiscipleCount] = useState(0);
  
  const [reportMonth, setReportMonth] = useState(new Date().getMonth().toString());
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());

  const [stats, setStats] = useState({
    evangelizedCount: 0,
    videoViews: 0,
    completionRate: 0,
    sundayAttendanceCount: 0,
    sundaySharingCount: 0,
    saturdayPrayerCount: 0,
    notes: ''
  });
  
  const [absentDisciples, setAbsentDisciples] = useState([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, reportMonth, reportYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { count, error } = await supabase
        .from('cercle_personnes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (!error) {
        setDiscipleCount(count || 0);
      }

      // Fetch attendance counts for the selected month (mentor + disciples)
      if (count > 0) {
        // Récupérer les disciples avec leurs emails pour obtenir leurs IDs utilisateurs
        const { data: disciples } = await supabase
          .from('cercle_personnes')
          .select('id, email')
          .eq('user_id', user.id);
        
        // Récupérer les IDs utilisateurs des disciples
        const discipleUserIds = [];
        for (const disciple of disciples || []) {
          if (disciple.email) {
            const { data: profilData } = await supabase
              .from('profils')
              .select('id')
              .eq('email', disciple.email)
              .maybeSingle();
            
            if (profilData && profilData.id) {
              discipleUserIds.push(profilData.id);
            }
          }
        }
        
        // Inclure l'ID du mentor lui-même
        const allUserIds = [user.id, ...discipleUserIds];
        
        if (allUserIds.length > 0) {
          const selectedMonth = parseInt(reportMonth) + 1; // reportMonth est 0-indexed
          const selectedYear = parseInt(reportYear);
          
          const monthStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
          const monthEnd = selectedMonth === 12 
            ? `${selectedYear + 1}-01-01`
            : `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
          
          // Compter les présences pour tous les types d'événements
          const [sundayCount, sharingCount, prayerCount] = await Promise.all([
            supabase
              .from('attendance_tracking')
              .select('*', { count: 'exact', head: true })
              .eq('attendance_type', 'sunday_worship')
              .eq('status', 'present')
              .in('disciple_id', allUserIds)
              .gte('attendance_date', monthStart)
              .lt('attendance_date', monthEnd),
            supabase
              .from('attendance_tracking')
              .select('*', { count: 'exact', head: true })
              .eq('attendance_type', 'sunday_sharing')
              .eq('status', 'present')
              .in('disciple_id', allUserIds)
              .gte('attendance_date', monthStart)
              .lt('attendance_date', monthEnd),
            supabase
              .from('attendance_tracking')
              .select('*', { count: 'exact', head: true })
              .eq('attendance_type', 'saturday_prayer')
              .eq('status', 'present')
              .in('disciple_id', allUserIds)
              .gte('attendance_date', monthStart)
              .lt('attendance_date', monthEnd)
          ]);
          
          setStats(prev => ({
            ...prev,
            sundayAttendanceCount: sundayCount.count || 0,
            sundaySharingCount: sharingCount.count || 0,
            saturdayPrayerCount: prayerCount.count || 0
          }));
          
          // Récupérer les absences des disciples pour le mois en cours (uniquement dimanche)
          await fetchAbsentDisciples(discipleUserIds, monthStart, monthEnd);
        }
      }

    } catch (error) {
      console.error("Error fetching report data", error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAbsentDisciples = async (discipleUserIds, monthStart, monthEnd) => {
    try {
      if (discipleUserIds.length === 0) {
        setAbsentDisciples([]);
        return;
      }
      
      // Récupérer les noms des disciples
      const { data: disciplesData } = await supabase
        .from('cercle_personnes')
        .select('id, name, first_name, last_name, email')
        .eq('user_id', user.id);
      
      // Créer une map disciple_id -> nom du disciple
      const discipleNameMap = {};
      
      for (const disciple of disciplesData || []) {
        if (disciple.email) {
          const { data: profilData } = await supabase
            .from('profils')
            .select('id')
            .eq('email', disciple.email)
            .maybeSingle();
          
          if (profilData && profilData.id) {
            discipleNameMap[profilData.id] = disciple.name || `${disciple.first_name || ''} ${disciple.last_name || ''}`.trim() || 'Disciple sans nom';
          }
        }
      }
      
      // Récupérer les absences du dimanche pour le mois en cours
      const { data: absencesData, error: absencesError } = await supabase
        .from('attendance_tracking')
        .select('disciple_id, attendance_date')
        .in('disciple_id', discipleUserIds)
        .eq('attendance_type', 'sunday_worship')
        .eq('status', 'absent')
        .gte('attendance_date', monthStart)
        .lt('attendance_date', monthEnd)
        .order('attendance_date', { ascending: true });
      
      if (absencesError) throw absencesError;
      
      // Grouper les absences par disciple (dédupliquer)
      const discipleAbsences = {};
      const seenAbsences = new Set();
      
      absencesData?.forEach(record => {
        const absenceKey = `${record.disciple_id}-${record.attendance_date}`;
        if (seenAbsences.has(absenceKey)) {
          return; // Ignorer les doublons
        }
        
        if (!discipleAbsences[record.disciple_id]) {
          discipleAbsences[record.disciple_id] = {
            count: 0,
            discipleId: record.disciple_id
          };
        }
        discipleAbsences[record.disciple_id].count++;
        seenAbsences.add(absenceKey);
      });
      
      // Convertir en tableau et ajouter les noms
      const absentDisciplesList = Object.keys(discipleAbsences)
        .map(discipleId => ({
          discipleId,
          discipleName: discipleNameMap[discipleId] || 'Disciple inconnu',
          absenceCount: discipleAbsences[discipleId].count
        }))
        .filter(d => d.absenceCount > 0)
        .sort((a, b) => {
          if (b.absenceCount !== a.absenceCount) {
            return b.absenceCount - a.absenceCount;
          }
          return a.discipleName.localeCompare(b.discipleName);
        });
      
      setAbsentDisciples(absentDisciplesList);
    } catch (error) {
      console.error("Error fetching absent disciples", error);
      setAbsentDisciples([]);
    }
  };

  const handleSend = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('reports').insert([{
        user_id: user.id,
        month: reportMonth,
        year: reportYear,
        content: stats.notes,
        statistics_snapshot: {
            disciples: discipleCount,
            evangelization: stats.evangelizedCount,
            video_views: stats.videoViews,
            completion_rate: stats.completionRate,
            sunday_attendance_count: stats.sundayAttendanceCount,
            sunday_sharing_count: stats.sundaySharingCount || 0,
            saturday_prayer_count: stats.saturdayPrayerCount || 0
        },
        status: 'submitted'
      }]);

      if (error) throw error;

      toast({
        title: "Rapport envoyé avec succès !",
        description: "Merci pour votre fidélité. Le QG a bien reçu vos données.",
        className: "bg-green-600 text-white border-none"
      });
      
      setStats({ ...stats, notes: '' });

    } catch (error) {
      console.error("Error sending report", error);
      toast({
        variant: "destructive",
        title: "Erreur d'envoi",
        description: "Impossible d'envoyer le rapport. Veuillez réessayer."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const years = ["2024", "2025", "2026"];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-3xl font-bold text-white tracking-tight">Rapport Mensuel</h1>
           <p className="text-gray-400 mt-1">Transmettez vos statistiques et vos témoignages au leadership.</p>
        </div>
        
        {/* Date Filters */}
        <div className="flex gap-3 bg-[#1a0b2e] p-2 rounded-xl border border-white/10">
          <Select value={reportMonth} onValueChange={setReportMonth}>
              <SelectTrigger className="w-[140px] bg-transparent text-white border-transparent hover:bg-white/5 transition-colors focus:ring-0">
                  <SelectValue placeholder="Mois" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e1b4b] text-white border-white/10">
                  {months.map((m, i) => (
                      <SelectItem key={i} value={i.toString()} className="focus:bg-white/10">{m}</SelectItem>
                  ))}
              </SelectContent>
          </Select>
          <div className="w-[1px] bg-white/10 my-1"></div>
          <Select value={reportYear} onValueChange={setReportYear}>
              <SelectTrigger className="w-[100px] bg-transparent text-white border-transparent hover:bg-white/5 transition-colors focus:ring-0">
                  <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e1b4b] text-white border-white/10">
                  {years.map((y) => (
                      <SelectItem key={y} value={y} className="focus:bg-white/10">{y}</SelectItem>
                  ))}
              </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Stats Column */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            <Card className="bg-[#1a0b2e] border-white/10 shadow-lg relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Users size={80} className="text-indigo-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-indigo-400 font-medium text-sm mb-1">Total Disciples</p>
                  <p className="text-4xl font-bold text-white">{discipleCount}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                    <Info size={12} /> Calculé automatiquement
                  </div>
               </CardContent>
            </Card>

            {/* Absences du mois en cours */}
            <Card className="bg-[#1a0b2e] border-white/10 shadow-lg relative overflow-hidden group">
               <CardHeader className="border-b border-white/5 pb-4">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                     <AlertTriangle className="text-rose-400" size={20} />
                     Absences au Culte du Dimanche
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-6">
                  {loading ? (
                     <p className="text-gray-400 text-sm">Chargement...</p>
                  ) : absentDisciples.length === 0 ? (
                     <p className="text-gray-400 text-sm">Aucune absence enregistrée ce mois-ci</p>
                  ) : (
                     <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {absentDisciples.map((disciple, index) => (
                           <div key={disciple.discipleId || index} className="flex items-center justify-between bg-white/5 rounded-lg p-2.5 border border-white/5">
                              <span className="text-white font-medium text-sm">{disciple.discipleName}</span>
                              <span className="text-rose-400 font-semibold text-sm">
                                 Absent{disciple.absenceCount > 1 ? 's' : ''} {disciple.absenceCount} fois
                              </span>
                           </div>
                        ))}
                     </div>
                  )}
               </CardContent>
            </Card>

            <Card className="bg-[#1a0b2e] border-white/10 shadow-lg relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Church size={80} className="text-teal-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-teal-400 font-medium text-sm mb-1">Présences au Culte</p>
                  <p className="text-4xl font-bold text-white">{stats.sundayAttendanceCount}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                    <Info size={12} /> Ce mois-ci
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-[#1a0b2e] border-white/10 shadow-lg relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Church size={80} className="text-indigo-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-indigo-400 font-medium text-sm mb-1">Présences à la Prière</p>
                  <p className="text-4xl font-bold text-white">{stats.saturdayPrayerCount || 0}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                    <Info size={12} /> Ce mois-ci
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-[#1a0b2e] border-white/10 shadow-lg relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Users size={80} className="text-purple-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-purple-400 font-medium text-sm mb-1">Présences au Partage</p>
                  <p className="text-4xl font-bold text-white">{stats.sundaySharingCount || 0}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                    <Info size={12} /> Ce mois-ci
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-[#1a0b2e] border-white/10 shadow-lg relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Megaphone size={80} className="text-emerald-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-emerald-400 font-medium text-sm mb-1">Personnes Évangélisées</p>
                  <div className="flex items-center gap-3">
                     <Input 
                        type="number"
                        min="0"
                        value={stats.evangelizedCount}
                        onChange={(e) => setStats({...stats, evangelizedCount: parseInt(e.target.value) || 0})}
                        className="w-24 bg-black/20 border-white/10 text-white text-xl font-bold h-10"
                     />
                     <span className="text-gray-500 text-sm">ce mois-ci</span>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-[#1a0b2e] border-white/10 shadow-lg relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Video size={80} className="text-amber-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-amber-400 font-medium text-sm mb-1">Vidéos Visionnées</p>
                  <div className="flex items-center gap-3">
                     <Input 
                        type="number"
                        min="0"
                        value={stats.videoViews}
                        onChange={(e) => setStats({...stats, videoViews: parseInt(e.target.value) || 0})}
                        className="w-24 bg-black/20 border-white/10 text-white text-xl font-bold h-10"
                     />
                     <span className="text-gray-500 text-sm">modules</span>
                  </div>
               </CardContent>
            </Card>

            <Card className="bg-[#1a0b2e] border-white/10 shadow-lg relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <BarChart2 size={80} className="text-fuchsia-400" />
               </div>
               <CardContent className="p-6">
                  <p className="text-fuchsia-400 font-medium text-sm mb-1">Taux de Complétion</p>
                  <div className="flex items-center gap-3">
                     <Input 
                        type="number"
                        min="0"
                        max="100"
                        value={stats.completionRate}
                        onChange={(e) => setStats({...stats, completionRate: parseInt(e.target.value) || 0})}
                        className="w-24 bg-black/20 border-white/10 text-white text-xl font-bold h-10"
                     />
                     <span className="text-gray-500 text-sm">% global</span>
                  </div>
               </CardContent>
            </Card>

          </div>

          {/* Notes Column */}
          <div className="md:col-span-4">
             <Card className="bg-[#1a0b2e] border-white/10 shadow-lg h-full flex flex-col">
                <CardHeader>
                   <CardTitle className="text-white text-lg">Témoignage / Notes</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                   <Textarea 
                      value={stats.notes} 
                      onChange={(e) => setStats({...stats, notes: e.target.value})}
                      placeholder="Partagez un témoignage marquant ou des défis rencontrés ce mois-ci..."
                      className="flex-1 bg-black/20 border-white/10 text-white resize-none min-h-[200px] focus:ring-indigo-500/30"
                   />
                   <Button 
                    onClick={handleSend} 
                    disabled={submitting}
                    className="w-full h-12 text-base font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-900/20"
                   >
                    {submitting ? "Envoi en cours..." : <><Send size={18} className="mr-2"/> Envoyer le Rapport</>}
                   </Button>
                </CardContent>
             </Card>
          </div>

      </div>
    </div>
  );
};

export default SendReport;
