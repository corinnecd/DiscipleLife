# Migration 104 : Seed arbre – répartition disciples

## Objectif

Créer des **profils disciples** (table `profils` uniquement, pas de comptes auth) pour alimenter l’arbre généalogique, en appliquant la répartition suivante sur les profils « mentors » (ceux qui ont une famille et ne sont pas superviseur d’une famille) :

| Part | Nombre de disciples par mentor |
|------|--------------------------------|
| 25 % | 0 disciple                     |
| 10 % | 1 disciple                     |
| 20 % | 2 à 5 disciples                |
| 40 % | 6 à 8 disciples                |
| 5 %  | 9 à 12 disciples               |

## Fichier

- `sql/migrations/104_seed_arbre_repartition_disciples.sql`

## Comportement

1. Compte les profils avec `famille_id` non null et qui ne sont pas superviseur d’une famille (ceux-là sont considérés comme « mentors » pour le seed).
2. Leur attribue un nombre de disciples selon la répartition ci-dessus (ordre par `id`).
3. Pour chaque mentor avec `nb > 0`, insère `nb` lignes dans `profils` :
   - `role = 'disciple'`
   - `mentor_id = id du mentor`
   - `famille_id = famille_id du mentor`
   - `first_name` / `last_name` tirés de listes de prénoms/noms français (déterministe selon mentor + index).
   - `email` unique du type `disciple.arbre.<uuid_mentor>.<i>@seed.disciple.local`.

Aucun compte `auth.users` n’est créé : ce sont des profils « fiche » pour l’arbre.

## Exécution

1. Exécuter **après** les migrations 102 et 103 (colonne `nb_disciples` et RPC arbre 4 niveaux).
2. Dans l’éditeur SQL Supabase : exécuter tout le contenu de `104_seed_arbre_repartition_disciples.sql`.
3. Vérifier :
   - `SELECT COUNT(*) FROM profils WHERE role = 'disciple' AND email LIKE 'disciple.arbre.%';`
   - `SELECT p.id, p.first_name, p.last_name, p.nb_disciples FROM profils p WHERE p.famille_id IS NOT NULL AND p.id NOT IN (SELECT superviseur_id FROM familles_disciples) ORDER BY p.nb_disciples DESC LIMIT 20;`

## Triggers

Les triggers `sync_profils_vers_cercle_trigger` et `sync_cercle_vers_profils_trigger` sont désactivés pendant le seed puis réactivés à la fin pour éviter boucles et lenteur. La colonne `nb_disciples` est recalculée à la fin si elle existe.
