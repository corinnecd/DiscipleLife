# Rapport : Système d'Authentification et d'Inscription
## DiscipleLife – Logique par rôle, validation hiérarchique et flux en 4 étapes

**Date :** 12 février 2026  
**Référence :** Modèle discipolat avec validation par email et code d'invitation  
**Version :** 2.0

---

## Synthèse

### 1. Logique de validation hiérarchique

| Rôle | Peut entrer dans la famille seulement si… | Validateur |
|------|-------------------------------------------|------------|
| Disciple | Validation par son mentor | Mentor |
| Mentor | Validation par son superviseur | Superviseur |
| Superviseur | Autorisation d'un pasteur de tutelle | Pasteur |
| Pasteur | Création par un admin | Admin |

### 2. Double validation (code + lien)

- Code d'invitation généré par le validateur
- Lien unique envoyé par email vers le formulaire complet
- Compte créé uniquement après soumission du formulaire complet

### 3. Flux d'authentification et inscription

1. **Page d'accueil** : Au chargement, l'utilisateur arrive sur la page d'accueil avec les cartes des rôles (Disciple, Mentor, Superviseur). Liens « Se connecter » / « Mot de passe oublié ».
2. **Étape 1** : Au clic sur un rôle, le 1er formulaire simplifié apparaît (famille ou pasteur, prénom, nom, email, confirmation email).
3. **Étape 2** : Code d'invitation + lien unique envoyé par email vers le formulaire complet (et optionnellement mot de passe provisoire).
4. **Étape 3** : Formulaire complet rempli → création du compte uniquement à la soumission → page bienvenue.
5. **Étape 4** : Accès au dashboard selon le rôle.

### 4. Plan d'implémentation (4 phases)

