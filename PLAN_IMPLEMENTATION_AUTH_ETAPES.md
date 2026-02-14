# Plan d'implémentation – Authentification et inscription par rôle

**Date :** 12 février 2026  
**Référence :** [RAPPORT_AUTHENTIFICATION_INSCRIPTION.md](./RAPPORT_AUTHENTIFICATION_INSCRIPTION.md)  
**Objectif :** Améliorer le processus d'authentification pour chaque rôle, sans casser le site, avec une UX cohérente.

### Migrations concernées
- [111_invitations_famille.sql](./sql/migrations/111_invitations_famille.sql) – Table invitations, RPC `creer_invitation_famille`, `valider_invitation_token`
- [120_inscription_step1_email.sql](./sql/migrations/120_inscription_step1_email.sql) – Table inscription_step1, RPC `creer_lien_inscription_step1`, `get_inscription_step1_by_token`
- [121_valider_code_invitation.sql](./sql/migrations/121_valider_code_invitation.sql) – RPC `valider_code_invitation` (code → token)
- [122_marquer_invitation_utilisee.sql](./sql/migrations/122_marquer_invitation_utilisee.sql) – RPC `marquer_invitation_utilisee` (used_at)

---

## Vue d'ensemble

| Phase | Objectif | Durée estimée | Risque |
|-------|----------|---------------|--------|
| **Phase 0** | Vérifier les prérequis | 0,5 j | Faible |
| **Phase 1** | Finaliser le flux invitation (InscriptionParToken) | 1,5 j | Moyen |
| **Phase 2** | Interfaces de création d'invitations (dashboards) | 2 j | Moyen |
| **Phase 3** | Champ code d'invitation sur HomePage (flux hybride) | 0,5 j | Faible |
| **Phase 4** | Renforcer Auth.jsx et messages UX | 0,5 j | Faible |
| **Phase 5** | Rendre obligatoire l'invitation pour Mentor/Superviseur | 0,5 j | Moyen |
| **Phase 6** | Améliorations UX finales | 1 j | Faible |

**Total estimé :** 6 à 7 jours.

---

## Phase 0 – Vérification des prérequis

### Objectif
S'assurer que les migrations et l'Edge Function sont en place et fonctionnelles.

### Tâches

| # | Tâche | Fichiers / commandes | Critère de réussite |
|---|-------|----------------------|----------------------|
| 0.1 | Vérifier que la [migration 111](./sql/migrations/111_invitations_famille.sql) est appliquée | Supabase Dashboard → SQL | Table `invitations_famille` existe, RPC `creer_invitation_famille` et `valider_invitation_token` disponibles |
| 0.2 | Vérifier que la [migration 120](./sql/migrations/120_inscription_step1_email.sql) est appliquée | Supabase Dashboard → SQL | Table `inscription_step1` existe, RPC `creer_lien_inscription_step1` et `get_inscription_step1_by_token` disponibles |
| 0.3 | Vérifier que l'Edge Function `send-inscription-email` est déployée | `supabase functions list` | La fonction existe et répond (Resend configuré) |

### Commande de vérification (optionnelle)

```sql
-- Dans Supabase SQL Editor
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('creer_invitation_famille', 'valider_invitation_token', 'creer_lien_inscription_step1', 'get_inscription_step1_by_token');
-- Doit retourner 4 lignes
```

---

## Phase 1 – Finaliser le flux invitation (InscriptionParToken)

### Objectif
Aujourd'hui, `InscriptionParToken` sauvegarde en `localStorage` et affiche « Un email vous sera envoyé » sans envoyer d'email ni rediriger. Il faut connecter cette page au flux réel : appel à `creer_lien_inscription_step1`, envoi d'email, redirection vers SignupDisciple.

### Fichiers concernés
- `src/pages/InscriptionParToken.jsx`

### Tâches détaillées

| # | Tâche | Description | Code à modifier |
|---|-------|-------------|-----------------|
| 1.1 | Appeler `creer_lien_inscription_step1` à la soumission | Après validation du formulaire, construire `p_data` avec `role`, `prenom`, `nom`, `familleId`, `pasteurId` (si superviseur), `invitationId`. Appeler la RPC avec `p_email` et `p_data`. | `handleSubmit` dans InscriptionParToken.jsx |
| 1.2 | Envoyer l'email via Edge Function | Appeler `supabase.functions.invoke('send-inscription-email', { body: { email, lien, prenom, nom } })`. Utiliser le token retourné par `creer_lien_inscription_step1` pour construire `lien = ${origin}/signup?token=${token}`. | Même bloc `handleSubmit` |
| 1.3 | Redirection vers SignupDisciple | Après succès : `navigate(\`/signup?token=${token}\`)` pour une UX fluide (l'utilisateur n'a pas besoin d'aller chercher l'email). Stocker aussi en `sessionStorage` pour fallback. | Fin de `handleSubmit` |
| 1.4 | Gérer les erreurs | En cas d'échec RPC ou Edge Function : afficher un message clair, proposer « Réessayer » et « Retour à l'accueil ». | Bloc catch |
| 1.5 | Marquer l'invitation comme utilisée (optionnel) | Créer une RPC ou utiliser un trigger pour marquer `invitations_famille.used_at` quand l'inscription est complète. Peut être reporté en Phase 6. Voir [111_invitations_famille](./sql/migrations/111_invitations_famille.sql). | Migration ou RPC |

