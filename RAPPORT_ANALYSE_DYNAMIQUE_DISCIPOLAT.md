# RAPPORT D'ANALYSE ET PLAN D'IMPLÉMENTATION
## Nouvelle Dynamique de Discipolat - DiscipleLife

**Date:** $(date)
**Objectif:** Analyser les 12 objectifs et proposer un plan d'implémentation concret

---

## I. ANALYSE DE L'EXISTANT

### Architecture Actuelle

L'application DiscipleLife est construite avec :
- **Frontend:** React + Vite
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Structure:** Architecture modulaire avec pages, composants, contextes
- **Rôles:** admin, mentor, disciple
- **Tables principales identifiées:**
  - `profils` (utilisateurs authentifiés)
  - `cercle_personnes` (disciples suivis par les mentors)
  - `prayer_requests` (requêtes de prière)
  - `appointments` (rendez-vous)
  - `prayer_sessions` (sessions de prière)
  - `calendar_events` (événements calendrier)
  - `attendance_records` (présence)
  - `mentor_events` (événements personnalisés mentors)
  - `impact_x_videos` (formations ImpactX)
  - Tables de ressources: ebooks, vidéos, etc.

### Fonctionnalités Existantes

✅ Gestion des disciples (Circles)
✅ Système de prière (requêtes + sessions)
✅ Rendez-vous et calendrier
✅ Suivi de présence (attendance tracking)
✅ Ressources (E-books, vidéos, ImpactX)
✅ Statistiques de base
✅ Notifications
✅ Profils utilisateurs
✅ Recherche globale

---

## II. ANALYSE OBJECTIF PAR OBJECTIF

### OBJECTIF 1: Attirer les âmes / Faire revenir les éloignés ou perdues

**État actuel:**
- Page d'accueil publique (HomePage) existe
- Pas de système dédié d'évangélisation/tracking des visiteurs
- Pas de distinction entre "visiteurs", "éloignés", "nouveaux"

**Stratégie d'implémentation:**

#### A. Nouvelles Tables à Créer

```sql
-- Table pour tracker les visiteurs/nouveaux/éloignés
CREATE TABLE visiteurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT,
  prenom TEXT,
  email TEXT UNIQUE,
  telephone TEXT,
  statut TEXT CHECK (statut IN ('visiteur', 'eloigne', 'nouveau_contact', 'retourne')),
  source_contact TEXT, -- comment ils ont entendu parler (réseaux sociaux, invitation, etc.)
  date_premier_contact TIMESTAMP DEFAULT NOW(),
  date_dernier_contact TIMESTAMP,
  invitant_id UUID REFERENCES profils(id), -- qui les a invités
  notes TEXT,
  interesse_par TEXT[], -- domaines d'intérêt
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les campagnes d'évangélisation
CREATE TABLE campagnes_evangelisation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  description TEXT,
  type_campagne TEXT, -- 'online', 'evenement', 'mission', 'reseau_social'
  date_debut DATE,
  date_fin DATE,
  responsable_id UUID REFERENCES profils(id),
  objectif_participants INTEGER,
  statut TEXT DEFAULT 'planifiee',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table de liaison campagne-visiteurs
CREATE TABLE campagne_visiteurs (
  campagne_id UUID REFERENCES campagnes_evangelisation(id),
  visiteur_id UUID REFERENCES visiteurs(id),
  date_inscription TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (campagne_id, visiteur_id)
);
```

#### B. Nouvelles Fonctionnalités Frontend

1. **Page "Inviter des Âmes"** (`/evangelization` existe déjà mais à enrichir)
   - Formulaire d'invitation avec code QR
   - Partage sur réseaux sociaux
   - Suivi des invitations envoyées
   - Lien d'inscription rapide pour nouveaux visiteurs

2. **Dashboard "Évangélisation"** pour mentors/admins
   - Vue d'ensemble des visiteurs/éloignés
   - Statistiques de conversion
   - Funnel: Visiteur → Contact → Premier culte → Nouveau converti

3. **Système de Parrainage/Invitation**
   - Code d'invitation unique par membre
   - Suivi des parrainages
   - Tableau de bord des invités

4. **Module "Retour des Éloignés"**
   - Identification automatique des membres absents > 3 mois
   - Système de relance personnalisé
   - Formulaire de retour simplifié

#### C. Intégrations Nécessaires

- Partage réseaux sociaux (Facebook, WhatsApp, etc.)
- Génération de QR codes pour invitations
- Email marketing pour relances (Supabase Edge Functions ou service externe)

---

### OBJECTIF 2: Fidéliser les âmes

**État actuel:**
- Pas de système de fidélisation structuré
- Pas de tracking d'engagement continu
- Pas de système de récompenses/points

**Stratégie d'implémentation:**

#### A. Nouvelles Tables

```sql
-- Table de scoring d'engagement
CREATE TABLE engagement_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id) UNIQUE,
  score_total INTEGER DEFAULT 0,
  -- Détails par catégorie
  score_presence INTEGER DEFAULT 0,
  score_priere INTEGER DEFAULT 0,
  score_resources INTEGER DEFAULT 0,
  score_service INTEGER DEFAULT 0,
  score_communaute INTEGER DEFAULT 0,
  -- Période
  mois DATE, -- premier jour du mois
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table d'historique d'engagement (pour graphiques)
CREATE TABLE engagement_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id),
  date DATE,
  action_type TEXT, -- 'presence', 'priere', 'resource_viewed', etc.
  points INTEGER,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table de badges/récompenses
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT UNIQUE,
  description TEXT,
  icone TEXT,
  conditions JSONB, -- conditions pour obtenir le badge
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_badges (
  user_id UUID REFERENCES profils(id),
  badge_id UUID REFERENCES badges(id),
  date_obtention TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- Table de programmes de fidélisation
CREATE TABLE programmes_fidelisation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT,
  description TEXT,
  duree_jours INTEGER,
  objectifs JSONB,
  recompenses JSONB,
  statut TEXT DEFAULT 'actif',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### B. Nouvelles Fonctionnalités

1. **Système de Points et Badges**
   - Attribution automatique de points selon actions
   - Visualisation des badges obtenus sur profil
   - Leaderboard (optionnel, avec consentement)

2. **Tableau de Bord Personnel d'Engagement**
   - Graphiques de progression
   - Objectifs personnalisés
   - Suggestions d'actions pour augmenter l'engagement

3. **Programmes de Fidélisation**
   - Défis mensuels
   - Parcours de croissance
   - Suivi de progression

4. **Notifications Proactives**
   - Rappels d'activités manquées
   - Encouragements personnalisés
   - Suggestions de ressources

---

### OBJECTIF 3: Édifier, construire, guérir et transformer les vies

**État actuel:**
- Ressources existantes (ImpactX, E-books, Vidéos)
- Pas de parcours structuré de transformation
- Pas de suivi de transformation spirituelle

**Stratégie d'implémentation:**

#### A. Nouvelles Tables

```sql
-- Table de parcours de transformation
CREATE TABLE parcours_transformation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre TEXT NOT NULL,
  description TEXT,
  duree_semaines INTEGER,
  niveau TEXT, -- 'debutant', 'intermediaire', 'avance'
  thematique TEXT, -- 'guerison', 'restauration', 'caractere_christ', 'identite', etc.
  ordre INTEGER,
  statut TEXT DEFAULT 'actif',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Modules d'un parcours
