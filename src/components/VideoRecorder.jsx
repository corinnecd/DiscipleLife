
import React, { useState, useRef, useEffect } from 'react';
import { Video, Square, Trash2, Upload, AlertCircle, RefreshCw, Loader2, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const VideoRecorder = ({ onRecordingComplete, bucketName = 'videos' }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(0);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [streamActive, setStreamActive] = useState(false);

  const mediaRecorderRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      cleanupStream();
      if (videoURL) URL.revokeObjectURL(videoURL);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStreamActive(false);
    }
  };

  const startCamera = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Votre navigateur ne supporte pas l'enregistrement vidéo.");
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute preview to avoid feedback
        videoRef.current.play();
      }
      setStreamActive(true);
    } catch (err) {
      console.error("Camera access error:", err);
      handleError(err);
    }
  };

  const handleError = (err) => {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Permission refusée. Veuillez autoriser l'accès à la caméra et au micro.");
      } else if (err.name === 'NotFoundError') {
        setError("Aucune caméra ou micro détecté.");
      } else {
        setError(err.message || "Erreur d'accès aux périphériques.");
      }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    try {
      const options = { mimeType: 'video/webm;codecs=vp8,opus' };
      // Fallback for Safari if needed, though WebM is widely supported now or uses mp4
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
         console.warn(`${options.mimeType} not supported, trying default`);
         mediaRecorderRef.current = new MediaRecorder(streamRef.current);
      } else {
         mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
      }

      const chunks = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        
        if (blob.size > MAX_FILE_SIZE_BYTES) {
            setError(`Le fichier dépasse la limite de ${MAX_FILE_SIZE_MB}MB.`);
            setVideoBlob(null);
            return;
        }

        const url = URL.createObjectURL(blob);
        setVideoURL(url);
        setVideoBlob(blob);
        cleanupStream(); // Stop camera when reviewing
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
       console.error("Recording error:", err);
       setError("Impossible de démarrer l'enregistrement.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resetRecorder = () => {
      cleanupStream();
      setVideoBlob(null);
      setVideoURL(null);
      setDuration(0);
      setError(null);
      setIsRecording(false);
      startCamera(); // Restart camera for new take
  };

  const confirmDiscard = () => {
     if (videoBlob) {
        setShowDiscardDialog(true);
     } else {
        resetRecorder();
     }
  };

  const handleUpload = async () => {
    if (!videoBlob) return;
    
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const fileName = `video_${Date.now()}.webm`;
      
      // Simulate progress
      const progressInterval = setInterval(() => {
         setUploadProgress(prev => Math.min(prev + 5, 95));
      }, 500);

      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, videoBlob, {
          contentType: 'video/webm',
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);

      if (onRecordingComplete) {
        onRecordingComplete(publicUrlData.publicUrl);
      }
      
      toast({
        title: "Succès",
        description: "Vidéo téléchargée avec succès.",
      });
      
      // Full reset without restarting camera immediately (optional UX choice)
      setVideoBlob(null);
      setVideoURL(null);
      setDuration(0);

    } catch (err) {
      console.error("Upload error:", err);
      setError("Erreur lors du téléchargement. Vérifiez votre connexion.");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initial camera start
  useEffect(() => {
     if (!videoURL) startCamera();
     return () => cleanupStream();
  }, [videoURL]);

  return (
    <div className="bg-[#1a0b2e] p-6 rounded-xl border border-white/10 w-full max-w-2xl mx-auto space-y-4 shadow-xl">
      <div className="flex items-center justify-between mb-2">
         <h3 className="text-white font-semibold flex items-center gap-2">
            <Video size={18} className="text-teal-400" /> 
            Enregistreur Vidéo
         </h3>
         {isRecording && (
            <div className="flex items-center gap-2 animate-pulse bg-red-900/30 px-3 py-1 rounded-full border border-red-500/20">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                <span className="text-red-400 text-xs font-mono font-bold">REC {formatTime(duration)}</span>
            </div>
         )}
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-500/50 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" size="sm" onClick={startCamera} className="mt-2 border-red-500/30 hover:bg-red-500/20">
             <RefreshCw size={14} className="mr-2" /> Réessayer
          </Button>
        </Alert>
      )}

      <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-white/10 shadow-inner group">
         {!videoURL && (
            <video 
               ref={videoRef} 
               autoPlay 
               playsInline 
               muted 
               className={`w-full h-full object-cover transform scale-x-[-1] ${!streamActive ? 'hidden' : ''}`} 
            />
         )}
         
         {!streamActive && !videoURL && !error && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                 <Loader2 className="h-8 w-8 animate-spin mb-2" />
                 <span className="text-sm">Initialisation caméra...</span>
             </div>
         )}

         {videoURL && (
            <video 
               src={videoURL} 
               controls 
               className="w-full h-full object-contain" 
            />
         )}
         
         {isUploading && (
             <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 px-10">
                <Loader2 className="h-10 w-10 text-teal-500 animate-spin mb-4" />
                <span className="text-white font-medium mb-2">Téléchargement en cours... {Math.round(uploadProgress)}%</span>
                <Progress value={uploadProgress} className="h-2 w-full bg-gray-800" indicatorClassName="bg-teal-500" />
             </div>
         )}
      </div>

      <div className="flex justify-center gap-4 py-2">
        {!isRecording && !videoURL && streamActive && (
          <Button 
            onClick={startRecording} 
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all hover:scale-105"
          >
            <div className="w-6 h-6 rounded bg-white/20" /> 
            {/* Visual cue for record button often just a circle, but keeping it simple */}
          </Button>
        )}

        {isRecording && (
          <Button 
              onClick={stopRecording} 
              className="w-16 h-16 rounded-full bg-white text-black hover:bg-gray-200 animate-in zoom-in duration-200 shadow-lg"
          >
              <Square fill="currentColor" className="h-6 w-6" />
          </Button>
        )}

        {videoURL && !isUploading && (
          <>
            <Button 
              onClick={confirmDiscard} 
              variant="outline" 
              className="border-white/10 hover:bg-white/10 text-gray-300 gap-2"
            >
              <RotateCcw size={18} /> Refaire
            </Button>
            <Button 
              onClick={handleUpload} 
              className="bg-teal-500 hover:bg-teal-600 text-white gap-2 shadow-[0_0_15px_rgba(20,184,166,0.3)]"
            >
              <Upload size={18} /> Enregistrer la vidéo
            </Button>
          </>
        )}
      </div>

      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent className="bg-[#1a0b2e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Recommencer l'enregistrement ?</DialogTitle>
            <DialogDescription className="text-gray-400">
              La vidéo actuelle sera perdue si vous recommencez.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDiscardDialog(false)} className="border-white/10 hover:bg-white/5">
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => { setShowDiscardDialog(false); resetRecorder(); }}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoRecorder;