### Schéma du flux

```
Validateur crée invitation → Email avec lien /inscription/{token}
    → Utilisateur clique → InscriptionParToken (valider_invitation_token)
    → Formulaire prénom, nom, email, confirmation
    → Soumission : creer_lien_inscription_step1 + send-inscription-email
    → Redirection /signup?token=yyy
    → SignupDisciple (get_inscription_step1_by_token) → formulaire complet
    → Création compte → WelcomeOnboarding → Dashboard
```

### Critères d'acceptation
- [ ] Depuis un lien `/inscription/:token` valide, remplir le formulaire et soumettre
- [ ] Vérifier qu'un enregistrement est créé dans `inscription_step1`
- [ ] Vérifier la redirection vers `/signup?token=...` avec formulaire pré-rempli
- [ ] En cas d'échec email : message d'erreur, possibilité de continuer vers signup avec token (résilience)

---

## Phase 2 – Interfaces de création d'invitations

### Objectif
Permettre aux validateurs (mentor, superviseur, pasteur) de créer des invitations depuis leur dashboard et d'envoyer le lien par email.

### 2.1 Interface Mentor – Inviter un disciple

| # | Tâche | Fichier | Description |
|---|-------|---------|-------------|
| 2.1.1 | Créer un modal ou une page « Inviter un disciple » | `MentorDashboard.jsx` ou composant dédié | Formulaire : Famille (liste des familles du mentor), Email invité (optionnel), Prénom/Nom (optionnel pour pré-remplir) |
| 2.1.2 | Appeler `creer_invitation_famille('disciple', familleId, email)` | Idem | Récupérer `token` et `lien_complet` |
| 2.1.3 | Afficher le lien et proposer de copier / envoyer par email | Idem | Afficher le lien complet `${origin}/inscription/${token}`. Bouton « Copier le lien ». Option : appeler une Edge Function pour envoyer l'email (si créée). |
| 2.1.4 | Remplacer le lien « Ajouter membre » actuel | `MentorDashboard.jsx` (ligne ~366) | Au lieu de `/signup?role=disciple&mode=add`, ouvrir le modal « Inviter un disciple » ou rediriger vers une page dédiée |

### 2.2 Interface Superviseur – Inviter un mentor

| # | Tâche | Fichier | Description |
|---|-------|---------|-------------|
| 2.2.1 | Créer un modal « Inviter un mentor » | `SuperviseurDashboard.jsx` ou composant | Formulaire : Famille (familles gérées par le superviseur), Email invité (optionnel) |
| 2.2.2 | Appeler `creer_invitation_famille('mentor', familleId, email)` | Idem | Afficher le lien `/inscription/${token}` |
| 2.2.3 | Adapter le bouton « Ajouter membre » | `StatsRapidesEtActions.jsx` (ligne ~64) | Selon le contexte : inviter un mentor ou un disciple. Ou proposer les deux options. |

### 2.3 Interface Pasteur – Inviter un superviseur

| # | Tâche | Fichier | Description |
|---|-------|---------|-------------|
| 2.3.1 | Créer un modal « Inviter un superviseur » | `PasteurDashboard.jsx` ou AdminDashboard | Formulaire : Famille (optionnel, pour affecter directement) ou « Nouvelle famille », Email invité (optionnel) |
| 2.3.2 | Appeler `creer_invitation_famille('superviseur', familleId, email)` | Idem | Pour superviseur, `famille_id` peut être `null` (nouvelle famille). Vérifier la signature de la RPC. |
| 2.3.3 | Adapter le bouton « Ajouter membre » | `PasteurDashboard.jsx` (ligne ~1688) | Proposer « Inviter un superviseur » ou « Inviter un mentor » selon le rôle cible |

### 2.4 Edge Function pour envoyer l’email d’invitation (optionnel)

Si on souhaite que le validateur envoie directement l’email au lieu de copier le lien :

