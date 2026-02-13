import React from 'react';
import { ArrowLeft, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * En-tête du tableau de bord superviseur (bouton retour + lien arbre).
 */
export function SuperviseurDashboardHeader({ onBack, onArbre }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
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
      {onArbre && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onArbre}
          className="text-gray-700 border-gray-300"
        >
          <GitBranch className="h-4 w-4 mr-1" />
          Mon arbre
        </Button>
      )}
    </div>
  );
}

export default SuperviseurDashboardHeader;
