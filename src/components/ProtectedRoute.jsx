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
     // Super Admin et Admin overrides everything
     if (role === 'super_admin' || role === 'admin') {
         return children;
     }

     // Pasteur a accès à Admin + Superviseur
     if (role === 'pasteur' && (requiredRole === 'admin' || requiredRole === 'superviseur')) {
         return children;
     }

     // Superviseur a accès uniquement à sa vue
     if (role === 'superviseur' && requiredRole === 'superviseur') {
         return children;
     }

     // Mentor/Berger a accès à sa vue
     if (role === 'mentor' && requiredRole === 'mentor') {
         return children;
     }

     // Disciple et Tutoré ont accès à leur vue
     if ((role === 'disciple' || role === 'tutore') && requiredRole === 'disciple') {
         return children;
     }

     // Si le rôle ne correspond pas, rediriger vers le dashboard
     return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;