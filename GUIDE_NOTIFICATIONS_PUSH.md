# 📱 Guide des Notifications Push - Suivi Post-Crise

Ce guide explique comment fonctionnent les notifications push du navigateur pour le système de Suivi Post-Crise.

## 🎯 Vue d'ensemble

Le système de notifications push permet d'envoyer des notifications directement sur le navigateur de l'utilisateur, même quand l'application n'est pas ouverte. Les messages sont **personnalisés selon le type de crise** pour offrir un accompagnement adapté.

---

## ✅ Fonctionnalités implémentées

### 1. Service Worker (`public/sw.js`)
- ✅ Gestion des notifications push
- ✅ Gestion des clics sur les notifications (redirection)
- ✅ Cache de base pour l'application
- ✅ Support des actions de notification

### 2. Service de Notifications (`src/lib/NotificationService.js`)
- ✅ Enregistrement automatique du service worker
- ✅ Demande de permission pour les notifications
- ✅ Envoi de notifications push
- ✅ **Personnalisation des messages selon le type de crise**

### 3. Messages personnalisés par type de crise

Chaque type de crise a un message spécifique :

| Type de Crise | Titre | Message |
|--------------|-------|---------|
| **Deuil** | 💙 Rappel - Accompagnement dans le Deuil | Message d'accompagnement dans cette période difficile |
| **Divorce** | 💔 Rappel - Reconstruction après Divorce | Message de reconstruction et restauration |
| **Maladie** | 🏥 Rappel - Suivi de Santé | Message de bien-être et suivi de santé |
| **Chômage** | 💼 Rappel - Accompagnement Professionnel | Message de soutien dans la transition professionnelle |
| **Trauma** | 🛡️ Rappel - Guérison du Trauma | Message de guérison et restauration |
| **Dépression** | 🌱 Rappel - Suivi de Dépression | Message d'accompagnement et soutien |
| **Addiction** | 🔓 Rappel - Libération de l'Addiction | Message de liberté et victoire |
| **Conflit Familial** | 👨‍👩‍👧‍👦 Rappel - Résolution de Conflit Familial | Message de réconciliation |
| **Crise Spirituelle** | 🙏 Rappel - Restauration Spirituelle | Message de restauration de la foi |
| **Autre** | 📋 Rappel - Suivi Post-Crise | Message générique de suivi |

### 4. Informations additionnelles dans les notifications

Les notifications incluent automatiquement :
- ✅ **Prochaine action prévue** (si configurée)
- ✅ **Date de la prochaine action** (si configurée)
- ✅ **Niveau de gravité** (1-10)
- ✅ **Fréquence du rappel** (quotidien, hebdomadaire, etc.)
- ✅ **Actions rapides** : "Voir mon suivi" et "Plus tard"
- ✅ **Interaction requise** si gravité ≥ 7

---

## 🔧 Configuration

### Étape 1 : Vérifier le service worker

Le service worker est automatiquement enregistré au démarrage de l'application dans `src/main.jsx`.

### Étape 2 : Demander la permission

La permission est demandée automatiquement lors de la première visite sur la page `/transformation`.

### Étape 3 : Tester les notifications

1. Créer un suivi post-crise avec `rappel_actif = true`
2. Définir `prochain_rappel` à une date passée
3. Recharger la page `/transformation`
4. Vérifier que la notification push apparaît

---

## 📋 Fonctionnement

### Déclenchement automatique

Les notifications push sont envoyées automatiquement lorsque :
- ✅ Un rappel est dû (selon `prochain_rappel`)
- ✅ La fréquence configurée est atteinte
- ✅ Le suivi est actif (`rappel_actif = true`)
- ✅ Le statut n'est pas "résolu" ou "archivé"
- ✅ **La permission de notification est accordée**

### Personnalisation

Le message est personnalisé selon :
1. **Type de crise** : Titre et message adaptés
2. **Gravité** : Interaction requise si ≥ 7
3. **Prochaine action** : Ajoutée si configurée
4. **Fréquence** : Mentionnée dans le message

### Multi-canal

Les notifications sont envoyées via **3 canaux simultanés** :
1. 📧 **Email** (si configuré)
2. 🔔 **Notification dans l'application** (table `notifications`)
3. 📱 **Notification push navigateur** (si permission accordée)

---

## 🧪 Test

### Tester manuellement

```javascript
// Dans la console du navigateur
import { sendSuiviPostCrisePushNotification } from '@/lib/NotificationService';

const suiviTest = {
  id: 'test-id',
  type_crise: 'deuil',
  gravite: 5,
  prochaine_action: 'Prière de guérison',
  date_prochaine_action: new Date().toISOString()
};

await sendSuiviPostCrisePushNotification(suiviTest, 'hebdomadaire');
```

### Vérifier les permissions

```javascript
// Dans la console du navigateur
console.log('Permission:', Notification.permission);
console.log('Service Worker:', 'serviceWorker' in navigator);
```

---

## 🔒 Sécurité et Confidentialité

- ⚠️ Les notifications push nécessitent HTTPS (sauf en localhost)
- ✅ Les données sensibles ne sont pas incluses dans les notifications
- ✅ Les notifications sont stockées localement par le navigateur
- ✅ L'utilisateur peut révoquer la permission à tout moment

---

## 📊 Statut de l'implémentation

✅ **Fonctionnalités complétées :**
- ✅ Service Worker créé et configuré
- ✅ Service de notifications avec personnalisation
- ✅ Messages personnalisés pour 10 types de crises
- ✅ Intégration dans Transformation.jsx
- ✅ Initialisation automatique au démarrage
- ✅ Support des actions de notification
- ✅ Redirection automatique au clic

⚠️ **À noter :**
- ⚠️ Les notifications push nécessitent HTTPS en production
- ⚠️ Le service worker doit être accessible depuis `/sw.js`
- ⚠️ La permission doit être accordée par l'utilisateur

---

## 💡 Recommandations

1. **Pour la production** : Utiliser HTTPS (obligatoire pour les notifications push)
2. **Pour le développement** : Fonctionne en localhost
3. **Icônes** : Remplacer `/vite.svg` par des icônes personnalisées
4. **Badges** : Personnaliser les badges selon le type de notification
5. **Actions** : Ajouter plus d'actions selon les besoins

---

## 🔍 Dépannage

### La notification n'apparaît pas

1. Vérifier que la permission est accordée : `Notification.permission === 'granted'`
2. Vérifier que le service worker est enregistré : `navigator.serviceWorker.ready`
3. Vérifier la console pour les erreurs
4. Vérifier que `prochain_rappel` est dans le passé ou aujourd'hui

### Le service worker ne s'enregistre pas

1. Vérifier que `/sw.js` est accessible
2. Vérifier la console pour les erreurs
3. Vérifier que l'application est servie via HTTP/HTTPS (pas `file://`)

### La permission est refusée

1. L'utilisateur doit l'accorder manuellement dans les paramètres du navigateur
2. Chrome : `chrome://settings/content/notifications`
3. Firefox : `about:preferences#privacy`

---

**Dernière mise à jour** : Après implémentation des notifications push et personnalisation des messages
