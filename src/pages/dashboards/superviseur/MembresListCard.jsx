import React from 'react';
import { MembersTableCard } from '@/components/MembersTableCard';

/**
 * Carte « Membres de la famille » : délègue au composant partagé MembersTableCard
 * avec titre et description spécifiques au dashboard superviseur.
 */
export function MembresListCard(props) {
  return (
    <MembersTableCard
      title="Membres de la famille"
      description="Liste complète des disciples de votre famille"
      showExport={true}
      showSelection={true}
      showFetchDisciples={true}
      showProgression={true}
      showSuiviPar={true}
      showNombreDisciples={true}
      {...props}
    />
  );
}
