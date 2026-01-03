
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function VideoSummaryUpload({ onSuccess }) {
  return (
    <div className="space-y-4 text-center p-8 border-2 border-dashed rounded-xl">
      <p>Fonctionnalité d'upload vidéo à venir.</p>
      <Button variant="outline" disabled>Sélectionner un fichier</Button>
    </div>
  );
}
