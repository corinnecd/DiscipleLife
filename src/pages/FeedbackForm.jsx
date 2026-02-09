
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, CheckCircle2, MessageSquarePlus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/ui/use-toast";
import { compressImage } from '@/lib/ImageCompression';

const FeedbackForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    type: 'feature',
    title: '',
    description: '',
    priority: 'medium'
  });
  const [file, setFile] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!user) throw new Error("Vous devez être connecté pour envoyer un feedback.");
      if (!formData.title.trim()) throw new Error("Le titre est obligatoire.");
      if (!formData.description.trim()) throw new Error("La description est obligatoire.");

      let attachmentUrl = null;

      // Upload attachment if exists
      if (file) {
        try {
          const compressedFile = await compressImage(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.8 });
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('resources')
            .upload(fileName, compressedFile);

          if (uploadError) throw uploadError;
          
          const { data: publicUrlData } = supabase.storage
            .from('resources')
            .getPublicUrl(fileName);
            
          attachmentUrl = publicUrlData.publicUrl;
        } catch (uploadErr) {
          console.error("Error uploading file:", uploadErr);
          toast({
            variant: "destructive",
            title: "Erreur d'upload",
            description: "Impossible de télécharger l'image jointe, mais le feedback sera envoyé sans."
          });
        }
      }

      const { error: insertError } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          type: formData.type,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          attachment_url: attachmentUrl
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setFormData({
        type: 'feature',
        title: '',
        description: '',
        priority: 'medium'
      });
      setFile(null);
      
      toast({
        title: "Feedback envoyé !",
        description: "Merci pour votre contribution. Nous examinerons votre retour rapidement.",
        className: "bg-green-600 border-green-500 text-white"
      });

    } catch (err) {
      console.error("Error submitting feedback:", err);
      setError(err.message || "Une erreur est survenue lors de l'envoi du feedback.");
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err.message || "Impossible d'envoyer le feedback."
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center space-y-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-white">Merci pour votre retour !</h2>
        <p className="text-gray-400 max-w-md">
          Votre feedback a été enregistré avec succès. Grâce à vous, nous continuons d'améliorer l'expérience pour tous les disciples.
        </p>
        <Button 
          onClick={() => setSuccess(false)}
          className="bg-purple-600 hover:bg-purple-700 text-white min-w-[200px]"
        >
          Envoyer un autre feedback
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-2xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <MessageSquarePlus className="text-purple-400" />
          Envoyer un Feedback
        </h1>
        <p className="text-gray-400">
          Signalez un bug, proposez une fonctionnalité ou partagez vos idées pour améliorer la plateforme.
        </p>
      </div>

      <Card className="bg-[#1a0b2e] border-white/10 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Détails du retour</CardTitle>
          <CardDescription className="text-gray-400">
            Soyez aussi précis que possible pour nous aider à comprendre votre demande.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-white">Type de retour</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(val) => handleSelectChange('type', val)}
                >
                  <SelectTrigger id="type" className="bg-black/20 border-white/10 text-white">
                    <SelectValue placeholder="Sélectionnez un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">🐛 Signaler un Bug</SelectItem>
                    <SelectItem value="feature">✨ Nouvelle Fonctionnalité</SelectItem>
                    <SelectItem value="improvement">🚀 Amélioration</SelectItem>
                    <SelectItem value="other">📝 Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority" className="text-white">Priorité (selon vous)</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(val) => handleSelectChange('priority', val)}
                >
                  <SelectTrigger id="priority" className="bg-black/20 border-white/10 text-white">
                    <SelectValue placeholder="Sélectionnez une priorité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Basse</SelectItem>
                    <SelectItem value="medium">🟡 Moyenne</SelectItem>
                    <SelectItem value="high">🔴 Haute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-white">Titre du sujet</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Ex: Erreur lors de l'upload de photo..."
                className="bg-black/20 border-white/10 text-white placeholder:text-gray-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">Description détaillée</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Décrivez le problème ou l'idée en détail..."
                className="min-h-[150px] bg-black/20 border-white/10 text-white placeholder:text-gray-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachment" className="text-white">Capture d'écran (optionnel)</Label>
              <Input
                id="attachment"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="bg-black/20 border-white/10 text-white file:bg-purple-600 file:text-white file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-4 file:text-sm file:hover:bg-purple-700 cursor-pointer"
              />
              <p className="text-xs text-gray-500">Format image supporté (JPG, PNG). Max 5MB.</p>
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-900/50 text-red-200">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="pt-4 flex justify-end">
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white min-w-[150px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Envoyer
                  </>
                )}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackForm;
