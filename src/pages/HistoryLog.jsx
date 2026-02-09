import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { History, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const HistoryLog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchLogs();
  }, [user]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // Fetch both history tables
      const { data: aptHistory, error: aptError } = await supabase
        .from('appointment_history')
        .select('*, appointments(scheduled_date), profils:changed_by(first_name, last_name)')
        .order('created_at', { ascending: false });

      const { data: prayerHistory, error: prayerError } = await supabase
        .from('prayer_history')
        .select('*, prayer_sessions(prayer_topic), profils:changed_by(first_name, last_name)')
        .order('created_at', { ascending: false });

      if (aptError || prayerError) throw new Error("Error fetching logs");

      // Combine and Sort
      const combined = [
          ...(aptHistory || []).map(l => ({ ...l, type: 'RDV' })),
          ...(prayerHistory || []).map(l => ({ ...l, type: 'Prière' }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setLogs(combined);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const translateAction = (action) => {
      switch(action) {
          case 'created': return 'Création';
          case 'cancelled': return 'Annulation';
          case 'rescheduled': return 'Report';
          default: return action;
      }
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto p-6 space-y-6">
       <div className="flex items-center gap-4">
           <Button variant="ghost" onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">Retour</Button>
           <h1 className="text-2xl font-bold text-white flex items-center gap-2">
               <History className="text-gray-400" /> Historique des Modifications
           </h1>
       </div>

       <div className="space-y-4">
           {loading ? (
               <div className="text-center text-gray-500">Chargement...</div>
           ) : logs.length === 0 ? (
               <div className="text-center py-16 border border-dashed border-white/10 rounded-xl bg-white/5">
                   <div className="flex justify-center mb-4">
                     <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                       <History className="w-8 h-8 text-gray-400" />
                     </div>
                   </div>
                   <h3 className="text-lg font-medium text-white mb-1">Aucun historique disponible</h3>
                   <p className="text-gray-400 text-sm">Les modifications de RDV et de prières apparaîtront ici.</p>
               </div>
           ) : (
               logs.map(log => (
                   <Card key={log.id} className="bg-[#1a0b2e] border-white/10">
                       <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                           <div>
                               <div className="flex items-center gap-2 mb-1">
                                   <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${log.type === 'RDV' ? 'bg-indigo-900 text-indigo-300' : 'bg-pink-900 text-pink-300'}`}>
                                       {log.type}
                                   </span>
                                   <span className="text-white font-semibold">
                                       {translateAction(log.action)}
                                   </span>
                                   <span className="text-gray-500 text-sm">
                                       par {log.profils ? `${log.profils.first_name} ${log.profils.last_name}` : 'Système'}
                                   </span>
                               </div>
                               <p className="text-gray-400 text-sm">
                                   {format(new Date(log.created_at), "d MMM yyyy à HH:mm", {locale: fr})}
                               </p>
                               {log.reason && (
                                   <p className="text-sm text-red-300 mt-1 italic">Raison: "{log.reason}"</p>
                               )}
                           </div>

                           {(log.old_date || log.new_date) && (
                               <div className="flex items-center gap-3 text-sm bg-black/20 p-2 rounded-lg">
                                   {log.old_date && (
                                       <span className="text-gray-400 line-through decoration-red-500">
                                           {format(new Date(log.old_date), "d MMM HH:mm")}
                                       </span>
                                   )}
                                   {log.old_date && log.new_date && <ArrowRight size={14} className="text-gray-600" />}
                                   {log.new_date && (
                                       <span className="text-emerald-400 font-medium">
                                           {format(new Date(log.new_date), "d MMM HH:mm")}
                                       </span>
                                   )}
                               </div>
                           )}
                       </CardContent>
                   </Card>
               ))
           )}
       </div>
    </div>
  );
};

export default HistoryLog;