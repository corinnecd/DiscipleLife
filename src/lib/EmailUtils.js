/**
 * EmailUtils - Utilitaires pour l'envoi d'emails
 * 
 * Ce module fournit des fonctions pour envoyer des emails via différents services.
 * Actuellement, il supporte :
 * - Supabase Edge Functions (recommandé)
 * - Services externes (Resend, SendGrid, etc.)
 * 
 * Pour utiliser Supabase Edge Functions :
 * 1. Créer une Edge Function dans supabase/functions/send-email/
 * 2. Configurer les variables d'environnement dans Supabase
 * 3. La fonction sera automatiquement appelée
 * 
 * Pour utiliser un service externe :
 * 1. Configurer les variables d'environnement (API keys)
 * 2. Modifier la fonction sendEmail pour utiliser le service choisi
 */

import { supabase } from './customSupabaseClient';

/**
 * Envoie un email via Supabase Edge Function ou service externe
 * @param {Object} options - Options d'envoi d'email
 * @param {string} options.to - Adresse email du destinataire
 * @param {string} options.subject - Sujet de l'email
 * @param {string} options.html - Contenu HTML de l'email
 * @param {string} options.text - Contenu texte de l'email (optionnel)
 * @param {Object} options.metadata - Métadonnées additionnelles (optionnel)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendEmail = async ({ to, subject, html, text, metadata = {} }) => {
  try {
    // Option 1: Utiliser Supabase Edge Function (recommandé)
    // La Edge Function doit être déployée dans supabase/functions/send-email/
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // Extraire le texte du HTML si text n'est pas fourni
        metadata
      }
    });

    if (error) {
      console.error('Erreur Edge Function send-email:', error);
      // Fallback: Essayer un service externe si configuré
      return await sendEmailViaExternalService({ to, subject, html, text, metadata });
    }

    return { success: true, data };
  } catch (error) {
    console.error('Erreur envoi email:', error);
    
    // Fallback: Essayer un service externe
    try {
      return await sendEmailViaExternalService({ to, subject, html, text, metadata });
    } catch (fallbackError) {
      console.error('Erreur fallback email:', fallbackError);
      return { 
        success: false, 
        error: 'Impossible d\'envoyer l\'email. Vérifiez la configuration du service d\'email.' 
      };
    }
  }
};

/**
 * Envoie un email via un service externe (Resend, SendGrid, etc.)
 * Cette fonction peut être modifiée pour utiliser n'importe quel service d'email
 * @param {Object} options - Options d'envoi d'email
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const sendEmailViaExternalService = async ({ to, subject, html, text, metadata }) => {
  // Option 2: Utiliser Resend (exemple)
  // Nécessite une clé API Resend dans les variables d'environnement
  const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
  
  if (RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: import.meta.env.VITE_EMAIL_FROM || 'DiscipleLife <noreply@disciplelife.app>',
          to: [to],
          subject,
          html,
          text: text || html.replace(/<[^>]*>/g, '')
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur envoi email');
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Erreur Resend:', error);
      throw error;
    }
  }

  // Option 3: Utiliser SendGrid (exemple)
  const SENDGRID_API_KEY = import.meta.env.VITE_SENDGRID_API_KEY;
  
  if (SENDGRID_API_KEY) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SENDGRID_API_KEY}`
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: to }]
          }],
          from: {
            email: import.meta.env.VITE_EMAIL_FROM || 'noreply@disciplelife.app',
            name: 'DiscipleLife'
          },
          subject,
          content: [
            {
              type: 'text/html',
              value: html
            },
            {
              type: 'text/plain',
              value: text || html.replace(/<[^>]*>/g, '')
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Erreur envoi email');
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur SendGrid:', error);
      throw error;
    }
  }

  // Si aucun service n'est configuré, retourner une erreur
  throw new Error('Aucun service d\'email configuré. Veuillez configurer une Edge Function Supabase ou un service externe.');
};

/**
 * Génère le template HTML pour une notification de suivi post-crise
 * @param {Object} suivi - Données du suivi post-crise
 * @param {string} frequenceLabel - Label de la fréquence
 * @param {string} baseUrl - URL de base de l'application (optionnel)
 * @returns {string} HTML de l'email
 */
