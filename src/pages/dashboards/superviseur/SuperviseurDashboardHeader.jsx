import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * En-tête du tableau de bord superviseur : bouton Retour.
 */
export function SuperviseurDashboardHeader({ onBack }) {
  return (
    <Button
      variant="ghost"
      onClick={onBack}
      className="mb-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Retour
    </Button>
  );
}