| # | Tâche | Fichier | Description |
|---|-------|---------|-------------|
| 2.4.1 | Créer `send-invitation-email` | `supabase/functions/send-invitation-email/index.ts` | Paramètres : email, lien, rôle, famille_nom. Envoyer un email avec le lien `/inscription/:token`. |
| 2.4.2 | Appeler depuis les modals | Dashboards | Après `creer_invitation_famille`, appeler `send-invitation-email` avec le lien généré. |

### Critères d'acceptation Phase 2
- [ ] Un mentor peut créer une invitation disciple et obtenir un lien `/inscription/:token`
- [ ] Un superviseur peut créer une invitation mentor et obtenir un lien
- [ ] Un pasteur peut créer une invitation superviseur et obtenir un lien
- [ ] Le lien mène à InscriptionParToken avec les bonnes données (famille, rôle) pré-remplies

---

## Phase 3 – Champ code d’invitation sur HomePage (flux hybride)

### Objectif
Permettre à un utilisateur qui a reçu un code (par SMS, oral, etc.) de le saisir sur la page d'accueil pour accéder au formulaire simplifié avec famille/rôle déjà déterminés.

### Fichiers concernés
- `src/pages/HomePage.jsx`

### Tâches

| # | Tâche | Description |
|---|-------|-------------|
| 3.1 | Ajouter un champ optionnel « Code d'invitation » | Au-dessus ou en dessous des boutons de rôle. Si l'utilisateur saisit un code et valide, appeler une RPC pour valider le code. La table `invitations_famille` (voir [111_invitations_famille](./sql/migrations/111_invitations_famille.sql)) a une colonne `code`. Créer une RPC `valider_code_invitation(p_code)` qui retourne `token` si le code est valide. |
| 3.2 | Si code valide : redirection vers `/inscription/:token` | Au lieu d'afficher le formulaire simplifié HomePage, rediriger vers InscriptionParToken qui gère déjà le flux. |
| 3.3 | Sinon : comportement actuel | Si pas de code ou code invalide, garder le flux actuel (choix famille, rôle, etc.). |

### RPC à créer (migration)

```sql
-- valider_code_invitation(p_code TEXT)
-- Retourne token si code valide, NULL sinon
-- Utilise la table invitations_famille, colonne code
```

### Critères d'acceptation
- [ ] Saisir un code valide → redirection vers `/inscription/:token` avec formulaire pré-rempli
- [ ] Saisir un code invalide → message « Code invalide ou expiré », flux normal conservé
- [ ] Pas de code → flux actuel inchangé

---

## Phase 4 – Renforcer Auth.jsx et messages UX

### Objectif
Clarifier la page de connexion : différencier « Se connecter » (prioritaire) et « S'inscrire » (secondaire, avec rappel du flux invitation).

### Fichiers concernés
- `src/pages/Auth.jsx`

### Tâches

