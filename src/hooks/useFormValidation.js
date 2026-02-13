import { useState, useCallback } from 'react';

/**
 * Hook personnalisé pour la validation de formulaires avec messages d'erreur améliorés
 * @param {Object} initialValues - Valeurs initiales du formulaire
 * @param {Object} validationRules - Règles de validation
 * @returns {Object} - { values, errors, handleChange, handleBlur, validate, reset, setValues, setErrors }
 */
export const useFormValidation = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  /**
   * Valide un champ spécifique
   */
  const validateField = useCallback((name, value) => {
    const rules = validationRules[name];
    if (!rules) return null;

    // Règle : required
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return rules.required.message || `Le champ ${name} est requis.`;
    }

    // Règle : minLength
    if (rules.minLength && value && value.length < rules.minLength.value) {
      return rules.minLength.message || `Le champ doit contenir au moins ${rules.minLength.value} caractères.`;
    }

    // Règle : maxLength
    if (rules.maxLength && value && value.length > rules.maxLength.value) {
      return rules.maxLength.message || `Le champ ne peut pas dépasser ${rules.maxLength.value} caractères.`;
    }

    // Règle : min (pour les nombres)
    if (rules.min !== undefined && value !== '' && Number(value) < rules.min.value) {
      return rules.min.message || `La valeur doit être au moins ${rules.min.value}.`;
    }

    // Règle : max (pour les nombres)
    if (rules.max !== undefined && value !== '' && Number(value) > rules.max.value) {
      return rules.max.message || `La valeur ne peut pas dépasser ${rules.max.value}.`;
    }

    // Règle : pattern (regex)
    if (rules.pattern && value && !rules.pattern.value.test(value)) {
      return rules.pattern.message || 'Le format est invalide.';
    }

    // Règle : email
    if (rules.email && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return rules.email.message || 'L\'adresse email est invalide.';
      }
    }

    // Règle : url
    if (rules.url && value) {
      try {
        new URL(value);
      } catch {
        return rules.url.message || 'L\'URL est invalide.';
      }
    }

    // Règle : match (comparer avec un autre champ)
    if (rules.match && value !== values[rules.match.field]) {
      return rules.match.message || `Les champs ne correspondent pas.`;
    }

    // Règle : custom (fonction de validation personnalisée)
    if (rules.custom) {
      const customError = rules.custom(value, values);
      if (customError) return customError;
    }

    return null;
  }, [validationRules, values]);

  /**
   * Valide tous les champs du formulaire
   */
  const validate = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(name => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validationRules, validateField]);

  /**
   * Gère le changement de valeur d'un champ
   */
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setValues(prev => ({ ...prev, [name]: newValue }));

    // Valider en temps réel si le champ a déjà été touché
    if (touched[name]) {
      const error = validateField(name, newValue);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [touched, validateField]);

  /**
   * Gère la perte de focus d'un champ (blur)
   */
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    // Valider le champ au blur
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField]);

  /**
   * Réinitialise le formulaire
   */
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  /**
   * Définit manuellement une erreur pour un champ
   */
  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  /**
   * Définit manuellement la valeur d'un champ
   */
  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));

    // Valider en temps réel si le champ a déjà été touché
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [touched, validateField]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    reset,
    setValues,
    setErrors,
    setFieldError,
    setFieldValue,
    isValid: Object.keys(errors).length === 0
  };
};

/**
 * Règles de validation prédéfinies courantes
 */
export const commonValidationRules = {
  email: {
    required: { message: 'L\'email est requis.' },
    email: { message: 'L\'adresse email est invalide.' }
  },
  password: {
    required: { message: 'Le mot de passe est requis.' },
    minLength: { value: 6, message: 'Le mot de passe doit contenir au moins 6 caractères.' }
  },
  confirmPassword: (passwordField = 'password') => ({
    required: { message: 'Veuillez confirmer le mot de passe.' },
    match: { field: passwordField, message: 'Les mots de passe ne correspondent pas.' }
  }),
  firstName: {
    required: { message: 'Le prénom est requis.' },
    minLength: { value: 2, message: 'Le prénom doit contenir au moins 2 caractères.' },
    maxLength: { value: 50, message: 'Le prénom ne peut pas dépasser 50 caractères.' }
  },
  lastName: {
    required: { message: 'Le nom est requis.' },
    minLength: { value: 2, message: 'Le nom doit contenir au moins 2 caractères.' },
    maxLength: { value: 50, message: 'Le nom ne peut pas dépasser 50 caractères.' }
  },
  phone: {
    pattern: {
      value: /^[\d\s\+\-\(\)]+$/,
      message: 'Le numéro de téléphone est invalide.'
    }
  },
  url: {
    url: { message: 'L\'URL est invalide.' }
  }
};

/**
 * Exemple d'utilisation :
 * 
 * const { values, errors, handleChange, handleBlur, validate } = useFormValidation(
 *   { email: '', password: '' },
 *   {
 *     email: commonValidationRules.email,
 *     password: commonValidationRules.password
 *   }
 * );
 * 
 * const handleSubmit = (e) => {
 *   e.preventDefault();
 *   if (validate()) {
 *     // Soumettre le formulaire
 *   }
 * };
 */

export default useFormValidation;
