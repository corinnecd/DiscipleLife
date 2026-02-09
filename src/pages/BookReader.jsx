
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle, Circle, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Progress } from '@/components/ui/progress';

const BookReader = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [ebook, setEbook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [progress, setProgress] = useState({ chapters_read: [] });
  const [loading, setLoading] = useState(true);
  const [expandedChapter, setExpandedChapter] = useState(null);

  useEffect(() => {
    if (user && bookId) {
        fetchBookDetails();
    }
  }, [user, bookId]);

  const fetchBookDetails = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Ebook Info
      const { data: ebookData, error: ebookError } = await supabase
        .from('ebooks_new')
        .select('*')
        .eq('id', bookId)
        .single();
        
      if (ebookError) throw ebookError;
      setEbook(ebookData);

      // 2. Fetch Chapters
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('ebook_chapters')
        .select('*')
        .eq('ebook_id', bookId)
        .order('chapter_number', { ascending: true });

      if (chaptersError) throw chaptersError;
      setChapters(chaptersData || []);

      // 3. Fetch User Progress
      const { data: progressData } = await supabase
        .from('ebook_progress')
        .select('*')
        .eq('ebook_id', bookId)
        .eq('disciple_id', user.id)
        .maybeSingle();

      if (progressData) {
          // Ensure chapters_read is an array (it might be null if initialized poorly)
          setProgress({
            ...progressData,
            chapters_read: progressData.chapters_read || []
          });
      } else {
          // Init empty progress
          setProgress({ chapters_read: [] });
      }

    } catch (error) {
      console.error("Error fetching book:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger le livre." });
      navigate('/ebooks');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (chapterId, chapterNumber) => {
    if (!user) return;

    // Optimistic Update
    // FIX: Use chapterNumber (integer) instead of chapterId (uuid) to match DB schema int4[]
    const isAlreadyRead = progress.chapters_read.includes(chapterNumber);
    let newReadList = isAlreadyRead 
        ? progress.chapters_read.filter(num => num !== chapterNumber)
        : [...progress.chapters_read, chapterNumber];
    
    // Remove duplicates just in case
    newReadList = [...new Set(newReadList)];

    setProgress(prev => ({ ...prev, chapters_read: newReadList }));

    try {
        // 1. Update Progress Table
        const { error: updateError } = await supabase
            .from('ebook_progress')
            .upsert({
                disciple_id: user.id,
                ebook_id: bookId,
                chapters_read: newReadList,
                current_chapter: chapterNumber,
                is_completed: newReadList.length === chapters.length,
                completed_at: newReadList.length === chapters.length ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'disciple_id, ebook_id' });

        if (updateError) throw updateError;

        // 2. Log Reading History (only if marking as read)
        if (!isAlreadyRead) {
            await supabase.from('ebook_readings').insert({
                disciple_id: user.id,
                ebook_id: bookId,
                chapter_number: chapterNumber
            });
            
            toast({
                title: "Chapitre terminé !",
                className: "bg-green-600 text-white border-green-700"
            });
        }

    } catch (error) {
        console.error("Error updating progress:", error);
        // Revert optimistic update
        setProgress(prev => ({ ...prev, chapters_read: isAlreadyRead ? [...prev.chapters_read, chapterNumber] : prev.chapters_read.filter(num => num !== chapterNumber) }));
        toast({ variant: "destructive", title: "Erreur", description: "Sauvegarde échouée." });
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-white" /></div>;
  if (!ebook) return null;

  const percentComplete = Math.round((progress.chapters_read.length / chapters.length) * 100) || 0;

  return (
    <div className="w-full max-w-screen-2xl mx-auto p-6 space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 items-start pt-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/ebooks')} className="mt-1" aria-label="Retour aux ebooks">
          <ChevronLeft className="h-6 w-6 text-gray-400" />
        </Button>
        
        {ebook.cover_image_url && (
            <img src={ebook.cover_image_url} alt={ebook.title} className="w-24 h-36 object-cover rounded shadow-lg hidden md:block" />
        )}

        <div className="flex-1">
           <h1 className="text-2xl font-bold text-white mb-1">{ebook.title}</h1>
           <p className="text-gray-400 text-sm mb-4">Par {ebook.author}</p>
           
           <div className="flex items-center gap-4 mb-2">
               <span className="text-xs text-teal-400 font-semibold">{percentComplete}% lu</span>
               <Progress value={percentComplete} className="h-2 w-48 bg-white/10" />
           </div>
           <p className="text-gray-500 text-sm max-w-xl">{ebook.description}</p>
        </div>
      </div>

      <div className="bg-[#1a0b2e] border border-white/10 rounded-xl overflow-hidden">
         <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <h2 className="font-bold text-lg text-white">Table des matières</h2>
            <span className="text-xs text-gray-400">{chapters.length} Chapitres</span>
         </div>
         
         <div className="divide-y divide-white/5">
            {chapters.map((chapter) => {
               // FIX: Check against chapter_number instead of id
               const isRead = progress.chapters_read.includes(chapter.chapter_number);
               const isExpanded = expandedChapter === chapter.id;

               return (
                <div key={chapter.id} className="group transition-colors bg-transparent hover:bg-white/5">
                   {/* Chapter Header Row */}
                   <div 
                     className="p-4 flex items-center justify-between cursor-pointer"
                     onClick={() => setExpandedChapter(isExpanded ? null : chapter.id)}
                   >
                      <div className="flex items-center gap-4 flex-1">
                         <span className="text-sm font-mono text-gray-500 w-8">#{chapter.chapter_number}</span>
                         <span className={`font-medium transition-colors ${isRead ? 'text-gray-400' : 'text-white'}`}>
                            {chapter.chapter_title}
                         </span>
                      </div>
                      <div className="flex items-center gap-4">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs text-teal-400 hover:text-teal-300 hover:bg-teal-900/20"
                            onClick={(e) => { e.stopPropagation(); setExpandedChapter(isExpanded ? null : chapter.id); }}
                          >
                             {isExpanded ? 'Fermer' : 'Lire'}
                          </Button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleMarkAsRead(chapter.id, chapter.chapter_number); }}
                            className="text-gray-600 hover:text-teal-500 transition-colors"
                            title={isRead ? "Marquer comme non lu" : "Marquer comme lu"}
                          >
                              {isRead ? <CheckCircle className="text-teal-500 h-6 w-6" /> : <Circle className="h-6 w-6" />}
                          </button>
                      </div>
                   </div>

                   {/* Chapter Content Area */}
                   {isExpanded && (
                       <div className="p-6 bg-black/20 text-gray-300 border-t border-white/5 animate-in slide-in-from-top-2">
                           <div className="prose prose-invert max-w-none mb-6">
                               <p className="whitespace-pre-line leading-relaxed">{chapter.content}</p>
                           </div>
                           <div className="flex justify-end">
                               <Button 
                                 onClick={() => { handleMarkAsRead(chapter.id, chapter.chapter_number); setExpandedChapter(null); }}
                                 className={`${isRead ? 'bg-gray-700 hover:bg-gray-600' : 'bg-teal-600 hover:bg-teal-700'} text-white`}
                               >
                                 {isRead ? 'Marquer comme non lu' : 'Terminer le chapitre'}
                               </Button>
                           </div>
                       </div>
                   )}
                </div>
               );
            })}
         </div>
      </div>
    </div>
  );
};

export default BookReader;
