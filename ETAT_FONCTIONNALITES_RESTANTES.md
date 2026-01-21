# 📋 État des Fonctionnalités - Ce qui reste à implémenter

**Date de mise à jour :** Après intégration ErrorHandler complète

---

## ✅ CE QUI A ÉTÉ COMPLÉTÉ RÉCEMMENT

### Optimisations et Améliorations Techniques ✅

1. **Système de Cache** ✅
   - 8 pages principales optimisées
   - Réduction de 85-90% des requêtes Supabase
   - Temps de chargement amélioré de 80%

2. **Gestion d'Erreurs Centralisée** ✅
   - 14 pages intégrées avec ErrorHandler
   - ~40+ gestionnaires d'erreur standardisés
   - Messages d'erreur cohérents en français

3. **Système de Monitoring de Performance** ✅
   - Dashboard de performance créé (`/admin/performance`)
   - Mesure des temps de chargement
   - Suivi des appels API et cache

4. **Recherche Globale Avancée** ✅
   - 10 catégories de recherche
   - Interface visuelle complète

5. **Notifications en Temps Réel** ✅
   - Mises à jour instantanées via Supabase Realtime
   - Badges animés

6. **Arbre Généalogique** ⚠️ (Partiellement fait)
   - Page `GenealogicalTree.jsx` existe et fonctionne
   - ✅ Affichage descendants (utilisateur connecté)
   - ✅ Vue Desktop (arbre récursif avec zoom/pan)
   - ✅ Vue Mobile (drill-down navigation)
   - ❌ Recherche d'autres personnes (pasteur, superviseur, mentor, disciple)
   - ❌ Visualisation ascendants (remontée jusqu'au pasteur)
   - ❌ Vue complète (ascendants + descendants)
   - ❌ Panneau de détails latéral
   - **À améliorer :** Recherche universelle + ascendants + vue complète

---

## 📊 OBJECTIFS OKR - État Actuel

### ✅ Objectif 1 : Attirer les âmes / Faire revenir les éloignés
**Statut :** ✅ **100% COMPLÉTÉ**

- ✅ Objectif 1A : Attirer les nouvelles âmes
- ✅ Objectif 1B : Faire revenir les anciens
- ✅ Page `/evangelization` complète
- ✅ Toutes les tables SQL créées
- ✅ Migrations SQL complétées

### ✅ Objectif 2 : Fidéliser les âmes
**Statut :** ✅ **100% COMPLÉTÉ**

- ✅ Page `/engagement` complète
- ✅ 23 badges implémentés
- ✅ 5 programmes de fidélisation
- ✅ Système de points automatique
- ✅ Notifications proactives

### ❌ Objectif 3 : Édifier, construire, guérir et transformer les vies
**Statut :** ❌ **0% COMPLÉTÉ**

**⚠️ PRIORITÉ 1 : À IMPLÉMENTER**

**Fonctionnalités à créer :**

#### A. Bibliothèque de Parcours de Transformation
- ❌ Tables SQL : `parcours_transformation`, `modules_parcours`, `user_parcours_progression`
- ❌ Page frontend avec affichage des parcours
- ❌ Système d'inscription aux parcours
- ❌ Suivi de progression

#### B. Journal Personnel de Transformation
- ❌ Table SQL : `journal_transformation`
- ❌ Interface d'édition/journal
- ❌ Recherche et filtres par date/thématique
- ❌ Export du journal

#### C. Système d'Évaluation Continue
- ❌ Table SQL : `evaluations_croissance`
- ❌ Formulaires d'évaluation
- ❌ Graphiques de progression
- ❌ Rapports de croissance

#### D. Ressources de Guérison et Restauration
- ❌ Catalogue de ressources spécialisées
- ❌ Filtrage par type de besoin
- ❌ Recommandations personnalisées

#### E. Module de Suivi Post-Crise
- ❌ Système de suivi personnalisé
- ❌ Alertes et rappels
- ❌ Historique de guérison

**Note :** Il existe déjà une page `/transformation` mais elle concerne plutôt les parcours ImpactX. L'Objectif 3 nécessite un système structuré de parcours de transformation spirituelle.

---

## 🎯 FONCTIONNALITÉS MÉTIER À FINALISER

### ⚠️ PRIORITÉ 2 : Dashboard Pasteur Spécifique

**État actuel :** Le `AdminDashboard.jsx` redirige vers `MentorDashboard` ou `DiscipleDashboard`.

**À implémenter :**

1. **Créer `PasteurDashboard.jsx`** ❌
   - Vue d'ensemble des mentors sous sa responsabilité
   - **Tableau consolidé** avec 7 colonnes :
     - Nom, Prénom (mentor)
     - Eglise (famille)
     - Nombre de disciples
     - Avancement % vers objectif 70
     - Nombre de disciples présents
     - Taux de participation semaine
   - Statistiques agrégées par famille
   - Graphiques de progression globale
   - Recherche et filtres
   - Export CSV/Excel

2. **Modifier `AdminDashboard.jsx`** ❌
   - Afficher `PasteurDashboard` si role === 'pasteur'

**Estimation :** 3-4 heures (incluant le tableau consolidé)

---

### ⚠️ PRIORITÉ 3 : Améliorations Dashboard Superviseur

**À ajouter :**

1. **Section "Mes Disciples" - Tableau détaillé** ⚠️ (partiellement fait)
   - **Tableau détaillé** avec 10 colonnes :
     - Prénom Pilier, Nom Pilier (mentor)
     - Prénom disciple, Nom disciple
     - Statut spirituel
     - Date d'ajout
     - Date dernière présence
     - Niveau d'engagement sur la période
     - Statut (Actif/Inactif) - calculé automatiquement
     - Présence au dernier culte
   - Liste complète des disciples avec filtres
   - Statistiques détaillées par disciple
   - Graphiques de progression
   - Recherche par nom/prénom

2. **Vue consolidée des mentors** ⚠️ (nouveau)
   - **Tableau consolidé** (même structure que Dashboard Pasteur)
   - Vue d'ensemble de tous les mentors de sa famille
   - Statistiques agrégées

3. **Export de rapports** ⚠️ (partiellement fait)
   - Export CSV/Excel amélioré
   - Export PDF pour rapport au pasteur
   - Formatage professionnel

**Estimation :** 3-4 heures (incluant les tableaux détaillés et consolidés)

---

### ⚠️ PRIORITÉ 4 : Amélioration Arbre Généalogique

**État actuel :** La page `GenealogicalTree.jsx` existe mais est incomplète.

**À implémenter :**

1. **Recherche Universelle** ❌
   - Rechercher une personne par nom/prénom (pasteur, superviseur, mentor, disciple)
   - Autocomplétion dans `profils` et `cercle_personnes`
   - Sélection de la personne à visualiser
   - Bouton "Mon arbre" pour revenir à l'utilisateur connecté

2. **Visualisation des Ascendants (Remontée)** ❌
   - Afficher tous les ascendants d'une personne
   - Hiérarchie : Disciple → Mentor (pilier) → Superviseur → Pasteur
   - Chaîne complète de qui a formé qui
   - Affichage vers le haut de l'arbre

3. **Amélioration Descendants (Descente)** ⚠️
   - Support multi-niveaux complets (générations successives)
   - Tous les disciples des disciples
   - Récursion complète sur plusieurs générations

4. **Vue Complète (Ascendants + Descendants)** ❌
   - Mode "Vue complète" : ascendants + descendants
   - Personne sélectionnée au centre
   - Ascendants en haut, descendants en bas

5. **Panneau de Détails** ❌
   - Informations complètes de chaque personne
   - Actions rapides (voir profil, contacter)
   - Navigation vers page de détail

**Fichiers à créer/modifier :**
- `src/lib/genealogicalUtils.js` - Fonctions de recherche et récursion
- `src/components/GenealogicalTree/SearchBar.jsx` - Barre de recherche
- `src/components/GenealogicalTree/PersonDetails.jsx` - Panneau de détails
- `src/pages/GenealogicalTree.jsx` - Améliorer avec recherche et ascendants

**Estimation :** 15-19 heures

---

### ⚠️ PRIORITÉ 5 : Intégration Système de Rapports

**État actuel :** La page `SendReport.jsx` existe mais n'est pas intégrée.

**À implémenter :**

1. **Flux Superviseur → Pasteur** ❌
   - Le superviseur peut envoyer des rapports mensuels
   - Pré-remplissage automatique du pasteur de tutelle
   - Validation et envoi

2. **Vue Pasteur** ❌
   - Section "Rapports Reçus" dans le dashboard
   - Liste des rapports par superviseur
   - Filtres par mois/année

3. **Notifications** ❌
   - Notifier le pasteur quand un rapport est envoyé
   - Notifier le superviseur quand le rapport est consulté

**Estimation :** 2-3 heures

---

## 🔧 AMÉLIORATIONS OPTIONNELLES

### 🟢 Basse Priorité

1. **Leaderboard d'engagement**
   - Page de classement global
   - Filtres par période
   - Affichage des top performers

2. **Objectifs personnalisés mensuels**
   - Définition d'objectifs par utilisateur
   - Suivi de progression
   - Rappels automatiques

3. **Job/Cron pour automatisation**
   - Recalcul automatique des scores mensuels
   - Nettoyage automatique des notifications expirées
   - Génération de rapports automatiques

4. **Export PDF/CSV avancé**
   - Templates professionnels
   - Graphiques inclus
   - Personnalisation

5. **Notifications push**
   - Notifications navigateur
   - Emails automatiques
   - SMS optionnel

---

## 📈 RÉSUMÉ DES PRIORITÉS

| Priorité | Fonctionnalité | Statut | Estimation | Objectif OKR |
|----------|---------------|--------|------------|--------------|
| 🔴 **URGENT** | Objectif 3 - Système de Transformation | ❌ 0% | 8-10h | OKR Principal |
| 🟡 **IMPORTANT** | Dashboard Pasteur (avec tableau consolidé) | ❌ Non créé | 3-4h | Métier |
| 🟡 **IMPORTANT** | Améliorations Dashboard Superviseur (tableaux détaillés) | ⚠️ Partiel | 3-4h | Métier |
| 🟡 **IMPORTANT** | Amélioration Arbre Généalogique (recherche + ascendants + vue complète) | ⚠️ Partiel | 15-19h | Métier |
| 🟡 **IMPORTANT** | Intégration Rapports | ❌ Partiel | 2-3h | Métier |
| 🟢 **OPTIONNEL** | Leaderboard d'engagement | ❌ Non créé | 2h | Optionnel |
| 🟢 **OPTIONNEL** | Objectifs personnalisés | ❌ Non créé | 3h | Optionnel |
| 🟢 **OPTIONNEL** | Jobs/Cron automatisation | ❌ Non créé | 2h | Optionnel |

---

## 📊 ANALYSE DES TABLEAUX À IMPLÉMENTER

### 📋 Premier Tableau : Vue consolidée des mentors/familles

**Utilisation :** Dashboard Pasteur ou Superviseur - Vue d'ensemble

**Colonnes identifiées :**
1. **Nom** - Nom de famille du mentor
2. **Prénom** - Prénom du mentor
3. **Eglise** - Nom de l'église/famille de disciples
4. **Nombre de disciples** - Total de disciples dans la famille
5. **Avancement (%) par rapport à l'objectif de 70** - Progression vers l'objectif de 70 disciples (0-100%)
6. **Nombre de disciples présents à l'église** - Total de disciples présents récemment
7. **Taux de participation de la semaine en cours (%)** - Taux de participation hebdomadaire

**Structure de données nécessaire :**
```javascript
{
  mentor_id: string,
  nom: string,              // Nom de famille du mentor
  prenom: string,           // Prénom du mentor
  eglise: string,           // Nom de la famille
  nombre_disciples: number, // Total de disciples
  avancement_pourcentage: number, // % vers objectif 70
  disciples_presents: number,     // Présents à l'église
  taux_participation_semaine: number // % participation semaine
}
```

**Fonctionnalités à développer :**
- Calcul de l'avancement vers 70 disciples par mentor/famille
- Calcul du taux de participation hebdomadaire
- Agrégation des données par mentor/famille
- Filtres et recherche

---

### 📋 Deuxième Tableau : Vue détaillée par disciple

**Utilisation :** Dashboard Superviseur/Mentor - Vue détaillée de la famille

**Colonnes identifiées :**

**Section gauche (Informations Mentor/Pilier) :**
1. **Prénom Pilier** - Prénom du mentor (pilier)
2. **Nom Pilier** - Nom de famille du mentor (pilier)
3. **Prénom disciple** - Prénom du disciple
4. **Nom disciple** - Nom de famille du disciple
5. **Statut** - Statut spirituel (Non-croyant, Nouveau converti, Affermi, Faiseur de Disciples)

**Section droite (Informations de suivi) :**
6. **Date d'ajout** - Date d'inscription/ajout du disciple
7. **Date dernière présence** - Date de la dernière présence enregistrée
8. **Niveau d'engagement sur la période** - Niveau d'engagement calculé
9. **Statut (Actif/Inactif)** - État actif ou inactif du disciple
10. **Présence au dernier culte** - Présence oui/non au dernier culte

**Structure de données nécessaire :**
```javascript
{
  mentor_prenom: string,           // Mentor prénom (pilier)
  mentor_nom: string,              // Mentor nom (pilier)
  disciple_prenom: string,         // Disciple prénom
  disciple_nom: string,            // Disciple nom
  statut_spirituel: string,        // Statut (Non-croyant, etc.)
  date_ajout: Date,                // Date d'inscription
  date_derniere_presence: Date,    // Dernière présence
  niveau_engagement: string/number, // Engagement
  statut_actif: boolean,           // Actif/Inactif
  presence_dernier_culte: boolean  // Présent dernier culte
}
```

**Fonctionnalités à développer :**
- Calcul du niveau d'engagement par disciple
- Détection automatique Actif/Inactif basée sur la dernière présence (>3 mois = inactif)
- Suivi des présences au dernier culte
- Affichage des disciples avec leur mentor respectif
- Filtres par statut, actif/inactif, présence
- Recherche par nom/prénom

---

### 🎯 Où implémenter ces tableaux

#### Premier Tableau (Vue consolidée) :
- **Dashboard Pasteur** (`PasteurDashboard.jsx`) - À créer
  - Vue d'ensemble de tous les mentors sous sa responsabilité
  - Statistiques agrégées par famille
- **Dashboard Superviseur** (`SuperviseurDashboard.jsx`) - À ajouter
  - Vue d'ensemble de tous les mentors de sa famille
  - Statistiques consolidées

#### Deuxième Tableau (Vue détaillée) :
- **Dashboard Superviseur** (`SuperviseurDashboard.jsx`) - À ajouter
  - Section "Mes Disciples" avec tableau détaillé
  - Suivi individuel de chaque disciple
- **Dashboard Mentor** (`MentorDashboard.jsx`) - À ajouter
  - Liste détaillée des disciples suivis
  - Informations de suivi par disciple

---

## 🎯 PROCHAINES ÉTAPES RECOMMANDÉES

### Option 1 : Compléter l'Objectif 3 (OKR Principal) 🔴

**Avantages :**
- Complète les 3 objectifs OKR principaux
- Système structuré de transformation spirituelle
- Fonctionnalité majeure pour les utilisateurs

**Étapes :**
1. Créer les 5 tables SQL nécessaires
2. Créer les migrations SQL
3. Créer/améliorer la page `/transformation`
4. Implémenter la bibliothèque de parcours
5. Créer le journal de transformation
6. Implémenter le système d'évaluation

**Estimation totale :** 8-10 heures

---

### Option 2 : Finaliser les Fonctionnalités Métier 🟡

**Avantages :**
- Améliore l'expérience des pasteurs et superviseurs
- Système de rapports fonctionnel
- Dashboards complets

**Étapes :**
1. Créer `PasteurDashboard.jsx` avec tableau consolidé (7 colonnes)
2. Améliorer `SuperviseurDashboard.jsx` avec :
   - Tableau détaillé des disciples (10 colonnes)
   - Tableau consolidé des mentors
3. Intégrer le système de rapports

**Estimation totale :** 8-11 heures (incluant les tableaux complets)

---

## 📊 PROGRESSION GLOBALE

**Objectifs OKR :** 2/3 complétés (66%)

**Fonctionnalités Métier :** ~80% complétées

**Optimisations Techniques :** 100% complétées ✅

**Progression globale du projet :** ~75%

---

## 💡 RECOMMANDATION

**Commencer par l'Objectif 3 (OKR Principal)** car :
1. C'est le dernier objectif OKR majeur à compléter
2. Fonctionnalité importante pour les utilisateurs
3. Système structuré et complet à créer
4. Impact significatif sur l'expérience utilisateur

**Puis finaliser les fonctionnalités métier** pour avoir une application complète et professionnelle.

---

## 🌳 ARBRE GÉNÉALOGIQUE - Fonctionnalité à Améliorer

### 📋 Description de la Fonctionnalité

**État actuel :** Une page `GenealogicalTree.jsx` existe déjà mais elle :
- ✅ Affiche les descendants à partir de l'utilisateur connecté
- ✅ Vue Desktop (arbre récursif) et Mobile (drill-down)
- ❌ Ne permet pas de rechercher une autre personne
- ❌ Ne montre pas les ascendants (remontée)
- ❌ Limite aux disciples directs (pas de vue complète multi-niveaux)

**Objectif :** Améliorer cette page pour permettre de visualiser la hiérarchie complète (ascendants ET descendants) de n'importe quelle personne en tapant son nom.

**Fonctionnalités requises :**

#### A. Recherche par Nom
- Recherche d'une personne (pasteur, superviseur, mentor, ou disciple)
- Autocomplétion avec suggestion des noms
- Affichage des résultats multiples si plusieurs correspondances

#### B. Visualisation des Ascendants (Remontée)
- Afficher tous les ascendants d'une personne
- Hiérarchie : Disciple → Mentor → Superviseur → Pasteur
- Chaîne complète de qui a formé qui
- Affichage en format arbre remontant vers le haut

#### C. Visualisation des Descendants (Descente)
- Afficher tous les descendants d'une personne
- Tous les disciples formés directement ou indirectement
- Tous les disciples des disciples (générations successives)
- Affichage en format arbre descendant vers le bas

#### D. Détails de Chaque Personne
- Carte d'information pour chaque personne dans l'arbre
- Informations : Nom, Prénom, Rôle, Date d'inscription, Statut spirituel
- Lien vers la page de détail complète
- Actions rapides : Voir profil, Contacter, etc.

---

### 🔍 Structure de Données Nécessaire

#### Relations Hiérarchiques Identifiées :

1. **Pasteur → Superviseur**
   - Table : `profils`
   - Relation : `pasteur_id` dans `profils` (role='superviseur')

2. **Superviseur → Mentor/Famille**
   - Table : `familles_disciples`
   - Relation : `superviseur_id` dans `familles_disciples`
   - Table : `cercle_personnes`
   - Relation : `user_id` = superviseur_id (parent direct)

3. **Mentor → Disciple**
   - Table : `cercle_personnes`
   - Relation : `parent_disciple_id` = mentor_id
   - Table : `profils`
   - Relation : `famille_id` pour disciples dans famille

4. **Disciple → Disciple (Générations)**
   - Table : `cercle_personnes`
   - Relation : `parent_disciple_id` (chaîne de formation)

#### Requêtes SQL Nécessaires :

**Pour remonter (ascendants) :**
```sql
-- Remonter depuis un disciple jusqu'au pasteur
WITH RECURSIVE ascendants AS (
  -- Cas de base : le disciple initial
  SELECT id, parent_disciple_id, user_id, first_name, last_name, role
  FROM cercle_personnes 
  WHERE id = :disciple_id
  
  UNION ALL
  
  -- Récursion : remonter vers le parent
  SELECT cp.id, cp.parent_disciple_id, cp.user_id, cp.first_name, cp.last_name, cp.role
  FROM cercle_personnes cp
  INNER JOIN ascendants a ON cp.id = a.parent_disciple_id
)
SELECT * FROM ascendants;
```

**Pour descendre (descendants) :**
```sql
-- Descendre depuis un mentor jusqu'à tous les disciples
WITH RECURSIVE descendants AS (
  -- Cas de base : disciples directs
  SELECT id, parent_disciple_id, user_id, first_name, last_name, role
  FROM cercle_personnes 
  WHERE parent_disciple_id = :mentor_id
  
  UNION ALL
  
  -- Récursion : descendre vers les disciples des disciples
  SELECT cp.id, cp.parent_disciple_id, cp.user_id, cp.first_name, cp.last_name, cp.role
  FROM cercle_personnes cp
  INNER JOIN descendants d ON cp.parent_disciple_id = d.id
)
SELECT * FROM descendants;
```

---

### 🎨 Interface Utilisateur Proposée

#### Layout de la Page :

1. **Barre de Recherche en Haut**
   - Input de recherche avec autocomplétion
   - Filtre par rôle (Pasteur, Superviseur, Mentor, Disciple)
   - Bouton de recherche

2. **Sélection du Mode d'Affichage**
   - Toggle ou Tabs : "Ascendants" / "Descendants" / "Les Deux"
   - Option : "Vue Compacte" / "Vue Détaillée"

3. **Visualisation de l'Arbre**
   - Bibliothèque : **React Flow** ou **D3.js** ou **vis.js**
   - Nœuds : Carte avec nom, prénom, rôle, avatar
   - Lignes : Relations hiérarchiques
   - Interactivité : Zoom, Pan, Sélection

4. **Panneau de Détails Latéral**
   - Affiche les détails de la personne sélectionnée
   - Informations complètes
   - Actions rapides

5. **Filtres et Options**
   - Filtrer par rôle
   - Filtrer par statut spirituel
   - Limiter le nombre de niveaux affichés
   - Option d'export (PNG, SVG, PDF)

---

### 📁 Fichiers à Créer/Modifier

#### À Créer :

1. **Nouveau Fichier :** `src/lib/genealogicalUtils.js` ❌
   - Fonction `searchPerson()` - Recherche de personne (pasteur, superviseur, mentor, disciple)
   - Fonction `getAscendants()` - Récupération des ascendants (remontée)
   - Fonction `getDescendants()` - Amélioration récupération descendants (multi-niveaux)
   - Fonction `buildTreeData()` - Construction de l'arbre de données complet
   - Fonction `buildAscendantTree()` - Construction arbre ascendants
   - Fonction `buildCompleteTree()` - Construction arbre complet (ascendants + descendants)

2. **Nouveau Fichier :** `src/components/GenealogicalTree/PersonNode.jsx` ❌
   - Composant pour afficher un nœud (carte d'une personne)
   - Version desktop et mobile
   - Intégration avec panneau de détails

3. **Nouveau Fichier :** `src/components/GenealogicalTree/PersonDetails.jsx` ❌
   - Panneau de détails latéral
   - Informations complètes de la personne
   - Actions rapides (voir profil, contacter)

4. **Nouveau Fichier :** `src/components/GenealogicalTree/SearchBar.jsx` ❌
   - Barre de recherche avec autocomplétion
   - Gestion des résultats multiples
   - Filtres par rôle (pasteur, superviseur, mentor, disciple)

#### À Modifier :

1. **Modifier :** `src/pages/GenealogicalTree.jsx` ⚠️
   - Ajouter recherche de personne (rechercher n'importe qui par nom)
   - Ajouter visualisation des ascendants (remontée complète)
   - Améliorer visualisation des descendants (support multi-niveaux complets)
   - Ajouter mode "Vue complète" (ascendants + descendants)
   - Ajouter panneau de détails avec informations complètes
   - Améliorer gestion des rôles (pasteur → superviseur → mentor → disciple)
   - Clarifier que "pilier" = "mentor" dans l'affichage

2. **Vérifier :** `src/App.jsx` ✅
   - Route `/genealogical-tree` probablement déjà existante

3. **Vérifier :** `src/components/Layout.jsx` ✅
   - Lien dans la sidebar probablement déjà existant

---

### 🔧 Fonctionnalités Techniques

#### A. Requêtes Récursives avec Supabase
- Utiliser `WITH RECURSIVE` pour les CTEs récursifs
- Fonction PostgreSQL personnalisée si nécessaire
- Cache des résultats pour améliorer les performances

#### B. Bibliothèque de Visualisation

**Option 1 : React Flow** (Recommandé)
- Facile à intégrer avec React
- Interactivité native
- Support du zoom/pan
- Installation : `npm install reactflow`

**Option 2 : D3.js**
- Plus de contrôle
- Plus complexe
- Meilleures performances pour grands arbres

**Option 3 : vis.js (vis-network)**
- Spécialisé pour les graphes
- Bonnes performances
- Facile à utiliser

#### C. Performance
- Lazy loading pour les grands arbres
- Limite par défaut de 3-4 niveaux
- Option "Charger plus" pour aller plus loin
- Cache des résultats de recherche

---

### 📊 Structure des Données pour l'Arbre

```javascript
// Structure d'un nœud dans l'arbre
{
  id: string,                    // ID unique
  type: 'person',                // Type de nœud
  data: {
    personId: string,            // ID de la personne
    firstName: string,
    lastName: string,
    role: 'pasteur' | 'superviseur' | 'mentor' | 'disciple',
    avatarUrl: string | null,
    statutSpirituel: string,
    dateInscription: Date,
    familleId: string | null,
    // Informations additionnelles
    nombreDisciples: number,     // Nombre de disciples directs
    niveau: number               // Niveau dans la hiérarchie (0 = racine)
  },
  position: { x: number, y: number } // Position dans l'arbre
}

// Structure d'une relation
{
  id: string,                    // ID unique de la relation
  source: string,                // ID du parent
  target: string,                // ID de l'enfant
  type: 'straight' | 'smoothstep' | 'step',
  label: string,                 // Optionnel : label de la relation
  animated: boolean              // Animation optionnelle
}
```

---

### 🎯 Étapes d'Implémentation

#### Phase 1 : Recherche et Sélection (2h)
1. Créer composant SearchBar avec autocomplétion
2. Rechercher dans `profils` (pasteurs, superviseurs, mentors, disciples)
3. Rechercher dans `cercle_personnes` (disciples, mentors)
4. Gérer sélection de personne et changement de racine de l'arbre

#### Phase 2 : Récupération Ascendants (3-4h)
1. Créer fonction JavaScript `getAscendants()` pour remonter la hiérarchie
2. Remonter : Disciple → Mentor (via parent_disciple_id ou user_id) → Superviseur → Pasteur
3. Construire arbre de données ascendants
4. Adapter TreeNode pour afficher ascendants (haut de l'arbre)
5. Tester avec différents cas (disciple → pasteur complet)

#### Phase 3 : Amélioration Descendants (2h)
1. Améliorer fonction getDescendants() existante pour support multi-niveaux complets
2. Utiliser récursion complète pour tous les niveaux
3. Tester récursion complète (disciple → tous ses descendants sur plusieurs générations)
4. Limiter profondeur avec paramètre configurable

#### Phase 4 : Visualisation Ascendants (3h)
1. Adapter TreeNode pour afficher ascendants (vers le haut)
2. Adapter DesktopTreeView pour vue bidirectionnelle (haut = ascendants, bas = descendants)
3. Adapter MobileTreeView pour navigation vers parents (bouton "Voir mentor" / "Voir superviseur")
4. Tester navigation bidirectionnelle

#### Phase 5 : Vue Complète (2h)
1. Mode "Vue complète" : combiner ascendants + descendants
2. Personne sélectionnée au centre
3. Ascendants en haut, descendants en bas
4. Toggle entre modes (Ascendants / Descendants / Complet)

#### Phase 6 : Panneau de Détails (2h)
1. Créer composant PersonDetails
2. Afficher informations complètes (rôle, statut, famille, date inscription, etc.)
3. Actions rapides (voir profil, contacter)
4. Navigation vers page de détail (`/disciples/:id` ou `/profile/:id`)

#### Phase 7 : Polissage (1-2h)
1. Filtres et options (par rôle, statut spirituel)
2. Export PNG/SVG de l'arbre
3. Animations et transitions
4. Tests fonctionnels complets

**Estimation totale :** 15-19 heures

---

### 📋 Checklist d'Implémentation

#### Backend/Données
- [ ] Créer fonction SQL récursive pour ascendants (optionnel, peut être fait en JS)
- [ ] Créer fonction JavaScript `searchPerson()` (recherche dans profils + cercle_personnes)
- [ ] Créer fonction JavaScript `getAscendants()` (remontée complète)
- [ ] Améliorer fonction `getDescendants()` existante (multi-niveaux complets)
- [ ] Créer fonction `buildTreeData()` pour arbre complet (ascendants + descendants)

#### Frontend - Recherche
- [ ] Composant SearchBar avec autocomplétion
- [ ] Recherche dans profils (pasteurs, superviseurs, mentors, disciples)
- [ ] Recherche dans cercle_personnes (disciples, mentors)
- [ ] Gestion résultats multiples avec sélection
- [ ] Bouton "Mon arbre" pour revenir à l'utilisateur connecté

#### Frontend - Visualisation Ascendants
- [ ] Fonction pour construire arbre ascendants
- [ ] Adapter TreeNode pour afficher ascendants (vers le haut)
- [ ] Construction arbre ascendants avec tous les niveaux
- [ ] Affichage dans DesktopTreeView (haut de l'arbre)
- [ ] Navigation vers parents dans MobileTreeView (boutons "Voir mentor/superviseur/pasteur")

#### Frontend - Amélioration Descendants
- [ ] Améliorer getDescendants() (support multi-niveaux complets)
- [ ] Tester récursion complète sur plusieurs générations
- [ ] Limiter profondeur avec paramètre configurable
- [ ] Option "Charger plus" pour niveaux additionnels

#### Frontend - Vue Complète
- [ ] Mode "Vue complète" (ascendants + descendants)
- [ ] Personne sélectionnée au centre
- [ ] Ascendants en haut, descendants en bas
- [ ] Toggle entre modes (Ascendants / Descendants / Complet)
- [ ] Disposition bidirectionnelle de l'arbre

#### Frontend - Détails
- [ ] Panneau de détails latéral (PersonDetails)
- [ ] Informations complètes (rôle, statut, famille, date, etc.)
- [ ] Actions rapides (voir profil, contacter)
- [ ] Navigation vers page de détail
- [ ] Affichage au clic sur un nœud

#### Frontend - Interactivité
- [ ] Sélection de nœud → afficher détails dans panneau
- [ ] Zoom/Pan (déjà existant, à maintenir)
- [ ] Filtres visuels (par rôle, statut spirituel)
- [ ] Export PNG/SVG de l'arbre
- [ ] Limiter niveaux affichés avec slider

#### Intégration
- [ ] Route dans App.jsx (vérifier si existe déjà)
- [ ] Lien dans Layout.jsx (vérifier si existe déjà)
- [ ] Tests fonctionnels complets

---

### 💡 Recommandations Techniques

1. **Bibliothèque :** React Flow (recommandé)
   - Facile à intégrer
   - Bonne documentation
   - Support communautaire actif

2. **Performance :**
   - Limiter à 3-4 niveaux par défaut
   - Lazy loading pour niveaux additionnels
   - Cache des résultats

3. **UX :**
   - Mode "Vue compacte" pour grands arbres
   - Indicateur de chargement
   - Message si aucun résultat

4. **Accessibilité :**
   - Navigation au clavier
   - Contraste suffisant
   - Labels ARIA

---

### 💡 Notes Importantes

1. **Hiérarchie Complexe :** La structure actuelle mélange `profils` et `cercle_personnes`. Il faut gérer les deux sources dans la remontée :
   - Disciple (cercle_personnes) → Mentor (via parent_disciple_id OU user_id) → Superviseur (profils) → Pasteur (profils)

2. **Terminologie :** "Pilier" = "Mentor" dans l'affichage. Utiliser "Mentor" dans l'interface.

3. **Performance :** Pour de grands arbres, limiter à 3-4 niveaux par défaut avec option "Charger plus" pour niveaux additionnels.

4. **UX :** 
   - Mode "Vue compacte" pour grands arbres
   - Indicateur de chargement
   - Message si aucun résultat
   - Bouton "Revenir à mon arbre" pour revenir à l'utilisateur connecté

5. **Cas Spéciaux :**
   - Personne sans parents (racine = pasteur)
   - Personne sans descendants
   - Relations complexes entre profils et cercle_personnes

---

**Dernière mise à jour :** Après analyse arbre généalogique complète (recherche + ascendants)  
**Prochaine révision :** Après implémentation des améliorations