CREATE TABLE modules_parcours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcours_id UUID REFERENCES parcours_transformation(id),
  titre TEXT,
  description TEXT,
  type_contenu TEXT, -- 'video', 'texte', 'audio', 'exercice'
  contenu_id UUID, -- référence vers la ressource
  ordre INTEGER,
  duree_estimee_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Progression utilisateur dans les parcours
CREATE TABLE user_parcours_progression (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id),
  parcours_id UUID REFERENCES parcours_transformation(id),
  date_debut DATE,
  date_fin DATE,
  statut TEXT DEFAULT 'en_cours', -- 'en_cours', 'complete', 'abandonne'
  progression_pourcentage INTEGER DEFAULT 0,
  notes_personnelles TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, parcours_id)
);

-- Journal de transformation (réflexions, témoignages)
CREATE TABLE journal_transformation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id),
  date DATE,
  theme TEXT,
  reflexion TEXT,
  versets TEXT[],
  prieres TEXT,
  gratitude TEXT[],
  private BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Évaluations de croissance spirituelle
CREATE TABLE evaluations_croissance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id),
  date_evaluation DATE,
  domaine TEXT, -- 'foi', 'priere', 'service', 'relations', 'caractere'
  score_avant INTEGER, -- 1-10
  score_apres INTEGER, -- 1-10 (après parcours/intervention)
  observations TEXT,
  evaluateur_id UUID REFERENCES profils(id), -- mentor ou auto-évaluation
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### B. Nouvelles Fonctionnalités

1. **Bibliothèque de Parcours de Transformation**
   - Parcours thématiques (Guérison, Restauration, Caractère de Christ, Leadership)
   - Recommandations personnalisées selon profil
   - Suivi de progression visuel

2. **Journal Personnel de Transformation**
   - Journaling quotidien/hebdomadaire
   - Templates de réflexion
   - Partage optionnel avec mentor

3. **Système d'Évaluation Continue**
   - Auto-évaluations régulières
   - Évaluations par mentor
   - Graphiques de croissance dans le temps

4. **Ressources de Guérison et Restauration**
   - Contenus dédiés
   - Références bibliques par thème
   - Témoignages de transformation

5. **Module de Suivi Post-Crise**
   - Accompagnement spécialisé
   - Ressources ciblées
   - Check-ins réguliers

---

### OBJECTIF 4: Déployer les âmes embrasées (Plateforme pastorale missionnaire)

**État actuel:**
- Pas de module dédié aux missions
- Pas de gestion des appelés/ministères

**Stratégie d'implémentation:**

#### A. Nouvelles Tables

```sql
-- Table des appels et ministères
CREATE TABLE appels_ministres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id) UNIQUE,
  appel_confirme BOOLEAN DEFAULT false,
  type_appel TEXT[], -- 'pasteur', 'evangeliste', 'enseignant', 'missionnaire', 'diable', 'worship', etc.
  date_confirmation DATE,
  confirme_par_id UUID REFERENCES profils(id), -- qui a confirmé l'appel
  zones_geographiques TEXT[], -- où ils se sentent appelés
  competences TEXT[],
  experience TEXT,
  vision TEXT,
  statut TEXT DEFAULT 'en_discernement', -- 'en_discernement', 'confirme', 'en_formation', 'deploye'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des missions/projets
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  description TEXT,
  type_mission TEXT, -- 'locale', 'nationale', 'internationale', 'online'
  zone_geographique TEXT,
  date_debut DATE,
  date_fin DATE,
  responsable_id UUID REFERENCES profils(id),
  budget_estime NUMERIC,
  statut TEXT DEFAULT 'planifiee',
  besoins TEXT[], -- ressources, personnes, compétences nécessaires
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table de liaison mission-participants
CREATE TABLE mission_participants (
  mission_id UUID REFERENCES missions(id),
  user_id UUID REFERENCES profils(id),
  role TEXT, -- 'responsable', 'coordinateur', 'participant', 'intercesseur'
  date_inscription TIMESTAMP DEFAULT NOW(),
  statut TEXT DEFAULT 'inscrit',
  PRIMARY KEY (mission_id, user_id)
);

-- Table de témoignages missionnaires
CREATE TABLE temoignages_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_id UUID REFERENCES missions(id),
  user_id UUID REFERENCES profils(id),
  titre TEXT,
  contenu TEXT,
  photos_urls TEXT[],
  videos_urls TEXT[],
  date_publication TIMESTAMP DEFAULT NOW(),
  approuve BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table de besoins missionnaires (finances, ressources)
CREATE TABLE besoins_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_id UUID REFERENCES missions(id),
  type_besoin TEXT, -- 'finance', 'materiel', 'personnel', 'priere'
  description TEXT,
  montant NUMERIC, -- si financier
  quantite INTEGER,
  collecte_actuelle NUMERIC DEFAULT 0,
  date_limite DATE,
  statut TEXT DEFAULT 'ouvert',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### B. Nouvelles Fonctionnalités

1. **Plateforme "Embrasés" / "Appelés"**
   - Profil d'appelé avec formulaire de déclaration
   - Tableau de bord des appelés pour leadership
   - Matching appelés-missions selon compétences/zones

2. **Gestion des Missions**
   - Création et gestion de missions
   - Inscription aux missions
   - Suivi de participation
   - Partage de témoignages

3. **Système de Collecte/Dons**
   - Intégration paiement (Stripe/PayPal)
   - Suivi des besoins financiers
   - Transparence des collectes

4. **Carte Interactive des Missions**
   - Visualisation géographique
   - Zones de service
   - Besoins par région

5. **Formation Missionnaire**
   - Ressources pour appelés
   - Modules de préparation
   - Certifications (optionnel)

---

### OBJECTIF 5: Connecter les brebis (mariage, affaires, etc.)

**État actuel:**
- Pas de réseau social interne
- Pas de marketplace ou connexions professionnelles
- Pas de système de matching

**Stratégie d'implémentation:**

#### A. Nouvelles Tables

```sql
-- Table de profils étendus pour connexions
CREATE TABLE profils_connexion (
  user_id UUID PRIMARY KEY REFERENCES profils(id),
  -- Informations pour connexions
  statut_matrimonial TEXT, -- 'celibataire', 'marie', 'divorce', 'veuf'
  recherche_relation TEXT, -- 'mariage', 'amitie', 'affaires', 'ministere'
  profession TEXT,
  secteur_activite TEXT,
  competences TEXT[],
  interets TEXT[],
  disponibilite_connexions BOOLEAN DEFAULT true,
  preferences_connexion JSONB, -- critères de matching
  visible_dans_reseau BOOLEAN DEFAULT false, -- consentement explicite
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table de demandes de connexion
CREATE TABLE demandes_connexion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  demandeur_id UUID REFERENCES profils(id),
  destinataire_id UUID REFERENCES profils(id),
  type_connexion TEXT, -- 'mariage', 'affaires', 'amitie', 'ministere'
  message TEXT,
  statut TEXT DEFAULT 'en_attente', -- 'en_attente', 'acceptee', 'refusee', 'bloquee'
  date_demande TIMESTAMP DEFAULT NOW(),
  date_reponse TIMESTAMP,
  UNIQUE(demandeur_id, destinataire_id, type_connexion)
);

-- Table de connexions établies
CREATE TABLE connexions_etablies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES profils(id),
  user2_id UUID REFERENCES profils(id),
  type_connexion TEXT,
  date_connexion TIMESTAMP DEFAULT NOW(),
  statut TEXT DEFAULT 'active',
  UNIQUE(user1_id, user2_id, type_connexion)
);

