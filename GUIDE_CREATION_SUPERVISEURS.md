# 📋 GUIDE COMPLET : Créer les 26 Comptes Superviseurs

## 🎯 OBJECTIF

Créer les 26 comptes superviseurs dans Supabase Auth et leurs profils dans la table `profils`.

---

## ⚠️ IMPORTANT

**Les comptes Supabase Auth ne peuvent PAS être créés directement via SQL.**  
Vous devez utiliser :
1. ✅ L'interface Dashboard (méthode manuelle - recommandée pour commencer)
2. ✅ L'API Supabase Admin (méthode automatisée - script Node.js)
3. ❌ SQL seul (ne fonctionne pas pour créer des comptes Auth)

---

## 🔧 MÉTHODE 1 : Interface Dashboard (Recommandée pour débuter)

### Étape 1 : Créer les comptes Auth via l'interface

1. **Ouvrez Supabase Dashboard**
   - Allez sur https://app.supabase.com
   - Sélectionnez votre projet

2. **Accédez à Authentication**
   - Menu de gauche : **Authentication**
   - Cliquez sur **Users**

3. **Créez chaque compte superviseur**
   - Cliquez sur **"Add User"** ou **"Invite User"**
   - Pour chaque superviseur, remplissez :
     - **Email** : Utilisez la liste ci-dessous
     - **Password** : Créez un mot de passe temporaire (ex: `TempPassword123!`)
     - **Auto Confirm User** : ✅ Cocher (pour confirmer automatiquement l'email)
     - Cliquez sur **"Create User"**

4. **Répétez pour les 26 superviseurs**

### Étape 2 : Créer les profils dans la table profils

Une fois tous les comptes Auth créés, exécutez dans **Supabase SQL Editor** :

```sql
-- Exécutez: sql/migrations/042_creer_profils_superviseurs.sql
```

**⚠️ ATTENTION :** Modifiez les emails dans le script pour correspondre aux emails que vous avez utilisés lors de la création des comptes Auth.

---

## 🚀 MÉTHODE 2 : Script Node.js (Recommandée pour automatisation)

### Étape 1 : Préparer l'environnement

1. **Installer les dépendances** (si pas déjà fait)
   ```bash
   npm install @supabase/supabase-js
   npm install dotenv
   ```

2. **Créer un fichier `.env` à la racine du projet**
   ```env
   SUPABASE_URL=https://votre-projet.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
   ```
   
   **Où trouver ces valeurs :**
   - **SUPABASE_URL** : Dashboard > Settings > API > Project URL
   - **SUPABASE_SERVICE_ROLE_KEY** : Dashboard > Settings > API > service_role key (⚠️ SECRET, ne partagez jamais)

### Étape 2 : Modifier les emails dans le script

**Important :** Les emails dans le script sont des exemples (`@example.com`).  
**Modifiez** le fichier `scripts/create_superviseurs.js` pour mettre les **vrais emails** des superviseurs.

### Étape 3 : Exécuter le script

```bash
node scripts/create_superviseurs.js
```

**Ce que fait le script :**
- ✅ Crée les 26 comptes dans Supabase Auth
- ✅ Crée les profils correspondants dans la table `profils`
- ✅ Définit le rôle à `superviseur`
- ✅ Génère un mot de passe temporaire pour tous

**Résultat :**
- Vous verrez un résumé avec le nombre de succès/erreurs
- Les superviseurs pourront se connecter avec leur email et le mot de passe temporaire
- Les profils seront automatiquement créés dans la table `profils`

---

## 📝 LISTE DES 26 SUPERVISEURS

| ID Famille | Nom Famille | Prénom | Nom | Email (exemple) |
|---|---|---|---|---|
| FAM001 | LES DÉTERMINÉS | Alain | SIL | alain.sil@example.com |
| FAM002 | Les VAILLANTS | Andréa | ERNEST | andrea.ernest@example.com |
| FAM003 | Les ENRACINÉS | Béraca | KAZONGO | beraca.kazongo@example.com |
| FAM004 | Les ÉCLAIRÉS | BETSALEEL | BADILA | betsaleel.badila@example.com |
| FAM005 | Les AMOUREUX | CARINE | MATONDO | carine.matondo@example.com |
| FAM006 | ZÉLES | COCO | OKANZI | coco.okanzi@example.com |
| FAM007 | INNARRÊTABLES | CYNTHIA | ALLOH | cynthia.alloh@example.com |
| FAM008 | LES TÉMOINS | ELISABETH | AMECY | elisabeth.amecy@example.com |
| FAM009 | LES COMBATTANTS | Andréa | Ernest | andrea.ernest2@example.com |
| FAM010 | LES AGAPÉS | EPHREM | MBA | ephrem.mba@example.com |
| FAM011 | LES FIDÈLES | GERVAIS | NKATOULOULOU | gervais.nkatouloulou@example.com |
| FAM012 | LES GLORIEUX | Andréa | Ernest | andrea.ernest3@example.com |
| FAM013 | Les Vaillants | HÉLÈNE | LAMAGO | helene.lamago@example.com |
| FAM014 | LES PERSÉVERANTS | JOCELYNE | FORTUNE | jocelyne.fortune@example.com |
| FAM015 | LES ÉQUIPÉS | KARINE | WILLIAM | karine.william@example.com |
| FAM016 | LES INGÉNIEUX | KEVIN | THÉA | kevin.thea@example.com |
| FAM017 | LES RACHETÉS | LAETITIA | OBAME | laetitia.obame@example.com |
| FAM018 | LES RADIEUSES | MANICIA | THÉA | manicia.thea@example.com |
| FAM019 | LES INTIMES | NANCY | NZI | nancy.nzi@example.com |
| FAM020 | LES INEBRANLABLES | NASDÈNE | KODIA | nasdene.kodia@example.com |
| FAM021 | LES CHOISIS | PATRICK | BATSIAGA | patrick.batsiaga@example.com |
| FAM022 | LES BOULEVERSEURS | PROSPERE | LEBA | prospere.leba@example.com |
| FAM023 | LES PASSIONNÉS | ROCHELLE | PASSI BEN | rochelle.passiben@example.com |
| FAM024 | LES CONSACRÉS | SERGE | AMANY | serge.amany@example.com |
| FAM025 | LES EMBRASÉS | SNELLA | MOUSSIO | snella.moussio@example.com |
| FAM026 | LES DISCIPLES | YVAN | DESSANDE | yvan.dessande@example.com |

**⚠️ IMPORTANT :** Remplacez les emails `@example.com` par les **vrais emails** des superviseurs.

---

## ✅ VÉRIFICATION

Après avoir créé les comptes, vérifiez :

### 1. Vérifier dans Authentication
- Dashboard > Authentication > Users
- Vous devriez voir 26 utilisateurs avec les emails des superviseurs

### 2. Vérifier dans la table profils
```sql
SELECT 
  COUNT(*) as nombre_superviseurs,
  COUNT(*) FILTER (WHERE role = 'superviseur') as superviseurs_avec_role
FROM profils
WHERE role = 'superviseur';
-- Doit retourner 26
```

### 3. Lister les superviseurs créés
```sql
SELECT 
  id,
  first_name,
  last_name,
  email,
  role,
  created_at
FROM profils
WHERE role = 'superviseur'
ORDER BY last_name, first_name;
```

---

## 🔗 ÉTAPE SUIVANTE : Assigner les Superviseurs aux Familles

Une fois les comptes créés, exécutez :

```sql
-- Script d'assignation automatique
-- sql/migrations/037_assigner_superviseurs.sql
```

Ce script assignera automatiquement chaque superviseur à sa famille correspondante.

---

## 📞 SUPPORT

**Problèmes courants :**

1. **"User already registered"**
   - L'utilisateur existe déjà
   - Le script continuera et mettra à jour le profil

2. **"Service role key not found"**
   - Vérifiez que le fichier `.env` contient la bonne clé
   - La clé doit être la **service_role key**, pas la clé anon

3. **"Permission denied"**
   - Vérifiez que vous utilisez la **service_role key**
   - La clé anon ne peut pas créer des utilisateurs

4. **Profils non créés**
   - Vérifiez que les comptes Auth ont bien été créés
   - Vérifiez les logs pour voir les erreurs

