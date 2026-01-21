/**
 * Gestionnaire d'erreurs centralisé
 * Fournit des messages d'erreur clairs et cohérents pour l'application
 */

// Types d'erreurs courantes
export const ErrorTypes = {
  NETWORK: 'NETWORK',
  AUTH: 'AUTH',
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION: 'PERMISSION',
  SERVER: 'SERVER',
  BAD_REQUEST: 'BAD_REQUEST',
  UNKNOWN: 'UNKNOWN'
};

// Messages d'erreur en français
const ErrorMessages = {
  [ErrorTypes.NETWORK]: {
    title: 'Problème de connexion',
    description: 'Impossible de se connecter au serveur. Vérifiez votre connexion internet et réessayez.',
    action: 'Vérifier la connexion'
  },
  [ErrorTypes.AUTH]: {
    title: 'Authentification requise',
    description: 'Votre session a expiré. Veuillez vous reconnecter pour continuer.',
    action: 'Se reconnecter'
  },
  [ErrorTypes.VALIDATION]: {
    title: 'Données invalides',
    description: 'Certains champs sont incorrects ou manquants. Veuillez vérifier vos saisies.',
    action: 'Vérifier les champs'
  },
  [ErrorTypes.NOT_FOUND]: {
    title: 'Élément introuvable',
    description: 'L\'élément recherché n\'existe pas ou a été supprimé.',
    action: 'Retour'
  },
  [ErrorTypes.PERMISSION]: {
    title: 'Accès non autorisé',
    description: 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.',
    action: 'Retour'
  },
  [ErrorTypes.SERVER]: {
    title: 'Erreur serveur',
    description: 'Une erreur est survenue côté serveur. Notre équipe a été notifiée. Veuillez réessayer plus tard.',
    action: 'Réessayer'
  },
  [ErrorTypes.BAD_REQUEST]: {
    title: 'Requête invalide',
    description: 'La requête envoyée est invalide ou mal formée. Veuillez vérifier les données saisies et réessayer.',
    action: 'Vérifier les données'
  },
  [ErrorTypes.UNKNOWN]: {
    title: 'Erreur inattendue',
    description: 'Une erreur inattendue s\'est produite. Veuillez réessayer ou contacter le support si le problème persiste.',
    action: 'Réessayer'
  }
};

// Messages spécifiques pour les codes d'erreur Supabase
const SupabaseErrorMessages = {
  '23505': { // Unique violation
    title: 'Élément déjà existant',
    description: 'Cet élément existe déjà dans la base de données. Veuillez vérifier les informations saisies.',
    type: ErrorTypes.VALIDATION
  },
  '23503': { // Foreign key violation
    title: 'Référence invalide',
    description: 'L\'élément référencé n\'existe pas. Veuillez vérifier vos sélections.',
    type: ErrorTypes.VALIDATION
  },
  'PGRST116': { // Not found
    title: 'Élément introuvable',
    description: 'L\'élément recherché n\'existe pas ou a été supprimé.',
    type: ErrorTypes.NOT_FOUND
  },
  '42501': { // Insufficient privilege
    title: 'Permission insuffisante',
    description: 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.',
    type: ErrorTypes.PERMISSION
  },
  'JWT_EXPIRED': {
    title: 'Session expirée',
    description: 'Votre session a expiré. Veuillez vous reconnecter.',
    type: ErrorTypes.AUTH
  }
};

/**
 * Analyse une erreur et retourne un type d'erreur standardisé
 */
export const analyzeError = (error) => {
  if (!error) return ErrorTypes.UNKNOWN;

  // Vérifier si c'est une erreur structurée avec format API externe
  // Format: { error: "ERROR_BAD_REQUEST", details: { title, detail, ... }, isRetryable, ... }
  if (error.error === 'ERROR_BAD_REQUEST' || error.error?.includes('BAD_REQUEST')) {
    return ErrorTypes.BAD_REQUEST;
  }

  // Vérifier si c'est une erreur réseau
  if (error.message?.includes('Failed to fetch') || 
      error.message?.includes('NetworkError') ||
      error.code === 'ECONNREFUSED' ||
      error.message?.includes('network')) {
    return ErrorTypes.NETWORK;
  }

  // Vérifier si c'est une erreur Supabase
  if (error.code) {
    const supabaseError = SupabaseErrorMessages[error.code];
    if (supabaseError) {
      return supabaseError.type;
    }
  }

  // Vérifier les messages d'erreur Supabase spécifiques
  if (error.message) {
    const lowerMessage = error.message.toLowerCase();
    
    if (lowerMessage.includes('jwt') || lowerMessage.includes('token') || lowerMessage.includes('session')) {
      return ErrorTypes.AUTH;
    }
    
    if (lowerMessage.includes('permission') || lowerMessage.includes('unauthorized') || lowerMessage.includes('forbidden')) {
      return ErrorTypes.PERMISSION;
    }
    
    if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist')) {
      return ErrorTypes.NOT_FOUND;
    }
    
    if (lowerMessage.includes('validation') || lowerMessage.includes('invalid') || lowerMessage.includes('required')) {
      return ErrorTypes.VALIDATION;
    }
    
    if (lowerMessage.includes('bad request') || lowerMessage.includes('400')) {
      return ErrorTypes.BAD_REQUEST;
    }
    
    if (lowerMessage.includes('server') || lowerMessage.includes('500') || lowerMessage.includes('502') || lowerMessage.includes('503')) {
      return ErrorTypes.SERVER;
    }
  }

  return ErrorTypes.UNKNOWN;
};

