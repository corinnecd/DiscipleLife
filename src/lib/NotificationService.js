/**
 * NotificationService - Service pour gérer les notifications push du navigateur
 * 
 * Ce service gère :
 * - L'enregistrement du service worker
 * - La demande de permission pour les notifications
 * - L'envoi de notifications push
 * - La personnalisation des messages selon le contexte
 */

/**
 * Enregistre le service worker
 * @returns {Promise<ServiceWorkerRegistration>}
 */
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('✅ Service Worker enregistré avec succès:', registration.scope);
      return registration;
    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement du Service Worker:', error);
      return null;
    }
  } else {
    console.warn('⚠️ Service Worker non supporté par ce navigateur');
    return null;
  }
};

/**
 * Demande la permission pour les notifications
 * @returns {Promise<NotificationPermission>}
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('⚠️ Les notifications ne sont pas supportées par ce navigateur');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('❌ Erreur lors de la demande de permission:', error);
      return 'denied';
    }
  }

  return Notification.permission;
};

/**
 * Vérifie si les notifications sont autorisées
 * @returns {boolean}
 */
export const isNotificationPermissionGranted = () => {
  return 'Notification' in window && Notification.permission === 'granted';
};

/**
 * Envoie une notification push via le service worker
 * @param {Object} options - Options de la notification
 * @param {string} options.title - Titre de la notification
 * @param {string} options.body - Corps de la notification
 * @param {string} options.icon - URL de l'icône (optionnel)
 * @param {string} options.badge - URL du badge (optionnel)
 * @param {string} options.tag - Tag pour regrouper les notifications (optionnel)
 * @param {boolean} options.requireInteraction - Nécessite une interaction (optionnel)
 * @param {Object} options.data - Données additionnelles (optionnel)
 * @param {Array} options.actions - Actions disponibles (optionnel)
 * @returns {Promise<void>}
 */
export const sendPushNotification = async ({
  title,
  body,
  icon = '/vite.svg',
  badge = '/vite.svg',
  tag = 'disciple-life-notification',
  requireInteraction = false,
  data = {},
  actions = []
}) => {
  // Vérifier la permission
  if (!isNotificationPermissionGranted()) {
    console.warn('⚠️ Permission de notification non accordée');
    return;
  }

  // Vérifier que le service worker est enregistré
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service Worker non supporté');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    await registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      requireInteraction,
      data,
      actions,
      vibrate: [200, 100, 200],
      timestamp: Date.now()
    });

    console.log('✅ Notification push envoyée:', title);
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification push:', error);
  }
};

/**
 * Génère un message personnalisé selon le type de crise
 * @param {string} typeCrise - Type de crise (deuil, divorce, maladie, etc.)
 * @param {Object} suivi - Données du suivi post-crise
 * @returns {Object} - Objet avec title et body personnalisés
 */
