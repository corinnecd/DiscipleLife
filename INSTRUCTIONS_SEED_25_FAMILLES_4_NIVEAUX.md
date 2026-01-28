# Seed 25 familles – 4 niveaux intergénérationnels (migration 076)

Ce document décrit la **migration 076** qui crée des disciples et mentors pour **25 familles** (toutes sauf « Les Déterminés »), afin de tester les **4 niveaux** : Pasteur → Superviseur → Mentor (pilier) → Disciple.

---

## Rôles et niveaux

| Niveau | Rôle | Où | Rôle technique |
|--------|------|-----|----------------|
| **1** | **Pasteur** | `profils` (role = pasteur) | Responsable global, au-dessus des superviseurs. |
| **2** | **Superviseur** | `profils` (role = superviseur) + `familles_disciples.superviseur_id` | Responsable d’une famille (objectif 70 disciples). |
| **3** | **Mentor / Pilier** | `cercle_personnes` (disciple direct du superviseur **ayant lui-même des disciples**) | Disciple dans la famille qui a des disciples sous lui. |
| **4** | **Disciple** | `cercle_personnes` (avec ou sans `parent_disciple_id`) | N’a pas encore de disciples. |

- **Pasteur** et **Superviseur** : dans `profils` avec les rôles `pasteur` / `superviseur`.
- **Mentors (piliers)** et **Disciples** : dans `cercle_personnes` ; le **mentor** est une ligne dont d’autres lignes ont `parent_disciple_id` = son `id`.

---

## Structure créée par la migration 076

Pour **chaque famille** (25 familles, **hors « Les Déterminés »**) :

1. **10 disciples directs du superviseur** (niveau 3 ou 4)  
   - `user_id` = `superviseur_id` de la famille  
   - `parent_disciple_id` = NULL  

2. Parmi ces 10, **4 sont des mentors (niveau 3)**  
   - Ce sont les 4 premières lignes créées ; elles n’ont pas de champ « mentor » en base, mais elles auront des disciples (voir ci-dessous).  

3. **6 disciples « simples » (niveau 4)**  
   - Les 6 autres disciples directs n’ont pas de disciples sous eux.  

4. **16 disciples des 4 mentors (niveau 4)**  
   - 4 disciples par mentor  
   - `parent_disciple_id` = id du mentor (l’un des 4 premiers disciples directs)  
   - `user_id` = toujours le **superviseur** (propriétaire du cercle)

**Par famille :** 10 + 16 = **26 lignes** dans `cercle_personnes`.  
**Total :** 25 × 26 = **650 lignes** (hors Les Déterminés).

---

## Exécution

1. **Prérequis**  
   - Les **26 familles** existent dans `familles_disciples` avec un `superviseur_id` renseigné.  
   - La migration **075** (sync cercle → profils) est en place si vous voulez lier des profils aux nouveaux disciples.

2. **Dans Supabase → SQL Editor**  
   - Ouvrir **`sql/migrations/076_seed_25_familles_4_niveaux.sql`**.  
   - Copier tout le contenu, coller dans l’éditeur, puis **Run**.

3. **Vérification**  
   - Nombre de lignes par famille (ex. FAM002) :
     ```sql
     SELECT COUNT(*) FROM cercle_personnes cp
     JOIN profils p ON p.id = cp.user_id
     JOIN familles_disciples f ON f.superviseur_id = p.id
     WHERE f.identifiant_famille = 'FAM002';
     ```
     Attendu : 26.  
   - Nombre total de nouvelles entrées (hors Les Déterminés) :
     ```sql
     SELECT COUNT(*) FROM cercle_personnes cp
     JOIN profils p ON p.id = cp.user_id
     JOIN familles_disciples f ON f.superviseur_id = p.id
     WHERE LOWER(f.nom) NOT LIKE '%déterminé%' AND LOWER(f.nom) NOT LIKE '%determine%';
     ```
     Après seed : au moins 25 × 26 = 650 (en plus des données déjà présentes pour ces familles).

---

## Fichier de migration

- **`sql/migrations/076_seed_25_familles_4_niveaux.sql`**

Les noms des disciples sont générés à partir de listes (prénoms / noms) + identifiant de la famille pour éviter les doublons.
