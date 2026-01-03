
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, Video } from 'lucide-react';

const AddVideoForm = ({ open, onOpenChange, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const [coverFile, setCoverFile] = useState(null);

  const seriesOptions = [
    "Fondements de la Foi",
    "Vie de Disciple",
    "Combat Spirituel",
    "Leadership",
    "Relations et Famille"
  ];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCoverFile(e.target.files[0]);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      let coverUrl = null;

      // 1. Upload Cover Image if exists
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `video-thumbnails/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('resources') // Assuming 'resources' bucket exists from context
          .upload(filePath, coverFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('resources')
          .getPublicUrl(filePath);
          
        coverUrl = publicUrlData.publicUrl;
      }

      // 2. Insert Video Record
      const { error: insertError } = await supabase
        .from('teaching_videos')
        .insert([{
          mentor_id: user.id,
          title: data.title,
          description: data.description,
          video_url: data.video_url,
          series_name: data.series_name,
          duration: data.duration,
          thumbnail_url: coverUrl || 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=2070&auto=format&fit=crop' // Default
        }]);

      if (insertError) throw insertError;

      toast({
        title: "Vidéo ajoutée",
        description: "L'enseignement a été ajouté à la bibliothèque.",
      });

      reset();
      setCoverFile(null);
      if (onSuccess) onSuccess();
      onOpenChange(false);

    } catch (error) {
      console.error("Error adding video:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible d'ajouter la vidéo."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un enseignement vidéo</DialogTitle>
          <DialogDescription>
            Partagez une nouvelle vidéo pour l'édification des disciples.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre de la vidéo</Label>
            <Input 
              id="title" 
              placeholder="Ex: La puissance de la prière" 
              {...register("title", { required: true })} 
            />
            {errors.title && <span className="text-xs text-red-500">Le titre est requis</span>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="series">Série</Label>
            <Select onValueChange={(val) => setValue('series_name', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une série" />
              </SelectTrigger>
              <SelectContent>
                {seriesOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
             {/* Hidden input for validation */}
             <input type="hidden" {...register("series_name", { required: true })} />
             {errors.series_name && <span className="text-xs text-red-500">Série requise</span>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="video_url">URL de la vidéo (YouTube/Vimeo)</Label>
            <Input 
              id="video_url" 
              placeholder="https://youtube.com/..." 
              {...register("video_url", { required: true })} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Durée (ex: 15:30)</Label>
              <Input 
                id="duration" 
                placeholder="MM:SS" 
                {...register("duration", { required: true })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Miniature</Label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-10 border-2 border-dashed rounded-md cursor-pointer hover:bg-slate-50 border-slate-300">
                  <div className="flex items-center space-x-2 text-slate-500">
                    <Upload size={16} />
                    <span className="text-xs">{coverFile ? coverFile.name : "Choisir image"}</span>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              placeholder="Bref résumé de l'enseignement..." 
              {...register("description")} 
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ajout en cours...
                </>
              ) : (
                <>
                  <Video className="mr-2 h-4 w-4" /> Publier la vidéo
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddVideoForm;
