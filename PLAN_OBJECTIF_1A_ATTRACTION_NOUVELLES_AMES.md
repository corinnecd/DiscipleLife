# 📋 PLAN D'IMPLÉMENTATION - OBJECTIF 1A : Attirer les nouvelles âmes

**Date:** $(date)  
**Status:** En attente de validation

---

## 🎯 OBJECTIF ET KEY RESULTS

### Objectif 1A: Attirer les nouvelles âmes

**Key Results (KR) - 3 mois :**
- **KR1A.1** : Attirer **800 nouvelles âmes** d'ici 3 mois
- **KR1A.2** : **25% des nouvelles âmes** répondent à l'appel (si 25% répondent, il faut amener 4 fois plus)

**Mesures hebdomadaires :**
- Nombre de nouvelles âmes contactées
- Nombre de nouvelles âmes présentes au culte
- Taux de conversion (visiteurs → nouveaux convertis)

---

## 📊 ÉTAT ACTUEL (Ce qui existe déjà)

### Tables SQL existantes :
✅ `visiteurs` - existe (créée dans 001_objectif1_evangelisation_tables.sql)
✅ `campagnes_evangelisation` - existe
✅ `campagne_visiteurs` - existe
✅ `codes_invitation` - existe (créée dans 002_objectif1_codes_invitation.sql)
✅ `invitations_envoyees` - existe

### Fonctionnalités Frontend existantes :
✅ Page "Évangélisation" (`/evangelization`) - existe
✅ Système de parrainage/invitation avec codes QR - existe
✅ Partage sur réseaux sociaux - existe
✅ Dashboard évangélisation avec statistiques de base - existe partiellement
✅ Gestion CRUD des visiteurs - existe
✅ Gestion CRUD des campagnes - existe
✅ Module "Retour des Éloignés" - existe

---

## ✅ CE QUI DOIT ÊTRE AJOUTÉ/MODIFIÉ

### 1. MODIFICATIONS TABLES SQL

#### A. Modifier table `visiteurs`
- Ajouter champ `type` : TEXT avec valeurs possibles 'nouvelle_ame' ou 'ancien_eloigne'
- Valeur par défaut : 'nouvelle_ame'
- Migration SQL nécessaire

