import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Play, Pause, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
const TestimonyModeration = () => {
  const [pendingTestimonies, setPendingTestimonies] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [playingId, setPlayingId] = useState(null);
  const audioRef = React.useRef(new Audio());

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('testimonies')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (data) setPendingTestimonies(data);
    setLoading(false);
  };

  const handleAction = async (id, action) => {
    const status = action === 'approve' ? 'approved' : 'rejected';
    
    const { error } = await supabase
        .from('testimonies')
        .update({ status })
        .eq('id', id);

    if (!error) {
        setPendingTestimonies(prev => prev.filter(t => t.id !== id));
        toast({
            title: action === 'approve' ? "Témoignage approuvé" : "Témoignage rejeté",
            variant: action === 'approve' ? "default" : "destructive"
        });
    }
  };

  const togglePlay = (url, id) => {
      if (playingId === id) {
          audioRef.current.pause();
          setPlayingId(null);
      } else {
          audioRef.current.src = url;
          audioRef.current.play();
          setPlayingId(id);
      }
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <AlertCircle className="text-orange-500" />
        Modération des Témoignages
      </h1>

      {pendingTestimonies.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">Aucun témoignage en attente</h3>
              <p className="text-slate-500 text-sm">Tous les témoignages ont été modérés ou aucun n'a été soumis.</p>
          </div>
      ) : (
          <div className="grid gap-6">
              {pendingTestimonies.map((item) => (
                  <Card key={item.id} className="bg-white">
                      <CardHeader className="flex flex-row items-start justify-between">
                          <div>
                              <CardTitle>{item.title}</CardTitle>
                              <p className="text-sm text-slate-500">Par {item.author_name}</p>
                          </div>
                          <Badge variant="outline" className="text-orange-500 border-orange-200 bg-orange-50">
                              En attente
                          </Badge>
                      </CardHeader>
                      <CardContent>
                          {item.audio_url ? (
                               <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                   <Button size="icon" variant="ghost" className="rounded-full bg-white shadow-sm" onClick={() => togglePlay(item.audio_url, item.id)} aria-label={playingId === item.id ? "Pause" : "Écouter"}>
                                       {playingId === item.id ? <Pause size={20} /> : <Play size={20} />}
                                   </Button>
                                   <span className="text-sm font-medium">Écouter le témoignage audio</span>
                               </div>
                          ) : (
                              <p className="text-slate-700 bg-slate-50 p-4 rounded-lg text-sm">{item.content}</p>
                          )}
                      </CardContent>
                      <CardFooter className="flex justify-end gap-3 pt-0">
                          <Button 
                            variant="outline" 
                            className="text-red-500 hover:bg-red-50 hover:text-red-600 border-red-100"
                            onClick={() => handleAction(item.id, 'reject')}
                          >
                              <X className="mr-2 h-4 w-4" /> Rejeter
                          </Button>
                          <Button 
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleAction(item.id, 'approve')}
                          >
                              <Check className="mr-2 h-4 w-4" /> Approuver
                          </Button>
                      </CardFooter>
                  </Card>
              ))}
          </div>
      )}
    </div>
  );
};

export default TestimonyModeration;