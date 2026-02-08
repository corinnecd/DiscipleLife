
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Loader2, Save, Clock, Church, Users, CalendarCheck, ChevronRight, Moon, Target, Download, Search, BarChart3, TrendingUp, AlertCircle, ArrowLeft } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { exportToExcel, exportElementToPDF } from '@/lib/ExportUtils';

// Constants for Attendance Types
const TYPES = {
  SUNDAY_WORSHIP: "sunday_worship",
  SUNDAY_SHARING: "sunday_sharing",
  SATURDAY_PRAYER: "saturday_prayer",
  SATURDAY_EVENING_WORSHIP: "saturday_evening_worship",
  AFTER_CULTE: "after_culte",
  EVANGELIZATION_OUTING: "evangelization_outing"
};

const AttendanceTracking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(TYPES.SUNDAY_WORSHIP);
  const [history, setHistory] = useState([]);
  const [allHistory, setAllHistory] = useState([]); // Pour la pagination et la recherche
  const [stats, setStats] = useState({});
  const [statsByType, setStatsByType] = useState([]);
  
  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  
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
      // Récupérer toutes les données pour la pagination et la recherche
      const { data: allHistoryData, error: allHistoryError } = await supabase
        .from('attendance_tracking')
        .select('*')
        .eq('disciple_id', user.id)
        .eq('attendance_type', activeTab)
        .order('attendance_date', { ascending: false });

      if (allHistoryError) throw allHistoryError;
      
      setAllHistory(allHistoryData || []);
      
      // Calculer les statistiques
      calculateStats(allHistoryData || []);

    } catch (error) {
      console.error("Error fetching attendance history", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculer les statistiques pour le type d'activité actif
  const calculateStats = (historyData) => {
    const total = historyData.length;
    const present = historyData.filter(h => h.status === 'present').length;
    const absent = historyData.filter(h => h.status === 'absent').length;
    const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
    
    // Statistiques par mois (6 derniers mois)
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 6);
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });
    
    const monthlyStats = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthData = historyData.filter(h => {
        const recordDate = new Date(h.attendance_date);
        return recordDate >= monthStart && recordDate <= monthEnd;
      });
      return {
        name: format(month, 'MMM yyyy', { locale: fr }),
        présents: monthData.filter(h => h.status === 'present').length,
        absents: monthData.filter(h => h.status === 'absent').length
      };
    }).reverse();

    setStats({
      total,
      present,
      absent,
      attendanceRate
    });
    setStatsByType(monthlyStats);
  };

  // Récupérer les statistiques pour tous les types d'activité
  useEffect(() => {
    const fetchAllStats = async () => {
      if (!user) return;
      try {
        const { data: allData, error } = await supabase
          .from('attendance_tracking')
          .select('*')
          .eq('disciple_id', user.id);
        
        if (error) throw error;
        
        // Calculer les stats par type d'activité
        const statsByTypeData = Object.values(TYPES).map(type => {
          const typeData = (allData || []).filter(d => d.attendance_type === type);
          const typeName = getTabTitle(type);
          return {
            name: typeName,
            total: typeData.length,
            present: typeData.filter(d => d.status === 'present').length,
            absent: typeData.filter(d => d.status === 'absent').length
          };
        });
      } catch (error) {
        console.error("Error fetching all stats", error);
      }
    };
    fetchAllStats();
  }, [user]);

  // Filtrer l'historique selon le terme de recherche
  useEffect(() => {
    const filtered = allHistory.filter(record => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      const dateStr = format(new Date(record.attendance_date), "dd MMM yyyy", { locale: fr }).toLowerCase();
      const statusStr = record.status === 'present' ? 'présent' : 'absent';
      const churchName = (record.church_name || '').toLowerCase();
      const reason = (record.absence_reason || '').toLowerCase();
      
      return dateStr.includes(searchLower) || 
             statusStr.includes(searchLower) ||
             churchName.includes(searchLower) ||
             reason.includes(searchLower);
    });
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setHistory(filtered.slice(startIndex, endIndex));
  }, [searchTerm, allHistory, currentPage, itemsPerPage]);

  // Réinitialiser la pagination quand on change d'onglet ou de recherche
  useEffect(() => {
    setCurrentPage(1);
    setSearchTerm("");
  }, [activeTab]);

  const validateForm = () => {
    if (!date) {
      toast({ title: "Erreur", description: "La date est requise.", variant: "destructive" });
      return false;
    }

    if ((activeTab === TYPES.SUNDAY_WORSHIP || activeTab === TYPES.SATURDAY_EVENING_WORSHIP) && status === 'present' && !churchName.trim()) {
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
        church_name: ((activeTab === TYPES.SUNDAY_WORSHIP || activeTab === TYPES.SATURDAY_EVENING_WORSHIP) && status === 'present') ? churchName : null
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
      case TYPES.SUNDAY_SHARING: return "Temps de Partage";
      case TYPES.SATURDAY_PRAYER: return "Temps de Prière";
      case TYPES.SATURDAY_EVENING_WORSHIP: return "Culte du Samedi Soir";
      case TYPES.AFTER_CULTE: return "After Culte du Dimanche";
      case TYPES.EVANGELIZATION_OUTING: return "Sortie d'Évangélisation";
      default: return "";
    }
  };

  // Fonctions d'export
  const handleExportExcel = () => {
    const exportData = allHistory.map(record => ({
      Date: format(new Date(record.attendance_date), "dd/MM/yyyy", { locale: fr }),
      Type: getTabTitle(record.attendance_type),
      Statut: record.status === 'present' ? 'Présent' : 'Absent',
      "Nom Église": record.church_name || '-',
      "Motif Absence": record.absence_reason || '-'
    }));
    
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `presence_${getTabTitle(activeTab).replace(/\s+/g, '_')}_${timestamp}`;
    exportToExcel(exportData, filename);
  };

  const handleExportPDF = async () => {
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `presence_${getTabTitle(activeTab).replace(/\s+/g, '_')}_${timestamp}.pdf`;
      await exportElementToPDF('attendance-tracking-content', filename);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter en PDF.",
        variant: "destructive"
      });
    }
  };

  // Calcul de la pagination
  const totalPages = Math.ceil((searchTerm ? allHistory.filter(record => {
    const searchLower = searchTerm.toLowerCase();
    const dateStr = format(new Date(record.attendance_date), "dd MMM yyyy", { locale: fr }).toLowerCase();
    const statusStr = record.status === 'present' ? 'présent' : 'absent';
    const churchName = (record.church_name || '').toLowerCase();
    const reason = (record.absence_reason || '').toLowerCase();
    return dateStr.includes(searchLower) || statusStr.includes(searchLower) ||
           churchName.includes(searchLower) || reason.includes(searchLower);
  }).length : allHistory.length) / itemsPerPage);

  // Rappels automatiques
  const getReminderMessage = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Dimanche, 6 = Samedi
    
    // Vérifier si c'est samedi (6) ou dimanche (0)
    if (dayOfWeek === 6) {
      return {
        show: true,
        message: "N'oubliez pas d'enregistrer votre présence pour le Culte du Samedi Soir ce soir !",
        type: TYPES.SATURDAY_EVENING_WORSHIP
      };
    } else if (dayOfWeek === 0) {
      return {
        show: true,
        message: "N'oubliez pas d'enregistrer votre présence pour le Culte du Dimanche Matin aujourd'hui !",
        type: TYPES.SUNDAY_WORSHIP
      };
    }
    return { show: false };
  };

  const reminder = getReminderMessage();

  return (
    <div id="attendance-tracking-content" className="w-full space-y-8 pb-20">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Suivi de Présence</h1>
          </div>
          <p className="text-gray-600">Sélectionnez une activité pour enregistrer votre présence.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} size="sm" className="gap-2 bg-purple-600 hover:bg-blue-600 text-white">
            <Download className="h-4 w-4" /> Excel
          </Button>
          <Button onClick={handleExportPDF} size="sm" className="gap-2 bg-purple-600 hover:bg-blue-600 text-white">
            <Download className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Rappels automatiques */}
      {reminder.show && (
        <Card className="bg-blue-50 border-blue-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <p className="text-blue-900 font-medium">{reminder.message}</p>
              <Button 
                onClick={() => setActiveTab(reminder.type)} 
                size="sm" 
                className="ml-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                Enregistrer maintenant
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistiques */}
      {stats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{stats.total}</div>
                <div className="text-sm text-gray-600 mt-1">Total d'enregistrements</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.present}</div>
                <div className="text-sm text-gray-600 mt-1">Présences</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{stats.absent}</div>
                <div className="text-sm text-gray-600 mt-1">Absences</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{stats.attendanceRate}%</div>
                <div className="text-sm text-gray-600 mt-1">Taux de présence</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Custom Button Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. Culte de Samedi Soir */}
        <button
          onClick={() => setActiveTab(TYPES.SATURDAY_EVENING_WORSHIP)}
          className={cn(
            "relative p-6 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-3 group overflow-hidden shadow-sm",
            activeTab === TYPES.SATURDAY_EVENING_WORSHIP
              ? "bg-white border-gray-200"
              : "bg-white border-gray-200 hover:border-purple-600 hover:bg-purple-600 hover:text-white"
          )}
        >
          <div className={cn(
            "p-3 rounded-full transition-colors",
            activeTab === TYPES.SATURDAY_EVENING_WORSHIP ? "bg-indigo-500/10 text-indigo-500" : "bg-indigo-500/10 text-indigo-500 group-hover:bg-white/20 group-hover:text-white"
          )}>
            <Moon size={24} />
          </div>
          <span className={cn(
            "font-bold text-lg transition-colors",
            activeTab === TYPES.SATURDAY_EVENING_WORSHIP ? "text-gray-900" : "text-gray-900 group-hover:text-white"
          )}>
            Culte du Samedi Soir
          </span>
        </button>

        {/* 2. Culte du Dimanche Matin */}
        <button
          onClick={() => setActiveTab(TYPES.SUNDAY_WORSHIP)}
          className={cn(
            "relative p-6 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-3 group overflow-hidden shadow-sm",
            activeTab === TYPES.SUNDAY_WORSHIP
              ? "bg-white border-gray-200"
              : "bg-white border-gray-200 hover:border-purple-600 hover:bg-purple-600 hover:text-white"
          )}
        >
          <div className={cn(
            "p-3 rounded-full transition-colors",
            activeTab === TYPES.SUNDAY_WORSHIP ? "bg-purple-500/10 text-purple-500" : "bg-purple-500/10 text-purple-500 group-hover:bg-white/20 group-hover:text-white"
          )}>
            <Church size={24} />
          </div>
          <span className={cn(
            "font-bold text-lg transition-colors",
            activeTab === TYPES.SUNDAY_WORSHIP ? "text-gray-900" : "text-gray-900 group-hover:text-white"
          )}>
            Culte Dimanche Matin
          </span>
        </button>

        {/* 3. After Culte Dimanche */}
        <button
          onClick={() => setActiveTab(TYPES.AFTER_CULTE)}
          className={cn(
            "relative p-6 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-3 group overflow-hidden shadow-sm",
            activeTab === TYPES.AFTER_CULTE
              ? "bg-white border-gray-200"
              : "bg-white border-gray-200 hover:border-purple-600 hover:bg-purple-600 hover:text-white"
          )}
        >
          <div className={cn(
            "p-3 rounded-full transition-colors",
            activeTab === TYPES.AFTER_CULTE 
              ? "bg-cyan-500/10 text-cyan-500 group-hover:bg-white/20 group-hover:text-white" 
              : "bg-cyan-500/10 text-cyan-500 group-hover:bg-white/20 group-hover:text-white"
          )}>
            <Users size={24} />
          </div>
          <span className={cn(
            "font-bold text-lg transition-colors text-center",
            activeTab === TYPES.AFTER_CULTE 
              ? "text-gray-900 group-hover:text-white" 
              : "text-gray-900 group-hover:text-white"
          )}>
            After Culte du Dimanche
          </span>
        </button>

        {/* 4. Temps de Prière */}
        <button
          onClick={() => setActiveTab(TYPES.SATURDAY_PRAYER)}
          className={cn(
            "relative p-6 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-3 group overflow-hidden shadow-sm",
            activeTab === TYPES.SATURDAY_PRAYER
              ? "bg-white border-gray-200"
              : "bg-white border-gray-200 hover:border-purple-600 hover:bg-purple-600 hover:text-white"
          )}
        >
          <div className={cn(
            "p-3 rounded-full transition-colors",
            activeTab === TYPES.SATURDAY_PRAYER ? "bg-amber-500/10 text-amber-500" : "bg-amber-500/10 text-amber-500 group-hover:bg-white/20 group-hover:text-white"
          )}>
            <Clock size={24} />
          </div>
          <span className={cn(
            "font-bold text-lg transition-colors",
            activeTab === TYPES.SATURDAY_PRAYER ? "text-gray-900" : "text-gray-900 group-hover:text-white"
          )}>
            Temps de Prière
          </span>
        </button>

        {/* 5. Temps de Partage */}
        <button
          onClick={() => setActiveTab(TYPES.SUNDAY_SHARING)}
          className={cn(
            "relative p-6 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-3 group overflow-hidden shadow-sm",
            activeTab === TYPES.SUNDAY_SHARING
              ? "bg-white border-gray-200"
              : "bg-white border-gray-200 hover:border-purple-600 hover:bg-purple-600 hover:text-white"
          )}
        >
          <div className={cn(
            "p-3 rounded-full transition-colors",
            activeTab === TYPES.SUNDAY_SHARING ? "bg-pink-500/10 text-pink-500" : "bg-pink-500/10 text-pink-500 group-hover:bg-white/20 group-hover:text-white"
          )}>
            <Users size={24} />
          </div>
          <span className={cn(
            "font-bold text-lg transition-colors",
            activeTab === TYPES.SUNDAY_SHARING ? "text-gray-900" : "text-gray-900 group-hover:text-white"
          )}>
            Temps de Partage
          </span>
        </button>

        {/* 6. Sortie d'Évangélisation */}
        <button
          onClick={() => setActiveTab(TYPES.EVANGELIZATION_OUTING)}
          className={cn(
            "relative p-6 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-3 group overflow-hidden shadow-sm",
            activeTab === TYPES.EVANGELIZATION_OUTING
              ? "bg-white border-gray-200"
              : "bg-white border-gray-200 hover:border-purple-600 hover:bg-purple-600 hover:text-white"
          )}
        >
          <div className={cn(
            "p-3 rounded-full transition-colors",
            activeTab === TYPES.EVANGELIZATION_OUTING ? "bg-emerald-500/10 text-emerald-500" : "bg-emerald-500/10 text-emerald-500 group-hover:bg-white/20 group-hover:text-white"
          )}>
            <Target size={24} />
          </div>
          <span className={cn(
            "font-bold text-lg transition-colors text-center",
            activeTab === TYPES.EVANGELIZATION_OUTING ? "text-gray-900" : "text-gray-900 group-hover:text-white"
          )}>
            Sortie d'Évangélisation
          </span>
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
                    
                    {/* Church Name for Worship Present */}
                    {(activeTab === TYPES.SUNDAY_WORSHIP || activeTab === TYPES.SATURDAY_EVENING_WORSHIP) && status === 'present' && (
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
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl text-gray-900">Historique Récent</CardTitle>
                    </div>
                    {/* Barre de recherche */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Rechercher par date, statut, église ou motif..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white border-gray-300 text-gray-900 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-600 gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                      <p>Chargement de l'historique...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-600 gap-4 py-8">
                      <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                        <CalendarCheck className="w-8 h-8 text-purple-600" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune donnée enregistrée</h3>
                        <p className="text-sm text-gray-500">L'historique de présence apparaîtra ici.</p>
                      </div>
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
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="border-t border-gray-200 p-4 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Page {currentPage} sur {totalPages} ({allHistory.length} entrées au total)
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Précédent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>

          </div>
        </motion.div>
      </AnimatePresence>

      {/* Graphique des statistiques - En fin de page */}
      {statsByType.length > 0 && (
        <Card className="bg-white border-gray-200 shadow-sm mt-8">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Statistiques des 6 derniers mois
            </CardTitle>
            <CardDescription className="text-gray-600">
              Évolution de votre présence pour {getTabTitle(activeTab)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsByType}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                  <YAxis stroke="#888888" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="présents" fill="#10b981" name="Présents" />
                  <Bar dataKey="absents" fill="#ef4444" name="Absents" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AttendanceTracking;
