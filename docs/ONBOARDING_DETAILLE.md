# Onboarding Progressif - Spécifications Détaillées

**Date :** 11 février 2026  
**Objectif :** Implémenter un flux d'onboarding fluide et performant en 5 étapes

---

## 📋 **VUE D'ENSEMBLE DU FLUX**

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ÉTAPE 1: WelcomeOnboarding.jsx ✅ CRÉÉE                        │
│  │  - Hero section                                              │
│  │  - Vision 2030 (100K disciples, 100M vies)                  │
│  │  - Choix du rôle (Disciple/Mentor/Superviseur/Pasteur)      │
│  │                                                              │
│  ↓ [Clic sur une carte de rôle]                                │
│                                                                  │
│  ÉTAPE 2: QuickSignup.jsx 📝 À CRÉER                            │
│  │  - Formulaire simplifié (6 champs)                          │
│  │  - Validation en temps réel                                 │
│  │  - Création du compte Supabase                              │
│  │                                                              │
│  ↓ [Soumission du formulaire]                                  │
│                                                                  │
│  ÉTAPE 3: EmailVerification.jsx 📝 À CRÉER                      │
│  │  - Message "Vérifiez votre email"                           │
│  │  - Détection automatique de la confirmation                 │
│  │  - Bouton "Renvoyer l'email"                                │
│  │                                                              │
│  ↓ [Email confirmé automatiquement]                            │
│                                                                  │
│  ÉTAPE 4: CompleteProfile.jsx 📝 À CRÉER                        │
│  │  - Formulaire complet (15+ champs)                          │
│  │  - Sections : Spirituel, Coordonnées, Préférences           │
│  │  - Sauvegarde automatique toutes les 30s                    │
│  │                                                              │
│  ↓ [Profil complété]                                           │
│                                                                  │
│  ÉTAPE 5: Dashboard + Tour Guidé 📝 À CRÉER                     │
│  │  - Redirection vers le dashboard approprié                  │
│  │  - Tour interactif des fonctionnalités                      │
│  │  - Première connexion réussie                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔧 **ÉTAPE 1 : WelcomeOnboarding.jsx** ✅ CRÉÉE

**Fichier :** `src/pages/WelcomeOnboarding.jsx`

**État :** ✅ Implémentée et fonctionnelle

**Contenu :**
- Hero section avec logo et titre
- Section Vision 2030 avec statistiques animées
- 4 cartes de choix de rôle
- Animations Framer Motion
- Scroll fluide entre sections

**Fonctionnalités :**
- Sélection du rôle → Sauvegarde dans localStorage
- Redirection vers `/quick-signup` avec state `{ role: selectedRole }`

---

## 📝 **ÉTAPE 2 : QuickSignup.jsx** - SPÉCIFICATIONS COMPLÈTES

### **A. Structure du Composant**

```javascript
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFamilles } from '@/hooks/useCachedData';
import { useFormValidation, commonValidationRules } from '@/hooks/useFormValidation';
import FormField from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, ArrowRight, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

const QuickSignup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp } = useAuth();
  const { toast } = useToast();
  
  // Récupérer le rôle depuis l'étape précédente
  const selectedRole = location.state?.role || localStorage.getItem('selected_role') || 'disciple';
  
  // Charger les familles avec cache
  const { data: familles, loading: loadingFamilles } = useFamilles();
  
  // État du formulaire
  const [loading, setLoading] = useState(false);
  
  // Validation du formulaire
  const validationRules = {
    familleId: {
      required: { message: 'Veuillez sélectionner votre famille.' }
    },
    firstName: commonValidationRules.firstName,
    lastName: commonValidationRules.lastName,
    email: {
      ...commonValidationRules.email,
      custom: async (value) => {
        // Vérifier si l'email existe déjà
        const { data } = await supabase
          .from('profils')
          .select('id')
          .eq('email', value)
          .maybeSingle();
        
        if (data) {
          return 'Cet email est déjà utilisé.';
        }
        return null;
      }
    },
    password: {
      ...commonValidationRules.password,
      custom: (value) => {
        // Vérifier la force du mot de passe
        const hasUpperCase = /[A-Z]/.test(value);
        const hasLowerCase = /[a-z]/.test(value);
        const hasNumber = /[0-9]/.test(value);
        
        if (value.length >= 8 && hasUpperCase && hasLowerCase && hasNumber) {
          return null; // Mot de passe fort
        }
        return 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.';
      }
    },
    confirmPassword: commonValidationRules.confirmPassword('password')
  };
  
  const { values, errors, touched, handleChange, handleBlur, validate, setFieldValue } = 
    useFormValidation(
      {
        familleId: '',
        firstName: '',
        lastName: '',
        email: '',
        fonction: '',
        password: '',
        confirmPassword: ''
      },
      validationRules
    );
  
  // Sauvegarder l'état dans localStorage
  useEffect(() => {
    localStorage.setItem('quick_signup_data', JSON.stringify({
      ...values,
      password: '', // Ne jamais sauvegarder le mot de passe
      confirmPassword: ''
    }));
  }, [values]);
  
  // Restaurer l'état au chargement
  useEffect(() => {
    const saved = localStorage.getItem('quick_signup_data');
    if (saved) {
      const data = JSON.parse(saved);
      Object.keys(data).forEach(key => {
        if (data[key]) setFieldValue(key, data[key]);
      });
    }
  }, []);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      toast({
        variant: "destructive",
        title: "Erreur de validation",
        description: "Veuillez corriger les erreurs avant de continuer."
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Créer le compte Supabase
      const { data, error } = await signUp(values.email, values.password, {
        data: {
          first_name: values.firstName,
          last_name: values.lastName,
          role: selectedRole,
          famille_id: values.familleId,
          fonction: values.fonction || null,
          onboarding_completed: false,
          onboarding_step: 2
        }
      });
      
      if (error) throw error;
      
      // Sauvegarder les infos pour l'étape suivante
      localStorage.setItem('onboarding_user_email', values.email);
      
      toast({
        title: "Compte créé !",
        description: "Vérifiez votre email pour continuer."
      });
      
      // Redirection vers la page de vérification
      navigate('/verify-email');
      
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: error.message || "Une erreur est survenue."
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-[#0f0518] text-white flex items-center justify-center p-4">
      {/* Composant JSX détaillé ci-dessous */}
    </div>
  );
};
```

