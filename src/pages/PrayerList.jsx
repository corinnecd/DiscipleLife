import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckCircle2, Clock, Flame, Users, ChevronRight, CalendarDays, MessageSquare, Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { getAvatarColor, getInitials } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { getOrSetCache, clearCache } from '@/lib/CacheUtils';
import { handleError } from '@/lib/ErrorHandler';
import DashboardAlert from '@/components/DashboardAlert';
import { useNavigate } from 'react-router-dom';

const PrayerList = () => {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [newRequest, setNewRequest] = useState('');
  const [discipleName, setDiscipleName] = useState(''); 
  const [isUrgent, setIsUrgent] = useState(false);
  const [prayers, setPrayers] = useState([]);
  const [disciples, setDisciples] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reminder Logic
  const [isReminderEnabled, setIsReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');

  // Filter/Modal state
  const [selectedDisciple, setSelectedDisciple] = useState(null);
  const [modalNewRequest, setModalNewRequest] = useState('');

  useEffect(() => {
      if (user) {
          fetchPrayers();
          fetchDisciples();
      }
  }, [user, isAdmin]);

  const fetchDisciples = async () => {
    try {
        // OPTIMISATION: Utiliser le cache pour la liste des disciples (TTL: 2 minutes)
        const cacheKey = `prayer_disciples_${user.id}`;
        
        const data = await getOrSetCache(
          cacheKey,
          async () => {
            const { data, error } = await supabase
              .from('cercle_personnes')
              .select('id, name')
              .eq('user_id', user.id)
              .order('name');
            if (error) throw error;
            return data || [];
          },
          2 * 60 * 1000 // 2 minutes
        );
        
        setDisciples(data);
    } catch (error) {
        const { toast } = handleError(error, { context: 'fetchDisciples' });
        toast({ ...toast });
    }
  };

  const fetchPrayers = async () => {
    try {
        setLoading(true);
        
        // OPTIMISATION: Utiliser le cache pour les prières (TTL: 30 secondes - données plus dynamiques)
        const cacheKey = 'prayer_requests_all';
        
        const data = await getOrSetCache(
          cacheKey,
          async () => {
            const { data, error } = await supabase
              .from('prayer_requests')
              .select('*')
              .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
          },
          30 * 1000 // 30 secondes (données plus dynamiques)
        );
        
        setPrayers(data);
    } catch (error) {
        const { toast: errorToast } = handleError(error, { context: 'fetchPrayers' });
        toast({ ...errorToast });
    } finally {
        setLoading(false);
    }
  };

  const handleAdd = async (e, specificName = null, specificRequest = null) => {
    e && e.preventDefault();
    
    const requestText = specificRequest || newRequest;
    if (!requestText.trim()) return;
    
    const nameToUse = (specificName || discipleName).trim();
    
    if (!nameToUse && !specificName) {
        toast({ title: "Oups", description: "Veuillez sélectionner pour qui est cette prière.", variant: "destructive" });
        return;
    }

    // Schedule validation
    if (isReminderEnabled && (!reminderDate || !reminderTime)) {
        toast({ title: "Erreur", description: "Veuillez définir une date et une heure pour le rappel.", variant: "destructive" });
        return;
    }

    try {
        // 1. Create Prayer Request
        const { data: prayerData, error: prayerError } = await supabase.from('prayer_requests').insert([{
            user_id: user.id,
            request_text: requestText,
            disciple_name: nameToUse,
            is_urgent: isUrgent,
            is_answered: false
        }]).select().single();

        if (prayerError) throw prayerError;
        setPrayers([prayerData, ...prayers]);

        // 2. Create Calendar Event if reminder is enabled
        if (isReminderEnabled) {
            const dateTime = new Date(`${reminderDate}T${reminderTime}`).toISOString();
            const { error: eventError } = await supabase.from('calendar_events').insert([{
                user_id: user.id,
                disciple_name: nameToUse,
                event_type: 'prayer',
                event_date: dateTime,
                subject: 'Rappel de Prière: ' + requestText.substring(0, 30) + '...',
                notes: requestText,
                status: 'scheduled'
            }]);
            if (eventError) console.error("Event creation failed", eventError);
        }
        
        // Reset Form
        setNewRequest('');
        setDiscipleName('');
        setIsUrgent(false);
        setIsReminderEnabled(false);
        setReminderDate('');
        setReminderTime('');

        // Invalider le cache des prières pour recharger les données
        await clearCache('prayer_requests_all');
        
        // Recharger les prières
        await fetchPrayers();
        
        toast({
            title: "Requête ajoutée",
            description: isReminderEnabled 
                ? "Prière enregistrée et ajoutée à votre calendrier." 
                : "Votre requête de prière a été enregistrée."
        });

    } catch (error) {
        const { toast: errorToast } = handleError(error, { context: 'handleAdd' }, "Impossible d'ajouter la requête de prière. Veuillez réessayer.");
        toast({ ...errorToast });
    }
  };

  const toggleAnswered = async (id, currentStatus) => {
    try {
        const { error } = await supabase
            .from('prayer_requests')
            .update({ is_answered: !currentStatus })
            .eq('id', id);

        if (error) throw error;

        // Invalider le cache des prières
        await clearCache('prayer_requests_all');
        
        // Recharger les prières
        await fetchPrayers();

        if (!currentStatus) {
            toast({ title: "Gloire à Dieu !", description: "Requête marquée comme exaucée." });
        } else {
            toast({ title: "Mise à jour", description: "Requête remise en attente." });
        }

    } catch (error) {
        const { toast: errorToast } = handleError(error, { context: 'toggleAnswered' }, "Impossible de modifier le statut de la requête.");
        toast({ ...errorToast });
    }
  };

  const deletePrayer = async (id) => {
    try {
        const { error } = await supabase
            .from('prayer_requests')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Invalider le cache des prières
        await clearCache('prayer_requests_all');
        
        // Recharger les prières
        await fetchPrayers();
        
        toast({ description: "Requête de prière supprimée." });
    } catch (error) {
        const { toast: errorToast } = handleError(error, { context: 'deletePrayer' }, "Impossible de supprimer la requête de prière.");
        toast({ ...errorToast });
    }
  };

  const sortedPrayers = [...prayers]
    .filter(p => !p.is_answered) 
    .sort((a, b) => {
      if (a.is_urgent !== b.is_urgent) {
        return a.is_urgent ? -1 : 1;
      }
      return new Date(b.created_at) - new Date(a.created_at);
  });

  const activeCount = prayers.filter(p => !p.is_answered).length;
  const filteredDisciplePrayers = selectedDisciple ? prayers.filter(p => p.disciple_name === selectedDisciple) : [];

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-20 p-4 md:p-0 px-4 sm:px-6">
      
      {/* Header */}
      <div className="space-y-4">
        <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="text-purple-500" size={32} />
                Mur de Prières
            </h1>
            <p className="text-gray-600 text-base leading-relaxed">
                Portez les fardeaux les uns des autres.
            </p>
        </div>

        <DashboardAlert />

        <div className="grid grid-cols-2 gap-3">
             <Button 
                onClick={() => navigate('/prayer-reminder')} 
                className="bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300 gap-2 h-auto py-3 flex-col items-center justify-center text-xs sm:text-sm"
             >
                <CalendarDays size={20} />
                Planifier une prière
             </Button>
             <Button 
                onClick={() => navigate('/scheduler')} 
                className="bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300 gap-2 h-auto py-3 flex-col items-center justify-center text-xs sm:text-sm"
             >
                <MessageSquare size={20} />
                Planifier un entretien
             </Button>
        </div>
      </div>

      {/* Input Card */}
      <Card className="bg-white border-gray-200 shadow-sm p-4 space-y-4">
          <form onSubmit={handleAdd} className="space-y-4">
            
            <Select 
                value={discipleName} 
                onValueChange={setDiscipleName}
            >
                <SelectTrigger className="w-full bg-white border-gray-300 text-gray-900 h-12 text-base focus:ring-purple-500">
                    <SelectValue placeholder="Pour qui ?" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900">
                    <SelectItem value="Moi" className="focus:bg-gray-100 focus:!text-gray-900 cursor-pointer py-2">Moi</SelectItem>
                    <div className="h-px bg-gray-200 my-1" />
                    {disciples.map((d) => (
                        <SelectItem key={d.id} value={d.name} className="focus:bg-gray-100 focus:!text-gray-900 cursor-pointer py-2">
                            {d.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            
            <Textarea 
                value={newRequest}
                onChange={(e) => setNewRequest(e.target.value)}
                placeholder="Partagez un sujet de prière..." 
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 min-h-[100px] resize-none text-base focus-visible:ring-purple-500"
            />
            
            <div className="flex flex-col gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="reminder-toggle"
                        checked={isReminderEnabled}
                        onChange={(e) => setIsReminderEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor="reminder-toggle" className="text-sm text-gray-700 font-medium flex items-center gap-1 cursor-pointer select-none">
                        <Bell size={14} className="fill-current" /> Planifier un rappel
                    </label>
                </div>
                {isReminderEnabled && (
                    <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="grid grid-cols-2 gap-2">
                        <Input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} className="bg-white border-gray-300 text-gray-900" />
                        <Input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} className="bg-white border-gray-300 text-gray-900" />
                    </motion.div>
                )}
            </div>

            <Button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 text-base rounded-md transition-colors gap-2"
            >
                <Plus size={20} /> Ajouter un sujet de prière
            </Button>

            <div className="flex items-center gap-2">
                <input 
                    type="checkbox" 
                    id="urgent-toggle"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="urgent-toggle" className="text-sm text-gray-700 font-medium flex items-center gap-1 cursor-pointer select-none">
                    Requête urgente <Flame size={14} className="text-orange-500 fill-orange-500" />
                </label>
            </div>
          </form>
      </Card>

      {/* List Header */}
      <div className="flex items-center gap-3 pt-2">
         <h2 className="text-lg font-bold text-gray-900">Requêtes actives</h2>
         <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{activeCount}</span>
      </div>
        
      {/* Prayers List */}
      <div className="space-y-4">
        {loading ? (
             <div className="flex justify-center py-12">
                 <Loader2 className="animate-spin h-8 w-8 text-purple-600"></Loader2>
             </div>
        ) : sortedPrayers.length === 0 ? (
             <div className="text-center py-16 text-gray-600 text-lg font-medium">
                Aucune requête de prière pour le moment.
             </div>
        ) : (
            <AnimatePresence mode='popLayout'>
            {sortedPrayers.map((prayer) => {
              const isOwnerOrAdmin = isAdmin || (user?.id === prayer.user_id);
              
              return (
                <Card
                    key={prayer.id}
                    className={`p-5 rounded-xl border transition-all duration-200 relative overflow-hidden flex flex-col gap-3 group bg-white border-gray-200 hover:border-purple-300 hover:shadow-sm shadow-sm ${
                        prayer.is_urgent ? 'border-l-4 border-l-orange-500' : ''
                    }`}
                >
                    {/* Urgent Badge Strip */}
                    {prayer.is_urgent && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                    )}

                    {/* Main Content Row */}
                    <div className="flex items-start gap-4">
                        <button 
                            onClick={() => isOwnerOrAdmin && toggleAnswered(prayer.id, prayer.is_answered)}
                            disabled={!isOwnerOrAdmin}
                            className={`mt-1 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                isOwnerOrAdmin 
                                    ? 'border-gray-300 hover:border-green-500 hover:text-green-500 text-transparent' 
                                    : 'border-gray-300 cursor-default opacity-30'
                            }`}
                            title={isOwnerOrAdmin ? "Marquer comme exaucé" : "Lecture seule"}
                        >
                           <CheckCircle2 size={14} className="stroke-[3]" />
                        </button>
                        
                        <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-start justify-between gap-2 mb-1">
                                {prayer.is_urgent && (
                                    <div className="inline-flex items-center gap-1 shrink-0 bg-orange-500/10 px-2 py-0.5 rounded text-orange-600 text-[10px] font-bold border border-orange-500/20 uppercase tracking-wide mb-1">
                                        <Flame size={10} className="fill-orange-500" /> URGENT
                                    </div>
                                )}
                            </div>
                            
                            <p className="text-[15px] leading-relaxed font-medium text-gray-900">
                                {prayer.request_text}
                            </p>
                        </div>

                        {isOwnerOrAdmin && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="shrink-0 -mt-2 -mr-2 text-gray-600 hover:text-red-600 hover:bg-red-50 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => deletePrayer(prayer.id)}
                            >
                                <Trash2 size={16} />
                            </Button>
                        )}
                    </div>

                    {/* Bottom Meta Row: Date & Disciple Name */}
                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                            <Clock size={12} className="text-gray-500" />
                            <span className="text-xs text-gray-600 font-medium">
                                {new Date(prayer.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <div 
                                onClick={() => setSelectedDisciple(prayer.disciple_name)}
                                className={`flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-md border border-gray-200 cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition-all group/chip`}
                            >
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${getAvatarColor(prayer.disciple_name)}`}>
                                    {getInitials(prayer.disciple_name)}
                                </div>
                                <span className="text-xs font-medium text-gray-700 group-hover/chip:text-purple-600 transition-colors">{prayer.disciple_name}</span>
                                <ChevronRight size={10} className="opacity-0 group-hover/chip:opacity-100 -ml-1 text-gray-500" />
                            </div>
                        </div>
                    </div>

                </Card>
              )
            })}
            </AnimatePresence>
        )}
      </div>

      {/* Disciple Requests Modal - Shows History (Completed Included) */}
      <Dialog open={!!selectedDisciple} onOpenChange={(open) => !open && setSelectedDisciple(null)}>
         <DialogContent className="bg-[#1a0b2e] border border-white/10 text-white sm:max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0">
             {selectedDisciple && (
                 <>
                    <div className="p-5 border-b border-white/10 bg-[#150a25] flex items-center gap-3 sticky top-0 z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg ${getAvatarColor(selectedDisciple)}`}>
                            {getInitials(selectedDisciple)}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight text-white">{selectedDisciple}</h3>
                            <p className="text-xs text-gray-400 font-medium">Tous les sujets de prière</p>
                        </div>
                    </div>

                    <div className="p-5 space-y-5 bg-[#0f0518]">
                        <div className="flex gap-2">
                             <Input 
                                value={modalNewRequest}
                                onChange={(e) => setModalNewRequest(e.target.value)}
                                placeholder={`Prier pour ${selectedDisciple}...`}
                                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-pink-500/50"
                             />
                             <Button 
                                onClick={() => handleAdd(null, selectedDisciple, modalNewRequest)}
                                className="bg-pink-600 hover:bg-pink-700 text-white shrink-0"
                             >
                                <Plus size={18} />
                             </Button>
                        </div>
                    </div>
                 </>
             )}
         </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrayerList;