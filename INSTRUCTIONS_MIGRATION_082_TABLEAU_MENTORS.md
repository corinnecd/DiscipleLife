# Migration 082 – Tableau consolidé des mentors (piliers)

## Objectif

Le **Tableau Consolidé des Mentors (Piliers)** affiche désormais :
- La liste des **disciples-mentors qui ont au moins un disciple**, dans les **familles actives** du pasteur
- Colonnes : **Nom du mentor** (cliquable → fiche disciple), **Nom de la famille**, **Nombre de disciples**, **Titre** (Superviseur, Mentor, Berger, Disciple)

La migration **082** ajoute la fonction **`get_mentors_avec_disciples_pour_pasteur(p_pasteur_id UUID)`** (SECURITY DEFINER) qui retourne ces lignes en s’appuyant sur `cercle_personnes` et les familles actives, sans être bloquée par la RLS.

## Exécution

1. Ouvrir le **SQL Editor** Supabase.
2. Copier-coller le contenu de **`sql/migrations/082_rpc_mentors_avec_disciples_pasteur.sql`**.
3. Exécuter le script.

Après exécution, le tableau des mentors se remplit avec les bons noms, familles, nombres de disciples et titres ; un clic sur le nom ouvre la fiche du disciple (`/disciples/:id`).
