# Migration 106 – Vérifier que tous les superviseurs sont affectés à un pasteur

## Objectif

S’assurer que chaque superviseur a un `pasteur_id` renseigné dans `profils`.

## Étapes de la migration

1. **Vérification** : liste des superviseurs sans pasteur (`pasteur_id IS NULL`).
2. **Correction 1** : pour ceux qui ont une famille avec un pasteur, `pasteur_id` est rempli à partir de `familles_disciples.pasteur_id`.
3. **Correction 2** : pour les superviseurs encore sans pasteur (famille sans pasteur ou sans famille), affectation au premier pasteur trouvé en base.
4. **Vérification finale** : comptes (total superviseurs / avec pasteur / sans pasteur) et liste superviseur → pasteur.

## Exécution

Dans l’éditeur SQL Supabase (ou en ligne de commande avec `psql`) :

1. Ouvrir `sql/migrations/106_verifier_superviseurs_affectes_pasteur.sql`.
2. Exécuter le script en entier.

Les premiers `SELECT` affichent les superviseurs sans pasteur avant correction ; les derniers donnent le résumé et la liste finale après correction.

## Résultat attendu

- `superviseurs_sans_pasteur` = 0 après exécution (s’il existe au moins un pasteur en base).
- Chaque ligne du dernier `SELECT` doit avoir un `pasteur_id` et un `pasteur_nom` non nuls.
