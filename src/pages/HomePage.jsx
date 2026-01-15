
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Users, Heart, Star, UserPlus, UserCheck, Church, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

const HomePage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: BookOpen,
      title: "Enseignement Biblique",
      description: "Accédez à des ressources profondes pour bâtir votre foi sur le roc."
    },
    {
      icon: Users,
      title: "Communauté de Disciples",
      description: "Connectez-vous avec d'autres croyants pour grandir ensemble."
    },
    {
      icon: Heart,
      title: "Croissance Spirituelle",
      description: "Suivez votre progression et voyez votre impact spirituel grandir."
    },
    {
      icon: Star,
      title: "Formation Impact X",
      description: "Devenez un leader influent dans votre sphère d'action."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950/40 via-[#0f0518] to-blue-950/40 text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 z-0" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-5xl md:text-6xl font-extrabold tracking-tight mb-8"
            >
              Bienvenue Dans les Familles de <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Disciples 70</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-gray-300 mb-10 leading-relaxed"
            >
              Bienvenue sur DiscipleLife. Une plateforme dédiée à votre transformation spirituelle. 
              Apprenez, grandissez et formez d'autres disciples à l'image de Christ.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-row justify-center gap-4 flex-nowrap"
            >
              <Button 
                onClick={() => navigate('/signup/pasteur')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-6 text-base rounded-full font-bold shadow-lg shadow-purple-500/30 transition-all hover:scale-105 whitespace-nowrap"
              >
                <Church className="mr-2" /> Pasteur Référent de Famille
              </Button>
              
              <Button 
                onClick={() => navigate('/signup/superviseur')}
                className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-6 text-base rounded-full font-bold shadow-lg shadow-amber-500/30 transition-all hover:scale-105 whitespace-nowrap"
              >
                <Building2 className="mr-2" /> Je suis Superviseur
              </Button>
              
              <Button 
                onClick={() => navigate('/signup/mentor')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-6 text-base rounded-full font-bold shadow-lg shadow-blue-500/30 transition-all hover:scale-105 whitespace-nowrap"
              >
                <UserCheck className="mr-2" /> Je suis Mentor
              </Button>
              
              <Button 
                onClick={() => navigate('/signup/disciple')}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-6 text-base rounded-full font-bold shadow-lg shadow-teal-500/30 transition-all hover:scale-105 whitespace-nowrap"
              >
                <UserPlus className="mr-2" /> Je suis Disciple
              </Button>
            </motion.div>
            
            <div className="mt-8">
                <Button 
                  variant="link" 
                  onClick={() => navigate('/auth')} 
                  className="text-gray-400 hover:text-amber-400 no-underline hover:no-underline transition-colors"
                >
                    Déjà un compte ? Se connecter
                </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-20 bg-[#1a0b2e]/50 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Ce que vous allez apprendre</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Un programme complet conçu pour vous équiper dans tous les aspects de la vie chrétienne.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-[#1a0b2e] border border-white/10 p-8 rounded-2xl hover:bg-white/5 transition-colors group"
                >
                  <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                    <Icon size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#0f0518]/80 backdrop-blur-sm py-12 border-t border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500">© 2024 DiscipleLife. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
