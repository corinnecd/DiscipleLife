# RAPPORT D'ANALYSE - IMPLÉMENTATION DU SYSTÈME "DISCIPLES 70"

## 📋 RÉSUMÉ EXÉCUTIF

Ce rapport analyse les exigences pour implémenter le système de gestion des "Familles de Disciples de 70" dans l'application DiscipleLife. Cette nouvelle fonctionnalité nécessite une restructuration majeure du système de rôles, de la hiérarchie des utilisateurs, et l'ajout de fonctionnalités de suivi statistique avancées.

**⚠️ PRIORITÉ :** La page de présence est identifiée comme une page critique pour les objectifs. Elle doit être améliorée en partant de la page existante `AttendanceTracking.jsx` pour créer un dashboard complet avec 9 types d'activités de présence (Culte dimanche matin, Culte samedi soir, Partage de la Parole, Prière, ComFrat des Familles, Veillée, Sorties d'Évangélisation, Retraites, Challenges) et une section spéciale pour les sujets de prières des membres, avec des statistiques détaillées par famille.

---

## 🎯 OBJECTIFS IDENTIFIÉS

### 1. Structure Hiérarchique Multi-Niveaux
- **Super Admin** : Accès total à l'application
- **Admin** : Vue Admin + Vue Superviseur
- **Pasteur** : Vue Admin + Vue Superviseur
- **Superviseur** : Responsable d'une Famille de 70 disciples (Vue Superviseur)
- **Mentor/Berger** : Suit des disciples directs uniquement (Vue Berger)
- **Disciple** : Accès à son espace personnel uniquement (Vue Disciple)
- **Tutoré(e)** : Accès à son espace personnel uniquement (Vue Disciple)

### 2. Gestion des Familles de Disciples
- 26 familles identifiées avec leurs superviseurs respectifs
- Objectif : 70 disciples par famille (disciples directs + disciples des disciples)
- Chaque famille a un identifiant unique
- Système d'identifiants hiérarchique : `[ID_FAMILLE][ID_DISCIPLE]`

### 3. Statistiques et Suivi
- Présence/absence aux activités (hebdomadaire, mensuel, trimestriel, semestriel, annuel)
- Activités de présence à suivre (9 types) :
  - Culte du dimanche matin
  - Culte du samedi soir
  - Partage de la Parole
  - Prière
  - ComFrat des Familles
  - Veillée
  - Sorties d'Évangélisation
  - Retraites
  - Challenges
- Sujets de prières des membres (section spéciale pour recenser les besoins de prière)
- Suivi et accompagnement des nouveaux convertis

### 4. Arbre Généalogique
- Chaque disciple doit faire partie d'un arbre généalogique dans sa famille de 70
- Visualisation de la hiérarchie : Superviseur → Mentors → Disciples → Disciples des disciples

---

## 🔍 ANALYSE DE L'EXISTANT

### Structure Actuelle des Rôles

**Rôles existants :**
- `admin` : Administrateur
- `mentor` : Mentor/Berger
- `disciple` : Disciple

**Tables existantes :**
- `profils` : Profils utilisateurs avec champ `role`
- `user_permissions` : Permissions utilisateurs (can_have_disciples)
- `cercle_personnes` : Disciples suivis par un mentor (user_id = mentor)
- `attendance_tracking` : Suivi de présence (existe déjà mais limité)

**Points forts :**
- ✅ Système de rôles basique en place
- ✅ Table `cercle_personnes` pour gérer les disciples
- ✅ Système de suivi de présence partiel
- ✅ Arbre généalogique basique dans `GenealogicalTree.jsx`

**Limitations actuelles :**
- ❌ Pas de concept de "Famille de Disciples"
- ❌ Pas de rôle "Superviseur" ou "Pasteur"
- ❌ Pas de système d'identifiants hiérarchique
- ❌ Suivi de présence limité à 3 types d'activités
- ❌ Pas de statistiques par famille
- ❌ Pas de gestion des objectifs de 70 disciples

---

## 📊 PLAN D'IMPLÉMENTATION

### PHASE 1 : RESTRUCTURATION DE LA BASE DE DONNÉES

