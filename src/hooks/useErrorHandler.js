import { useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { handleError as handleErrorUtil } from '@/lib/ErrorHandler';

/**
 * Hook personnalisé pour la gestion d'erreurs
 * Simplifie l'utilisation du système de gestion d'erreurs dans les composants
 * 
 * @returns {Object} Fonctions utilitaires pour gérer les erreurs
 */
export const useErrorHandler = () => {
  const { toast } = useToast();

  /**
   * Gère une erreur et affiche un toast (référence stable pour éviter les boucles dans les useEffect).
   */
  const handleError = useCallback((error, context = {}, customMessage = null) => {
    const { toast: errorToast, errorInfo } = handleErrorUtil(error, context, customMessage);
    toast({ ...errorToast });
    return errorInfo;
  }, [toast]);

  /**
   * Wrapper pour les fonctions async qui gère automatiquement les erreurs
   */
  const withErrorHandling = useCallback(async (asyncFunction, context = {}, customMessage = null) => {
    try {
      return await asyncFunction();
    } catch (error) {
      handleError(error, context, customMessage);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    withErrorHandling
  };
};

export default useErrorHandler;
