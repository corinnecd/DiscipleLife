# 🚀 Guide : Créer un dépôt GitHub pour Disciple Life App

## 📋 Étape 1 : Créer le dépôt sur GitHub

### Méthode 1 : Via le site web GitHub (Recommandé)

1. **Connectez-vous à GitHub**
   - Allez sur [github.com](https://github.com)
   - Connectez-vous avec votre compte (ou créez-en un si nécessaire)

2. **Créer un nouveau dépôt**
   - Cliquez sur le bouton **"+"** en haut à droite
   - Sélectionnez **"New repository"**

3. **Configurer le dépôt**
   - **Repository name** : `disciple-life-app` (ou un autre nom de votre choix)
   - **Description** : `Application de disciplolat et évangélisation - Disciple Life`
   - **Visibility** : 
     - ✅ **Private** (recommandé si le projet est privé)
     - ⭕ **Public** (si vous voulez le rendre public)
   - ⚠️ **IMPORTANT** : 
     - ❌ **NE PAS** cocher "Add a README file"
     - ❌ **NE PAS** cocher "Add .gitignore"
     - ❌ **NE PAS** cocher "Choose a license"
   - Cliquez sur **"Create repository"**

4. **Copier l'URL du dépôt**
   - Après la création, GitHub vous affichera une page avec des instructions
   - **Copiez l'URL HTTPS** (format : `https://github.com/votre-username/disciple-life-app.git`)
   - Ou l'URL SSH si vous préférez : `git@github.com:votre-username/disciple-life-app.git`

## 📋 Étape 2 : Initialiser Git localement (si pas déjà fait)

Ouvrez un terminal dans le dossier du projet :

```bash
# Naviguer vers le dossier du projet
cd "/Users/mbprocorinne/Downloads/PCNC 2024/DISCIPLES ADORATRICES/APPLI DISCIPLE LIFE"

# Initialiser Git (si pas déjà fait)
git init

# Vérifier que vous êtes dans le bon dossier
pwd
```

## 📋 Étape 3 : Configurer Git (si pas déjà fait)

```bash
# Vérifier votre configuration
git config user.name
git config user.email

# Si nécessaire, configurer :
git config user.name "Corinne"
git config user.email "corinnediarra.cd@gmail.com"
```

## 📋 Étape 4 : Ajouter les fichiers et faire le premier commit

```bash
# Ajouter tous les fichiers (sauf ceux dans .gitignore)
git add .

# Vérifier les fichiers ajoutés
git status

# Faire le premier commit
git commit -m "Initial commit: Application Disciple Life avec Objectif 1 - Évangélisation"
```

## 📋 Étape 5 : Connecter au dépôt GitHub

```bash
# Ajouter le dépôt distant (remplacez l'URL par la vôtre)
git remote add origin https://github.com/votre-username/disciple-life-app.git

# Vérifier la connexion
git remote -v
```

## 📋 Étape 6 : Pousser le code vers GitHub

```bash
# Renommer la branche principale en "main" (si nécessaire)
git branch -M main

# Pousser le code vers GitHub (première fois)
git push -u origin main
```

⚠️ **Authentification** : GitHub vous demandera de vous authentifier :
- Si vous utilisez HTTPS : utilisez un **Personal Access Token** (voir section ci-dessous)
- Si vous utilisez SSH : utilisez votre clé SSH

## 🔐 Créer un Personal Access Token (pour HTTPS)

1. **Sur GitHub** :
   - Allez dans **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
   - Cliquez sur **"Generate new token (classic)"**

2. **Configurer le token** :
   - **Note** : `Disciple Life App`
   - **Expiration** : Choisissez une durée (90 jours, 1 an, ou "No expiration")
   - **Scopes** : Cochez au minimum :
     - ✅ `repo` (tout cocher dans cette section)
   - Cliquez sur **"Generate token"**

3. **Copier le token** :
   - ⚠️ **IMPORTANT** : Copiez le token immédiatement, vous ne pourrez plus le voir après !
   - Exemple : `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

4. **Utiliser le token** :
   - Lors du `git push`, utilisez :
     - **Username** : votre nom d'utilisateur GitHub
     - **Password** : le token que vous venez de créer (pas votre mot de passe GitHub)

## 🔑 Configuration SSH (Alternative à HTTPS)

### Créer une clé SSH

```bash
# Générer une clé SSH
ssh-keygen -t ed25519 -C "corinnediarra.cd@gmail.com"

# Appuyez sur Entrée pour accepter l'emplacement par défaut
# Entrez un mot de passe (ou laissez vide pour ne pas utiliser de mot de passe)
```

### Ajouter la clé à l'agent SSH

```bash
# Démarrer l'agent SSH
eval "$(ssh-agent -s)"

# Ajouter la clé
ssh-add ~/.ssh/id_ed25519
```

### Ajouter la clé publique à GitHub

```bash
# Afficher la clé publique
cat ~/.ssh/id_ed25519.pub

# Copiez tout le contenu affiché
```

Puis sur GitHub :
1. Allez dans **Settings** → **SSH and GPG keys**
2. Cliquez sur **"New SSH key"**
3. **Title** : `Mac - Disciple Life App`
4. **Key** : Collez la clé publique que vous avez copiée
5. Cliquez sur **"Add SSH key"**

### Utiliser SSH au lieu de HTTPS

```bash
# Si vous avez déjà ajouté le remote en HTTPS, changez-le :
git remote set-url origin git@github.com:votre-username/disciple-life-app.git

# Ou ajoutez directement avec SSH :
git remote add origin git@github.com:votre-username/disciple-life-app.git
```

## 📋 Commandes complètes (résumé)

```bash
# 1. Naviguer vers le projet
cd "/Users/mbprocorinne/Downloads/PCNC 2024/DISCIPLES ADORATRICES/APPLI DISCIPLE LIFE"

# 2. Initialiser Git
git init

# 3. Ajouter les fichiers
git add .

# 4. Premier commit
git commit -m "Initial commit: Application Disciple Life avec Objectif 1 - Évangélisation"

# 5. Ajouter le dépôt distant (remplacez l'URL)
git remote add origin https://github.com/votre-username/disciple-life-app.git

# 6. Pousser vers GitHub
git branch -M main
git push -u origin main
```

## ✅ Vérification

Après le push, allez sur votre dépôt GitHub et vérifiez que tous les fichiers sont présents.

## 🔄 Pour les prochains commits

```bash
# 1. Vérifier les modifications
git status

# 2. Ajouter les fichiers modifiés
git add .

# 3. Faire un commit
git commit -m "Description des modifications"

# 4. Pousser vers GitHub
git push
```

## 📝 Créer un README.md (optionnel)

Vous pouvez créer un fichier README.md pour documenter votre projet :

```markdown
# Disciple Life App

Application de disciplolat et évangélisation

## Fonctionnalités

- Évangélisation et suivi des visiteurs
- Campagnes d'évangélisation
- Système de parrainage avec codes QR
- Dashboard de suivi

## Installation

\`\`\`bash
npm install
npm run dev
\`\`\`

## Technologies

- React
- Vite
- Supabase
- Tailwind CSS
```

Puis :
```bash
git add README.md
git commit -m "Add README.md"
git push
```

## 🆘 Résolution de problèmes

### Erreur : "remote origin already exists"
```bash
# Vérifier le remote actuel
git remote -v

# Supprimer et réajouter
git remote remove origin
git remote add origin https://github.com/votre-username/disciple-life-app.git
```

### Erreur : "Permission denied"
- Vérifiez votre token GitHub (pour HTTPS)
- Vérifiez votre clé SSH (pour SSH)
- Vérifiez que vous avez les droits sur le dépôt

### Erreur : "failed to push some refs"
```bash
# Récupérer les changements distants d'abord
git pull origin main --allow-unrelated-histories

# Puis pousser
git push -u origin main
```

## 📞 Besoin d'aide ?

- Documentation GitHub : https://docs.github.com
- Guide Git : https://git-scm.com/doc



