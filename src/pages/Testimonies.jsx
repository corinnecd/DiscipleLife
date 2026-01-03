
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  Search, 
  Filter, 
  Play, 
  Clock, 
  Calendar,
  ThumbsUp,
  MessageCircle,
  Share2,
  MoreVertical,
  Loader2,
  X,
  Upload,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from '@/components/ui/use-toast';
import { compressImage } from '@/lib/ImageCompression';
import { Progress } from '@/components/ui/progress';

const Testimonies = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testimonies, setTestimonies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedVideo, setSelectedVideo] = useState(null);
  
  // Upload State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadThumbnail, setUploadThumbnail] = useState(null);
  const [uploadContent, setUploadContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);

  useEffect(() => {
    fetchTestimonies();
  }, [activeTab]);

  const fetchTestimonies = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('testimonies')
        .select(`
          *,
          profils:user_id (first_name, last_name, avatar_url)
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('content', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTestimonies(data || []);
    } catch (error) {
      console.error('Error fetching testimonies:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les témoignages."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadContent.trim()) {
       toast({ variant: "destructive", title: "Erreur", description: "Veuillez écrire votre témoignage." });
       return;
    }

    try {
      setIsUploading(true);
      setCompressionProgress(0);

      let thumbnailUrl = null;
      let videoUrl = null; // Assuming text testimonies for now based on schema, but if video file exists:

      // Handle Thumbnail/Image Compression & Upload if present
      if (uploadThumbnail) {
        setCompressionProgress(10);
        const compressedThumbnail = await compressImage(uploadThumbnail, {
           maxWidth: 1280,
           maxHeight: 720,
           quality: 0.8,
           onProgress: (p) => setCompressionProgress(p)
        });

        const fileName = `${user.id}/${Date.now()}_thumb.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('resources') // Using resources bucket as general storage for now
          .upload(fileName, compressedThumbnail);

        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from('resources').getPublicUrl(fileName);
        thumbnailUrl = publicUrlData.publicUrl;
      }

      // Insert Testimony
      const { error } = await supabase
        .from('testimonies')
        .insert([{
          user_id: user.id,
          content: uploadContent,
          status: 'pending' // Pending moderation
          // thumbnail_url: thumbnailUrl (if schema supports it)
        }]);

      if (error) throw error;

      toast({
        title: "Témoignage envoyé !",
        description: "Il sera visible après validation par un modérateur."
      });
      setIsUploadOpen(false);
      setUploadContent('');
      setUploadThumbnail(null);
      setUploadFile(null);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Échec de l'envoi du témoignage."
      });
    } finally {
      setIsUploading(false);
      setCompressionProgress(0);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Video className="h-8 w-8 text-purple-400" />
            Témoignages & Vidéos
          </h1>
          <p className="text-gray-400 mt-2">
            Découvrez comment Dieu agit dans la vie des disciples.
          </p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
           <Upload size={18} /> Partager mon histoire
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 bg-[#1a0b2e] p-4 rounded-xl border border-white/10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Rechercher un thème, un mot clé..." 
            className="pl-10 bg-black/20 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          <Button 
             variant={activeTab === 'all' ? 'default' : 'outline'} 
             onClick={() => setActiveTab('all')}
             className={activeTab === 'all' ? 'bg-purple-600' : 'border-white/10 text-gray-300'}
          >
            Tout
          </Button>
          <Button 
             variant={activeTab === 'video' ? 'default' : 'outline'} 
             onClick={() => setActiveTab('video')}
             className={activeTab === 'video' ? 'bg-purple-600' : 'border-white/10 text-gray-300'}
          >
            Vidéos
          </Button>
          <Button 
             variant={activeTab === 'text' ? 'default' : 'outline'} 
             onClick={() => setActiveTab('text')}
             className={activeTab === 'text' ? 'bg-purple-600' : 'border-white/10 text-gray-300'}
          >
            Écrits
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonies.map((item) => (
            <Card key={item.id} className="bg-[#1a0b2e] border-white/10 overflow-hidden hover:border-purple-500/50 transition-all group">
               <div className="relative aspect-video bg-black/40">
                  {/* Placeholder for video thumbnail logic */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/80 to-transparent">
                     <Play className="h-12 w-12 text-white opacity-80 group-hover:scale-110 transition-transform cursor-pointer" />
                  </div>
                  <Badge className="absolute top-2 right-2 bg-black/60 hover:bg-black/60 border-none text-white backdrop-blur-sm">
                     Témoignage
                  </Badge>
               </div>
               <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                     <div className={`w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center text-xs font-bold text-purple-200 border border-purple-500/30`}>
                        {item.profils?.first_name?.charAt(0) || 'A'}
                     </div>
                     <div>
                        <h3 className="font-semibold text-white line-clamp-1">{item.profils?.first_name} {item.profils?.last_name}</h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                           <Calendar size={10} /> {new Date(item.created_at).toLocaleDateString()}
                        </p>
                     </div>
                  </div>
                  <p className="text-gray-300 text-sm line-clamp-3 mb-4">
                     {item.content}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                     <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8 gap-1">
                        <ThumbsUp size={14} /> J'aime
                     </Button>
                     <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8 gap-1">
                        <Share2 size={14} /> Partager
                     </Button>
                  </div>
               </CardContent>
            </Card>
          ))}
          {testimonies.length === 0 && (
             <div className="col-span-full text-center py-20 text-gray-500">
                Aucun témoignage trouvé. Soyez le premier à partager !
             </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="bg-[#1a0b2e] border-white/10 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Partager votre témoignage</DialogTitle>
            <DialogDescription className="text-gray-400">
              Racontez ce que Dieu a fait. Votre témoignage encouragera d'autres disciples.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
             <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Votre histoire</label>
                <textarea 
                  className="w-full h-32 bg-black/20 border-white/10 rounded-md p-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none text-sm"
                  placeholder="Écrivez votre témoignage ici..."
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                />
             </div>
             
             <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Photo ou Vignette (Optionnel)</label>
                <Input 
                   type="file" 
                   accept="image/*"
                   className="bg-black/20 border-white/10 text-gray-400 file:text-purple-400 file:hover:text-purple-300"
                   onChange={(e) => setUploadThumbnail(e.target.files[0])}
                />
                <p className="text-xs text-gray-500">Max 5MB. Sera compressé automatiquement.</p>
             </div>

             {isUploading && (
                <div className="space-y-2">
                   <div className="flex justify-between text-xs text-gray-400">
                      <span>Compression & Envoi...</span>
                      <span>{Math.round(compressionProgress)}%</span>
                   </div>
                   <Progress value={compressionProgress} className="h-1 bg-gray-800" indicatorClassName="bg-purple-500" />
                </div>
             )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)} className="border-white/10 hover:bg-white/5 text-gray-300">
              Annuler
            </Button>
            <Button onClick={handleUpload} disabled={isUploading} className="bg-purple-600 hover:bg-purple-700">
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Envoyer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Testimonies;
