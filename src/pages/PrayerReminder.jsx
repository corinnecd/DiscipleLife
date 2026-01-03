
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Check, Users, User, Bell } from 'lucide-react';
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

const PrayerReminder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isEnabled, setIsEnabled] = useState(true);
  const [selectedDays, setSelectedDays] = useState(['sunday', 'thursday']);
  const [selectedHour, setSelectedHour] = useState('09');
  const [selectedMinute, setSelectedMinute] = useState('00');
  
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false);
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  
  const [prayerType, setPrayerType] = useState('individual');
  const [disciples, setDisciples] = useState([]);
  const [selectedDiscipleId, setSelectedDiscipleId] = useState('');
  const [groupName, setGroupName] = useState('');
  
  const [subject, setSubject] = useState('');
  const [comment, setComment] = useState('');
  
  const [tempSelectedDays, setTempSelectedDays] = useState([]);
  const [tempHour, setTempHour] = useState('09');
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
    const targetName = prayerType === 'individual' 
        ? disciples.find(d => d.id === selectedDiscipleId)?.name || "un disciple"
        : groupName || "votre groupe";

    const nextDate = calculateNextEventDate();

    if (!nextDate) {
        toast({ title: "Erreur", description: "Veuillez sélectionner au moins un jour futur.", variant: "destructive" });
        return;
    }

    // Prepare disciple_id: must be a valid UUID or null, NOT an empty string
    let discipleIdToSave = null;
    if (prayerType === 'individual' && selectedDiscipleId && selectedDiscipleId !== '') {
        discipleIdToSave = selectedDiscipleId;
    }

    setIsSaving(true);
    try {
        const { error } = await supabase.from('calendar_events').insert([{
            user_id: user.id,
            disciple_id: discipleIdToSave,
            disciple_name: targetName,
            event_type: 'prayer',
            event_date: nextDate,
            subject: subject || 'Prière générale',
            notes: comment
        }]);

        if (error) throw error;

        toast({
          title: "Prière planifiée !",
          description: `Rappel activé pour ${targetName} avec le sujet "${subject || 'Général'}".`,
          className: "bg-blue-900 border-blue-800 text-white"
        });
        navigate(-1);
    } catch (error) {
        console.error("Error saving prayer", error);
        toast({ title: "Erreur", description: "Impossible d'enregistrer la prière.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0518] text-white p-4 flex flex-col items-center pt-8">
      <div className="w-full max-w-md space-y-8 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft size={24} />
          </Button>
          <h1 className="text-xl font-semibold text-blue-200">Planifier une Prière</h1>
          <div className="w-10" /> 
        </div>

        {/* Main Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1e1b4b] border border-blue-500/20 rounded-3xl overflow-hidden shadow-2xl relative"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                 <Bell size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Rappel de Prière</h2>
                <p className="text-xs text-blue-200/60">Intercédez pour vos disciples</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Type Selection */}
              <div className="bg-[#172554] rounded-xl p-1 flex gap-1">
                 <button
                    onClick={() => setPrayerType('individual')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                        prayerType === 'individual' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" : "text-blue-300 hover:text-white"
                    )}
                 >
                    <User size={16} /> Individuel
                 </button>
                 <button
                    onClick={() => setPrayerType('group')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                        prayerType === 'group' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" : "text-blue-300 hover:text-white"
                    )}
                 >
                    <Users size={16} /> Groupe
                 </button>
              </div>

              {/* Dynamic Input based on Type */}
              <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-blue-300/70 ml-1">
                      {prayerType === 'individual' ? 'Pour qui ?' : 'Nom du groupe'}
                  </label>
                  
                  {prayerType === 'individual' ? (
                      <Select value={selectedDiscipleId} onValueChange={handleDiscipleSelect}>
                        <SelectTrigger className="w-full h-12 bg-blue-950/50 border-blue-500/30 text-white rounded-xl focus:ring-blue-500/50">
                            <SelectValue placeholder="Sélectionner un disciple" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e1b4b] border-blue-500/30 text-white">
                            {disciples.map((disciple) => (
                                <SelectItem key={disciple.id} value={disciple.id} className="focus:bg-blue-600 focus:text-white cursor-pointer py-3">
                                    {disciple.name}
                                </SelectItem>
                            ))}
                            <div className="h-px bg-white/10 my-1" />
                            <SelectItem value="add_new" className="text-blue-300 font-medium focus:bg-blue-600/20 focus:text-blue-200 cursor-pointer py-3">
                                + Ajouter un nouveau
                            </SelectItem>
                        </SelectContent>
                      </Select>
                  ) : (
                      <Input 
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Ex: Groupe Jeunesse..." 
                        className="h-12 bg-blue-950/50 border-blue-500/30 text-white rounded-xl placeholder:text-blue-400/50 focus-visible:ring-blue-500/50"
                      />
                  )}
              </div>

              {/* Subject Field */}
              <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-blue-300/70 ml-1">
                      Sujet de prière
                  </label>
                  <Input 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Guérison, Examen, Protection..." 
                    className="h-12 bg-blue-950/50 border-blue-500/30 text-white rounded-xl placeholder:text-blue-400/50 focus-visible:ring-blue-500/50"
                  />
              </div>

              {/* Comment Field */}
              <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-blue-300/70 ml-1">
                      Notes & Détails
                  </label>
                  <Textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ajoutez des détails spécifiques pour guider votre prière..." 
                    className="min-h-[100px] bg-blue-950/50 border-blue-500/30 text-white rounded-xl placeholder:text-blue-400/50 focus-visible:ring-blue-500/50 resize-none"
                  />
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent w-full my-4" />

              {/* Toggle Row */}
              <div className="flex items-center justify-between py-2">
                <span className="text-base font-medium text-blue-100">Activer le rappel</span>
                <div 
                  className={cn(
                    "w-12 h-7 rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out",
                    isEnabled ? "bg-blue-500" : "bg-slate-700"
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
                  isEnabled ? "hover:bg-blue-500/10 hover:border-blue-500/20 cursor-pointer" : "opacity-50"
                )}
              >
                <span className="text-base text-blue-100">Répéter</span>
                <div className="flex items-center gap-2 text-blue-300">
                  <span className="text-right truncate max-w-[150px] text-sm">{getDayLabel()}</span>
                  <ChevronRight size={18} />
                </div>
              </div>

              {/* Time Row */}
              <div 
                onClick={isEnabled ? openTimeDialog : undefined}
                className={cn(
                  "flex items-center justify-between py-3 px-3 rounded-lg border border-transparent transition-all",
                  isEnabled ? "hover:bg-blue-500/10 hover:border-blue-500/20 cursor-pointer" : "opacity-50"
                )}
              >
                <span className="text-base text-blue-100">Heure</span>
                <div className="flex items-center gap-2 text-blue-300">
                  <span className="text-xl font-mono font-bold tracking-wider text-white">
                    {selectedHour}:{selectedMinute}
                  </span>
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>
            
            <div className="pt-2">
                 <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-500/25 border border-blue-400/20"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? "Enregistrement..." : "Enregistrer la Prière"}
                 </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Days Selection Dialog */}
      <Dialog open={isDayDialogOpen} onOpenChange={setIsDayDialogOpen}>
        <DialogContent className="bg-[#1e1b4b] border-blue-500/30 text-white max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center pb-4 border-b border-white/10 text-blue-200">Sélectionner les jours</DialogTitle>
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
                    ? "bg-blue-500 border-blue-500" 
                    : "border-blue-300/30"
                )}>
                  {tempSelectedDays.includes(day.id) && <Check size={12} className="text-white" />}
                </div>
                <span className="text-base text-blue-100">{day.label}</span>
              </div>
            ))}
          </div>
          <DialogFooter className="flex-row justify-between gap-2 border-t border-white/10 pt-4">
            <Button 
              variant="ghost" 
              onClick={() => setIsDayDialogOpen(false)}
              className="flex-1 text-blue-300 hover:text-white hover:bg-white/5"
            >
              Annuler
            </Button>
            <Button 
              onClick={saveDayDialog}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Selection Dialog */}
      <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
        <DialogContent className="bg-[#1e1b4b] border-blue-500/30 text-white max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center pb-4 border-b border-white/10 text-blue-200">Choisir l'heure</DialogTitle>
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
                    tempHour === hour ? "text-blue-400 scale-125" : "text-blue-300/40 hover:text-blue-300/60"
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
                    tempMinute === minute ? "text-blue-400 scale-125" : "text-blue-300/40 hover:text-blue-300/60"
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
              className="flex-1 text-blue-300 hover:text-white hover:bg-white/5"
            >
              Annuler
            </Button>
            <Button 
              onClick={saveTimeDialog}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
            >
              Terminé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrayerReminder;
