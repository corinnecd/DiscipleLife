
import React from 'react';
import { useRole } from '@/context/RoleContext';
import MentorDashboard from './dashboards/MentorDashboard';
import DiscipleDashboard from './dashboards/DiscipleDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import SuperviseurDashboard from './dashboards/SuperviseurDashboard';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { role, loading } = useRole();

  if (loading) {
    return (
        <div className="flex h-full w-full items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (role === 'admin') {
    return <AdminDashboard />;
  }

  if (role === 'superviseur') {
    return <SuperviseurDashboard />;
  }

  if (role === 'mentor') {
    return <MentorDashboard />;
  }

  // Default to Disciple Dashboard for 'disciple' or 'user' roles
  return <DiscipleDashboard />;
};

export default Dashboard;
