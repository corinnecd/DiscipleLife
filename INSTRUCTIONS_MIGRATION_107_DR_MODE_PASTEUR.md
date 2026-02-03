# Migration 107 – Corriger le rôle DR MODE (pasteur)

## Problème

Le compte **DR MODE** (dr.mode@disciplelife.com) apparaît en **disciple** et voit le **tableau de bord Disciple** au lieu du **tableau de bord Pasteur**.

## Cause

En base, le profil de ce compte a `profils.role = 'disciple'` au lieu de `'pasteur'`. L’app lit le rôle dans `profils` pour choisir le dashboard.

## Solution

Exécuter la migration **107** pour remettre le rôle et l’identifiant pasteur.

### Étapes

1. Ouvrir le **éditeur SQL** Supabase (ou exécuter le fichier avec `psql`).
2. Exécuter le contenu de **`sql/migrations/107_corriger_role_dr_mode_pasteur.sql`**.
3. Vérifier dans les résultats du 3ᵉ `SELECT` que pour DR MODE on a bien **`role = 'pasteur'`** et **`identifiant_unique = 'PASTEUR-001'`**.
4. Côté app : **se déconnecter puis se reconnecter** avec dr.mode@disciplelife.com (ou au minimum recharger la page après déconnexion) pour que le rôle soit rechargé depuis la base.

Après cela, la connexion avec DR MODE doit afficher le **dashboard Pasteur** (`/space/pasteur` ou via « Tableau de bord »).
