import React from 'react';
import { motion } from 'framer-motion';

/**
 * Barre de progression pour l'onboarding
 * @param {number} currentStep - Étape actuelle (1-4)
 * @param {number} totalSteps - Nombre total d'étapes (défaut: 4)
 * @param {string} className - Classes CSS supplémentaires
 */
const ProgressBar = ({ currentStep, totalSteps = 4, className = '' }) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className={`w-full ${className}`}>
      {/* Barre de progression */}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-600"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </div>

      {/* Texte de progression */}
      <div className="mt-2 flex justify-between items-center text-sm">
        <span className="text-gray-600">
          Étape {currentStep} sur {totalSteps}
        </span>
        <span className="font-semibold text-blue-600">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

export default ProgressBar;
