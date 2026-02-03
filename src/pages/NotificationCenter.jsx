
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';
import { 
  Loader2, 
  Search, 
  Trash2, 
  Check, 
  CheckCheck,
  Bell, 
  Trophy, 
  MessageCircle, 
  Clock, 
  CheckCircle,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Helmet } from 'react-helmet';

const NotificationCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Filters & Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 15;
  
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchNotifications();
      setupRealtimeSubscription();
    }
    
    return () => {
      supabase.channel('notifications_center_channel').unsubscribe();
    };
  }, [user, currentPage, typeFilter, readFilter, searchQuery]); // Re-fetch on filter change

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Filters
      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }
      
      if (readFilter === 'read') {
        query = query.eq('read', true);
      } else if (readFilter === 'unread') {
        query = query.eq('read', false);
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

      setNotifications(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));

    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger vos notifications."
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    supabase
      .channel('notifications_center_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Add new notification to top if it matches current filters
          setNotifications((prev) => [payload.new, ...prev]);
          toast({
            title: payload.new.title,
            description: payload.new.content,
            className: "bg-blue-50 border-blue-200"
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' && err) {
          if (err?.message?.includes('JWT') || err?.message?.includes('exp')) return;
          console.warn('Realtime notifications:', err?.message || err);
        }
      });
  };

  const getIcon = (type) => {
    switch (type) {
      case 'achievement': return <Trophy className="h-5 w-5 text-amber-500" />;
      case 'message': return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case 'approval': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'reminder': return <Clock className="h-5 w-5 text-purple-500" />;
      default: return <Bell className="h-5 w-5 text-slate-500" />;
    }
  };

  const markAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error("Error marking as read", error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast({ description: "Notification supprimée" });
    } catch (error) {
      console.error("Error deleting notification", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast({ description: "Toutes les notifications marquées comme lues" });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue." });
    } finally {
      setActionLoading(false);
    }
  };

  const clearAllNotifications = async () => {
    if (!window.confirm("Voulez-vous vraiment supprimer TOUTES vos notifications ? Cette action est irréversible.")) return;

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      
      setNotifications([]);
      setTotalPages(1);
      toast({ description: "Toutes les notifications ont été supprimées" });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    // Search is triggered by effect when searchQuery changes
  };

  return (
    <div className="container max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <Helmet>
        <title>Notifications | DiscipleLife</title>
      </Helmet>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Centre de Notifications</h1>
          <p className="text-slate-500">Restez informé de votre progression et des nouvelles.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={actionLoading || notifications.length === 0}>
                <CheckCheck className="h-4 w-4 mr-2" /> Tout marquer comme lu
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={clearAllNotifications} disabled={actionLoading || notifications.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" /> Tout effacer
            </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center">
        <form onSubmit={handleSearch} className="flex-1 w-full relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher dans les notifications..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
        </form>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              <SelectItem value="achievement">Succès</SelectItem>
              <SelectItem value="message">Messages</SelectItem>
              <SelectItem value="approval">Approbations</SelectItem>
              <SelectItem value="reminder">Rappels</SelectItem>
            </SelectContent>
          </Select>

          <Select value={readFilter} onValueChange={setReadFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="État" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tout</SelectItem>
              <SelectItem value="unread">Non lus</SelectItem>
              <SelectItem value="read">Lus</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-slate-300" />
             </div>
             <h3 className="text-lg font-medium text-slate-900">Aucune notification</h3>
             <p className="text-slate-500">Vous êtes à jour ! Aucune nouvelle notification pour le moment.</p>
             {searchQuery && <p className="text-sm text-slate-400 mt-2">(Essayez de modifier vos filtres de recherche)</p>}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
             {notifications.map((notification) => (
               <div 
                 key={notification.id} 
                 className={`p-4 md:p-6 flex gap-4 transition-colors hover:bg-slate-50 group ${!notification.read ? 'bg-blue-50/40' : ''}`}
               >
                 <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${!notification.read ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'bg-slate-100'}`}>
                    {getIcon(notification.type)}
                 </div>
                 
                 <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-4 mb-1">
                       <h3 className={`text-base ${!notification.read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                         {notification.title}
                       </h3>
                       <span className="text-xs text-slate-500 shrink-0 whitespace-nowrap">
                         {format(new Date(notification.created_at), "d MMMM 'à' HH:mm", { locale: fr })}
                       </span>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed mb-3">{notification.content}</p>
                    
                    <div className="flex items-center gap-3">
                        {!notification.read && (
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             className="h-7 text-xs px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                             onClick={() => markAsRead(notification.id)}
                           >
                             <Check className="h-3 w-3 mr-1" /> Marquer comme lu
                           </Button>
                        )}
                        <Button 
                             variant="ghost" 
                             size="sm" 
                             className="h-7 text-xs px-2 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                             onClick={() => deleteNotification(notification.id)}
                           >
                             <Trash2 className="h-3 w-3 mr-1" /> Supprimer
                           </Button>
                    </div>
                 </div>
                 
                 {!notification.read && (
                    <div className="shrink-0 self-center">
                        <span className="block w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    </div>
                 )}
               </div>
             ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>
              <span className="text-sm font-medium px-4">Page {currentPage} / {totalPages}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant
              </Button>
          </div>
        )}
      </div>

      <div className="flex justify-center pt-8 border-t border-slate-100">
         <Link to="/settings" className="text-sm text-slate-500 hover:text-primary flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Gérer mes préférences de notification
         </Link>
      </div>
    </div>
  );
};

export default NotificationCenter;
