import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, Upload, X } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Alert, AlertDescription } from '../../components/ui/alert';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/customSupabaseClient';

/**
 * Page de complétion du profil (Étape 3 de l'onboarding)
 * Formulaire complet avec toutes les informations du profil
 */
const CompleteProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formData: onboardingData, updateFormData, nextStep, completeOnboarding } = useOnboarding();

  const [formData, setFormData] = useState({
    phone: '',
    dateNaissance: '',
    villeResidence: '',
    paysResidence: 'France',
    spiritualStage: '',
    dateEntreeFamille: new Date().toISOString().split('T')[0],
    formationsPcncRealisees: '',
    nombreDisciples: '0',
    mentorId: '',
    bio: '',
    photoUrl: ''
  });

  const [familles, setFamilles] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Sauvegarde automatique
  useAutoSave(formData, 'complete_profile_data', 1000);

  // Charger les familles et mentors
  useEffect(() => {
    loadFamillesAndMentors();
  }, []);

  // Rediriger si pas d'utilisateur authentifié
  useEffect(() => {
    if (!user) {
      navigate('/onboarding/signup');
    }
  }, [user, navigate]);

  const SPIRITUAL_STAGES = [
    { value: '', label: 'Sélectionnez un stade' },
    { value: 'Non-croyant', label: 'Non-croyant' },
    { value: 'Nouveau converti', label: 'Nouveau converti' },
    { value: 'Disciple affermi', label: 'Disciple affermi' },
    { value: 'Faiseur de disciples', label: 'Faiseur de disciples' }
  ];

  /**
   * Charger les familles et mentors depuis la base de données
   */
  const loadFamillesAndMentors = async () => {
    try {
      // Charger les familles
      const { data: famillesData, error: famillesError } = await supabase
        .from('familles')
        .select('id, nom')
        .order('nom');

      if (famillesError) throw famillesError;
      setFamilles(famillesData || []);

      // Charger les mentors
      const { data: mentorsData, error: mentorsError } = await supabase
        .from('profils')
        .select('id, nom, prenom')
        .in('role', ['mentor', 'superviseur', 'pasteur'])
        .order('nom');

      if (mentorsError) throw mentorsError;
      setMentors(mentorsData || []);

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };

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
   * Gérer l'upload de photo
   */
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, photo: 'Veuillez sélectionner une image' }));
      return;
    }

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, photo: 'L\'image ne doit pas dépasser 2 MB' }));
      return;
    }

    setUploadingPhoto(true);
    setErrors(prev => ({ ...prev, photo: '' }));

    try {
      // Créer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, photoUrl: publicUrl }));

    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      setErrors(prev => ({ ...prev, photo: 'Erreur lors de l\'upload de la photo' }));
    } finally {
      setUploadingPhoto(false);
    }
  };

  /**
   * Supprimer la photo
   */
  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photoUrl: '' }));
  };

  /**
   * Valider le formulaire
   */
  const validate = () => {
    const newErrors = {};

    if (formData.phone && !/^[0-9+\s()-]+$/.test(formData.phone)) {
      newErrors.phone = 'Numéro de téléphone invalide';
    }

    if (formData.dateNaissance) {
      const birthDate = new Date(formData.dateNaissance);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 13 || age > 120) {
        newErrors.dateNaissance = 'Date de naissance invalide';
      }
    }

    if (!formData.villeResidence.trim()) {
      newErrors.villeResidence = 'La ville de résidence est requise';
    }

    if (!formData.spiritualStage) {
      newErrors.spiritualStage = 'Le stade spirituel est requis';
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
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Préparer les données du profil
      const profileData = {
        id: user.id,
        email: onboardingData.email || user.email,
        nom: onboardingData.nom,
        prenom: onboardingData.prenom,
        role: onboardingData.fonction,
        fonction: onboardingData.fonction === 'pasteur' ? 'Pasteur' : '',
        telephone: formData.phone,
        date_naissance: formData.dateNaissance || null,
        ville_residence: formData.villeResidence,
        pays_residence: formData.paysResidence,
        stade_spirituel: formData.spiritualStage,
        date_entree_famille: formData.dateEntreeFamille,
        formations_pcnc_realisees: formData.formationsPcncRealisees ? formData.formationsPcncRealisees.split(',').map(f => f.trim()) : [],
        nombre_disciples: parseInt(formData.nombreDisciples) || 0,
        mentor_id: formData.mentorId || null,
        bio: formData.bio || null,
        photo_url: formData.photoUrl || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      };

      // Trouver ou créer la famille
      let familleId = null;
      if (onboardingData.famille) {
        // Chercher la famille existante
        const { data: existingFamille } = await supabase
          .from('familles')
          .select('id')
          .ilike('nom', onboardingData.famille)
          .maybeSingle();

        if (existingFamille) {
          familleId = existingFamille.id;
        } else {
          // Créer une nouvelle famille
          const { data: newFamille, error: familleError } = await supabase
            .from('familles')
            .insert({
              nom: onboardingData.famille,
              pasteur_id: onboardingData.fonction === 'pasteur' ? user.id : null,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (familleError) throw familleError;
          familleId = newFamille.id;
        }
      }

      profileData.famille_id = familleId;

      // Insérer ou mettre à jour le profil
      const { error: profileError } = await supabase
        .from('profils')
        .upsert(profileData, {
          onConflict: 'id'
        });

      if (profileError) throw profileError;

      // Marquer l'onboarding comme complété
      completeOnboarding();

      // Rediriger vers le dashboard approprié
      const dashboardRoutes = {
        disciple: '/dashboard/disciple',
        mentor: '/dashboard/mentor',
        pasteur: '/dashboard/pasteur',
        superviseur: '/dashboard/superviseur'
      };

      const targetRoute = dashboardRoutes[onboardingData.fonction] || '/dashboard';
      
      // Passer à l'étape suivante (tour du dashboard)
      nextStep();
      navigate('/onboarding/dashboard-tour');

    } catch (error) {
      console.error('Erreur lors de la sauvegarde du profil:', error);
      setErrorMessage(error.message || 'Une erreur est survenue lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep={3}
      title="Complétez votre profil"
      subtitle="Quelques informations supplémentaires pour personnaliser votre expérience"
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

          {/* Photo de profil */}
          <div className="space-y-2">
            <Label>Photo de profil (optionnel)</Label>
            <div className="flex items-center gap-4">
              {formData.photoUrl ? (
                <div className="relative">
                  <img
                    src={formData.photoUrl}
                    alt="Photo de profil"
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div>
                <input
                  type="file"
                  id="photo"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('photo').click()}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Upload...
                    </>
                  ) : (
                    'Choisir une photo'
                  )}
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG ou GIF (max 2 MB)
                </p>
              </div>
            </div>
            {errors.photo && (
              <p className="text-sm text-red-600">{errors.photo}</p>
            )}
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone (optionnel)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+33 6 12 34 56 78"
              className={errors.phone ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          {/* Date de naissance */}
          <div className="space-y-2">
            <Label htmlFor="dateNaissance">Date de naissance (optionnel)</Label>
            <Input
              id="dateNaissance"
              name="dateNaissance"
              type="date"
              value={formData.dateNaissance}
              onChange={handleChange}
              className={errors.dateNaissance ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.dateNaissance && (
              <p className="text-sm text-red-600">{errors.dateNaissance}</p>
            )}
          </div>

          {/* Ville et Pays */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="villeResidence">Ville de résidence *</Label>
              <Input
                id="villeResidence"
                name="villeResidence"
                value={formData.villeResidence}
                onChange={handleChange}
                placeholder="Paris"
                className={errors.villeResidence ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.villeResidence && (
                <p className="text-sm text-red-600">{errors.villeResidence}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paysResidence">Pays *</Label>
              <Input
                id="paysResidence"
                name="paysResidence"
                value={formData.paysResidence}
                onChange={handleChange}
                placeholder="France"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Stade spirituel */}
          <div className="space-y-2">
            <Label htmlFor="spiritualStage">Stade spirituel *</Label>
            <select
              id="spiritualStage"
              name="spiritualStage"
              value={formData.spiritualStage}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.spiritualStage ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            >
              {SPIRITUAL_STAGES.map(stage => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
            {errors.spiritualStage && (
              <p className="text-sm text-red-600">{errors.spiritualStage}</p>
            )}
          </div>

          {/* Date d'entrée dans la famille */}
          <div className="space-y-2">
            <Label htmlFor="dateEntreeFamille">Date d'entrée dans la famille</Label>
            <Input
              id="dateEntreeFamille"
              name="dateEntreeFamille"
              type="date"
              value={formData.dateEntreeFamille}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          {/* Mentor (si disciple) */}
          {onboardingData.fonction === 'disciple' && mentors.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="mentorId">Mentor (optionnel)</Label>
              <select
                id="mentorId"
                name="mentorId"
                value={formData.mentorId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={isLoading}
              >
                <option value="">Aucun mentor assigné</option>
                {mentors.map(mentor => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.prenom} {mentor.nom}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Formations PCNC */}
          <div className="space-y-2">
            <Label htmlFor="formationsPcncRealisees">
              Formations PCNC réalisées (optionnel)
            </Label>
            <Input
              id="formationsPcncRealisees"
              name="formationsPcncRealisees"
              value={formData.formationsPcncRealisees}
              onChange={handleChange}
              placeholder="Ex: Formation 1, Formation 2"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              Séparez les formations par des virgules
            </p>
          </div>

          {/* Nombre de disciples (si mentor/pasteur/superviseur) */}
          {['mentor', 'pasteur', 'superviseur'].includes(onboardingData.fonction) && (
            <div className="space-y-2">
              <Label htmlFor="nombreDisciples">Nombre de disciples</Label>
              <Input
                id="nombreDisciples"
                name="nombreDisciples"
                type="number"
                min="0"
                value={formData.nombreDisciples}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Biographie (optionnel)</Label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Parlez-nous un peu de vous..."
              rows={4}
              disabled={isLoading}
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/onboarding/verify-email')}
              disabled={isLoading}
              className="flex-1"
            >
              Retour
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Terminer l\'inscription'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </OnboardingLayout>
  );
};

export default CompleteProfile;
