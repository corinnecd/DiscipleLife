import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Mail, FileText, Sparkles, Check } from 'lucide-react';

/**
 * Indicateur d'étapes pour l'onboarding
 * @param {number} currentStep - Étape actuelle (1-4)
 */
const StepIndicator = ({ currentStep }) => {
  const steps = [
    { id: 1, label: 'Inscription', icon: UserPlus },
    { id: 2, label: 'Validation', icon: Mail },
    { id: 3, label: 'Profil', icon: FileText },
    { id: 4, label: 'Découverte', icon: Sparkles }
  ];

  return (
    <div className="flex items-center justify-between max-w-2xl mx-auto">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isPending = currentStep < step.id;

        return (
          <React.Fragment key={step.id}>
            {/* Étape */}
            <div className="flex flex-col items-center relative">
              {/* Cercle avec icône */}
              <motion.div
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center
                  transition-all duration-300 relative z-10
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-200' : ''}
                  ${isPending ? 'bg-gray-200 text-gray-400' : ''}
                `}
                initial={{ scale: 0.8 }}
                animate={{ scale: isCurrent ? 1.1 : 1 }}
                transition={{ duration: 0.3 }}
              >
                {isCompleted ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <Icon className="w-6 h-6" />
                )}
              </motion.div>

              {/* Label */}
              <span
                className={`
                  mt-2 text-xs font-medium text-center
                  ${isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'}
                `}
              >
                {step.label}
              </span>
            </div>

            {/* Ligne de connexion */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 bg-gray-200 relative mx-2">
                <motion.div
                  className="absolute top-0 left-0 h-full bg-green-500"
                  initial={{ width: 0 }}
                  animate={{ width: isCompleted ? '100%' : '0%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepIndicator;
