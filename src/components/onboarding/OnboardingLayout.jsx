import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import StepIndicator from './StepIndicator';
import ProgressBar from './ProgressBar';

/**
 * Layout principal pour les pages d'onboarding
 * @param {React.ReactNode} children - Contenu de la page
 * @param {number} currentStep - Étape actuelle
 * @param {Function} onBack - Fonction pour revenir en arrière
 * @param {boolean} showStepIndicator - Afficher l'indicateur d'étapes (défaut: true)
 * @param {boolean} showProgressBar - Afficher la barre de progression (défaut: true)
 * @param {string} title - Titre de la page
 * @param {string} subtitle - Sous-titre de la page
 */
const OnboardingLayout = ({
  children,
  currentStep,
  onBack,
  showStepIndicator = true,
  showProgressBar = true,
  title,
  subtitle,
  className = ''
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header avec bouton retour */}
      <div className="container mx-auto px-4 py-6">
        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4 hover:bg-white/50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        )}

        {/* Indicateur d'étapes */}
        {showStepIndicator && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <StepIndicator currentStep={currentStep} />
          </motion.div>
        )}

        {/* Barre de progression */}
        {showProgressBar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8 max-w-2xl mx-auto"
          >
            <ProgressBar currentStep={currentStep} totalSteps={4} />
          </motion.div>
        )}
      </div>

      {/* Contenu principal */}
      <div className={`container mx-auto px-4 pb-12 ${className}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          {/* Titre et sous-titre */}
          {(title || subtitle) && (
            <div className="text-center mb-8">
              {title && (
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-gray-600">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* Contenu */}
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default OnboardingLayout;