export const generateSuiviPostCriseEmailTemplate = (suivi, frequenceLabel, baseUrl = null) => {
  // Déterminer l'URL de base
  const appUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://disciplelife.app');
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

  const typeCriseLabel = typeCriseLabels[suivi.type_crise] || suivi.type_crise;
  const dateDebut = new Date(suivi.date_debut).toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rappel - Suivi Post-Crise</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">DiscipleLife</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Rappel de Suivi Post-Crise</p>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #667eea; margin-top: 0;">Rappel ${frequenceLabel}</h2>
    
    <p>Bonjour,</p>
    
    <p>Il est temps de faire le point sur votre suivi post-crise : <strong>${typeCriseLabel}</strong>.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h3 style="margin-top: 0; color: #333;">Détails du suivi</h3>
      <p><strong>Type de crise :</strong> ${typeCriseLabel}</p>
      <p><strong>Date de début :</strong> ${dateDebut}</p>
      <p><strong>Gravité :</strong> ${suivi.gravite}/10</p>
      <p><strong>Statut :</strong> ${suivi.statut.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
      ${suivi.description ? `<p><strong>Description :</strong> ${suivi.description}</p>` : ''}
    </div>
    
    ${suivi.prochaine_action && suivi.date_prochaine_action ? `
    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
      <p style="margin: 0;"><strong>📅 Prochaine action prévue :</strong></p>
      <p style="margin: 5px 0 0 0;">${suivi.prochaine_action}</p>
      <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
        Date : ${new Date(suivi.date_prochaine_action).toLocaleDateString('fr-FR', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </p>
    </div>
    ` : ''}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${appUrl}/transformation?tab=suivi-post-crise" 
         style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
        Voir mon suivi
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      Ce rappel est envoyé automatiquement selon la fréquence que vous avez configurée (${frequenceLabel}).
      Vous pouvez modifier ou désactiver les rappels depuis votre tableau de bord.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      DiscipleLife - Édifier, construire, guérir et transformer votre vie en Christ<br>
      Si vous ne souhaitez plus recevoir ces rappels, vous pouvez les désactiver dans vos paramètres.
    </p>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Envoie une notification email pour un suivi post-crise
 * @param {Object} suivi - Données du suivi post-crise
 * @param {string} userEmail - Email de l'utilisateur
 * @param {string} frequenceLabel - Label de la fréquence
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendSuiviPostCriseEmail = async (suivi, userEmail, frequenceLabel, baseUrl = null) => {
  if (!userEmail) {
    console.warn('Aucun email fourni pour l\'envoi de notification');
    return { success: false, error: 'Email non fourni' };
  }

  const subject = `Rappel - Suivi Post-Crise: ${getTypeCriseLabel(suivi.type_crise)}`;
  const appUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : import.meta.env.VITE_APP_URL || 'https://disciplelife.app');
  const html = generateSuiviPostCriseEmailTemplate(suivi, frequenceLabel, appUrl);
  
  // Extraire le texte du HTML pour la version texte
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return await sendEmail({
    to: userEmail,
    subject,
    html,
    text,
    metadata: {
      type: 'suivi_post_crise_reminder',
      suivi_id: suivi.id,
      type_crise: suivi.type_crise
    }
  });
};

/**
 * Récupère l'email de l'utilisateur depuis la table profils
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<string|null>} Email de l'utilisateur ou null
 */
export const getUserEmail = async (userId) => {
  try {
    // D'abord, essayer de récupérer depuis auth.users
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser?.email) {
      return authUser.email;
    }

    // Sinon, récupérer depuis profils
    const { data, error } = await supabase
      .from('profils')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Erreur récupération email:', error);
      return null;
    }

    return data?.email || null;
  } catch (error) {
    console.error('Erreur récupération email utilisateur:', error);
    return null;
  }
};

/**
 * Helper pour obtenir le label du type de crise
 */
const getTypeCriseLabel = (type) => {
  const labels = {
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
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};
