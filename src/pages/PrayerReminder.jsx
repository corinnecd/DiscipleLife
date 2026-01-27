
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Check, Users, User, Bell, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
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
  const [pourQuiOpen, setPourQuiOpen] = useState(false);
  
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

  const filterDisciple = (value, search) => {
    if (!search || !search.trim()) return 1;
    const s = (search || '').toLowerCase().trim();
    const v = (value || '').toLowerCase();
    return v.includes(s) ? 1 : 0;
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
    if (prayerType === 'individual' && !selectedDiscipleId) {
      toast({ title: "Champ obligatoire", description: "Veuillez sélectionner pour qui est cette prière.", variant: "destructive" });
      return;
    }
    if (prayerType === 'group' && !groupName.trim()) {
      toast({ title: "Champ obligatoire", description: "Veuillez saisir le nom du groupe.", variant: "destructive" });
      return;
    }

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
    <div className="min-h-screen bg-gray-100 text-gray-900 p-4 flex flex-col items-center pt-8">
      <div className="w-full max-w-md space-y-8 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="text-gray-700 hover:text-gray-900 hover:bg-gray-200"
          >
            <ArrowLeft size={24} />
          </Button>
          <h1 className="text-xl font-semibold text-gray-900">Planifier une Prière</h1>
          <div className="w-10" /> 
        </div>

        {/* Main Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-lg relative"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                 <Bell size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Rappel de Prière</h2>
                <p className="text-xs text-gray-500">Intercédez pour vos disciples</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Type Selection */}
              <div className="bg-gray-100 rounded-xl p-1 flex gap-1">
                 <button
                    onClick={() => setPrayerType('individual')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                        prayerType === 'individual' ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:text-gray-900"
                    )}
                 >
                    <User size={16} /> Individuel
                 </button>
                 <button
                    onClick={() => setPrayerType('group')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                        prayerType === 'group' ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:text-gray-900"
                    )}
                 >
                    <Users size={16} /> Groupe
                 </button>
              </div>

              {/* Dynamic Input based on Type */}
              <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">
                      {prayerType === 'individual' ? 'Pour qui ?' : 'Nom du groupe'}
                  </label>
                  
                  {prayerType === 'individual' ? (
                      <Popover open={pourQuiOpen} onOpenChange={setPourQuiOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={pourQuiOpen}
                            className="w-full h-12 justify-between bg-gray-50 border-gray-300 text-gray-900 rounded-xl font-normal hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-blue-500/50"
                          >
                            <span className="text-gray-900">{disciples.find(d => d.id === selectedDiscipleId)?.name || "Sélectionner un disciple"}</span>
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command filter={filterDisciple} className="rounded-lg border-0">
                            <div className="bg-gray-600 text-white rounded-t-lg">
                              <CommandInput placeholder="Rechercher un disciple..." className="h-11 bg-transparent text-white placeholder:text-gray-300 border-0" />
                            </div>
                            <CommandList>
                              <CommandEmpty>Aucun résultat.</CommandEmpty>
                              <CommandGroup>
                                {disciples.map((d) => (
                                  <CommandItem
                                    key={d.id}
                                    value={d.name}
                                    onSelect={(val) => {
                                      const disc = disciples.find(x => x.name === val);
                                      if (disc) { setSelectedDiscipleId(disc.id); setPourQuiOpen(false); }
                                    }}
                                    className="py-3 cursor-pointer"
                                  >
                                    {d.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                  ) : (
                      <Input 
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Ex: Groupe Jeunesse..." 
                        className="h-12 bg-gray-50 border-gray-300 text-gray-900 rounded-xl placeholder:text-gray-400 focus-visible:ring-blue-500/50"
                      />
                  )}
              </div>

              {/* Subject Field */}
              <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">
                      Sujet de prière
                  </label>
                  <Input 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Guérison, Examen, Protection..." 
                    className="h-12 bg-gray-50 border-gray-300 text-gray-900 rounded-xl placeholder:text-gray-400 focus-visible:ring-blue-500/50"
                  />
              </div>

              {/* Comment Field */}
              <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">
                      Notes & Détails
                  </label>
                  <Textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ajoutez des détails spécifiques pour guider votre prière..." 
                    className="min-h-[100px] bg-gray-50 border-gray-300 text-gray-900 rounded-xl placeholder:text-gray-400 focus-visible:ring-blue-500/50 resize-none"
                  />
              </div>

              <div className="h-px bg-gray-200 w-full my-4" />

              {/* Toggle Row */}
              <div className="flex items-center justify-between py-2">
                <span className="text-base font-medium text-gray-700">Activer le rappel</span>
                <div 
                  className={cn(
                    "w-12 h-7 rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out",
                    isEnabled ? "bg-blue-500" : "bg-gray-300"
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
                  isEnabled ? "hover:bg-gray-50 hover:border-gray-200 cursor-pointer" : "opacity-50"
                )}
              >
                <span className="text-base text-gray-700">Répéter</span>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-right truncate max-w-[150px] text-sm">{getDayLabel()}</span>
                  <ChevronRight size={18} />
                </div>
              </div>

              {/* Time Row */}
              <div 
                onClick={isEnabled ? openTimeDialog : undefined}
                className={cn(
                  "flex items-center justify-between py-3 px-3 rounded-lg border border-transparent transition-all",
                  isEnabled ? "hover:bg-gray-50 hover:border-gray-200 cursor-pointer" : "opacity-50"
                )}
              >
                <span className="text-base text-gray-700">Heure</span>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-xl font-mono font-bold tracking-wider text-gray-900">
                    {selectedHour}:{selectedMinute}
                  </span>
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>
            
            <div className="pt-2">
                 <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-6 rounded-xl shadow-md border border-blue-500/30"
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
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center pb-4 border-b border-gray-200 text-gray-900">Sélectionner les jours</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-2">
            {DAYS.map((day) => (
              <div 
                key={day.id}
                onClick={() => toggleDay(day.id)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className={cn(
                  "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                  tempSelectedDays.includes(day.id) 
                    ? "bg-blue-500 border-blue-500" 
                    : "border-gray-300"
                )}>
                  {tempSelectedDays.includes(day.id) && <Check size={12} className="text-white" />}
                </div>
                <span className="text-base text-gray-700">{day.label}</span>
              </div>
            ))}
          </div>
          <DialogFooter className="flex-row justify-between gap-2 border-t border-gray-200 pt-4">
            <Button 
              variant="ghost" 
              onClick={() => setIsDayDialogOpen(false)}
              className="flex-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
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
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center pb-4 border-b border-gray-200 text-gray-900">Choisir l'heure</DialogTitle>
          </DialogHeader>
          
          <div className="flex justify-center items-center gap-4 h-48 py-4">
            {/* Hours */}
            <div className="h-full overflow-y-auto no-scrollbar snap-y snap-mandatory w-20 text-center border-r border-gray-200">
              {HOURS.map(hour => (
                <div 
                  key={hour} 
                  onClick={() => setTempHour(hour)}
                  className={cn(
                    "py-2 snap-center cursor-pointer text-2xl font-bold transition-all",
                    tempHour === hour ? "text-blue-600 scale-125" : "text-gray-400 hover:text-gray-600"
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
                    tempMinute === minute ? "text-blue-600 scale-125" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  {minute}
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter className="flex-row justify-between gap-2 border-t border-gray-200 pt-4">
            <Button 
              variant="ghost" 
              onClick={() => setIsTimeDialogOpen(false)}
              className="flex-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
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
