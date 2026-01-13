# 📋 Instructions - Insertion de membres éloignés de test

## Migration SQL à exécuter

Exécutez le fichier suivant dans Supabase SQL Editor :

**Fichier :** `sql/migrations/005_insert_membres_eloignes_test.sql`

## Étapes

1. Ouvrez **Supabase Dashboard** → **SQL Editor**
2. Ouvrez le fichier `sql/migrations/005_insert_membres_eloignes_test.sql`
3. Copiez tout le contenu du fichier
4. Collez-le dans l'éditeur SQL de Supabase
5. Cliquez sur **Run** ou appuyez sur `Ctrl+Enter` (ou `Cmd+Enter` sur Mac)

## Données insérées

### Membre 1 : Jean Dupont
- **Email :** jean.dupont@example.com
- **Téléphone :** +33123456789
- **Statut :** éloigné
- **Type :** ancien_eloigne
- **Dernier contact :** Il y a 4 mois

### Membre 2 : Marie Martin
- **Email :** marie.martin@example.com
- **Téléphone :** +33987654321
- **Statut :** éloigné
- **Type :** ancien_eloigne
- **Dernier contact :** Il y a 5 mois

## Vérification

Après l'exécution, vous devriez voir :
- ✅ Les 2 membres éloignés dans l'onglet "Retour Éloignés"
- ✅ Le bouton "Relancer" visible sur chaque carte
- ✅ Le dashboard Objectif 1B avec les statistiques mises à jour

## Note

- Les données utilisent un `invitant_id` d'un utilisateur existant (le premier trouvé)
- Si aucun utilisateur n'existe, l'invitant_id sera NULL (ce qui est acceptable)
- La requête utilise `ON CONFLICT DO NOTHING` pour éviter les doublons si exécutée plusieurs fois




