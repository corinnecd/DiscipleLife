import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-4">
           <Loader2 className="h-10 w-10 animate-spin text-primary" />
           <p className="text-slate-500 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Handle role-based access
  if (requiredRole) {
     // Admin overrides everything
     if (role === 'admin') {
         return children;
     }

     if (requiredRole === 'mentor' && role !== 'mentor') {
         // If a disciple tries to access a mentor route, redirect to dashboard
         return <Navigate to="/dashboard" replace />;
     }

     if (requiredRole === 'disciple' && role !== 'disciple' && role !== 'mentor') {
        // Technically mentors can see disciple stuff, but if strict separation is needed:
        // return <Navigate to="/dashboard" replace />;
        // For now, let's assume mentors can view most things.
     }
  }

  return children;
};

export default ProtectedRoute;