### **B. Design du Formulaire**

**Layout :**
```
┌────────────────────────────────────────────────┐
│  [← Retour]                    Étape 2/5       │
│                                                │
│  [Icône UserPlus]                              │
│  Inscription Rapide                            │
│  Rôle sélectionné : [Badge Disciple]          │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Famille *                                 │ │
│  │ [Dropdown avec recherche]                 │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌─────────────┐  ┌─────────────┐            │
│  │ Prénom *    │  │ Nom *       │            │
│  │ [Input]     │  │ [Input]     │            │
│  └─────────────┘  └─────────────┘            │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Email *                                   │ │
│  │ [Input avec validation]                   │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Fonction (optionnel)                      │ │
│  │ [Select: Pasteur/AP/Berger]               │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Mot de passe *                            │ │
│  │ [Input password avec toggle] [👁]         │ │
│  │ Force: [████░░░░] Moyen                   │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Confirmer mot de passe *                  │ │
│  │ [Input password avec toggle] [👁]         │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  [Retour]              [Créer mon compte →]   │
│                                                │
└────────────────────────────────────────────────┘
```

### **C. Validation en Temps Réel**

**Champs avec validation asynchrone :**

1. **Email :**
   - Format valide (regex)
   - Unicité (vérification en base)
   - Délai de 500ms (debounce)
   - Icône ✅ si valide, ❌ si invalide

2. **Mot de passe :**
   - Longueur min : 8 caractères
   - Au moins 1 majuscule
   - Au moins 1 minuscule
   - Au moins 1 chiffre
   - Indicateur de force visuel (Faible/Moyen/Fort/Très fort)

3. **Confirmation mot de passe :**
   - Doit correspondre au mot de passe
   - Validation en temps réel

### **D. Indicateur de Force du Mot de Passe**

```javascript
const getPasswordStrength = (password) => {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++; // Caractères spéciaux
  
  if (strength <= 2) return { label: 'Faible', color: 'bg-red-500', width: '25%' };
  if (strength <= 3) return { label: 'Moyen', color: 'bg-orange-500', width: '50%' };
  if (strength <= 4) return { label: 'Fort', color: 'bg-yellow-500', width: '75%' };
  return { label: 'Très fort', color: 'bg-green-500', width: '100%' };
};
```

### **E. Fonctions Dropdown avec Recherche**

```javascript
// Utiliser useFamilles pour le cache
const { data: familles, loading: loadingFamilles, search } = useFamilles();

// Input de recherche dans le dropdown
<Input 
  placeholder="Rechercher une famille..."
  onChange={(e) => search(e.target.value)}
  className="mb-2"
/>
```

---

## 📧 **ÉTAPE 3 : EmailVerification.jsx** - SPÉCIFICATIONS COMPLÈTES

### **A. Structure du Composant**

```javascript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Mail, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';

const EmailVerification = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [checking, setChecking] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  
  useEffect(() => {
    // Récupérer l'email depuis localStorage ou user
    const savedEmail = localStorage.getItem('onboarding_user_email');
    setEmail(savedEmail || user?.email || '');
  }, [user]);
  
  // Polling pour vérifier la confirmation
  useEffect(() => {
    let interval;
    
    const checkEmailConfirmed = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser?.email_confirmed_at) {
          setChecking(false);
          clearInterval(interval);
          
          toast({
            title: "Email confirmé !",
            description: "Vous allez être redirigé pour compléter votre profil."
          });
          
          setTimeout(() => {
            navigate('/complete-profile');
          }, 2000);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification:', error);
      }
    };
    
    // Vérifier immédiatement
    checkEmailConfirmed();
    
    // Puis vérifier toutes les 5 secondes
    interval = setInterval(checkEmailConfirmed, 5000);
    
    return () => clearInterval(interval);
  }, [navigate, toast]);
  
  // Gestion du cooldown pour le renvoi
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);
  
  const handleResendEmail = async () => {
    if (!canResend) return;
    
    setCanResend(false);
    setResendCooldown(60); // 60 secondes
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });
      
      if (error) throw error;
      
      toast({
        title: "Email renvoyé",
        description: "Vérifiez votre boîte mail (et vos spams)."
      });
    } catch (error) {
      console.error('Erreur lors du renvoi:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de renvoyer l'email."
      });
      setCanResend(true);
      setResendCooldown(0);
    }
  };
  
  const handleChangeEmail = () => {
    // Retour au formulaire avec possibilité de changer l'email
    navigate('/quick-signup', { state: { role: selectedRole } });
  };
  
  return (
    // JSX détaillé ci-dessous
  );
};
```