export const generatePersonalizedCrisisMessage = (typeCrise, suivi) => {
  const typeCriseLabels = {
    'deuil': 'Deuil',
    'divorce': 'Divorce',
    'maladie': 'Maladie',
    'chomage': 'Chômage',
    'trauma': 'Trauma',
    'depression': 'Dépression',
    'addiction': 'Addiction',
    'conflit_familial': 'Conflit Familial',
    'crise_spirituelle': 'Crise Spirituelle',
    'autre': 'Autre'
  };

  const typeCriseLabel = typeCriseLabels[typeCrise] || typeCrise;
  
  // Messages personnalisés selon le type de crise
  const messages = {
    'deuil': {
      title: '💙 Rappel - Accompagnement dans le Deuil',
      body: `Il est temps de faire le point sur votre parcours de guérison. Nous sommes là pour vous accompagner dans cette période difficile.`
    },
    'divorce': {
      title: '💔 Rappel - Reconstruction après Divorce',
      body: `Votre suivi post-divorce nécessite votre attention. Continuons ensemble votre cheminement vers la guérison et la restauration.`
    },
    'maladie': {
      title: '🏥 Rappel - Suivi de Santé',
      body: `Il est temps de mettre à jour votre suivi de santé. Votre bien-être est important pour nous.`
    },
    'chomage': {
      title: '💼 Rappel - Accompagnement Professionnel',
      body: `Faisons le point sur votre situation professionnelle. Nous sommes là pour vous soutenir dans cette période de transition.`
    },
    'trauma': {
      title: '🛡️ Rappel - Guérison du Trauma',
      body: `Votre parcours de guérison nécessite un suivi régulier. Continuons ensemble vers la restauration complète.`
    },
    'depression': {
      title: '🌱 Rappel - Suivi de Dépression',
      body: `Il est important de faire le point sur votre état. Vous n'êtes pas seul(e), nous sommes là pour vous accompagner.`
    },
    'addiction': {
      title: '🔓 Rappel - Libération de l\'Addiction',
      body: `Votre cheminement vers la liberté nécessite un suivi régulier. Continuons ensemble vers la victoire totale.`
    },
    'conflit_familial': {
      title: '👨‍👩‍👧‍👦 Rappel - Résolution de Conflit Familial',
      body: `Il est temps de faire le point sur la résolution de votre conflit familial. La réconciliation est possible.`
    },
    'crise_spirituelle': {
      title: '🙏 Rappel - Restauration Spirituelle',
      body: `Votre foi traverse une période difficile. Continuons ensemble vers la restauration de votre relation avec Dieu.`
    },
    'autre': {
      title: '📋 Rappel - Suivi Post-Crise',
      body: `Il est temps de faire le point sur votre suivi. Continuons ensemble votre cheminement vers la guérison.`
    }
  };

  // Message par défaut ou personnalisé selon le type
  const baseMessage = messages[typeCrise] || messages['autre'];
  
  // Personnaliser avec les informations du suivi si disponibles
  let personalizedBody = baseMessage.body;
  
  if (suivi.prochaine_action && suivi.date_prochaine_action) {
    const dateAction = new Date(suivi.date_prochaine_action);
    const dateFormatted = dateAction.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long' 
    });
    personalizedBody += `\n\nProchaine action prévue: ${suivi.prochaine_action} (${dateFormatted}).`;
  }

  if (suivi.gravite) {
    personalizedBody += `\n\nNiveau de gravité: ${suivi.gravite}/10.`;
  }

  return {
    title: baseMessage.title,
    body: personalizedBody,
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: `suivi-post-crise-${suivi.id}`,
    requireInteraction: suivi.gravite >= 7, // Interaction requise si gravité élevée
    data: {
      type: 'suivi_post_crise_reminder',
      suivi_id: suivi.id,
      type_crise: typeCrise,
      redirect_to: '/transformation?tab=suivi-post-crise'
    },
    actions: [
      {
        action: 'open',
        title: 'Voir mon suivi'
      },
      {
        action: 'dismiss',
        title: 'Plus tard'
      }
    ]
  };
};

/**
 * Envoie une notification push personnalisée pour un suivi post-crise
 * @param {Object} suivi - Données du suivi post-crise
 * @param {string} frequenceLabel - Label de la fréquence
 * @returns {Promise<void>}
 */
export const sendSuiviPostCrisePushNotification = async (suivi, frequenceLabel) => {
  if (!isNotificationPermissionGranted()) {
    console.log('ℹ️ Permission de notification non accordée, notification push ignorée');
    return;
  }

  const message = generatePersonalizedCrisisMessage(suivi.type_crise, suivi);
  
  await sendPushNotification({
    ...message,
    body: `${message.body}\n\nRappel ${frequenceLabel}.`
  });
};

/**
 * Initialise le service de notifications
 * @returns {Promise<void>}
 */
export const initializeNotificationService = async () => {
  // Enregistrer le service worker
  await registerServiceWorker();
  
  // Demander la permission si pas déjà accordée
  const permission = await requestNotificationPermission();
  
  if (permission === 'granted') {
    console.log('✅ Notifications push activées');
  } else {
    console.log('ℹ️ Notifications push non autorisées');
  }
};
