# Plan d'Onboarding Progressif & Vision 2030

**Date :** 11 février 2026  
**Statut :** 📋 EN PLANIFICATION  
**Objectif :** Créer un flux d'inscription fluide et inspirant avec intégration de la Vision 2030

---

## 🎯 **VISION 2030 - FAMILLES DE DISCIPLES ADORATRICES**

### **Mission Globale**
> "Transformer chaque disciple en faiseur de disciples,  
> pour impacter **100 millions de vies** d'ici 2030"

### **Objectifs Chiffrés**

| Indicateur | Objectif 2030 | Actuel | Progression |
|------------|---------------|--------|-------------|
| 👥 **Disciples Formés** | 100,000 | 350 | 0.35% |
| 👨‍🏫 **Mentors Équipés** | 500 | 175 | 35% |
| ❤️ **Vies Touchées** | 100,000,000 | 3,500 | 0.0035% |
| ⛪ **Familles Établies** | 1,000 | 35 | 3.5% |

### **Stratégie de Multiplication**
- Chaque disciple formé devient un faiseur de disciples
- Chaque mentor équipe 5-10 disciples
- Chaque famille établit 2-3 nouvelles familles par an
- Impact exponentiel : 100,000 disciples × 1,000 vies = 100M vies touchées

---

## 🚀 **FLUX D'ONBOARDING PROGRESSIF (5 ÉTAPES)**

### **Vue d'ensemble**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ÉTAPE 1: Page de Bienvenue + Vision 2030                      │
│  ↓                                                              │
│  ÉTAPE 2: Choix du Rôle (Disciple/Mentor/Superviseur/Pasteur)  │
│  ↓                                                              │
│  ÉTAPE 3: Formulaire Simplifié (6 champs essentiels)           │
│  ↓                                                              │
│  ÉTAPE 4: Validation Email (avec mot de passe provisoire)      │
│  ↓                                                              │
│  ÉTAPE 5: Formulaire Complet (profil détaillé)                 │
│  ↓                                                              │
│  ÉTAPE 6: Dashboard Personnalisé + Tour Guidé                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 **DÉTAIL DES ÉTAPES**

### **ÉTAPE 1 : Page de Bienvenue avec Vision 2030** ✅ CRÉÉE

**Fichier :** `src/pages/WelcomeOnboarding.jsx`

**Sections :**
1. **Hero Section**
   - Logo DiscipleLife
   - Titre principal avec gradient
   - Sous-titre inspirant
   - 2 CTA : "Commencer Maintenant" + "Découvrir la Vision 2030"

2. **Section Vision 2030** ⭐ NOUVEAU
   - Badge "Vision 2030"
   - Citation motivante
   - 4 cartes statistiques animées :
     - 100,000 Disciples Formés
     - 500 Mentors Équipés
     - 100,000,000 Vies Touchées
     - 1,000 Familles Établies
   - Barre de progression globale (35%)
   - 3 cartes : Mission / Valeurs / Impact

3. **Section Choix de Rôle**
   - 4 cartes interactives
   - Descriptions et fonctionnalités par rôle
   - Animations au survol

**État :** ✅ Implémentée

---

### **ÉTAPE 2 : Formulaire Simplifié (Quick Signup)** 📝 À CRÉER

**Fichier :** `src/pages/QuickSignup.jsx`

**Champs (6 uniquement) :**
1. **Famille** (dropdown) - Requis
2. **Prénom** - Requis
3. **Nom** - Requis
4. **Email** - Requis + validation
5. **Fonction** (Pasteur/AP/Berger) - Optionnel
6. **Mot de passe** - Requis (min 6 caractères)

**Particularités :**
- Rôle pré-rempli depuis l'étape précédente
- Indicateur de progression : "Étape 2/5"
- Validation en temps réel avec `useFormValidation`
- Utilisation du composant `FormField`
- Bouton "Retour" pour changer de rôle
- Sauvegarde dans localStorage

**Action après soumission :**
```javascript
// Création du compte Supabase
await supabase.auth.signUp({
  email, 
  password,
  options: {
    data: {
      first_name, last_name, role, famille_id, fonction,
      onboarding_completed: false,
      onboarding_step: 2
    }
  }
});

// Redirection vers validation email
navigate('/verify-email');
```

**État :** 📝 À créer

---

### **ÉTAPE 3 : Validation Email** 📧 À CRÉER

**Fichier :** `src/pages/EmailVerification.jsx`

**Contenu :**
- Illustration d'email envoyé (icône animée)
- Message : "Vérifiez votre boîte mail"
- Email affiché avec possibilité de modifier
- Instructions claires
- Bouton "Renvoyer l'email" (cooldown 60s)
- Détection automatique de la confirmation (polling toutes les 5s)

