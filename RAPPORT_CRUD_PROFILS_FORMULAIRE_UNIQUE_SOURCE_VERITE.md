# Rapport : implémentation du CRUD des profils membres dès l’inscription (formulaire unique, profils = source de vérité)

**Date :** 27 janvier 2026  
**Objectif :** Modifier et simplifier la récupération des profils en faisant de la table **profils** la seule source de vérité, alimentée par un **formulaire unique** (inscription sur la page d’accueil ou ajout de membre). Les **cercles** ne serviraient plus qu’à **incrémenter des comptages par catégorie** (KPI), sans être la source des données des profils.

---

## 1. Compréhension de la demande

- **Récupération des données actuelle :** jugée non performante, non efficace, et incorrecte, ce qui rend l’application instable alors qu’elle repose majoritairement sur des KPI.
- **Changement souhaité :**
  - **Source de vérité unique** pour les données des profils : la table **profils**, alimentée uniquement par un **formulaire unique** (inscription ou ajout de membre, toujours le même flux).
  - **Cercles** : ne plus être la source des données des profils ; uniquement **incrémenter le nombre d’entrants par catégorie** (ex. Non-croyant, Nouveau converti, Disciple affermi, Faiseur de disciples).
- **Livrable demandé :** un **rapport** pour l’implémentation du **CRUD des profils membres dès l’inscription sur la page d’accueil**, sans modification de code à ce stade.

---

## 2. État actuel (analyse du projet)

### 2.1 Où sont créées / mises à jour les données “membres” ?

| Flux | Fichier / lieu | Source des données affichées | Table(s) utilisée(s) |
|------|----------------|------------------------------|------------------------|
| **Inscription page d’accueil** | `HomePage.jsx` → 4 routes : `/signup/pasteur`, `/signup/superviseur`, `/signup/mentor`, `/signup/disciple` | - | Auth + trigger → **profils** (metadata) |
| **Inscription depuis Auth** | `Auth.jsx` (onglet Inscription) | - | `signUp()` avec `first_name`, `last_name`, `role: 'disciple'` → trigger **handle_new_user** → **profils** |
| **Inscription Disciple** | `SignupDisciple.jsx` | - | `signUp()` + metadata `famille_id` puis **update profils** (famille_id, date_entree_famille) après 1 s |
| **Inscription Mentor / Pasteur / Superviseur** | `SignupMentor.jsx`, `SignupPasteur.jsx`, `SignupSuperviseur.jsx` | - | `signUp()` + metadata → trigger → **profils** |
| **Ajout d’une personne dans “Cercles”** | `Circles.jsx` (modal par catégorie) | **cercle_personnes** | **INSERT cercle_personnes** (user_id, name, first_name, last_name, email, circle_type, parent_disciple_id, …) |
| **Liste “Mes disciples”** | `Disciples.jsx` | **cercle_personnes** | `SELECT * FROM cercle_personnes WHERE user_id = user.id` |
| **Dashboard Mentor** | `MentorRichDashboard.jsx`, `MentorDashboard.jsx` | **cercle_personnes** | Idem |
| **KPIs / effectifs familles** | RPC `get_nombre_profils_par_familles`, `get_nombre_disciples_par_familles`, etc. | **profils** et/ou **cercle_personnes** (hybride 091) | Plusieurs RPC basées sur profils OU cercle → incohérence |

Résumé : aujourd’hui, **deux sources** coexistent — **profils** (inscription, trigger auth) et **cercle_personnes** (Cercles, Disciples, dashboards). Les KPI s’appuient sur des RPC qui mélangent les deux (ex. max(profils, cercle)), ce qui complique la logique et dégrade la stabilité.

### 2.2 Synchronisation actuelle cercle ↔ profils

- **Migration 075** : trigger sur **cercle_personnes** (INSERT/UPDATE) → crée ou met à jour un **profil** si l’email correspond à un utilisateur dans `auth.users` ; remplit `profil_id` sur la ligne cercle.
- **Migration 077** : trigger sur **profils** (INSERT/UPDATE) → crée ou met à jour une entrée **cercle_personnes** pour le mentor (`user_id = mentor_id`).

Conséquence : les données “membre” peuvent venir soit de l’inscription (profils), soit de l’ajout dans Cercles (cercle_personnes puis profils via trigger). Pas de formulaire unique ni de source unique.