### **B. Design de la Page**

**Layout :**
```
┌────────────────────────────────────────────────┐
│                                                │
│  [← Retour]                    Étape 3/5       │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │                                          │ │
│  │       [Icône Mail animée]                │ │
│  │                                          │ │
│  │   Vérifiez votre boîte mail              │ │
│  │                                          │ │
│  │   Nous avons envoyé un email de         │ │
│  │   confirmation à :                       │ │
│  │                                          │ │
│  │   jean.dupont@example.com                │ │
│  │                                          │ │
│  │   [Icône Loader] Vérification en cours...│ │
│  │                                          │ │
│  │   Instructions :                         │ │
│  │   1. Ouvrez votre boîte mail             │ │
│  │   2. Cliquez sur le lien de confirmation │ │
│  │   3. Vous serez redirigé automatiquement │ │
│  │                                          │ │
│  │   Vous n'avez pas reçu l'email ?         │ │
│  │                                          │ │
│  │   [Renvoyer l'email (60s)]               │ │
│  │   [Changer d'email]                      │ │
│  │                                          │ │
│  └──────────────────────────────────────────┘ │
│                                                │
└────────────────────────────────────────────────┘
```

### **C. Animations**

1. **Icône Mail :**
   - Animation de "pulse" continu
   - Rotation subtile (±5°)
   - Glow effect

2. **Loader :**
   - Spinner pendant la vérification
   - Remplacé par CheckCircle vert quand confirmé

3. **Transition :**
   - Fade out de la page
   - Slide vers la gauche
   - Fade in de CompleteProfile

### **D. États de la Page**

**État 1 : En attente de confirmation**
- Loader visible
- Message "Vérification en cours..."
- Polling actif

**État 2 : Email confirmé**
- CheckCircle vert
- Message "Email confirmé !"
- Redirection automatique après 2s

**État 3 : Erreur**
- Icône d'alerte
- Message d'erreur
- Bouton "Réessayer"

---

## 📋 **ÉTAPE 4 : CompleteProfile.jsx** - SPÉCIFICATIONS COMPLÈTES

### **A. Structure en Sections**

```javascript
const CompleteProfile = () => {
  const [currentSection, setCurrentSection] = useState(1);
  const totalSections = 4;
  
  // Sections du formulaire
  const sections = [
    {
      id: 1,
      title: 'Informations de base',
      icon: User,
      fields: ['familleId', 'firstName', 'lastName', 'email', 'fonction']
    },
    {
      id: 2,
      title: 'Informations spirituelles',
      icon: Heart,
      fields: ['dateEntreeFamille', 'mentorId', 'spiritualStage', 'formationsPcnc', 'nombreDisciples']
    },
    {
      id: 3,
      title: 'Coordonnées',
      icon: MapPin,
      fields: ['phone', 'villeResidence', 'adresse']
    },
    {
      id: 4,
      title: 'Préférences',
      icon: Settings,
      fields: ['photo', 'bio', 'centresInteret', 'disponibilites']
    }
  ];
  
  // Sauvegarde automatique
  const { lastSaved, isSaving } = useAutoSave(
    values,
    async (data) => {
      await supabase.from('profils').update({
        ...data,
        onboarding_step: 4
      }).eq('id', user.id);
    },
    30000 // 30 secondes
  );
  
  return (
    // JSX détaillé ci-dessous
  );
};
```

### **B. Champs par Section**

#### **Section 1 : Informations de Base** (pré-remplies)
- Famille (disabled, déjà sélectionnée)
- Prénom (disabled, déjà saisi)
- Nom (disabled, déjà saisi)
- Email (disabled, déjà saisi)
- Fonction (modifiable)

#### **Section 2 : Informations Spirituelles**
1. **Date d'entrée dans la famille**
   - Type : date
   - Par défaut : Date du jour
   - Validation : Pas dans le futur

2. **Suivi par (mentor/superviseur)**
   - Type : select avec recherche
   - Options : Liste des mentors/superviseurs de la famille
   - Optionnel

3. **Statut spirituel**
   - Type : select
   - Options : 
     - Non-croyant
     - Nouveau converti
     - Disciple affermi
     - Faiseur de disciples
   - Par défaut : Non renseigné

4. **Formations PCNC réalisées**
   - Type : textarea
   - Placeholder : "Ex: Guérison des cœurs brisés, Fondations..."
   - Optionnel

5. **Nombre de disciples** (si mentor/superviseur)
   - Type : number
   - Min : 0
   - Affiché conditionnellement selon le rôle

