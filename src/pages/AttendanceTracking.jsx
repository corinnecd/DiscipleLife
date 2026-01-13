
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from '@/components/ui/use-toast';
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Loader2, Save, Clock, Church, Users, CalendarCheck, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Constants for Attendance Types
const TYPES = {
  SUNDAY_WORSHIP: "sunday_worship",
  SUNDAY_SHARING: "sunday_sharing",
  SATURDAY_PRAYER: "saturday_prayer"
};

const AttendanceTracking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(TYPES.SUNDAY_WORSHIP);
  const [history, setHistory] = useState([]);
  
  // Form State
  const [date, setDate] = useState(new Date());
  const [status, setStatus] = useState("present");
  const [churchName, setChurchName] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user, activeTab]);

  // Reset form when tab changes
  useEffect(() => {
    setChurchName("");
    setAbsenceReason("");
    setStatus("present");
    setDate(new Date());
  }, [activeTab]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data: historyData, error: historyError } = await supabase
        .from('attendance_tracking')
        .select('*')
        .eq('disciple_id', user.id)
        .eq('attendance_type', activeTab)
        .order('attendance_date', { ascending: false })
        .limit(10);

      if (historyError) throw historyError;
      setHistory(historyData || []);

    } catch (error) {
      console.error("Error fetching attendance history", error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!date) {
      toast({ title: "Erreur", description: "La date est requise.", variant: "destructive" });
      return false;
    }

    if (activeTab === TYPES.SUNDAY_WORSHIP && status === 'present' && !churchName.trim()) {
      toast({ title: "Erreur", description: "Le nom de l'église est requis pour le culte.", variant: "destructive" });
      return false;
    }

    if (status === 'absent' && !absenceReason.trim()) {
      toast({ title: "Erreur", description: "Le motif de l'absence est requis.", variant: "destructive" });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        disciple_id: user.id,
        attendance_type: activeTab,
        attendance_date: format(date, 'yyyy-MM-dd'),
        status: status,
        absence_reason: status === 'absent' ? absenceReason : null,
        church_name: (activeTab === TYPES.SUNDAY_WORSHIP && status === 'present') ? churchName : null
      };

      const { error } = await supabase
        .from('attendance_tracking')
        .insert([payload]);

      if (error) throw error;

      toast({
        title: "Enregistré !",
        description: "Votre présence a été mise à jour avec succès.",
        className: "bg-green-600 text-white border-none"
      });

      setAbsenceReason("");
      fetchHistory();

    } catch (error) {
      console.error("Error submitting attendance", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les données.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getTabTitle = (tab) => {
    switch (tab) {
      case TYPES.SUNDAY_WORSHIP: return "Culte Dimanche Matin";
      case TYPES.SUNDAY_SHARING: return "Partage Dimanche (21H)";
      case TYPES.SATURDAY_PRAYER: return "Prière Samedi (22H)";
      default: return "";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 sm:px-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">Suivi de Présence</h1>
          <p className="text-gray-600">Sélectionnez une activité pour enregistrer votre présence.</p>
        </div>
      </div>

      {/* Custom Button Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveTab(TYPES.SUNDAY_WORSHIP)}
          className={cn(
            "relative p-6 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-3 group overflow-hidden shadow-sm",
            activeTab === TYPES.SUNDAY_WORSHIP
              ? "bg-purple-600 border-purple-600 text-white"
              : "bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50"
          )}
        >
          <div className={cn(
            "p-3 rounded-full transition-colors",
            activeTab === TYPES.SUNDAY_WORSHIP ? "bg-white/20 text-white" : "bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/20"
          )}>
            <Church size={24} />
          </div>
          <span className={cn(
            "font-bold text-lg",
            activeTab === TYPES.SUNDAY_WORSHIP ? "text-white" : "text-gray-900 group-hover:text-purple-600"
          )}>
            Culte Dimanche Matin
          </span>
          {activeTab === TYPES.SUNDAY_WORSHIP && (
            <motion.div layoutId="active-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-white/50" />
          )}
        </button>

        <button
          onClick={() => setActiveTab(TYPES.SUNDAY_SHARING)}
          className={cn(
            "relative p-6 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-3 group overflow-hidden shadow-sm",
            activeTab === TYPES.SUNDAY_SHARING
              ? "bg-purple-600 border-purple-600 text-white"
              : "bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50"
          )}
        >
          <div className={cn(
            "p-3 rounded-full transition-colors",
            activeTab === TYPES.SUNDAY_SHARING ? "bg-white/20 text-white" : "bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/20"
          )}>
            <Users size={24} />
          </div>
          <span className={cn(
            "font-bold text-lg",
            activeTab === TYPES.SUNDAY_SHARING ? "text-white" : "text-gray-900 group-hover:text-purple-600"
          )}>
            Partage Dimanche (21H)
          </span>
          {activeTab === TYPES.SUNDAY_SHARING && (
            <motion.div layoutId="active-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-white/50" />
          )}
        </button>

        <button
          onClick={() => setActiveTab(TYPES.SATURDAY_PRAYER)}
          className={cn(
            "relative p-6 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-3 group overflow-hidden shadow-sm",
            activeTab === TYPES.SATURDAY_PRAYER
              ? "bg-purple-600 border-purple-600 text-white"
              : "bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50"
          )}
        >
          <div className={cn(
            "p-3 rounded-full transition-colors",
            activeTab === TYPES.SATURDAY_PRAYER ? "bg-white/20 text-white" : "bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/20"
          )}>
            <Clock size={24} />
          </div>
          <span className={cn(
            "font-bold text-lg",
            activeTab === TYPES.SATURDAY_PRAYER ? "text-white" : "text-gray-900 group-hover:text-purple-600"
          )}>
            Prière Samedi (22H)
          </span>
          {activeTab === TYPES.SATURDAY_PRAYER && (
            <motion.div layoutId="active-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-white/50" />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Form Section */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-900">Formulaire de Présence</CardTitle>
                  <CardDescription className="text-gray-600">
                    {getTabTitle(activeTab)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Date Picker */}
                  <div className="space-y-2">
                    <Label className="text-gray-900 text-sm font-medium">Date de l'activité</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal bg-white border-gray-300 text-gray-900 hover:bg-gray-50 h-12",
                            !date && "text-gray-500"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                          {date ? format(date, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white border-gray-200">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          className="bg-white text-gray-900"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Status Selection */}
                  <div className="space-y-3">
                    <Label className="text-gray-900 text-sm font-medium">Statut de participation</Label>
                    <RadioGroup 
                      value={status} 
                      onValueChange={setStatus} 
                      className="grid grid-cols-2 gap-4"
                    >
                      <div 
                        onClick={() => setStatus('present')}
                        className={cn(
                          "flex items-center justify-center space-x-2 p-4 rounded-xl border cursor-pointer transition-all",
                          status === 'present' 
                            ? "bg-green-500/10 border-green-500 text-green-600" 
                            : "bg-white border-gray-300 hover:border-green-300 hover:bg-green-50"
                        )}
                      >
                        <RadioGroupItem value="present" id="present" className="border-green-500 text-green-500" />
                        <Label htmlFor="present" className="cursor-pointer text-green-600 font-bold">Présent</Label>
                      </div>

                      <div 
                        onClick={() => setStatus('absent')}
                        className={cn(
                          "flex items-center justify-center space-x-2 p-4 rounded-xl border cursor-pointer transition-all",
                          status === 'absent' 
                            ? "bg-red-500/10 border-red-500 text-red-600" 
                            : "bg-white border-gray-300 hover:border-red-300 hover:bg-red-50"
                        )}
                      >
                        <RadioGroupItem value="absent" id="absent" className="border-red-500 text-red-500" />
                        <Label htmlFor="absent" className="cursor-pointer text-red-600 font-bold">Absent</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Conditional Fields */}
                  <div className="space-y-4 pt-2">
                    
                    {/* Church Name for Sunday Worship Present */}
                    {activeTab === TYPES.SUNDAY_WORSHIP && status === 'present' && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                        <Label className="text-gray-900 text-sm font-medium">Nom de l'église visitée</Label>
                        <Input 
                          placeholder="Ex: ICC, Hillsong, Église locale..." 
                          value={churchName}
                          onChange={(e) => setChurchName(e.target.value)}
                          className="bg-white border-gray-300 text-gray-900 h-12 focus:ring-purple-500"
                        />
                      </div>
                    )}

                    {/* Absence Reason */}
                    {status === 'absent' && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                        <Label className="text-gray-900 text-sm font-medium">Motif de l'absence</Label>
                        <Input 
                          placeholder="Maladie, voyage, empêchement..." 
                          value={absenceReason}
                          onChange={(e) => setAbsenceReason(e.target.value)}
                          className="bg-white border-gray-300 text-gray-900 h-12 focus:ring-purple-500"
                        />
                      </div>
                    )}

                  </div>

                  <Button 
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full h-12 text-base font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-5 w-5" /> Confirmer la présence
                      </>
                    )}
                  </Button>

                </CardContent>
              </Card>
            </div>

            {/* History Section */}
            <div className="lg:col-span-7">
              <Card className="bg-white border-gray-200 shadow-sm h-full flex flex-col">
                <CardHeader className="border-b border-gray-200 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl text-gray-900">Historique Récent</CardTitle>
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-purple-600">
                      Voir tout <ChevronRight size={16} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-600 gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                      <p>Chargement de l'historique...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-600 gap-2">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <CalendarCheck className="w-6 h-6 text-gray-400" />
                      </div>
                      <p>Aucune donnée enregistrée pour cette catégorie.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-gray-50">
                          <TableRow className="border-gray-200 hover:bg-transparent">
                            <TableHead className="text-gray-600 font-medium pl-6">Date</TableHead>
                            <TableHead className="text-gray-600 font-medium">Statut</TableHead>
                            <TableHead className="text-gray-600 font-medium">Détails</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {history.map((record) => (
                            <TableRow key={record.id} className="border-gray-200 hover:bg-gray-50 transition-colors">
                              <TableCell className="text-gray-900 font-medium pl-6 py-4">
                                {format(new Date(record.attendance_date), "dd MMM yyyy", { locale: fr })}
                              </TableCell>
                              <TableCell>
                                {record.status === 'present' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-600 border border-green-500/20">
                                    <CheckCircle2 size={12} /> PRÉSENT
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/20">
                                    <XCircle size={12} /> ABSENT
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-gray-700 text-sm max-w-[200px] truncate">
                                {record.status === 'present' 
                                  ? (record.church_name ? <span className="flex items-center gap-1 text-green-600"><Church size={12}/> {record.church_name}</span> : <span className="text-gray-500">-</span>)
                                  : (record.absence_reason ? <span className="text-red-600 italic">{record.absence_reason}</span> : <span className="text-gray-500 italic">Aucun motif</span>)
                                }
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AttendanceTracking;
