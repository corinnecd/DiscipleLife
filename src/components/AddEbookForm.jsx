
import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2, Save, UploadCloud } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';

const AddEbookForm = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      author: '',
      description: '',
      coverImage: null,
      chapters: [{ title: '', content: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "chapters"
  });

  const uploadCoverImage = async (file) => {
    if (!file) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `ebook-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error("Erreur lors de l'upload de l'image");
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      let coverUrl = null;
      
      // Handle file upload if a file is selected
      if (data.coverImage && data.coverImage[0]) {
         coverUrl = await uploadCoverImage(data.coverImage[0]);
      }

      // 1. Create Ebook Record
      const { data: ebook, error: ebookError } = await supabase
        .from('ebooks_new')
        .insert([{
          mentor_id: user.id,
          title: data.title,
          author: data.author,
          description: data.description,
          total_chapters: data.chapters.length,
          cover_image_url: coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800' 
        }])
        .select()
        .single();

      if (ebookError) throw ebookError;

      // 2. Create Chapters
      const chaptersData = data.chapters.map((chapter, index) => ({
        ebook_id: ebook.id,
        chapter_number: index + 1,
        chapter_title: chapter.title,
        content: chapter.content,
        content_type: 'text'
      }));

      const { error: chaptersError } = await supabase
        .from('ebook_chapters')
        .insert(chaptersData);

      if (chaptersError) throw chaptersError;

      toast({
        title: "Ebook créé !",
        description: `Le livre "${data.title}" et ses ${data.chapters.length} chapitres ont été ajoutés.`
      });

      if (onSuccess) onSuccess();

    } catch (error) {
      console.error("Error creating ebook:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de créer l'ebook."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto px-1 pr-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        <div className="space-y-4 border p-4 rounded-lg bg-black/20 border-white/10">
          <h3 className="font-semibold text-white mb-4">Informations Générales</h3>
          
          <div className="space-y-2">
              <Label htmlFor="coverImage" className="text-gray-300">Image de couverture</Label>
              <div className="flex items-center gap-4">
                <Input 
                    id="coverImage" 
                    type="file" 
                    accept="image/*"
                    {...register("coverImage")} 
                    className="bg-[#2b1b40] border-white/10 file:text-white text-gray-300 cursor-pointer" 
                />
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-gray-300">Titre *</Label>
              <Input id="title" {...register("title", { required: true })} className="bg-[#2b1b40] border-white/10 text-white" />
              {errors.title && <span className="text-red-400 text-xs">Ce champ est requis</span>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="author" className="text-gray-300">Auteur</Label>
              <Input id="author" {...register("author")} className="bg-[#2b1b40] border-white/10 text-white" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-300">Description</Label>
            <Textarea id="description" {...register("description")} className="bg-[#2b1b40] border-white/10 text-white" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
             <h3 className="font-semibold text-white">Chapitres</h3>
             <Button type="button" size="sm" variant="outline" onClick={() => append({ title: '', content: '' })}>
               <Plus className="h-4 w-4 mr-1" /> Ajouter Chapitre
             </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="p-4 border border-white/10 rounded-lg bg-white/5 space-y-3 relative">
              <div className="absolute right-2 top-2">
                 <Button type="button" size="icon" variant="ghost" onClick={() => remove(index)} className="h-6 w-6 text-gray-500 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                 </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Chapitre {index + 1}</Label>
                <Input 
                  placeholder="Titre du chapitre" 
                  {...register(`chapters.${index}.title`, { required: true })} 
                  className="bg-[#2b1b40] border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Textarea 
                  placeholder="Contenu du chapitre (texte)..." 
                  {...register(`chapters.${index}.content`, { required: true })} 
                  className="min-h-[150px] bg-[#2b1b40] border-white/10 text-white font-mono text-sm leading-relaxed"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-end pt-4 pb-6">
          <Button type="button" variant="outline" onClick={onCancel} className="border-white/10 bg-transparent text-white hover:bg-white/10">Annuler</Button>
          <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={loading}>
            {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Publier l'Ebook
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddEbookForm;
