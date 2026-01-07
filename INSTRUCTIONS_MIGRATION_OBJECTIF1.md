# Instructions pour exécuter la migration SQL - Objectif 1

## Fichier de migration créé

- **Fichier:** `sql/migrations/001_objectif1_evangelisation_tables.sql`

## Méthode 1: Via Supabase Dashboard (Recommandé)

1. Connectez-vous à votre projet Supabase: https://supabase.com/dashboard
2. Sélectionnez votre projet: `ggrkwivcspuwxuyrjyem`
3. Allez dans **SQL Editor** (dans la barre latérale gauche)
4. Cliquez sur **New Query**
5. Copiez le contenu du fichier `sql/migrations/001_objectif1_evangelisation_tables.sql`
6. Collez-le dans l'éditeur SQL
7. Cliquez sur **Run** (ou appuyez sur Ctrl+Enter / Cmd+Enter)
8. Vérifiez qu'il n'y a pas d'erreurs dans les résultats

## Tables créées

Cette migration crée les tables suivantes:

1. **visiteurs** - Pour tracker les visiteurs, nouveaux contacts et personnes éloignées
2. **campagnes_evangelisation** - Pour gérer les campagnes d'évangélisation
3. **campagne_visiteurs** - Table de liaison entre campagnes et visiteurs

## Fonctionnalités incluses

- ✅ Index pour améliorer les performances
- ✅ Triggers pour `updated_at` automatique
- ✅ Politiques RLS (Row Level Security) configurées
- ✅ Contraintes de vérification pour les valeurs valides
- ✅ Clés étrangères avec gestion de suppression

## Vérification

Après l'exécution, vous pouvez vérifier que les tables ont été créées:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('visiteurs', 'campagnes_evangelisation', 'campagne_visiteurs');
```

## Notes importantes

- Les politiques RLS sont activées par défaut
- Les utilisateurs peuvent voir et gérer leurs propres visiteurs
- Les admins et mentors peuvent voir tous les visiteurs
- Les campagnes sont visibles par tous les utilisateurs authentifiés
- Seuls les mentors et admins peuvent créer des campagnes




