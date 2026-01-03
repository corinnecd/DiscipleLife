
import React from 'react';
import { Button } from '@/components/ui/button';

export default function VideoRecorderSummary({ onSuccess }) {
  return (
    <div className="space-y-4 text-center p-8 border-2 border-dashed rounded-xl">
      <p>Fonctionnalité d'enregistrement vidéo à venir.</p>
      <Button variant="outline" disabled>Ouvrir la caméra</Button>
    </div>
  );
}
