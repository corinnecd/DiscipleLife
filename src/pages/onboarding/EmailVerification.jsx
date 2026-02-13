import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import { useOnboarding } from '../../hooks/useOnboarding';
import { supabase } from '../../lib/customSupabaseClient';

/**
 * Page de vérification d'email (Étape 2 de l'onboarding)
 * Affiche les instructions et permet de renvoyer l'email
 */
const EmailVerification = () => {
  const navigate = useNavigate();
  const { formData, nextStep } = useOnboarding();

  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  // Charger l'email depuis le contexte ou localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem('onboarding_user_email');
    const contextEmail = formData?.email;

    if (contextEmail) {
      setEmail(contextEmail);
    } else if (savedEmail) {
      setEmail(savedEmail);
    } else {
      // Pas d'email trouvé, rediriger vers l'inscription
      navigate('/onboarding/signup');
    }
  }, [formData, navigate]);

  // Vérifier automatiquement si l'email est vérifié
  useEffect(() => {
    if (!email) return;

    const checkVerification = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user && user.email_confirmed_at) {
          // Email vérifié, passer à l'étape suivante
          nextStep();
          navigate('/onboarding/complete-profile');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification:', error);
      }
    };

    // Vérifier toutes les 5 secondes
    const interval = setInterval(checkVerification, 5000);

    // Vérifier immédiatement au montage
    checkVerification();

    return () => clearInterval(interval);
  }, [email, navigate, nextStep]);

  // Gérer le compte à rebours pour le renvoi
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  /**
   * Renvoyer l'email de vérification
   */
  const handleResendEmail = async () => {
    if (!canResend || !email) return;

    setIsResending(true);
    setResendError('');
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding/verify-email`
        }
      });

      if (error) {
        throw error;
      }

      setResendSuccess(true);
      setCanResend(false);
      setCountdown(60); // 60 secondes avant de pouvoir renvoyer à nouveau

      // Masquer le message de succès après 5 secondes
      setTimeout(() => setResendSuccess(false), 5000);

    } catch (error) {
      console.error('Erreur lors du renvoi de l\'email:', error);
      setResendError(error.message || 'Impossible de renvoyer l\'email');
    } finally {
      setIsResending(false);
    }
  };

  /**
   * Vérifier manuellement si l'email est vérifié
   */
  const handleCheckVerification = async () => {
    setIsChecking(true);

    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (user && user.email_confirmed_at) {
        // Email vérifié
        nextStep();
        navigate('/onboarding/complete-profile');
      } else {
        // Pas encore vérifié
        setResendError('Email non vérifié. Veuillez vérifier votre boîte de réception.');
        setTimeout(() => setResendError(''), 3000);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      setResendError(error.message || 'Erreur lors de la vérification');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep={2}
      onBack={() => navigate('/onboarding/signup')}
      title="Vérifiez votre email"
      subtitle="Nous avons envoyé un lien de vérification à votre adresse email"
    >
      <Card className="p-8 bg-white/80 backdrop-blur-sm shadow-xl">
        {/* Icône animée */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
        >
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="w-10 h-10 text-blue-600" />
          </div>
        </motion.div>

        {/* Email */}
        <div className="text-center mb-6">
          <p className="text-gray-600 mb-2">
            Un email a été envoyé à :
          </p>
          <p className="text-lg font-semibold text-gray-900">
            {email}
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Prochaines étapes
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Ouvrez votre boîte de réception</li>
            <li>Cliquez sur le lien de vérification dans l'email</li>
            <li>Vous serez automatiquement redirigé pour compléter votre profil</li>
          </ol>
        </div>

        {/* Messages de succès/erreur */}
        {resendSuccess && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Email renvoyé avec succès ! Vérifiez votre boîte de réception.
            </AlertDescription>
          </Alert>
        )}

        {resendError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{resendError}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {/* Bouton de vérification manuelle */}
          <Button
            onClick={handleCheckVerification}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={isChecking}
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Vérification...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                J'ai vérifié mon email
              </>
            )}
          </Button>

          {/* Bouton de renvoi */}
          <Button
            onClick={handleResendEmail}
            variant="outline"
            className="w-full"
            disabled={!canResend || isResending}
          >
            {isResending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : countdown > 0 ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Renvoyer dans {countdown}s
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Renvoyer l'email
              </>
            )}
          </Button>
        </div>

        {/* Aide */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Vous ne trouvez pas l'email ?</p>
          <p className="mt-1">
            Vérifiez vos <span className="font-medium">spams</span> ou{' '}
            <span className="font-medium">courriers indésirables</span>
          </p>
        </div>

        {/* Changer d'email */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/onboarding/signup')}
            className="text-sm text-blue-600 hover:underline"
          >
            Utiliser une autre adresse email
          </button>
        </div>
      </Card>
    </OnboardingLayout>
  );
};

export default EmailVerification;
