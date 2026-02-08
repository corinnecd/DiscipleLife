
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { 
    FileText, Upload, Trash2, Edit, Plus, FolderOpen, 
    Image as ImageIcon, MoreVertical, Loader2, CheckCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { compressImage } from '@/lib/ImageCompression';
import { Progress } from '@/components/ui/progress';

const AdminResourceManager = () => {
  const { toast } = useToast();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Upload State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newResource, setNewResource] = useState({ title: '', description: '', type: 'ebook', category: 'general' });
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les ressources." });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
      if (!newResource.title || !file) {
          toast({ variant: "destructive", title: "Incomplet", description: "Titre et fichier sont requis." });
          return;
      }

      try {
          setIsUploading(true);
          setCompressionProgress(0);
          
          let thumbnailUrl = null;
          let fileUrl = null;

          // 1. Compress Thumbnail if exists
          if (thumbnail) {
              setCompressionProgress(10);
              const compressedThumb = await compressImage(thumbnail, {
                  maxWidth: 600,
                  maxHeight: 800, // Vertical for ebooks
                  quality: 0.8,
                  onProgress: (p) => setCompressionProgress(p)
              });
              
              const thumbName = `covers/${Date.now()}_cover.jpg`;
              const { error: thumbErr } = await supabase.storage.from('resources').upload(thumbName, compressedThumb);
              if (thumbErr) throw thumbErr;
              
              const { data: thumbPublic } = supabase.storage.from('resources').getPublicUrl(thumbName);
              thumbnailUrl = thumbPublic.publicUrl;
          }

          // 2. Upload Main File
          setCompressionProgress(50); // Jump to file upload indicator
          const fileName = `files/${Date.now()}_${file.name.replace(/\s/g, '_')}`;
          const { error: fileErr } = await supabase.storage.from('resources').upload(fileName, file);
          if (fileErr) throw fileErr;

          const { data: filePublic } = supabase.storage.from('resources').getPublicUrl(fileName);
          fileUrl = filePublic.publicUrl;

          // 3. Insert Record
          const { error: dbErr } = await supabase.from('resources').insert([{
              ...newResource,
              file_url: fileUrl,
              thumbnail_url: thumbnailUrl,
              created_by: (await supabase.auth.getUser()).data.user.id,
              is_published: true
          }]);

          if (dbErr) throw dbErr;

          toast({ title: "Succès", description: "Ressource ajoutée avec succès." });
          setIsAddOpen(false);
          setNewResource({ title: '', description: '', type: 'ebook', category: 'general' });
          setFile(null);
          setThumbnail(null);
          fetchResources();

      } catch (error) {
          console.error(error);
          toast({ variant: "destructive", title: "Erreur", description: error.message || "Échec de l'upload." });
      } finally {
          setIsUploading(false);
          setCompressionProgress(0);
      }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
           <div>
               <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                   <FolderOpen className="text-orange-400" /> Gestion des Ressources
               </h1>
               <p className="text-gray-400 text-sm">Gérez les ebooks, PDF et autres documents.</p>
           </div>
           <Button onClick={() => setIsAddOpen(true)} className="bg-orange-500 hover:bg-orange-600">
               <Plus size={18} className="mr-2" /> Ajouter
           </Button>
       </div>

       {/* List Resources */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {resources.map(res => (
               <Card key={res.id} className="bg-[#1a0b2e] border-white/10 group hover:border-orange-500/30 transition-all">
                   <CardContent className="p-4 flex gap-4">
                       <div className="w-16 h-20 bg-black/40 rounded flex items-center justify-center shrink-0 overflow-hidden border border-white/5">
                           {res.thumbnail_url ? (
                               <img src={res.thumbnail_url} alt="Cover" className="w-full h-full object-cover" />
                           ) : (
                               <FileText className="text-gray-600" />
                           )}
                       </div>
                       <div className="flex-1 min-w-0">
                           <h3 className="text-white font-medium truncate">{res.title}</h3>
                           <p className="text-xs text-gray-500 mb-2 truncate">{res.category}</p>
                           <div className="flex gap-2">
                               <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-400 hover:text-white" aria-label="Modifier"><Edit size={14} /></Button>
                               <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10" aria-label="Supprimer"><Trash2 size={14} /></Button>
                           </div>
                       </div>
                   </CardContent>
               </Card>
           ))}
       </div>

       {/* Add Modal */}
       <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
           <DialogContent className="bg-[#1a0b2e] border-white/10 text-white sm:max-w-lg">
               <DialogHeader><DialogTitle>Nouvelle Ressource</DialogTitle></DialogHeader>
               <div className="space-y-4 py-4">
                   <Input 
                        placeholder="Titre" 
                        className="bg-black/20 border-white/10"
                        value={newResource.title}
                        onChange={e => setNewResource({...newResource, title: e.target.value})}
                   />
                   <Input 
                        placeholder="Description courte" 
                        className="bg-black/20 border-white/10"
                        value={newResource.description}
                        onChange={e => setNewResource({...newResource, description: e.target.value})}
                   />
                   
                   <div className="space-y-2">
                       <label className="text-xs font-bold text-gray-400 uppercase">Fichier Principal (PDF, Doc)</label>
                       <Input type="file" onChange={e => setFile(e.target.files[0])} className="bg-black/20 border-white/10" />
                   </div>

                   <div className="space-y-2">
                       <label className="text-xs font-bold text-gray-400 uppercase">Image de couverture (Sera compressée)</label>
                       <Input type="file" accept="image/*" onChange={e => setThumbnail(e.target.files[0])} className="bg-black/20 border-white/10" />
                   </div>

                   {isUploading && (
                       <div className="space-y-1">
                           <div className="flex justify-between text-xs text-gray-400">
                               <span>Traitement...</span>
                               <span>{Math.round(compressionProgress)}%</span>
                           </div>
                           <Progress value={compressionProgress} className="h-1 bg-gray-800" indicatorClassName="bg-orange-500" />
                       </div>
                   )}
               </div>
               <DialogFooter>
                   <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Annuler</Button>
                   <Button onClick={handleUpload} disabled={isUploading} className="bg-orange-500 hover:bg-orange-600">
                       {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ajouter'}
                   </Button>
               </DialogFooter>
           </DialogContent>
       </Dialog>
    </div>
  );
};

export default AdminResourceManager;
