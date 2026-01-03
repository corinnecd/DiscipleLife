
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
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
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Helmet } from 'react-helmet';

const AdminReportsView = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modal
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [currentPage, statusFilter, dateFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('reports')
        .select('*, profils(first_name, last_name, email)', { count: 'exact' });

      // Apply Filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (dateFilter) {
        // Simple date filtering (created_at starts with the date string YYYY-MM-DD)
        query = query.gte('created_at', `${dateFilter}T00:00:00`).lte('created_at', `${dateFilter}T23:59:59`);
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
      console.error("Error fetching reports:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les rapports."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchReports();
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
        }
      } catch (err) {
        console.error("Failed to mark as read", err);
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
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Envoyé</Badge>;
      case 'draft':
        return <Badge variant="outline" className="text-slate-500">Brouillon</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Helmet>
        <title>Administration des Rapports | DiscipleLife</title>
      </Helmet>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Rapports Mentorat</h1>
          <p className="text-slate-500">Gérez et analysez les rapports mensuels des mentors.</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center">
        <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher dans le contenu..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary">Rechercher</Button>
        </form>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="w-40">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="sent">Envoyés</SelectItem>
                <SelectItem value="draft">Brouillons</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-auto">
             <Input 
               type="date" 
               value={dateFilter} 
               onChange={(e) => setDateFilter(e.target.value)} 
               className="w-full md:w-[160px]"
             />
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
                      <span className="font-medium text-slate-700">{report.month} {report.year}</span>
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
                  Période: {selectedReport.month} {selectedReport.year}
                </DialogDescription>
              </DialogHeader>

              {/* Printable Header */}
              <div className="hidden print:block mb-8 border-b pb-4">
                 <h1 className="text-2xl font-bold">Rapport Mensuel - DiscipleLife</h1>
                 <p className="text-lg">Mentor: {selectedReport.profils?.first_name} {selectedReport.profils?.last_name}</p>
                 <p>Période: {selectedReport.month} {selectedReport.year}</p>
                 <p className="text-sm text-gray-500">Généré le: {new Date().toLocaleDateString()}</p>
              </div>

              {/* Stats Snapshot */}
              {selectedReport.statistics_snapshot && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <span className="text-xs font-medium text-slate-500 uppercase">Disciples</span>
                    <div className="text-2xl font-bold text-slate-900">
                      {selectedReport.statistics_snapshot.totalDisciples || 0}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <span className="text-xs font-medium text-slate-500 uppercase">Âmes Touchées</span>
                    <div className="text-2xl font-bold text-slate-900">
                      {selectedReport.statistics_snapshot.soulsEvangelized || 0}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <span className="text-xs font-medium text-slate-500 uppercase">Modules</span>
                    <div className="text-2xl font-bold text-slate-900">
                      {selectedReport.statistics_snapshot.modulesCompleted || 0}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <span className="text-xs font-medium text-slate-500 uppercase">Actifs</span>
                    <div className="text-2xl font-bold text-slate-900">
                      {selectedReport.statistics_snapshot.activeDisciples || 0}
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