**Fonctionnalités :**
```javascript
// Polling pour détecter la confirmation
useEffect(() => {
  const checkEmailVerified = setInterval(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email_confirmed_at) {
      clearInterval(checkEmailVerified);
      toast({ title: "Email confirmé !", description: "Complétez votre profil" });
      navigate('/complete-profile');
    }
  }, 5000);
  
  return () => clearInterval(checkEmailVerified);
}, []);
```

**État :** 📝 À créer

---

### **ÉTAPE 4 : Formulaire Complet (Complete Profile)** 📝 À CRÉER

**Fichier :** `src/pages/CompleteProfile.jsx`

**Organisation en sections :**

**Section 1 : Informations de base** (pré-remplies, modifiables)
- Famille, Prénom, Nom, Email, Fonction

**Section 2 : Informations spirituelles** ⭐
- Date d'entrée dans la famille
- Suivi par (mentor/superviseur)
- Statut spirituel (Non-croyant, Nouveau converti, Disciple affermi, Faiseur de disciples)
- Formations PCNC réalisées
- Nombre de disciples (si mentor/superviseur)

**Section 3 : Coordonnées** ⭐
- Téléphone
- Ville de résidence
- Adresse complète (optionnel)

**Section 4 : Préférences** ⭐
- Photo de profil (upload)
- Bio courte (textarea)
- Centres d'intérêt spirituels (multi-select)
- Disponibilités pour accompagnement (checkboxes)

**Fonctionnalités :**
- Indicateur de progression : "Étape 4/5"
- Sauvegarde automatique toutes les 30s (hook `useAutoSave`)
- Validation par section
- Possibilité de "Sauter" et compléter plus tard
- Bouton "Terminer mon profil"

**Action après soumission :**
```javascript
await supabase.from('profils').update({
  ...allProfileData,
  onboarding_completed: true,
  profile_completed_at: new Date().toISOString()
}).eq('id', user.id);

// Redirection vers le dashboard approprié
navigate(`/space/${role}`);
```

**État :** 📝 À créer

---

### **ÉTAPE 5 : Tour Guidé du Dashboard** 📝 À CRÉER

**Fichier :** `src/components/DashboardTour.jsx`

**Fonctionnalités :**
- Overlay semi-transparent
- Tooltips interactifs positionnés sur les éléments clés
- 5-7 étapes selon le dashboard
- Navigation : Suivant / Précédent / Passer
- Stockage dans localStorage (ne s'affiche qu'une fois)
- Possibilité de relancer le tour depuis les paramètres

**Étapes du tour (exemple pour Dashboard Disciple) :**
1. "Bienvenue sur votre dashboard !"
2. "Ici, vos statistiques de progression"
3. "Accédez à votre journal de transformation"
4. "Consultez vos parcours en cours"
5. "Contactez votre mentor"

**État :** 📝 À créer

---

## 🛠️ **FICHIERS À CRÉER**

### **Pages (4 fichiers)**
- [x] `src/pages/WelcomeOnboarding.jsx` ✅ CRÉÉ
- [ ] `src/pages/QuickSignup.jsx` 📝 À créer
- [ ] `src/pages/EmailVerification.jsx` 📝 À créer
- [ ] `src/pages/CompleteProfile.jsx` 📝 À créer

### **Composants (5 fichiers)**
- [ ] `src/components/onboarding/RoleCard.jsx` 📝 À créer
- [ ] `src/components/onboarding/ProgressBar.jsx` 📝 À créer
- [ ] `src/components/onboarding/StepIndicator.jsx` 📝 À créer
- [ ] `src/components/onboarding/OnboardingLayout.jsx` 📝 À créer
- [ ] `src/components/DashboardTour.jsx` 📝 À créer

### **Hooks (2 fichiers)**
- [ ] `src/hooks/useOnboarding.js` 📝 À créer
- [ ] `src/hooks/useAutoSave.js` 📝 À créer

### **Utils (1 fichier)**
- [ ] `src/utils/onboardingSteps.js` 📝 À créer

---

## 🎨 **DESIGN & UX - SPÉCIFICATIONS**

### **Palette de Couleurs**
- **Background :** `#0f0518` (violet très foncé)
- **Cards :** `#1a0b2e` (violet foncé)
- **Accents :** Gradients (purple → pink → blue → teal)
- **Texte :** Blanc / Gray-300 / Gray-400

### **Animations**
- **Entrée :** Fade + Slide up (0.6s)
- **Hover :** Scale 1.05 + Glow effect
- **Transition :** Slide left/right entre étapes
- **Compteurs :** Count-up animation
- **Progression :** Barre animée avec pulse

### **Responsive**
- Mobile : 1 colonne, navigation verticale
- Tablet : 2 colonnes pour les cartes
- Desktop : 4 colonnes, layout horizontal

---

## ⚡ **OPTIMISATIONS PERFORMANCE**

