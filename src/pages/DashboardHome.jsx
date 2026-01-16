
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  BookOpen, 
  Users, 
  Heart, 
  Target, 
  Shield, 
  ArrowRight,
  LayoutDashboard,
  Sparkles,
  FileText,
  Building2,
  UserCircle,
  UserCheck,
  Church
} from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardHome = () => {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [superviseurInfo, setSuperviseurInfo] = useState({
    titre: '',
    first_name: '',
    last_name: '',
    famille_nom: ''
  });

  // Fonction pour vérifier l'accès selon le rôle
  // Règles :
  // - Superviseur : ne peut pas accéder au dashboard pasteur, mais peut accéder au dashboard mentor et disciple
  // - Mentor : ne peut pas accéder au dashboard pasteur ni au dashboard superviseur
  // - Disciple : ne peut accéder qu'à son dashboard uniquement
  const checkAccess = (targetRole) => {
    // Les admins et pasteurs ont accès à tout
    if (role === 'super_admin' || role === 'admin' || role === 'pasteur') {
      return true;
    }
    
    // Superviseur : peut accéder à son dashboard, au dashboard mentor et au dashboard disciple (pas pasteur)
    if (role === 'superviseur') {
      return targetRole === 'superviseur' || targetRole === 'mentor' || targetRole === 'disciple';
    }
    
    // Mentor : ne peut accéder qu'à son dashboard (pas pasteur, pas superviseur)
    if (role === 'mentor') {
      return targetRole === 'mentor';
    }
    
    // Disciple : ne peut accéder qu'à son dashboard uniquement
    if (role === 'disciple') {
      return targetRole === 'disciple';
    }
    
    return false;
  };

  // Fonction pour gérer la navigation avec vérification d'accès
  const handleNavigate = (targetRole, path) => {
    if (checkAccess(targetRole)) {
      navigate(path);
    } else {
      toast({
        variant: "destructive",
        title: "Accès non autorisé",
        description: `Vous n'avez pas les permissions nécessaires pour accéder au ${targetRole === 'pasteur' ? 'Dashboard Pasteur' : targetRole === 'superviseur' ? 'Dashboard Superviseur' : targetRole === 'mentor' ? 'Dashboard Mentor' : 'Dashboard Disciple'}.`
      });
    }
  };

  // Fetch user's information and family if supervisor
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (user?.id) {
        try {
          // Récupérer les informations du profil (sans titre d'abord pour éviter l'erreur si la colonne n'existe pas)
          const { data: profilData, error: profilError } = await supabase
            .from('profils')
            .select('first_name, last_name, role')
            .eq('id', user.id)
            .maybeSingle();
          
          if (!profilError && profilData) {
            setFirstName(profilData.first_name || '');
            
            // Essayer de récupérer le titre séparément si la colonne existe
            let titre = '';
            try {
              const { data: titreData, error: titreError } = await supabase
                .from('profils')
                .select('titre')
                .eq('id', user.id)
                .maybeSingle();
              
              // Si l'erreur indique que la colonne n'existe pas (code 42703), on ignore
              if (titreError) {
                if (titreError.code === '42703' || titreError.message?.includes('does not exist')) {
                  console.log('Colonne titre non disponible - Migration 058 non exécutée');
                } else {
                  console.error('Erreur lors de la récupération du titre:', titreError);
                }
              } else if (titreData) {
                titre = titreData.titre || '';
              }
            } catch (e) {
              // Ignorer l'erreur si la colonne n'existe pas
              console.log('Erreur lors de la récupération du titre (ignorée):', e.message);
            }
            
            // Si c'est un superviseur, récupérer aussi le nom de la famille
            if (profilData.role === 'superviseur') {
              const { data: familleData, error: familleError } = await supabase
                .from('familles_disciples')
                .select('nom')
                .eq('superviseur_id', user.id)
                .maybeSingle();
              
              const superviseurData = {
                titre: titre || '',
                first_name: profilData.first_name || '',
                last_name: profilData.last_name || '',
                famille_nom: familleData?.nom || ''
              };
              
              console.log('Superviseur info chargée:', superviseurData);
              setSuperviseurInfo(superviseurData);
            }
          } else if (user?.user_metadata?.first_name) {
            // Fallback to user_metadata if not in profils
            setFirstName(user.user_metadata.first_name);
          }
        } catch (error) {
          console.error('Error fetching user info:', error);
          // Fallback to user_metadata
          if (user?.user_metadata?.first_name) {
            setFirstName(user.user_metadata.first_name);
          }
        }
      }
    };
    fetchUserInfo();
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
            {(() => {
              const isSuperviseur = role === 'superviseur';
              const prenom = superviseurInfo.first_name || firstName || '';
              const nom = superviseurInfo.last_name || '';
              const titre = superviseurInfo.titre || '';
              const famille = superviseurInfo.famille_nom || '';
              const hasData = prenom || nom;
              
              console.log('DashboardHome - role:', role, 'superviseurInfo:', superviseurInfo, 'firstName:', firstName, 'hasData:', hasData);
              
              if (isSuperviseur && hasData) {
                const nomComplet = `${prenom} ${nom}`.trim();
                return (
                  <>
                    Bienvenue, {titre ? `${titre} ` : ''}{nomComplet}, vous êtes le Superviseur{famille ? (
                      <>, en charge de la Famille "<span className="text-amber-400">{famille}</span>"</>
                    ) : ''}
                  </>
                );
              }
              return <>Bienvenue{firstName && `, ${firstName}`}</>;
            })()}
          </motion.h1>
          <p className="text-xl text-white/90 mb-8 leading-relaxed">
            {role === 'superviseur' ? (
              'Gérez votre famille de disciples et suivez leur progression spirituelle.'
            ) : (
              'Accédez à votre espace de travail selon votre rôle.'
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={() => handleNavigate('pasteur', '/space/pasteur')} 
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2 h-14 px-6 font-semibold flex-1"
            >
              <Church size={24} />
              Dashboard Pasteur
            </Button>
            <Button 
              onClick={() => handleNavigate('superviseur', '/space/superviseur')} 
              className="bg-amber-500 hover:bg-amber-600 text-white gap-2 h-14 px-6 font-semibold flex-1"
            >
              <Building2 size={24} />
              Dashboard Superviseur
            </Button>
            <Button 
              onClick={() => handleNavigate('mentor', '/space/mentor')} 
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-14 px-6 font-semibold flex-1"
            >
              <UserCheck size={24} />
              Dashboard Mentor
            </Button>
            <Button 
              onClick={() => handleNavigate('disciple', '/space/disciple')} 
              className="bg-green-600 hover:bg-green-700 text-white gap-2 h-14 px-6 font-semibold flex-1"
            >
              <UserCircle size={24} />
              Dashboard Disciple
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
             <div onClick={() => navigate('/prayer-requests')} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group">
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

             <div onClick={() => navigate('/circles')} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group">
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
