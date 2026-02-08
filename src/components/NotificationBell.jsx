
import React, { useState, useEffect } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { getOrSetCache } from '@/lib/CacheUtils';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationBell() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [latestNotifications, setLatestNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      try {
        setLoading(true);
        // OPTIMISATION: Utiliser le cache pour le nombre de notifications non lues (TTL: 30 secondes)
        const cacheKey = `notifications_count_${user.id}`;
        
        const count = await getOrSetCache(
          cacheKey,
          async () => {
            const { count, error } = await supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('read', false);
            if (error) throw error;
            return count || 0;
          },
          30 * 1000 // 30 secondes (données plus dynamiques)
        );
        
        setUnreadCount(count);

        // Récupérer les 3 dernières notifications non lues
        const { data: latestData } = await supabase
          .from('notifications')
          .select('id, title, content, type, created_at')
          .eq('user_id', user.id)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(3);
        
        setLatestNotifications(latestData || []);
      } catch (error) {
        console.error('Erreur récupération notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();

    // OPTIMISATION: Utiliser Supabase Realtime pour les mises à jour en temps réel
    const subscription = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Mettre à jour le compteur
          setUnreadCount(prev => prev + 1);
          
          // Ajouter la nouvelle notification en haut de la liste
          setLatestNotifications(prev => [payload.new, ...prev].slice(0, 3));
          
          // Afficher un toast pour les notifications importantes
          if (payload.new.type === 'important' || payload.new.type === 'achievement') {
            toast({
              title: payload.new.title,
              description: payload.new.content,
              duration: 5000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Si une notification est marquée comme lue, mettre à jour le compteur
          if (payload.new.read && !payload.old.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
            setLatestNotifications(prev => prev.filter(n => n.id !== payload.new.id));
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' && err) {
          if (err?.message?.includes('JWT') || err?.message?.includes('exp')) return;
          if (import.meta.env.DEV) console.warn('Realtime notifications:', err?.message || err);
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [user, toast]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'achievement': return '🏆';
      case 'message': return '💬';
      case 'approval': return '✅';
      case 'reminder': return '⏰';
      default: return '🔔';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} non lue${unreadCount > 1 ? 's' : ''})` : 'Notifications'}
        aria-expanded={showDropdown}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : (
          <>
            <Bell size={20} />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 flex h-2.5 w-2.5"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </motion.span>
            )}
          </>
        )}
      </button>

      {/* Dropdown des dernières notifications */}
      <AnimatePresence>
        {showDropdown && latestNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-200 bg-purple-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Notifications récentes</h3>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="bg-red-500 text-white">
                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {latestNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => {
                    navigate('/notifications');
                    setShowDropdown(false);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">{notification.title}</div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.content}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(notification.created_at).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <Link
                to="/notifications"
                onClick={() => setShowDropdown(false)}
                className="block text-center text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                Voir toutes les notifications →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay pour fermer le dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