- **Phase 1** : Fondations (table invitations, envoi d'emails, formulaire avec token)
- **Phase 2** : Interfaces pour créer des invitations (mentor, superviseur, pasteur)
- **Phase 3** : Flux complet (création du compte au bon moment)
- **Phase 4** : Améliorations UX (indicateurs, barre de progression, tour guidé)

---

## Table des matières

1. [Logique de validation hiérarchique](#1-logique-de-validation-hiérarchique)
2. [Double validation (code + lien)](#2-double-validation-code--lien)
3. [Flux d'authentification en 4 étapes](#3-flux-dauthentification-en-4-étapes)
4. [Flux détaillé par rôle](#4-flux-détaillé-par-rôle)
5. [État actuel vs cible](#5-état-actuel-vs-cible)
6. [Améliorations techniques proposées](#6-améliorations-techniques-proposées)
7. [Améliorations UX proposées](#7-améliorations-ux-proposées)
8. [Plan d'implémentation](#8-plan-dimplémentation)

---

## 1. Logique de validation hiérarchique

### Règles métier (modèle discipolat)

| Rôle        | Peut entrer dans la famille seulement si…        | Validateur         |
|-------------|---------------------------------------------------|--------------------|
| **Disciple**   | Validation par son **mentor**                       | Mentor             |
| **Mentor**     | Validation par son **superviseur**                  | Superviseur        |
| **Superviseur**| Autorisation d’un **pasteur de tutelle**            | Pasteur            |
| **Pasteur**    | Création par un **admin** (pas d’auto-inscription)  | Admin / Super admin|

### Chaîne de validation

```
Admin
  └── Pasteur (crée les superviseurs)
        └── Superviseur (valide les mentors)
              └── Mentor (valide les disciples)
                    └── Disciple
```

---

## 2. Double validation (code + lien)

### Principe

1. **Code d’invitation** : généré par le validateur (mentor / superviseur / pasteur) et envoyé par email.
2. **Lien d’accès** : URL unique incluse dans l’email pour accéder au formulaire complet.
3. **Création du compte** : uniquement après soumission du formulaire complet.

### Flux de validation

```
Validateur génère une invitation
  → Code + lien envoyés par email
  → Invité clique sur le lien
  → Accès au formulaire simplifié (Étape 1)
  → Email envoyé avec lien vers formulaire complet
  → Invité remplit le formulaire complet (Étape 3)
  → Compte créé à ce moment précis
  → Redirection vers page bienvenue puis dashboard
```

---

## 3. Flux d'authentification en 4 étapes

### Vue d’ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1 : Formulaire simplifié                                              │
│  • Choix famille (ou pasteur pour superviseur)                               │
│  • Prénom, Nom, Email, Confirmation Email                                    │
│  • Liens : Se connecter | Mot de passe oublié                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 2 : Email envoyé                                                      │
│  • Email avec lien vers formulaire complet                                   │
│  • (Optionnel) Mot de passe provisoire                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 3 : Formulaire complet + création du compte                           │
│  • Toutes les informations d’identité                                        │
│  • Compte créé uniquement à la soumission                                    │
│  • Redirection vers page bienvenue                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 4 : Accès dashboard selon le rôle                                     │
│  • Disciple → /space/disciple                                                │
│  • Mentor → /space/mentor                                                    │
│  • Superviseur → /space/superviseur                                          │
│  • Pasteur → /space/pasteur                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Flux détaillé par rôle

### 4.1 Disciple

**Condition :** validation par le mentor.

| Étape | Action | Détails |
|-------|--------|---------|
| Pré-requis | Mentor crée une invitation | Mentor génère un code/lien pour un disciple potentiel |
| 1 | Accès au formulaire simplifié | Via lien reçu par email. Champs : Famille, Prénom, Nom, Email, Confirmation email |
| 1 bis | Connexion existante | Si compte déjà créé : Se connecter, Mot de passe oublié |
| 2 | Email envoyé | Lien vers formulaire complet (et éventuellement mot de passe provisoire) |
| 3 | Formulaire complet | Renseigner toutes les informations d’identité. Soumission = création du compte |
| 4 | Bienvenue + dashboard | Page bienvenue puis redirection vers `/space/disciple` |

---

### 4.2 Mentor

**Condition :** validation par le superviseur.

| Étape | Action | Détails |
|-------|--------|---------|
| Pré-requis | Superviseur crée une invitation | Superviseur génère un code/lien pour un mentor potentiel |
| 1 | Accès au formulaire simplifié | Via lien reçu par email. Champs : Famille, Prénom, Nom, Email, Confirmation email |
| 2 | Email envoyé | Lien vers formulaire complet |
| 3 | Formulaire complet | Renseigner toutes les informations. Soumission = création du compte |
| 4 | Bienvenue + dashboard | Redirection vers `/space/mentor` |

---

### 4.3 Superviseur

**Condition :** autorisation d’un pasteur de tutelle.

| Étape | Action | Détails |
|-------|--------|---------|
| Pré-requis | Pasteur crée une invitation | Pasteur génère un code/lien pour un superviseur potentiel |
| 1 | Accès au formulaire simplifié | Via lien reçu par email. Champs : Pasteur de tutelle, Prénom, Nom, Email, Confirmation email |
| 2 | Email envoyé | Lien vers formulaire complet |
| 3 | Formulaire complet | Renseigner toutes les informations. Soumission = création du compte |
| 4 | Bienvenue + dashboard | Redirection vers `/space/superviseur` |

---

### 4.4 Pasteur

**Condition :** création par un admin uniquement (pas d’auto-inscription).

| Étape | Action | Détails |
|-------|--------|---------|
| Pré-requis | Admin crée le pasteur | Via interface admin ou script |
| - | Envoi des identifiants | Email avec lien et identifiants (ou mot de passe provisoire) |
| 1 | Connexion | Se connecter avec les identifiants reçus |
| 2 | Changement de mot de passe | Obligation de définir un nouveau mot de passe |
| 3 | Profil complet | Renseigner le profil si nécessaire |
| 4 | Dashboard | Redirection vers `/space/pasteur` |

---

## 5. État actuel vs cible

### Actuellement implémenté

| Fonctionnalité | État | Fichiers concernés |
|----------------|------|--------------------|
| Page Auth (connexion / inscription) | ✅ | Auth.jsx |
| Formulaire simplifié QuickSignup | ✅ | onboarding/QuickSignup.jsx |
| Vérification email | ✅ | onboarding/EmailVerification.jsx |
| Formulaire complet CompleteProfile | ✅ | onboarding/CompleteProfile.jsx |
| Tour dashboard | ✅ | onboarding/DashboardTour.jsx |
| Redirection selon rôle | ✅ | AuthContext, routes |
| Codes invitation (évangélisation) | ✅ | codes_invitation, Evangelization.jsx |
| Access codes (groupes) | ✅ | access_codes, AccessCode.jsx |

### Non implémenté (cible)

| Fonctionnalité | Priorité | Description |
|----------------|----------|-------------|
| Validation hiérarchique | Critique | Disciple validé par mentor, Mentor par superviseur, Superviseur par pasteur |
| Invitation avec lien unique | Critique | Lien vers formulaire simplifié puis complet (pas d’inscription libre) |
| Code + lien envoyés par email | Critique | Envoi automatique d’email avec code et lien |
| Création compte à la soumission du formulaire complet | Critique | Pas de compte auth avant remplissage complet |
| Mot de passe provisoire | Moyenne | Optionnel, envoyé par email |
| Confirmation email dans formulaire simplifié | Haute | Champ « Confirmation Email » |
| Séparation Connexion / Inscription | Haute | Page Étape 1 avec liens « Se connecter » et « Mot de passe oublié » |

---

## 6. Améliorations techniques proposées

### 6.1 Modèle de données

**Table `invitations_famille` (nouvelle)**

```sql
CREATE TABLE invitations_famille (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  token TEXT UNIQUE NOT NULL,           -- pour le lien /inscription/{token}
  type_role TEXT NOT NULL,              -- disciple, mentor, superviseur
  famille_id UUID REFERENCES familles_disciples(id),
  mentor_id UUID REFERENCES profils(id),      -- pour disciple
  superviseur_id UUID REFERENCES profils(id), -- pour mentor
  pasteur_id UUID REFERENCES profils(id),     -- pour superviseur
  email_invite TEXT,
  expire_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES profils(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Colonnes additionnelles possibles**

- `profils.invitation_id` : lien vers l’invitation utilisée
- `profils.statut_validation` : `en_attente`, `valide`, `refuse`

### 6.2 Edge Functions Supabase

- **Envoi d’email** : Edge Function pour envoyer l’email avec code + lien (Supabase Edge Functions + Resend/SendGrid).
- **Vérification de token** : RPC ou Edge Function pour valider le token et retourner les infos d’invitation.

### 6.3 Sécurité

- Tokens signés (JWT ou équivalent) pour les liens d’inscription.
- Expiration des invitations (ex. 7 jours).
- Limitation du nombre d’invitations par validateur et par période.
- Rate limiting sur les endpoints d’inscription et de vérification de token.

### 6.4 Flux Auth

- **Pas de `signUp` Supabase** tant que le formulaire complet n’est pas soumis.
- Stockage temporaire (session, localStorage chiffré ou table `inscriptions_en_cours`) pour les données du formulaire simplifié.
- Création du compte Supabase Auth + profil à la soumission du formulaire complet.

---

## 7. Améliorations UX proposées

### 7.1 Étape 1 – Formulaire simplifié

| Amélioration | Description |
|--------------|-------------|
| Indication de l’étape | « Étape 1/3 – Informations de base » |
| Validation en temps réel | Vérification email, confirmation email identique |
| Messages explicites | « Un email vous sera envoyé avec le lien pour continuer » |
| Connexion / Mot de passe oublié | Liens visibles en haut ou en bas du formulaire |
| Choix famille / pasteur | Liste déroulante claire selon le type d’invitation |

### 7.2 Étape 2 – En attente d’email

| Amélioration | Description |
|--------------|-------------|
| Page intermédiaire | « Vérifiez votre boîte mail » avec rappel d’adresse |
| Renvoyer l’email | Bouton « Renvoyer l’email » avec cooldown |
| Vérification auto | Polling ou WebSocket pour détecter le clic sur le lien |
| Délai indicatif | « L’email peut mettre 2–5 minutes à arriver » |

### 7.3 Étape 3 – Formulaire complet

| Amélioration | Description |
|--------------|-------------|
| Sauvegarde automatique | Sauvegarde locale pour éviter la perte de données |
| Barre de progression | Pourcentage de champs remplis |
| Sections logiques | Identité, Contact, Spirituel, etc. |
| Aide contextuelle | Infobulles pour les champs complexes |
| Validation progressive | Valider par section avant de passer à la suivante |

### 7.4 Étape 4 – Bienvenue et dashboard

| Amélioration | Description |
|--------------|-------------|
| Tour guidé | Présentation rapide du dashboard (déjà partiellement fait) |
| Message personnalisé | « Bienvenue [Prénom], vous êtes [rôle] » |
| Premier pas suggéré | « Commencez par… » selon le rôle |
| Raccourcis | Liens vers les actions les plus fréquentes |

### 7.5 Général

- Design cohérent avec l’identité DiscipleLife (couleurs, typographie).
- Responsive mobile-first.
- Accessibilité (ARIA, contraste, focus).
- Messages d’erreur en français, clairs et actionnables.

---

## 8. Plan d'implémentation

### Phase 1 – Fondations (2–3 semaines)

| Tâche | Priorité | Estimation |
|-------|----------|------------|
| Créer table `invitations_famille` | Critique | 1 j |
| Edge Function envoi email (code + lien) | Critique | 2 j |
| Page formulaire simplifié avec token | Critique | 1,5 j |
| Vérification token + récupération invitation | Critique | 0,5 j |

### Phase 2 – Validation hiérarchique (2 semaines)

| Tâche | Priorité | Estimation |
|-------|----------|------------|
| Interface mentor : créer invitation disciple | Critique | 1 j |
| Interface superviseur : créer invitation mentor | Critique | 1 j |
| Interface pasteur : créer invitation superviseur | Critique | 1 j |
| Règles RLS pour invitations | Haute | 0,5 j |

### Phase 3 – Flux complet (2 semaines)

| Tâche | Priorité | Estimation |
|-------|----------|------------|
| Découpler création compte du formulaire simplifié | Critique | 1 j |
| Stockage temporaire données formulaire | Critique | 0,5 j |
| Création compte à la soumission formulaire complet | Critique | 1 j |
| Redirection bienvenue → dashboard | Haute | 0,5 j |

### Phase 4 – UX (1–2 semaines)

| Tâche | Priorité | Estimation |
|-------|----------|------------|
| Améliorations formulaire simplifié | Moyenne | 0,5 j |
| Page « Vérifiez votre email » | Moyenne | 0,5 j |
| Barre de progression formulaire complet | Moyenne | 0,5 j |
| Tour guidé personnalisé par rôle | Basse | 1 j |

---

## Résumé

| Élément | État | Action |
|---------|------|--------|
| Logique de validation hiérarchique | Documentée | À implémenter |
| Double validation (code + lien) | Documentée | À implémenter |
| Flux en 4 étapes | Documenté | Partiellement implémenté |
| Création compte au formulaire complet | Non | À implémenter |
| Envoi email avec lien | Non | À implémenter |
| Interface de création d’invitations | Partielle | À étendre |

---

## Charte de couleurs (règles à respecter)

**Règle impérative :** Aucun bouton noir. Tous les boutons doivent respecter la charte suivante.

| Élément | Couleurs autorisées |
|---------|---------------------|
| Boutons principaux | Violet/pourpre (`bg-purple-600`, `bg-fuchsia-400`), blanc pour le texte |
| Boutons secondaires / outline | Fond gris clair (`bg-gray-100`), texte noir (`text-gray-900`), bordure grise |
| Boutons icône (copier, etc.) | Fond gris clair, bordure grise, pas de fond noir |
| Toasts (succès) | Fond blanc (`bg-white`), texte noir/gris foncé (`text-gray-900`) |
| Toasts (erreur) | Fond rouge (`bg-red-600`), texte blanc |
| Champs de formulaire | Fond gris clair (`bg-gray-100`), texte noir |

**À éviter :** fond noir, boutons avec `bg-background` en thème sombre, texte sur fond sombre sans contraste suffisant.

---

**Auteur :** Assistant IA  
**Date :** 12 février 2026  
**Références :** RAPPORT_AUTHENTIFICATION_INSCRIPTION.md v1, docs/ONBOARDING_IMPLEMENTATION_RAPPORT.md, modèle discipolat