#### **Section 3 : Coordonnées**
1. **Téléphone**
   - Type : tel
   - Format : +33 6 12 34 56 78
   - Validation : Format international
   - Requis

2. **Ville de résidence**
   - Type : text
   - Placeholder : "Ex: Libreville, Port-Gentil..."
   - Requis

3. **Adresse complète**
   - Type : textarea
   - Placeholder : "Rue, quartier, code postal..."
   - Optionnel

#### **Section 4 : Préférences**
1. **Photo de profil**
   - Type : file upload
   - Formats : jpg, png, webp
   - Taille max : 2MB
   - Compression automatique
   - Aperçu avant upload

2. **Bio courte**
   - Type : textarea
   - Max : 200 caractères
   - Compteur de caractères
   - Optionnel

3. **Centres d'intérêt spirituels**
   - Type : multi-select (checkboxes)
   - Options :
     - Prière et intercession
     - Étude biblique
     - Évangélisation
     - Service et bénévolat
     - Louange et adoration
     - Enseignement
     - Accompagnement pastoral
   - Optionnel

4. **Disponibilités pour accompagnement**
   - Type : checkboxes
   - Options :
     - Lundi-Vendredi (matin/après-midi/soir)
     - Week-end
     - Flexible
   - Optionnel

### **C. Navigation entre Sections**

```javascript
const goToNextSection = () => {
  // Valider la section actuelle
  const currentFields = sections[currentSection - 1].fields;
  const hasErrors = currentFields.some(field => errors[field]);
  
  if (hasErrors) {
    toast({
      variant: "destructive",
      title: "Erreur",
      description: "Veuillez corriger les erreurs avant de continuer."
    });
    return;
  }
  
  // Sauvegarder la progression
  saveProgress();
  
  // Passer à la section suivante
  if (currentSection < totalSections) {
    setCurrentSection(prev => prev + 1);
  } else {
    handleFinalSubmit();
  }
};

const goToPreviousSection = () => {
  if (currentSection > 1) {
    setCurrentSection(prev => prev - 1);
  }
};

const skipSection = () => {
  // Permettre de sauter les sections optionnelles
  setCurrentSection(prev => prev + 1);
};
```

### **D. Sauvegarde Automatique**

```javascript
// Hook useAutoSave
const { lastSaved, isSaving } = useAutoSave(
  values,
  async (data) => {
    await supabase.from('profils').update({
      ...data,
      onboarding_step: 4,
      last_profile_update: new Date().toISOString()
    }).eq('id', user.id);
  },
  30000 // 30 secondes
);

// Affichage de l'état de sauvegarde
{isSaving && (
  <div className="flex items-center gap-2 text-sm text-gray-400">
    <Loader2 size={14} className="animate-spin" />
    Sauvegarde en cours...
  </div>
)}

{lastSaved && !isSaving && (
  <div className="flex items-center gap-2 text-sm text-green-400">
    <CheckCircle size={14} />
    Sauvegardé il y a {getTimeAgo(lastSaved)}
  </div>
)}
```

### **E. Design de la Page**

**Layout :**
```
┌────────────────────────────────────────────────┐
│  [← Retour]                    Étape 4/5       │
│                                                │
│  Complétez Votre Profil                        │
│  Rôle : [Badge Disciple]                       │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ [●●●○] Section 2/4                       │ │
│  │ Informations spirituelles                 │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  [Formulaire de la section actuelle]          │
│                                                │
│  💾 Sauvegardé il y a 2 min                   │
│                                                │
│  [← Précédent]  [Sauter]  [Suivant →]         │
│                                                │
└────────────────────────────────────────────────┘
```

### **F. Indicateur de Progression**

