
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  History, 
  Search, 
  Download, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExportUtils } from '@/lib/ExportUtils';

const LOGS_PER_PAGE = 50;

const AdminActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [dateSort, setDateSort] = useState('newest');

  // Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, searchQuery, actionFilter, entityFilter, dateSort]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('admin_logs')
        .select(`
            *,
            admin:admin_id (first_name, last_name, email)
        `, { count: 'exact' });

      // Filters
      if (searchQuery) {
        query = query.or(`entity_name.ilike.%${searchQuery}%,action.ilike.%${searchQuery}%`);
      }

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (entityFilter !== 'all') {
        query = query.eq('entity_type', entityFilter);
      }

      // Sorting
      query = query.order('created_at', { ascending: dateSort === 'oldest' });

      // Pagination
      const from = (currentPage - 1) * LOGS_PER_PAGE;
      const to = from + LOGS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      setLogs(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / LOGS_PER_PAGE));

    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const exportData = logs.map(log => ({
        Date: new Date(log.created_at).toLocaleString(),
        Admin: `${log.admin?.first_name || ''} ${log.admin?.last_name || ''} (${log.admin?.email || 'N/A'})`,
        Action: log.action,
        'Type Entité': log.entity_type,
        'Nom Entité': log.entity_name,
        'ID Entité': log.entity_id,
        'Ancienne Valeur': log.old_value ? JSON.stringify(log.old_value) : '',
        'Nouvelle Valeur': log.new_value ? JSON.stringify(log.new_value) : ''
      }));

      ExportUtils.exportToExcel(exportData, `admin_logs_${format(new Date(), 'yyyy-MM-dd')}`);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Une erreur est survenue lors de l'exportation.");
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'create': return 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30';
      case 'update': return 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30';
      case 'delete': return 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30';
      case 'approve': return 'bg-teal-500/20 text-teal-700 dark:text-teal-400 border-teal-500/30';
      case 'reject': return 'bg-pink-500/20 text-pink-700 dark:text-pink-400 border-pink-500/30';
      default: return 'bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30';
    }
  };

  const viewDetails = (log) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <History className="text-yellow-500 dark:text-yellow-400" /> Journal d'Activités Admin
           </h1>
           <p className="text-gray-500 dark:text-gray-400 text-sm">Suivi des actions administratives et de modération.</p>
        </div>
        <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm">
           <Download size={18} /> Exporter CSV
        </Button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-[#1a0b2e] p-4 rounded-xl border border-gray-200 dark:border-white/10 flex flex-col md:flex-row gap-4 items-center shadow-sm">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
               placeholder="Rechercher par nom d'entité ou action..." 
               className="pl-10 bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
            />
         </div>
         
         <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full md:w-[180px] bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
               <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
               <SelectItem value="all">Toutes actions</SelectItem>
               <SelectItem value="create">Création</SelectItem>
               <SelectItem value="update">Mise à jour</SelectItem>
               <SelectItem value="delete">Suppression</SelectItem>
               <SelectItem value="approve">Approbation</SelectItem>
               <SelectItem value="reject">Rejet</SelectItem>
            </SelectContent>
         </Select>

         <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-full md:w-[180px] bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
               <SelectValue placeholder="Type Entité" />
            </SelectTrigger>
            <SelectContent>
               <SelectItem value="all">Tout type</SelectItem>
               <SelectItem value="user">Utilisateur</SelectItem>
               <SelectItem value="testimony">Témoignage</SelectItem>
               <SelectItem value="resource">Ressource</SelectItem>
               <SelectItem value="access_code">Code Accès</SelectItem>
            </SelectContent>
         </Select>

         <Select value={dateSort} onValueChange={setDateSort}>
            <SelectTrigger className="w-full md:w-[180px] bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
               <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
               <SelectItem value="newest">Plus récent</SelectItem>
               <SelectItem value="oldest">Plus ancien</SelectItem>
            </SelectContent>
         </Select>
      </div>

      {/* Logs Table */}
      <Card className="bg-white dark:bg-[#1a0b2e] border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
               <thead className="bg-gray-50 dark:bg-black/20 text-xs uppercase font-medium text-gray-500">
                  <tr>
                     <th className="p-4">Date</th>
                     <th className="p-4">Admin</th>
                     <th className="p-4">Action</th>
                     <th className="p-4">Entité</th>
                     <th className="p-4">Détail</th>
                     <th className="p-4 text-right">Options</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {loading ? (
                     <tr>
                        <td colSpan="6" className="p-8 text-center">
                           <Loader2 className="animate-spin h-8 w-8 text-purple-500 mx-auto" />
                        </td>
                     </tr>
                  ) : logs.length === 0 ? (
                     <tr>
                        <td colSpan="6" className="p-8 text-center italic">Aucune activité trouvée pour ces filtres.</td>
                     </tr>
                  ) : (
                     logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                           <td className="p-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                 <span className="text-gray-900 dark:text-white">{format(new Date(log.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                                 <span className="text-xs text-gray-500">{format(new Date(log.created_at), 'HH:mm')}</span>
                              </div>
                           </td>
                           <td className="p-4">
                              <div className="flex items-center gap-2">
                                 <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-xs text-purple-700 dark:text-purple-200 border border-purple-200 dark:border-purple-500/30">
                                    {log.admin?.first_name?.charAt(0) || 'A'}
                                 </div>
                                 <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                                    {log.admin?.first_name} {log.admin?.last_name}
                                 </span>
                              </div>
                           </td>
                           <td className="p-4">
                              <Badge variant="outline" className={getActionColor(log.action)}>
                                 {log.action}
                              </Badge>
                           </td>
                           <td className="p-4">
                              <div className="flex flex-col">
                                 <span className="text-gray-900 dark:text-white font-medium">{log.entity_type}</span>
                                 <span className="text-xs text-gray-500 truncate max-w-[150px]">{log.entity_name || log.entity_id}</span>
                              </div>
                           </td>
                           <td className="p-4">
                              <span className="text-xs text-gray-500 font-mono truncate max-w-[200px] block">
                                 {log.new_value ? JSON.stringify(log.new_value).substring(0, 30) + '...' : '-'}
                              </span>
                           </td>
                           <td className="p-4 text-right">
                              <Button size="sm" variant="ghost" className="hover:text-purple-600 dark:hover:text-white" onClick={() => viewDetails(log)}>
                                 <Eye size={16} />
                              </Button>
                           </td>
                        </tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>
      </Card>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
         <div className="flex justify-between items-center bg-white dark:bg-[#1a0b2e] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400">
               Page {currentPage} sur {totalPages} ({totalCount} entrées)
            </div>
            <div className="flex gap-2">
               <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
               >
                  <ChevronLeft size={16} /> Précédent
               </Button>
               <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
               >
                  Suivant <ChevronRight size={16} />
               </Button>
            </div>
         </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
         <DialogContent className="bg-white dark:bg-[#1a0b2e] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white max-w-2xl">
            <DialogHeader>
               <DialogTitle>Détail de l'activité</DialogTitle>
               <DialogDescription className="text-gray-500 dark:text-gray-400">
                  ID: {selectedLog?.id}
               </DialogDescription>
            </DialogHeader>
            
            {selectedLog && (
               <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                     <div>
                        <span className="text-gray-500 block">Admin</span>
                        <span className="text-gray-900 dark:text-white font-medium">{selectedLog.admin?.first_name} {selectedLog.admin?.last_name}</span>
                        <span className="text-gray-500 text-xs block">{selectedLog.admin?.email}</span>
                     </div>
                     <div>
                        <span className="text-gray-500 block">Date</span>
                        <span className="text-gray-900 dark:text-white">{format(new Date(selectedLog.created_at), 'dd MMM yyyy à HH:mm:ss')}</span>
                     </div>
                     <div>
                        <span className="text-gray-500 block">Action</span>
                        <Badge variant="outline" className={getActionColor(selectedLog.action)}>{selectedLog.action}</Badge>
                     </div>
                     <div>
                        <span className="text-gray-500 block">Entité</span>
                        <span className="text-gray-900 dark:text-white">{selectedLog.entity_type}: {selectedLog.entity_name}</span>
                     </div>
                     <div className="col-span-2">
                         <span className="text-gray-500 block">User Agent</span>
                         <span className="text-xs text-gray-400 font-mono break-all">{selectedLog.user_agent || 'N/A'}</span>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Ancienne Valeur</h4>
                          <div className="bg-gray-100 dark:bg-black/30 rounded p-3 text-xs font-mono text-gray-600 dark:text-gray-300 overflow-auto max-h-[200px] border border-gray-200 dark:border-white/5">
                              {selectedLog.old_value ? (
                                  <pre>{JSON.stringify(selectedLog.old_value, null, 2)}</pre>
                              ) : (
                                  <span className="text-gray-500 dark:text-gray-600 italic">Aucune donnée précédente</span>
                              )}
                          </div>
                      </div>
                      <div className="space-y-2">
                          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Nouvelle Valeur</h4>
                          <div className="bg-gray-100 dark:bg-black/30 rounded p-3 text-xs font-mono text-green-600 dark:text-green-400 overflow-auto max-h-[200px] border border-gray-200 dark:border-white/5">
                              {selectedLog.new_value ? (
                                  <pre>{JSON.stringify(selectedLog.new_value, null, 2)}</pre>
                              ) : (
                                  <span className="text-gray-500 dark:text-gray-600 italic">Aucune nouvelle donnée</span>
                              )}
                          </div>
                      </div>
                  </div>
               </div>
            )}
         </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminActivityLog;
