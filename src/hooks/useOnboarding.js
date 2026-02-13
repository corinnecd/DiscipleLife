import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour gérer l'état de l'onboarding
 * Sauvegarde et restaure l'état depuis localStorage
 * @returns {Object} - État et fonctions de gestion de l'onboarding
 */
export const useOnboarding = () => {
  const [state, setState] = useState({
    currentStep: 1,
    selectedRole: null,
    formData: {},
    isCompleted: false,
    startedAt: null
  });

  // Charger l'état depuis localStorage au montage
  useEffect(() => {
    const saved = localStorage.getItem('onboarding_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(parsed);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'état d\'onboarding:', error);
      }
    }
  }, []);

  // Sauvegarder l'état dans localStorage à chaque changement
  useEffect(() => {
    if (state.currentStep > 1 || state.selectedRole) {
      localStorage.setItem('onboarding_state', JSON.stringify(state));
    }
  }, [state]);

  /**
   * Passer à l'étape suivante
   */
  const nextStep = () => {
    setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
  };

  /**
   * Revenir à l'étape précédente
   */
  const prevStep = () => {
    setState(prev => ({ 
      ...prev, 
      currentStep: Math.max(1, prev.currentStep - 1) 
    }));
  };

  /**
   * Aller à une étape spécifique
   */
  const goToStep = (step) => {
    setState(prev => ({ ...prev, currentStep: step }));
  };

  /**
   * Définir le rôle sélectionné
   */
  const setRole = (role) => {
    setState(prev => ({ 
      ...prev, 
      selectedRole: role,
      startedAt: prev.startedAt || new Date().toISOString()
    }));
  };

  /**
   * Mettre à jour les données du formulaire
   */
  const updateFormData = (data) => {
    setState(prev => ({ 
      ...prev, 
      formData: { ...prev.formData, ...data } 
    }));
  };

  /**
   * Marquer l'onboarding comme complété
   */
  const completeOnboarding = () => {
    setState(prev => ({ 
      ...prev, 
      isCompleted: true,
      completedAt: new Date().toISOString()
    }));
    
    // Nettoyer le localStorage après un court délai
    setTimeout(() => {
      localStorage.removeItem('onboarding_state');
      localStorage.removeItem('quick_signup_data');
      localStorage.removeItem('onboarding_user_email');
    }, 1000);
  };

  /**
   * Réinitialiser complètement l'onboarding
   */
  const resetOnboarding = () => {
    setState({
      currentStep: 1,
      selectedRole: null,
      formData: {},
      isCompleted: false,
      startedAt: null
    });
    localStorage.removeItem('onboarding_state');
    localStorage.removeItem('quick_signup_data');
    localStorage.removeItem('onboarding_user_email');
  };

  /**
   * Calculer la durée de l'onboarding
   */
  const getDuration = () => {
    if (!state.startedAt) return 0;
    const start = new Date(state.startedAt);
    const end = state.completedAt ? new Date(state.completedAt) : new Date();
    return Math.floor((end - start) / 1000); // En secondes
  };

  return {
    currentStep: state.currentStep,
    selectedRole: state.selectedRole,
    formData: state.formData,
    isCompleted: state.isCompleted,
    startedAt: state.startedAt,
    nextStep,
    prevStep,
    goToStep,
    setRole,
    updateFormData,
    completeOnboarding,
    resetOnboarding,
    getDuration
  };
};

export default useOnboarding;
