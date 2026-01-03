import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Check, Users, User, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';

const DAYS = [
  { id: 'sunday', label: 'Dimanche', val: 0 },
  { id: 'monday', label: 'Lundi', val: 1 },
  { id: 'tuesday', label: 'Mardi', val: 2 },
  { id: 'wednesday', label: 'Mercredi', val: 3 },
  { id: 'thursday', label: 'Jeudi', val: 4 },
  { id: 'friday', label: 'Vendredi', val: 5 },
  { id: 'saturday', label: 'Samedi', val: 6 },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

const MeetingScheduler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isEnabled, setIsEnabled] = useState(true);
  const [selectedDays, setSelectedDays] = useState(['saturday']);
  const [selectedHour, setSelectedHour] = useState('14');
  const [selectedMinute, setSelectedMinute] = useState('00');
  
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false);
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  
  const [meetingType, setMeetingType] = useState('individual');
  const [disciples, setDisciples] = useState([]);
  const [selectedDiscipleId, setSelectedDiscipleId] = useState('');
  const [groupName, setGroupName] = useState('');
  
  const [subject, setSubject] = useState('');
  const [comment, setComment] = useState('');
  
  const [tempSelectedDays, setTempSelectedDays] = useState([]);
  const [tempHour, setTempHour] = useState('14');
  const [tempMinute, setTempMinute] = useState('00');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDisciples();
    }
  }, [user]);

  const fetchDisciples = async () => {
    try {
      const { data, error } = await supabase
        .from('cercle_personnes')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      setDisciples(data || []);
    } catch (error) {
      console.error("Error fetching disciples:", error);
    }
  };

  const openDayDialog = () => {
    setTempSelectedDays([...selectedDays]);
    setIsDayDialogOpen(true);
  };

  const saveDayDialog = () => {
    setSelectedDays(tempSelectedDays);
    setIsDayDialogOpen(false);
  };

  const toggleDay = (dayId) => {
    if (tempSelectedDays.includes(dayId)) {
      setTempSelectedDays(tempSelectedDays.filter(d => d !== dayId));
    } else {
      setTempSelectedDays([...tempSelectedDays, dayId]);
    }
  };

  const openTimeDialog = () => {
    setTempHour(selectedHour);
    setTempMinute(selectedMinute);
    setIsTimeDialogOpen(true);
  };

  const saveTimeDialog = () => {
    setSelectedHour(tempHour);
    setSelectedMinute(tempMinute);
    setIsTimeDialogOpen(false);
  };

  const getDayLabel = () => {
    if (selectedDays.length === 0) return 'Jamais';
    if (selectedDays.length === 7) return 'Tous les jours';
    if (selectedDays.length <= 2) {
      return selectedDays.map(d => DAYS.find(day => day.id === d)?.label).join(', ');
    }
    return `${selectedDays.length} jours sélectionnés`;
  };

  const handleDiscipleSelect = (value) => {
      if (value === "add_new") {
          navigate('/circles');
          toast({
              title: "Redirection",
              description: "Ajoutez un nouveau disciple dans la section Mes Cercles."
          });
      } else {
          setSelectedDiscipleId(value);
      }
  };

  const calculateNextEventDate = () => {
    if (selectedDays.length === 0) return null;
    
    // Convert selected day IDs to 0-6 values
    const targetDayIndices = selectedDays.map(id => DAYS.find(d => d.id === id)?.val).filter(v => v !== undefined);
    
    const now = new Date();
    // Check up to 8 days ahead
    for (let i = 0; i < 8; i++) {
        const checkDate = new Date(now);
        checkDate.setDate(now.getDate() + i);
        checkDate.setHours(parseInt(selectedHour), parseInt(selectedMinute), 0, 0);
        
        // If it's today but time has passed, skip
        if (i === 0 && checkDate <= now) continue;

        if (targetDayIndices.includes(checkDate.getDay())) {
            return checkDate.toISOString();
        }
    }
    return null;
  };

  const handleSave = async () => {
    const targetName = meetingType === 'individual' 
        ? disciples.find(d => d.id === selectedDiscipleId)?.name || "un disciple"
        : groupName || "votre groupe";

    const nextDate = calculateNextEventDate();

    if (!nextDate) {
        toast({ title: "Erreur", description: "Veuillez sélectionner au moins un jour futur.", variant: "destructive" });
        return;
    }
    
    setIsSaving(true);
    try {
        const { error } = await supabase.from('calendar_events').insert([{
            user_id: user.id,
            disciple_id: meetingType === 'individual' ? selectedDiscipleId : null,
            disciple_name: targetName,
            event_type: 'meeting',
            event_date: nextDate,
            subject: subject || 'Échange',
            notes: comment
        }]);

        if (error) throw error;

        toast({
          title: "Échange planifié !",
          description: `Rencontre avec ${targetName} pour "${subject || 'Discussion'}" enregistrée.`,
          className: "bg-emerald-900 border-emerald-800 text-white"
        });
        navigate(-1);
    } catch (error) {
        console.error("Error saving meeting", error);
        toast({ title: "Erreur", description: "Impossible d'enregistrer l'échange.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#022c22] text-white p-4 flex flex-col items-center pt-8">
      <div className="w-full max-w-md space-y-8 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="text-emerald-400 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft size={24} />
          </Button>
          <h1 className="text-xl font-semibold text-emerald-200">Planifier un Échange</h1>
          <div className="w-10" /> 
        </div>

        {/* Main Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#064e3b] border border-emerald-500/20 rounded-3xl overflow-hidden shadow-2xl relative"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                 <CalendarDays size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Nouvelle Rencontre</h2>
                <p className="text-xs text-emerald-200/60">Organisez vos moments de partage</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Type Selection */}
              <div className="bg-[#065f46] rounded-xl p-1 flex gap-1">
                 <button
                    onClick={() => setMeetingType('individual')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                        meetingType === 'individual' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-900/50" : "text-emerald-200 hover:text-white"
                    )}
                 >
                    <User size={16} /> Individuel
                 </button>
                 <button
                    onClick={() => setMeetingType('group')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                        meetingType === 'group' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-900/50" : "text-emerald-200 hover:text-white"
                    )}
                 >
                    <Users size={16} /> Groupe
                 </button>
              </div>

              {/* Dynamic Input based on Type */}
              <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-emerald-300/70 ml-1">
                      {meetingType === 'individual' ? 'Avec qui ?' : 'Nom du groupe'}
                  </label>
                  
                  {meetingType === 'individual' ? (
                      <Select value={selectedDiscipleId} onValueChange={handleDiscipleSelect}>
                        <SelectTrigger className="w-full h-12 bg-emerald-900/50 border-emerald-500/30 text-white rounded-xl focus:ring-emerald-500/50">
                            <SelectValue placeholder="Sélectionner un disciple" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#064e3b] border-emerald-500/30 text-white">
                            {disciples.map((disciple) => (
                                <SelectItem key={disciple.id} value={disciple.id} className="focus:bg-emerald-600 focus:text-white cursor-pointer py-3">
                                    {disciple.name}
                                </SelectItem>
                            ))}
                            <div className="h-px bg-white/10 my-1" />
                            <SelectItem value="add_new" className="text-emerald-300 font-medium focus:bg-emerald-600/20 focus:text-emerald-200 cursor-pointer py-3">
                                + Ajouter un nouveau
                            </SelectItem>
                        </SelectContent>
                      </Select>
                  ) : (
                      <Input 
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Ex: Groupe Étude Biblique..." 
                        className="h-12 bg-emerald-900/50 border-emerald-500/30 text-white rounded-xl placeholder:text-emerald-400/50 focus-visible:ring-emerald-500/50"
                      />
                  )}
              </div>

              {/* Subject Field */}
              <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-emerald-300/70 ml-1">
                      Sujet de l'Échange
                  </label>
                  <Input 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Suivi lecture, Encouragement, Question..." 
                    className="h-12 bg-emerald-900/50 border-emerald-500/30 text-white rounded-xl placeholder:text-emerald-400/50 focus-visible:ring-emerald-500/50"
                  />
              </div>

              {/* Comment Field */}
              <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-emerald-300/70 ml-1">
                      Notes & Préparation
                  </label>
                  <Textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Points à aborder, questions à poser..." 
                    className="min-h-[100px] bg-emerald-900/50 border-emerald-500/30 text-white rounded-xl placeholder:text-emerald-400/50 focus-visible:ring-emerald-500/50 resize-none"
                  />
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent w-full my-4" />

              {/* Toggle Row */}
              <div className="flex items-center justify-between py-2">
                <span className="text-base font-medium text-emerald-100">Définir un rappel</span>
                <div 
                  className={cn(
                    "w-12 h-7 rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out",
                    isEnabled ? "bg-emerald-500" : "bg-emerald-900"
                  )}
                  onClick={() => setIsEnabled(!isEnabled)}
                >
                  <motion.div 
                    className="bg-white w-5 h-5 rounded-full shadow-md"
                    layout
                    transition={{ type: "spring", stiffness: 700, damping: 30 }}
                    style={{ 
                      x: isEnabled ? 20 : 0 
                    }}
                  />
                </div>
              </div>

              {/* Frequency Row */}
              <div 
                onClick={isEnabled ? openDayDialog : undefined}
                className={cn(
                  "flex items-center justify-between py-3 px-3 rounded-lg border border-transparent transition-all",
                  isEnabled ? "hover:bg-emerald-500/10 hover:border-emerald-500/20 cursor-pointer" : "opacity-50"
                )}
              >
                <span className="text-base text-emerald-100">Date / Récurrence</span>
                <div className="flex items-center gap-2 text-emerald-300">
                  <span className="text-right truncate max-w-[150px] text-sm">{getDayLabel()}</span>
                  <ChevronRight size={18} />
                </div>
              </div>

              {/* Time Row */}
              <div 
                onClick={isEnabled ? openTimeDialog : undefined}
                className={cn(
                  "flex items-center justify-between py-3 px-3 rounded-lg border border-transparent transition-all",
                  isEnabled ? "hover:bg-emerald-500/10 hover:border-emerald-500/20 cursor-pointer" : "opacity-50"
                )}
              >
                <span className="text-base text-emerald-100">Heure</span>
                <div className="flex items-center gap-2 text-emerald-300">
                  <span className="text-xl font-mono font-bold tracking-wider text-white">
                    {selectedHour}:{selectedMinute}
                  </span>
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>
            
            <div className="pt-2">
                 <Button 
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-emerald-500/25 border border-emerald-400/20"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? "Enregistrement..." : "Planifier la Rencontre"}
                 </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Days Selection Dialog */}
      <Dialog open={isDayDialogOpen} onOpenChange={setIsDayDialogOpen}>
        <DialogContent className="bg-[#064e3b] border-emerald-500/30 text-white max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center pb-4 border-b border-white/10 text-emerald-200">Sélectionner les jours</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-2">
            {DAYS.map((day) => (
              <div 
                key={day.id}
                onClick={() => toggleDay(day.id)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
              >
                <div className={cn(
                  "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                  tempSelectedDays.includes(day.id) 
                    ? "bg-emerald-500 border-emerald-500" 
                    : "border-emerald-300/30"
                )}>
                  {tempSelectedDays.includes(day.id) && <Check size={12} className="text-white" />}
                </div>
                <span className="text-base text-emerald-100">{day.label}</span>
              </div>
            ))}
          </div>
          <DialogFooter className="flex-row justify-between gap-2 border-t border-white/10 pt-4">
            <Button 
              variant="ghost" 
              onClick={() => setIsDayDialogOpen(false)}
              className="flex-1 text-emerald-300 hover:text-white hover:bg-white/5"
            >
              Annuler
            </Button>
            <Button 
              onClick={saveDayDialog}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Selection Dialog */}
      <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
        <DialogContent className="bg-[#064e3b] border-emerald-500/30 text-white max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center pb-4 border-b border-white/10 text-emerald-200">Choisir l'heure</DialogTitle>
          </DialogHeader>
          
          <div className="flex justify-center items-center gap-4 h-48 py-4">
            {/* Hours */}
            <div className="h-full overflow-y-auto no-scrollbar snap-y snap-mandatory w-20 text-center border-r border-white/10">
              {HOURS.map(hour => (
                <div 
                  key={hour} 
                  onClick={() => setTempHour(hour)}
                  className={cn(
                    "py-2 snap-center cursor-pointer text-2xl font-bold transition-all",
                    tempHour === hour ? "text-emerald-400 scale-125" : "text-emerald-300/40 hover:text-emerald-300/60"
                  )}
                >
                  {hour}
                </div>
              ))}
            </div>

            {/* Minutes */}
            <div className="h-full overflow-y-auto no-scrollbar snap-y snap-mandatory w-20 text-center">
               {MINUTES.map(minute => (
                <div 
                  key={minute} 
                  onClick={() => setTempMinute(minute)}
                  className={cn(
                    "py-2 snap-center cursor-pointer text-2xl font-bold transition-all",
                    tempMinute === minute ? "text-emerald-400 scale-125" : "text-emerald-300/40 hover:text-emerald-300/60"
                  )}
                >
                  {minute}
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter className="flex-row justify-between gap-2 border-t border-white/10 pt-4">
            <Button 
              variant="ghost" 
              onClick={() => setIsTimeDialogOpen(false)}
              className="flex-1 text-emerald-300 hover:text-white hover:bg-white/5"
            >
              Annuler
            </Button>
            <Button 
              onClick={saveTimeDialog}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Terminé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeetingScheduler;