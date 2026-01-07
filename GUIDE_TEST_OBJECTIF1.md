# 🧪 Guide de Test - Objectif 1 : Évangélisation

## 🚀 Accès à l'application

Une fois le serveur démarré, accédez à :
- **URL locale** : http://localhost:3000
- **URL réseau** : http://[votre-ip]:3000

## ✅ Checklist de Test

### 1. Navigation
- [ ] Se connecter à l'application
- [ ] Vérifier la présence du lien "Évangélisation" dans le menu latéral
- [ ] Cliquer sur "Évangélisation" et vérifier que la page se charge

### 2. Onglet "Visiteurs"
- [ ] Vérifier que la liste des visiteurs s'affiche
- [ ] Cliquer sur "Ajouter un visiteur"
- [ ] Remplir le formulaire avec :
  - Nom, Prénom
  - Email, Téléphone
  - Statut (visiteur, éloigné, nouveau_contact, retourné)
  - Source de contact
  - Notes
- [ ] Sauvegarder et vérifier que le visiteur apparaît dans la liste
- [ ] Tester la recherche par nom/prénom
- [ ] Tester le filtre par statut
- [ ] Cliquer sur un visiteur pour voir les détails
- [ ] Modifier un visiteur existant
- [ ] Supprimer un visiteur

### 3. Onglet "Campagnes"
- [ ] Vérifier que la liste des campagnes s'affiche
- [ ] Cliquer sur "Créer une campagne"
- [ ] Remplir le formulaire avec :
  - Nom de la campagne
  - Description
  - Type de campagne
  - Date de début et fin
  - Responsable (sélectionner dans la liste)
  - Objectif de participants
  - Statut
- [ ] Sauvegarder et vérifier que la campagne apparaît
- [ ] Modifier une campagne existante
- [ ] Vérifier l'affichage des statistiques de chaque campagne
- [ ] Tester l'association visiteurs-campagne (si disponible)

### 4. Onglet "Dashboard"
- [ ] Vérifier l'affichage des KPIs :
  - Total Visiteurs
  - Total Campagnes
  - Conversions
  - Taux de conversion
- [ ] Vérifier le graphique en secteurs (funnel de conversion)
- [ ] Vérifier le graphique en barres (répartition par statut)
- [ ] Vérifier que les données sont cohérentes avec les visiteurs créés

### 5. Onglet "Retour Éloignés"
- [ ] Vérifier que les visiteurs éloignés (> 3 mois) s'affichent
- [ ] Vérifier l'affichage des dates de dernier contact
- [ ] Cliquer sur "Relancer" pour un visiteur éloigné
- [ ] Vérifier que l'action de relance fonctionne

### 6. Onglet "Parrainage" ⭐
- [ ] Vérifier que le code d'invitation unique s'affiche
- [ ] Vérifier que le QR Code s'affiche correctement
- [ ] Vérifier le lien d'invitation
- [ ] Tester le bouton "Partager sur WhatsApp"
- [ ] Tester le bouton "Partager sur Facebook"
- [ ] Tester le bouton "Partager sur Twitter"
- [ ] Tester le bouton "Partager par Email"
- [ ] Vérifier l'affichage des statistiques :
  - Nombre d'invitations envoyées
  - Nombre de conversions
- [ ] Tester l'envoi d'invitation personnalisée :
  - Remplir le formulaire (nom, email, message)
  - Envoyer et vérifier la sauvegarde

## 🐛 Points à surveiller

1. **Erreurs console** : Ouvrir la console du navigateur (F12) et vérifier qu'il n'y a pas d'erreurs
2. **Performances** : Vérifier que les listes se chargent rapidement
3. **Permissions** : Vérifier que seuls les utilisateurs autorisés peuvent accéder/modifier les données
4. **Responsive** : Tester sur différents formats d'écran (mobile, tablette, desktop)

## 📝 Notes de test

Date de test : ___________
Testeur : ___________

### Problèmes rencontrés :
- 


### Suggestions d'amélioration :
- 




