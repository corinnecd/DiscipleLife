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
   * Gère une erreur et affiche un toast
   * @param {Error} error - L'erreur à gérer
   * @param {Object} context - Contexte supplémentaire pour le logging
   * @param {string} customMessage - Message personnalisé (optionnel)
   */
  const handleError = (error, context = {}, customMessage = null) => {
    const { toast: errorToast, errorInfo } = handleErrorUtil(error, context, customMessage);
    toast({ ...errorToast });
    return errorInfo;
  };

  /**
   * Wrapper pour les fonctions async qui gère automatiquement les erreurs
   * @param {Function} asyncFunction - La fonction async à exécuter
   * @param {Object} context - Contexte pour le logging
   * @param {string} customMessage - Message personnalisé en cas d'erreur
   * @returns {Promise} Le résultat de la fonction ou null en cas d'erreur
   */
  const withErrorHandling = async (asyncFunction, context = {}, customMessage = null) => {
    try {
      return await asyncFunction();
    } catch (error) {
      handleError(error, context, customMessage);
      return null;
    }
  };

  return {
    handleError,
    withErrorHandling
  };
};

export default useErrorHandler;