-- Table d'annonces (affaires, services)
CREATE TABLE annonces_reseau (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id),
  type_annonce TEXT, -- 'offre_emploi', 'recherche_emploi', 'service', 'produit', 'partenariat'
  titre TEXT,
  description TEXT,
  categorie TEXT,
  zone_geographique TEXT,
  prix NUMERIC, -- si applicable
  contact_info TEXT,
  photos_urls TEXT[],
  date_publication TIMESTAMP DEFAULT NOW(),
  date_expiration DATE,
  statut TEXT DEFAULT 'active',
  approuve BOOLEAN DEFAULT false, -- modération
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table de favoris/sauvegardes
CREATE TABLE favoris_connexions (
  user_id UUID REFERENCES profils(id),
  annonce_id UUID REFERENCES annonces_reseau(id),
  date_ajout TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, annonce_id)
);
```

#### B. Nouvelles Fonctionnalités

1. **Réseau Social Interne "Connect"**
   - Profils visibles (avec consentement)
   - Recherche de membres selon critères
   - Demandes de connexion
   - Messagerie interne (ou intégration email)

2. **Module "Mariage"** (avec modération stricte)
   - Profils célibataires (opt-in strict)
   - Matching basé sur critères spirituels + personnels
   - Accompagnement par mentors
   - Modération de toutes les interactions

3. **Marketplace "Affaires & Services"**
   - Annonces d'emploi
   - Offres de services entre membres
   - Recherche par catégorie/zone
   - Système de recommandations

4. **Partenariats Ministériels**
   - Recherche de partenaires pour projets
   - Collaboration entre ministères
   - Partage de ressources

5. **Gestion de la Vie Privée**
   - Contrôle granulaire de la visibilité
   - Consentement explicite pour chaque type de connexion
   - Signalement d'abus intégré

---

### OBJECTIF 6: Préparer à briller nos membres (Influence et disciples)

**État actuel:**
- ImpactX existe (formation leadership)
- Pas de module dédié à l'influence
- Pas de suivi d'impact

**Stratégie d'implémentation:**

#### A. Nouvelles Tables

```sql
-- Table de stratégies d'influence
CREATE TABLE strategies_influence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id),
  sphere_influence TEXT[], -- 'famille', 'travail', 'ecole', 'quartier', 'online', 'eglise'
  objectifs TEXT[],
  actions_planifiees JSONB,
  date_debut DATE,
  statut TEXT DEFAULT 'planifiee',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table de suivi d'impact
CREATE TABLE suivi_impact (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id),
  date DATE,
  sphere TEXT,
  action TEXT,
  personnes_atteintes INTEGER,
  conversions INTEGER,
  disciples_engendres INTEGER,
  temoignages TEXT,
  challenges TEXT,
  prochaines_etapes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table de témoignages d'influence
CREATE TABLE temoignages_influence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auteur_id UUID REFERENCES profils(id),
  titre TEXT,
  contenu TEXT,
  sphere TEXT,
  personnes_impactees INTEGER,
  photos_urls TEXT[],
  videos_urls TEXT[],
  date_publication TIMESTAMP DEFAULT NOW(),
  approuve BOOLEAN DEFAULT false,
  partage_reseau BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table de ressources pour l'influence
CREATE TABLE ressources_influence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre TEXT,
  type TEXT, -- 'formation', 'outil', 'template', 'guide'
  contenu TEXT,
  fichier_url TEXT,
  sphere_cible TEXT[],
  ordre INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### B. Nouvelles Fonctionnalités

1. **Module "Briller" / "Influence"**
   - Parcours de formation à l'influence
   - Identification des sphères d'influence personnelles
   - Plan d'action personnalisé

2. **Journal d'Impact**
   - Suivi régulier des actions d'influence
   - Mesure d'impact (personnes atteintes, conversions)
   - Témoignages d'influence

3. **Ressources et Outils**
   - Guides par sphère d'influence
   - Templates de partage
   - Exemples de bonnes pratiques

4. **Galerie de Témoignages**
   - Partage d'histoires d'impact
   - Inspiration mutuelle
   - Célébration des victoires

5. **Tableau de Bord d'Impact**
   - Statistiques personnelles
   - Objectifs vs réalisations
   - Graphiques de progression

---

### OBJECTIF 7: Assister les nécessiteux (Ne laisser personne sur le carreau)

**État actuel:**
- Pas de système d'assistance
- Pas de gestion des besoins

**Stratégie d'implémentation:**

#### A. Nouvelles Tables

```sql
-- Table de besoins déclarés
CREATE TABLE besoins_assistance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id),
  type_besoin TEXT, -- 'financier', 'materiel', 'alimentaire', 'logement', 'transport', 'medical', 'spirituel', 'accompagnement'
  description TEXT,
  urgence TEXT DEFAULT 'normale', -- 'normale', 'urgente', 'critique'
  montant_requis NUMERIC, -- si financier
  montant_collecte NUMERIC DEFAULT 0,
  date_limite DATE,
  statut TEXT DEFAULT 'ouvert', -- 'ouvert', 'en_cours', 'resolu', 'ferme'
  anonyme BOOLEAN DEFAULT false,
  assigne_a_id UUID REFERENCES profils(id), -- responsable suivi
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table de contributions/dons
CREATE TABLE contributions_assistance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  besoin_id UUID REFERENCES besoins_assistance(id),
  contributeur_id UUID REFERENCES profils(id),
  montant NUMERIC,
  type_contribution TEXT, -- 'argent', 'materiel', 'temps', 'service'
  description TEXT,
  anonyme BOOLEAN DEFAULT false,
  date_contribution TIMESTAMP DEFAULT NOW(),
  statut TEXT DEFAULT 'confirme' -- 'confirme', 'annule'
);

-- Table de bénévoles/service
CREATE TABLE benevoles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id),
  competences TEXT[],
  disponibilites JSONB, -- jours/heures disponibles
  zones_intervention TEXT[],
  statut TEXT DEFAULT 'actif',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table d'assignation besoins-bénévoles
CREATE TABLE assignations_besoins (
  besoin_id UUID REFERENCES besoins_assistance(id),
  benevole_id UUID REFERENCES profils(id),
  role TEXT, -- 'coordinateur', 'benevole'
  date_assignation TIMESTAMP DEFAULT NOW(),
  statut TEXT DEFAULT 'active',
  PRIMARY KEY (besoin_id, benevole_id)
);

-- Table de suivi de résolution
CREATE TABLE suivi_resolution (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  besoin_id UUID REFERENCES besoins_assistance(id),
  date_resolution DATE,
  resolution_description TEXT,
  personnes_impliquees UUID[], -- IDs des contributeurs
  temoignage TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### B. Nouvelles Fonctionnalités

1. **Module "Assistance" / "Besoins"**
   - Formulaire de déclaration de besoin (anonyme optionnel)
   - Vue d'ensemble pour coordonnateurs
   - Système d'assignation

2. **Plateforme de Contributions**
   - Dons financiers (intégration paiement)
   - Dons en nature
   - Bénévolat/service
   - Suivi de collecte en temps réel

3. **Réseau de Bénévoles**
   - Inscription comme bénévole
   - Matching besoins-compétences
   - Planning de service

4. **Tableau de Bord "Personne sur le Carreau"**
   - Vue d'ensemble des besoins non résolus
   - Alertes pour besoins urgents
   - Statistiques d'assistance

5. **Système de Confidentialité**
   - Gestion de l'anonymat
   - Contrôle d'accès selon rôles
   - Respect de la dignité

6. **Suivi et Témoignages**
   - Résolution documentée
   - Témoignages (avec consentement)
   - Impact mesuré

---

### OBJECTIF 8: Protection des âmes (Détection d'abus, signalements)

**État actuel:**
- Pas de système de signalement
- Pas de modération avancée
- Pas de détection proactive

**Stratégie d'implémentation:**

#### A. Nouvelles Tables

```sql
-- Table de signalements
CREATE TABLE signalements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signaleur_id UUID REFERENCES profils(id),
  cible_id UUID REFERENCES profils(id), -- personne/entité signalée
  type_signalement TEXT, -- 'abus_spirituel', 'harcelement', 'fraude', 'contenu_inapproprie', 'comportement_suspect', 'abus_autorite'
  description TEXT NOT NULL,
  preuves TEXT[], -- URLs de screenshots, etc.
  urgence TEXT DEFAULT 'normale',
  statut TEXT DEFAULT 'nouveau', -- 'nouveau', 'en_cours', 'resolu', 'rejete', 'escalade'
  assigne_a_id UUID REFERENCES profils(id), -- modérateur/admin
  date_signalement TIMESTAMP DEFAULT NOW(),
  date_resolution TIMESTAMP,
  resolution_notes TEXT,
  anonyme BOOLEAN DEFAULT false
);

