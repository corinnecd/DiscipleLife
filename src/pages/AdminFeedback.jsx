
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Loader2,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';

const ITEMS_PER_PAGE = 20;

const AdminFeedback = () => {
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modal State
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchFeedbacks();
  }, [currentPage, typeFilter, statusFilter, priorityFilter, sortBy, sortOrder, searchQuery]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('feedback')
        .select(`
          *,
          user:user_id (first_name, last_name, email)
        `, { count: 'exact' })
        .eq('is_deleted', false); // Soft delete check

      if (typeFilter !== 'all') query = query.eq('type', typeFilter);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (priorityFilter !== 'all') query = query.eq('priority', priorityFilter);
      
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      setFeedbacks(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les feedbacks."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ status: newStatus, updated_at: new Date() })
        .eq('id', id);

      if (error) throw error;

      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
      if (selectedFeedback?.id === id) {
        setSelectedFeedback(prev => ({ ...prev, status: newStatus }));
      }
      
      toast({
        title: "Statut mis à jour",
        description: `Le feedback est maintenant marqué comme ${newStatus}.`,
        className: "bg-green-600 text-white border-none"
      });
    } catch (error) {
      handleError(error, { context: 'handleStatusChange', feedbackId: id }, "Impossible de mettre à jour le statut.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePriorityChange = async (id, newPriority) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ priority: newPriority, updated_at: new Date() })
        .eq('id', id);

      if (error) throw error;

      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, priority: newPriority } : f));
       if (selectedFeedback?.id === id) {
        setSelectedFeedback(prev => ({ ...prev, priority: newPriority }));
      }
      
      toast({
        title: "Priorité mise à jour",
        description: `Priorité changée à ${newPriority}.`,
        className: "bg-blue-600 text-white border-none"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de changer la priorité."
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce feedback ?")) return;

    setUpdatingId(id);
    try {
      // Soft delete
      const { error } = await supabase
        .from('feedback')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) throw error;

      setFeedbacks(prev => prev.filter(f => f.id !== id));
      setIsDetailOpen(false);
      
      toast({
        title: "Supprimé",
        description: "Le feedback a été supprimé.",
        className: "bg-gray-800 text-white border-gray-700"
      });
    } catch (error) {
      handleError(error, { context: 'handleDelete', feedbackId: id }, "Impossible de supprimer le feedback.");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Nouveau</Badge>;
      case 'in_review': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">En cours</Badge>;
      case 'planned': return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Planifié</Badge>;
      case 'completed': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Terminé</Badge>;
      case 'rejected': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejeté</Badge>;
      default: return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const getPriorityBadge = (priority) => {
     switch (priority) {
      case 'high': return <Badge variant="destructive" className="bg-red-900/50 text-red-200">Haute</Badge>;
      case 'medium': return <Badge variant="secondary" className="bg-yellow-900/50 text-yellow-200">Moyenne</Badge>;
      case 'low': return <Badge variant="outline" className="bg-green-900/50 text-green-200 border-green-800">Basse</Badge>;
      default: return null;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'bug': return <AlertTriangle size={16} className="text-red-400" />;
      case 'feature': return <CheckCircle size={16} className="text-purple-400" />;
      case 'improvement': return <Clock size={16} className="text-blue-400" />;
      default: return <MessageSquare size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="text-pink-500" /> Gestion des Feedbacks
           </h1>
           <p className="text-gray-400 text-sm">Gérez les retours utilisateurs, bugs et suggestions.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1a0b2e] p-4 rounded-xl border border-white/10 flex flex-col lg:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
               placeholder="Rechercher..." 
               className="pl-10 bg-black/20 border-white/10 text-white"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
            />
         </div>
         
         <div className="flex flex-wrap gap-2 w-full lg:w-auto">
           <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] bg-black/20 border-white/10 text-white">
                 <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="all">Tous types</SelectItem>
                 <SelectItem value="bug">Bug</SelectItem>
                 <SelectItem value="feature">Fonctionnalité</SelectItem>
                 <SelectItem value="improvement">Amélioration</SelectItem>
                 <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
           </Select>

           <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-black/20 border-white/10 text-white">
                 <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="all">Tous statuts</SelectItem>
                 <SelectItem value="new">Nouveau</SelectItem>
                 <SelectItem value="in_review">En cours</SelectItem>
                 <SelectItem value="planned">Planifié</SelectItem>
                 <SelectItem value="completed">Terminé</SelectItem>
                 <SelectItem value="rejected">Rejeté</SelectItem>
              </SelectContent>
           </Select>

           <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px] bg-black/20 border-white/10 text-white">
                 <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="all">Toutes priorités</SelectItem>
                 <SelectItem value="high">Haute</SelectItem>
                 <SelectItem value="medium">Moyenne</SelectItem>
                 <SelectItem value="low">Basse</SelectItem>
              </SelectContent>
           </Select>
         </div>
      </div>

      {/* List */}
      <Card className="bg-[#1a0b2e] border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-black/20 text-xs uppercase font-medium text-gray-500">
               <tr>
                 <th className="p-4">Date</th>
                 <th className="p-4">Type</th>
                 <th className="p-4">Titre</th>
                 <th className="p-4">Utilisateur</th>
                 <th className="p-4">Priorité</th>
                 <th className="p-4">Statut</th>
                 <th className="p-4 text-right">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                   <td colSpan="7" className="p-8 text-center">
                      <Loader2 className="animate-spin h-8 w-8 text-purple-500 mx-auto" />
                   </td>
                </tr>
              ) : feedbacks.length === 0 ? (
                <tr>
                   <td colSpan="7" className="p-8 text-center italic">Aucun feedback trouvé.</td>
                </tr>
              ) : (
                feedbacks.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                       {format(new Date(item.created_at), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="p-4">
                       <div className="flex items-center gap-2 text-white capitalize">
                          {getTypeIcon(item.type)} {item.type}
                       </div>
                    </td>
                    <td className="p-4 font-medium text-white max-w-[200px] truncate">
                       {item.title}
                    </td>
                    <td className="p-4">
                       <span className="block text-white">{item.user?.first_name} {item.user?.last_name}</span>
                       <span className="text-xs text-gray-500">{item.user?.email}</span>
                    </td>
                    <td className="p-4">
                       {getPriorityBadge(item.priority)}
                    </td>
                    <td className="p-4">
                       {getStatusBadge(item.status)}
                    </td>
                    <td className="p-4 text-right">
                       <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                            onClick={() => {
                              setSelectedFeedback(item);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye size={16} />
                          </Button>
                          
                          <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                                   <MoreVertical size={16} />
                                </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent className="bg-[#1f1135] border-white/10 text-white">
                                <DropdownMenuLabel>Changer statut</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'new')}>Nouveau</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'in_review')}>En cours</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'completed')}>Terminé</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'rejected')}>Rejeté</DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem className="text-red-400 hover:text-red-300" onClick={() => handleDelete(item.id)}>
                                   <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                </DropdownMenuItem>
                             </DropdownMenuContent>
                          </DropdownMenu>
                       </div>
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
        <div className="flex justify-between items-center bg-[#1a0b2e] p-4 rounded-xl border border-white/10">
           <div className="text-sm text-gray-400">
              Page {currentPage} sur {totalPages}
           </div>
           <div className="flex gap-2">
              <Button 
                 variant="outline" 
                 size="sm" 
                 disabled={currentPage === 1}
                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                 className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
              >
                 <ChevronLeft size={16} /> Précédent
              </Button>
              <Button 
                 variant="outline" 
                 size="sm" 
                 disabled={currentPage === totalPages}
                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                 className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
              >
                 Suivant <ChevronRight size={16} />
              </Button>
           </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="bg-[#1a0b2e] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedFeedback && (
            <>
              <DialogHeader>
                 <div className="flex justify-between items-start">
                    <div>
                       <DialogTitle className="text-xl mb-1">{selectedFeedback.title}</DialogTitle>
                       <DialogDescription className="text-gray-400">
                          ID: {selectedFeedback.id}
                       </DialogDescription>
                    </div>
                    {getStatusBadge(selectedFeedback.status)}
                 </div>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                 <div className="flex flex-wrap gap-4 text-sm text-gray-400 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                       <span className="text-white font-medium">Type:</span> 
                       <span className="capitalize">{selectedFeedback.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-white font-medium">Priorité:</span> 
                       {getPriorityBadge(selectedFeedback.priority)}
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-white font-medium">Date:</span> 
                       {format(new Date(selectedFeedback.created_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                 </div>

                 <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-white">Description</h4>
                    <div className="p-4 bg-black/20 rounded-lg text-gray-300 whitespace-pre-wrap text-sm leading-relaxed border border-white/5">
                       {selectedFeedback.description}
                    </div>
                 </div>

                 {selectedFeedback.attachment_url && (
                    <div className="space-y-2">
                       <h4 className="text-sm font-semibold text-white">Pièce jointe</h4>
                       <div className="rounded-lg overflow-hidden border border-white/10 max-h-[300px] w-full bg-black/40 flex items-center justify-center">
                          <img 
                            src={selectedFeedback.attachment_url} 
                            alt="Attachment" 
                            className="max-w-full max-h-[300px] object-contain" 
                          />
                       </div>
                    </div>
                 )}

                 <div className="space-y-2 pt-4 border-t border-white/10">
                    <h4 className="text-sm font-semibold text-white mb-2">Actions Rapides</h4>
                    <div className="flex flex-wrap gap-3">
                       <div className="space-y-1">
                          <span className="text-xs text-gray-500 block">Changer statut</span>
                          <Select 
                             value={selectedFeedback.status} 
                             onValueChange={(val) => handleStatusChange(selectedFeedback.id, val)}
                          >
                             <SelectTrigger className="w-[150px] bg-black/20 border-white/10 text-white h-8 text-xs">
                                <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                                <SelectItem value="new">Nouveau</SelectItem>
                                <SelectItem value="in_review">En cours</SelectItem>
                                <SelectItem value="planned">Planifié</SelectItem>
                                <SelectItem value="completed">Terminé</SelectItem>
                                <SelectItem value="rejected">Rejeté</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>

                       <div className="space-y-1">
                          <span className="text-xs text-gray-500 block">Changer priorité</span>
                          <Select 
                             value={selectedFeedback.priority} 
                             onValueChange={(val) => handlePriorityChange(selectedFeedback.id, val)}
                          >
                             <SelectTrigger className="w-[150px] bg-black/20 border-white/10 text-white h-8 text-xs">
                                <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                                <SelectItem value="low">Basse</SelectItem>
                                <SelectItem value="medium">Moyenne</SelectItem>
                                <SelectItem value="high">Haute</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                    </div>
                 </div>
              </div>

              <DialogFooter>
                 <Button 
                   variant="destructive" 
                   onClick={() => handleDelete(selectedFeedback.id)}
                   className="gap-2 bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-900"
                 >
                    <Trash2 size={16} /> Supprimer
                 </Button>
                 <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="border-white/10 text-white hover:bg-white/5">
                    Fermer
                 </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFeedback;
