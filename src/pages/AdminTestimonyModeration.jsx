
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  MessageSquare,
  Search,
  Filter,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { compressImage } from '@/lib/ImageCompression';
import { Progress } from '@/components/ui/progress';

const AdminTestimonyModeration = () => {
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const [testimonies, setTestimonies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected
  const [rejectDialog, setRejectDialog] = useState({ isOpen: false, id: null, reason: '' });

  // For Editing/Updating Thumbnail
  const [editThumbnailDialog, setEditThumbnailDialog] = useState({ isOpen: false, id: null, file: null });
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchTestimonies();
  }, [filter]);

  const fetchTestimonies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('testimonies')
        .select(`
            *,
            profils:user_id (first_name, last_name, email)
        `)
        .eq('status', filter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTestimonies(data || []);
    } catch (error) {
      handleError(error, { context: 'fetchTestimonies' }, "Impossible de charger les témoignages.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status, reason = null) => {
    try {
      const { error } = await supabase
        .from('testimonies')
        .update({ 
            status, 
            rejection_reason: reason,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({ 
        title: status === 'approved' ? "Approuvé" : "Rejeté", 
        description: `Le témoignage a été mis à jour.` 
      });
      
      fetchTestimonies();
      if (rejectDialog.isOpen) setRejectDialog({ isOpen: false, id: null, reason: '' });

    } catch (error) {
      handleError(error, { context: 'handleStatusChange', testimonyId: id }, "Mise à jour échouée.");
    }
  };

  const handleUpdateThumbnail = async () => {
      if (!editThumbnailDialog.file || !editThumbnailDialog.id) return;

      try {
          setUploadProgress(10);
          const compressedFile = await compressImage(editThumbnailDialog.file, {
              maxWidth: 800,
              maxHeight: 450,
              quality: 0.8,
              onProgress: (p) => setUploadProgress(p)
          });

          // Upload logic here (simulated as schema might not have thumb field yet, but logic is ready)
          // const fileName = `thumbnails/${editThumbnailDialog.id}_${Date.now()}.jpg`;
          // const { error: uploadError } = await supabase.storage.from('resources').upload(fileName, compressedFile);
          // if (uploadError) throw uploadError;

          // Update record (simulated)
          if (import.meta.env.DEV) console.log("Compressed file ready for upload:", compressedFile);
          setUploadProgress(100);
          
          toast({ title: "Succès", description: "Vignette compressée et prête (Upload simulé)." });
          setEditThumbnailDialog({ isOpen: false, id: null, file: null });

      } catch (error) {
          console.error(error);
          toast({ variant: "destructive", title: "Erreur", description: error.message });
      } finally {
          setUploadProgress(0);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="text-purple-400" /> Modération des Témoignages
           </h1>
           <p className="text-gray-400 text-sm">Gérez les publications de la communauté.</p>
        </div>
        <div className="flex items-center gap-2 bg-[#1a0b2e] p-1 rounded-lg border border-white/10">
           <Button 
             size="sm" 
             variant={filter === 'pending' ? 'default' : 'ghost'} 
             onClick={() => setFilter('pending')}
             className={filter === 'pending' ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' : 'text-gray-400'}
           >
              En attente
           </Button>
           <Button 
             size="sm" 
             variant={filter === 'approved' ? 'default' : 'ghost'} 
             onClick={() => setFilter('approved')}
             className={filter === 'approved' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'text-gray-400'}
           >
              Approuvés
           </Button>
           <Button 
             size="sm" 
             variant={filter === 'rejected' ? 'default' : 'ghost'} 
             onClick={() => setFilter('rejected')}
             className={filter === 'rejected' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'text-gray-400'}
           >
              Rejetés
           </Button>
        </div>
      </div>

      {loading ? (
         <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-500" /></div>
      ) : (
         <div className="grid grid-cols-1 gap-4">
            {testimonies.map(item => (
               <Card key={item.id} className="bg-[#1a0b2e] border-white/10">
                  <CardHeader className="pb-2">
                     <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-purple-900/50 flex items-center justify-center text-purple-200 font-bold border border-purple-500/30">
                                {item.profils?.first_name?.[0]}
                            </div>
                            <div>
                                <CardTitle className="text-base text-white">{item.profils?.first_name} {item.profils?.last_name}</CardTitle>
                                <CardDescription className="text-xs">{new Date(item.created_at).toLocaleDateString()} • {item.profils?.email}</CardDescription>
                            </div>
                        </div>
                        <Badge variant="outline" className={`${filter === 'pending' ? 'border-orange-500 text-orange-500' : filter === 'approved' ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}>
                           {filter === 'pending' ? 'En attente' : filter === 'approved' ? 'Publié' : 'Rejeté'}
                        </Badge>
                     </div>
                  </CardHeader>
                  <CardContent>
                     <p className="text-gray-300 text-sm bg-black/20 p-4 rounded-lg mb-4">
                        {item.content}
                     </p>
                     
                     <div className="flex flex-wrap gap-2 justify-end">
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="mr-auto border-white/10 text-gray-400"
                            onClick={() => setEditThumbnailDialog({ isOpen: true, id: item.id, file: null })}
                        >
                            Modifier Vignette
                        </Button>

                        {filter === 'pending' && (
                           <>
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                onClick={() => handleStatusChange(item.id, 'approved')}
                              >
                                 <CheckCircle size={16} /> Approuver
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                className="gap-2"
                                onClick={() => setRejectDialog({ isOpen: true, id: item.id, reason: '' })}
                              >
                                 <XCircle size={16} /> Rejeter
                              </Button>
                           </>
                        )}
                        {filter === 'approved' && (
                           <Button 
                             size="sm" 
                             variant="outline" 
                             className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2"
                             onClick={() => setRejectDialog({ isOpen: true, id: item.id, reason: '' })}
                           >
                              <AlertTriangle size={16} /> Retirer
                           </Button>
                        )}
                        {filter === 'rejected' && (
                           <Button 
                             size="sm" 
                             variant="outline" 
                             className="border-green-500/30 text-green-400 hover:bg-green-500/10 gap-2"
                             onClick={() => handleStatusChange(item.id, 'approved')}
                           >
                              <CheckCircle size={16} /> Rétablir
                           </Button>
                        )}
                     </div>
                  </CardContent>
               </Card>
            ))}
            {testimonies.length === 0 && (
               <div className="text-center py-10 text-gray-500">Aucun témoignage dans cette catégorie.</div>
            )}
         </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.isOpen} onOpenChange={(open) => !open && setRejectDialog({ ...rejectDialog, isOpen: false })}>
         <DialogContent className="bg-[#1a0b2e] border-white/10 text-white">
            <DialogHeader>
               <DialogTitle>Motif du rejet</DialogTitle>
               <DialogDescription>Expliquez pourquoi ce témoignage est refusé. Ce message sera visible par l'utilisateur.</DialogDescription>
            </DialogHeader>
            <Textarea 
               value={rejectDialog.reason}
               onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
               placeholder="Contenu inapproprié..."
               className="bg-black/20 border-white/10 text-white"
            />
            <DialogFooter>
               <Button variant="ghost" onClick={() => setRejectDialog({ isOpen: false, id: null, reason: '' })}>Annuler</Button>
               <Button variant="destructive" onClick={() => handleStatusChange(rejectDialog.id, 'rejected', rejectDialog.reason)}>Confirmer le rejet</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Thumbnail Edit Dialog */}
      <Dialog open={editThumbnailDialog.isOpen} onOpenChange={(open) => !open && setEditThumbnailDialog({ ...editThumbnailDialog, isOpen: false })}>
         <DialogContent className="bg-[#1a0b2e] border-white/10 text-white">
            <DialogHeader>
               <DialogTitle>Mettre à jour la vignette</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <Input 
                   type="file" 
                   accept="image/*"
                   onChange={(e) => setEditThumbnailDialog({ ...editThumbnailDialog, file: e.target.files[0] })}
                   className="bg-black/20 border-white/10"
                />
                {uploadProgress > 0 && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Compression...</span>
                            <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-1" />
                    </div>
                )}
            </div>
            <DialogFooter>
               <Button variant="ghost" onClick={() => setEditThumbnailDialog({ isOpen: false, id: null, file: null })}>Annuler</Button>
               <Button onClick={handleUpdateThumbnail} disabled={!editThumbnailDialog.file}>Sauvegarder</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTestimonyModeration;