-- Table d'actions de modération
CREATE TABLE actions_moderation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signalement_id UUID REFERENCES signalements(id),
  modérateur_id UUID REFERENCES profils(id),
  action_type TEXT, -- 'avertissement', 'suspension', 'bannissement', 'escalade_autorites', 'aucune_action'
  description TEXT,
  duree_suspension INTEGER, -- en jours, si applicable
  date_action TIMESTAMP DEFAULT NOW()
);

-- Table de profils à risque (interne, non visible aux utilisateurs)
CREATE TABLE profils_risque (
  user_id UUID REFERENCES profils(id) PRIMARY KEY,
  score_risque INTEGER DEFAULT 0, -- 0-100
  raisons TEXT[],
  signalements_count INTEGER DEFAULT 0,
  dernier_signalement DATE,
  statut_surveillance TEXT DEFAULT 'normal', -- 'normal', 'surveille', 'suspendu', 'banni'
  notes_internes TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table de logs d'activité suspecte
CREATE TABLE logs_activite_suspecte (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id),
  type_activite TEXT,
  description TEXT,
  score_suspicion INTEGER,
  automatique BOOLEAN DEFAULT true, -- détecté automatiquement ou manuel
  date_detection TIMESTAMP DEFAULT NOW()
);

-- Table de politique de sécurité
CREATE TABLE politiques_securite (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT,
  description TEXT,
  regles JSONB, -- règles automatisées
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### B. Nouvelles Fonctionnalités

1. **Système de Signalement**
   - Bouton de signalement omniprésent
   - Formulaire structuré
   - Upload de preuves
   - Suivi du statut du signalement

2. **Dashboard de Modération**
   - Vue d'ensemble des signalements
   - Priorisation selon urgence
   - Historique d'actions
   - Statistiques

3. **Détection Automatique**
   - Patterns suspects (trop de connexions, messages répétitifs, etc.)
   - Alertes automatiques
   - Scoring de risque

4. **Protection des Signaleurs**
   - Anonymat garanti
   - Protection contre représailles
   - Communication sécurisée

5. **Escalade et Actions**
   - Workflow d'escalade
   - Actions de modération (avertissement, suspension, bannissement)
   - Communication avec parties concernées
   - Documentation complète

6. **Formation et Ressources**
   - Guide de détection d'abus spirituel
   - Ressources pour victimes
   - Support psychologique (liens externes)

---

### OBJECTIF 9: Évaluer l'engagement des leaders (hebdomadaire/mensuel)

**État actuel:**
- Statistiques de base existent
- Pas d'évaluation structurée des leaders
- Pas de tableaux de bord dédiés

**Stratégie d'implémentation:**

#### A. Nouvelles Tables

```sql
-- Table de définition des KPIs (Key Performance Indicators)
CREATE TABLE kpis_leaders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT UNIQUE,
  description TEXT,
  categorie TEXT, -- 'discipolat', 'presence', 'service', 'formation', 'evangelisation'
  type_mesure TEXT, -- 'nombre', 'pourcentage', 'score', 'tendance'
  formule_calcul TEXT, -- description ou formule
  cible_minimum NUMERIC,
  poids INTEGER, -- importance relative (pour scoring global)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table d'évaluations hebdomadaires
CREATE TABLE evaluations_hebdomadaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  leader_id UUID REFERENCES profils(id),
  semaine DATE, -- lundi de la semaine
  -- KPIs mesurables
  disciples_nouveaux INTEGER DEFAULT 0,
  disciples_affermis INTEGER DEFAULT 0,
  presence_culte INTEGER DEFAULT 0,
  presence_activites INTEGER DEFAULT 0,
  prieres_effectuees INTEGER DEFAULT 0,
  ressources_consultees INTEGER DEFAULT 0,
  service_heures INTEGER DEFAULT 0,
  temoignages_partages INTEGER DEFAULT 0,
  -- Score calculé
  score_total NUMERIC,
  score_categorie JSONB, -- scores par catégorie
  -- Évaluation qualitative
  points_forts TEXT,
  defis TEXT,
  objectifs_semaine_suivante TEXT,
  -- Validation
  valide_par_id UUID REFERENCES profils(id), -- supérieur hiérarchique
  date_validation TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(leader_id, semaine)
);

-- Table d'évaluations mensuelles (plus complètes)
CREATE TABLE evaluations_mensuelles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  leader_id UUID REFERENCES profils(id),
  mois DATE, -- premier jour du mois
  -- Agrégation des KPIs
  score_moyen_semaines NUMERIC,
  tendance TEXT, -- 'croissance', 'stable', 'decroissance'
  -- Évaluation détaillée
  bilan_activites TEXT,
  objectifs_atteints TEXT[],
  objectifs_non_atteints TEXT[],
  defis_rencontres TEXT,
  formations_suivies TEXT[],
  -- Objectifs mois suivant
  objectifs_mois_suivant JSONB,
  -- Entretien
  date_entretien DATE,
  notes_entretien TEXT,
  plan_action TEXT,
  -- Validation
  valide_par_id UUID REFERENCES profils(id),
  date_validation TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(leader_id, mois)
);

-- Table de profils de leaders
CREATE TABLE profils_leaders (
  user_id UUID PRIMARY KEY REFERENCES profils(id),
  niveau_hierarchique TEXT, -- 'responsable_cellule', 'coordinateur', 'pasteur_assistant', 'pasteur', etc.
  pilier TEXT[], -- domaines de responsabilité: 'discipolat', 'worship', 'jeunesse', 'enfants', 'evangelisation', etc.
  date_nomination DATE,
  superviseur_id UUID REFERENCES profils(id),
  statut TEXT DEFAULT 'actif',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table d'historique de performance
CREATE TABLE historique_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  leader_id UUID REFERENCES profils(id),
  periode_type TEXT, -- 'hebdomadaire', 'mensuelle'
  periode_date DATE,
  score NUMERIC,
  classement INTEGER, -- position relative (optionnel, si comparaison)
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### B. Nouvelles Fonctionnalités

1. **Dashboard Leader Personnel**
   - Vue d'ensemble KPIs
   - Graphiques de tendances
   - Comparaison objectifs vs réalisations
   - Alertes pour objectifs non atteints

2. **Formulaire d'Évaluation Hebdomadaire**
   - Auto-évaluation
   - Saisie des KPIs
   - Commentaires et objectifs
   - Soumission pour validation

3. **Formulaire d'Évaluation Mensuelle**
   - Bilan complet
   - Analyse de tendances
   - Planification
   - Entretien avec superviseur

4. **Dashboard Superviseur/Admin**
   - Vue d'ensemble de tous les leaders
   - Tableaux comparatifs
   - Identification des leaders en difficulté
   - Détection de patterns

5. **Rapports et Analytics**
   - Rapports personnalisés
   - Export PDF/Excel
   - Historique de performance
   - Prédictions de tendances

6. **Système de Piliers**
   - Attribution de piliers aux leaders
   - KPIs spécifiques par pilier
   - Tableaux de bord par pilier

---

### OBJECTIF 10: Identifier les VRAIS disciples (distinction foule/disciples)

**État actuel:**
- Tous les utilisateurs sont dans `profils`
- Pas de distinction claire foule vs disciples
- Pas de critères définis

**Stratégie d'implémentation:**

#### A. Nouvelles Tables

```sql
-- Table de statut de discipolat
CREATE TABLE statut_discipolat (
  user_id UUID PRIMARY KEY REFERENCES profils(id),
  est_disciple BOOLEAN DEFAULT false,
  date_debut_discipolat DATE, -- quand ils sont devenus disciples
  niveau_discipolat TEXT DEFAULT 'nouveau', -- 'nouveau', 'affermi', 'multipliant'
  criteres_remplis JSONB, -- quels critères ils remplissent
  engagement_volontaire BOOLEAN DEFAULT false, -- ont-ils fait un engagement explicite
  renoncement_confirme BOOLEAN DEFAULT false, -- ont-ils accepté de renoncer à eux-mêmes
  vision_portee BOOLEAN DEFAULT false, -- portent-ils la vision
  suivi_actif BOOLEAN DEFAULT true,
  mentor_assignee_id UUID REFERENCES profils(id),
  date_evaluation DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table de critères de discipolat (configurable)
CREATE TABLE criteres_discipolat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT UNIQUE,
  description TEXT,
  type_critere TEXT, -- 'obligatoire', 'souhaitable'
  mesure TEXT, -- comment le mesurer
  ordre INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table d'évaluation de critères par utilisateur
CREATE TABLE evaluation_criteres_discipolat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id),
  critere_id UUID REFERENCES criteres_discipolat(id),
  rempli BOOLEAN DEFAULT false,
  date_evaluation DATE,
  evaluateur_id UUID REFERENCES profils(id),
  preuves TEXT[], -- liens vers preuves (présence, engagement, etc.)
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, critere_id, date_evaluation)
);

