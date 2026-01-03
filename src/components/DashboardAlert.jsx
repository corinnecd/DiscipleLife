
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function DashboardAlert() {
  return (
    <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-200">
      <Info className="h-4 w-4" />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>
        N'oubliez pas de vérifier vos rappels de prière aujourd'hui.
      </AlertDescription>
    </Alert>
  );
}
