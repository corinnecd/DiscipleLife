import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * En-tête du tableau de bord superviseur (bouton retour).
 */
export function SuperviseurDashboardHeader({ onBack }) {
  return (
    <div className="flex items-center gap-2">
      {onBack && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
      )}
    </div>
  );
}

export default SuperviseurDashboardHeader;
