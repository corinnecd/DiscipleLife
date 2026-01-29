# Comparaison : table `profils` vs formulaires d'inscription

## 1. Champs de la table `profils` (schéma réel Supabase – 24 colonnes)

| Colonne | Type | Nullable | Rôle / usage |
|--------|------|----------|--------------|
| **id** | uuid | NO | PK (= auth.users.id). |
| **first_name** | text | YES | Prénom. |
| **last_name** | text | YES | Nom de famille. |
| **email** | text | YES | Email du compte. |
| **avatar_url** | text | YES | URL de l’avatar. |
| **spiritual_stage** | text | YES | **Statut spirituel** (libellé formulaire en français). Colonne existante, pas de nouvelle colonne. |
| **created_at** | timestamp with time zone | YES | Date de création. |
| **updated_at** | timestamp with time zone | YES | Date de dernière modification. |
| **role** | text | YES | super_admin, admin, pasteur, superviseur, mentor, disciple, tutore. |
| **is_approved_as_disciple_maker** | boolean | YES | Mentor approuvé faiseur de disciples. |
| **famille_id** | uuid | YES | Famille du disciple. |
| **identifiant_disciple** | text | YES | Identifiant disciple (ex. FAM001-DISC-12345). |
| **superviseur_id** | uuid | YES | Superviseur du mentor. |
| **mentor_id** | uuid | YES | Mentor du disciple. |
| **identifiant_unique** | text | YES | Ex. PASTEUR-001. |
| **pasteur_id** | uuid | YES | Pasteur de tutelle (superviseurs). |
| **eglise** | text | YES | Église / affiliation (Mentor). **Le formulaire envoie `church` → à mapper vers `eglise`.** |
| **nombre_disciples** | integer | YES | KPI. |
| **avancement_pourcentage** | numeric | YES | KPI. |
| **nombre_disciples_presents** | integer | YES | KPI. |
| **taux_participation_semaine** | numeric | YES | KPI. |
| **observations** | text | YES | Notes. |
| **formations_pcnc_realisees** | text | YES | Formations réalisées. |
| **titre** | text | YES | Pasteur, Berger, Mentor. |
| **phone** | text | YES | Numéro de téléphone (à ajouter si absent : migration `093_add_phone_ville_residence_profils.sql`). |
| **ville_residence** | text | YES | Ville de résidence (à ajouter si absent : migration `093`). |

**Note – Statut spirituel :** La colonne existante est **spiritual_stage**. Le libellé affiché dans le formulaire est « Statut spirituel » (traduction en français). Aucune nouvelle colonne à créer pour le statut spirituel.

**Colonnes à ajouter si absentes :** `date_entree_famille` (migration 092), `phone` et `ville_residence` (migration 093).

---

## 2. Champs des formulaires d’inscription actuels

### 2.1 Auth.jsx (onglet Inscription)

| Champ formulaire | Envoyé vers | Colonne profils correspondante |
|-----------------|-------------|-------------------------------|
| email | signUp → metadata | email (via Auth) |
| password | signUp | - |
| firstName | metadata.first_name | first_name |
| lastName | metadata.last_name | last_name |
| *(aucun)* | role par défaut `'disciple'` | role |

**Manques par rapport à profils (pour un disciple) :** `famille_id`, `date_entree_famille`. Un inscrit depuis Auth a donc un profil minimal sans famille.

---

### 2.2 SignupDisciple.jsx (formulaire d'inscription membre – champs étendus)

| Champ formulaire | Envoyé vers | Colonne profils |
|-----------------|-------------|-----------------|
| firstName | metadata + update | first_name |
| lastName | metadata + update | last_name |
| email | signUp | email |
| password / confirmPassword | signUp | - |
| familleId | metadata + update | famille_id |
| **dateEntreeFamille** | metadata + update | **date_entree_famille** |
| **role** | metadata + update | **role** |
| **mentorId** (Suivi par) | metadata + update | **mentor_id** |
| **spiritualStage** | metadata + update | **spiritual_stage** (libellé formulaire : Statut spirituel — colonne existante) |
| **formationsPcncRealisees** | metadata + update | **formations_pcnc_realisees** |
| **nombreDisciples** | metadata + update | **nombre_disciples** |
| **phone** | metadata + update | **phone** (Numéro de téléphone) |
| **villeResidence** | metadata + update | **ville_residence** (Ville de résidence) |

**Alignement :** Le formulaire couvre : Formation PCNC réalisées, Suivi par (mentor_id), Nombre de disciples, **Statut spirituel** (spiritual_stage, colonne existante), Date d'entrée dans la famille, Rôle, **Numéro de téléphone** (phone), **Ville de résidence** (ville_residence). Tous sont envoyés en metadata au signUp et repris dans l’update du profil après création.

---

### 2.3 SignupMentor.jsx

