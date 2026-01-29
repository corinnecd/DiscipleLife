# Plan : Seed familles avec nombres variés et arbre 5 générations

## Reformulation de la demande

### Problème actuel
- Le **nombre de membres** affiché par famille est identique (ex. 53) pour toutes les familles.
- Cause : le seed 074 crée **exactement la même structure** pour chaque famille (même nombre de profils, même schéma), et l’affichage peut cumuler profils + cercle (risque de double comptage).

### Objectifs
1. **Nombres différents et aléatoires par famille** : chaque famille doit avoir un total de membres distinct (ex. entre 38 et 65).
2. **Rôles Mentor / Disciple** :
   - **Mentor** = disciple qui suit au moins 1 disciple (affiché comme Mentor / Faiseur de disciples).
   - **Disciple** = n’a pas de disciple (ou feuille dans l’arbre).
3. **Arbre généalogique testable** :
   - **8 à 15 mentors par famille** (personnes avec au moins 1 disciple).
   - **5 générations** : Superviseur → G1 → G2 → G3 → G4 → G5.
4. **Hiérarchie** :
   - **Pasteur** : a quelques disciples directs (dont les superviseurs).
   - **Superviseurs** : disciples directs du pasteur, chefs de famille (déjà en place).
   - **Famille de 70** : les membres de la famille (disciples/mentors) ont un `mentor_id` (parent) et peuvent eux-mêmes avoir des disciples, sur jusqu’à 5 niveaux.

---

## Implémentation prévue

### 1. Requête / RPC (081)
- **Aucun changement** : `get_nombre_disciples_par_familles` retourne déjà un count **par famille** (cercle du superviseur). Le problème vient des **données** (seed), pas de la requête.

### 2. Affichage « Liste des Familles » (FamillesDisciples.jsx)
- **Éviter le double comptage** : le total « Membres » doit refléter le **nombre de personnes dans la famille**, pas profils + cercle (les entrées cercle du superviseur sont des membres déjà dans profils).
- **Correction** : utiliser **uniquement** le count des profils avec `famille_id = famille.id` pour « Membres: X / 70 » (et progression). Ne pas ajouter le count cercle pour ce total.

### 3. Nouvelle migration de seed (remplacement / complément de 074)
- **Nettoyage** : supprimer les profils de test (`email LIKE '%@test.icc.ga'`), présences, prières, et les lignes `cercle_personnes` liées (profil_id ou user_id concernés).
- **Par famille** (boucle sur les familles existantes) :
  - Tirer au hasard :
    - **Nombre total de membres** (hors superviseur) : ex. entre 40 et 65.
    - **Nombre de mentors** : entre 8 et 15.
  - **Construire un arbre à 5 générations** :
    - **G1** : disciples directs du superviseur (partie variable pour atteindre le total et le nombre de mentors voulus).
    - **G2** : disciples de certains G1 (ceux qui seront mentors).
    - **G3, G4, G5** : prolonger les branches pour avoir au moins une lignée à 5 niveaux.
  - **Rôles** : tout nœud avec au moins 1 disciple créé en `role = 'mentor'`, les feuilles en `role = 'disciple'`.
  - Créer les profils avec `famille_id`, `mentor_id` (parent). Le trigger existant (077) n’ajoute dans `cercle_personnes` que les `role = 'disciple'` ; les mentors n’y sont pas ajoutés pour leur parent, ce qui est cohérent.
- **Résultat** : totaux différents par famille, 8–15 mentors par famille, 5 générations, statuts Mentor/Disciple cohérents pour tester l’arbre généalogique.

### 4. Optionnel
- Mise à jour de `familles_disciples.nombre_disciples_actuels` après le seed (pour cohérence avec d’autres écrans) ; sinon l’app continue de calculer le total à partir des profils.

---

## Résumé des fichiers impactés

| Fichier | Action |
|--------|--------|
| `sql/migrations/083_seed_familles_arbre_5_gen_nombres_varies.sql` | Nouveau : seed avec nombres aléatoires, 8–15 mentors, 5 générations |
| `src/pages/FamillesDisciples.jsx` | Utiliser uniquement le count profils pour « Membres » (pas profils + cercle) |
