# Migration 105 — Famille LES DÉTERMINÉS (55 membres : 1 + 12 + 42)

## Objectif

- **Supprimer 34 profils** de la famille LES DÉTERMINÉS pour passer à **55 membres** au total.
- **Réorganiser** les 54 disciples restants selon la structure :
  - **Niveau 1** : Pasteur de tutelle (Peggy) — inchangé.
  - **Niveau 2** : Alain SIL (Superviseur), **12 disciples directs** (mentor_id = NULL).
  - **Niveau 3** : **42 disciples** répartis sous ces 12 (chaque disciple de niveau 2 a 3 ou 4 disciples ; aucun disciple de niveau 3 n’a de disciple).

## Contraintes respectées

- Total = **55** (1 superviseur + 12 niveau 2 + 42 niveau 3).
- Répartition : 6 mentors avec 4 disciples chacun, 6 mentors avec 3 disciples chacun.
- Chaque disciple a un seul mentor ; profondeur max = 3 niveaux sous le superviseur.

## Exécution

1. **Sauvegarde** : faire un backup ou un snapshot de la base avant d’exécuter la migration.
2. **Supabase** : exécuter le fichier SQL dans l’éditeur SQL (Dashboard Supabase → SQL Editor) avec un compte ayant les droits sur `public` et `auth`.
3. Fichier à exécuter : `sql/migrations/105_les_determines_55_12_42.sql`

## Après exécution

- La requête de vérification en fin de script affiche pour LES DÉTERMINÉS :
  - `total_membres` = 55
  - `nb_directs_sans_mentor` = 12 (disciples directs d’Alain)
  - `nb_avec_mentor` = 42 (disciples sous les 12)
- L’arbre généalogique et la vue liste reflètent cette structure (get_arbre_4_niveaux, nb_disciples, etc.).

## Attention

- Les **34 profils supprimés** sont définitivement retirés de `auth.users`, `auth.identities` et `profils`. Les 54 gardés sont les **54 premiers par `id`** (ordre croissant) parmi les membres actuels de la famille hors superviseur.
- Si la famille a déjà moins de 55 membres, le script ne supprime personne et ne fait que réorganiser les mentor_id pour respecter 12 directs + 42 sous eux (si au moins 54 membres hors superviseur).