### 2.3 Problèmes identifiés

1. **Multiplicité des formulaires** : Pasteur, Superviseur, Mentor, Disciple, + onglet Inscription dans Auth → champs et logiques différents, pas de schéma commun.
2. **Double source de vérité** : listes et KPI s’appuient sur **cercle_personnes** (Disciples, Mentor dashboard) ou sur **profils** (familles, RPC 084/091), avec contournements (hybride max(profils, cercle)) et corrections manuelles (migrations 088–091).
3. **Récupération peu fiable** : dépendance aux triggers, délais (ex. 1 s après signUp pour mettre à jour profils), et RPC multiples qui se chevauchent.
4. **Instabilité des KPI** : totaux qui varient selon la source (profils vs cercle), d’où besoin de “fix” (091) et sentiment que les données ne se récupèrent pas correctement.

---

## 3. Cible fonctionnelle (après implémentation)

### 3.1 Source de vérité unique : **profils**

- Toute personne “membre” (disciple, mentor, superviseur, pasteur) est **une et une seule ligne** dans **profils**, avec au minimum : identité (nom, prénom, email), rôle, famille, mentor si disciple, et champs métier nécessaires aux KPI.
- **Auth** : un compte `auth.users` par profil (lien `profils.id = auth.users.id` ou équivalent selon votre schéma). Création du profil au moment de l’inscription ou de l’ajout via le formulaire unique.

### 3.2 Formulaire unique (inscription et ajout de membre)

- **Un seul formulaire** utilisé dans deux contextes :
  1. **Inscription** (page d’accueil / première connexion) : l’utilisateur remplit le formulaire → création de `auth.users` + **profils** (et éventuellement envoi d’invitation par email si “ajout par un tiers”).
  2. **Ajout de membre** (par un mentor / superviseur / admin) : le responsable remplit le **même** formulaire → création du **profil** (et selon le cas création de compte auth ou “profil en attente” avec lien d’invitation).
- Champs proposés pour ce formulaire (à valider métier) :
  - **Identité** : prénom, nom, email (obligatoire pour compte), téléphone (optionnel).
  - **Contexte** : rôle (disciple, mentor, superviseur, pasteur), famille (si disciple), mentor (si disciple), date d’entrée en famille (optionnel).
  - **Catégorie “cercle”** (pour les KPI) : Non-croyant / Nouveau converti / Disciple affermi / Faiseur de disciples (un seul champ, stocké dans **profils** ou dans une table dérivée, pas comme source de la fiche).
  - **Optionnel** : église, pays, baptisé oui/non, date baptême, etc.
- Pas de duplication : un seul flux de création/édition qui écrit toujours dans **profils** (et auth si compte créé).

### 3.3 Rôle des cercles (cercle_personnes)

- **Cercles ne sont plus la source** des données d’identité ni de la liste “qui sont les membres”.
- **Cercles servent uniquement à :**
  - **Comptages par catégorie** : ex. nombre de “Non-croyants”, “Nouveaux convertis”, etc. (pour tableaux de bord / KPI).
  - Optionnel : garder une **référence** `cercle_personnes.profil_id` vers **profils** pour lier un “entrant” à un profil existant et incrémenter les comptes par catégorie sans dupliquer les données.
- En pratique : soit on **déprécie** les insertions directes dans `cercle_personnes` pour la fiche membre, soit on fait en sorte que “ajouter au cercle” = **créer/mettre à jour le profil** via le formulaire unique, puis **incrémenter** (ou marquer) la catégorie dans une structure légère (cercle ou table de stats).

### 3.4 Récupération des données et KPI

- **Listes de membres** (disciples d’un mentor, membres d’une famille, etc.) : **uniquement** à partir de **profils** (filtres par `mentor_id`, `famille_id`, `role`, etc.).
- **KPI** (effectifs, progression, objectifs) : **uniquement** à partir de **profils** (et éventuellement d’une table d’agrégats par catégorie “cercle” si vous gardez ces libellés).
- **Plus de RPC hybrides** du type max(profils, cercle) pour déterminer le nombre de membres ; les comptes sont déterministes à partir de **profils**.

---

## 4. Plan d’implémentation proposé (CRUD profils + formulaire unique)

