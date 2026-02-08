
import React from 'react';
import AudioRecorder from '@/components/AudioRecorder';

export default function AudioSummaryUpload({ onSuccess }) {
  const handleComplete = (url, duration) => {
    // Logic to save summary to DB would go here
    if (import.meta.env.DEV) console.log("Audio saved:", url, duration);
    if (onSuccess) onSuccess();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Enregistrez votre résumé vocal.</p>
      <AudioRecorder 
        bucketName="user-summaries" 
        titlePrefix="summary_audio" 
        onUploadComplete={handleComplete} 
      />
    </div>
  );
}