| # | Tâche | Description |
|---|-------|-------------|
| 4.1 | Onglet Connexion par défaut | S'assurer que `activeTab` initial est `'login'`. Déjà le cas via `Tabs defaultValue="login"`. |
| 4.2 | Message sous « S'inscrire » | Sous le lien « Pas encore inscrit ? S'inscrire » : « Pour vous inscrire, commencez par la page d'accueil et choisissez votre rôle, ou utilisez le lien d'invitation reçu par email. » |
| 4.3 | Lien vers HomePage depuis l'onglet Inscription | Dans l'onglet Inscription, remplacer ou compléter « Formulaire complet » par un lien vers `/` (page d'accueil) pour le flux standard. |
| 4.4 | Cohérence des libellés | « Se connecter » vs « Connexion », « S'inscrire » vs « Inscription » : harmoniser selon la maquette. |

### Critères d'acceptation
- [ ] Un utilisateur qui n'a pas de compte comprend qu'il doit aller sur la page d'accueil ou utiliser un lien d'invitation
- [ ] Les liens « Mot de passe oublié » et « Se connecter » restent visibles et fonctionnels

---

## Phase 5 – Rendre obligatoire l’invitation pour Mentor et Superviseur

### Objectif
Pour Mentor et Superviseur, exiger un lien d'invitation. Le flux libre (choix famille + email sur HomePage) reste possible pour les Disciples uniquement, si on conserve cette souplesse.

### Fichiers concernés
- `src/pages/HomePage.jsx`

### Tâches

| # | Tâche | Description |
|---|-------|-------------|
| 5.1 | Clic sur « Je suis Mentor » sans code | Afficher un message : « Pour devenir Mentor, vous devez être invité par un superviseur. Utilisez le lien reçu par email, ou saisissez votre code d'invitation ci-dessous. » Avec champ « Code d'invitation » et bouton « Valider ». |
| 5.2 | Clic sur « Je suis Superviseur » sans code | Même logique : « Pour devenir Superviseur, vous devez être invité par un pasteur. Utilisez le lien reçu par email, ou saisissez votre code d'invitation. » |
| 5.3 | Conserver le flux libre pour Disciple | Le bouton « Je suis Disciple » garde le comportement actuel (formulaire simplifié avec choix famille). |
| 5.4 | Pasteur inchangé | Le bouton « Pasteur » redirige toujours vers `/auth`. |

### Option : désactiver complètement l’inscription Mentor/Superviseur sans invitation
- Retirer le formulaire simplifié pour Mentor/Superviseur sur HomePage.
- Afficher uniquement le message d’invitation + champ code.

### Critères d'acceptation
- [ ] Clic sur Mentor ou Superviseur sans lien/code → message explicite, pas de formulaire libre
- [ ] Avec code valide → redirection vers `/inscription/:token`
- [ ] Disciple : flux actuel préservé

---

## Phase 6 – Améliorations UX finales

### Objectif
Peaufinement : indicateurs d'étape, messages, cohérence visuelle.

### Tâches (non exhaustives)

| # | Tâche | Priorité | Description |
|---|-------|----------|-------------|
| 6.1 | Indicateur d'étape sur les formulaires | Moyenne | « Étape 1/3 », « Étape 2/3 » sur HomePage, InscriptionParToken, SignupDisciple |
| 6.2 | Marquer `invitations_famille.used_at` | Haute | Quand le compte est créé dans SignupDisciple, mettre à jour `used_at` (via trigger ou appel RPC) pour éviter les réutilisations. Voir [111_invitations_famille](./sql/migrations/111_invitations_famille.sql). |
| 6.3 | Lien `profils.invitation_id` | Basse | Si la table `profils` a une colonne `invitation_id`, la remplir à la création du profil pour traçabilité |
| 6.4 | Page « Vérifiez votre email » (optionnel) | Basse | Après envoi d'email depuis InscriptionParToken, proposer une page intermédiaire « Vérifiez votre boîte mail » au lieu de rediriger directement (si on choisit de ne pas rediriger immédiatement) |
| 6.5 | Messages d'erreur en français | Moyenne | Vérifier que tous les messages Supabase/Edge Function sont traduits ou interceptés pour afficher des messages clairs |

---

## Ordre d'exécution recommandé

```
Phase 0 (prérequis)
    ↓
Phase 1 (InscriptionParToken fonctionnel)
    ↓
Phase 2 (interfaces création invitations)
    ↓
Phase 3 (code invitation HomePage) ← peut être fait en parallèle avec Phase 4
Phase 4 (Auth.jsx)
    ↓
Phase 5 (invitation obligatoire Mentor/Superviseur)
    ↓
Phase 6 (améliorations)
```

---

## Checklist avant mise en production

- [ ] Toutes les migrations ([111_invitations_famille](./sql/migrations/111_invitations_famille.sql), [120_inscription_step1_email](./sql/migrations/120_inscription_step1_email.sql)) sont appliquées
- [ ] Edge Function `send-inscription-email` déployée et testée
- [ ] Flux complet testé : invitation Mentor → InscriptionParToken → SignupDisciple → Dashboard
- [ ] Flux complet testé : invitation Superviseur
- [ ] Flux complet testé : invitation Disciple
- [ ] Flux HomePage (Disciple sans invitation) toujours fonctionnel
- [ ] Auth.jsx : connexion et mot de passe oublié fonctionnels
- [ ] Pas de régression sur le mode « Add member » (connecté)

---

## Fichiers principaux à modifier (résumé)

| Fichier | Phases |
|---------|--------|
| `src/pages/InscriptionParToken.jsx` | 1 |
| `src/pages/dashboards/MentorDashboard.jsx` | 2 |
| `src/pages/dashboards/SuperviseurDashboard.jsx` | 2 |
| `src/pages/dashboards/superviseur/StatsRapidesEtActions.jsx` | 2 |
| `src/pages/dashboards/PasteurDashboard.jsx` | 2 |
| `src/pages/HomePage.jsx` | 3, 5 |
| `src/pages/Auth.jsx` | 4 |
| `sql/migrations/121_valider_code_invitation.sql` (nouvelle migration) | 3 |
| `supabase/functions/send-invitation-email/` (optionnel) | 2 |

---

**Auteur :** Assistant IA  
**Référence :** RAPPORT_AUTHENTIFICATION_INSCRIPTION.md