### 4.1 Phase 1 – Modèle de données et politique d’écriture

1. **Schéma `profils`**
   - Vérifier que **profils** contient tous les champs nécessaires pour le formulaire unique et les KPI : `first_name`, `last_name`, `email`, `role`, `famille_id`, `mentor_id`, et au moins un champ “catégorie cercle” (ex. `circle_category` ou `spiritual_level`) avec des valeurs du type : Non-croyant, Nouveau converti, Disciple affermi, Faiseur de disciples.
   - Si besoin : ajouter une migration pour les colonnes manquantes (sans casser l’existant).

2. **Politique “une seule écriture pour les membres”**
   - Toute création / mise à jour de “membre” passe par **profils** (via le formulaire unique côté app).
   - Décider du sort des triggers **cercle_personnes → profils** et **profils → cercle_personnes** :
     - Option A : **Désactiver** la création de profils depuis cercle_personnes ; garder éventuellement un trigger “profils → cercle” en **lecture seule** (mise à jour de comptages ou de libellés, sans créer de profils).
     - Option B : Garder **cercle_personnes** uniquement pour les **comptages par catégorie** : une ligne par (user_id mentor, profil_id, category) pour les stats ; plus d’insertion de “fiche complète” depuis Cercles.

3. **Auth et trigger `handle_new_user`**
   - S’assurer que le trigger sur `auth.users` (création de profil) utilise **uniquement** les métadonnées envoyées par le **formulaire unique** (first_name, last_name, role, famille_id, mentor_id, circle_category, etc.) et écrit une seule fois dans **profils**, de façon déterministe.

### 4.2 Phase 2 – Formulaire unique (page d’accueil + ajout de membre)

1. **Composant “Formulaire Membre” réutilisable**
   - Créer un composant (ex. `MemberForm.jsx`) avec tous les champs du formulaire unique (identité, rôle, famille, mentor, catégorie cercle, options).
   - Validation côté client (email, rôle, famille si disciple, etc.).
   - Deux modes : **“Inscription”** (création de compte + profil) et **“Ajout par un responsable”** (création de profil + option compte ou invitation).

2. **Inscription depuis la page d’accueil**
   - Sur la page d’accueil : un **seul** bouton du type “Créer un compte / Rejoindre” qui mène à une **seule** page d’inscription (ex. `/signup` ou `/register`).
   - Cette page utilise le **formulaire unique** : choix du **rôle** (Pasteur / Superviseur / Mentor / Disciple) dans le formulaire, puis champs conditionnels (famille si disciple, titre si pasteur, etc.).
   - À la soumission : appel à `signUp(email, password, metadata)` avec **toutes** les données du formulaire dans `metadata` ; le trigger `handle_new_user` crée la ligne **profils** complète (pas de second UPDATE après délai).
   - Redirection vers connexion ou espace selon le rôle.

3. **Ajout de membre (mentor / superviseur / admin)**
   - Même composant **MemberForm**, utilisé dans la section “Ajouter un disciple” (ou “Ajouter un membre”) des écrans Mentor / Superviseur / Famille.
   - Si le membre doit avoir un **compte** : appel à une fonction (ex. `inviteUser` ou création auth + envoi lien) + création **profils** (via API ou RPC) avec les mêmes champs.
   - Si le membre est “sans compte” (fiche seulement) : **INSERT profils** uniquement (avec email éventuel pour future invitation), avec `mentor_id` / `famille_id` renseignés.
   - Aucune écriture directe dans **cercle_personnes** pour la fiche ; uniquement **profils**.

4. **Dépréciation des anciennes pages d’inscription**
   - Remplacer les 4 routes `/signup/pasteur`, `/signup/superviseur`, `/signup/mentor`, `/signup/disciple` par une **seule** route (ex. `/signup`) avec le formulaire unique et le rôle choisi dans le formulaire.
   - L’onglet “Inscription” dans `Auth.jsx` peut rediriger vers cette même page ou réutiliser le même formulaire.

### 4.3 Phase 3 – Lecture des données : tout depuis profils