| Champ formulaire | Envoyé vers | Colonne profils |
|-----------------|-------------|-----------------|
| firstName | metadata.first_name | first_name |
| lastName | metadata.last_name | last_name |
| email | signUp | email |
| password / confirmPassword | signUp | - |
| church | metadata.church_affiliation | church_affiliation (si colonne existe) |
| titre | metadata.titre + update profils | titre |

**Alignement :** first_name, last_name, email, role, titre sont couverts. church est envoyé en metadata ; à confirmer que la colonne profils (ou le trigger) le persiste.

---

### 2.4 SignupPasteur.jsx

| Champ formulaire | Envoyé vers | Colonne profils |
|-----------------|-------------|-----------------|
| firstName | metadata.first_name | first_name |
| lastName | metadata.last_name | last_name |
| email | signUp | email |
| password / confirmPassword | signUp | - |
| identifiantUnique | metadata.identifiant_unique + update profils | identifiant_unique |

**Alignement :** first_name, last_name, email, role, identifiant_unique sont couverts.

---

### 2.5 SignupSuperviseur.jsx

| Champ formulaire | Envoyé vers | Colonne profils |
|-----------------|-------------|-----------------|
| firstName | metadata.first_name | first_name |
| lastName | metadata.last_name | last_name |
| email | signUp | email |
| password / confirmPassword | signUp | - |
| pasteurId | metadata.pasteur_id + update profils | pasteur_id |
| titre | update profils | titre |

**Alignement :** first_name, last_name, email, role, pasteur_id, titre sont couverts. Amélioration : passer `pasteur_id` et `titre` dans les metadata du signUp pour que le trigger puisse les écrire dès la création si c’est supporté.

---

## 3. Synthèse : écarts et actions

| Colonne profils | Signup Disciple | Signup Mentor | Signup Pasteur | Signup Superviseur | Auth Register |
|----------------|-----------------|---------------|----------------|--------------------|---------------|
| first_name | ✅ | ✅ | ✅ | ✅ | ✅ |
| last_name | ✅ | ✅ | ✅ | ✅ | ✅ |
| email | ✅ | ✅ | ✅ | ✅ | ✅ |
| **role** | ✅ (sélecteur) | ✅ (mentor) | ✅ (pasteur) | ✅ (superviseur) | ✅ (disciple) |
| famille_id | ✅ | - | - | - | ❌ manquant |
| **date_entree_famille** | ✅ | - | - | - | ❌ manquant |
| **mentor_id** (Suivi par) | ✅ | - | - | - | - |
| **spiritual_stage** (Statut spirituel) | ✅ (colonne existante) | - | - | - | - |
| **formations_pcnc_realisees** | ✅ | - | - | - | - |
| **nombre_disciples** | ✅ | - | - | - | - |
| **phone** (Numéro de téléphone) | ✅ | - | - | - | - |
| **ville_residence** (Ville de résidence) | ✅ | - | - | - | - |
| identifiant_unique | - | - | ✅ | - | - |
| pasteur_id | - | - | - | ✅ | - |
| titre | - | ✅ | - | ✅ | - |
| eglise (church) | - | ✅ (eglise) | - | - | - |
| avatar_url | - | - | - | - | - (après connexion) |
| updated_at | - | - | - | - | - (auto) |

**Actions réalisées / à faire :**

1. **SignupDisciple** : Formulaire étendu avec Formation PCNC réalisées, Suivi par, Nombre de disciples, **Statut spirituel** (colonne existante **spiritual_stage**, libellé FR dans le formulaire — aucune nouvelle colonne), Date d'entrée dans la famille, Rôle, **Numéro de téléphone** (phone), **Ville de résidence** (ville_residence). Exécuter les migrations 092 et 093 si les colonnes sont absentes.
2. **SignupMentor** : Colonne en base **eglise** ; le formulaire envoie `eglise` en metadata et met à jour `eglise` après création.
3. **Auth (inscription)** : Inscription minimale. Pour tous les champs (famille, date, rôle, suivi par, statut spirituel, PCNC, nombre disciples), utiliser `/signup/disciple`.
4. **Schéma vérifié** : 24 colonnes de base. **spiritual_stage** = Statut spirituel (libellé FR, pas de nouvelle colonne). **date_entree_famille** (092), **phone** et **ville_residence** (093) à ajouter via migrations.

---

## 4. Vérification SQL (déjà exécutée)

Le schéma a été vérifié. Colonnes de base (24) : id, first_name, last_name, email, avatar_url, spiritual_stage (Statut spirituel en français), created_at, updated_at, role, is_approved_as_disciple_maker, famille_id, identifiant_disciple, superviseur_id, mentor_id, identifiant_unique, pasteur_id, eglise, nombre_disciples, avancement_pourcentage, nombre_disciples_presents, taux_participation_semaine, observations, formations_pcnc_realisees, titre. À ajouter si besoin : date_entree_famille (092), phone, ville_residence (093).
