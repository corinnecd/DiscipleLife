# 📋 Instructions pour créer les comptes Pasteurs

## 🔧 Configuration préalable

### 1. Créer le fichier `.env`

Le fichier `.env` a été créé à la racine du projet avec l'URL Supabase. Vous devez maintenant ajouter votre **clé service_role**.

### 2. Obtenir la clé service_role

1. Allez sur votre [Dashboard Supabase](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Settings** > **API**
4. Copiez la clé **`service_role`** (⚠️ **PAS** la clé `anon`)

### 3. Mettre à jour le fichier `.env`

Ouvrez le fichier `.env` et remplacez :
```
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key_ici
```

Par votre vraie clé service_role :
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🚀 Exécution du script

Une fois le fichier `.env` configuré, exécutez :

```bash
node scripts/create_pasteurs.js
```

## 📊 Comptes qui seront créés

Le script créera 4 comptes pasteurs avec les identifiants suivants :

| Pasteur | Identifiant | Email | Mot de passe |
|---------|-------------|-------|--------------|
| DR MODE | PASTEUR-001 | dr.mode@disciplelife.com | Pasteur001!2024 |
| PS JULIANA | PASTEUR-002 | ps.juliana@disciplelife.com | Pasteur002!2024 |
| PS PEGGY NN | PASTEUR-003 | ps.peggy.nn@disciplelife.com | Pasteur003!2024 |
| PS JESSY | PASTEUR-004 | ps.jessy@disciplelife.com | Pasteur004!2024 |

## 🔗 Liaison avec les superviseurs

Après avoir créé les comptes pasteurs, exécutez la migration SQL :

```sql
-- Dans Supabase SQL Editor
-- Exécutez le fichier: sql/migrations/046_creer_pasteurs_et_liaisons.sql
```

Cette migration :
- Lie les 26 superviseurs à leurs pasteurs respectifs
- Lie les familles aux pasteurs via leurs superviseurs
- Crée les index nécessaires

## ✅ Vérification

Après l'exécution, vous devriez voir :
- ✅ 4 pasteurs créés avec succès
- ✅ 26 superviseurs liés à leurs pasteurs
- ✅ 26 familles liées aux pasteurs

## 🔒 Sécurité

⚠️ **IMPORTANT** :
- Ne partagez **JAMAIS** votre clé `service_role`
- Ne commitez **JAMAIS** le fichier `.env` dans Git
- Le fichier `.env` est déjà dans `.gitignore`