1. **Lazy Loading**
   - Charger les étapes suivantes en arrière-plan
   - Prefetch des données (familles, mentors)

2. **Cache**
   - localStorage pour l'état d'onboarding
   - Cache des choix utilisateur
   - Restauration en cas de rafraîchissement

3. **Validation**
   - Debounce 300ms sur les champs texte
   - Validation asynchrone pour l'email (vérifier si existe déjà)

4. **Images**
   - Lazy loading des illustrations
   - Format WebP avec fallback
   - Compression optimale

---

## 🔄 **GESTION DE L'ÉTAT**

### **localStorage Structure**

```javascript
{
  "onboarding_state": {
    "currentStep": 2,
    "selectedRole": "disciple",
    "formData": {
      "firstName": "Jean",
      "lastName": "Dupont",
      "email": "jean.dupont@example.com",
      "familleId": "uuid-famille",
      "fonction": ""
    },
    "timestamp": "2026-02-11T20:00:00Z"
  }
}
```

### **Profil Supabase - Champs d'onboarding**

```sql
-- Ajouter ces colonnes à la table profils (si pas déjà présentes)
ALTER TABLE profils ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE profils ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1;
ALTER TABLE profils ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP;
```

---

## 📊 **MÉTRIQUES DE SUCCÈS**

### **Taux de Complétion**
- **Objectif :** > 80% des utilisateurs complètent l'onboarding
- **Mesure :** Nombre d'utilisateurs avec `onboarding_completed = true` / Total inscrits

### **Temps Moyen**
- **Objectif :** < 5 minutes pour tout le flux
- **Mesure :** `profile_completed_at - created_at`

### **Abandon**
- **Identifier :** À quelle étape les utilisateurs abandonnent
- **Mesure :** Distribution de `onboarding_step` pour les profils incomplets

### **Retours**
- **Mesure :** Combien d'utilisateurs reviennent en arrière (changent de rôle)

---

## 🎯 **PROCHAINES ÉTAPES**

### **Phase 1 : Onboarding de Base** (À créer)
- [ ] QuickSignup.jsx (formulaire simplifié)
- [ ] EmailVerification.jsx (validation email)
- [ ] CompleteProfile.jsx (formulaire complet)
- [ ] useOnboarding.js (hook de gestion)
- [ ] Routes dans App.jsx

