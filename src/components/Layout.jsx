
import React, { useState, useEffect } from 'react';
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
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

const Layout = () => {
  const { user, signOut } = useAuth();
  const { role } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Sidebar items avec couleurs d'icônes
  const sidebarItems = [
    { label: 'Accueil', path: '/home', icon: Home, iconColor: 'text-yellow-500' },
    { label: 'Tableau de bord', path: '/dashboard', icon: LayoutDashboard, iconColor: 'text-blue-400' },
    { label: 'Suivi de Présence', path: '/attendance', icon: CalendarCheck, iconColor: 'text-blue-500' },
    { label: 'Familles de Disciples', path: '/familles', icon: Building2, iconColor: 'text-indigo-500' },
    { label: 'Évangélisation', path: '/evangelization', icon: UserPlus, iconColor: 'text-teal-500' },
    { label: 'Engagement', path: '/engagement', icon: Award, iconColor: 'text-purple-500' },
    { label: 'Transformation', path: '/transformation', icon: Heart, iconColor: 'text-pink-500' },
    { label: 'Mes Disciples', path: '/disciples', icon: User, iconColor: 'text-green-500' },
    { label: 'Cercles', path: '/circles', icon: Target, iconColor: 'text-pink-500' },
    { label: 'Requêtes de Prières', path: '/prayer-requests', icon: Heart, iconColor: 'text-pink-500' },
    { label: 'Statistiques', path: '/statistics', icon: BarChart2, iconColor: 'text-purple-500' },
    { label: 'Envoyer Rapport', path: '/send-report', icon: Send, iconColor: 'text-teal-500' },
    { label: 'E-Books', path: '/ebooks', icon: BookOpen, iconColor: 'text-orange-500' },
    { label: 'Vidéos', path: '/teaching-videos', icon: PlayCircle, iconColor: 'text-blue-500' },
  ];

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

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {sidebarItems.map((item) => {
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
                  "transition-colors",
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
      </nav>

      {/* User & Logout Area */}
      <div className="p-4 mt-auto border-t border-gray-200">
        <div 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white cursor-pointer mb-2 transition-colors"
        >
          <Avatar className="h-9 w-9 border border-gray-200">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-indigo-600 text-white text-xs">
              {getInitials(user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.user_metadata?.first_name || 'Utilisateur'}
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
           <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
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
               <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                 <X className="text-gray-600" />
               </Button>
            </div>
            <div className="h-[calc(100%-60px)]">
               <SidebarContent />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 pt-20 lg:pt-0 bg-gray-50">
        {/* Top Header (Desktop only) */}
        <header className="hidden lg:flex h-20 items-center justify-between px-8 border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-40">
           <div className="flex items-center text-gray-500 text-sm">
              <span className="opacity-60">Application</span>
              <span className="mx-2 text-gray-300">/</span>
              <span className="text-gray-900 font-medium capitalize">
                {location.pathname.split('/')[1] || 'Accueil'}
              </span>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                 <input 
                    type="text" 
                    placeholder="Rechercher..." 
                    className="h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:bg-white w-64 transition-all"
                 />
              </div>
              <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100" onClick={() => navigate('/notifications')}>
                 <Bell size={20} />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100" onClick={() => navigate('/settings')}>
                 <Settings size={20} />
              </Button>
           </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
