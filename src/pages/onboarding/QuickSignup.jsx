import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PasswordStrengthIndicator from '../../components/onboarding/PasswordStrengthIndicator';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useAutoSave } from '../../hooks/useAutoSave';
import { supabase } from '../../lib/customSupabaseClient';

/**
 * Page d'inscription rapide (Étape 1 de l'onboarding)
 * Formulaire simplifié avec 6 champs essentiels
 */
const QuickSignup = () => {
  const navigate = useNavigate();
  const { selectedRole, updateFormData, nextStep } = useOnboarding();

  const [formData, setFormData] = useState({
    famille: '',
    nom: '',
    prenom: '',
    email: '',
    fonction: selectedRole || '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [emailExists, setEmailExists] = useState(false);

  // Sauvegarde automatique
  const { load } = useAutoSave(formData, 'quick_signup_data', 1000);

  // Charger les données sauvegardées au montage
  useEffect(() => {
    const { data } = load();
    if (data && Object.keys(data).length > 0) {
      setFormData(prev => ({ ...prev, ...data }));
    }
  }, []);

  // Rediriger si pas de rôle sélectionné
  useEffect(() => {
    if (!selectedRole) {
      navigate('/onboarding/welcome');
    }
  }, [selectedRole, navigate]);

  /**
   * Gérer les changements de champs
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Effacer l'erreur pour ce champ
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * Vérifier si l'email existe déjà (debounced)
   */
  useEffect(() => {
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setEmailExists(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('profils')
          .select('email')
          .eq('email', formData.email.toLowerCase())
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Erreur lors de la vérification de l\'email:', error);
          return;
        }

        setEmailExists(!!data);
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'email:', error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.email]);

  /**
   * Valider le formulaire
   */
  const validate = () => {
    const newErrors = {};

    if (!formData.famille.trim()) {
      newErrors.famille = 'Le nom de famille spirituelle est requis';
    }

    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    }

    if (!formData.prenom.trim()) {
      newErrors.prenom = 'Le prénom est requis';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    } else if (emailExists) {
      newErrors.email = 'Cet email est déjà utilisé';
    }

    if (!formData.fonction) {
      newErrors.fonction = 'La fonction est requise';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Soumettre le formulaire
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      // 1. Créer le compte utilisateur avec Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.toLowerCase(),
        password: formData.password,
        options: {
          data: {
            nom: formData.nom,
            prenom: formData.prenom,
            fonction: formData.fonction
          },
          emailRedirectTo: `${window.location.origin}/onboarding/verify-email`
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      // 2. Sauvegarder les données dans le contexte d'onboarding
      updateFormData({
        ...formData,
        userId: authData.user.id
      });

      // 3. Sauvegarder l'email pour la page de vérification
      localStorage.setItem('onboarding_user_email', formData.email);

      // 4. Passer à l'étape suivante
      nextStep();
      navigate('/onboarding/verify-email');

    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      
      if (error.message.includes('already registered')) {
        setErrorMessage('Cet email est déjà utilisé. Veuillez vous connecter.');
      } else if (error.message.includes('Invalid email')) {
        setErrorMessage('Email invalide. Veuillez vérifier votre adresse email.');
      } else {
        setErrorMessage(error.message || 'Une erreur est survenue lors de l\'inscription');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep={1}
      onBack={() => navigate('/onboarding/welcome')}
      title="Créez votre compte"
      subtitle="Quelques informations pour commencer votre parcours"
    >
      <Card className="p-8 bg-white/80 backdrop-blur-sm shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Message d'erreur global */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Famille spirituelle */}
          <div className="space-y-2">
            <Label htmlFor="famille">Famille Spirituelle *</Label>
            <Input
              id="famille"
              name="famille"
              value={formData.famille}
              onChange={handleChange}
              placeholder="Ex: Famille de Paris"
              className={errors.famille ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.famille && (
              <p className="text-sm text-red-600">{errors.famille}</p>
            )}
          </div>

          {/* Nom et Prénom */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                placeholder="Nom"
                className={errors.nom ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.nom && (
                <p className="text-sm text-red-600">{errors.nom}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom *</Label>
              <Input
                id="prenom"
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                placeholder="Prénom"
                className={errors.prenom ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.prenom && (
                <p className="text-sm text-red-600">{errors.prenom}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="votre@email.com"
              className={errors.email || emailExists ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
            {emailExists && !errors.email && (
              <p className="text-sm text-orange-600">
                Cet email est déjà utilisé
              </p>
            )}
          </div>

          {/* Fonction */}
          <div className="space-y-2">
            <Label htmlFor="fonction">Fonction *</Label>
            <select
              id="fonction"
              name="fonction"
              value={formData.fonction}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.fonction ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            >
              <option value="">Sélectionnez une fonction</option>
              <option value="disciple">Disciple</option>
              <option value="mentor">Mentor</option>
              <option value="pasteur">Pasteur</option>
              <option value="superviseur">Superviseur</option>
            </select>
            {errors.fonction && (
              <p className="text-sm text-red-600">{errors.fonction}</p>
            )}
          </div>

          {/* Mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe *</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className={errors.password ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
            <PasswordStrengthIndicator password={formData.password} />
          </div>

          {/* Bouton de soumission */}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={isLoading || emailExists}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création du compte...
              </>
            ) : (
              'Créer mon compte'
            )}
          </Button>

          {/* Lien de connexion */}
          <p className="text-center text-sm text-gray-600">
            Vous avez déjà un compte ?{' '}
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="text-blue-600 hover:underline font-medium"
            >
              Se connecter
            </button>
          </p>
        </form>
      </Card>
    </OnboardingLayout>
  );
};

export default QuickSignup;