/**
 * Obtient un message d'erreur formaté pour l'affichage
 */
export const getErrorMessage = (error, customMessage = null) => {
  const errorType = analyzeError(error);
  const baseMessage = ErrorMessages[errorType];
  
  // Si un message personnalisé est fourni, l'utiliser
  if (customMessage) {
    return {
      ...baseMessage,
      description: customMessage
    };
  }

  // Gérer les erreurs structurées avec format API externe
  // Format: { error: "ERROR_BAD_REQUEST", details: { title, detail, ... }, isRetryable, ... }
  if (error?.error && error?.details) {
    const details = error.details;
    return {
      title: details.title || baseMessage.title,
      description: details.detail || details.description || details.title || baseMessage.description,
      action: baseMessage.action,
      isRetryable: error.isRetryable || false,
      additionalInfo: error.additionalInfo || {}
    };
  }

  // Vérifier s'il y a un message Supabase spécifique
  if (error?.code && SupabaseErrorMessages[error.code]) {
    const supabaseError = SupabaseErrorMessages[error.code];
    return {
      ...ErrorMessages[supabaseError.type],
      description: supabaseError.description
    };
  }

  // Utiliser le message d'erreur original s'il est disponible et informatif
  if (error?.message && !error.message.includes('Failed to fetch') && !error.message.includes('NetworkError')) {
    // Nettoyer le message d'erreur pour l'afficher de manière plus lisible
    const cleanedMessage = error.message
      .replace(/^Error: /, '')
      .replace(/\.$/, '')
      .trim();
    
    if (cleanedMessage.length > 0 && cleanedMessage.length < 200) {
      return {
        ...baseMessage,
        description: cleanedMessage
      };
    }
  }

  return baseMessage;
};

/**
 * Formate une erreur pour l'affichage dans un toast
 */
export const formatErrorForToast = (error, customMessage = null) => {
  const errorInfo = getErrorMessage(error, customMessage);
  
  return {
    variant: 'destructive',
    title: errorInfo.title,
    description: errorInfo.description,
    duration: 5000
  };
};

/**
 * Log une erreur avec contexte pour le debugging
 */
export const logError = (error, context = {}) => {
  const errorType = analyzeError(error);
  const errorInfo = getErrorMessage(error);
  
  const logData = {
    type: errorType,
    message: errorInfo.description,
    originalError: error?.message || error?.toString(),
    code: error?.code || error?.error,
    context,
    timestamp: new Date().toISOString()
  };

  // Ajouter les détails supplémentaires pour les erreurs structurées
  if (error?.details) {
    logData.details = error.details;
  }
  if (error?.isRetryable !== undefined) {
    logData.isRetryable = error.isRetryable;
  }
  if (error?.additionalInfo) {
    logData.additionalInfo = error.additionalInfo;
  }

  // Log seulement les erreurs non-réseau en production
  if (errorType !== ErrorTypes.NETWORK) {
    console.error('Application Error:', logData);
  } else {
    console.warn('Network Error:', logData);
  }

  // Ici, on pourrait envoyer l'erreur à un service de logging externe
  // Exemple: Sentry, LogRocket, etc.
  
  return logData;
};

/**
 * Gère une erreur de manière complète (log + format pour toast)
 */
export const handleError = (error, context = {}, customMessage = null) => {
  const loggedError = logError(error, context);
  const toastFormat = formatErrorForToast(error, customMessage);
  
  return {
    toast: toastFormat,
    errorInfo: loggedError
  };
};

export default {
  ErrorTypes,
  analyzeError,
  getErrorMessage,
  formatErrorForToast,
  logError,
  handleError
};