-- Table d'engagement de discipolat (déclaration formelle)
CREATE TABLE engagements_discipolat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id),
  date_engagement DATE,
  declaration TEXT, -- texte de leur engagement
  renoncement_confirme BOOLEAN,
  vision_acceptee BOOLEAN,
  temoin_id UUID REFERENCES profils(id), -- qui a été témoin de cet engagement
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table de suivi de progression discipolat
CREATE TABLE progression_discipolat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id),
  date_mesure DATE,
  score_engagement NUMERIC, -- 0-100
  indicateurs JSONB, -- divers indicateurs
  niveau_avant TEXT,
  niveau_apres TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### B. Nouvelles Fonctionnalités

1. **Système de Classification Automatique**
   - Algorithme de scoring basé sur critères
   - Distinction automatique foule/disciples
   - Mise à jour dynamique

2. **Formulaire d'Engagement de Discipolat**
   - Déclaration formelle
   - Confirmation de renoncement
   - Acceptation de la vision
   - Enregistrement avec témoin

3. **Dashboard "Vrais Disciples"**
   - Liste des disciples confirmés
   - Statistiques séparées (foule vs disciples)
   - Suivi de progression
   - Alertes pour engagement faible

4. **Évaluation Continue**
   - Check-ins réguliers
   - Évaluation des critères
   - Progression dans les niveaux
   - Actions correctives si nécessaire

5. **Comptage Séparé**
   - Statistiques distinctes foule/disciples
   - Rapports dédiés
   - Focus sur croissance des disciples (pas seulement foule)

6. **Outils pour Dimanches**
   - Identification rapide des disciples présents
   - Focus sur accompagnement disciples
   - Priorisation des ressources

---

### OBJECTIF 11: Transformer nouveaux convertis en disciples affermis (3 mois)

**État actuel:**
- Suivi de nouveaux convertis existe dans `cercle_personnes` avec `circle_type`
- Pas de parcours structuré 3 mois
- Pas de suivi d'affermissement

**Stratégie d'implémentation:**

#### A. Nouvelles Tables

```sql
-- Table de parcours d'affermissement (template)
CREATE TABLE parcours_affermissement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT,
  duree_jours INTEGER DEFAULT 90, -- 3 mois
  description TEXT,
  objectifs TEXT[],
  modules JSONB, -- structure du parcours
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table de suivi d'affermissement par nouveau converti
CREATE TABLE suivi_affermissement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id),
  date_conversion DATE,
  date_debut_parcours DATE,
  date_fin_prevue DATE,
  parcours_id UUID REFERENCES parcours_affermissement(id),
  statut TEXT DEFAULT 'en_cours', -- 'en_cours', 'complete', 'abandonne', 'prolonge'
  -- Étapes du parcours
  etape_actuelle INTEGER DEFAULT 1,
  etapes_completees JSONB, -- quelles étapes sont complètes
  -- Évaluations
  evaluation_1_mois JSONB, -- évaluation après 1 mois
  evaluation_2_mois JSONB, -- évaluation après 2 mois
  evaluation_finale JSONB, -- évaluation finale
  -- Accompagnement
  mentor_assignee_id UUID REFERENCES profils(id),
  parrain_id UUID REFERENCES profils(id), -- disciple plus mature qui parraine
  cellule_assignee_id UUID, -- référence vers cellule/groupe
  -- Enracinement
  ressources_consultees TEXT[],
  presence_activites INTEGER DEFAULT 0,
  prieres_effectuees INTEGER DEFAULT 0,
  relations_etablies UUID[], -- autres membres connectés
  -- Risques
  signaux_alerte TEXT[], -- signaux de risque d'abandon
  interventions TEXT[], -- actions prises
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date_conversion)
);

-- Table d'étapes d'affermissement (structure modulaire)
CREATE TABLE etapes_affermissement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcours_id UUID REFERENCES parcours_affermissement(id),
  ordre INTEGER,
  titre TEXT,
  description TEXT,
  duree_jours INTEGER,
  type_etape TEXT, -- 'formation', 'pratique', 'evaluation', 'rencontre'
  contenu_id UUID, -- référence vers ressource
  objectifs TEXT[],
  criteres_reussite TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table de checklist d'affermissement
CREATE TABLE checklist_affermissement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suivi_id UUID REFERENCES suivi_affermissement(id),
  item TEXT,
  categorie TEXT, -- 'fondements', 'pratiques', 'relations', 'service'
  complete BOOLEAN DEFAULT false,
  date_completion DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table d'alertes d'affermissement
CREATE TABLE alertes_affermissement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suivi_id UUID REFERENCES suivi_affermissement(id),
  type_alerte TEXT, -- 'absence_prolongee', 'pas_de_progression', 'signaux_abandon', 'besoin_soutien'
  severite TEXT DEFAULT 'moyenne', -- 'faible', 'moyenne', 'elevee', 'critique'
  description TEXT,
  action_requise TEXT,
  assigne_a_id UUID REFERENCES profils(id),
  date_alerte TIMESTAMP DEFAULT NOW(),
  date_resolution TIMESTAMP,
  resolue BOOLEAN DEFAULT false
);
```

