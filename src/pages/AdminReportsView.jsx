
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Loader2, 
  Search, 
  Download, 
  Trash2, 
  Eye, 
  FileText, 
  User,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Helmet } from 'react-helmet';
import { useErrorHandler } from '@/hooks/useErrorHandler';

const AdminReportsView = () => {
  const { user } = useAuth();
  const { role } = useRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { handleError } = useErrorHandler();
  const [reports, setReports] = useState([]);
  
  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [reportTypeFilter, setReportTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(''); // Filtre par mois (0-11) pour "Rapports reçus"
  const [yearFilter, setYearFilter] = useState('');  // Filtre par année pour "Rapports reçus"

  // Modal
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [currentPage, statusFilter, reportTypeFilter, dateFilter, monthFilter, yearFilter, role, user?.id]);

  const fetchReports = async () => {
    try {
      setLoading(true);

      // Vue Pasteur : ne montrer que les rapports des superviseurs sous sa responsabilité
      let superviseurIds = null;
      if (role === 'pasteur' && user?.id) {
        const { data: superviseurs, error: supError } = await supabase
          .from('profils')
          .select('id')
          .eq('pasteur_id', user.id)
          .eq('role', 'superviseur');
        if (!supError && superviseurs?.length) {
          superviseurIds = superviseurs.map(s => s.id);
        } else {
          setReports([]);
          setTotalPages(1);
          setLoading(false);
          return;
        }
      }
      
      let query = supabase
        .from('reports')
        .select('*, profils(first_name, last_name, email)', { count: 'exact' });

      if (superviseurIds && superviseurIds.length > 0) {
        query = query.in('user_id', superviseurIds);
      }

      // Apply Filters
      if (statusFilter !== 'all') {
        // Harmoniser : 'submitted' = envoyé (SendReport utilise submitted)
        const statusVal = statusFilter === 'sent' ? 'submitted' : statusFilter;
        query = query.eq('status', statusVal);
      }
      
      if (reportTypeFilter !== 'all') {
        query = query.eq('report_type', reportTypeFilter);
      }
      
      if (dateFilter) {
        query = query.gte('created_at', `${dateFilter}T00:00:00`).lte('created_at', `${dateFilter}T23:59:59`);
      }

      if (monthFilter !== '') {
        query = query.eq('month', parseInt(monthFilter, 10));
      }
      if (yearFilter !== '') {
        query = query.eq('year', parseInt(yearFilter, 10));
      }

      if (searchQuery) {
        query = query.ilike('content', `%${searchQuery}%`);
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setReports(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));

    } catch (error) {
      handleError(error, { context: 'fetchReports' }, "Impossible de charger les rapports.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchReports();
  };

  const getReportPeriodLabel = (r) => {
    if (!r) return '';
    if (r.report_type === 'hebdomadaire' && r.week_number != null && r.year != null) return `S${r.week_number} ${r.year}`;
    if (r.report_type === 'trimestriel' && r.quarter != null && r.year != null) return `T${r.quarter} ${r.year}`;
    if (r.report_type === 'annuel' && r.year != null) return String(r.year);
    if (r.month != null && r.year != null) return `${r.month}/${r.year}`;
    return r.year ? String(r.year) : '';
  };

  const handleViewReport = async (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
    
    // Mark as read if not already
    if (!report.is_read) {
      try {
        const { error } = await supabase
          .from('reports')
          .update({ is_read: true })
          .eq('id', report.id);
          
        if (!error) {
          // Update local state
          setReports(prev => prev.map(r => r.id === report.id ? { ...r, is_read: true } : r));
          // Notifier le superviseur (auteur) que le pasteur a consulté son rapport
          if (role === 'pasteur' && report.user_id) {
            const typeLabel = { hebdomadaire: 'hebdomadaire', mensuel: 'mensuel', trimestriel: 'trimestriel', annuel: 'annuel' }[report.report_type] || report.report_type || 'rapport';
            const period = getReportPeriodLabel(report);
            await supabase.from('notifications').insert({
              user_id: report.user_id,
              type: 'report_consulted',
              title: 'Rapport consulté',
              content: `Votre rapport ${typeLabel}${period ? ` (${period})` : ''} a été consulté par le pasteur.`,
              read: false,
            });
          }
        }
      } catch (err) {
        handleError(err, { context: 'handleViewReport', reportId: report.id }, "Impossible de marquer le rapport comme lu.");
      }
    }
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce rapport ?")) return;

    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Rapport supprimé",
        description: "Le rapport a été supprimé avec succès.",
      });
      fetchReports();
    } catch (error) {
      console.error("Error deleting report:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le rapport."
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
      case 'submitted':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Envoyé</Badge>;
      case 'draft':
        return <Badge variant="outline" className="text-slate-500">Brouillon</Badge>;
      default:
        return <Badge variant="secondary">{status || '—'}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Helmet>
        <title>{role === 'pasteur' ? 'Rapports reçus' : 'Rapports Superviseurs'} | Disciple 70</title>
      </Helmet>

      {/* Bouton retour */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {role === 'pasteur' ? 'Rapports reçus' : 'Rapports Superviseurs'}
          </h1>
          <p className="text-slate-500">
            {role === 'pasteur'
              ? 'Rapports envoyés par vos superviseurs'
              : 'Gérer et analyser les rapports de vos Superviseurs'}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center">
        <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher dans le contenu..."
              className="pl-9 bg-gray-100 border-gray-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Rechercher</Button>
        </form>
        
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <div className="w-40">
            <Select value={reportTypeFilter} onValueChange={setReportTypeFilter}>
              <SelectTrigger className="bg-gray-100 border-gray-200 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-gray-200">
                <SelectValue placeholder="Type de rapport" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="all" className="text-gray-900 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900">Tous types</SelectItem>
                <SelectItem value="hebdomadaire" className="text-gray-900 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900">Hebdomadaire</SelectItem>
                <SelectItem value="mensuel" className="text-gray-900 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900">Mensuel</SelectItem>
                <SelectItem value="trimestriel" className="text-gray-900 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900">Trimestriel</SelectItem>
                <SelectItem value="annuel" className="text-gray-900 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900">Annuel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-40">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-gray-100 border-gray-200 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-gray-200">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="all" className="text-gray-900 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900">Tous statuts</SelectItem>
                <SelectItem value="sent" className="text-gray-900 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900">Envoyés</SelectItem>
                <SelectItem value="draft" className="text-gray-900 hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900">Brouillons</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-auto">
             <Input 
               type="date" 
               value={dateFilter} 
               onChange={(e) => setDateFilter(e.target.value)} 
               className="w-full md:w-[160px] bg-gray-100 border-gray-200 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-gray-200"
             />
          </div>
          {/* Filtres Mois / Année (pratique pour la vue Pasteur « Rapports reçus ») */}
          <div className="w-36">
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="bg-gray-100 border-gray-200 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-gray-200">
                <SelectValue placeholder="Mois" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="" className="text-gray-900">Tous les mois</SelectItem>
                {months.map((m, i) => (
                  <SelectItem key={i} value={String(i)} className="text-gray-900">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-28">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="bg-gray-100 border-gray-200 text-gray-900 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-gray-200">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="" className="text-gray-900">Toutes</SelectItem>
                {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <SelectItem key={y} value={String(y)} className="text-gray-900">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p>Aucun rapport trouvé pour ces critères.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Mentor</th>
                  <th className="px-6 py-4">Période</th>
                  <th className="px-6 py-4">Date envoi</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((report) => (
                  <tr key={report.id} className={`hover:bg-slate-50/50 transition-colors ${!report.is_read ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                           <User className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">
                            {report.profils?.first_name} {report.profils?.last_name}
                          </div>
                          <div className="text-xs text-slate-500">{report.profils?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {report.report_type === 'hebdomadaire' ? 'Hebdomadaire' : 
                             report.report_type === 'trimestriel' ? 'Trimestriel' : 
                             report.report_type === 'annuel' ? 'Annuel' : 'Mensuel'}
                          </Badge>
                        </div>
                        <span className="font-medium text-slate-700 text-sm">
                          {report.report_type === 'hebdomadaire' && report.week_number 
                            ? `Semaine ${report.week_number}, ${report.year}`
                            : report.report_type === 'trimestriel' && report.quarter
                            ? `Trimestre ${report.quarter}, ${report.year}`
                            : report.report_type === 'annuel' && report.year
                            ? `Année ${report.year}`
                            : report.month && report.year
                            ? `${months[report.month]} ${report.year}`
                            : `${report.year || 'N/A'}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {format(new Date(report.created_at), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(report.status)}
                        {!report.is_read && (
                          <span className="h-2 w-2 rounded-full bg-blue-500" title="Non lu"></span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewReport(report)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteReport(report.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <span className="text-sm text-slate-500">
              Page {currentPage} sur {totalPages}
            </span>
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
      </div>

      {/* View Report Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-none print:h-auto print:shadow-none print:border-none">
          {selectedReport && (
            <div className="space-y-6">
              <DialogHeader className="print:hidden">
                <DialogTitle className="flex items-center gap-2 text-2xl">
                  Rapport de {selectedReport.profils?.first_name} {selectedReport.profils?.last_name}
                </DialogTitle>
                <DialogDescription>
                  Type: {selectedReport.report_type === 'hebdomadaire' ? 'Hebdomadaire' : selectedReport.report_type === 'trimestriel' ? 'Trimestriel' : 'Mensuel'} | 
                  Période: {
                    selectedReport.report_type === 'hebdomadaire' && selectedReport.week_number
                      ? `Semaine ${selectedReport.week_number}, ${selectedReport.year}`
                      : selectedReport.report_type === 'trimestriel' && selectedReport.quarter
                      ? `Trimestre ${selectedReport.quarter}, ${selectedReport.year}`
                      : selectedReport.month !== null && selectedReport.month !== undefined
                      ? `${months[selectedReport.month]} ${selectedReport.year}`
                      : `${selectedReport.year || 'N/A'}`
                  }
                </DialogDescription>
              </DialogHeader>

              {/* Printable Header */}
              <div className="hidden print:block mb-8 border-b pb-4">
                 <h1 className="text-2xl font-bold">
                   Rapport {selectedReport.report_type === 'hebdomadaire' ? 'Hebdomadaire' : selectedReport.report_type === 'trimestriel' ? 'Trimestriel' : 'Mensuel'} - Disciple 70
                 </h1>
                 <p className="text-lg">Superviseur: {selectedReport.profils?.first_name} {selectedReport.profils?.last_name}</p>
                 <p>Période: {
                   selectedReport.report_type === 'hebdomadaire' && selectedReport.week_number
                     ? `Semaine ${selectedReport.week_number}, ${selectedReport.year}`
                     : selectedReport.report_type === 'trimestriel' && selectedReport.quarter
                     ? `Trimestre ${selectedReport.quarter}, ${selectedReport.year}`
                     : selectedReport.month !== null && selectedReport.month !== undefined
                     ? `${months[selectedReport.month]} ${selectedReport.year}`
                     : `${selectedReport.year || 'N/A'}`
                 }</p>
                 <p className="text-sm text-gray-500">Généré le: {new Date().toLocaleDateString()}</p>
              </div>

              {/* Stats Snapshot */}
              {selectedReport.statistics_snapshot && (
                <div className="space-y-6">
                  {/* Statistiques principales */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                      <span className="text-xs font-medium text-purple-600 uppercase">Total Disciples</span>
                      <div className="text-2xl font-bold text-purple-700 mt-1">
                        {selectedReport.statistics_snapshot.disciples || selectedReport.statistics_snapshot.totalDisciples || 0}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                      <span className="text-xs font-medium text-red-600 uppercase">Évangélisées</span>
                      <div className="text-2xl font-bold text-red-700 mt-1">
                        {selectedReport.statistics_snapshot.evangelization || selectedReport.statistics_snapshot.soulsEvangelized || 0}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg border border-pink-200">
                      <span className="text-xs font-medium text-pink-600 uppercase">Vidéos</span>
                      <div className="text-2xl font-bold text-pink-700 mt-1">
                        {selectedReport.statistics_snapshot.video_views || selectedReport.statistics_snapshot.modulesCompleted || 0}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                      <span className="text-xs font-medium text-orange-600 uppercase">Taux Complétion</span>
                      <div className="text-2xl font-bold text-orange-700 mt-1">
                        {selectedReport.statistics_snapshot.completion_rate || 0}%
                      </div>
                    </div>
                  </div>

                  {/* Statistiques de présence */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Présences</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
                        <span className="text-xs font-medium text-blue-600 uppercase">Dimanche Matin</span>
                        <div className="text-xl font-bold text-blue-700 mt-1">
                          {selectedReport.statistics_snapshot.sunday_attendance_count || 0}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-3 rounded-lg border border-indigo-200">
                        <span className="text-xs font-medium text-indigo-600 uppercase">Samedi Soir</span>
                        <div className="text-xl font-bold text-indigo-700 mt-1">
                          {selectedReport.statistics_snapshot.saturday_evening_count || 0}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-3 rounded-lg border border-teal-200">
                        <span className="text-xs font-medium text-teal-600 uppercase">After Culte</span>
                        <div className="text-xl font-bold text-teal-700 mt-1">
                          {selectedReport.statistics_snapshot.after_culte_count || 0}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-3 rounded-lg border border-amber-200">
                        <span className="text-xs font-medium text-amber-600 uppercase">Prière</span>
                        <div className="text-xl font-bold text-amber-700 mt-1">
                          {selectedReport.statistics_snapshot.saturday_prayer_count || 0}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
                        <span className="text-xs font-medium text-green-600 uppercase">Partage</span>
                        <div className="text-xl font-bold text-green-700 mt-1">
                          {selectedReport.statistics_snapshot.sunday_sharing_count || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-500" />
                  Contenu du rapport
                </h3>
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[200px]">
                  {selectedReport.content}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
                 <div>
                    <h4 className="text-sm font-medium mb-2 text-slate-500">Démographie (Instantané)</h4>
                    {selectedReport.statistics_snapshot?.ageDistribution ? (
                      <ul className="space-y-2">
                        {Object.entries(selectedReport.statistics_snapshot.ageDistribution).map(([range, count]) => (
                          <li key={range} className="flex justify-between text-sm p-2 bg-slate-50 rounded">
                            <span>{range}</span>
                            <span className="font-bold">{count}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400">Aucune donnée démographique.</p>
                    )}
                 </div>
                 <div>
                    <h4 className="text-sm font-medium mb-2 text-slate-500">Méta-données</h4>
                    <div className="text-sm text-slate-600 space-y-1">
                      <p>Soumis le: {format(new Date(selectedReport.created_at), 'PPP à HH:mm', { locale: fr })}</p>
                      <p>Email contact: {selectedReport.profils?.email}</p>
                      <p>Statut actuel: <span className="uppercase">{selectedReport.status}</span></p>
                    </div>
                 </div>
              </div>

              <DialogFooter className="print:hidden gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Fermer</Button>
                <Button onClick={handlePrint} className="gap-2">
                  <Download className="h-4 w-4" />
                  Télécharger PDF / Imprimer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReportsView;
