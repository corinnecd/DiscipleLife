import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

/**
 * Calcule la force d'un mot de passe
 * @param {string} password - Le mot de passe à évaluer
 * @returns {Object} - Score et critères
 */
const calculatePasswordStrength = (password) => {
  const criteria = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const score = Object.values(criteria).filter(Boolean).length;

  let strength = 'Très faible';
  let color = 'red';

  if (score >= 5) {
    strength = 'Très fort';
    color = 'green';
  } else if (score >= 4) {
    strength = 'Fort';
    color = 'blue';
  } else if (score >= 3) {
    strength = 'Moyen';
    color = 'yellow';
  } else if (score >= 2) {
    strength = 'Faible';
    color = 'orange';
  }

  return { score, strength, color, criteria };
};

/**
 * Indicateur visuel de la force du mot de passe
 * @param {string} password - Le mot de passe à évaluer
 * @param {boolean} showCriteria - Afficher les critères détaillés (défaut: true)
 */
const PasswordStrengthIndicator = ({ password, showCriteria = true }) => {
  const { score, strength, color, criteria } = useMemo(
    () => calculatePasswordStrength(password),
    [password]
  );

  if (!password) return null;

  const colorClasses = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500'
  };

  const textColorClasses = {
    red: 'text-red-600',
    orange: 'text-orange-600',
    yellow: 'text-yellow-600',
    blue: 'text-blue-600',
    green: 'text-green-600'
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Barre de force */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"
          >
            <motion.div
              className={`h-full ${score >= level ? colorClasses[color] : ''}`}
              initial={{ width: 0 }}
              animate={{ width: score >= level ? '100%' : '0%' }}
              transition={{ duration: 0.3 }}
            />
          </div>
        ))}
      </div>

      {/* Texte de force */}
      <p className={`text-sm font-medium ${textColorClasses[color]}`}>
        {strength}
      </p>

      {/* Critères détaillés */}
      {showCriteria && (
        <div className="space-y-1 text-sm">
          <CriteriaItem
            met={criteria.minLength}
            text="Au moins 8 caractères"
          />
          <CriteriaItem
            met={criteria.hasUpperCase}
            text="Une lettre majuscule"
          />
          <CriteriaItem
            met={criteria.hasLowerCase}
            text="Une lettre minuscule"
          />
          <CriteriaItem
            met={criteria.hasNumber}
            text="Un chiffre"
          />
          <CriteriaItem
            met={criteria.hasSpecialChar}
            text="Un caractère spécial (!@#$...)"
          />
        </div>
      )}
    </div>
  );
};

/**
 * Composant pour afficher un critère individuel
 */
const CriteriaItem = ({ met, text }) => (
  <div className="flex items-center gap-2">
    {met ? (
      <Check className="w-4 h-4 text-green-500" />
    ) : (
      <X className="w-4 h-4 text-gray-400" />
    )}
    <span className={met ? 'text-green-600' : 'text-gray-500'}>
      {text}
    </span>
  </div>
);

export default PasswordStrengthIndicator;