```javascript
const ProgressIndicator = ({ currentSection, totalSections }) => {
  const progress = (currentSection / totalSections) * 100;
  
  return (
    <div className="mb-8">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-gray-400">
          Section {currentSection} sur {totalSections}
        </span>
        <span className="text-sm font-semibold text-teal-400">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
          className="h-full bg-gradient-to-r from-teal-500 to-blue-500"
        />
      </div>
      <div className="flex justify-between mt-2">
        {sections.map((section, idx) => (
          <div
            key={section.id}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
              idx + 1 < currentSection ? "bg-green-500 text-white" :
              idx + 1 === currentSection ? "bg-teal-500 text-white" :
              "bg-gray-700 text-gray-400"
            )}
          >
            {idx + 1 < currentSection ? '✓' : idx + 1}
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 🎮 **ÉTAPE 5 : DashboardTour.jsx** - SPÉCIFICATIONS COMPLÈTES

### **A. Structure du Composant**

```javascript
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardTour = ({ steps, onComplete, dashboardType }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    // Vérifier si le tour a déjà été vu
    const tourCompleted = localStorage.getItem(`tour_completed_${dashboardType}`);
    
    if (!tourCompleted) {
      setIsActive(true);
    }
  }, [dashboardType]);
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleSkip = () => {
    handleComplete();
  };
  
  const handleComplete = () => {
    localStorage.setItem(`tour_completed_${dashboardType}`, 'true');
    setIsActive(false);
    if (onComplete) onComplete();
  };
  
  if (!isActive) return null;
  
  const step = steps[currentStep];
  
  return (
    <AnimatePresence>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50"
        onClick={handleSkip}
      />
      
      {/* Spotlight sur l'élément */}
      <div
        className="fixed z-[51] pointer-events-none"
        style={{
          top: step.element?.top,
          left: step.element?.left,
          width: step.element?.width,
          height: step.element?.height,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
          borderRadius: '8px'
        }}
      />
      
      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed z-[52] bg-[#1a0b2e] border border-white/10 rounded-lg p-6 max-w-md"
        style={{
          top: step.tooltip?.top,
          left: step.tooltip?.left
        }}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-white">{step.title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-gray-400 hover:text-white"
          >
            <X size={18} />
          </Button>
        </div>
        
        <p className="text-gray-300 mb-6">{step.description}</p>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">
            {currentStep + 1} / {steps.length}
          </span>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="ghost"
                onClick={handlePrevious}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft size={16} className="mr-2" />
                Précédent
              </Button>
            )}
            
            <Button
              onClick={handleNext}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {currentStep < steps.length - 1 ? 'Suivant' : 'Terminer'}
              {currentStep < steps.length - 1 && <ArrowRight size={16} className="ml-2" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
```

### **B. Configuration des Étapes par Dashboard**

#### **Dashboard Disciple (7 étapes)**

```javascript
const discipleTourSteps = [
  {
    title: 'Bienvenue sur votre dashboard !',
    description: 'Ici, vous trouverez tout ce dont vous avez besoin pour votre croissance spirituelle.',
    element: { selector: '.dashboard-header' },
    tooltip: { position: 'bottom-center' }
  },
  {
    title: 'Vos statistiques',
    description: 'Suivez votre progression : parcours complétés, journal, évaluations.',
    element: { selector: '.stats-section' },
    tooltip: { position: 'bottom' }
  },
  {
    title: 'Journal de transformation',
    description: 'Écrivez vos réflexions, prières et témoignages quotidiens.',
    element: { selector: '.journal-card' },
    tooltip: { position: 'right' }
  },
  {
    title: 'Parcours de transformation',
    description: 'Découvrez et suivez des parcours thématiques pour grandir.',
    element: { selector: '.parcours-card' },
    tooltip: { position: 'left' }
  },
  {
    title: 'Votre mentor',
    description: 'Contactez votre mentor pour un accompagnement personnalisé.',
    element: { selector: '.mentor-card' },
    tooltip: { position: 'top' }
  },
  {
    title: 'Suivi post-crise',
    description: 'Accédez à votre suivi personnalisé en cas de besoin.',
    element: { selector: '.suivi-crise-link' },
    tooltip: { position: 'left' }
  },
  {
    title: 'Notifications',
    description: 'Restez informé des rappels et messages importants.',
    element: { selector: '.notification-bell' },
    tooltip: { position: 'bottom-left' }
  }
];
```

#### **Dashboard Mentor (6 étapes)**

```javascript
const mentorTourSteps = [
  {
    title: 'Bienvenue, Mentor !',
    description: 'Votre dashboard pour accompagner vos disciples efficacement.',
    element: { selector: '.dashboard-header' }
  },
  {
    title: 'Vos disciples',
    description: 'Liste de tous vos disciples avec leur progression.',
    element: { selector: '.disciples-list' }
  },
  {
    title: 'Ajouter un disciple',
    description: 'Enregistrez un nouveau disciple dans votre équipe.',
    element: { selector: '.add-disciple-btn' }
  },
  {
    title: 'Notations',
    description: 'Évaluez la progression de vos disciples régulièrement.',
    element: { selector: '.notations-link' }
  },
  {
    title: 'Signalements',
    description: 'Recevez et traitez les signalements urgents.',
    element: { selector: '.signalements-badge' }
  },
  {
    title: 'Statistiques',
    description: 'Analysez l\'évolution globale de votre équipe.',
    element: { selector: '.stats-card' }
  }
];
```

---

## 🛠️ **HOOKS PERSONNALISÉS**

### **A. useOnboarding.js**

```javascript
import { useState, useEffect } from 'react';

export const useOnboarding = () => {
  const [state, setState] = useState({
    currentStep: 1,
    selectedRole: null,
    formData: {},
    isCompleted: false
  });
  
  // Charger l'état depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem('onboarding_state');
    if (saved) {
      setState(JSON.parse(saved));
    }
  }, []);
  
  // Sauvegarder l'état dans localStorage
  useEffect(() => {
    localStorage.setItem('onboarding_state', JSON.stringify(state));
  }, [state]);
  
  const nextStep = () => {
    setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
  };
  
  const prevStep = () => {
    setState(prev => ({ ...prev, currentStep: Math.max(1, prev.currentStep - 1) }));
  };
  
  const setRole = (role) => {
    setState(prev => ({ ...prev, selectedRole: role }));
  };
  
  const updateFormData = (data) => {
    setState(prev => ({ ...prev, formData: { ...prev.formData, ...data } }));
  };
  
  const completeOnboarding = () => {
    setState(prev => ({ ...prev, isCompleted: true }));
    localStorage.removeItem('onboarding_state');
  };
  
  const resetOnboarding = () => {
    setState({
      currentStep: 1,
      selectedRole: null,
      formData: {},
      isCompleted: false
    });
    localStorage.removeItem('onboarding_state');
  };
  
  return {
    ...state,
    nextStep,
    prevStep,
    setRole,
    updateFormData,
    completeOnboarding,
    resetOnboarding
  };
};
```

### **B. useAutoSave.js**

```javascript
import { useState, useEffect, useRef } from 'react';

