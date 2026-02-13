import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

/**
 * Composant de champ de formulaire réutilisable avec validation intégrée
 * @param {Object} props - Propriétés du composant
 * @param {string} props.name - Nom du champ
 * @param {string} props.label - Label du champ
 * @param {string} props.type - Type de champ (text, email, password, number, textarea, select, etc.)
 * @param {string} props.value - Valeur du champ
 * @param {string} props.error - Message d'erreur
 * @param {boolean} props.touched - Indique si le champ a été touché
 * @param {function} props.onChange - Fonction de changement de valeur
 * @param {function} props.onBlur - Fonction de perte de focus
 * @param {string} props.placeholder - Placeholder du champ
 * @param {boolean} props.required - Indique si le champ est requis
 * @param {string} props.helperText - Texte d'aide
 * @param {Array} props.options - Options pour les champs select
 * @param {Object} props.inputProps - Props supplémentaires pour l'input
 * @param {string} props.className - Classes CSS supplémentaires
 */
const FormField = ({
  name,
  label,
  type = 'text',
  value,
  error,
  touched,
  onChange,
  onBlur,
  placeholder,
  required = false,
  helperText,
  options = [],
  inputProps = {},
  className = '',
  showValidIcon = false,
  disabled = false
}) => {
  const hasError = touched && error;
  const isValid = touched && !error && value;

  const renderInput = () => {
    const commonProps = {
      id: name,
      name,
      value: value || '',
      onChange,
      onBlur,
      placeholder,
      disabled,
      className: cn(
        'bg-black/20 border-white/10 text-white transition-colors',
        hasError && 'border-red-500 focus:border-red-500',
        isValid && showValidIcon && 'border-green-500 focus:border-green-500',
        disabled && 'opacity-50 cursor-not-allowed'
      ),
      ...inputProps
    };

    switch (type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            rows={inputProps.rows || 4}
          />
        );

      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(val) => onChange({ target: { name, value: val } })}
            disabled={disabled}
          >
            <SelectTrigger
              className={cn(
                'bg-black/20 border-white/10 text-white',
                hasError && 'border-red-500',
                isValid && showValidIcon && 'border-green-500'
              )}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="bg-[#1a0b2e] border-white/10">
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-white focus:bg-teal-500/20"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...commonProps}
              checked={value || false}
              className="w-5 h-5 rounded border-white/10 bg-black/20 text-teal-600 focus:ring-teal-500"
            />
            {label && (
              <Label htmlFor={name} className="text-sm text-gray-300 cursor-pointer">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
              </Label>
            )}
          </div>
        );

      default:
        return (
          <div className="relative">
            <Input
              type={type}
              {...commonProps}
            />
            {isValid && showValidIcon && (
              <CheckCircle
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400"
              />
            )}
          </div>
        );
    }
  };

  if (type === 'checkbox') {
    return (
      <div className={cn('space-y-1', className)}>
        {renderInput()}
        {hasError && (
          <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
            <AlertCircle size={12} />
            {error}
          </p>
        )}
        {helperText && !hasError && (
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
            <Info size={12} />
            {helperText}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={name} className="text-gray-300">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </Label>
      )}
      {renderInput()}
      {hasError && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
      {helperText && !hasError && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Info size={12} />
          {helperText}
        </p>
      )}
    </div>
  );
};

/**
 * Exemple d'utilisation avec useFormValidation :
 * 
 * const { values, errors, touched, handleChange, handleBlur, validate } = useFormValidation(
 *   { email: '', password: '' },
 *   {
 *     email: commonValidationRules.email,
 *     password: commonValidationRules.password
 *   }
 * );
 * 
 * <FormField
 *   name="email"
 *   label="Email"
 *   type="email"
 *   value={values.email}
 *   error={errors.email}
 *   touched={touched.email}
 *   onChange={handleChange}
 *   onBlur={handleBlur}
 *   placeholder="votre@email.com"
 *   required
 *   showValidIcon
 * />
 */

export default FormField;
