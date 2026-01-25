# Instructions : Assigner famille_id à Laetitia Missatou

## Problème
Le superviseur **Laetitia Missatou** n'a pas de `famille_id` assigné dans la table `profils`.

## Solution

### Option 1 : Exécuter la migration SQL directement dans Supabase (Recommandé)

1. Ouvrez le **Supabase SQL Editor**
2. Copiez-collez le contenu du fichier `sql/migrations/086_assign_famille_id_laetitia_missatou.sql`
3. Exécutez le script
4. Vérifiez les résultats dans la section de résultats

### Option 2 : Exécuter le script Node.js

```bash
node scripts/assign_famille_id_laetitia_missatou.js
```

**Note:** Assurez-vous que les variables d'environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont configurées dans `.env.local`.

## Ce que fait la migration

1. **Trouve le superviseur** Laetitia Missatou (avec variations du nom : Laetitia/Laëtitia)
2. **Vérifie si une famille existe** pour ce superviseur dans `familles_disciples`
3. **Si FAM017 existe**, la lie à ce superviseur
4. **Si FAM017 n'existe pas**, crée une nouvelle famille "LES VICTORIEUX" (FAM017)
5. **Assigne le `famille_id`** au superviseur dans la table `profils`

## Vérification

Après exécution, vérifiez que :
- Le superviseur Laetitia Missatou a un `famille_id` non NULL
- La famille est correctement liée dans `familles_disciples`
- Le superviseur apparaît dans le Dashboard Pasteur

## Fichiers créés

- `sql/migrations/086_assign_famille_id_laetitia_missatou.sql` - Migration SQL
- `scripts/assign_famille_id_laetitia_missatou.js` - Script Node.js
- `INSTRUCTIONS_ASSIGN_FAMILLE_ID_LAETITIA.md` - Ce guide
