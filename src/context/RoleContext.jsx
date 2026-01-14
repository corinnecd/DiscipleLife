
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';

const RoleContext = createContext();

export const RoleProvider = ({ children }) => {
  const { user } = useAuth();
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserRoleAndPermissions();
    } else {
      setRole(null);
      setPermissions({});
      setLoading(false);
    }
  }, [user]);

  const fetchUserRoleAndPermissions = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch basic role from profils
      // Using maybeSingle() to prevent PGRST116 if profile doesn't exist yet
      const { data: profileData, error: profileError } = await supabase
        .from('profils')
        .select('role, is_approved_as_disciple_maker')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const userRole = profileData?.role || 'disciple';
      setRole(userRole);

      // 2. Fetch detailed permissions
      // FIX: Changed .single() to .maybeSingle() to handle cases where no permission row exists
      const { data: permData, error: permError } = await supabase
        .from('user_permissions')
        .select('can_have_disciples')
        .eq('user_id', user.id)
        .maybeSingle();

      if (permError && permError.code !== 'PGRST116') {
          console.error("Error fetching permissions:", permError);
      }

      // Déterminer si l'utilisateur peut avoir des disciples
      const canHaveDisciples = 
        permData?.can_have_disciples || 
        profileData?.is_approved_as_disciple_maker || 
        userRole === 'mentor' || 
        userRole === 'admin' || 
        userRole === 'super_admin' || 
        userRole === 'superviseur' || 
        userRole === 'pasteur';

      setPermissions({
        canHaveDisciples,
        isApprovedDiscipleMaker: profileData?.is_approved_as_disciple_maker || false
      });

    } catch (err) {
      console.error("Error fetching role:", err);
      setRole('disciple'); // Fallback
    } finally {
      setLoading(false);
    }
  };

  const value = {
    role,
    permissions,
    loading,
    // Rôles existants
    isAdmin: role === 'admin',
    isMentor: role === 'mentor',
    isDisciple: role === 'disciple',
    // Nouveaux rôles
    isSuperAdmin: role === 'super_admin',
    isPasteur: role === 'pasteur',
    isSuperviseur: role === 'superviseur',
    isTutore: role === 'tutore',
    // Vues combinées
    hasAdminView: role === 'admin' || role === 'super_admin' || role === 'pasteur',
    hasSuperviseurView: role === 'superviseur' || role === 'admin' || role === 'super_admin' || role === 'pasteur',
    hasBergerView: role === 'mentor' || permissions.canHaveDisciples,
    // Permissions
    canHaveDisciples: permissions.canHaveDisciples || role === 'mentor' || role === 'superviseur' || role === 'admin' || role === 'super_admin' || role === 'pasteur'
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);