export const useAutoSave = (data, saveFunction, interval = 30000) => {
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const previousDataRef = useRef(null);
  
  useEffect(() => {
    // Ne pas sauvegarder si les données n'ont pas changé
    if (JSON.stringify(data) === JSON.stringify(previousDataRef.current)) {
      return;
    }
    
    const autoSave = setInterval(async () => {
      if (data && Object.keys(data).length > 0) {
        try {
          setIsSaving(true);
          setError(null);
          
          await saveFunction(data);
          
          setLastSaved(new Date());
          previousDataRef.current = data;
        } catch (err) {
          console.error('Erreur lors de la sauvegarde automatique:', err);
          setError(err.message);
        } finally {
          setIsSaving(false);
        }
      }
    }, interval);
    
    return () => clearInterval(autoSave);
  }, [data, saveFunction, interval]);
  
  // Sauvegarder avant de quitter la page
  useEffect(() => {
    const handleBeforeUnload = async (e) => {
      if (isSaving) {
        e.preventDefault();
        e.returnValue = 'Sauvegarde en cours...';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSaving]);
  
  return { lastSaved, isSaving, error };
};
```

---

## 🎨 **COMPOSANTS RÉUTILISABLES**

### **A. ProgressBar.jsx**

```javascript
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const ProgressBar = ({ current, total, showLabels = true, className }) => {
  const percentage = (current / total) * 100;
  
  return (
    <div className={cn("w-full", className)}>
      {showLabels && (
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-gray-400">Étape {current}/{total}</span>
          <span className="text-teal-400 font-semibold">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-teal-500 via-blue-500 to-purple-500"
        />
      </div>
    </div>
  );
};

export default ProgressBar;
```

### **B. StepIndicator.jsx**

```javascript
import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const StepIndicator = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center justify-between w-full max-w-2xl mx-auto mb-8">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;
        
        return (
          <React.Fragment key={step.id}>
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-300",
                  isCompleted && "bg-green-500 text-white",
                  isCurrent && "bg-teal-500 text-white ring-4 ring-teal-500/30",
                  isUpcoming && "bg-gray-700 text-gray-400"
                )}
              >
                {isCompleted ? <Check size={24} /> : index + 1}
              </div>
              <span className={cn(
                "text-xs mt-2 text-center max-w-[80px]",
                isCurrent ? "text-white font-semibold" : "text-gray-400"
              )}>
                {step.label}
              </span>
            </div>
            
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 relative">
                <div className="absolute inset-0 bg-gray-700" />
                <div
                  className={cn(
                    "absolute inset-0 bg-teal-500 transition-all duration-500",
                    isCompleted ? "w-full" : "w-0"
                  )}
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
```

### **C. OnboardingLayout.jsx**

```javascript
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import ProgressBar from './ProgressBar';

const OnboardingLayout = ({ 
  children, 
  currentStep, 
  totalSteps, 
  onBack,
  showProgress = true,
  title,
  description
}) => {
  return (
    <div className="min-h-screen bg-[#0f0518] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft size={20} className="mr-2" />
              Retour
            </Button>
          )}
          
          {showProgress && (
            <div className="flex-1 max-w-xs ml-auto">
              <ProgressBar current={currentStep} total={totalSteps} />
            </div>
          )}
        </div>
        
        {/* Title */}
        {title && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
            {description && (
              <p className="text-gray-400">{description}</p>
            )}
          </motion.div>
        )}
        
        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default OnboardingLayout;
```

---

## 🔄 **GESTION DES CAS LIMITES**

### **Cas 1 : Utilisateur ferme le navigateur**
- État sauvegardé dans localStorage
- Restauration automatique au retour
- Message : "Vous avez un onboarding en cours. Continuer ?"

### **Cas 2 : Utilisateur revient en arrière**
- Permettre la navigation entre étapes
- Sauvegarder les modifications
- Pas de perte de données

### **Cas 3 : Email non confirmé après 24h**
- Envoyer un rappel automatique
- Permettre de renvoyer l'email
- Offrir de changer d'email

### **Cas 4 : Utilisateur veut sauter des sections**
- Permettre de sauter les sections optionnelles
- Marquer le profil comme "incomplet"
- Rappel ultérieur pour compléter

### **Cas 5 : Erreur réseau pendant la sauvegarde**
- Retry automatique (3 tentatives)
- Sauvegarde locale en attendant
- Synchronisation quand la connexion revient

---

## 📊 **MIGRATION SQL NÉCESSAIRE**

### **Colonnes à ajouter à la table profils**

```sql
-- Ajouter les colonnes d'onboarding si elles n'existent pas
ALTER TABLE profils ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE profils ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1;
ALTER TABLE profils ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP;
ALTER TABLE profils ADD COLUMN IF NOT EXISTS last_profile_update TIMESTAMP;
ALTER TABLE profils ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profils ADD COLUMN IF NOT EXISTS centres_interet TEXT[];
ALTER TABLE profils ADD COLUMN IF NOT EXISTS disponibilites JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profils ADD COLUMN IF NOT EXISTS adresse TEXT;
ALTER TABLE profils ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Index pour les requêtes d'onboarding
CREATE INDEX IF NOT EXISTS idx_profils_onboarding 
ON profils(onboarding_completed, onboarding_step);

-- Commentaires
COMMENT ON COLUMN profils.onboarding_completed IS 'Indique si l''utilisateur a complété l''onboarding';
COMMENT ON COLUMN profils.onboarding_step IS 'Étape actuelle de l''onboarding (1-5)';
COMMENT ON COLUMN profils.profile_completed_at IS 'Date de complétion du profil';
```

---

## 🎯 **ROUTES À AJOUTER DANS App.jsx**

```javascript
// Dans App.jsx - Routes publiques
<Route path="/welcome" element={<WelcomeOnboarding />} />
<Route path="/quick-signup" element={<QuickSignup />} />

// Routes protégées (après authentification)
<Route path="/verify-email" element={
  <ProtectedRoute>
    <EmailVerification />
  </ProtectedRoute>
} />
<Route path="/complete-profile" element={
  <ProtectedRoute>
    <CompleteProfile />
  </ProtectedRoute>
} />

// Redirection de la page d'accueil
<Route path="/" element={<Navigate to="/welcome" replace />} />
```

---

## 📱 **RESPONSIVE DESIGN - BREAKPOINTS**

### **Mobile (< 768px)**
- Formulaire en 1 colonne
- Boutons full-width
- Padding réduit (p-4)
- Texte plus petit (text-sm)
- Cartes de rôle en stack vertical

### **Tablet (768px - 1024px)**
- Formulaire en 2 colonnes pour certains champs
- Cartes de rôle en 2×2 grid
- Padding moyen (p-6)

### **Desktop (> 1024px)**
- Formulaire en 2 colonnes
- Cartes de rôle en 1×4 grid horizontal
- Padding large (p-8)
- Max-width: 1200px

---

## ⚡ **OPTIMISATIONS PERFORMANCE**

### **1. Lazy Loading**
```javascript
// Charger les composants suivants en arrière-plan
const EmailVerification = lazy(() => import('./pages/EmailVerification'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));

// Prefetch au hover sur le bouton
<Button 
  onMouseEnter={() => {
    import('./pages/EmailVerification');
  }}
>
  Créer mon compte
</Button>
```

### **2. Prefetch des Données**
```javascript
// Charger les familles et mentors dès le début
useEffect(() => {
  // Prefetch
  supabase.from('familles_disciples').select('id, nom, identifiant_famille');
  supabase.from('profils').select('id, first_name, last_name, role').in('role', ['mentor', 'superviseur']);
}, []);
```

### **3. Debounce sur Validation**
```javascript
// Validation email avec debounce de 500ms
const debouncedValidateEmail = useMemo(
  () => debounce(async (email) => {
    const { data } = await supabase
      .from('profils')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (data) {
      setFieldError('email', 'Cet email est déjà utilisé.');
    }
  }, 500),
  []
);
```

### **4. Compression d'Images**
```javascript
// Compression avant upload de la photo de profil
const compressImage = async (file) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  return new Promise((resolve) => {
    img.onload = () => {
      const MAX_WIDTH = 400;
      const MAX_HEIGHT = 400;
      
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.8);
    };
    
    img.src = URL.createObjectURL(file);
  });
};
```

---

## 🔐 **SÉCURITÉ & VALIDATION**

### **Validation Côté Client**

**QuickSignup :**
- Email : Format + Unicité (async)
- Mot de passe : Force (8+ chars, majuscule, minuscule, chiffre)
- Famille : Requis
- Nom/Prénom : Min 2 caractères, Max 50

**CompleteProfile :**
- Téléphone : Format international `/^[\d\s\+\-\(\)]+$/`
- Ville : Requis, Min 2 caractères
- Photo : Max 2MB, formats jpg/png/webp
- Bio : Max 200 caractères

### **Validation Côté Serveur (RLS)**

```sql
-- Politique pour empêcher la modification du rôle après création
CREATE POLICY "Users cannot change their own role" ON profils
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    role = (SELECT role FROM profils WHERE id = auth.uid())
  );

