# Tests Manuels - Disciple Life

Ce document décrit les tests manuels à effectuer pour valider les fonctionnalités principales de l'application.

## 📋 Table des matières

1. [Tests RLS INSERT (Objectif 3)](#1-tests-rls-insert-objectif-3)
2. [Tests Formulaire d'ajout de membre](#2-tests-formulaire-dajout-de-membre)
3. [Tests Redirections après connexion](#3-tests-redirections-après-connexion)
4. [Tests Alertes Dashboard Pasteur](#4-tests-alertes-dashboard-pasteur)

---

## 1. Tests RLS INSERT (Objectif 3)

### Objectif
Vérifier que les politiques RLS empêchent les utilisateurs de créer des données pour d'autres utilisateurs.

### Prérequis
- Accès au SQL Editor de Supabase
- Au moins 2 comptes utilisateurs créés dans l'application

### Procédure
1. Ouvrir le SQL Editor de Supabase
2. Exécuter le script `sql/tests/test_rls_insert_objectif3.sql`
3. Vérifier que tous les tests affichent "OK"

### Résultats attendus
- ✅ Les insertions avec `user_id = auth.uid()` réussissent
- ✅ Les insertions avec `user_id` différent de `auth.uid()` échouent avec une erreur RLS
- ✅ Messages "OK : Insertion non autorisée bloquée par RLS" pour tous les tests invalides

### Tables testées
- `journal_transformation`
- `user_parcours_progression`
- `evaluations_croissance`
- `suivi_post_crise`
- `historique_guerison`

---

## 2. Tests Formulaire d'ajout de membre

### Objectif
Vérifier que le formulaire d'ajout de membre fonctionne correctement en mode `?mode=add`.

### Scénario 1 : Accès non authentifié
**Étapes :**
1. Se déconnecter de l'application
2. Accéder à `/signup?mode=add`

**Résultat attendu :**
- ✅ Redirection automatique vers `/auth?redirect=/signup?mode=add`
- ✅ Message invitant à se connecter

### Scénario 2 : Ajout par un Mentor
**Étapes :**
1. Se connecter avec un compte Mentor
2. Accéder au dashboard Mentor
3. Cliquer sur le bouton "Ajouter un disciple"
4. Vérifier le pré-remplissage du formulaire

**Résultat attendu :**
- ✅ Redirection vers `/signup?mode=add`
- ✅ Champ "Famille" pré-rempli avec la famille du mentor
- ✅ Champ "Suivi par" pré-rempli avec l'ID du mentor
- ✅ Titre "Ajouter un membre" affiché

### Scénario 3 : Création d'un nouveau membre
**Étapes :**
1. Remplir tous les champs obligatoires :
   - Prénom : "Jean"
   - Nom : "Dupont"
   - Email : "jean.dupont@test.com"
   - Mot de passe : "Test123!"
   - Confirmer mot de passe : "Test123!"
   - Famille : Sélectionner une famille
   - Rôle : "Disciple"
2. Cliquer sur "Ajouter le membre"

**Résultat attendu :**
- ✅ Toast de succès "Membre ajouté"
- ✅ Redirection vers la page précédente (dashboard)
- ✅ Nouveau profil créé dans la base de données
- ✅ Le nouveau membre peut se connecter avec les identifiants créés

### Scénario 4 : Validation des erreurs
**Étapes :**
1. Tenter de soumettre le formulaire avec des champs vides
2. Tenter de soumettre avec un email invalide
3. Tenter de soumettre avec des mots de passe différents

**Résultat attendu :**
- ✅ Messages d'erreur clairs pour chaque champ invalide
- ✅ Bordures rouges sur les champs en erreur
- ✅ Formulaire non soumis tant que les erreurs persistent

---

## 3. Tests Redirections après connexion

### Objectif
Vérifier que les utilisateurs sont redirigés vers leur dashboard approprié après connexion.

### Scénario 1 : Connexion Disciple
**Étapes :**
1. Se connecter avec un compte Disciple
2. Observer la redirection

**Résultat attendu :**
- ✅ Redirection vers `/dashboard/disciple`
- ✅ Dashboard Disciple affiché avec les informations personnelles

### Scénario 2 : Connexion Mentor
**Étapes :**
1. Se connecter avec un compte Mentor
2. Observer la redirection

**Résultat attendu :**
- ✅ Redirection vers `/dashboard/mentor`
- ✅ Dashboard Mentor affiché avec la liste des disciples

### Scénario 3 : Connexion Superviseur
**Étapes :**
1. Se connecter avec un compte Superviseur
2. Observer la redirection

**Résultat attendu :**
- ✅ Redirection vers `/dashboard/superviseur`
- ✅ Dashboard Superviseur affiché avec les statistiques

### Scénario 4 : Connexion Pasteur
**Étapes :**
1. Se connecter avec un compte Pasteur
2. Observer la redirection

**Résultat attendu :**
- ✅ Redirection vers `/dashboard/pasteur`
- ✅ Dashboard Pasteur affiché avec les alertes et statistiques

### Scénario 5 : Redirection avec paramètre redirect
**Étapes :**
1. Accéder à `/auth?redirect=/signup?mode=add` (non authentifié)
2. Se connecter

**Résultat attendu :**
- ✅ Après connexion, redirection vers `/signup?mode=add`
- ✅ Formulaire d'ajout de membre affiché

---

## 4. Tests Alertes Dashboard Pasteur

### Objectif
Vérifier que les alertes "Familles sous objectif" s'affichent correctement sur le dashboard Pasteur.

### Prérequis
- Compte Pasteur créé
- Au moins une famille avec des disciples
- Données de transformation dans `journal_transformation` ou `user_parcours_progression`

### Scénario 1 : Affichage des alertes
**Étapes :**
1. Se connecter avec un compte Pasteur
2. Observer la section "Alertes" sur le dashboard

**Résultat attendu :**
- ✅ Section "Familles sous objectif" visible
- ✅ Liste des familles avec moins de X entrées de journal ou progression
- ✅ Nombre de familles concernées affiché
- ✅ Bouton "Voir détails" pour chaque famille

### Scénario 2 : Lien vers l'arbre généalogique
**Étapes :**
1. Sur le dashboard Pasteur, cliquer sur "Mon arbre"
2. Observer la redirection

**Résultat attendu :**
- ✅ Redirection vers `/genealogical-tree`
- ✅ Arbre généalogique affiché avec 4 niveaux
- ✅ Données du Pasteur et de ses disciples visibles

### Scénario 3 : Statistiques rapides
**Étapes :**
1. Observer la section "Statistiques rapides" sur le dashboard Pasteur
2. Vérifier les chiffres affichés

**Résultat attendu :**
- ✅ Nombre total de disciples affiché
- ✅ Nombre de mentors affiché
- ✅ Nombre de superviseurs affiché
- ✅ Taux de croissance affiché (si applicable)

---

## 📊 Rapport de tests

### Template de rapport

```markdown
## Rapport de tests - [Date]

### Testeur
[Nom du testeur]

### Environnement
- Navigateur : [Chrome/Firefox/Safari]
- Version : [Version du navigateur]
- Système d'exploitation : [Windows/macOS/Linux]

### Résultats

#### 1. Tests RLS INSERT
- [ ] Tous les tests passent
- [ ] Problèmes identifiés : [Description]

#### 2. Tests Formulaire d'ajout de membre
- [ ] Scénario 1 : Accès non authentifié ✅/❌
- [ ] Scénario 2 : Ajout par un Mentor ✅/❌
- [ ] Scénario 3 : Création d'un nouveau membre ✅/❌
- [ ] Scénario 4 : Validation des erreurs ✅/❌
- [ ] Problèmes identifiés : [Description]

#### 3. Tests Redirections après connexion
- [ ] Scénario 1 : Connexion Disciple ✅/❌
- [ ] Scénario 2 : Connexion Mentor ✅/❌
- [ ] Scénario 3 : Connexion Superviseur ✅/❌
- [ ] Scénario 4 : Connexion Pasteur ✅/❌
- [ ] Scénario 5 : Redirection avec paramètre redirect ✅/❌
- [ ] Problèmes identifiés : [Description]

#### 4. Tests Alertes Dashboard Pasteur
- [ ] Scénario 1 : Affichage des alertes ✅/❌
- [ ] Scénario 2 : Lien vers l'arbre généalogique ✅/❌
- [ ] Scénario 3 : Statistiques rapides ✅/❌
- [ ] Problèmes identifiés : [Description]

### Bugs identifiés
1. [Description du bug 1]
2. [Description du bug 2]

### Améliorations suggérées
1. [Suggestion 1]
2. [Suggestion 2]
```

---

## 🔧 Dépannage

### Problème : Les RLS INSERT ne bloquent pas les insertions invalides
**Solution :**
1. Vérifier que les migrations 108 et 109 ont été exécutées
2. Exécuter `SELECT * FROM pg_policies WHERE tablename IN ('journal_transformation', 'suivi_post_crise');`
3. Vérifier que les politiques ont bien `WITH CHECK (user_id = auth.uid())`

### Problème : Le formulaire d'ajout ne pré-remplit pas les champs
**Solution :**
1. Vérifier que l'utilisateur est bien authentifié
2. Vérifier que le profil de l'utilisateur a bien un `famille_id` et un `role`
3. Consulter la console du navigateur pour les erreurs

### Problème : Les redirections ne fonctionnent pas
**Solution :**
1. Vérifier le fichier `src/pages/Auth.jsx`
2. Vérifier que le contexte `AuthContext` retourne bien le `user` et son `role`
3. Vérifier les routes dans `App.jsx`

### Problème : Les alertes ne s'affichent pas sur le dashboard Pasteur
**Solution :**
1. Vérifier que des données existent dans `journal_transformation` et `user_parcours_progression`
2. Vérifier les requêtes dans le hook `usePasteurDashboard` ou équivalent
3. Consulter la console du navigateur pour les erreurs
