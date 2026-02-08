
import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Home, 
  LayoutDashboard, 
  User, 
  Target, 
  Heart, 
  BarChart2, 
  Send, 
  Users, 
  BookOpen, 
  PlayCircle, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Search, 
  Settings, 
  CalendarCheck,
  UserPlus,
  Award,
  Building2,
  GitBranch
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';

const Layout = () => {
  const { user, signOut } = useAuth();
  const { role } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  // Récupérer le profil complet de l'utilisateur
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('profils')
            .select('first_name, last_name, avatar_url')
            .eq('id', user.id)
            .maybeSingle();
          
          if (!error && data) {
            setUserProfile(data);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération du profil:', error);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Sidebar items avec couleurs d'icônes et regroupements
  // roles: tableau des rôles autorisés ; si absent = visible par tous
  // group: catégorie pour regrouper les items
  const allSidebarItems = [
    { label: 'Accueil', path: '/home', icon: Home, iconColor: 'text-yellow-500', group: 'general' },
    { label: 'Tableau de bord', path: '/dashboard', icon: LayoutDashboard, iconColor: 'text-blue-400', group: 'general' },
    { label: 'Suivi de Présence', path: '/attendance', icon: CalendarCheck, iconColor: 'text-blue-500', group: 'community' },
    { label: 'Familles de Disciples', path: '/familles', icon: Building2, iconColor: 'text-indigo-500', group: 'community', roles: ['superviseur', 'pasteur', 'admin', 'super_admin'] },
    { label: 'Arbre généalogique', path: '/arbre-genealogique', icon: GitBranch, iconColor: 'text-amber-600', group: 'community', roles: ['superviseur', 'pasteur', 'admin', 'super_admin'] },
    { label: 'Mes Disciples', path: '/disciples', icon: User, iconColor: 'text-green-500', group: 'community', roles: ['mentor', 'superviseur', 'pasteur', 'admin', 'super_admin'] },
    { label: 'Cercles', path: '/circles', icon: Target, iconColor: 'text-pink-500', group: 'community' },
    { label: 'Requêtes de Prières', path: '/prayer-requests', icon: Heart, iconColor: 'text-pink-500', group: 'community' },
    { label: 'Évangélisation', path: '/evangelization', icon: UserPlus, iconColor: 'text-teal-500', group: 'formation' },
    { label: 'Engagement', path: '/engagement', icon: Award, iconColor: 'text-purple-500', group: 'formation' },
    { label: 'Transformation', path: '/transformation', icon: Heart, iconColor: 'text-pink-500', group: 'formation' },
    { label: 'E-Books', path: '/ebooks', icon: BookOpen, iconColor: 'text-orange-500', group: 'formation' },
    { label: 'Vidéos', path: '/teaching-videos', icon: PlayCircle, iconColor: 'text-blue-500', group: 'formation' },
    { label: 'Statistiques', path: '/statistics', icon: BarChart2, iconColor: 'text-purple-500', group: 'reports', roles: ['mentor', 'superviseur', 'pasteur', 'admin', 'super_admin'] },
    { label: 'Envoyer Rapport', path: '/send-report', icon: Send, iconColor: 'text-teal-500', group: 'reports', roles: ['mentor', 'superviseur', 'pasteur', 'admin', 'super_admin'] },
  ];

  // Filtrer selon le rôle
  const effectiveRole = role || 'disciple';
  const sidebarItems = allSidebarItems.filter(
    (item) => !item.roles || item.roles.includes(effectiveRole)
  );

  // Regrouper par catégorie (afficher seulement les groupes qui ont des items)
  const groupLabels = {
    general: 'Général',
    community: 'Communauté',
    formation: 'Formation',
    reports: 'Rapports'
  };
  const groupsOrder = ['general', 'community', 'formation', 'reports'];
  const groupedItems = groupsOrder.reduce((acc, groupKey) => {
    const items = sidebarItems.filter((i) => i.group === groupKey);
    if (items.length > 0) acc.push({ key: groupKey, label: groupLabels[groupKey], items });
    return acc;
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
      {/* Logo Area */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
          <span className="text-white font-bold text-xl">D</span>
        </div>
        <span className="text-xl font-bold text-gray-800">
          DiscipleLife
        </span>
      </div>

      {/* Navigation Items - regroupés par catégorie */}
      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        {groupedItems.map((group) => (
          <div key={group.key} className="space-y-1">
            <p className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group",
                      isActive 
                        ? "bg-white text-gray-900 font-medium shadow-sm border border-gray-200" 
                        : "text-gray-700 hover:text-gray-900 hover:bg-white"
                    )}
                  >
                    <item.icon 
                      size={20} 
                      className={cn(
                        "transition-colors shrink-0",
                        isActive ? item.iconColor : item.iconColor
                      )} 
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User & Logout Area */}
      <div className="p-4 mt-auto border-t border-gray-200">
        <div 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white cursor-pointer mb-2 transition-colors"
        >
          <Avatar className="h-9 w-9 border border-gray-200">
            <AvatarImage src={userProfile?.avatar_url || user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-indigo-600 text-white text-xs">
              {getInitials(userProfile?.first_name && userProfile?.last_name 
                ? `${userProfile.first_name} ${userProfile.last_name}` 
                : user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {userProfile?.first_name && userProfile?.last_name
                ? `${userProfile.first_name} ${userProfile.last_name}`
                : userProfile?.first_name || user?.user_metadata?.first_name || 'Utilisateur'}
            </p>
            <p className="text-xs text-gray-500 truncate">{role || 'Disciple'}</p>
            {user?.email && (
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            )}
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Se déconnecter</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-screen sticky top-0 z-50">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)} aria-label="Ouvrir le menu">
             <Menu className="text-gray-700" />
           </Button>
           <span className="font-bold text-gray-800">DiscipleLife</span>
        </div>
        <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8" onClick={() => navigate('/profile')}>
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-indigo-600 text-xs">
                 {getInitials(user?.email)}
              </AvatarFallback>
            </Avatar>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[80%] max-w-sm bg-gray-50 border-r border-gray-200 shadow-2xl">
            <div className="p-4 flex justify-end">
               <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} aria-label="Fermer le menu">
                 <X className="text-gray-600" />
               </Button>
            </div>
            <div className="h-[calc(100%-60px)]">
               <SidebarContent />
            </div>
          </div>
        </div>
      )}

      {/* Main Content - scrollable pour éviter que le bas du dashboard soit tronqué */}
      <main className="flex-1 min-w-0 min-h-0 flex flex-col pt-20 lg:pt-0 bg-gray-50 dark:bg-gray-50">
        {/* Top Header (Desktop only) */}
        <header className="hidden lg:flex shrink-0 h-20 items-center justify-between px-4 lg:px-6 border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-40">
           <div className="flex items-center text-gray-500 text-sm">
              <span className="opacity-60">Application</span>
              <span className="mx-2 text-gray-300">/</span>
              <span className="text-gray-900 font-medium capitalize">
                {location.pathname.split('/')[1] || 'Accueil'}
              </span>
           </div>
           
           <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={() => setShowGlobalSearch(!showGlobalSearch)}
                aria-label="Recherche globale"
              >
                 <Search size={20} />
              </Button>
              <NotificationBell />
              <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100" onClick={() => navigate('/settings')} aria-label="Paramètres">
                 <Settings size={20} />
              </Button>
           </div>
        </header>

        {/* Global Search Modal */}
        {showGlobalSearch && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowGlobalSearch(false)}>
            <div className="w-full max-w-2xl animate-in fade-in slide-in-from-top duration-300" onClick={(e) => e.stopPropagation()}>
              <GlobalSearch onClose={() => setShowGlobalSearch(false)} />
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full px-3 md:px-4 lg:px-6 py-4 md:py-5 animate-in fade-in duration-500 bg-gray-50 dark:bg-gray-50 pb-24">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Chargement...</span>
              </div>
            </div>
          }>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default Layout;
