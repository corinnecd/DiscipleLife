
import React from 'react';
import { useRole } from '@/context/RoleContext';
import MentorDashboard from './MentorDashboard';
import DiscipleDashboard from './DiscipleDashboard';
import { Loader2 } from 'lucide-react';

/**
 * AdminDashboard - Affiche le Dashboard Mentor ou Disciple selon le rôle de l'utilisateur
 * Remplace l'ancienne page Administration par un système de routage intelligent
 */
const AdminDashboard = () => {
  const { role, canHaveDisciples, loading } = useRole();

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si l'utilisateur est mentor ou peut avoir des disciples, afficher le Dashboard Mentor
  if (role === 'mentor' || canHaveDisciples) {
    return <MentorDashboard />;
  }

  // Sinon, afficher le Dashboard Disciple
  return <DiscipleDashboard />;
};

export default AdminDashboard;
