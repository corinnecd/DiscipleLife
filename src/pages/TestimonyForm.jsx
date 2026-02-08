import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, Mic, PenTool } from 'lucide-react';
import AudioRecorder from '@/components/AudioRecorder';

const TestimonyForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('text');
  
  const [formData, setFormData] = useState({
    author_name: user?.user_metadata?.full_name || '',
    title: '',
    content: '',
    audio_url: '',
    duration: 0
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Basic validation
      if (!formData.title) throw new Error("Le titre est obligatoire");
      if (activeTab === 'text' && !formData.content) throw new Error("Le contenu écrit est obligatoire");
      if (activeTab === 'audio' && !formData.audio_url) throw new Error("Veuillez enregistrer un témoignage audio");

      const { error } = await supabase
        .from('testimonies')
        .insert([{
            author_name: formData.author_name,
            title: formData.title,
            content: activeTab === 'text' ? formData.content : 'Témoignage Audio',
            audio_url: activeTab === 'audio' ? formData.audio_url : null,
            duration: activeTab === 'audio' ? formData.duration : null,
            user_id: user.id,
            status: 'pending' // Default status
        }]);

      if (error) throw error;

      toast({
        title: "Témoignage envoyé !",
        description: "Votre témoignage est en attente de validation par un mentor.",
      });
      navigate('/videos'); // Redirect to testimonies list
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAudioUploadComplete = (url, duration) => {
    setFormData(prev => ({ ...prev, audio_url: url, duration: duration }));
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto py-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/videos')}
        className="mb-6 hover:bg-slate-100"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux témoignages
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Partager votre témoignage</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="author_name">Votre nom</Label>
              <Input
                id="author_name"
                value={formData.author_name}
                onChange={(e) => setFormData({...formData, author_name: e.target.value})}
                placeholder="Votre nom complet"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titre du témoignage</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Ex: Ma guérison miraculeuse"
                required
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="text" className="flex items-center gap-2">
                    <PenTool size={16} /> Écrit
                </TabsTrigger>
                <TabsTrigger value="audio" className="flex items-center gap-2">
                    <Mic size={16} /> Vocal
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content">Votre histoire</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    placeholder="Racontez-nous ce que Dieu a fait..."
                    className="min-h-[200px]"
                  />
                </div>
              </TabsContent>

              <TabsContent value="audio" className="space-y-4 flex flex-col items-center py-4">
                 <Label className="mb-4 text-center block w-full">Enregistrez votre message vocal (max 5 min)</Label>
                 <AudioRecorder 
                    bucketName="audio-testimonies" 
                    titlePrefix="temoignage"
                    onUploadComplete={handleAudioUploadComplete} 
                 />
                 {formData.audio_url && (
                    <p className="text-sm text-green-600 font-medium mt-2">✓ Audio prêt à être envoyé</p>
                 )}
              </TabsContent>
            </Tabs>

            <Button type="submit" className="w-full" disabled={loading || (activeTab === 'audio' && !formData.audio_url)}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Envoyer le témoignage
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestimonyForm;