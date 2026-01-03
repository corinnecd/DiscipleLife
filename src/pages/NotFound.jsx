
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Home, LayoutDashboard, Map, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Page Introuvable | DiscipleLife</title>
      </Helmet>

      <div className="min-h-screen bg-[#0f0518] flex items-center justify-center p-4 overflow-hidden relative">
        {/* Background blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[128px]" />

        <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-[150px] font-bold text-white/10 leading-none select-none">404</h1>
            <div className="mt-[-80px]">
               <Map size={80} className="mx-auto text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
               <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                 Vous semblez perdu...
               </h2>
               <p className="text-slate-400 text-lg max-w-md mx-auto">
                 La page que vous recherchez n'existe pas ou a été déplacée. Revenons sur le droit chemin.
               </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8"
          >
            <Button 
              onClick={() => navigate(-1)}
              variant="outline" 
              className="w-full sm:w-auto border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>

            <Button 
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Tableau de bord
            </Button>
            
            <Button 
              onClick={() => navigate('/')}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              <Home className="mr-2 h-4 w-4" />
              Accueil
            </Button>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
