import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, Heart, Plus, XCircle, RefreshCw, History, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrayerSessionsList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [formData, setFormData] = useState({
    date: '',
    time: '',
    topic: '',
    notes: '',
    reason: ''
  });

  useEffect(() => {
    if (user) fetchSessions();
  }, [user, filter]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('prayer_sessions')
        .select('*')
        .or(`disciple_id.eq.${user.id},mentor_id.eq.${user.id}`)
        .order('scheduled_date', { ascending: filter === 'upcoming' });

      if (filter === 'upcoming') {
        query = query.eq('status', 'scheduled').gte('scheduled_date', new Date().toISOString());
      } else if (filter === 'completed') {
        query = query.eq('status', 'completed');
      } else if (filter === 'cancelled') {
        query = query.eq('status', 'cancelled');
      }

      const { data, error } = await query;
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les sessions de prière." });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.date || !formData.time || !formData.topic) {
        toast({ variant: "destructive", title: "Erreur", description: "Tous les champs sont requis." });
        return;
    }
    
    try {
        const scheduledDate = new Date(`${formData.date}T${formData.time}`).toISOString();
        
        const { data, error } = await supabase.from('prayer_sessions').insert([{
            disciple_id: user.id,
            scheduled_date: scheduledDate,
            prayer_topic: formData.topic,
            notes: formData.notes,
            status: 'scheduled'
        }]).select().single();

        if (error) throw error;

        await supabase.from('prayer_history').insert([{
            prayer_id: data.id,
            action: 'created',
            new_date: scheduledDate,
            changed_by: user.id
        }]);

        toast({ title: "Succès", description: "Prière planifiée." });
        setIsCreateOpen(false);
        setFormData({ date: '', time: '', topic: '', notes: '', reason: '' });
        fetchSessions();
    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Erreur", description: "Échec de la planification." });
    }
  };

  const handleCancel = async () => {
      if (!formData.reason) {
          toast({ variant: "destructive", title: "Erreur", description: "Motif requis." });
          return;
      }

      try {
          const { error } = await supabase.from('prayer_sessions')
            .update({ status: 'cancelled', cancellation_reason: formData.reason })
            .eq('id', selectedItem.id);

          if (error) throw error;

          await supabase.from('prayer_history').insert([{
              prayer_id: selectedItem.id,
              action: 'cancelled',
              reason: formData.reason,
              changed_by: user.id,
              old_date: selectedItem.scheduled_date
          }]);

          toast({ title: "Annulé", description: "Session de prière annulée." });
          setIsCancelOpen(false);
          setFormData({ ...formData, reason: '' });
          fetchSessions();
      } catch (error) {
          console.error(error);
          toast({ variant: "destructive", title: "Erreur", description: "Échec de l'annulation." });
      }
  };

  const handleReschedule = async () => {
      if (!formData.date || !formData.time) {
          toast({ variant: "destructive", title: "Erreur", description: "Date/Heure requises." });
          return;
      }
      
      try {
          const newDate = new Date(`${formData.date}T${formData.time}`).toISOString();
          
          const { error } = await supabase.from('prayer_sessions')
            .update({ scheduled_date: newDate, status: 'scheduled' })
            .eq('id', selectedItem.id);

          if (error) throw error;

          await supabase.from('prayer_history').insert([{
              prayer_id: selectedItem.id,
              action: 'rescheduled',
              old_date: selectedItem.scheduled_date,
              new_date: newDate,
              reason: formData.reason,
              changed_by: user.id
          }]);

          toast({ title: "Déplacé", description: "Session reportée." });
          setIsRescheduleOpen(false);
          setFormData({ ...formData, date: '', time: '', reason: '' });
          fetchSessions();
      } catch (error) {
          console.error(error);
          toast({ variant: "destructive", title: "Erreur", description: "Échec du report." });
      }
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-white flex items-center gap-2">
               <Heart className="text-pink-500" /> Mes Prières
           </h1>
           <p className="text-gray-400">Temps de prière planifiés.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/history-log')} className="gap-2 text-gray-400 border-white/10 hover:text-white">
                <History size={16} /> Historique
            </Button>
            <Button onClick={() => setIsCreateOpen(true)} className="bg-pink-600 hover:bg-pink-700 text-white gap-2">
                <Plus size={18} /> Planifier une Prière
            </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
          {['upcoming', 'completed', 'cancelled'].map(f => (
              <Button 
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
                className={`capitalize ${filter === f ? 'bg-pink-600 border-pink-600' : 'border-white/10 text-gray-400'}`}
              >
                  {f === 'upcoming' ? 'À venir' : f === 'completed' ? 'Terminées' : 'Annulées'}
              </Button>
          ))}
      </div>

      <div className="grid gap-4">
          {loading ? (
              <div className="text-center py-10 text-gray-500">Chargement...</div>
          ) : sessions.length === 0 ? (
              <div className="text-center py-12 bg-[#1a0b2e] rounded-xl border border-white/10 border-dashed">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center">
                      <Heart className="w-8 h-8 text-pink-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-1">
                    Aucune session {filter === 'upcoming' ? 'à venir' : filter === 'completed' ? 'terminée' : 'annulée'}
                  </h3>
                  <p className="text-gray-400 text-sm mb-6">
                    {filter === 'upcoming' ? 'Planifiez une session de prière avec votre mentor.' : 'Les sessions apparaîtront ici.'}
                  </p>
                  {filter === 'upcoming' && (
                    <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10">
                      <Plus className="w-4 h-4 mr-2" />
                      Planifier une prière
                    </Button>
                  )}
              </div>
          ) : (
              sessions.map(sess => (
                  <Card key={sess.id} className="bg-[#1a0b2e] border-white/10 hover:border-white/20 transition-all">
                      <CardContent className="p-6 flex flex-col md:flex-row justify-between gap-6">
                          <div className="space-y-2">
                              <div className="flex items-center gap-2 text-pink-400 font-medium text-lg">
                                  {sess.prayer_topic}
                              </div>
                              <div className="flex items-center gap-4 text-gray-300">
                                  <div className="flex items-center gap-2">
                                     <Calendar size={16} />
                                     {format(new Date(sess.scheduled_date), "d MMM yyyy", { locale: fr })}
                                  </div>
                                  <div className="flex items-center gap-2">
                                     <Clock size={16} />
                                     {format(new Date(sess.scheduled_date), "HH:mm")}
                                  </div>
                              </div>
                              {sess.notes && <p className="text-sm text-gray-500">Note: {sess.notes}</p>}
                              {sess.status === 'cancelled' && (
                                  <div className="flex items-start gap-2 text-red-400 text-sm mt-2 bg-red-900/10 p-2 rounded">
                                      <Info size={16} className="shrink-0 mt-0.5" />
                                      <span>Motif: {sess.cancellation_reason}</span>
                                  </div>
                              )}
                          </div>
                          
                          {filter === 'upcoming' && (
                              <div className="flex flex-row md:flex-col gap-2 justify-end">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-orange-400 border-orange-500/20 hover:bg-orange-500/10"
                                    onClick={() => { setSelectedItem(sess); setIsRescheduleOpen(true); }}
                                  >
                                      <RefreshCw size={14} className="mr-2" /> Reporter
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-red-400 border-red-500/20 hover:bg-red-500/10"
                                    onClick={() => { setSelectedItem(sess); setIsCancelOpen(true); }}
                                  >
                                      <XCircle size={14} className="mr-2" /> Annuler
                                  </Button>
                              </div>
                          )}
                      </CardContent>
                  </Card>
              ))
          )}
      </div>

      {/* Create Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-[#1e1b4b] border-white/10 text-white">
            <DialogHeader>
                <DialogTitle>Planifier une Prière</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Sujet de Prière</label>
                    <Input value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} className="bg-black/20 border-white/10" placeholder="Ex: Guérison..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Date</label>
                        <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="bg-black/20 border-white/10" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Heure</label>
                        <Input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="bg-black/20 border-white/10" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Notes (Optionnel)</label>
                    <Textarea 
                        placeholder="Détails..." 
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        className="bg-black/20 border-white/10" 
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="border-white/10 text-gray-300">Annuler</Button>
                <Button onClick={handleCreate} className="bg-pink-600">Confirmer</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="bg-[#1e1b4b] border-white/10 text-white">
            <DialogHeader>
                <DialogTitle>Annuler la Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <p className="text-gray-300 text-sm">Confirmez-vous l'annulation ?</p>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Motif <span className="text-red-400">*</span></label>
                    <Textarea 
                        value={formData.reason}
                        onChange={e => setFormData({...formData, reason: e.target.value})}
                        className="bg-black/20 border-white/10" 
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsCancelOpen(false)} className="border-white/10 text-gray-300">Retour</Button>
                <Button onClick={handleCancel} variant="destructive">Confirmer</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className="bg-[#1e1b4b] border-white/10 text-white">
            <DialogHeader>
                <DialogTitle>Reporter la Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nouvelle Date</label>
                        <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="bg-black/20 border-white/10" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nouvelle Heure</label>
                        <Input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="bg-black/20 border-white/10" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Raison (Optionnel)</label>
                    <Textarea 
                        value={formData.reason}
                        onChange={e => setFormData({...formData, reason: e.target.value})}
                        className="bg-black/20 border-white/10" 
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsRescheduleOpen(false)} className="border-white/10 text-gray-300">Annuler</Button>
                <Button onClick={handleReschedule} className="bg-orange-600 hover:bg-orange-700">Confirmer</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrayerSessionsList;