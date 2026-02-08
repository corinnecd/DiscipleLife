import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Search,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  MessageSquare,
  Edit2,
  Trash2,
  CalendarDays,
  Calendar,
  ChevronDown,
  Filter,
  History
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format, isSameMonth, subMonths, isFuture } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_CONFIG = {
  'scheduled': { label: 'Prévu', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', badge: 'bg-blue-500/20 text-blue-300' },
  'held': { label: 'A eu lieu', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', badge: 'bg-emerald-500/20 text-emerald-300' },
  'postponed': { label: 'Reporté', icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', badge: 'bg-orange-500/20 text-orange-300' },
  'cancelled': { label: 'Annulé', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', badge: 'bg-red-500/20 text-red-300' }
};

const InterviewsList = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Main Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  
  // Quick Action Modal State
  const [actionDialog, setActionDialog] = useState({ isOpen: false, type: null, event: null });

  const [formData, setFormData] = useState({
    disciple_name: '',
    date: '',
    time: '',
    subject: '',
    status: 'scheduled',
    notes: '', 
    postponed_date: '',
    outcome_notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user, isAdmin]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('calendar_events')
        .select('*')
        .order('event_date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les entretiens." });
    } finally {
      setLoading(false);
    }
  };

  // Main Modal Handler
  const handleOpenModal = (event = null) => {
    if (event) {
      setEditingEvent(event);
      const dateObj = new Date(event.event_date);
      const postponedObj = event.postponed_date ? new Date(event.postponed_date) : null;

      setFormData({
        disciple_name: event.disciple_name || '',
        date: dateObj.toISOString().split('T')[0],
        time: dateObj.toTimeString().slice(0, 5),
        subject: event.subject || '',
        status: event.status || 'scheduled',
        notes: event.notes || '',
        postponed_date: postponedObj ? postponedObj.toISOString().split('T')[0] : '',
        outcome_notes: event.outcome_notes || ''
      });
    } else {
      setEditingEvent(null);
      setFormData({
        disciple_name: '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        subject: '',
        status: 'scheduled',
        notes: '',
        postponed_date: '',
        outcome_notes: ''
      });
    }
    setIsModalOpen(true);
  };

  // Quick Action Handler
  const openActionDialog = (event, type) => {
    const dateObj = new Date();
    // Pre-fill data for the quick action modal
    setFormData(prev => ({
        ...prev,
        // For reschedule, default to tomorrow same time if needed, or just blank
        postponed_date: type === 'reschedule' ? format(dateObj, 'yyyy-MM-dd') : '',
        time: type === 'reschedule' ? format(dateObj, 'HH:mm') : '',
        outcome_notes: ''
    }));
    setActionDialog({ isOpen: true, type, event });
  };

  const handleQuickActionSubmit = async () => {
    const { type, event } = actionDialog;
    if (!event) return;

    try {
        let payload = {};
        if (type === 'reschedule') {
            if (!formData.postponed_date || !formData.time) {
                toast({ variant: "destructive", title: "Erreur", description: "Date et heure requises." });
                return;
            }
            const dateTime = new Date(`${formData.postponed_date}T${formData.time}`);
            payload = {
                status: 'postponed',
                postponed_date: dateTime.toISOString()
            };
        } else if (type === 'cancel') {
            payload = {
                status: 'cancelled',
                outcome_notes: formData.outcome_notes
            };
        }

        const { data, error } = await supabase
            .from('calendar_events')
            .update(payload)
            .eq('id', event.id)
            .select()
            .single();

        if (error) throw error;
        
        setEvents(events.map(e => e.id === event.id ? data : e));
        toast({ title: "Succès", description: type === 'reschedule' ? "Rendez-vous reporté." : "Rendez-vous annulé." });
        setActionDialog({ isOpen: false, type: null, event: null });
    } catch (e) {
        console.error(e);
        toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue." });
    }
  };

  const handleSubmit = async () => {
    if (!formData.disciple_name || !formData.date || !formData.time || !formData.subject) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez remplir les champs obligatoires." });
      return;
    }

    try {
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      
      let postponedIso = null;
      if ((formData.status === 'postponed' || formData.status === 'cancelled') && formData.postponed_date) {
         postponedIso = new Date(`${formData.postponed_date}T${formData.time}`).toISOString();
      }

      const payload = {
        user_id: user.id,
        disciple_name: formData.disciple_name,
        event_date: dateTime.toISOString(),
        subject: formData.subject,
        event_type: 'Suivi',
        status: formData.status,
        notes: formData.notes,
        outcome_notes: formData.outcome_notes,
        postponed_date: postponedIso
      };

      if (editingEvent) {
        const { data, error } = await supabase
          .from('calendar_events')
          .update(payload)
          .eq('id', editingEvent.id)
          .select()
          .single();

        if (error) throw error;
        setEvents(events.map(e => e.id === editingEvent.id ? data : e));
        toast({ title: "Succès", description: "Entretien mis à jour." });
      } else {
        const { data, error } = await supabase
          .from('calendar_events')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        setEvents([data, ...events]);
        toast({ title: "Succès", description: "Entretien créé." });
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving event:', error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer." });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet entretien ?")) return;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEvents(events.filter(e => e.id !== id));
      toast({ title: "Supprimé", description: "L'entretien a été supprimé." });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({ variant: "destructive", title: "Erreur", description: "Suppression impossible." });
    }
  };

  // Filter Logic
  const filteredEvents = events.filter(event => {
    const matchesSearch = (event.disciple_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (event.subject || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    
    let matchesDate = true;
    
    // Use postponed date as effective date if available and postponed
    const effectiveDateStr = (event.status === 'postponed' && event.postponed_date) 
        ? event.postponed_date 
        : event.event_date;
        
    const eventDate = new Date(effectiveDateStr);
    const now = new Date();
    
    if (dateFilter === 'this_month') {
        matchesDate = isSameMonth(eventDate, now);
    } else if (dateFilter === 'last_month') {
        matchesDate = isSameMonth(eventDate, subMonths(now, 1));
    } else if (dateFilter === 'upcoming') {
        matchesDate = isFuture(eventDate);
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getDateFilterLabel = () => {
      switch(dateFilter) {
          case 'this_month': return 'Ce mois';
          case 'last_month': return 'Mois dernier';
          case 'upcoming': return 'À venir';
          default: return 'Toutes les dates';
      }
  };

  const getStatusFilterLabel = () => {
    if (statusFilter === 'all') return 'Tous les statuts';
    return STATUS_CONFIG[statusFilter]?.label || 'Tous les statuts';
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-6 pb-20 p-3 md:p-0 pt-16 md:pt-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Edit2 className="text-indigo-500" size={24} />
            Mes Disciples
          </h1>
          <p className="text-sm md:text-base text-gray-400 mt-1">
            Suivi des entretiens et rendez-vous pastoraux.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="mt-4 md:mt-0 bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-500/20 px-4 py-2 text-sm md:text-base w-full md:w-auto">
          <Plus size={18} /> Nouveau
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#1e1233] p-3 md:p-4 rounded-xl border border-white/5 space-y-3 md:space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 md:top-3 text-gray-400" size={16} />
          <Input 
            placeholder="Rechercher..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-[#2b1b40] border-white/10 text-white h-9 md:h-11 focus-visible:ring-indigo-500/50 text-xs md:text-base placeholder:text-gray-400"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex-grow-0 flex-shrink-0 px-2 py-1 md:px-4 md:py-2.5 rounded-lg text-[10px] md:text-sm font-bold transition-colors whitespace-nowrap bg-white text-black flex items-center gap-1.5 hover:bg-gray-100">
                        {getDateFilterLabel()} <ChevronDown size={10} />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-[#1a0b2e] border-white/10 text-white w-48 text-base">
                    <DropdownMenuItem onClick={() => setDateFilter('all')} className="focus:bg-white/10 cursor-pointer">Toutes les dates</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('this_month')} className="focus:bg-white/10 cursor-pointer">Ce mois</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('last_month')} className="focus:bg-white/10 cursor-pointer">Mois dernier</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('upcoming')} className="focus:bg-white/10 cursor-pointer">À venir</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex-grow-0 flex-shrink-0 px-2 py-1 md:px-4 md:py-2.5 rounded-lg text-[10px] md:text-sm font-bold transition-colors whitespace-nowrap bg-[#2b1b40] text-white border border-white/10 flex items-center gap-1.5 hover:bg-[#352250]">
                        <Filter size={10} className="text-gray-400" />
                        {getStatusFilterLabel()} 
                        <ChevronDown size={10} />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-[#1a0b2e] border-white/10 text-white w-56 text-base">
                    <DropdownMenuItem onClick={() => setStatusFilter('all')} className="focus:bg-white/10 cursor-pointer">
                       Tous les statuts
                    </DropdownMenuItem>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)} className="focus:bg-white/10 cursor-pointer flex items-center gap-2">
                           <config.icon size={14} className={config.color.split(' ')[0]} />
                           {config.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="flex justify-center py-12">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-gray-200 border-dashed bg-gray-50/50">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
              <CalendarDays className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun entretien trouvé</h3>
          <p className="text-gray-500 text-sm">Les entretiens planifiés apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          <AnimatePresence mode='popLayout'>
            {filteredEvents.map((event) => {
              const status = STATUS_CONFIG[event.status] || STATUS_CONFIG['scheduled'];
              const dateObj = new Date(event.event_date);
              
              // Only show action buttons for scheduled or postponed events
              const showActions = event.status === 'scheduled' || event.status === 'postponed';

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <Card className="bg-[#241738] border-white/5 hover:border-white/10 transition-all group relative overflow-hidden shadow-lg shadow-black/20">
                    <CardContent className="p-3 md:p-5">
                      
                      {/* Top Section: Date + Header + Menu */}
                      <div className="flex items-start gap-3 md:gap-5 relative">
                        {/* Compact Date Box */}
                        <div className="shrink-0 flex flex-col items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-xl bg-[#2b1b40] border border-white/5 text-center shadow-inner">
                            <span className="text-[10px] md:text-xs font-bold uppercase text-indigo-400 leading-none mb-0.5">
                                {format(dateObj, 'MMM', { locale: fr })}
                            </span>
                            <span className="text-lg md:text-xl font-bold text-white leading-none">
                                {format(dateObj, 'dd')}
                            </span>
                        </div>

                        {/* Header Info */}
                        <div className="flex-1 min-w-0 pr-8 md:pr-0 pt-0.5">
                             <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                 <h3 className="text-base md:text-lg font-bold text-white flex flex-row items-center justify-center md:justify-start gap-1.5 md:gap-3 flex-wrap">
                                    {event.disciple_name}
                                    <span className={cn("text-[10px] md:text-xs px-1.5 py-0.5 md:px-2.5 md:py-1 rounded-md uppercase tracking-wider font-bold flex items-center gap-1 shrink-0", status.badge)}>
                                        {event.status === 'held' ? <CheckCircle2 size={10} className="stroke-[3]" /> : <status.icon size={10} />}
                                        {status.label}
                                    </span>
                                 </h3>
                                 {/* "suivi" text with adjusted top margin on mobile */}
                                 <p className="text-xs md:text-base text-indigo-300/80 font-medium truncate mt-2 md:mt-1">{event.subject}</p>
                             </div>
                        </div>

                        {/* Menu */}
                        <div className="absolute right-0 top-0 md:relative md:top-auto md:right-auto -mr-2 -mt-1 md:mr-0 md:mt-0">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 md:h-8 md:w-8 text-gray-500 hover:text-white" aria-label="Plus d'options">
                                        <MoreVertical size={16} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#1a0b2e] border-white/10 text-white text-base">
                                    <DropdownMenuItem onClick={() => handleOpenModal(event)} className="focus:bg-white/10 cursor-pointer">
                                        <Edit2 size={16} className="mr-2" /> Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(event.id)} className="text-red-400 hover:bg-red-400/10 cursor-pointer">
                                        <Trash2 size={16} className="mr-2" /> Supprimer
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                      </div>

                      {/* Bottom Section: Time, Notes, Buttons - Full width mobile, indented desktop */}
                      {/* For mobile, flex-col and items-center will center the content */}
                      <div className="mt-3 md:mt-1 md:pl-[5.25rem] flex flex-col items-center md:items-start w-full">
                             
                             {/* Time and Year */}
                             <div className="flex items-center justify-center md:justify-start gap-3 md:gap-4 text-xs md:text-sm text-gray-500 font-medium w-full">
                                 <div className="flex items-center gap-1 text-gray-400">
                                    <Clock size={12} className="text-indigo-400" />
                                    {format(dateObj, 'HH:mm')}
                                 </div>
                                 <div className="w-1 h-1 rounded-full bg-gray-600" />
                                 <span className="text-gray-400">{format(dateObj, 'yyyy')}</span>
                             </div>

                             {/* Notes */}
                             {(event.outcome_notes || event.notes) && (
                                <div className="mt-3 md:mt-4 bg-[#2b1b40]/50 rounded-lg p-2 md:p-3 border border-white/5 flex items-center justify-center md:justify-start gap-2 md:gap-3 w-full max-w-[95%] md:max-w-none">
                                    <MessageSquare size={14} className="text-indigo-400/60 shrink-0" />
                                    <p className="text-[10px] md:text-sm text-gray-300 italic leading-relaxed line-clamp-1 md:line-clamp-2 text-center md:text-left">
                                        "{event.outcome_notes || event.notes}"
                                    </p>
                                </div>
                             )}

                             {/* Postponed Badge */}
                             {event.status === 'postponed' && event.postponed_date && (
                                 <div className="mt-2 md:mt-3 text-xs md:text-sm text-orange-400 bg-orange-500/5 px-2 py-1.5 md:px-3 md:py-2 rounded-lg border border-orange-500/10 flex items-center justify-center md:justify-start gap-1.5 w-full md:w-fit">
                                     <AlertCircle size={12} />
                                     <span className="whitespace-nowrap">Nouveau : <span className="font-semibold">{format(new Date(event.postponed_date), 'dd MMM à HH:mm', { locale: fr })}</span></span>
                                 </div>
                             )}

                             {/* Actions */}
                             {showActions && (
                                <div className="flex justify-center md:justify-start gap-2 md:gap-3 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-white/5 w-full">
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="flex-1 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 h-6 text-[10px] px-1 md:h-9 md:text-sm md:px-4"
                                        onClick={() => openActionDialog(event, 'reschedule')}
                                    >
                                        <History size={10} className="mr-1 md:mr-2 md:w-4 md:h-4" /> Reporter le RDV
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="flex-1 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 h-6 text-[10px] px-1 md:h-9 md:text-sm md:px-4"
                                        onClick={() => openActionDialog(event, 'cancel')}
                                    >
                                        <XCircle size={10} className="mr-1 md:mr-2 md:w-4 md:h-4" /> Annuler le RDV
                                    </Button>
                                </div>
                             )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#1a0b2e] border border-white/10 text-white sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingEvent ? 'Modifier l\'entretien' : 'Planifier un nouvel entretien'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
             <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Mes Disciples *</label>
                <Input 
                   placeholder="Nom du disciple ou du groupe"
                   value={formData.disciple_name}
                   onChange={(e) => setFormData({...formData, disciple_name: e.target.value})}
                   className="bg-gray-100 text-gray-800 border-gray-300 text-base py-6 placeholder:text-gray-500"
                />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-sm font-medium text-gray-400">Date *</label>
                   <Input 
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="bg-gray-100 text-gray-800 border-gray-300 text-base py-6 placeholder:text-gray-500"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-sm font-medium text-gray-400">Heure *</label>
                   <Input 
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                      className="bg-gray-100 text-gray-800 border-gray-300 text-base py-6 placeholder:text-gray-500"
                   />
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Sujet / Objectif *</label>
                <Input 
                   placeholder="Ex: Point sur la lecture biblique..."
                   value={formData.subject}
                   onChange={(e) => setFormData({...formData, subject: e.target.value})}
                   className="bg-gray-100 text-gray-800 border-gray-300 text-base py-6 placeholder:text-gray-500"
                />
             </div>

             <div className="w-full h-px bg-white/5 my-2" />

             <div className="space-y-4">
                <label className="text-sm font-medium text-gray-400">Statut de l'entretien</label>
                <Select 
                    value={formData.status} 
                    onValueChange={(val) => setFormData({...formData, status: val})}
                >
                    <SelectTrigger className="w-full bg-gray-100 text-gray-800 border-gray-300 text-base py-6">
                        <SelectValue placeholder="Sélectionner le statut" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a0b2e] border-white/10 text-white text-base">
                        <SelectItem value="scheduled">Prévu</SelectItem>
                        <SelectItem value="held">A eu lieu</SelectItem>
                        <SelectItem value="postponed">Reporté</SelectItem>
                        <SelectItem value="cancelled">Annulé</SelectItem>
                    </SelectContent>
                </Select>

                <AnimatePresence>
                    {(formData.status === 'postponed' || formData.status === 'cancelled') && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }} 
                            animate={{ height: 'auto', opacity: 1 }} 
                            className={cn(
                                "space-y-2 p-4 rounded-lg border",
                                formData.status === 'postponed' 
                                    ? "bg-orange-500/5 border-orange-500/20" 
                                    : "bg-red-500/5 border-red-500/20"
                            )}
                        >
                            <label className={cn(
                                "text-sm font-bold flex items-center gap-2",
                                formData.status === 'postponed' ? "text-orange-400" : "text-red-400"
                            )}>
                                <Calendar size={16} /> 
                                {formData.status === 'postponed' ? "Nouvelle date (Report)" : "Prochain rendez-vous (optionnel)"}
                            </label>
                            <Input 
                                type="date"
                                value={formData.postponed_date}
                                onChange={(e) => setFormData({...formData, postponed_date: e.target.value})}
                                className="bg-gray-100 text-gray-800 border-gray-300 text-base py-6 placeholder:text-gray-500"
                            />
                        </motion.div>
                    )}

                    {formData.status === 'cancelled' && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }} 
                            animate={{ height: 'auto', opacity: 1 }} 
                            className="space-y-2 bg-red-500/5 p-3 rounded-lg border border-red-500/20"
                        >
                            <label className="text-sm font-bold text-red-400 flex items-center gap-2">
                                <MessageSquare size={14} /> Motif de l'annulation
                            </label>
                            <Textarea 
                                placeholder="Pourquoi l'entretien est-il annulé ?"
                                value={formData.outcome_notes}
                                onChange={(e) => setFormData({...formData, outcome_notes: e.target.value})}
                                className="bg-gray-100 text-gray-800 border-gray-300 min-h-[80px] text-base placeholder:text-gray-500"
                            />
                        </motion.div>
                    )}
                     
                    {(formData.status === 'held' || formData.status === 'scheduled') && (
                         <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Notes / Compte-rendu</label>
                            <Textarea 
                                placeholder="Résumé de l'échange..."
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                className="bg-gray-100 text-gray-800 border-gray-300 min-h-[120px] text-base placeholder:text-gray-500"
                            />
                         </div>
                    )}
                </AnimatePresence>
             </div>
          </div>

          <DialogFooter>
             <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white text-base">Annuler</Button>
             <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 px-6 py-2 text-base">
                {editingEvent ? 'Mettre à jour' : 'Enregistrer'}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Action Modal */}
      <Dialog open={actionDialog.isOpen} onOpenChange={(open) => !open && setActionDialog({ ...actionDialog, isOpen: false })}>
        <DialogContent className="bg-[#1a0b2e] border border-white/10 text-white sm:max-w-md">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    {actionDialog.type === 'reschedule' ? (
                        <><History className="text-orange-400" /> Reporter le rendez-vous</>
                    ) : (
                        <><XCircle className="text-red-400" /> Annuler le rendez-vous</>
                    )}
                </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
                {actionDialog.type === 'reschedule' ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Nouvelle date</label>
                            <Input 
                                type="date" 
                                value={formData.postponed_date} 
                                onChange={e => setFormData({...formData, postponed_date: e.target.value})}
                                className="bg-gray-100 text-gray-800 border-gray-300 py-6 placeholder:text-gray-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Nouvelle heure</label>
                            <Input 
                                type="time" 
                                value={formData.time} 
                                onChange={e => setFormData({...formData, time: e.target.value})}
                                className="bg-gray-100 text-gray-800 border-gray-300 py-6 placeholder:text-gray-500"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Motif de l'annulation (optionnel)</label>
                        <Textarea 
                            placeholder="Ex: Empêchement de dernière minute..."
                            value={formData.outcome_notes}
                            onChange={e => setFormData({...formData, outcome_notes: e.target.value})}
                            className="bg-gray-100 text-gray-800 border-gray-300 min-h-[100px] placeholder:text-gray-500"
                        />
                    </div>
                )}
            </div>

            <DialogFooter>
                 <Button variant="ghost" onClick={() => setActionDialog({ ...actionDialog, isOpen: false })} className="text-gray-400">Annuler</Button>
                 <Button 
                    onClick={handleQuickActionSubmit} 
                    className={actionDialog.type === 'reschedule' ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
                >
                    Confirmer
                 </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </div>
  );
};

export default InterviewsList;