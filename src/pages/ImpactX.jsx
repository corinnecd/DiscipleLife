
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { 
  PlayCircle, 
  CheckCircle, 
  Lock, 
  Trophy, 
  ChevronRight,
  Loader2,
  MoreVertical,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { compressImage } from '@/lib/ImageCompression';

const ImpactX = () => {
  const { user } = useAuth(); // Assuming useRole hook usage elsewhere or role in user metadata
  const navigate = useNavigate();
  const { toast } = useToast();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Admin Upload State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); // Should check role properly
  const [newVideo, setNewVideo] = useState({ title: '', description: '', video_url: '', duration: 10 });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    checkAdmin();
    fetchModules();
  }, []);

  const checkAdmin = async () => {
      // Simple check, real app uses RoleContext
      const { data } = await supabase.from('profils').select('role').eq('id', user.id).single();
      if (data?.role === 'admin') setIsAdmin(true);
  };

  const fetchModules = async () => {
    try {
      setLoading(true);
      // Fetch modules with their videos and user progress
      // Complex query simplified: fetching videos and checking progress separately or via join
      const { data: videosData, error } = await supabase
        .from('impact_x_videos')
        .select('*')
        .order('order', { ascending: true });
        
      if (error) throw error;
      setModules(videosData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVideo = async () => {
      if (!newVideo.title || !newVideo.video_url) {
          toast({ variant: "destructive", description: "Titre et URL vidéo requis." });
          return;
      }

      try {
          setIsUploading(true);
          setUploadProgress(0);
          
          let thumbnailUrl = null;

          if (thumbnailFile) {
              setUploadProgress(10);
              const compressedThumb = await compressImage(thumbnailFile, {
                  maxWidth: 1280,
                  maxHeight: 720,
                  quality: 0.8,
                  onProgress: (p) => setUploadProgress(p)
              });

              const fileName = `impact-x/${Date.now()}_thumb.jpg`;
              const { error: uploadErr } = await supabase.storage.from('resources').upload(fileName, compressedThumb);
              if (uploadErr) throw uploadErr;

              const { data: publicData } = supabase.storage.from('resources').getPublicUrl(fileName);
              thumbnailUrl = publicData.publicUrl;
          }
          
          setUploadProgress(90);
          const { error: dbErr } = await supabase.from('impact_x_videos').insert([{
              ...newVideo,
              thumbnail_url: thumbnailUrl,
              order: modules.length + 1,
              created_by: user.id
          }]);

          if (dbErr) throw dbErr;

          toast({ title: "Vidéo ajoutée", description: "La vidéo est maintenant disponible." });
          setIsAddOpen(false);
          setNewVideo({ title: '', description: '', video_url: '', duration: 10 });
          setThumbnailFile(null);
          fetchModules();

      } catch (error) {
          console.error(error);
          toast({ variant: "destructive", title: "Erreur", description: error.message });
      } finally {
          setIsUploading(false);
          setUploadProgress(0);
      }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 min-h-screen pb-20">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-900 to-blue-900 p-8 md:p-12 mb-8">
         <div className="absolute top-0 right-0 p-4 opacity-20">
            <Trophy size={120} />
         </div>
         <div className="relative z-10 max-w-2xl">
            <Badge className="bg-yellow-500 text-black font-bold mb-4 hover:bg-yellow-400 border-none">Formation Intensive</Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">Impact X</h1>
            <p className="text-blue-100 text-lg mb-6">
               Devenez un leader multiplicateur. Une série de formations vidéo pour transformer votre ministère.
            </p>
            <div className="flex gap-4">
               <Button onClick={() => navigate('/impact-x/leaderboard')} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <Trophy size={18} className="mr-2 text-yellow-500" /> Classement
               </Button>
               {isAdmin && (
                   <Button onClick={() => setIsAddOpen(true)} className="bg-white/10 text-white hover:bg-white/20 border-white/10">
                       <Plus size={18} className="mr-2" /> Ajouter Contenu
                   </Button>
               )}
            </div>
         </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-6">Modules de Formation</h2>

      {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-500" /></div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((video, index) => (
                  <Card 
                     key={video.id} 
                     className="bg-[#1a0b2e] border-white/10 overflow-hidden hover:border-purple-500/50 transition-all group cursor-pointer"
                     onClick={() => navigate(`/impact-x/video/${video.id}`)}
                  >
                      <div className="relative aspect-video bg-black/40">
                          {video.thumbnail_url ? (
                              <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center bg-purple-900/20">
                                  <PlayCircle size={48} className="text-white/50" />
                              </div>
                          )}
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                              {video.duration} min
                          </div>
                      </div>
                      <CardContent className="p-4">
                          <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">{video.title}</h3>
                          <p className="text-sm text-gray-400 line-clamp-2">{video.description}</p>
                      </CardContent>
                  </Card>
              ))}
          </div>
      )}

      {/* Admin Add Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="bg-[#1a0b2e] border-white/10 text-white sm:max-w-lg">
              <DialogHeader><DialogTitle>Ajouter une Vidéo Impact X</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                  <Input 
                     placeholder="Titre de la vidéo" 
                     className="bg-black/20 border-white/10"
                     value={newVideo.title}
                     onChange={e => setNewVideo({...newVideo, title: e.target.value})}
                  />
                  <Input 
                     placeholder="Description courte" 
                     className="bg-black/20 border-white/10"
                     value={newVideo.description}
                     onChange={e => setNewVideo({...newVideo, description: e.target.value})}
                  />
                  <Input 
                     placeholder="URL YouTube / Vimeo" 
                     className="bg-black/20 border-white/10"
                     value={newVideo.video_url}
                     onChange={e => setNewVideo({...newVideo, video_url: e.target.value})}
                  />
                  
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 uppercase">Vignette (Compressée auto)</label>
                     <Input 
                        type="file" 
                        accept="image/*"
                        className="bg-black/20 border-white/10"
                        onChange={e => setThumbnailFile(e.target.files[0])}
                     />
                     {uploadProgress > 0 && (
                         <div className="space-y-1">
                             <div className="flex justify-between text-xs text-gray-400">
                                 <span>Optimisation...</span>
                                 <span>{Math.round(uploadProgress)}%</span>
                             </div>
                             <Progress value={uploadProgress} className="h-1 bg-gray-800" indicatorClassName="bg-purple-500" />
                         </div>
                     )}
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Annuler</Button>
                  <Button onClick={handleAddVideo} disabled={isUploading} className="bg-purple-600 hover:bg-purple-700">
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publier'}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImpactX;
