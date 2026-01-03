
import React, { useState, useEffect } from 'react';
import { PlayCircle, Clock, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { supabase } from '@/lib/customSupabaseClient';
import AddVideoForm from '@/components/AddVideoForm';
import VideoPlayer from '@/components/VideoPlayer';

const TeachingVideos = () => {
  const { user } = useAuth();
  const { isMentor, isAdmin } = useRole();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const canManage = isMentor || isAdmin;

  useEffect(() => {
    fetchVideos();
  }, [user]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Videos
      const { data: videosData, error: videoError } = await supabase
        .from('teaching_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (videoError) throw videoError;

      // 2. Fetch User Progress for ALL these videos
      if (user) {
        const { data: progressData } = await supabase
          .from('video_progress')
          .select('video_id, progress_percentage, is_completed')
          .eq('disciple_id', user.id);

        // Merge progress into video objects
        const merged = videosData.map(v => {
          const prog = progressData?.find(p => p.video_id === v.id);
          return {
            ...v,
            progress: prog?.progress_percentage || 0,
            isCompleted: prog?.is_completed || false
          };
        });
        setVideos(merged);
      } else {
        setVideos(videosData);
      }

    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    setIsPlayerOpen(true);
  };

  // Group videos by series
  const groupedVideos = videos.reduce((acc, video) => {
    const series = video.series_name || "Autres";
    if (!acc[series]) acc[series] = [];
    acc[series].push(video);
    return acc;
  }, {});

  return (
    <div className="space-y-8 pb-10 container mx-auto px-4 pt-6">
      <div className="flex flex-col items-center justify-center text-center mb-8 space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Enseignements Vidéo</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Approfondissez vos connaissances bibliques, grandissez dans la foi et équipez-vous pour le ministère avec nos séries d'enseignements exclusifs.
          </p>
        </div>
        {canManage && (
          <div className="pt-2">
            <Button onClick={() => setIsAddOpen(true)} className="bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-900/20">
              <Plus className="mr-2 h-4 w-4" /> Ajouter une Vidéo
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
        </div>
      ) : Object.keys(groupedVideos).length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-[#1a0b2e] rounded-xl border border-white/5">
          <p className="mb-4">Aucune vidéo disponible pour le moment.</p>
          {canManage && (
             <Button onClick={() => setIsAddOpen(true)} variant="outline">
                Commencer par ajouter une vidéo
             </Button>
          )}
        </div>
      ) : (
        Object.entries(groupedVideos).map(([category, items]) => (
          <div key={category} className="space-y-4 pt-4">
            <h2 className="text-2xl font-bold text-teal-400 border-l-4 border-teal-500 pl-4 mb-6">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((video) => (
                <Card 
                  key={video.id}
                  onClick={() => handleVideoClick(video)}
                  className="bg-[#1a0b2e] border-white/10 overflow-hidden cursor-pointer group hover:border-teal-500/50 hover:shadow-xl hover:shadow-teal-900/10 transition-all duration-300 flex flex-col h-full"
                >
                  <div className="relative aspect-video w-full overflow-hidden">
                      <img 
                        alt={`Enseignement sur ${video.title}`} 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                        src={video.thumbnail_url || "https://images.unsplash.com/photo-1526946443415-f5f929bce4f1"} 
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-teal-600/90 flex items-center justify-center transform scale-90 opacity-90 group-hover:scale-100 group-hover:opacity-100 transition-all shadow-lg">
                            <PlayCircle className="w-8 h-8 text-white ml-1" />
                          </div>
                      </div>
                      <Badge className="absolute bottom-2 right-2 bg-black/80 text-white border-none flex items-center gap-1 px-2 py-1 backdrop-blur-sm">
                          <Clock size={12} className="text-teal-400" /> {video.duration || "N/A"}
                      </Badge>
                      {video.isCompleted && (
                        <div className="absolute top-2 right-2 bg-green-500/90 backdrop-blur-md rounded-full px-2 py-1 shadow-lg flex items-center gap-1 text-xs text-white font-medium border border-green-400/50">
                          <CheckCircle2 size={12} /> Vu
                        </div>
                      )}
                  </div>
                  <CardContent className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-teal-400 transition-colors line-clamp-2 mb-2 leading-tight">{video.title}</h3>
                      {video.description && (
                        <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{video.description}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2 mt-auto pt-2 border-t border-white/5">
                      <div className="flex justify-between text-xs font-medium text-gray-400">
                        <span>Progression</span>
                        <span className={video.isCompleted ? "text-green-400" : "text-teal-400"}>{video.progress || 0}%</span>
                      </div>
                      <Progress 
                        value={video.progress || 0} 
                        className="h-1.5 bg-gray-800" 
                        indicatorClassName={video.isCompleted ? "bg-green-500" : "bg-teal-500"} 
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Modals */}
      <AddVideoForm 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
        onSuccess={fetchVideos} 
      />

      <VideoPlayer 
        video={selectedVideo}
        open={isPlayerOpen}
        onOpenChange={setIsPlayerOpen}
        onProgressUpdate={fetchVideos}
      />
    </div>
  );
};

export default TeachingVideos;