1. **Listes “Mes disciples” / “Membres de la famille”**
   - Remplacer les appels à `cercle_personnes` par des requêtes sur **profils** :
     - Disciples d’un mentor : `profils WHERE mentor_id = <user.id> AND role = 'disciple'` (et éventuellement filtre par `circle_category`).
     - Membres d’une famille : `profils WHERE famille_id = <famille.id>`.
   - Adapter **Disciples.jsx**, **MentorRichDashboard.jsx**, **MentorDashboard.jsx**, et tout écran qui affiche une liste de membres.

2. **RPC et KPI**
   - Remplacer toutes les RPC qui s’appuient sur **cercle_personnes** pour les effectifs par des RPC basées **uniquement sur profils** (COUNT par famille, par mentor, par rôle, par catégorie).
   - Supprimer ou simplifier la logique “hybride” (ex. 091) : une seule source, **profils**.
   - Conserver **cercle_personnes** (ou une table dédiée) uniquement pour des **agrégats par catégorie** (ex. nombre de Non-croyants, Nouveaux convertis, etc.) si besoin, en les alimentant à partir de **profils** (trigger ou job), pas l’inverse.

3. **Cache et rafraîchissement**
   - Utiliser des clés de cache cohérentes avec “profils = source de vérité” (ex. invalidation après création/mise à jour de profil).
   - Éviter de mélanger des données issues de cercle et de profils dans le même cache.

### 4.4 Phase 4 – Cercles : uniquement comptages par catégorie

1. **Règles métier**
   - Lors de la création/mise à jour d’un **profil** (formulaire unique), enregistrer la “catégorie” (Non-croyant, Nouveau converti, etc.) dans **profils** (ex. `circle_category`).
   - Optionnel : une table ou vue d’agrégation (par mentor, par famille, par catégorie) pour les KPI “nombre par catégorie”, alimentée à partir de **profils** (trigger ou cron).
   - L’écran “Cercles” peut rester pour **visualiser** ces comptages et, si besoin, pour **filtrer** les profils par catégorie, sans être la source des fiches.

2. **Migration des données existantes**
   - Pour les lignes **cercle_personnes** qui n’ont pas encore de **profil** correspondant : soit créer les profils à partir des données cercle (script unique, une fois), soit les traiter comme “historique” et ne plus les utiliser pour les listes/KPI actuels.
   - Aligner **profils** avec les données utiles de **cercle_personnes** (profil_id, catégorie) puis considérer cercle comme dérivé.

### 4.5 Phase 5 – CRUD complet et cohérence

1. **Create** : formulaire unique (inscription ou ajout) → **profils** (et auth si compte).
2. **Read** : toutes les listes et KPI → **profils** (et agrégats dérivés si besoin).
3. **Update** : page “Profil” ou “Fiche membre” → **UPDATE profils** uniquement ; pas de mise à jour “fiche” dans cercle_personnes.
4. **Delete** : désactivation ou suppression de la ligne **profils** (et politique sur auth.users) ; pas de suppression prioritaire dans cercle_personnes.

---

## 5. Résumé des bénéfices attendus

- **Une seule source de vérité** : **profils** pour l’identité et les données membres → récupération des données plus fiable et prévisible.
- **Un seul formulaire** pour l’inscription et l’ajout de membre → moins de duplication, maintenance et évolutions plus simples.
- **KPI stables** : tous les comptages basés sur **profils** → plus de divergence entre “cercle” et “profils”, plus besoin de correctifs hybrides.
- **Cercles** limités à un rôle de **comptage par catégorie** → logique métier plus claire et application plus stable.

---

## 6. Prochaines étapes recommandées (sans modification à ce stade)

1. **Valider** ce rapport avec la maîtrise d’ouvrage (champs du formulaire unique, règles pour “sans compte” vs “avec compte”, sort des anciennes routes d’inscription).
2. **Définir** précisément le schéma **profils** cible (colonnes, contraintes) et le comportement du trigger `handle_new_user`.
3. **Prioriser** les phases (ex. Phase 2 + 3 en premier pour formulaire unique + lecture depuis profils, puis Phase 4 pour cercles).
4. **Planifier** les migrations SQL (profils, triggers, RPC) et les modifications des pages (HomePage, Auth, Signup*, Circles, Disciples, dashboards) en lots livrables.

---

*Rapport rédigé conformément à la demande : aucune modification de code n’a été effectuée ; il sert de base pour l’implémentation du CRUD des profils membres dès l’inscription sur la page d’accueil, avec formulaire unique et profils comme source de vérité.*
