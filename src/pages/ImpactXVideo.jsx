
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Share2, ThumbsUp, CheckCircle, PlayCircle } from 'lucide-react';
import { Helmet } from 'react-helmet';

const ImpactXVideo = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (id && user) {
      fetchVideoAndProgress();
    }
  }, [id, user]);

  const fetchVideoAndProgress = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Video Details
      const { data: videoData, error: videoError } = await supabase
        .from('impact_x_videos')
        .select('*')
        .eq('id', id)
        .single();

      if (videoError) throw videoError;
      setVideo(videoData);

      // 2. Fetch Progress
      const { data: progressData } = await supabase
        .from('impact_x_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('video_id', id)
        .single();

      if (progressData) {
        setProgress(progressData.progress_percentage || 0);
        setIsCompleted(progressData.watched || false);
      }

    } catch (error) {
      console.error("Error fetching video:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger la vidéo."
      });
      navigate('/impact-x');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async (newPercentage) => {
    if (!user || !video) return;

    // Only update if significantly changed or completed
    const completed = newPercentage >= 95;
    
    try {
        const { error } = await supabase
          .from('impact_x_progress')
          .upsert({
            user_id: user.id,
            video_id: video.id,
            progress_percentage: Math.floor(newPercentage),
            watched: completed,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,video_id' });

        if (!error && completed && !isCompleted) {
           setIsCompleted(true);
           toast({
             title: "Félicitations !",
             description: "Vous avez terminé cette vidéo.",
             className: "bg-green-50 border-green-200"
           });
        }
    } catch (err) {
        console.error("Failed to sync progress", err);
    }
  };

  // Mock video progression simulation since we might use iframe
  // In a real app with custom player, we would bind to onTimeUpdate
  useEffect(() => {
    if (!loading && video) {
        // Start simulation timer only if not completed
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) return 100;
                const next = prev + 1; // Simulate viewing
                if (next % 5 === 0) handleUpdateProgress(next); // Sync every 5%
                return next;
            });
        }, 1000); // 1% per second for demo purposes
        
        return () => clearInterval(timer);
    }
  }, [loading, video]);

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!video) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Helmet>
        <title>{video.title} | Impact X</title>
      </Helmet>
      
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center gap-4 sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={() => navigate('/impact-x')} className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-semibold truncate flex-1">{video.title}</h1>
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      <div className="w-full max-w-[1800px] mx-auto flex-1 flex flex-col gap-6">
         {/* Video Player Container */}
         <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800">
            {video.video_url.includes('youtube') || video.video_url.includes('vimeo') ? (
               <iframe 
                 src={video.video_url.replace('watch?v=', 'embed/')} 
                 className="w-full h-full"
                 title={video.title}
                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                 allowFullScreen
               />
            ) : (
               <video 
                 src={video.video_url} 
                 controls 
                 className="w-full h-full"
                 poster={video.thumbnail_url}
               />
            )}
         </div>

         <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
               <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">{video.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span>{video.category || 'Général'}</span>
                        <span>•</span>
                        <span>{new Date(video.created_at).getFullYear()}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                           <PlayCircle className="w-4 h-4" /> 
                           {video.duration ? `${Math.floor(video.duration / 60)} min` : 'Unknown'}
                        </div>
                    </div>
                  </div>
                  
                  {isCompleted && (
                      <div className="bg-green-500/10 text-green-500 px-4 py-2 rounded-full flex items-center gap-2 font-medium border border-green-500/20">
                          <CheckCircle className="w-5 h-5" /> Vu
                      </div>
                  )}
               </div>
               
               <p className="text-slate-300 leading-relaxed bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                  {video.description || "Aucune description disponible pour cette vidéo."}
               </p>
            </div>
            
            <div className="w-full md:w-80 space-y-4">
               <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                  <h3 className="font-semibold mb-4 text-white">Progression</h3>
                  <div className="space-y-2">
                     <div className="flex justify-between text-xs text-slate-400">
                        <span>Complété</span>
                        <span>{progress}%</span>
                     </div>
                     <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-purple-500'}`} 
                          style={{ width: `${progress}%` }} 
                        />
                     </div>
                     {isCompleted && (
                       <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Module validé
                       </p>
                     )}
                  </div>
               </div>
               
               <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white gap-2" variant="secondary">
                   <ThumbsUp className="w-4 h-4" /> J'aime cette vidéo
               </Button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default ImpactXVideo;