-- Politique pour empêcher la modification de la famille après onboarding
CREATE POLICY "Users cannot change famille after onboarding" ON profils
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    onboarding_completed = false 
    OR famille_id = (SELECT famille_id FROM profils WHERE id = auth.uid())
  );
```

---

## 📊 **ANALYTICS & TRACKING**

### **Événements à Tracker**

```javascript
// Événements Google Analytics / Mixpanel
const trackOnboardingEvent = (eventName, properties = {}) => {
  if (window.gtag) {
    window.gtag('event', eventName, properties);
  }
  
  if (window.mixpanel) {
    window.mixpanel.track(eventName, properties);
  }
};

// Exemples d'utilisation
trackOnboardingEvent('onboarding_started', { role: selectedRole });
trackOnboardingEvent('onboarding_step_completed', { step: 2, duration: 45 });
trackOnboardingEvent('onboarding_abandoned', { step: 3, reason: 'timeout' });
trackOnboardingEvent('onboarding_completed', { 
  role: selectedRole, 
  totalDuration: 245,
  sectionsSkipped: 1
});
```

### **Métriques à Calculer**

```javascript
// Dans le dashboard admin
const onboardingMetrics = {
  // Taux de complétion global
  completionRate: (completed / total) * 100,
  
  // Taux de complétion par étape
  stepCompletionRates: {
    step1: (step1Completed / total) * 100,
    step2: (step2Completed / total) * 100,
    step3: (step3Completed / total) * 100,
    step4: (step4Completed / total) * 100,
    step5: (step5Completed / total) * 100
  },
  
  // Temps moyen par étape
  averageTimePerStep: {
    step1: 30, // secondes
    step2: 120,
    step3: 60,
    step4: 180,
    step5: 90
  },
  
  // Taux d'abandon par étape
  abandonmentRates: {
    step1: 5,  // %
    step2: 15,
    step3: 10,
    step4: 20,
    step5: 5
  }
};
```

---

## 🧪 **TESTS À EFFECTUER**

### **Tests Fonctionnels**

**QuickSignup :**
- [ ] Validation en temps réel fonctionne
- [ ] Email unique vérifié
- [ ] Mot de passe fort requis
- [ ] Famille requise pour disciples
- [ ] Création de compte réussie
- [ ] Redirection vers EmailVerification

**EmailVerification :**
- [ ] Email affiché correctement
- [ ] Détection automatique fonctionne
- [ ] Bouton "Renvoyer" avec cooldown
- [ ] Redirection après confirmation

**CompleteProfile :**
- [ ] Sections navigables
- [ ] Sauvegarde automatique fonctionne
- [ ] Upload de photo fonctionne
- [ ] Validation par section
- [ ] Possibilité de sauter
- [ ] Redirection vers dashboard

### **Tests de Performance**

- [ ] Temps de chargement < 2s par page
- [ ] Validation asynchrone < 500ms
- [ ] Sauvegarde automatique < 1s
- [ ] Upload photo < 3s
- [ ] Transition fluide entre étapes

### **Tests de Sécurité**

- [ ] Mot de passe non stocké en clair
- [ ] Email unique vérifié côté serveur
- [ ] RLS empêchent modification non autorisée
- [ ] Token JWT valide
- [ ] Protection CSRF

---

## 📦 **DÉPENDANCES NÉCESSAIRES**

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "framer-motion": "^10.16.0",
    "lucide-react": "^0.294.0",
    "@supabase/supabase-js": "^2.38.0",
    "recharts": "^2.10.0"
  },
  "devDependencies": {
    "lodash.debounce": "^4.0.8"
  }
}
```

