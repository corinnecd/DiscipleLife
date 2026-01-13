# 📚 Guide : Configuration Git pour Disciple Life App

## 🔧 Configuration initiale

Vos identifiants Git sont déjà configurés :
- **Nom** : Corinne
- **Email** : corinnediarra.cd@gmail.com

## 📝 Étapes pour initialiser Git

### 1. Initialiser le dépôt Git

Ouvrez un terminal dans le dossier du projet et exécutez :

```bash
cd "/Users/mbprocorinne/Downloads/PCNC 2024/DISCIPLES ADORATRICES/APPLI DISCIPLE LIFE"
git init
```

### 2. Vérifier les fichiers à ajouter

```bash
git status
```

### 3. Ajouter tous les fichiers au staging

```bash
git add .
```

### 4. Faire le premier commit

```bash
git commit -m "Initial commit: Application Disciple Life avec Objectif 1 - Évangélisation"
```

## 🔗 Connexion à un dépôt distant (GitHub/GitLab)

### Option 1 : Créer un nouveau dépôt sur GitHub

1. Allez sur [GitHub.com](https://github.com) et créez un nouveau dépôt
2. **NE PAS** initialiser avec README, .gitignore ou license (le projet existe déjà)
3. Copiez l'URL du dépôt (format : `https://github.com/votre-username/nom-du-depot.git`)

### Option 2 : Connexion au dépôt distant

Une fois le dépôt créé, exécutez :

```bash
# Remplacer l'URL par votre URL GitHub
git remote add origin https://github.com/votre-username/nom-du-depot.git

# Vérifier la connexion
git remote -v
```

### 3. Pousser le code vers GitHub

```bash
# Pour la première fois
git branch -M main
git push -u origin main

# Pour les prochains commits
git push
```

## 📋 Commandes Git utiles

### Voir l'état du dépôt
```bash
git status
```

### Ajouter des fichiers
```bash
git add .                    # Tous les fichiers
git add fichier.jsx          # Un fichier spécifique
```

### Faire un commit
```bash
git commit -m "Description des modifications"
```

### Voir l'historique
```bash
git log --oneline
```

### Voir les différences
```bash
git diff
```

### Créer une nouvelle branche
```bash
git checkout -b nom-de-la-branche
```

### Revenir à la branche principale
```bash
git checkout main
```

### Merger une branche
```bash
git merge nom-de-la-branche
```

## 🚀 Workflow recommandé

1. **Faire des modifications** dans votre code
2. **Vérifier les changements** : `git status`
3. **Ajouter les fichiers** : `git add .`
4. **Faire un commit** : `git commit -m "Description"`
5. **Pousser vers GitHub** : `git push`

## ⚠️ Notes importantes

- Le fichier `.gitignore` a été créé pour exclure :
  - `node_modules/`
  - `dist/`
  - `.env` (fichiers de configuration sensibles)
  - Fichiers système (`.DS_Store`, etc.)

- **Ne jamais commiter** :
  - Les clés API
  - Les mots de passe
  - Les fichiers `.env` avec des informations sensibles

## 🔐 Authentification GitHub

Si vous avez des problèmes d'authentification avec GitHub :

### Option 1 : Personal Access Token (Recommandé)
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Générer un nouveau token avec les permissions `repo`
3. Utiliser le token comme mot de passe lors du `git push`

### Option 2 : SSH Key
```bash
# Générer une clé SSH
ssh-keygen -t ed25519 -C "corinnediarra.cd@gmail.com"

# Ajouter la clé à l'agent SSH
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Copier la clé publique
cat ~/.ssh/id_ed25519.pub
# Puis l'ajouter sur GitHub : Settings → SSH and GPG keys → New SSH key
```

## 📞 Besoin d'aide ?

Si vous rencontrez des problèmes :
1. Vérifiez que Git est installé : `git --version`
2. Vérifiez votre configuration : `git config --list`
3. Consultez la documentation GitHub : https://docs.github.com