#### 1.1 Nouvelle Table : `familles_disciples`
```sql
CREATE TABLE familles_disciples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT UNIQUE NOT NULL, -- Ex: "LES DÉTERMINÉS"
  identifiant_famille TEXT UNIQUE NOT NULL, -- Ex: "FAM001"
  superviseur_id UUID REFERENCES profils(id) NOT NULL,
  objectif_disciples INTEGER DEFAULT 70,
  nombre_disciples_actuels INTEGER DEFAULT 0,
  statut TEXT CHECK (statut IN ('actif', 'inactif')) DEFAULT 'actif',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.2 Modification de la Table : `profils`
- Ajouter colonne `famille_id UUID REFERENCES familles_disciples(id)`
- Ajouter colonne `identifiant_disciple TEXT` (format: `[ID_FAMILLE][ID_UNIQUE]`)
- Modifier `role` pour inclure : `super_admin`, `admin`, `pasteur`, `superviseur`, `mentor`, `disciple`, `tutore`
- Ajouter colonne `superviseur_id UUID REFERENCES profils(id)`
- Ajouter colonne `mentor_id UUID REFERENCES profils(id)`

#### 1.3 Nouvelle Table : `activites_famille`
```sql
CREATE TABLE activites_famille (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  famille_id UUID REFERENCES familles_disciples(id) NOT NULL,
  type_activite TEXT CHECK (type_activite IN (
    'culte_dimanche_matin',
    'culte_samedi_soir',
    'partage_parole',
    'priere',
    'comfrat_familles',
    'veillee',
    'sortie_evangelisation',
    'retraite',
    'challenge'
  )) NOT NULL,
  date_activite DATE NOT NULL,
  heure_debut TIME,
  heure_fin TIME,
  lieu TEXT,
  description TEXT,
  responsable_id UUID REFERENCES profils(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.4 Modification de la Table : `attendance_tracking`
- Ajouter colonne `famille_id UUID REFERENCES familles_disciples(id)`
- Ajouter colonne `activite_id UUID REFERENCES activites_famille(id)`
- Ajouter colonne `pilier_id UUID REFERENCES profils(id)` (pour lier à un pilier/mentor)
- Ajouter colonne `disciple_id UUID REFERENCES profils(id)` (pour lier à un disciple)
- Modifier `attendance_type` pour correspondre aux nouveaux types d'activités
- Ajouter colonne `sujet_priere TEXT` (pour recenser les sujets de prière)
- Ajouter colonne `niveau_engagement TEXT CHECK (niveau_engagement IN ('Élevé', 'Moyen', 'Faible'))`
- Ajouter colonne `statut_actif_inactif TEXT CHECK (statut_actif_inactif IN ('Actif', 'Inactif'))`
- Ajouter colonne `date_ajout DATE` (date d'ajout du disciple)
- Ajouter colonne `date_derniere_presence DATE` (date de dernière présence)

#### 1.5 Nouvelle Table : `statistiques_famille`
```sql
CREATE TABLE statistiques_famille (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  famille_id UUID REFERENCES familles_disciples(id) NOT NULL,
  periode_type TEXT CHECK (periode_type IN ('hebdomadaire', 'mensuel', 'trimestriel', 'semestriel', 'annuel')) NOT NULL,
  periode_debut DATE NOT NULL,
  periode_fin DATE NOT NULL,
  nombre_presences INTEGER DEFAULT 0,
  nombre_absences INTEGER DEFAULT 0,
  taux_participation DECIMAL(5,2) DEFAULT 0,
  nombre_nouveaux_convertis INTEGER DEFAULT 0,
  nombre_disciples_actifs INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(famille_id, periode_type, periode_debut)
);
```

#### 1.6 Nouvelle Table : `sujets_priere`
```sql
CREATE TABLE sujets_priere (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  famille_id UUID REFERENCES familles_disciples(id) NOT NULL,
  disciple_id UUID REFERENCES profils(id) NOT NULL,
  sujet TEXT NOT NULL,
  date_ajout DATE DEFAULT CURRENT_DATE,
  statut TEXT CHECK (statut IN ('actif', 'resolu', 'archive')) DEFAULT 'actif',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.7 Nouvelle Table : `piliers_mentors`
```sql
CREATE TABLE piliers_mentors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  famille_id UUID REFERENCES familles_disciples(id) NOT NULL,
  pilier_id UUID REFERENCES profils(id) NOT NULL, -- Le mentor/pilier
  nom TEXT,
  prenom TEXT,
  eglise TEXT,
  nombre_disciples INTEGER DEFAULT 0,
  avancement_pourcentage DECIMAL(5,2) DEFAULT 0, -- Par rapport à l'objectif de 70
  nombre_disciples_presents INTEGER DEFAULT 0,
  taux_participation_semaine DECIMAL(5,2) DEFAULT 0,
  observations TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(famille_id, pilier_id)
);
```

#### 1.8 Nouvelle Table : `suivi_nouveaux_convertis`
```sql
CREATE TABLE suivi_nouveaux_convertis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  famille_id UUID REFERENCES familles_disciples(id) NOT NULL,
  nouveau_converti_id UUID REFERENCES profils(id) NOT NULL,
  mentor_id UUID REFERENCES profils(id) NOT NULL,
  date_conversion DATE NOT NULL,
  date_bapteme DATE,
  etape_accompagnement TEXT CHECK (etape_accompagnement IN (
    'premier_contact',
    'formation_fondamentaux',
    'integration_communaute',
    'bapteme',
    'discipolat_actif'
  )) DEFAULT 'premier_contact',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### PHASE 2 : SYSTÈME DE VUES PAR RÔLE

#### 2.1 Mise à jour de `RoleContext.jsx`
- Ajouter les nouveaux rôles : `super_admin`, `pasteur`, `superviseur`, `tutore`
- Créer des fonctions de vérification : `isSuperAdmin()`, `isPasteur()`, `isSuperviseur()`, `isTutore()`
- Gérer les vues combinées (Admin + Superviseur, etc.)

#### 2.2 Création de Composants de Vue

**Vue Super Admin :**
- Accès à toutes les familles
- Statistiques globales
- Gestion des utilisateurs et rôles
- Configuration système

**Vue Admin/Pasteur :**
- Vue Admin existante
- + Vue Superviseur (voir ci-dessous)

**Vue Superviseur :**
- Dashboard de la famille (objectif 70, progression)
- Liste des mentors et disciples de la famille
- Statistiques de la famille
- Gestion des activités
- Suivi des nouveaux convertis

**Vue Berger/Mentor :**
- Liste de ses disciples directs uniquement
- Suivi de leurs progressions
- Ajout de nouveaux disciples

**Vue Disciple/Tutoré :**
- Espace personnel
- Suivi de ses propres formations
- Enregistrement de présence aux activités

### PHASE 3 : GESTION DES IDENTIFIANTS HIÉRARCHIQUES

#### 3.1 Fonction de Génération d'Identifiant
```javascript
function generateDiscipleId(familleId, discipleUniqueId) {
  // Format: FAM001-DISC-12345
  return `${familleId}-DISC-${discipleUniqueId}`;
}
```

#### 3.2 Validation et Contraintes
- Vérifier que tous les membres d'une famille ont le même préfixe
- Empêcher un disciple d'appartenir à plusieurs familles
- Générer automatiquement l'identifiant lors de l'ajout d'un disciple

### PHASE 4 : SYSTÈME DE STATISTIQUES

#### 4.1 Calcul des Statistiques
- **Hebdomadaire** : Du lundi au dimanche
- **Mensuel** : Du 1er au dernier jour du mois
- **Trimestriel** : Par trimestre (Q1, Q2, Q3, Q4)
- **Semestriel** : Janvier-Juin / Juillet-Décembre
- **Annuel** : Du 1er janvier au 31 décembre

#### 4.2 Métriques à Calculer
- Taux de présence par activité
- Nombre de disciples actifs
- Nombre de nouveaux convertis
- Progression vers l'objectif de 70
- Taux de participation par mentor

#### 4.3 Interface de Visualisation
- Graphiques de présence (ligne, barre)
- Tableaux de bord par période
- Export des statistiques (CSV, PDF)

### PHASE 5 : PAGE DE PRÉSENCE AMÉLIORÉE (PRIORITÉ HAUTE)

**⚠️ IMPORTANT :** La page de présence est une page critique pour les objectifs. Elle doit être améliorée en partant de la page existante `AttendanceTracking.jsx`.

#### 5.1 Structure du Dashboard de Présence par Famille

**En-tête du Dashboard :**
- Titre : "DASHBOARD DISCIPOLAT"
- Sous-titre : "FAMILLE [NOM_DE_LA_FAMILLE]" (avec le nom de la famille en surbrillance)
- Sélecteur de période : Hebdomadaire / Mensuel / Trimestriel / Semestriel / Annuel
- Sélecteur de famille (pour Super Admin/Admin)

#### 5.2 Sections d'Activités (Vue Dashboard)

Le dashboard doit afficher des cartes pour chaque type d'activité avec :

**1. CULTES (Culte du Dimanche Matin)**
- Icône : Église
- Titre : "CULTES"
- Métrique principale : Taux de présence en pourcentage (ex: "0%")
- Détails supplémentaires :
  - Nombre de présents / Nombre total de disciples
  - Évolution par rapport à la période précédente
  - Lien "Afficher les détails" pour voir le détail par disciple

**2. CULTE SAMEDI SOIR (Culte du Samedi Soir)**
- Icône : Église / Rassemblement
- Titre : "CULTE SAMEDI SOIR"
- Métrique principale : Taux de présence en pourcentage
- Détails supplémentaires :
  - Nombre de présents / Nombre total de disciples
  - Évolution par rapport à la période précédente
  - Lien "Afficher les détails"

**3. PARTAGE DE LA PAROLE**
- Icône : Livre / Enseignement
- Titre : "PARTAGE DE LA PAROLE"
- Métrique principale : Taux de présence en pourcentage
- Détails supplémentaires :
  - Nombre de présents / Nombre total de disciples
  - Évolution par rapport à la période précédente
  - Lien "Afficher les détails"

**4. PRIÈRE**
- Icône : Mains jointes / Prière
- Titre : "PRIÈRE"
- Métrique principale : Taux de présence en pourcentage
- Détails supplémentaires :
  - Nombre de présents / Nombre total de disciples
  - Évolution par rapport à la période précédente
  - Lien "Afficher les détails"

**5. COMFRAT DES FAMILLES**
- Icône : Poignée de main / Communion fraternelle
- Titre : "COMFRAT DES FAMILLES"
- Métrique principale : Taux de présence en pourcentage
- Détails supplémentaires :
  - Nombre de présents / Nombre total de disciples
  - Évolution par rapport à la période précédente
  - Lien "Afficher les détails"

**6. VEILLÉE**
- Icône : Personnes en prière/Adoration
- Titre : "VEILLÉE"
- Métrique principale : Taux de présence en pourcentage
- Détails supplémentaires :
  - Nombre de présents / Nombre total de disciples
  - Évolution par rapport à la période précédente
  - Lien "Afficher les détails"

**7. SORTIES D'ÉVANGÉLISATION**
- Icône : Personnes partageant l'Évangile
- Titre : "SORTIES D'ÉVANGÉLISATION"
- Métrique principale : Taux de présence en pourcentage
- Détails supplémentaires :
  - Nombre de présents / Nombre total de disciples
  - Évolution par rapport à la période précédente
  - Lien "Afficher les détails"

**8. RETRAITES**
- Icône : Montagne / Spiritualité
- Titre : "RETRAITES"
- Métrique principale : Taux de présence en pourcentage
- Détails supplémentaires :
  - Nombre de présents / Nombre total de disciples
  - Évolution par rapport à la période précédente
  - Lien "Afficher les détails"

**9. CHALLENGES**
- Icône : Trophée / Défi
- Titre : "CHALLENGES"
- Métrique principale : Taux de présence en pourcentage
- Détails supplémentaires :
  - Nombre de présents / Nombre total de disciples
  - Évolution par rapport à la période précédente
  - Lien "Afficher les détails"

**10. SUJETS DE PRIÈRES DES MEMBRES** (Section spéciale - non une activité de présence)
- Icône : Cœur / Prière
- Titre : "SUJETS DE PRIÈRES"
- Métrique principale : Nombre de sujets de prière actifs
- Détails supplémentaires :
  - Liste des sujets de prière par disciple
  - Statut (actif, résolu, archivé)
  - Date d'ajout
  - Lien "Afficher les détails" pour voir tous les sujets

#### 5.3 Design et Mise en Page

**Layout :**
- Grille responsive : 3 colonnes sur desktop, 2 sur tablette, 1 sur mobile
- Chaque carte d'activité :
  - Fond blanc avec bordure subtile
  - Icône colorée (orange/violet selon le thème) en haut
  - Titre en gras
  - Pourcentage en grand et visible
  - Zone de détails avec bordure pointillée si des informations manquent
  - Lien "Afficher les détails" en bleu souligné

**Couleurs :**
- Icônes : Orange (#F97316) ou Violet (#9333EA) selon le thème
- Texte principal : Bleu foncé / Noir (#1E293B)
- Texte secondaire : Gris (#64748B)
- Liens : Bleu (#3B82F6)

#### 5.4 Fonctionnalités de la Page de Présence

**5.4.1 Vue Dashboard (Vue d'ensemble)**
- Affichage des cartes pour toutes les activités
- Filtre par période (hebdomadaire, mensuel, trimestriel, semestriel, annuel)
- Filtre par famille (pour les admins)
- Calcul automatique des taux de présence
- Indicateurs visuels (flèches haut/bas) pour les évolutions

**5.4.2 Vue Détail d'une Activité (Tableau Arbre Généalogique)**
Au clic sur "Afficher les détails", afficher un tableau complet avec les colonnes suivantes :

**Colonnes d'identification :**
- **ID Pilier** : Identifiant du pilier/mentor
- **Prénom Pilier** : Prénom du pilier/mentor
- **Nom Pilier** : Nom du pilier/mentor
- **Prénom disciple** : Prénom du disciple
- **Nom disciple** : Nom du disciple
- **Statut** : Statut du disciple (Disciple / Tutoré) avec code couleur :
  - "Disciple" : Fond vert
  - "Tutoré" : Fond orange/jaune

**Colonnes de suivi et engagement :**
- **Date d'ajout** : Date à laquelle le disciple a été ajouté
- **Date dernière présence** : Date de la dernière présence enregistrée
- **Niveau d'engagement sur la période** : Niveau d'engagement avec code couleur :
  - "Élevé" : Fond vert
  - "Moyen" : Fond jaune
  - "Faible" : Fond rouge
- **Statut (Actif/Inactif)** : Statut actif ou inactif avec code couleur :
  - "Actif" : Fond vert
  - "Inactif" : Fond rouge
- **Présence au dernier culte** : Checkbox indiquant la présence au dernier culte (colonne avec fond rouge)

**Colonnes de présence par date :**
- Colonnes dynamiques par mois avec dates spécifiques :
  - **DÉCEMBRE 2025** : Colonnes pour les dates 7, 14, 21, 28
  - **JANVIER** : Colonnes pour les dates 4, 11, 18, 25
  - **FÉVRIER** : Colonnes pour les dates 1, 8, 15, 22, etc.
  - **MARS** : Colonnes pour les dates 1, 8, 15, 22, etc.
  - **AVRIL, MAI, etc.** : Colonnes pour les dates correspondantes
- Chaque cellule contient une checkbox (☐ non coché, ☑ coché) pour indiquer la présence
- Affichage de "Dernier dimanche: [DATE]" en haut à droite du tableau

**Fonctionnalités du tableau :**
- Tri par colonne
- Filtres par statut, niveau d'engagement, statut actif/inactif
- Recherche par nom de disciple ou pilier
- Export des données (CSV, Excel)
- Pagination si beaucoup de données

**5.4.3 Enregistrement de Présence**
- Formulaire amélioré par type d'activité
- Sélection de date avec calendrier
- Statut : Présent / Absent
- Champs conditionnels :
  - Pour "CULTES" : Nom de l'église si présent
  - Pour toutes activités : Motif d'absence si absent
  - Optionnel : Sujet de prière
- Validation et enregistrement
- Confirmation visuelle

**5.4.4 Vue Tableau des Piliers/Mentors (Vue Superviseur)**

**En-tête avec métriques globales :**
- **Objectif disciple** : Objectif total (ex: "Objectif disciple= 500")
- **TOTAL** : Nombre total de disciples dans la famille
- **Pourcentage global** : Pourcentage d'avancement global (ex: "13,0%")
- **Nombre de disciples actifs** : Nombre de disciples actifs (ex: "6")
- **Taux de participation global** : Taux de participation global (ex: "9,2%")

**Colonnes du tableau :**
- **ID Pilier** : Identifiant unique du pilier/mentor
- **Nom** : Nom du pilier/mentor
- **Prenom** : Prénom du pilier/mentor
- **Eglise** : Église d'appartenance
- **Nombre de disciples** : Nombre total de disciples sous la responsabilité du pilier
- **Avancement (%) par rapport à l'objectif de 70** : Pourcentage d'avancement vers l'objectif de 70 disciples pour ce pilier
- **Nombre de disciples présents à l'église** : Nombre de disciples présents lors du dernier culte
- **Taux de participation de la semaine en cours(%)** : Taux de participation pour la semaine en cours
- **Observations** : Notes et observations sur le pilier

**Colonnes de présence par date (même structure que l'arbre généalogique) :**
- Colonnes dynamiques par mois avec dates spécifiques :
  - **DÉCEMBRE 2025** : Colonnes pour les dates 7, 14, 21, 28
  - **JANVIER** : Colonnes pour les dates 4, 11, 18, 25
  - **FÉVRIER** : Colonnes pour les dates 1, 8, 15, 22, etc.
  - **MARS** : Colonnes pour les dates 1, 8, 15, 22, etc.
  - **AVRIL, MAI, etc.** : Colonnes pour les dates correspondantes
- Chaque cellule contient une checkbox (☐ non coché, ☑ coché) pour indiquer la présence du pilier et/ou de ses disciples

**Fonctionnalités :**
- Tri par colonne (nombre de disciples, avancement, taux de participation)
- Filtres par église, nombre de disciples, avancement
- Recherche par nom ou prénom
- Export des données (CSV, Excel)
- Calcul automatique des métriques d'en-tête

**5.4.5 Historique et Statistiques**
- Tableau d'historique par activité
- Filtres : Date, Disciple, Statut
- Graphiques :
  - Évolution du taux de présence sur la période
  - Répartition présence/absence
  - Top 10 des disciples les plus assidus
  - Comparaison entre activités
  - Graphique d'avancement vers l'objectif de 70 par pilier

#### 5.5 Améliorations par Rapport à la Page Existante

**Actuellement (AttendanceTracking.jsx) :**
- ✅ 3 types d'activités seulement (Culte Dimanche, Partage Dimanche, Prière Samedi)
- ✅ Formulaire d'enregistrement fonctionnel
- ✅ Historique basique
- ❌ Pas de vue dashboard avec statistiques
- ❌ Pas de calcul de taux de présence
- ❌ Pas de vue par famille
- ❌ Pas de filtres par période

**À améliorer :**
- ✅ Ajouter 6 nouveaux types d'activités (CULTE SAMEDI SOIR, PARTAGE DE LA PAROLE, COMFRAT DES FAMILLES, VEILLÉE, SORTIES D'ÉVANGÉLISATION, RETRAITES, CHALLENGES)
- ✅ Créer une vue dashboard avec cartes pour chaque activité (9 activités de présence)
- ✅ Ajouter une section spéciale pour les sujets de prières des membres
- ✅ Calculer et afficher les taux de présence
- ✅ Ajouter les filtres par période et famille
- ✅ Créer la vue détail pour chaque activité
- ✅ Ajouter les graphiques et statistiques
- ✅ Améliorer le design pour correspondre à l'exemple fourni

#### 5.6 Structure de Données pour les Activités

**Types d'activités à supporter :**
```javascript
const ACTIVITES = {
  CULTE_DIMANCHE_MATIN: 'culte_dimanche_matin',
  CULTE_SAMEDI_SOIR: 'culte_samedi_soir',
  PARTAGE_PAROLE: 'partage_parole',
  PRIERE: 'priere',
  COMFRAT_FAMILLES: 'comfrat_familles',
  VEILLEE: 'veillee',
  SORTIE_EVANGELISATION: 'sortie_evangelisation',
  RETRAITE: 'retraite',
  CHALLENGE: 'challenge'
};
```

**Note :** Les sujets de prières des membres ne sont pas une activité de présence mais une section à part pour recenser les besoins de prière des disciples.

#### 5.7 Calculs de Statistiques par Activité

Pour chaque activité et période :
- **Taux de présence** = (Nombre de présents / Nombre total de disciples) × 100
- **Nombre de présents** = Compte des enregistrements avec `status = 'present'`
- **Nombre d'absents** = Compte des enregistrements avec `status = 'absent'`
- **Évolution** = Comparaison avec la période précédente (en points de pourcentage)

#### 5.8 Permissions par Rôle

**Super Admin / Admin :**
- Accès à toutes les familles
- Vue dashboard globale
- Statistiques comparatives entre familles

**Pasteur :**
- Accès à toutes les familles
- Vue dashboard par famille
- Statistiques détaillées

**Superviseur :**
- Accès uniquement à sa famille
- Vue dashboard de sa famille
- Statistiques de sa famille
- Gestion des activités de sa famille

**Mentor/Berger :**
- Accès aux statistiques de ses disciples directs uniquement
- Enregistrement de présence pour ses disciples

**Disciple/Tutoré :**
- Accès à ses propres statistiques
- Enregistrement de sa propre présence

#### 5.9 Composants à Créer/Modifier

**Nouveaux composants :**
1. `src/pages/PresenceDashboard.jsx` - Dashboard principal avec toutes les cartes
2. `src/components/PresenceActivityCard.jsx` - Carte pour une activité
3. `src/components/PresenceDetailModal.jsx` - Modal avec détails d'une activité
4. `src/components/PresenceStatsChart.jsx` - Graphiques de statistiques
5. `src/components/PresenceHistoryTable.jsx` - Tableau d'historique amélioré
6. **`src/components/ArbreGenealogiqueTable.jsx`** - **NOUVEAU : Tableau arbre généalogique avec colonnes d'identification, suivi et présence par date**
7. **`src/components/PiliersTable.jsx`** - **NOUVEAU : Tableau des piliers/mentors avec métriques d'en-tête et colonnes de présence**

**Composant à améliorer :**
1. `src/pages/AttendanceTracking.jsx` - Intégrer les nouvelles fonctionnalités

**Utilitaires :**
1. `src/lib/presenceUtils.js` - Calculs de taux de présence, statistiques
2. `src/lib/activiteUtils.js` - Gestion des types d'activités

### PHASE 5B : GESTION DES ACTIVITÉS (Complément)

#### 5B.1 Création d'Activités
- Formulaire de création par type d'activité
- Planification dans un calendrier
- Attribution d'un responsable
- Association à une famille

#### 5B.2 Consultation des Activités
- Calendrier des activités de la famille
- Historique des présences
- Statistiques par activité

### PHASE 6 : ARBRE GÉNÉALOGIQUE AMÉLIORÉ ET TABLEAUX DE SUIVI

#### 6.1 Structure Hiérarchique
```
Superviseur
  ├── Mentor 1 (Pilier)
  │   ├── Disciple 1.1
  │   │   └── Disciple 1.1.1 (Tutoré)
  │   └── Disciple 1.2
  ├── Mentor 2 (Pilier)
  │   └── Disciple 2.1
  └── Mentor 3 (Pilier)
```

#### 6.2 Tableau Arbre Généalogique (Vue Détaillée)

**Structure du tableau :**

**Colonnes d'identification :**
- ID Pilier : Identifiant du mentor/pilier
- Prénom Pilier : Prénom du mentor/pilier
- Nom Pilier : Nom du mentor/pilier
- Prénom disciple : Prénom du disciple
- Nom disciple : Nom du disciple
- Statut : Dropdown avec valeurs "Disciple" (fond vert) ou "Tutoré" (fond orange)

**Colonnes de suivi :**
- Date d'ajout : Date d'ajout du disciple dans le système
- Date dernière présence : Date de la dernière présence enregistrée
- Niveau d'engagement sur la période : Dropdown avec valeurs :
  - "Élevé" (fond vert)
  - "Moyen" (fond jaune)
  - "Faible" (fond rouge)
- Statut (Actif/Inactif) : Dropdown avec valeurs :
  - "Actif" (fond vert)
  - "Inactif" (fond rouge)
- Présence au dernier culte : Checkbox (colonne avec fond rouge)

**Colonnes de présence par date :**
- Colonnes dynamiques organisées par mois :
  - DÉCEMBRE 2025 : Colonnes pour dates 7, 14, 21, 28
  - JANVIER : Colonnes pour dates 4, 11, 18, 25
  - FÉVRIER : Colonnes pour dates 1, 8, 15, 22, etc.
  - MARS, AVRIL, MAI, etc. : Colonnes pour dates correspondantes
- Chaque cellule contient une checkbox (☐/☑) pour indiquer la présence
- Affichage de "Dernier dimanche: [DATE]" en haut à droite

**Fonctionnalités :**
- Tri par colonne
- Filtres multiples (statut, niveau d'engagement, actif/inactif)
- Recherche par nom/prénom
- Export CSV/Excel
- Pagination
- Édition inline des champs (statut, niveau d'engagement, etc.)

#### 6.3 Tableau des Piliers/Mentors (Vue Superviseur)

**En-tête avec métriques globales :**
- Objectif disciple : Objectif total (ex: "Objectif disciple= 500")
- TOTAL : Nombre total de disciples dans la famille
- Pourcentage global : Pourcentage d'avancement (ex: "13,0%")
- Nombre de disciples actifs : Nombre total de disciples actifs (ex: "6")
- Taux de participation global : Taux de participation global (ex: "9,2%")

**Colonnes du tableau :**
- ID Pilier : Identifiant unique du pilier/mentor
- Nom : Nom du pilier/mentor
- Prenom : Prénom du pilier/mentor
- Eglise : Église d'appartenance du pilier
- Nombre de disciples : Nombre total de disciples sous sa responsabilité
- Avancement (%) par rapport à l'objectif de 70 : Pourcentage d'avancement vers l'objectif de 70
- Nombre de disciples présents à l'église : Nombre de disciples présents au dernier culte
- Taux de participation de la semaine en cours(%) : Taux de participation pour la semaine en cours
- Observations : Notes et observations sur le pilier

**Colonnes de présence par date :**
- Même structure que l'arbre généalogique
- Colonnes dynamiques par mois avec dates spécifiques
- Checkboxes pour indiquer la présence

**Fonctionnalités :**
- Tri par colonne (nombre de disciples, avancement, taux de participation)
- Filtres par église, nombre de disciples, avancement
- Recherche par nom/prénom
- Export CSV/Excel
- Calcul automatique des métriques d'en-tête
- Graphiques d'avancement par pilier

#### 6.4 Visualisation Graphique
- Améliorer `GenealogicalTree.jsx` pour afficher la hiérarchie complète
- Filtrer par famille
- Afficher les statistiques de chaque membre
- Intégrer les tableaux arbre généalogique et piliers dans les vues appropriées

### PHASE 7 : SUIVI DES NOUVEAUX CONVERTIS

#### 7.1 Workflow d'Accompagnement
1. Premier contact
2. Formation aux fondamentaux
3. Intégration dans la communauté
4. Baptême
5. Discipolat actif

#### 7.2 Interface de Suivi
- Liste des nouveaux convertis par famille
- Progression dans les étapes
- Notes et observations
- Rappels et notifications

---

## 🛠️ MODIFICATIONS TECHNIQUES REQUISES

### Fichiers à Modifier/Créer

#### Migrations SQL
1. `034_create_familles_disciples.sql` - Création de la table familles
2. `035_add_famille_to_profils.sql` - Ajout des colonnes famille dans profils
3. `036_create_activites_famille.sql` - Table des activités
4. `037_extend_attendance_tracking.sql` - Extension du suivi de présence (avec colonnes pilier_id, disciple_id, niveau_engagement, statut_actif_inactif, date_ajout, date_derniere_presence)
5. `038_create_statistiques_famille.sql` - Table des statistiques
6. `039_create_sujets_priere.sql` - Table des sujets de prière
7. **`040_create_piliers_mentors.sql`** - **NOUVEAU : Table des piliers/mentors avec métriques**
8. `041_create_suivi_nouveaux_convertis.sql` - Table de suivi

#### Composants React
1. `src/context/RoleContext.jsx` - Mise à jour des rôles
2. `src/pages/dashboards/SuperAdminDashboard.jsx` - Nouveau dashboard
3. `src/pages/dashboards/SuperviseurDashboard.jsx` - Nouveau dashboard
4. `src/pages/FamillesDisciples.jsx` - Gestion des familles
5. `src/pages/ActivitesFamille.jsx` - Gestion des activités
6. `src/pages/StatistiquesFamille.jsx` - Statistiques par famille
7. `src/pages/SuiviNouveauxConvertis.jsx` - Suivi des nouveaux convertis
8. `src/pages/GenealogicalTree.jsx` - Amélioration de l'arbre
9. **`src/pages/PresenceDashboard.jsx`** - **NOUVEAU : Dashboard de présence par famille (PRIORITÉ)**
10. **`src/components/PresenceActivityCard.jsx`** - **NOUVEAU : Carte d'activité avec statistiques**
11. **`src/components/PresenceDetailModal.jsx`** - **NOUVEAU : Modal de détails d'activité**
12. **`src/components/PresenceStatsChart.jsx`** - **NOUVEAU : Graphiques de présence**
13. **`src/pages/AttendanceTracking.jsx`** - **AMÉLIORER : Intégrer nouvelles fonctionnalités**

#### Utilitaires
1. `src/lib/familleUtils.js` - Fonctions utilitaires pour les familles
2. `src/lib/statistiquesUtils.js` - Calculs de statistiques
3. `src/lib/identifiantUtils.js` - Génération d'identifiants
4. **`src/lib/presenceUtils.js`** - **NOUVEAU : Calculs de taux de présence, statistiques par activité**
5. **`src/lib/activiteUtils.js`** - **NOUVEAU : Gestion des types d'activités (9 types)**

---

## ⚠️ POINTS D'ATTENTION ET RISQUES

### 1. Migration des Données Existantes
- **Risque** : Les disciples existants n'ont pas de famille assignée
- **Solution** : Créer une migration pour assigner les disciples existants à une famille par défaut ou permettre l'assignation manuelle

### 2. Contraintes d'Intégrité
- **Risque** : Un disciple pourrait être assigné à plusieurs familles
- **Solution** : Contrainte UNIQUE sur `profils.famille_id` + `profils.identifiant_disciple`

### 3. Performance
- **Risque** : Calcul des statistiques pour 26 familles × 70 disciples = 1820+ utilisateurs
- **Solution** : 
  - Indexation appropriée
  - Calcul asynchrone des statistiques
  - Mise en cache des résultats

### 4. Complexité des Vues
- **Risque** : Gestion de multiples vues combinées (Admin + Superviseur)
- **Solution** : Système de permissions granulaires avec héritage

### 5. Objectif de 70 Disciples
- **Risque** : Calcul récursif complexe (disciples directs + disciples des disciples)
- **Solution** : Fonction SQL récursive ou calcul côté serveur avec agrégation

---

## 📈 ESTIMATION DE COMPLEXITÉ

### Niveau de Difficulté : **ÉLEVÉ**

**Temps estimé :**
- Phase 1 (Base de données) : 2-3 jours
- Phase 2 (Vues par rôle) : 3-4 jours
- Phase 3 (Identifiants) : 1 jour
- Phase 4 (Statistiques) : 4-5 jours
- **Phase 5 (Page de Présence - PRIORITÉ) : 5-6 jours** ⚠️
- Phase 5B (Gestion des Activités) : 2-3 jours
- Phase 6 (Arbre) : 2 jours
- Phase 7 (Nouveaux convertis) : 2 jours

**Total estimé : 21-26 jours de développement**

**Note :** La Phase 5 (Page de Présence) est une priorité et nécessite un développement soigné pour répondre aux exigences des objectifs.

---

## ✅ RECOMMANDATIONS ET ORDRE D'IMPLÉMENTATION

### 🎯 PAR OÙ COMMENCER ? - PLAN D'ACTION RECOMMANDÉ

#### ÉTAPE 1 : FONDATIONS (Priorité ABSOLUE - Semaine 1)
**Objectif :** Mettre en place la structure de base pour que tout le reste puisse fonctionner

1. **Créer les tables de base de données (Phase 1)**
   - ✅ `034_create_familles_disciples.sql` - Créer les 26 familles avec leurs superviseurs
   - ✅ `035_add_famille_to_profils.sql` - Ajouter les colonnes famille dans profils
   - ✅ `040_create_piliers_mentors.sql` - Table des piliers/mentors
   - ⚠️ **IMPORTANT** : Créer les 26 familles avec leurs superviseurs respectifs dès le début

2. **Mettre à jour le système de rôles (Phase 2 - Partie 1)**
   - ✅ Modifier `RoleContext.jsx` pour ajouter les nouveaux rôles
   - ✅ Ajouter `super_admin`, `pasteur`, `superviseur`, `tutore`
   - ✅ Créer les fonctions de vérification (`isSuperAdmin()`, `isPasteur()`, etc.)

3. **Créer la page de gestion des familles (Phase 2 - Partie 2)**
   - ✅ `src/pages/FamillesDisciples.jsx` - Page pour voir et gérer les 26 familles
   - ✅ Permettre l'assignation des disciples aux familles
   - ✅ Afficher la liste des superviseurs

**Résultat attendu :** Les familles existent, les rôles fonctionnent, on peut assigner des disciples aux familles

---

#### ÉTAPE 2 : PAGE DE PRÉSENCE (Priorité HAUTE - Semaine 2-3)
**Objectif :** Créer la page de présence qui est critique pour les objectifs

1. **Étendre la table attendance_tracking (Phase 1 - Complément)**
   - ✅ `037_extend_attendance_tracking.sql` - Ajouter toutes les colonnes nécessaires
   - ✅ Ajouter les 9 types d'activités

2. **Créer le dashboard de présence (Phase 5)**
   - ✅ `src/pages/PresenceDashboard.jsx` - Dashboard principal
   - ✅ `src/components/PresenceActivityCard.jsx` - Cartes pour les 9 activités
   - ✅ Calculer et afficher les taux de présence
   - ✅ Filtres par période et famille

3. **Créer les tableaux de suivi (Phase 6)**
   - ✅ `src/components/ArbreGenealogiqueTable.jsx` - Tableau arbre généalogique
   - ✅ `src/components/PiliersTable.jsx` - Tableau des piliers
   - ✅ Intégrer les colonnes de présence par date

4. **Améliorer AttendanceTracking.jsx**
   - ✅ Intégrer les 9 types d'activités
   - ✅ Ajouter les champs de suivi (niveau d'engagement, statut actif/inactif)

**Résultat attendu :** La page de présence fonctionne avec toutes les activités, les tableaux de suivi sont opérationnels

---

#### ÉTAPE 3 : STATISTIQUES ET CALCULS (Semaine 4)
**Objectif :** Mettre en place le système de calcul automatique des statistiques

1. **Créer les tables de statistiques (Phase 1 - Complément)**
   - ✅ `038_create_statistiques_famille.sql`
   - ✅ `036_create_activites_famille.sql`

2. **Créer les utilitaires de calcul (Phase 4)**
   - ✅ `src/lib/presenceUtils.js` - Calculs de taux de présence
   - ✅ `src/lib/statistiquesUtils.js` - Calculs de statistiques
   - ✅ `src/lib/activiteUtils.js` - Gestion des activités

3. **Créer la page de statistiques (Phase 4)**
   - ✅ `src/pages/StatistiquesFamille.jsx` - Statistiques par famille
   - ✅ Graphiques et visualisations
   - ✅ Export des données

**Résultat attendu :** Les statistiques se calculent automatiquement pour toutes les périodes

---

#### ÉTAPE 4 : DASHBOARDS PAR RÔLE (Semaine 5)
**Objectif :** Créer les dashboards spécifiques pour chaque rôle

1. **Dashboard Superviseur (Phase 2)**
   - ✅ `src/pages/dashboards/SuperviseurDashboard.jsx`
   - ✅ Vue de sa famille avec objectif de 70
   - ✅ Statistiques de sa famille
   - ✅ Gestion des activités

2. **Dashboard Super Admin (Phase 2)**
   - ✅ `src/pages/dashboards/SuperAdminDashboard.jsx`
   - ✅ Vue globale de toutes les familles
   - ✅ Statistiques comparatives

3. **Mettre à jour les dashboards existants**
   - ✅ Adapter `MentorDashboard.jsx` pour la vue Berger
   - ✅ Adapter `DiscipleDashboard.jsx` pour la vue Disciple

**Résultat attendu :** Chaque rôle a son dashboard adapté

---

#### ÉTAPE 5 : FONCTIONNALITÉS AVANCÉES (Semaine 6-7)
**Objectif :** Compléter les fonctionnalités restantes

1. **Système d'identifiants (Phase 3)**
   - ✅ `src/lib/identifiantUtils.js` - Génération d'identifiants hiérarchiques
   - ✅ Validation et contraintes

2. **Arbre généalogique amélioré (Phase 6)**
   - ✅ Améliorer `GenealogicalTree.jsx`
   - ✅ Filtrer par famille
   - ✅ Afficher les statistiques

3. **Suivi des nouveaux convertis (Phase 7)**
   - ✅ `041_create_suivi_nouveaux_convertis.sql`
   - ✅ `src/pages/SuiviNouveauxConvertis.jsx`
   - ✅ Workflow d'accompagnement

4. **Sujets de prières (Phase 1 - Complément)**
   - ✅ `039_create_sujets_priere.sql`
   - ✅ Interface pour recenser les sujets de prière

**Résultat attendu :** Toutes les fonctionnalités sont opérationnelles

---

### 📋 CHECKLIST DE DÉMARRAGE

**Avant de commencer, vérifier :**
- [ ] Backup de la base de données actuelle
- [ ] Compréhension de la structure existante
- [ ] Liste des 26 familles et leurs superviseurs prête
- [ ] Accès aux comptes de test pour chaque rôle

**Première action concrète :**
1. Créer la migration `034_create_familles_disciples.sql`
2. Insérer les 26 familles avec leurs superviseurs
3. Tester que les familles sont bien créées
4. Passer à l'étape suivante

---

### ⚠️ POINTS D'ATTENTION POUR LE DÉMARRAGE

1. **Ne pas modifier l'existant avant d'avoir créé les nouvelles tables**
2. **Tester chaque migration SQL avant de passer à la suivante**
3. **Créer les 26 familles dès le début pour avoir des données de test**
4. **Commencer par la page de présence car c'est la priorité**
5. **Tester avec un utilisateur de chaque rôle à chaque étape**

---

### 🎯 RÉSUMÉ : ORDRE RECOMMANDÉ

1. **Semaine 1** : Base de données + Rôles + Gestion des familles
2. **Semaine 2-3** : Page de présence (PRIORITÉ)
3. **Semaine 4** : Statistiques et calculs
4. **Semaine 5** : Dashboards par rôle
5. **Semaine 6-7** : Fonctionnalités avancées

**Total : 6-7 semaines de développement**

---

### 📝 NOTES IMPORTANTES

1. **Implémentation Progressive** : Ne pas tout faire en même temps, tester à chaque étape
2. **Tests Unitaires** : Créer des tests pour les calculs de statistiques et la génération d'identifiants
3. **Documentation** : Documenter le système d'identifiants et la hiérarchie des rôles
4. **Formation Utilisateurs** : Prévoir une formation pour les superviseurs sur l'utilisation du nouveau système
5. **Migration Progressive** : Migrer les données existantes par étapes pour éviter les erreurs

---

## 🎯 CONCLUSION

L'implémentation du système "Disciples 70" représente une évolution majeure de l'application. Elle nécessite une restructuration importante de la base de données et l'ajout de nombreuses fonctionnalités. Cependant, avec une approche méthodique et progressive, cette implémentation est tout à fait réalisable.

Le système permettra une meilleure organisation, un suivi plus précis des disciples, et des statistiques détaillées pour chaque famille de disciples.

---

**Date du rapport :** 2026-01-XX  
**Auteur :** Assistant IA  
**Version :** 1.0