#### B. Nouvelles Fonctionnalités

1. **Parcours Automatique 3 Mois**
   - Déclenchement automatique à la conversion
   - Structure modulaire (12-13 semaines)
   - Progression guidée

2. **Dashboard "Nouveaux Convertis"**
   - Vue d'ensemble de tous les nouveaux convertis
   - Statut de progression
   - Alertes pour ceux en difficulté
   - Statistiques de réussite

3. **Système de Parrainage**
   - Assignation automatique de parrain
   - Suivi des rencontres
   - Support mutuel

4. **Checklist d'Affermissement**
   - Items à compléter
   - Suivi visuel de progression
   - Validation par mentor

5. **Système d'Alertes Proactif**
   - Détection automatique de signaux d'alerte
   - Notifications aux mentors
   - Interventions rapides

6. **Évaluations Périodiques**
   - Évaluation à 1 mois, 2 mois, 3 mois
   - Mesure de progression
   - Ajustement du parcours si nécessaire

7. **Ressources Ciblées**
   - Contenus spécifiques nouveaux convertis
   - Étapes progressives
   - Support adapté

8. **Métriques de Succès**
   - Taux de rétention 3 mois
   - Taux d'affermissement
   - Identification des facteurs de succès

---

### OBJECTIF 12: Remplir les cultes (1000+ personnes)

**État actuel:**
- Suivi de présence de base existe (`attendance_records`, `attendance_tracking`)
- Module `AttendanceTracking` existe avec suivi dimanche matin, dimanche soir, samedi prière
- **À ENRICHIR:** 
  - Pas de suivi spécifique pour EDJ (samedi après-midi)
  - Pas d'analyse automatique sur 3 mois glissants
  - Pas de rapports automatiques d'absences aux mentors
  - Pas de système d'alertes proactif
- Pas de gestion de capacité de salle
- Pas de réservation/inscription aux cultes

**Stratégie d'implémentation:**

#### A. Nouvelles Tables

```sql
-- Table de configuration des cultes
CREATE TABLE configuration_culte (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT, -- 'Culte Matin', 'Culte Après-midi', 'EJP'
  jour_semaine INTEGER, -- 0=dimanche
  heure_debut TIME,
  heure_fin TIME,
  salle TEXT, -- 'Topaze', 'Auditorium'
  capacite_max INTEGER,
  capacite_comfort INTEGER, -- capacité confortable
  type_culte TEXT, -- 'principal', 'ejp', 'special'
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table des cultes (instances)
CREATE TABLE cultes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  configuration_id UUID REFERENCES configuration_culte(id),
  date_culte DATE,
  heure_debut TIME,
  heure_fin TIME,
  theme TEXT,
  orateur_principal TEXT,
  capacite_max INTEGER,
  inscriptions_ouvertes BOOLEAN DEFAULT true,
  statut TEXT DEFAULT 'planifie', -- 'planifie', 'en_cours', 'termine', 'annule'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(configuration_id, date_culte)
);

-- Table d'inscriptions aux cultes
CREATE TABLE inscriptions_culte (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  culte_id UUID REFERENCES cultes(id),
  user_id UUID REFERENCES profils(id),
  nombre_personnes INTEGER DEFAULT 1, -- si inscription pour famille
  statut TEXT DEFAULT 'inscrit', -- 'inscrit', 'present', 'absent', 'annule'
  date_inscription TIMESTAMP DEFAULT NOW(),
  date_presence TIMESTAMP, -- quand ils ont été marqués présents
  notes TEXT,
  UNIQUE(culte_id, user_id)
);

-- Table de présence réelle (scan QR code, etc.)
CREATE TABLE presence_culte (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  culte_id UUID REFERENCES cultes(id),
  user_id UUID REFERENCES profils(id),
  heure_arrivee TIMESTAMP,
  heure_depart TIMESTAMP,
  methode_enregistrement TEXT, -- 'qr_code', 'manuel', 'automatique'
  enregistre_par_id UUID REFERENCES profils(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(culte_id, user_id)
);

-- Table de statistiques de culte
CREATE TABLE statistiques_culte (
  culte_id UUID PRIMARY KEY DEFAULT REFERENCES cultes(id),
  inscriptions_total INTEGER DEFAULT 0,
  presence_reelle INTEGER DEFAULT 0,
  taux_presence NUMERIC, -- pourcentage
  nouveaux_visiteurs INTEGER DEFAULT 0,
  nouveaux_convertis INTEGER DEFAULT 0,
  offrande_total NUMERIC,
  temps_culte_minutes INTEGER,
  feedback_score NUMERIC, -- score moyen de satisfaction
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table d'invitations de culte
CREATE TABLE invitations_culte (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  culte_id UUID REFERENCES cultes(id),
  inviteur_id UUID REFERENCES profils(id),
  invite_email TEXT,
  invite_nom TEXT,
  invite_telephone TEXT,
  statut TEXT DEFAULT 'envoyee', -- 'envoyee', 'acceptee', 'refusee', 'presente'
  date_invitation TIMESTAMP DEFAULT NOW(),
  date_reponse TIMESTAMP,
  code_invitation TEXT UNIQUE -- pour suivi
);
```

#### B. Nouvelles Fonctionnalités

1. **Système de Réservation/Inscription**
   - Inscription en ligne aux cultes
   - Gestion de capacité
   - Listes d'attente si complet
   - Confirmation par email/SMS

2. **Gestion de Capacité Intelligente**
   - Alertes quand approche de la capacité
   - Suggestion d'organiser 2 cultes
   - Répartition automatique

3. **Système d'Invitation**
   - Invitation par membres
   - Code QR pour invités
   - Suivi des invitations

4. **Check-in Digital**
   - QR code personnel pour check-in rapide
   - Identification des nouveaux visiteurs
   - Statistiques en temps réel

5. **Dashboard "Remplissage Cultes"**
   - Vue d'ensemble des prochains cultes
   - Taux de remplissage
   - Prédictions
   - Actions recommandées

6. **Communication Proactive**
   - Rappels automatiques
   - Invitations ciblées
   - Motivation à inviter

7. **Analytics et Optimisation**
   - Analyse des tendances
   - Identification des meilleurs créneaux
   - Optimisation de la capacité
   - A/B testing de stratégies

8. **Gestion Multi-Cultes**
   - Support pour 2+ cultes le même jour
   - Répartition intelligente
   - Statistiques consolidées

#### C. Suivi de Présence Détaillé des Disciples (ENRICHISSEMENT)

