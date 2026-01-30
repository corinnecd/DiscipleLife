# Statut de la migration Cercles → État Profils

**Date :** 30 janvier 2026  
**Contexte :** Une migration « cercles vers état profil » était en cours ; la conversation précédente s’est arrêtée. Ce document reconstitue l’état à partir du code et des migrations (aucune conservation des échanges précédents).

**Mise à jour :** Toutes les logiques de **récupération** des données ont été basculées vers **profils**. **Profils est désormais la seule source de lecture** ; plus aucune lecture depuis `cercle_personnes` dans le front ni dans les scripts concernés.

---

## 1. Ce qui est déjà en place

### Base de données
- **Migration 075** : trigger `sync_cercle_personnes_vers_profils` — tout INSERT/UPDATE dans `cercle_personnes` crée ou met à jour une ligne dans `profils` et remplit `cercle_personnes.profil_id`.
- **Migration 077** : trigger `sync_profils_vers_cercle_personnes` — tout disciple avec `mentor_id` dans `profils` crée/met à jour une entrée dans `cercle_personnes`.
- **Migration 097** : colonnes `circle_type` et `visible_to_others` ajoutées sur `profils` pour aligner avec les cercles.
- **Migration 096** : RPC effectifs/KPI 100 % basées sur `profils` (plus de source `cercle_personnes`).

### Page Cercles (`src/pages/Circles.jsx`)
- **Lecture** : liste des personnes et comptages par catégorie → **déjà sur `profils`** (`mentor_id`, `circle_type`).
- **Déplacement** d’une personne d’une catégorie à l’autre → **déjà sur `profils`** (`update circle_type`).
- **Visibilité** (`visible_to_others`) → **déjà sur `profils`**.
- **Suppression** d’une personne du cercle → **déjà sur `profils`** (`delete` sur profils).

---

## 2. Modifications effectuées (source unique = profils)

### `src/pages/Circles.jsx`
- **Lecture** : déjà sur `profils` (fetchPeople, comptages, move, visibility, delete).
- **Ajout** : écrit désormais **uniquement dans `profils`** (id généré, first_name, last_name, email, role: 'disciple', mentor_id, famille_id, circle_type, visible_to_others, phone, ville_residence). Plus aucune lecture ni écriture dans `cercle_personnes`.

### `src/pages/CreateDiscipleAccounts.jsx`
- Liste des disciples sans compte : **source = `profils`** (mentor_id = user.id, role = 'disciple'). Plus de lecture dans `cercle_personnes`.

### `src/pages/Transformation.jsx`
- Récupération des progressions (user_parcours_progression) : **uniquement par `user_id`** (id du profil disciple). Plus de critère `cercle_personnes_id`.

### `src/pages/VoiceMessageCenter.jsx`
- Destinataires déjà chargés depuis `profils`. Commentaires faisant référence à `cercle_personnes` supprimés.

### `scripts/create_comptes_disciples_les_determines.js`
- Liste des disciples sans compte : **source = `profils`** (role = 'disciple', mentor_id dans la famille Les Déterminés). Filtre par id non présent dans auth. Après création du compte Auth : mise à jour du nouveau profil (mentor_id, famille_id), suppression de l’ancien profil (id aléatoire).

---

## 3. Ordre recommandé pour finir la migration

1. **Clarifier en base** : les profils créés depuis les cercles ont-ils un `id` = `auth.users.id` (email existant) ou `gen_random_uuid()` (version 075 sans contrainte auth) ?
2. **Modifier `Circles.jsx`** :  
   - Ajout → `insert` dans `profils` (avec `mentor_id`, `circle_type`, `visible_to_others`).  
   - Adapter la logique « parent disciple » pour ne plus dépendre de `cercle_personnes` (par ex. utiliser uniquement `mentor_id` ou un champ `parent_profil_id` si vous l’ajoutez sur `profils`).
3. **Tester** : ajout, déplacement, visibilité, suppression dans la page Cercles.
4. **(Optionnel)** Supprimer ou réduire les écritures directes dans `cercle_personnes` ailleurs dans l’app, et garder `cercle_personnes` alimentée uniquement par le trigger 077 (profils → cercle).

---

## 4. Références utiles

- `MODELE_CIBLE_DONNEES.md` — règle cercle ↔ profils.
- `RAPPORT_CRUD_PROFILS_FORMULAIRE_UNIQUE_SOURCE_VERITE.md` — objectif « profils = seule source de vérité ».
- `RAPPORT_TOUT_A_IMPLEMENTER.md` — § 2.3 CRUD profils et formulaire unique.
- Migrations : `075_*`, `077_sync_profils_vers_cercle_personnes.sql`, `097_profils_circle_type_visible_to_others.sql`.
