# 📧 Guide de Configuration des Emails - Suivi Post-Crise

Ce guide explique comment configurer l'envoi d'emails pour les notifications de suivi post-crise.

## 🎯 Vue d'ensemble

Le système d'alertes automatiques pour le Suivi Post-Crise peut maintenant envoyer des emails en plus des notifications dans l'application. Deux options sont disponibles :

1. **Supabase Edge Function** (recommandé) - Service hébergé par Supabase
2. **Service externe** (Resend, SendGrid) - Via variables d'environnement

---

## 📋 Option 1 : Supabase Edge Function (Recommandé)

### Étape 1 : Installer Supabase CLI

```bash
npm install -g supabase
```

### Étape 2 : Initialiser Supabase (si pas déjà fait)

```bash
supabase login
supabase link --project-ref votre-project-ref
```

### Étape 3 : Créer la fonction

La fonction est déjà créée dans `supabase/functions/send-email/index.ts`

### Étape 4 : Configurer les secrets

```bash
# Pour Resend
supabase secrets set RESEND_API_KEY=votre_cle_api_resend
supabase secrets set EMAIL_FROM="DiscipleLife <noreply@disciplelife.app>"

# OU pour SendGrid
supabase secrets set SENDGRID_API_KEY=votre_cle_api_sendgrid
supabase secrets set EMAIL_FROM="DiscipleLife <noreply@disciplelife.app>"
```

### Étape 5 : Déployer la fonction

```bash
supabase functions deploy send-email
```

### Étape 6 : Tester

La fonction sera automatiquement appelée par le système d'alertes.

---

## 📋 Option 2 : Service Externe (Variables d'Environnement)

### Configuration avec Resend

1. **Créer un compte Resend** : https://resend.com
2. **Obtenir la clé API** depuis le dashboard Resend
3. **Ajouter dans `.env`** :

```env
VITE_RESEND_API_KEY=re_xxxxxxxxxxxxx
VITE_EMAIL_FROM=DiscipleLife <noreply@disciplelife.app>
```

### Configuration avec SendGrid

1. **Créer un compte SendGrid** : https://sendgrid.com
2. **Obtenir la clé API** depuis le dashboard SendGrid
3. **Ajouter dans `.env`** :

```env
VITE_SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
VITE_EMAIL_FROM=DiscipleLife <noreply@disciplelife.app>
```

---

## 🔧 Fonctionnement

### Déclenchement automatique

Les emails sont envoyés automatiquement lorsque :
- Un rappel est dû (selon `prochain_rappel`)
- La fréquence configurée est atteinte
- Le suivi est actif (`rappel_actif = true`)
- Le statut n'est pas "résolu" ou "archivé"

### Contenu de l'email

L'email contient :
- ✅ Titre personnalisé avec le type de crise
- ✅ Détails du suivi (type, date de début, gravité, statut)
- ✅ Prochaine action prévue (si configurée)
- ✅ Lien direct vers le suivi dans l'application
- ✅ Design responsive et professionnel

### Gestion des erreurs

- Si l'envoi d'email échoue, la notification dans l'application est quand même créée
- Les erreurs sont loggées dans la console mais n'interrompent pas le processus
- L'utilisateur reçoit toujours la notification dans l'app

---

## 🧪 Test

### Tester manuellement

1. Créer un suivi post-crise avec `rappel_actif = true`
2. Définir `prochain_rappel` à une date passée
3. Recharger la page `/transformation`
4. Vérifier que l'email est envoyé

### Vérifier les logs

```bash
# Pour Supabase Edge Functions
supabase functions logs send-email

# Vérifier dans la console du navigateur
# Les logs montrent si l'email a été envoyé ou s'il y a eu une erreur
```

---

## 📊 Statut de l'implémentation

✅ **Fonctionnalités complétées :**
- ✅ Création du module `EmailUtils.js`
- ✅ Template HTML professionnel pour les emails
- ✅ Intégration dans le système d'alertes
- ✅ Support Resend et SendGrid
- ✅ Support Supabase Edge Functions
- ✅ Gestion des erreurs non bloquante
- ✅ Récupération automatique de l'email utilisateur

⚠️ **À configurer :**
- ⚠️ Choisir un service d'email (Resend, SendGrid, ou Edge Function)
- ⚠️ Configurer les clés API ou déployer la Edge Function
- ⚠️ Tester l'envoi d'emails

---

## 💡 Recommandations

1. **Pour la production** : Utiliser Supabase Edge Functions (plus sécurisé)
2. **Pour le développement** : Utiliser Resend (plus simple, plan gratuit généreux)
3. **Vérifier les limites** : Respecter les limites d'envoi du service choisi
4. **Monitoring** : Surveiller les logs pour détecter les problèmes d'envoi

---

## 🔒 Sécurité

- ⚠️ **Ne jamais** commiter les clés API dans le code
- ✅ Utiliser les secrets Supabase pour les Edge Functions
- ✅ Utiliser les variables d'environnement pour le frontend
- ✅ Ajouter `.env` dans `.gitignore`

---

## 📝 Notes

- Les emails sont envoyés en arrière-plan (non bloquant)
- Si aucun service n'est configuré, seule la notification dans l'app est créée
- Le système continue de fonctionner même si l'envoi d'email échoue
- Les emails sont formatés en HTML avec une version texte automatique

---

**Dernière mise à jour** : Après implémentation du système d'email pour Suivi Post-Crise
