import React from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * En-tête du tableau de bord superviseur : Retour + Rafraîchir.
 */
export function SuperviseurDashboardHeader({ onBack, onRefresh, refreshing }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className="text-gray-600 hover:text-gray-900"
        >
          <RefreshCw className={refreshing ? 'h-4 w-4 mr-2 animate-spin' : 'h-4 w-4 mr-2'} />
          Rafraîchir
        </Button>
      )}
    </div>
  );
}