**Spécifications requises:**
- Suivi de présence pour **3 types de cultes**:
  - **Culte du Dimanche Matin**
  - **Culte du Samedi Soir**
  - **Culte du Samedi Après-midi** (pour les jeunes de l'EDJ - École du Dimanche pour Jeunes)
- Vérification de l'état des présences sur **3 mois glissants**
- **Rapport automatique** des disciples absents envoyé au mentor **chaque dimanche soir**

**Tables supplémentaires nécessaires:**

```sql
-- Table de configuration des types de culte pour suivi
CREATE TABLE types_culte_suivi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE, -- 'dimanche_matin', 'samedi_soir', 'samedi_apres_midi_edj'
  nom TEXT NOT NULL,
  jour_semaine INTEGER, -- 0=dimanche, 6=samedi
  heure_debut TIME,
  heure_fin TIME,
  cible TEXT, -- 'tous', 'jeunes', 'adultes'
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table de suivi de présence détaillé par disciple (extension de attendance_tracking)
CREATE TABLE presence_disciples_cultes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  disciple_id UUID REFERENCES cercle_personnes(id),
  user_id UUID REFERENCES profils(id), -- mentor du disciple
  type_culte_id UUID REFERENCES types_culte_suivi(id),
  date_culte DATE NOT NULL,
  statut TEXT DEFAULT 'absent', -- 'present', 'absent', 'excuse', 'retard'
  heure_arrivee TIME, -- si présent
  heure_depart TIME, -- si présent
  raison_absence TEXT, -- si absent ou excuse
  excusee BOOLEAN DEFAULT false, -- absence excusée
  enregistre_par_id UUID REFERENCES profils(id), -- qui a enregistré la présence
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(disciple_id, type_culte_id, date_culte)
);

-- Table d'analyse de présence sur 3 mois
CREATE TABLE analyse_presence_3mois (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  disciple_id UUID REFERENCES cercle_personnes(id),
  user_id UUID REFERENCES profils(id), -- mentor
  periode_debut DATE,
  periode_fin DATE,
  type_culte_id UUID REFERENCES types_culte_suivi(id),
  -- Statistiques
  total_cultes INTEGER DEFAULT 0, -- nombre total de cultes dans la période
  total_presents INTEGER DEFAULT 0,
  total_absents INTEGER DEFAULT 0,
  total_excuses INTEGER DEFAULT 0,
  total_retards INTEGER DEFAULT 0,
  taux_presence NUMERIC, -- pourcentage
  -- Analyse
  tendance TEXT, -- 'croissante', 'stable', 'decroissante', 'irreguliere'
  consecutifs_absents INTEGER DEFAULT 0, -- absences consécutives
  pattern_absence TEXT, -- 'sporadique', 'hebdomadaire', 'mensuel', 'aucun'
  niveau_alerte TEXT DEFAULT 'normal', -- 'normal', 'attention', 'alerte', 'critique'
  -- Dates importantes
  dernier_culte_present DATE,
  dernier_culte_abscent DATE,
  date_analyse TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(disciple_id, type_culte_id, periode_debut, periode_fin)
);

-- Table de rapports automatiques d'absences
CREATE TABLE rapports_absences_mentors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID REFERENCES profils(id),
  date_rapport DATE, -- date du dimanche
  semaine_rapport TEXT, -- semaine concernée (ex: "2024-W15")
  -- Résumé
  total_disciples INTEGER DEFAULT 0,
  disciples_absents INTEGER DEFAULT 0,
  disciples_presents INTEGER DEFAULT 0,
  disciples_excuses INTEGER DEFAULT 0,
  -- Détails
  absences_details JSONB, -- liste détaillée des absents avec infos
  -- Statut
  envoye BOOLEAN DEFAULT false,
  date_envoi TIMESTAMP,
  methode_envoi TEXT, -- 'email', 'notification', 'sms'
  lu BOOLEAN DEFAULT false,
  date_lecture TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table de configuration des alertes d'absence
CREATE TABLE configuration_alertes_absence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id), -- mentor (NULL = global)
  -- Seuils
  seuil_alerte_consecutif INTEGER DEFAULT 3, -- absences consécutives = alerte
  seuil_alerte_mois INTEGER DEFAULT 50, -- % présence < 50% dans le mois = alerte
  seuil_alerte_3mois INTEGER DEFAULT 60, -- % présence < 60% sur 3 mois = alerte
  -- Fréquence rapports
  frequence_rapport TEXT DEFAULT 'hebdomadaire', -- 'hebdomadaire', 'mensuelle'
  jour_rapport INTEGER DEFAULT 0, -- 0=dimanche pour envoi dimanche soir
  heure_rapport TIME DEFAULT '20:00:00', -- 20h = 8PM dimanche soir
  -- Notifications
  email_actif BOOLEAN DEFAULT true,
  notification_app_actif BOOLEAN DEFAULT true,
  sms_actif BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Nouvelles Fonctionnalités à développer:**

1. **Enregistrement de Présence Multi-Cultes**
   - Interface unifiée pour enregistrer présence aux 3 types de cultes
   - Sélection du type de culte (Dimanche Matin, Samedi Soir, Samedi Après-midi EDJ)
   - Enregistrement par le mentor pour ses disciples
   - Option d'excuse pour absences justifiées
   - Prise en compte des retards

2. **Tableau de Bord "Présence Disciples"**
   - Vue d'ensemble de tous les disciples du mentor
   - Indicateurs visuels (présent/absent/excusé) par culte
   - Graphiques de tendances sur 3 mois
   - Filtres par type de culte
   - Tri par taux de présence

3. **Analyse Automatique sur 3 Mois**
   - Calcul automatique des statistiques de présence sur période glissante de 3 mois
   - Détection de patterns d'absence
   - Classification des niveaux d'alerte:
     - **Normal:** Présence régulière (>70%)
     - **Attention:** Quelques absences (50-70%)
     - **Alerte:** Absences fréquentes (30-50%)
     - **Critique:** Absences très fréquentes (<30%) ou absences consécutives ≥3
   - Identification des absences consécutives

4. **Rapport Automatique Hebdomadaire**
   - **Déclenchement:** Chaque dimanche soir (20h00 par défaut, configurable)
   - **Contenu du rapport:**
     - Liste des disciples absents ce dimanche
     - Liste des absences de la semaine
     - Résumé des absences sur 3 mois
     - Disciples nécessitant un suivi (alertes)
     - Recommandations d'actions
   - **Méthodes d'envoi:**
     - Email détaillé au mentor
     - Notification dans l'application
     - SMS optionnel (si activé)
   - **Format du rapport:**
     - Tableau récapitulatif
     - Graphiques de tendances
     - Détails par disciple (date dernière présence, nombre absences consécutives, etc.)
     - Actions suggérées (appel, visite, message)

5. **Page "Rapports d'Absences"**
   - Historique des rapports envoyés
   - Consultation des rapports précédents
   - Export PDF/Excel
   - Recherche par date/période

6. **Alertes Proactives en Temps Réel**
   - Notification immédiate si disciple absent 3 dimanches consécutifs
   - Alertes pour taux de présence <50% sur le mois en cours
   - Suggestions d'actions basées sur les patterns détectés

7. **Interface d'Analyse pour Mentor**
   - Vue calendrier avec présences/absences marquées
   - Filtres par disciple, type de culte, période
   - Comparaison entre disciples
   - Identification des disciples à risque
   - Suivi des interventions effectuées

8. **Configuration Personnalisée**
   - Paramétrage des seuils d'alerte par mentor
   - Choix de la fréquence des rapports
   - Personnalisation de l'heure d'envoi
   - Préférences de notification

**Workflow Automatisé (Supabase Edge Functions ou Cron Job):**

```javascript
// Fonction déclenchée chaque dimanche à 20h00
async function genererRapportsAbsences() {
  // 1. Identifier tous les mentors actifs
  // 2. Pour chaque mentor:
  //    a. Récupérer tous ses disciples
  //    b. Calculer les absences de la semaine (dimanche précédent à aujourd'hui)
  //    c. Analyser les présences sur 3 mois glissants
  //    d. Identifier les disciples absents et ceux nécessitant un suivi
  //    e. Générer le rapport détaillé
  //    f. Envoyer par email/notification selon préférences
  //    g. Enregistrer le rapport dans la base de données
}
```

**Exemple de Structure de Rapport Email:**

```
📊 RAPPORT DE PRÉSENCE - SEMAINE DU [DATE]

Bonjour [Nom Mentor],

Voici le rapport de présence de vos disciples pour la semaine du [DATE].

📈 RÉSUMÉ GLOBAL
- Total disciples: 25
- Présents ce dimanche: 20
- Absents ce dimanche: 5
- Excusés: 2

⚠️ DISCIPLES ABSENTS CE DIMANCHE
1. Jean Dupont - Absent depuis 2 dimanches consécutifs
2. Marie Martin - Première absence (à suivre)
3. Pierre Durand - Absent (excuse: maladie)

📊 ANALYSE SUR 3 MOIS
- Taux de présence moyen: 75%
- Disciples nécessitant un suivi: 3

🔴 ALERTES ACTIVES
- Sophie Laurent: Absente 4 dimanches consécutifs (CRITIQUE)
- Luc Bernard: Taux de présence 45% sur 3 mois (ALERTE)

💡 ACTIONS RECOMMANDÉES
1. Contacter Sophie Laurent (urgent)
2. Prévoir un rendez-vous avec Luc Bernard
3. Suivre Marie Martin (première absence)

[Lien vers le tableau de bord détaillé]
```

**Intégration avec Système Existant:**

- Utilisation de la table `attendance_tracking` existante comme base
- Extension avec nouvelles tables pour analyse approfondie
- Compatibilité avec système de `mentor_events` pour configuration
- Liaison avec table `cercle_personnes` pour identification disciples
- Intégration avec système de notifications existant

**Métriques à Suivre:**

- Taux de présence global par type de culte
- Taux de présence par disciple sur 3 mois
- Nombre d'absences consécutives
- Temps moyen entre dernière présence et aujourd'hui
- Efficacité des interventions (corrélation contact → retour présence)

---

## III. PLAN D'IMPLÉMENTATION GÉNÉRAL

### Phase 1: Fondations (Mois 1-2)
1. Création des tables de base de données
2. Système de classification disciples/foule (Objectif 10)
3. Module de protection/signalement (Objectif 8)
4. Amélioration suivi nouveaux convertis (Objectif 11)

### Phase 2: Engagement et Transformation (Mois 3-4)
5. Système de fidélisation et engagement (Objectif 2)
6. Parcours de transformation (Objectif 3)
7. Évaluations leaders (Objectif 9)

### Phase 3: Connexions et Déploiement (Mois 5-6)
8. Réseau de connexions (Objectif 5)
9. Plateforme missionnaire (Objectif 4)
10. Module d'influence (Objectif 6)

### Phase 4: Assistance et Évangélisation (Mois 7-8)
11. Système d'assistance (Objectif 7)
12. Module d'évangélisation/retour (Objectif 1)
13. Optimisation cultes (Objectif 12)
14. **Suivi de présence détaillé disciples + Rapports automatiques (Objectif 12 - Enrichissement)**

### Priorités Recommandées (selon impact immédiat)

**PRIORITÉ HAUTE:**
- Objectif 10 (Identifier vrais disciples) - Fondamental pour tout le reste
- Objectif 8 (Protection) - Critique pour sécurité
- Objectif 11 (Affermissement 3 mois) - Impact direct sur rétention
- Objectif 9 (Évaluation leaders) - Nécessaire pour organisation
- **Suivi de présence détaillé + Rapports automatiques (Objectif 12)** - Critique pour suivi disciples et intervention précoce

**PRIORITÉ MOYENNE:**
- Objectif 2 (Fidélisation)
- Objectif 3 (Transformation)
- Objectif 7 (Assistance)

**PRIORITÉ BASSE (peut attendre):**
- Objectif 4 (Missions) - Spécialisé
- Objectif 5 (Connexions) - Complexe, nécessite modération renforcée
- Objectif 6 (Influence) - Peut être intégré dans Objectif 3
- Objectif 1 (Évangélisation) - Amélioration progressive
- Objectif 12 (Cultes - réservation/capacité) - Optimisation continue (NOTE: Le suivi de présence détaillé est en PRIORITÉ HAUTE ci-dessus)

---

## IV. CONSIDÉRATIONS TECHNIQUES

### Intégrations Nécessaires

1. **Paiement:** Stripe ou PayPal pour dons/contributions
2. **Email:** Service d'email transactionnel (SendGrid, Mailgun, ou Supabase Email)
3. **SMS:** Twilio pour notifications SMS
4. **QR Codes:** Bibliothèque JavaScript pour génération
5. **Maps:** Google Maps API pour visualisation géographique
6. **Analytics:** Google Analytics ou alternative pour tracking

### Sécurité et Confidentialité

- Chiffrement des données sensibles
- Authentification forte (2FA recommandé)
- Logs d'audit complets
- Respect RGPD/lois de protection données
- Anonymisation où nécessaire
- Contrôle d'accès granulaire (RLS Supabase)

### Performance

- Indexation appropriée des tables
- Mise en cache des requêtes fréquentes
- Pagination pour grandes listes
- Optimisation des requêtes SQL
- CDN pour assets statiques

### UX/UI

- Design cohérent avec l'existant
- Responsive mobile-first
- Accessibilité (WCAG)
- Onboarding progressif
- Feedback utilisateur continu

---

## V. MÉTRIQUES DE SUCCÈS

Pour chaque objectif, définir des KPIs mesurables:

1. **Attirer:** Nombre de nouveaux contacts, taux de conversion visiteur→membre
2. **Fidéliser:** Score d'engagement moyen, taux de rétention
3. **Transformer:** Nombre de parcours complétés, évaluations de croissance
4. **Déployer:** Nombre d'appelés identifiés, missions lancées
5. **Connecter:** Nombre de connexions établies, satisfaction réseau
6. **Briller:** Témoignages d'impact, personnes atteintes
7. **Assister:** Besoins résolus, temps moyen de résolution
8. **Protéger:** Signalements traités, temps de réponse
9. **Évaluer:** Taux de complétion évaluations, amélioration scores
10. **Identifier:** Taux de précision classification, croissance nombre disciples
11. **Affermir:** Taux de rétention 3 mois, progression nouveaux convertis
12. **Remplir:** Taux de remplissage cultes, croissance assistance
13. **Suivi Présence Disciples:** Taux de présence moyen, efficacité des interventions, temps de réaction aux absences, taux de retour après contact mentor

---

## VI. RECOMMANDATIONS FINALES

1. **Approche Progressive:** Implémenter par phases, tester chaque module avant de passer au suivant

2. **Feedback Utilisateurs:** Intégrer régulièrement les retours des utilisateurs réels

3. **Formation:** Prévoir formation des utilisateurs (mentors, admins) pour chaque nouveau module

4. **Documentation:** Documenter chaque fonctionnalité pour maintenance future

5. **Tests:** Tests rigoureux, especially pour modules critiques (protection, paiements)

6. **Scalabilité:** Penser à la croissance future dès le design initial

7. **Modération:** Renforcer équipe de modération avec nouveaux modules sociaux

8. **Support:** Système de support utilisateur robuste

---

**FIN DU RAPPORT**

*Ce document est un plan stratégique. L'implémentation doit être adaptée selon les ressources disponibles, priorités réelles, et retours terrain.*