#### B. Nouvelle table `evenements_evangelisation`
```sql
CREATE TABLE evenements_evangelisation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  description TEXT,
  type_evenement TEXT CHECK (type_evenement IN ('thematique', 'banque_alimentaire', 'solidarite', 'agape', 'autre')),
  date_evenement DATE NOT NULL,
  heure_debut TIME,
  heure_fin TIME,
  lieu TEXT,
  responsable_id UUID REFERENCES profils(id),
  objectif_participants INTEGER,
  nombre_participants INTEGER DEFAULT 0,
  nombre_nouvelles_ames INTEGER DEFAULT 0,
  statut TEXT DEFAULT 'planifie' CHECK (statut IN ('planifie', 'en_cours', 'termine', 'annule')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes :**
- Index sur `date_evenement`
- Index sur `type_evenement`
- Index sur `responsable_id`
- Index sur `statut`

**RLS Policies :**
- SELECT : Tous les utilisateurs authentifiés
- INSERT/UPDATE/DELETE : Admins et responsables

#### C. Table de liaison `evenement_visiteurs`
```sql
CREATE TABLE evenement_visiteurs (
  evenement_id UUID REFERENCES evenements_evangelisation(id) ON DELETE CASCADE,
  visiteur_id UUID REFERENCES visiteurs(id) ON DELETE CASCADE,
  date_inscription TIMESTAMP DEFAULT NOW(),
  present BOOLEAN DEFAULT false,
  date_presence TIMESTAMP,
  PRIMARY KEY (evenement_id, visiteur_id)
);
```

**Indexes :**
- Index sur `evenement_id`
- Index sur `visiteur_id`
- Index sur `present`

#### D. Table pour tracking Banque Alimentaire / Solidarité
```sql
CREATE TABLE activites_solidarite (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_activite TEXT CHECK (type_activite IN ('banque_alimentaire', 'solidarite', 'autre')),
  date_activite DATE NOT NULL,
  nombre_personnes_services INTEGER DEFAULT 0,
  nombre_nouvelles_ames INTEGER DEFAULT 0,
  responsable_id UUID REFERENCES profils(id),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes :**
- Index sur `type_activite`
- Index sur `date_activite`
- Index sur `responsable_id`

---

### 2. FONCTIONNALITÉS FRONTEND À AJOUTER/AMÉLIORER

#### A. Dashboard Évangélisation - KPIs pour Objectif 1A

**Nouveaux KPIs à afficher :**
1. **Total nouvelles âmes contactées** (sur période sélectionnée)
2. **Total nouvelles âmes présentes au culte** (sur période)
3. **Taux de conversion** (nouvelles âmes présentes / nouvelles âmes contactées)
4. **Progression vers KR1A.1** : X/800 nouvelles âmes (barre de progression)
5. **Progression vers KR1A.2** : X% répondent à l'appel (avec cible 25%)
6. **Graphique hebdomadaire** : Nouvelles âmes contactées par semaine
7. **Graphique hebdomadaire** : Nouvelles âmes présentes par semaine

**Section dédiée "Objectif 1A - Key Results" :**
- Affichage des KR avec progression
- Alertes si objectifs en retard
- Recommandations (ex: "Pour atteindre 800, il faut X nouvelles âmes cette semaine")

#### B. Module "Événements Thématiques"

**Nouvel onglet dans la page Évangélisation :**
- Liste des événements (filtrés par type, date, statut)
- Formulaire création/édition événement
- Types d'événements :
  - Événement thématique
  - Banque alimentaire
  - Solidarité
  - Agape
  - Autre
- Champs :
  - Nom, description
  - Type d'événement
  - Date, heure début/fin
  - Lieu
  - Responsable (sélection depuis profils)
  - Objectif participants
  - Nombre participants (saisie manuelle)
  - Nombre nouvelles âmes (saisie manuelle)
  - Statut
  - Notes

**Fonctionnalités :**
- Lier des visiteurs à un événement
- Marquer la présence des visiteurs
- Statistiques par événement
- Export données

#### C. Module "Banque Alimentaire / Solidarité"

**Nouvel onglet dans la page Évangélisation :**
- Liste des activités de solidarité
- Formulaire création/édition activité
- Types :
  - Banque alimentaire
  - Solidarité
  - Autre
- Champs :
  - Type d'activité
  - Date
  - Nombre de personnes servies
  - Nombre de nouvelles âmes (dérivé des personnes servies)
  - Responsable
  - Description

**Fonctionnalités :**
- Statistiques par type d'activité
- Graphique évolution dans le temps
- Lien avec visiteurs (qui a été servi)

#### D. Amélioration Formulaire Visiteurs

**Modifications :**
- Ajouter champ "Type" : Nouvelle âme / Ancien éloigné (select)
- Par défaut : "Nouvelle âme"
- Filtre par type dans la liste

#### E. Amélioration Dashboard Global

**Section "Objectifs OKR" :**
- Card dédiée Objectif 1A
- Progression vers 500 nouvelles âmes (barre de progression)
- Taux de réponse actuel (vs 25% cible)
- Graphiques hebdomadaires
- Alertes et recommandations

---

### 3. CALCULS ET LOGIQUE MÉTIER

#### A. Identification "Nouvelle âme" vs "Ancien éloigné"
- Champ `type` dans table `visiteurs`
- Par défaut : 'nouvelle_ame'
- Si statut = 'eloigne' → type = 'ancien_eloigne' (mais Objectif 1B)

#### B. Calcul des KPIs

**Nouvelles âmes contactées :**
- Comptage visiteurs avec `type = 'nouvelle_ame'` et `date_premier_contact` dans la période

**Nouvelles âmes présentes au culte :**
- Comptage visiteurs avec `type = 'nouvelle_ame'` et présence enregistrée dans `attendance_records` ou via événements

**Taux de conversion :**
- (Nouvelles âmes présentes / Nouvelles âmes contactées) * 100

**Progression KR1A.1 :**
- COUNT(visiteurs WHERE type = 'nouvelle_ame' AND date_premier_contact >= DATE_DÉBUT_OBJECTIF) / 800 * 100

**Progression KR1A.2 :**
- (COUNT(visiteurs présents) / COUNT(visiteurs contactées)) * 100
- Comparaison avec 25%

---

### 4. STRUCTURE DES FICHIERS

#### Migrations SQL :
- `sql/migrations/003_objectif1a_nouvelles_ames.sql` (nouvelle migration)
  - Ajouter champ `type` à `visiteurs`
  - Créer table `evenements_evangelisation`
  - Créer table `evenement_visiteurs`
  - Créer table `activites_solidarite`
  - Créer indexes
  - Créer RLS policies
  - Créer trigger `updated_at`

#### Frontend :
- Modifier `src/pages/Evangelization.jsx`
  - Ajouter onglet "Événements"
  - Ajouter onglet "Solidarité"
  - Améliorer Dashboard avec KPIs Objectif 1A
  - Modifier formulaire visiteurs (ajouter champ type)
  - Ajouter calculs et graphiques

---

## 📝 CHECKLIST D'IMPLÉMENTATION

### Phase 1 : Base de données
- [ ] Créer migration SQL `003_objectif1a_nouvelles_ames.sql`
  - [ ] Ajouter champ `type` à table `visiteurs`
  - [ ] Créer table `evenements_evangelisation`
  - [ ] Créer table `evenement_visiteurs`
  - [ ] Créer table `activites_solidarite`
  - [ ] Créer indexes
  - [ ] Créer RLS policies
  - [ ] Créer triggers `updated_at`
  - [ ] Tester la migration

### Phase 2 : Backend/Queries
- [ ] Créer fonctions de récupération événements
- [ ] Créer fonctions de récupération activités solidarité
- [ ] Créer fonctions de calcul KPIs Objectif 1A
- [ ] Créer fonctions de liaison événement-visiteur

### Phase 3 : Frontend - Événements
- [ ] Ajouter onglet "Événements" dans Evangelization.jsx
- [ ] Créer composant liste événements
- [ ] Créer formulaire création/édition événement
- [ ] Créer fonctionnalité liaison visiteurs-événements
- [ ] Créer fonctionnalité marquage présence

### Phase 4 : Frontend - Solidarité
- [ ] Ajouter onglet "Solidarité" dans Evangelization.jsx
- [ ] Créer composant liste activités solidarité
- [ ] Créer formulaire création/édition activité
- [ ] Créer statistiques solidarité

### Phase 5 : Frontend - Dashboard & KPIs
- [ ] Améliorer Dashboard avec section Objectif 1A
- [ ] Ajouter KPIs (nouvelles âmes contactées, présentes, taux conversion)
- [ ] Ajouter barres de progression KR1A.1 et KR1A.2
- [ ] Ajouter graphiques hebdomadaires
- [ ] Ajouter alertes et recommandations

### Phase 6 : Frontend - Améliorations Visiteurs
- [ ] Ajouter champ "Type" dans formulaire visiteurs
- [ ] Ajouter filtre par type dans liste visiteurs
- [ ] Mettre à jour logique création/édition visiteurs

### Phase 7 : Tests & Validation
- [ ] Tester création événements
- [ ] Tester liaison visiteurs-événements
- [ ] Tester création activités solidarité
- [ ] Tester calculs KPIs
- [ ] Tester affichage Dashboard
- [ ] Valider avec utilisateurs

---

## ⚠️ POINTS D'ATTENTION

1. **Données existantes** : Les visiteurs existants n'ont pas de champ `type`. Il faudra :
   - Définir une valeur par défaut (probablement 'nouvelle_ame')
   - Ou permettre migration manuelle

2. **Performance** : Les calculs de KPIs peuvent être lourds. Considérer :
   - Mise en cache des résultats
   - Calculs périodiques (cron jobs)
   - Indexes appropriés

3. **RLS Policies** : S'assurer que les RLS policies permettent :
   - Aux responsables de voir/modifier leurs événements
   - Aux admins de tout voir/modifier
   - Aux utilisateurs authentifiés de voir les événements publics

4. **Validation** : S'assurer que :
   - Les dates d'événements sont logiques
   - Les nombres (participants, nouvelles âmes) sont cohérents
   - Les types d'événements sont valides

---

## 🎯 RÉSULTAT ATTENDU

À la fin de l'implémentation de l'Objectif 1A, nous aurons :

1. ✅ Système complet de tracking des nouvelles âmes
2. ✅ Système de gestion des événements thématiques
3. ✅ Système de tracking banque alimentaire/solidarité
4. ✅ Dashboard avec KPIs Objectif 1A et Key Results
5. ✅ Graphiques et statistiques hebdomadaires
6. ✅ Outils pour mesurer la progression vers 800 nouvelles âmes et 25% de réponse

---

**STATUS : En attente de validation**

Validez-vous ce plan d'implémentation pour l'Objectif 1A ? Des modifications ou ajouts sont-ils nécessaires avant de commencer l'implémentation ?

