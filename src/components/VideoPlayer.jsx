
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const VideoPlayer = ({ video, open, onOpenChange, onProgressUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const progressInterval = useRef(null);
  
  // Helper to extract embed URL
  const getEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.split('v=')[1] || url.split('/').pop();
      const cleanId = videoId.split('&')[0];
      return `https://www.youtube.com/embed/${cleanId}`;
    }
    if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  useEffect(() => {
    if (open && video) {
      // Load initial progress
      fetchProgress();
      
      // Record a "view"
      recordView();

      // Start simulated progress tracking (since we can't easily hook into iframe events universally without heavy libs)
      // We assume user is watching if modal is open. Increments by 1% every 1s for demo purposes, 
      // or realistically based on duration.
      startTracking();
    } else {
      stopTracking();
    }

    return () => stopTracking();
  }, [open, video]);

  const fetchProgress = async () => {
    if (!user || !video) return;
    
    const { data } = await supabase
      .from('video_progress')
      .select('progress_percentage, is_completed')
      .eq('disciple_id', user.id)
      .eq('video_id', video.id)
      .single();
    
    if (data) {
      setProgress(data.progress_percentage || 0);
      setIsCompleted(data.is_completed || false);
    } else {
      setProgress(0);
      setIsCompleted(false);
    }
  };

  const recordView = async () => {
    await supabase.from('video_views').insert([{
      disciple_id: user.id,
      video_id: video.id
    }]);
  };

  const startTracking = () => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    
    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval.current);
          return 100;
        }
        // Increment progress slowly (simulation)
        const newProgress = prev + 1; // +1% every second (fast for demo) or adjust logic
        updateDbProgress(newProgress);
        return newProgress;
      });
    }, 5000); // Update every 5 seconds
  };

  const stopTracking = () => {
    if (progressInterval.current) clearInterval(progressInterval.current);
  };

  const updateDbProgress = async (val, completed = false) => {
    if (!user || !video) return;

    const updates = {
      disciple_id: user.id,
      video_id: video.id,
      progress_percentage: val,
      updated_at: new Date(),
    };

    if (completed) {
      updates.is_completed = true;
      updates.completed_at = new Date();
      updates.progress_percentage = 100;
      setIsCompleted(true);
      if (onProgressUpdate) onProgressUpdate();
    }

    const { error } = await supabase
      .from('video_progress')
      .upsert(updates, { onConflict: 'disciple_id, video_id' });

    if (error) console.error("Error saving progress", error);
  };

  const handleMarkCompleted = () => {
    updateDbProgress(100, true);
    setProgress(100);
    toast({
      title: "Félicitations !",
      description: "Vidéo marquée comme terminée.",
      className: "bg-green-50 border-green-200"
    });
  };

  if (!video) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0 bg-black overflow-hidden border-slate-800">
        <DialogHeader className="p-4 bg-[#1a0b2e] border-b border-white/10">
          <DialogTitle className="text-white flex justify-between items-center">
            <span className="truncate pr-4">{video.title}</span>
            {isCompleted && <span className="text-green-400 text-sm flex items-center"><CheckCircle size={14} className="mr-1"/> Vu</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-video w-full bg-black">
          <iframe 
            src={getEmbedUrl(video.video_url)} 
            title={video.title}
            className="w-full h-full absolute top-0 left-0"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
          ></iframe>
        </div>

        <div className="p-4 bg-[#0f0518] space-y-4">
           <div className="space-y-1">
             <div className="flex justify-between text-xs text-gray-400">
               <span>Progression</span>
               <span>{progress}%</span>
             </div>
             <Progress value={progress} className="h-2 bg-gray-800" indicatorClassName="bg-teal-500" />
           </div>

           <div className="flex justify-between items-center">
              <div className="flex items-center text-gray-400 text-sm gap-2">
                 <Clock size={14} />
                 <span>{video.duration}</span>
              </div>
              <Button 
                onClick={handleMarkCompleted} 
                disabled={isCompleted}
                variant={isCompleted ? "outline" : "default"}
                className={isCompleted ? "border-teal-500 text-teal-400" : "bg-teal-600 hover:bg-teal-700"}
              >
                {isCompleted ? "Terminé" : "Marquer comme vu"}
              </Button>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayer;
