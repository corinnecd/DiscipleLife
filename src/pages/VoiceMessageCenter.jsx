import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AudioRecorder from '@/components/AudioRecorder';
import { Users, Send, Loader2 } from 'lucide-react';

const VoiceMessageCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [disciples, setDisciples] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(''); // 'group' or specific UUID
  const [messageTitle, setMessageTitle] = useState('');
  const [audioData, setAudioData] = useState(null); // { url, duration }
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchDisciples();
  }, [user]);

  const fetchDisciples = async () => {
      const { data, error } = await supabase
        .from('profils')
        .select('id, first_name, last_name')
        .eq('mentor_id', user.id)
        .eq('role', 'disciple');
        
      if (!error && data) {
          setDisciples(data);
      }
  };

  const handleAudioComplete = (url, duration) => {
    setAudioData({ url, duration });
  };

  const handleSend = async () => {
      if (!audioData || !selectedRecipient || !messageTitle) {
          toast({ variant: "destructive", title: "Incomplet", description: "Veuillez remplir tous les champs et enregistrer un message." });
          return;
      }

      setSending(true);
      try {
        let recipients = [];

        if (selectedRecipient === 'all_group') {
            recipients = disciples.map(d => d.id);
        } else {
            recipients = [selectedRecipient];
        }

        // Source unique : profils. Les destinataires viennent de profils (mentor_id = user.id, role = disciple).
        const messages = recipients.map(receiverId => ({
            sender_id: user.id,
            receiver_id: receiverId,
            audio_url: audioData.url,
            duration: audioData.duration,
            title: messageTitle
        }));
        const { error } = await supabase.from('voice_messages').insert(messages);

        if (error) throw error;

        toast({ title: "Envoyé", description: "Message vocal envoyé avec succès !" });
        setMessageTitle('');
        setSelectedRecipient('');
        setAudioData(null);
        // Force key reset on recorder component if needed (usually handled by parent state reset, simpler here to just reload or clear)

      } catch (error) {
          console.error(error);
          toast({ 
              variant: "destructive", 
              title: "Erreur", 
              description: "Erreur lors de l'envoi. Assurez-vous que le disciple a un compte actif." 
          });
      } finally {
          setSending(false);
      }
  };

  return (
    <div className="w-full max-w-[1800px] mx-auto py-8 space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="text-primary" /> Centre de Messagerie Vocale
        </h1>

        <Card>
            <CardHeader>
                <CardTitle>Envoyer un message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Destinataire</Label>
                    <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choisir un destinataire" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all_group" className="font-bold text-primary">
                                Tout mon groupe ({disciples.length})
                            </SelectItem>
                            {disciples.map(d => (
                                <SelectItem key={d.id} value={d.id}>
                                    {d.first_name} {d.last_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Sujet du message</Label>
                    <Input 
                        value={messageTitle} 
                        onChange={e => setMessageTitle(e.target.value)} 
                        placeholder="Ex: Encouragement de la semaine" 
                    />
                </div>

                <div className="space-y-2">
                    <Label>Message Audio</Label>
                    <div className="flex justify-center">
                        <AudioRecorder 
                            bucketName="voice-messages" 
                            titlePrefix="vm"
                            onUploadComplete={handleAudioComplete}
                        />
                    </div>
                </div>

                <Button 
                    onClick={handleSend} 
                    className="w-full" 
                    disabled={sending || !audioData}
                >
                    {sending ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                    Envoyer le message
                </Button>
            </CardContent>
        </Card>
    </div>
  );
};

export default VoiceMessageCenter;