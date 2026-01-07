
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Users, 
  Heart, 
  Target, 
  Zap, 
  Shield, 
  ArrowRight,
  LayoutDashboard,
  Sparkles,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardHome = () => {
  const { user } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');

  const isMentor = role === 'mentor' || role === 'admin';

  // Fetch user's first name from database
  useEffect(() => {
    const fetchFirstName = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('profils')
            .select('first_name')
            .eq('id', user.id)
            .maybeSingle();
          
          if (!error && data?.first_name) {
            setFirstName(data.first_name);
          } else if (user?.user_metadata?.first_name) {
            // Fallback to user_metadata if not in profils
            setFirstName(user.user_metadata.first_name);
          }
        } catch (error) {
          console.error('Error fetching first name:', error);
          // Fallback to user_metadata
          if (user?.user_metadata?.first_name) {
            setFirstName(user.user_metadata.first_name);
          }
        }
      }
    };
    fetchFirstName();
  }, [user]);

  return (
    <div className="space-y-8 pb-20">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-950 via-purple-950 to-purple-900 border border-gray-200 shadow-lg p-8 md:p-12">
        <div className="relative z-10 max-w-3xl">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-white mb-4"
          >
            Bienvenue, <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
              {isMentor ? 'Mentor' : 'Disciple'}
            </span>
            {firstName && (
              <span className="text-white">
                {' '}{firstName}
              </span>
            )}
          </motion.h1>
          <p className="text-xl text-white/90 mb-8 leading-relaxed">
            {isMentor 
              ? "Votre espace de mentorat est prêt. Accompagnez, formez et inspirez vos disciples dès aujourd'hui."
              : "Heureux de vous voir. Continuez votre croissance spirituelle et explorez les ressources mises à votre disposition."}
          </p>
          <div className="flex gap-4">
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-12 px-6 font-semibold"
            >
              <LayoutDashboard size={20} />
              Accéder au Tableau de bord
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/menu')}
              className="border-white/30 bg-white/10 hover:bg-white/20 text-white gap-2 h-12 px-6"
            >
              <Zap size={20} />
              Menu Rapide
            </Button>
          </div>
        </div>
        
        {/* Background Decorative Circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* Role Specific Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Mission/Vision */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="text-amber-500" />
            Votre Mission
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-gray-700">
              DiscipleLife est conçu pour faciliter la <span className="text-gray-900 font-semibold">Grande Commission</span>.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-gray-600">
                <div className="mt-1 bg-green-100 p-1.5 rounded-lg text-green-600"><Users size={14} /></div>
                <span>Connectez-vous avec votre communauté spirituelle.</span>
              </li>
              <li className="flex items-start gap-3 text-gray-600">
                <div className="mt-1 bg-blue-100 p-1.5 rounded-lg text-blue-600"><BookOpen size={14} /></div>
                <span>Grandissez à travers l'enseignement et la méditation de la Parole.</span>
              </li>
              <li className="flex items-start gap-3 text-gray-600">
                <div className="mt-1 bg-pink-100 p-1.5 rounded-lg text-pink-600"><Heart size={14} /></div>
                <span>Partagez et soutenez-vous mutuellement dans la prière.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Quick Actions Explanation */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-teal-600" />
            Fonctionnalités Clés
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
             <div onClick={() => navigate(isMentor ? '/prayer-requests' : '/my-prayers')} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group">
                <Heart className="text-pink-500 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-gray-900 font-semibold mb-1">Prière</h3>
                <p className="text-xs text-gray-500">Requêtes et intercession.</p>
             </div>

             <div className="bg-white p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group">
                <FileText className="text-teal-500 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-gray-900 font-semibold mb-1">Méditation de La Parole</h3>
                <p className="text-xs text-gray-500">En Eaux Profondes.</p>
             </div>

             <div className="bg-white p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group">
                <Sparkles className="text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-gray-900 font-semibold mb-1">ImpactX</h3>
                <p className="text-xs text-gray-500">Transformation, Restauration, Caractère de Christ, Leadership.</p>
             </div>

             <div onClick={() => navigate('/ebooks')} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group">
                <BookOpen className="text-orange-500 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-gray-900 font-semibold mb-1">Livres & Ebooks</h3>
                <p className="text-xs text-gray-500">Bibliothèque d'E-books et guides.</p>
             </div>
             
             <div onClick={() => navigate('/teaching-videos')} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group">
                <Users className="text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-gray-900 font-semibold mb-1">Vidéos</h3>
                <p className="text-xs text-gray-500">Vidéos et formations spirituelles.</p>
             </div>

             <div onClick={() => navigate(isMentor ? '/circles' : '/menu')} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group">
                <Target className="text-amber-500 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-gray-900 font-semibold mb-1">Objectifs</h3>
                <p className="text-xs text-gray-500">Suivi de progression personnel.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
