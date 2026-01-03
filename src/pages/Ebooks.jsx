
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Search, 
  Loader2, 
  Plus,
  CheckCircle,
  Library
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddEbookForm from '@/components/AddEbookForm';

const EbookCard = ({ ebook, onClick }) => {
  const progressPercent = ebook.progress 
    ? Math.round((ebook.progress.chapters_read.length / ebook.total_chapters) * 100) 
    : 0;
  
  const isCompleted = progressPercent === 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      className="bg-[#1a0b2e] border border-white/5 rounded-xl overflow-hidden shadow-lg group cursor-pointer relative flex flex-col h-full hover:shadow-2xl hover:shadow-teal-900/20 transition-all duration-300"
      onClick={onClick}
    >
      {/* Fixed aspect ratio container for cover image - Ensures all images are strictly 2:3 ratio */}
      <div className="aspect-[2/3] w-full bg-gray-900 relative overflow-hidden">
          {ebook.cover_image_url ? (
              <img 
                alt={ebook.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                src={ebook.cover_image_url} 
                loading="lazy"
              />
          ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900 text-white/20 p-4 text-center">
                  <BookOpen size={48} />
                  <span className="text-sm mt-2 text-white/40">{ebook.title}</span>
              </div>
          )}
          
          {/* Status Badge */}
          {isCompleted && (
              <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg z-10">
                  <CheckCircle size={12} /> Lu
              </div>
          )}
          
          {/* Overlay gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      
      {/* Card Content */}
      <div className="p-4 flex flex-col flex-grow relative">
        <div className="mb-3">
            <h3 className="text-white font-bold text-base leading-tight mb-1 line-clamp-2 group-hover:text-teal-400 transition-colors">
                {ebook.title}
            </h3>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{ebook.author || 'Auteur inconnu'}</p>
        </div>
        
        <p className="text-gray-500 text-xs line-clamp-3 mb-4 opacity-80 flex-grow">
            {ebook.description}
        </p>
        
        {/* Progress Section */}
        {ebook.total_chapters > 0 && (
            <div className="mt-auto pt-3 border-t border-white/5 w-full">
                <div className="flex justify-between text-[10px] text-gray-400 px-1 mb-1.5">
                    <span>Progression</span>
                    <span className={isCompleted ? "text-emerald-400 font-bold" : "text-teal-400"}>{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-1 bg-white/10" indicatorClassName="bg-teal-500" />
            </div>
        )}
      </div>
    </motion.div>
  );
};

const Ebooks = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMentor, isAdmin } = useRole();
  
  const [ebooks, setEbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (user) fetchEbooks();
  }, [user]);

  const fetchEbooks = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Ebooks
      const { data: ebooksData, error: ebooksError } = await supabase
        .from('ebooks_new')
        .select('*')
        .order('created_at', { ascending: false });

      if (ebooksError) throw ebooksError;

      // 2. Fetch User Progress
      const { data: progressData, error: progressError } = await supabase
        .from('ebook_progress')
        .select('*')
        .eq('disciple_id', user.id);

      if (progressError && progressError.code !== 'PGRST116') {
          console.error("Progress fetch error", progressError);
      }

      // Merge progress into ebooks
      const mergedEbooks = ebooksData.map(ebook => {
          const progress = progressData?.find(p => p.ebook_id === ebook.id);
          return { ...ebook, progress };
      });

      setEbooks(mergedEbooks);

    } catch (error) {
      console.error("Error fetching ebooks:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les ebooks."
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEbooks = ebooks.filter(ebook => 
      ebook.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ebook.author?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0f0518] pb-20">
      <Helmet>
        <title>Bibliothèque | DiscipleLife</title>
      </Helmet>

      {/* Header Section */}
      <div className="bg-gradient-to-b from-[#1a0b2e] to-[#0f0518] pt-12 pb-8 px-4 md:px-8 border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20">
                 <Library className="w-8 h-8 text-teal-400" />
               </div>
               <div>
                 <h1 className="text-3xl font-bold text-white">Bibliothèque</h1>
                 <p className="text-gray-400 mt-1">Ressources pour votre croissance spirituelle</p>
               </div>
            </div>
            
            {(isMentor || isAdmin) && (
                <Button onClick={() => setIsAddModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-lg shadow-teal-900/20 transition-all hover:scale-105">
                    <Plus size={18} /> Ajouter un Ebook
                </Button>
            )}
          </div>

          {/* Search Bar */}
          <div className="mt-8 relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <Input 
                placeholder="Rechercher un livre par titre ou auteur..." 
                className="pl-10 bg-[#0f0518]/50 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-teal-500/50 h-12 rounded-xl backdrop-blur-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {loading ? (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
            </div>
        ) : filteredEbooks.length === 0 ? (
            <div className="text-center py-20 text-gray-500 bg-[#1a0b2e]/30 rounded-xl border border-white/5 border-dashed">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Aucun ebook trouvé.</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {filteredEbooks.map((ebook) => (
                    <EbookCard 
                      key={ebook.id} 
                      ebook={ebook} 
                      onClick={() => navigate(`/books-to-read/${ebook.id}`)}
                    />
                ))}
            </div>
        )}
      </div>

      {/* Add Ebook Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="bg-[#1e1b4b] border-white/10 text-white max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>Ajouter un nouvel Ebook</DialogTitle>
              </DialogHeader>
              <AddEbookForm 
                onSuccess={() => { setIsAddModalOpen(false); fetchEbooks(); }}
                onCancel={() => setIsAddModalOpen(false)}
              />
          </DialogContent>
      </Dialog>
    </div>
  );
};

export default Ebooks;
