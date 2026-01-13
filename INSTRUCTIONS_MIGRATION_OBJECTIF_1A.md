# 📋 Instructions pour exécuter la migration SQL - Objectif 1A

## Fichier de migration
`sql/migrations/003_objectif1a_nouvelles_ames.sql`

## Étapes d'exécution

1. **Ouvrez Supabase Dashboard**
   - Connectez-vous à votre projet Supabase
   - Allez dans "SQL Editor"

2. **Exécutez la migration**
   - Copiez le contenu complet du fichier `sql/migrations/003_objectif1a_nouvelles_ames.sql`
   - Collez-le dans l'éditeur SQL
   - Cliquez sur "Run" ou appuyez sur `Ctrl+Enter` (Windows/Linux) ou `Cmd+Enter` (Mac)

3. **Vérification**
   - Vérifiez qu'aucune erreur n'est affichée
   - Vérifiez que les tables suivantes ont été créées :
     - `evenements_evangelisation`
     - `evenement_visiteurs`
     - `activites_solidarite`
   - Vérifiez que la colonne `type` a été ajoutée à la table `visiteurs`

## Ce que fait cette migration

1. **Ajoute le champ `type` à la table `visiteurs`**
   - Valeurs possibles : 'nouvelle_ame' ou 'ancien_eloigne'
   - Valeur par défaut : 'nouvelle_ame'
   - Met à jour les enregistrements existants avec 'nouvelle_ame'

2. **Crée la table `evenements_evangelisation`**
   - Pour gérer les événements thématiques, banque alimentaire, solidarité, agape
   - Avec indexes et RLS policies

3. **Crée la table `evenement_visiteurs`**
   - Pour lier les visiteurs aux événements
   - Avec tracking de présence

4. **Crée la table `activites_solidarite`**
   - Pour tracker les activités de banque alimentaire et solidarité
   - Avec indexes et RLS policies

5. **Configure les politiques RLS (Row Level Security)**
   - Permet aux utilisateurs authentifiés de voir les données
   - Permet aux responsables et admins de modifier/supprimer

## Notes importantes

- Cette migration est idempotente (peut être exécutée plusieurs fois sans problème)
- Les données existantes dans `visiteurs` ne seront pas perdues
- Les visiteurs existants recevront automatiquement `type = 'nouvelle_ame'`

## En cas d'erreur

Si vous rencontrez une erreur :
1. Vérifiez que vous êtes connecté à Supabase
2. Vérifiez que les tables précédentes (`visiteurs`, `profils`) existent
3. Vérifiez les permissions RLS
4. Consultez les logs d'erreur dans Supabase



