
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, Clock, User, Plus, Users, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AppointmentsList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState([]); // Mixed appointments and events
  const [loading, setLoading] = useState(true);

  // Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    time: '10:00',
    notes: '',
    discipleId: null, // If mentor creating for disciple
    type: 'individual' // individual vs group (not fully implemented in backend yet, defaulting to individual logic)
  });

  const [disciples, setDisciples] = useState([]);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchDisciples();
    }
  }, [user]);

  const fetchDisciples = async () => {
      // For mentors to select disciple
      const { data } = await supabase.from('profils').select('id, first_name, last_name').eq('mentor_id', user.id);
      setDisciples((data || []).map(p => ({ id: p.id, name: `${(p.first_name || '')} ${(p.last_name || '')}`.trim() || 'Sans nom' })));
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Appointments (Individual)
      const { data: appointmentsData, error: aptError } = await supabase
        .from('appointments')
        .select(`
            id, scheduled_date, notes, status, 
            disciple:disciple_id(first_name, last_name, name),
            mentor:mentor_id(first_name, last_name)
        `)
        .or(`disciple_id.eq.${user.id},mentor_id.eq.${user.id}`)
        .eq('status', 'scheduled')
        .gte('scheduled_date', new Date().toISOString());

      if (aptError) throw aptError;

      // 2. Fetch Events (Group/Other)
      const { data: eventsData, error: evtError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'scheduled')
        .gte('event_date', new Date().toISOString());

      if (evtError) throw evtError;

      // 3. Normalize & Merge
      const normalizedAppointments = (appointmentsData || []).map(a => ({
          id: a.id,
          type: 'individual',
          date: a.scheduled_date,
          title: a.disciple?.name || a.disciple?.first_name || 'Disciple',
          subtitle: a.notes || 'Entretien individuel',
          time: new Date(a.scheduled_date)
      }));

      const normalizedEvents = (eventsData || []).map(e => ({
          id: e.id,
          type: 'group',
          date: e.event_date,
          title: e.subject || 'Groupe',
          subtitle: e.notes || 'Rencontre de groupe',
          time: new Date(e.event_date)
      }));

      const merged = [...normalizedAppointments, ...normalizedEvents].sort((a, b) => a.time - b.time);
      setItems(merged);

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les rendez-vous." });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.date || !formData.time) {
        toast({ variant: "destructive", title: "Erreur", description: "Date et heure requises." });
        return;
    }
    
    try {
        const scheduledDate = new Date(`${formData.date}T${formData.time}`).toISOString();

        // Check if mentor creating for disciple
        if (formData.type === 'individual' && !formData.discipleId) {
             // If user is disciple, they might schedule with mentor. If mentor, need target.
             // Assuming mentor view for now based on prompt context.
        }

        const { error } = await supabase.from('appointments').insert([{
            mentor_id: user.id, // Assuming creator is mentor
            disciple_id: formData.discipleId || user.id, // Fallback to self if no selection (or handle logic better)
            scheduled_date: scheduledDate,
            notes: formData.notes,
            status: 'scheduled'
        }]);

        if (error) throw error;

        toast({ title: "Succès", description: "Rendez-vous planifié." });
        setIsCreateOpen(false);
        setFormData({ date: '', time: '10:00', notes: '', discipleId: null, type: 'individual' });
        fetchData();
    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Erreur", description: "Échec de la planification." });
    }
  };

  return (
    <div className="container max-w-md mx-auto p-4 space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Prochains Rendez-vous</h1>
        <Button size="sm" variant="ghost" className="text-indigo-400" onClick={() => setIsCreateOpen(true)}>
            <Plus size={20} />
        </Button>
      </div>

      <div className="space-y-4">
          {loading ? (
              <div className="text-center py-10 text-gray-500">Chargement...</div>
          ) : items.length === 0 ? (
              <div className="text-center py-10 bg-[#1a0b2e] rounded-xl border border-white/10 text-gray-500">
                  Aucun rendez-vous à venir.
              </div>
          ) : (
              items.map((item) => (
                  <Card key={`${item.type}-${item.id}`} className="bg-[#1a0b2e] border-white/10 overflow-hidden">
                      <div className="flex">
                          {/* Date Box */}
                          <div className="bg-[#241b35] w-20 flex flex-col items-center justify-center p-2 border-r border-white/5">
                              <span className="text-xs font-bold text-indigo-400 uppercase">
                                  {format(item.time, "MMM", { locale: fr })}
                              </span>
                              <span className="text-2xl font-bold text-white">
                                  {format(item.time, "dd")}
                              </span>
                          </div>
                          
                          {/* Content */}
                          <div className="p-4 flex-1 flex flex-col justify-center">
                              <h3 className="font-bold text-white text-lg leading-tight mb-1">{item.title}</h3>
                              <div className="flex items-center text-sm text-gray-400 gap-2">
                                  <span>{format(item.time, "HH:mm")}</span>
                                  <span>•</span>
                                  <span className="truncate max-w-[150px]">{item.subtitle}</span>
                              </div>
                              {item.type === 'group' && (
                                  <div className="mt-1 inline-flex items-center text-[10px] bg-indigo-900/30 text-indigo-300 px-1.5 py-0.5 rounded w-fit">
                                      <Users size={10} className="mr-1" /> Groupe
                                  </div>
                              )}
                          </div>
                      </div>
                  </Card>
              ))
          )}
      </div>

      <Button onClick={() => setIsCreateOpen(true)} className="w-full bg-[#1a0b2e] border border-dashed border-white/20 text-gray-400 hover:text-white hover:bg-[#251240] h-12">
          <Plus size={16} className="mr-2" /> Planifier un RDV
      </Button>

      {/* Simplified Create Modal for Demo */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-[#1e1b4b] border-white/10 text-white">
            <DialogHeader>
                <DialogTitle>Planifier un nouvel entretien</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Mes Disciples *</label>
                    <Select onValueChange={(v) => setFormData({...formData, discipleId: v})}>
                        <SelectTrigger className="bg-black/20 border-white/10">
                            <SelectValue placeholder="Nom du disciple ou du groupe" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e1b4b] border-white/10 text-white">
                            {disciples.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Date *</label>
                        <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="bg-black/20 border-white/10" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Heure *</label>
                        <Input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="bg-black/20 border-white/10" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Notes / Compte-rendu</label>
                    <Textarea 
                        placeholder="Résumé de l'échange..." 
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        className="bg-black/20 border-white/10 h-24" 
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-gray-400">Annuler</Button>
                <Button onClick={handleCreate} className="bg-indigo-600">Enregistrer</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentsList;
