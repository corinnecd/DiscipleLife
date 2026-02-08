
import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Trash2, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export default function AudioRecorder({ bucketName = 'voice-messages', titlePrefix = 'audio', onUploadComplete }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'accéder au microphone." });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    chunksRef.current = [];
  };

  const uploadRecording = async () => {
    if (!audioBlob || !user) return;

    setIsUploading(true);
    try {
      const fileName = `${user.id}/${titlePrefix}_${Date.now()}.webm`;
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, audioBlob);

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      if (onUploadComplete) {
        onUploadComplete(publicData.publicUrl, duration);
      }
      
      toast({ title: "Succès", description: "Audio enregistré et téléchargé." });

    } catch (error) {
      console.error("Upload error:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Échec du téléchargement." });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 border rounded-xl bg-slate-50 dark:bg-slate-900">
      {!audioUrl ? (
        <Button
          variant={isRecording ? "destructive" : "default"}
          size="lg"
          className={`rounded-full w-16 h-16 ${isRecording ? 'animate-pulse' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? <Square size={24} /> : <Mic size={24} />}
        </Button>
      ) : (
        <div className="flex items-center gap-4 w-full">
          <audio src={audioUrl} controls className="flex-1 h-10" />
          <Button variant="ghost" size="icon" onClick={resetRecording} className="text-red-500" aria-label="Supprimer l'enregistrement">
            <Trash2 size={20} />
          </Button>
        </div>
      )}
      
      {isRecording && <p className="text-sm text-red-500 font-medium animate-pulse">Enregistrement en cours...</p>}
      
      {audioUrl && !isUploading && (
        <Button onClick={uploadRecording} className="w-full gap-2">
          <Upload size={16} /> Confirmer l'enregistrement
        </Button>
      )}
      
      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={16} /> Téléchargement...
        </div>
      )}
    </div>
  );
}
