# Obtenir des nombres différents par famille (plus de 53 partout)

Pour que la **Liste des Familles** affiche des totaux **différents** par famille (environ **40 à 65** membres, **8 à 15** mentors, **5 générations**), il faut exécuter les migrations dans Supabase dans l’ordre suivant.

## 1. Créer la RPC qui affiche le vrai total (si pas déjà fait)

Dans **Supabase → SQL Editor**, exécuter **tout** le contenu du fichier :

- **`sql/migrations/084_rpc_nombre_profils_par_familles.sql`**

Cela crée la fonction `get_nombre_profils_par_familles` qui renvoie le nombre réel de membres par famille (sans être limité par la RLS).

## 2. Regénérer les données avec des nombres variés

Dans **Supabase → SQL Editor**, exécuter **tout** le fichier :

- **`sql/migrations/083_seed_familles_arbre_5_gen_nombres_varies.sql`**

Ce script :

- **Supprime** tous les profils de test dont l’email contient `@test.icc.ga` (et les lignes liées dans `auth.users`, `auth.identities`, `cercle_personnes`, etc.).
- **Recrée** pour chaque famille :
  - un nombre **aléatoire** de membres entre **40 et 65** ;
  - **8 à 15** mentors (disciples qui ont au moins 1 disciple) ;
  - une **chaîne de 5 générations** (Superviseur → G1 → G2 → G3 → G4 → G5).

Après exécution, chaque famille aura un total différent (ex. 42, 58, 51, 63…).

## 3. (Optionnel) Synchroniser la colonne nombre_disciples_actuels

Si vous voulez que la colonne `familles_disciples.nombre_disciples_actuels` reflète aussi le bon décompte :

- Exécuter **`sql/migrations/085_sync_nombre_disciples_actuels.sql`**

## 4. Rafraîchir l’application

Recharger la page **Liste des Familles** dans l’app. Les cartes devraient afficher des nombres **différents** par famille (ex. 42/70, 58/70, 51/70…) au lieu de 53/70 partout.

---

**Important :** Le script 083 ne supprime que les comptes dont l’email contient `@test.icc.ga`. Si vos 53 membres actuels ont des emails « réels » (pas @test.icc.ga), ce script n’effacera pas ces profils et en ajoutera d’autres ; dans ce cas, ne lancez 083 que si vous acceptez d’avoir à la fois les anciens membres et les nouveaux membres de test.