### **Phase 2 : Composants Réutilisables** (À créer)
- [ ] ProgressBar.jsx (barre de progression)
- [ ] StepIndicator.jsx (indicateur d'étape)
- [ ] OnboardingLayout.jsx (layout commun)
- [ ] useAutoSave.js (sauvegarde automatique)

### **Phase 3 : Tour Guidé** (À créer)
- [ ] DashboardTour.jsx (tour interactif)
- [ ] Configuration par dashboard
- [ ] Stockage des préférences

---

## ⚠️ **FONCTIONNALITÉS NON TRAITÉES**

### **1. NOTATIONS** 📊 NON IMPLÉMENTÉ

**Description :**
Système de notation/évaluation des disciples par les mentors

**Fonctionnalités à implémenter :**
- [ ] Notation sur plusieurs critères (prière, parole, service, etc.)
- [ ] Historique des notations
- [ ] Graphiques d'évolution
- [ ] Commentaires du mentor
- [ ] Notifications de nouvelle notation
- [ ] Export des évaluations

**Tables nécessaires :**
- `notations_disciples` (id, disciple_id, mentor_id, date, criteres JSONB, note_globale, commentaire)
- `criteres_notation` (id, nom, description, poids, categorie)

**Pages à créer :**
- `src/pages/NotationsDisciple.jsx` (vue disciple)
- `src/pages/NotationsMentor.jsx` (saisie mentor)
- `src/pages/NotationsStats.jsx` (statistiques)

---

### **2. SIGNALEMENTS** 🚨 NON IMPLÉMENTÉ

**Description :**
Système de signalement pour situations critiques ou alertes

**Fonctionnalités à implémenter :**
- [ ] Formulaire de signalement (crise, problème, besoin urgent)
- [ ] Types de signalements (spirituel, familial, santé, financier, etc.)
- [ ] Niveau de priorité (faible, moyen, élevé, urgent)
- [ ] Notification immédiate au mentor/superviseur/pasteur
- [ ] Suivi du traitement du signalement
- [ ] Historique des signalements
- [ ] Statistiques et rapports

**Tables nécessaires :**
- `signalements` (id, user_id, type, priorite, description, statut, traite_par, date_traitement)
- `suivi_signalements` (id, signalement_id, action_prise, date, notes)

**Pages à créer :**
- `src/pages/SignalementForm.jsx` (création)
- `src/pages/SignalementsList.jsx` (liste)
- `src/pages/SignalementDetail.jsx` (détails + suivi)
- `src/pages/SignalementsAdmin.jsx` (gestion admin)

**Intégration :**
- Bouton "Signaler" sur chaque fiche disciple
- Badge de notification pour les signalements non traités
- Alertes dashboard pour les signalements urgents

---

## 🎨 **DESIGN SYSTEM - VISION 2030**

### **Couleurs Thématiques**

```javascript
const VISION_COLORS = {
  primary: 'from-teal-500 to-blue-500',
  secondary: 'from-purple-500 to-pink-500',
  accent: 'from-orange-500 to-red-500',
  success: 'from-green-500 to-emerald-500'
};
```

### **Typographie**
- **Titres :** Inter Bold, 48-72px
- **Sous-titres :** Inter Semibold, 24-32px
- **Corps :** Inter Regular, 16-18px
- **Stats :** Inter Bold, 36-48px

### **Iconographie**
- Lucide React icons
- Taille : 24-40px pour les sections principales
- Couleurs : Selon la thématique (blue, green, purple, orange)

---

## 📱 **RESPONSIVE DESIGN**

### **Breakpoints**
- **Mobile :** < 768px (1 colonne)
- **Tablet :** 768-1024px (2 colonnes)
- **Desktop :** > 1024px (4 colonnes)

### **Adaptations Mobile**
- Navigation verticale pour les étapes
- Cartes en pleine largeur
- Textes réduits (18px → 16px)
- Boutons full-width
- Padding réduit

---

## 🔐 **SÉCURITÉ & VALIDATION**

### **Validation Formulaire Simplifié**
- Email : Format + Vérification unicité
- Mot de passe : Min 6 caractères + Force
- Famille : Requis pour disciples
- Nom/Prénom : Min 2 caractères

### **Validation Formulaire Complet**
- Téléphone : Format international
- Ville : Requis
- Photo : Max 2MB, formats jpg/png/webp

### **Protection**
- Rate limiting : Max 5 inscriptions/heure par IP
- Captcha après 3 tentatives échouées
- Validation email obligatoire
- RLS sur toutes les tables

---

## 📈 **TRACKING & ANALYTICS**

### **Événements à Tracker**

```javascript
// Analytics events
analytics.track('onboarding_started', { role: selectedRole });
analytics.track('onboarding_step_completed', { step: 2 });
analytics.track('onboarding_abandoned', { step: 3, reason: 'timeout' });
analytics.track('onboarding_completed', { duration: 245, role: 'disciple' });
```

### **Métriques à Surveiller**
- Taux de complétion par étape
- Temps moyen par étape
- Taux d'abandon par étape
- Taux de retour en arrière
- Taux de modification d'email

---

## 🚀 **PLAN D'IMPLÉMENTATION**

### **Sprint 1 : Onboarding de Base** (3-5 jours)
1. ✅ WelcomeOnboarding.jsx (FAIT)
2. QuickSignup.jsx
3. EmailVerification.jsx
4. CompleteProfile.jsx
5. useOnboarding.js
6. Routes + Tests

### **Sprint 2 : Notations** (3-5 jours)
1. Migration SQL (tables notations)
2. NotationsDisciple.jsx
3. NotationsMentor.jsx
4. NotationsStats.jsx
5. Hook useNotations.js
6. Tests + Documentation

### **Sprint 3 : Signalements** (3-5 jours)
1. Migration SQL (tables signalements)
2. SignalementForm.jsx
3. SignalementsList.jsx
4. SignalementDetail.jsx
5. SignalementsAdmin.jsx
6. Notifications en temps réel
7. Tests + Documentation

### **Sprint 4 : Polish & Optimisation** (2-3 jours)
1. Animations finales
2. Tests de performance
3. Corrections de bugs
4. Documentation utilisateur
5. Déploiement

---

## 📝 **NOTES IMPORTANTES**

### **Décisions Techniques**
- Utiliser `useFormValidation` pour tous les formulaires
- Utiliser `FormField` pour cohérence UI
- Utiliser `useCachedData` pour les dropdowns
- Sauvegarder l'état dans localStorage + Supabase

### **Points d'Attention**
- Gérer les cas d'interruption (fermeture navigateur)
- Permettre la reprise de l'onboarding
- Valider côté serveur (RLS + triggers)
- Tester sur mobile en priorité

### **Dépendances**
- Framer Motion (animations)
- Recharts (graphiques)
- Lucide React (icônes)
- Shadcn/ui (composants)

---

## 🎯 **PROCHAINE ACTION**

**Question :** Que veux-tu prioriser maintenant ?

**Option A :** Continuer l'onboarding (QuickSignup + EmailVerification + CompleteProfile)
**Option B :** Commencer les Notations (système d'évaluation des disciples)
**Option C :** Commencer les Signalements (système d'alertes et crises)
**Option D :** Autre chose ?

---

**Date de dernière mise à jour :** 11 février 2026  
**Statut du document :** 📋 Planification complète
