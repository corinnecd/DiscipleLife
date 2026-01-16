
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleSession = useCallback(async (session) => {
    setSession(session);
    const currentUser = session?.user ?? null;
    setUser(currentUser);

    if (currentUser) {
        // Fetch role from profile
        // Use maybeSingle() to avoid PGRST116 error if profile doesn't exist yet
        const { data, error } = await supabase
            .from('profils')
            .select('role')
            .eq('id', currentUser.id)
            .maybeSingle();
        
        if (!error && data) {
            setIsAdmin(data.role === 'admin');
        } else {
            setIsAdmin(false);
        }
    } else {
        setIsAdmin(false);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        handleSession(session);
      } catch (error) {
        console.error("Auth session error:", error);
        // Even if getSession fails (e.g. network error), we must stop loading
        // so the user isn't stuck on a blank screen.
        // If session is null, ProtectedRoute will redirect to login.
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        handleSession(session);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [handleSession]);

  const signUp = useCallback(async (email, password, options) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Échec de l'inscription",
        description: error.message || "Une erreur est survenue",
      });
    } else if (data?.user && !data?.session) {
      toast({
        title: "Inscription réussie",
        description: "Veuillez vérifier votre email pour confirmer votre compte.",
      });
    }

    return { data, error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Échec de la connexion",
        description: error.message || "Identifiants incorrects",
      });
    }

    return { data, error };
  }, [toast]);

  const signOut = useCallback(async () => {
    // Toujours nettoyer l'état local, même si la déconnexion côté serveur échoue
    // (par exemple si la session est déjà expirée)
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    
    // Essayer de déconnecter côté serveur
    const { error } = await supabase.auth.signOut();
    
    // Si l'erreur est liée à une session invalide/expirée, c'est normal, on ne l'affiche pas
    if (error && !error.message?.includes('session') && !error.message?.includes('JWT')) {
      toast({
        variant: "destructive",
        title: "Erreur de déconnexion",
        description: error.message,
      });
    } else {
      // Déconnexion réussie ou session déjà expirée (normal)
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
    }
    
    return { error };
  }, [toast]);

  const resetPassword = useCallback(async (email) => {
    // Determine current URL to ensure the redirect works in both dev and prod
    const redirectUrl = `${window.location.origin}/update-password`;
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'email de réinitialisation.",
      });
    } else {
      toast({
        title: "Email envoyé",
        description: "Vérifiez votre boîte de réception. Le lien vous redirigera pour changer votre mot de passe.",
      });
    }

    return { data, error };
  }, [toast]);

  const updateUserPassword = useCallback(async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ 
      password: newPassword 
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le mot de passe.",
      });
    } else {
      toast({
        title: "Succès",
        description: "Votre mot de passe a été mis à jour avec succès.",
      });
    }
    return { data, error };
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    isAdmin,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateUserPassword,
  }), [user, session, loading, isAdmin, signUp, signIn, signOut, resetPassword, updateUserPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
