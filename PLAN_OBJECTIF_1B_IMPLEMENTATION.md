# 📋 PLAN D'IMPLÉMENTATION - OBJECTIF 1B (Détails techniques)

## ✅ ÉTAPE 1 : Migration SQL - COMPLÉTÉE
- ✅ Fichier créé : `sql/migrations/004_objectif1b_retour_eloignes.sql`
- ✅ Tables créées : `contacts_relance`, `historique_presence`
- ⏳ **À FAIRE : Exécuter la migration dans Supabase**

## ✅ ÉTAPE 2 : États ajoutés - COMPLÉTÉE
- ✅ `contactsRelance` : état pour stocker les contacts de relance par visiteur
- ✅ `statsObjectif1B` : état pour les statistiques Objectif 1B
- ✅ `isRelanceDialogOpen` : état pour le dialog de relance
- ✅ `selectedEloigne` : état pour le visiteur sélectionné
- ✅ `relanceFormData` : état pour le formulaire de relance

## ⏳ ÉTAPE 3 : Fonctions à ajouter/modifier

### 3.1 Remplacer `handleRelancerEloigne`
**Localisation :** Ligne ~548

**Ancienne version :**
```javascript
const handleRelancerEloigne = async (visiteurId) => {
  // Version simple qui met juste à jour date_dernier_contact
}
```

**Nouvelle version :**
- Ajouter `handleOpenRelanceDialog(visiteur)` pour ouvrir le dialog
- Remplacer `handleRelancerEloigne` pour enregistrer dans `contacts_relance`
- Mettre à jour `date_dernier_contact` seulement si statut = 'joint' ou 'interesse'

### 3.2 Ajouter nouvelles fonctions
**Après `fetchEloignes` (après ligne ~546) :**

1. **`fetchContactsRelance()`** : Récupérer tous les contacts de relance et les grouper par visiteur_id
2. **`fetchStatsObjectif1B()`** : Calculer les KPIs Objectif 1B

### 3.3 Modifier useEffect
**Localisation :** Ligne ~165
Ajouter les appels :
```javascript
fetchContactsRelance();
fetchStatsObjectif1B();
```

## ⏳ ÉTAPE 4 : Interface à enrichir

### 4.1 Ajouter Dashboard Objectif 1B
**Localisation :** Dans l'onglet "eloignes", avant la liste des éloignés

Afficher :
- Card avec KPIs Objectif 1B
- Progression vers KR1B.1 (500 personnes recensées) avec barre de progression
- Progression vers KR1B.2 (50% de retour = 250 personnes) avec barre de progression

### 4.2 Modifier les cartes des éloignés
**Localisation :** Ligne ~2724

Modifications :
- Remplacer le bouton "Relancer" pour ouvrir le dialog au lieu d'action immédiate
- Afficher l'historique des contacts (si disponible)

### 4.3 Ajouter Dialog de relance
**Localisation :** Après les TabsContent, avant la fin du composant

Dialog avec :
- Type de contact (téléphone, email, SMS, WhatsApp, visite, autre)
- Statut (tenté, joint, pas de réponse, refusé, intéressé)
- Notes
- Prochaine relance (date optionnelle)

### 4.4 Ajouter affichage historique des contacts
Dans chaque carte d'éloigné, afficher les derniers contacts (si disponibles)

## 📝 ORDRE D'IMPLÉMENTATION RECOMMANDÉ

1. ✅ Migration SQL (FAIT)
2. ✅ États (FAIT)
3. ⏳ Ajouter les nouvelles fonctions
4. ⏳ Modifier useEffect
5. ⏳ Ajouter Dialog de relance
6. ⏳ Modifier les cartes des éloignés
7. ⏳ Ajouter Dashboard Objectif 1B
8. ⏳ Ajouter affichage historique

## 🎯 FICHIER ACTUEL
- Fichier : `src/pages/Evangelization.jsx`
- Lignes : ~2797
- Taille : Très volumineux

## ⚠️ ATTENTION
Le fichier est très long. Faire les modifications avec précaution en vérifiant les numéros de ligne exacts avant chaque modification.