---

## 🎯 **CHECKLIST D'IMPLÉMENTATION**

### **Phase 1 : Hooks & Utils** (1 jour)
- [ ] Créer `useOnboarding.js`
- [ ] Créer `useAutoSave.js`
- [ ] Créer `onboardingSteps.js` (config)
- [ ] Tester les hooks isolément

### **Phase 2 : Composants Réutilisables** (1 jour)
- [ ] Créer `ProgressBar.jsx`
- [ ] Créer `StepIndicator.jsx`
- [ ] Créer `OnboardingLayout.jsx`
- [ ] Créer `PasswordStrengthIndicator.jsx`

### **Phase 3 : Pages Principales** (2-3 jours)
- [ ] Créer `QuickSignup.jsx`
- [ ] Créer `EmailVerification.jsx`
- [ ] Créer `CompleteProfile.jsx`
- [ ] Intégrer avec `useFormValidation` et `FormField`

### **Phase 4 : Tour Guidé** (1 jour)
- [ ] Créer `DashboardTour.jsx`
- [ ] Configurer les étapes par dashboard
- [ ] Intégrer dans chaque dashboard

### **Phase 5 : Tests & Polish** (1-2 jours)
- [ ] Tests fonctionnels complets
- [ ] Tests de performance
- [ ] Corrections de bugs
- [ ] Animations finales
- [ ] Documentation utilisateur

---

## 🚀 **ESTIMATION TOTALE**

**Durée :** 6-8 jours de développement
**Fichiers :** 11 nouveaux fichiers
**Lignes de code :** ~2,500 lignes
**Complexité :** Moyenne-Élevée

---

## ✅ **PROCHAINE ACTION**

Maintenant que tout est détaillé, veux-tu que je commence l'implémentation ?

**Option 1 :** Commencer par les **Hooks** (useOnboarding, useAutoSave)
**Option 2 :** Commencer par **QuickSignup** directement
**Option 3 :** Créer tous les **composants réutilisables** d'abord
**Option 4 :** Tout implémenter en une fois (6-8 heures de travail)

Quelle approche préfères-tu ? 🎯

---

**Date de dernière mise à jour :** 11 février 2026  
**Statut :** 📋 Spécifications complètes - Prêt pour implémentation
