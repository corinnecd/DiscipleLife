import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const VoiceInbox = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = React.useRef(new Audio());

  useEffect(() => {
    if (user) fetchMessages();
  }, [user]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('voice_messages')
      .select(`
        *,
        sender:profils!sender_id(first_name, last_name, avatar_url)
      `)
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setMessages(data);
  };

  const handlePlay = async (msg) => {
    if (playingId === msg.id) {
        audioRef.current.pause();
        setPlayingId(null);
        return;
    }

    // Mark as read if first time
    if (!msg.is_read) {
        await supabase
            .from('voice_messages')
            .update({ is_read: true })
            .eq('id', msg.id);
        
        // Update local state to show as read
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }

    audioRef.current.src = msg.audio_url;
    audioRef.current.play();
    setPlayingId(msg.id);
    
    audioRef.current.onended = () => setPlayingId(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Messages Vocaux de votre Mentor</h3>
      {messages.length === 0 && (
          <p className="text-slate-500 text-sm italic">Aucun message vocal reçu.</p>
      )}
      
      {messages.map((msg) => (
        <Card key={msg.id} className={`transition-all ${!msg.is_read ? 'border-primary/50 bg-primary/5' : 'border-slate-100'}`}>
            <CardContent className="p-4 flex items-center gap-4">
                <Button 
                    size="icon" 
                    className={`rounded-full shadow-md ${playingId === msg.id ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'}`}
                    onClick={() => handlePlay(msg)}
                >
                    {playingId === msg.id ? <Pause size={18} /> : <Play size={18} />}
                </Button>
                
                <div className="flex-1 overflow-hidden">
                    <h4 className="font-semibold text-slate-900 truncate">{msg.title || "Message vocal"}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">
                            {msg.sender?.first_name} {msg.sender?.last_name}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: fr })}
                        </span>
                    </div>
                </div>

                {msg.duration && (
                    <span className="text-xs font-mono bg-slate-200 px-2 py-1 rounded text-slate-600">
                        {Math.floor(msg.duration / 60)}:{String(msg.duration % 60).padStart(2, '0')}
                    </span>
                )}
                
                {msg.is_read && <CheckCircle size={16} className="text-green-500" />}
            </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default VoiceInbox;