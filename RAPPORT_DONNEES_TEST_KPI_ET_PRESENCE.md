# Rapport : Données de test pour tester les KPI et les pages de présence

## 1. Objectif

Avoir **suffisamment de données de test** pour :
- **Tester tous les KPI** (tableaux de bord Pasteur, Superviseur, Mentor, Admin Analytics)
- **Tester toutes les pages** (notamment Suivi de présence, Envoyer un rapport, Mur de prières, etc.)

---

## 2. Inventaire des KPI par source

### 2.1 Admin Analytics (`AdminAnalytics.jsx`)

| KPI | Table | Colonne / logique |
|-----|-------|-------------------|
| Total Disciples | `profils` | `COUNT` où `role != 'admin'` |
| Mentors Actifs | `profils` | `COUNT` où `role = 'mentor'` |
| Âmes gagnées | `personnes_evangelisees` | `COUNT *` |
| Prières | `prayer_requests` | `COUNT *` |
| Challenges | `user_challenge_progress` | `COUNT` où `is_completed = true` |
| Rapports | `reports` | `COUNT *` |

### 2.2 Dashboard Pasteur (`PasteurDashboard.jsx`)

**KPI principaux (12 indicateurs, depuis `reports.statistics_snapshot`)** :

| KPI | Clé dans `statistics_snapshot` | Source si hors rapports |
|-----|-------------------------------|--------------------------|
| Culte Samedi Soir | `saturday_evening_count` | — |
| Culte Dimanche Matin | `sunday_attendance_count` | `attendance_tracking` (sunday_worship) |
| After Culte Dimanche | `after_culte_count` | `attendance_tracking` (after_culte) |
| Temps de Prière | `saturday_prayer_count` | `attendance_tracking` (saturday_prayer) |
| Temps de Partage | `sunday_sharing_count` | `attendance_tracking` (sunday_sharing) |
| Personnes évangélisées | `evangelization` | `personnes_evangelisees` |
| Nouveaux Convertis | `nouveaux_convertis` | — |
| Nouveaux Arrivants | `nouveaux_arrivants` | — |
| Sorties Évangélisation | `evangelization` | — |
| Com Frat Disciples | `com_frat_disciples` | — |
| Veillée | `veillee` | — |
| Méditation Bible | `meditation_bible` | — |

**Autres indicateurs** :
- Superviseurs, Familles, Disciples : `profils`, `familles_disciples`, `cercle_personnes`
- Présences culte (par famille) : `attendance_tracking` (`attendance_type = 'sunday_worship'`, `disciple_id` lié aux disciples de la famille)
- Rapports hebdo / mensuels / trimestriels / annuels : `reports` (`report_type`, `status = 'submitted'`)

### 2.3 Dashboard Superviseur (`SuperviseurDashboard.jsx`)

- Même structure de KPI que le Pasteur, filtrée par superviseur (`reports.user_id`, `attendance_tracking` via disciples de la famille).
- Détail par disciple : `date_derniere_presence`, `presence_dernier_culte`, `total_activites` (prières, rendez-vous, présences) → `attendance_tracking`, `calendar_events`, `prayer_requests`.

### 2.4 Dashboard Mentor (`MentorDashboard.jsx`)

- Présences culte : `attendance_tracking` (`attendance_type = 'sunday_worship'`) pour les disciples du mentor (`cercle_personnes.user_id = mentor`).
- Disciples, prières, etc. : `cercle_personnes`, `prayer_requests`, `calendar_events`.

### 2.5 Page Suivi de présence (`AttendanceTracking.jsx`)

- **Table** : `attendance_tracking`
- **Colonnes utilisées** : `disciple_id`, `attendance_type`, `attendance_date`, `status` (`present` / `absent`), `absence_reason`, `church_name`
- **Types d’activité** :
  - `sunday_worship` — Culte Dimanche Matin  
  - `sunday_sharing` — Temps de Partage  
  - `saturday_prayer` — Temps de Prière  
  - `saturday_evening_worship` — Culte Samedi Soir  
  - `after_culte` — After Culte Dimanche  
  - `evangelization_outing` — Sortie d’Évangélisation  

- **Filtre** : `disciple_id = user.id` (le disciple connecté enregistre *sa* présence).

### 2.6 Envoyer un rapport (`SendReport.jsx`)

- **Table** : `reports`
- **Champs importants** :
  - `user_id` (superviseur ou mentor)
  - `report_type` : `hebdomadaire`, `mensuel`, `trimestriel`, `annuel`
  - `status` : `draft` ou `submitted`
  - `statistics_snapshot` (JSON) : `sunday_attendance_count`, `saturday_evening_count`, `after_culte_count`, `saturday_prayer_count`, `sunday_sharing_count`, `nouveaux_convertis`, `nouveaux_arrivants`, `evangelization`, `com_frat_disciples`, `veillee`, `meditation_bible`, etc.
  - `year`, `quarter`, `month`, `week_number` selon le type.
- Les compteurs de présence sont pré-remplis depuis `attendance_tracking` (période choisie, disciples du superviseur/mentor).

---

## 3. Tables à alimenter (résumé)

| Table | Rôle pour KPI / présence |
|-------|---------------------------|
| `profils` | Rôles (pasteur, superviseur, mentor, disciple), base des comptages |
| `familles_disciples` | Familles, objectifs, superviseur |
| `cercle_personnes` | Disciples par mentor/superviseur, hiérarchie (parent_disciple_id) |
| `attendance_tracking` | **Cœur des présences** : 6 types, present/absent, par disciple |
| `reports` | Rapports des superviseurs : KPI agrégés dans `statistics_snapshot` |
| `prayer_requests` | Mur de prières, KPI "Prières" |
| `personnes_evangelisees` | Âmes gagnées / évangélisation (si la table existe) |
| `user_challenge_progress` | Challenges complétés (Admin Analytics) |
| `calendar_events` | Entretiens, rappels de prière, rendez-vous |

---

## 4. Procédure pour obtenir suffisamment de données de test

**⚠️ IMPORTANT : Les pasteurs, superviseurs et familles EXISTENT DÉJÀ dans Supabase**

Le script SQL `074_seed_donnees_test_completes_kpi_presence.sql` a été créé pour :
- ✅ Trouver automatiquement les 4 pasteurs, 8 superviseurs et 8 familles existants
- ✅ Créer les disciples dans `cercle_personnes` avec la hiérarchie
- ✅ Générer les `prayer_requests` et `reports`
- ⚠️ Ne crée PAS les comptes Auth/profils pour les disciples (à faire manuellement)
- ⚠️ Ne crée PAS les `attendance_tracking` (nécessite les comptes profils d'abord)

### Étape 1 : Vérifier les données existantes

À faire dans l’éditeur SQL Supabase (ou psql) :

```sql
-- Vérifier les 4 pasteurs
SELECT id, identifiant_unique, first_name, last_name, email 
FROM profils 
WHERE role = 'pasteur' AND identifiant_unique LIKE 'PASTEUR-%'
ORDER BY identifiant_unique;

-- Vérifier les 8 superviseurs (2 par pasteur)
SELECT 
    p.identifiant_unique AS pasteur,
    s.id, s.first_name, s.last_name, s.email, s.pasteur_id
FROM profils p
LEFT JOIN profils s ON s.pasteur_id = p.id AND s.role = 'superviseur'
WHERE p.role = 'pasteur' AND p.identifiant_unique LIKE 'PASTEUR-%'
ORDER BY p.identifiant_unique, s.first_name;

-- Vérifier les 8 familles (1 par superviseur)
SELECT 
    f.identifiant_famille, f.nom, f.superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    p.identifiant_unique AS pasteur
FROM familles_disciples f
JOIN profils s ON s.id = f.superviseur_id
LEFT JOIN profils p ON p.id = s.pasteur_id
WHERE s.role = 'superviseur'
ORDER BY p.identifiant_unique, f.identifiant_famille;

-- Vérifier les disciples existants (cercle_personnes)
SELECT 
    COUNT(*) AS total_disciples,
    COUNT(DISTINCT user_id) AS nombre_superviseurs_avec_disciples
FROM cercle_personnes;

-- Vérifier les présences existantes
SELECT attendance_type, COUNT(*), MIN(attendance_date), MAX(attendance_date)
FROM attendance_tracking GROUP BY attendance_type;

-- Vérifier les rapports existants
SELECT report_type, status, COUNT(*) FROM reports GROUP BY report_type, status;

-- Vérifier les prières existantes
SELECT COUNT(*) AS total, 
       COUNT(*) FILTER (WHERE is_answered = false) AS en_attente,
       COUNT(*) FILTER (WHERE is_urgent = true) AS urgentes
FROM prayer_requests;
```

**Résultat attendu** :
- ✅ 4 pasteurs (PASTEUR-001 à PASTEUR-004)
- ✅ 8 superviseurs (2 par pasteur)
- ✅ 8 familles (1 par superviseur)
- ⚠️ Peu ou pas de disciples dans `cercle_personnes` (c'est ce que le script va créer)
- ⚠️ Peu ou pas de présences, rapports, prières (c'est ce que le script va créer)

---

### Étape 2 : S’assurer d’avoir des disciples (cercle_personnes)

- Le script **`072_create_test_disciples.sql`** crée ~41 disciples pour la famille "Les Déterminés" et le superviseur Alain SIL.  
- **Prérequis** : un profil `first_name='Alain'`, `last_name='Sil'`, `role='superviseur'` et une famille dont le nom contient "Déterminé".
- **À faire** : exécuter `072_create_test_disciples.sql` si ce n’est pas déjà fait.
- **Option** : dupliquer la logique pour d’autres superviseurs/familles pour avoir des disciples dans plusieurs familles.

---

### Étape 3 : Lier disciples à des `user_id` (profils) pour la présence

- `attendance_tracking.disciple_id` = `auth.uid()` = **id d’un profil (utilisateur Supabase Auth)**.
- Les lignes de `cercle_personnes` ont `user_id` = mentor/superviseur, et éventuellement `parent_disciple_id`. Les disciples "purs" dans `cercle_personnes` n’ont souvent **pas** de compte `profils`/Auth.
- Pour que la page **Suivi de présence** affiche des données, il faut que **le compte connecté** (un `profils.id`) ait des lignes dans `attendance_tracking` avec `disciple_id = auth.uid()`.

**Donc :**
- Soit on connecte des comptes **disciple** (avec `profils.role = 'disciple'`) et on insère des présences pour ces `user_id`.
- Soit, pour les KPI agrégés (Pasteur/Superviseur/Mentor), les `disciple_id` dans `attendance_tracking` doivent correspondre à des `profils.id` qui sont bien rattachés aux familles/cercles (via `cercle_personnes` ou logique métier).

**Recommandation** : créer au moins 5–10 **profils disciple** (avec comptes Auth) et leur ajouter des entrées dans `cercle_personnes` si nécessaire, puis alimenter `attendance_tracking` pour ces `user_id`.

---

### Étape 4 : Générer des données `attendance_tracking`

Script type (à adapter selon vos `disciple_id` = `profils.id`) :

```sql
-- Remplacer :MY_DISCIPLE_USER_IDS: par une liste d'UUID de profils (disciple ou mentor qui se fait passer pour disciple en test)
-- Exemple : 5 UUID de profils avec role IN ('disciple','mentor')

INSERT INTO attendance_tracking (disciple_id, attendance_type, attendance_date, status, church_name)
SELECT
  d.id,
  att.typ,
  d.att_date,
  'present',
  'Église Test'
FROM (
  -- 3–6 mois de dates, 1–2 fois par type et par mois
  SELECT id FROM profils WHERE role IN ('disciple','mentor') LIMIT 10
) x,
LATERAL (SELECT id FROM profils WHERE role IN ('disciple','mentor') LIMIT 10) p(id),
LATERAL (SELECT unnest(ARRAY['sunday_worship','sunday_sharing','saturday_prayer','saturday_evening_worship','after_culte','evangelization_outing']) AS typ) att,
LATERAL (
  SELECT (date_trunc('month', CURRENT_DATE) - (n || ' months')::interval)::date + ( floor(random()*20)::int || ' days')::int AS att_date
  FROM generate_series(0,5) n
) d
ON CONFLICT DO NOTHING;
```

Version plus simple pour démarrer : une boucle ou un script qui, pour **chaque** `disciple_id` (quelques profils test) et **chaque** type, insère 2–4 dates par mois sur les 3–6 derniers mois, avec `status = 'present'` et `church_name` renseigné pour les cultes.

---

### Étape 5 : Générer des rapports `reports` avec `statistics_snapshot`

Pour que les KPI Pasteur/Superviseur aient des chiffres, il faut des lignes dans `reports` avec `status = 'submitted'` et `statistics_snapshot` rempli.

Exemple pour **un rapport mensuel** (à répéter pour plusieurs mois, plusieurs superviseurs) :

```sql
-- Exemple : 1 rapport mensuel soumis par un superviseur
INSERT INTO reports (
  user_id,
  report_type,
  status,
  year,
  month,
  statistics_snapshot,
  created_at
)
SELECT
  p.id,
  'mensuel',
  'submitted',
  EXTRACT(YEAR FROM d)::int,
  EXTRACT(MONTH FROM d)::int,
  '{
    "sunday_attendance_count": 25,
    "saturday_evening_count": 18,
    "after_culte_count": 12,
    "saturday_prayer_count": 20,
    "sunday_sharing_count": 15,
    "nouveaux_convertis": 2,
    "nouveaux_arrivants": 3,
    "evangelization": 5,
    "com_frat_disciples": 8,
    "veillee": 10,
    "meditation_bible": 14
  }'::jsonb,
  d
FROM profils p
CROSS JOIN (SELECT date_trunc('month', CURRENT_DATE) - (n || ' months')::interval AS d FROM generate_series(0,5) n) m
WHERE p.role = 'superviseur'
LIMIT 6;  -- 1 rapport par mois pour 1 superviseur (à multiplier si besoin)
```

- Adapter `year`, `month`, `quarter`, `week_number` pour `trimestriel` et `hebdomadaire`.
- Faire de même pour 2–3 superviseurs et 3–6 mois pour avoir des courbes et des totaux non vides.

---

### Étape 6 : Autres tables (KPI Admin, prières, etc.)

- **`prayer_requests`** : quelques dizaines de lignes (user_id, request_text, disciple_name, is_urgent, is_answered) pour le Mur de prières et le KPI "Prières".
- **`personnes_evangelisees`** : si la table existe, y insérer des lignes liées à des `profils` ou `user_id` pour alimenter "Âmes gagnées".
- **`user_challenge_progress`** : lignes avec `is_completed = true` pour le KPI "Challenges".
- **`calendar_events`** : quelques événements `event_type` `meeting`, `prayer` pour les pages Planifier un entretien / Planifier une prière et les indicateurs basés sur les rendez-vous.

---

## 5. Ordre d’exécution recommandé

**⚠️ IMPORTANT : Les pasteurs, superviseurs et familles EXISTENT DÉJÀ**

1. **Vérifier l'existant**  
   - Vérifier que les 4 pasteurs existent (`identifiant_unique` PASTEUR-001 à PASTEUR-004)
   - Vérifier que chaque pasteur a au moins 2 superviseurs (8 au total)
   - Vérifier que chaque superviseur a une famille assignée (8 familles au total)
   - Exécuter les requêtes SQL de l'**Étape 1** (section 4.1) pour vérifier.

2. **Exécuter le script SQL de génération**  
   - Exécuter **`074_seed_donnees_test_completes_kpi_presence.sql`**
   - Ce script va :
     - ✅ Trouver les 4 pasteurs et 8 superviseurs existants
     - ✅ Trouver les 8 familles existantes
     - ✅ Créer ~264-304 disciples dans `cercle_personnes` (niveau 1, 2, 3)
     - ✅ Sélectionner 50-80 disciples pour avoir un compte profils
     - ✅ Générer 120-160 `prayer_requests` (sujets de prière)
     - ✅ Générer 48 `reports` (6 mois × 8 superviseurs)
     - ⚠️ Ne crée PAS les comptes Auth/profils pour les disciples (à faire manuellement)
     - ⚠️ Ne crée PAS les `attendance_tracking` (nécessite les comptes profils d'abord)

3. **Créer les comptes Auth + profils pour les disciples sélectionnés**  
   - Le script a sélectionné 50-80 disciples (IDs dans `cercle_personnes`)
   - Pour chaque disciple sélectionné :
     - Créer un compte Auth Supabase (email/password) via l'interface Supabase
     - Créer une ligne dans `profils` avec `role = 'disciple'` et `id` = UUID Auth
     - **Option** : Créer un script séparé ou utiliser l'interface Supabase en masse

4. **Générer `attendance_tracking`** (après création des comptes profils)
   - Créer un script `075_generer_presences_apres_comptes.sql` qui :
     - Pour chaque disciple avec compte profils
     - Génère 6 mois de présences pour les 6 types d'activité
     - Utilise `disciple_id = profils.id` (UUID Auth)

5. **Vérifier les données générées**  
   - Exécuter les requêtes de vérification à la fin du script `074_...`
   - Vérifier les KPI dans les dashboards (Pasteur, Superviseur, Mentor)
   - Vérifier la page Suivi de présence
   - Vérifier le Mur de prières

---

## 6. Script SQL créé

**Fichier créé** : `sql/migrations/074_seed_donnees_test_completes_kpi_presence.sql`

**Ce que le script fait automatiquement** :

1. ✅ Trouve les 4 pasteurs existants (par `identifiant_unique`)
2. ✅ Trouve les 8 superviseurs existants (2 par pasteur)
3. ✅ Trouve les 8 familles existantes (1 par superviseur)
4. ✅ Crée ~264-304 disciples dans `cercle_personnes` (niveau 1, 2, 3 avec hiérarchie)
5. ✅ Sélectionne 50-80 disciples pour avoir un compte profils (mais ne crée PAS les comptes)
6. ✅ Génère 120-160 `prayer_requests` (15-20 par famille, variés, 60-70% en attente)
7. ✅ Génère 48 `reports` (6 mois × 8 superviseurs, avec `statistics_snapshot` réaliste)
8. ⚠️ Calcule le nombre de présences à créer mais ne les crée PAS (nécessite les comptes profils)

**Ce qui doit être fait manuellement** :

1. **Créer les comptes Auth Supabase** pour les 50-80 disciples sélectionnés
   - Via l'interface Supabase : Dashboard > Authentication > Users > Add User
   - Ou via l'application : Page d'inscription `/signup/disciple`
   - Noter les UUID Auth créés

2. **Créer les profils** avec `role = 'disciple'` et `id` = UUID Auth
   - Pour chaque compte Auth créé, créer une ligne dans `profils` avec le même UUID

3. **Créer un script `075_generer_presences_apres_comptes.sql`** pour générer les `attendance_tracking`
   - Ce script utilisera les `profils.id` des disciples pour créer les présences
   - 6 mois × 6 types × ~13.5 présences/mois par disciple = ~4,050-6,480 présences

---

## 7. Pages à vérifier après alimentation

| Page | Données les plus importantes |
|------|-----------------------------|
| **Suivi de présence** (`/attendance`) | `attendance_tracking` pour le `user_id` connecté (disciple) |
| **Envoyer un rapport** (`/send-report`) | Pré-remplissage depuis `attendance_tracking` ; envoi vers `reports` |
| **Dashboard Pasteur** | `reports`, `attendance_tracking`, `familles_disciples`, `cercle_personnes`, `profils` |
| **Dashboard Superviseur** | Idem, filtré par superviseur |
| **Dashboard Mentor** | `attendance_tracking` (sunday_worship), `cercle_personnes`, `prayer_requests` |
| **Admin Analytics** | `profils`, `personnes_evangelisees`, `prayer_requests`, `user_challenge_progress`, `reports` |
| **Mur de prières** | `prayer_requests`, `cercle_personnes` |
| **Planifier une prière / Planifier un entretien** | `cercle_personnes`, `calendar_events` |

---

## 8. Points d’attention

- **RLS** : les politiques Supabase doivent autoriser les `INSERT`/`SELECT` pour les rôles que vous utilisez en test (disciple, mentor, superviseur, admin).
- **`disciple_id` dans `attendance_tracking`** : doit être un `profils.id` (ou `auth.uid()`) pour que les agrégations par disciple et par famille fonctionnent.
- **`reports.user_id`** : superviseur (ou pasteur, selon la logique de l’app).
- **Périodes** : pour tester les filtres annuel/trimestriel/mensuel/hebdomadaire, prévoir des données réparties sur **plusieurs mois et si possible 2 années**.
- **`cercle_personnes` vs `profils`** : `cercle_personnes` = fiche "disciple" d’un point de vue mentor/superviseur ; `attendance_tracking.disciple_id` = utilisateur Auth. Il faut une règle claire (ex. `profils.id` = `disciple_id`) pour lier les deux dans les requêtes.

---

## 9. Script SQL créé et actions suivantes

**✅ Fichier créé** : `sql/migrations/074_seed_donnees_test_completes_kpi_presence.sql`

**Ce script** :
- Trouve automatiquement les 4 pasteurs, 8 superviseurs et 8 familles existants
- Crée les disciples dans `cercle_personnes` avec la hiérarchie (niveau 1, 2, 3)
- Génère les `prayer_requests` et `reports`
- Sélectionne les disciples qui auront un compte profils (mais ne crée PAS les comptes)

**Actions à faire après exécution du script** :

1. **Créer les comptes Auth Supabase** pour les 50-80 disciples sélectionnés
   - Interface Supabase : Dashboard > Authentication > Users > Add User
   - Ou script séparé pour créer en masse
   - Noter les UUID Auth créés

2. **Créer les profils** avec `role = 'disciple'` et `id` = UUID Auth
   - Pour chaque compte Auth, créer une ligne dans `profils` avec le même UUID

3. **Créer le script `075_generer_presences_apres_comptes.sql`**
   - Ce script générera les `attendance_tracking` pour les disciples avec compte profils
   - Utilisera `disciple_id = profils.id` (UUID Auth)

**Documentation à créer** :
- Liste des comptes de test (email/mot de passe) pour chaque rôle (pasteur, superviseur, disciple)
- Mapping entre `cercle_personnes.id` et `profils.id` pour les disciples avec compte
- Guide d'exécution étape par étape

---

## 10. Clarification : Que signifie "créer" ?

### 10.0.1 "Créer 4 pasteurs" = Créer des comptes utilisateurs + profils

**Ce que cela implique** :
1. **Créer un compte d'authentification Supabase** (via l'interface Supabase Auth ou l'application)
   - Email : `pasteur1@example.com`, `pasteur2@example.com`, etc.
   - Mot de passe : (à définir)
   - Cela crée une entrée dans `auth.users` avec un `id` (UUID)

2. **Créer une ligne dans la table `profils`**
   ```sql
   INSERT INTO profils (id, first_name, last_name, email, role, identifiant_unique)
   VALUES 
     (uuid_auth_pasteur1, 'Pasteur', '1', 'pasteur1@example.com', 'pasteur', 'PASTEUR-001'),
     (uuid_auth_pasteur2, 'Pasteur', '2', 'pasteur2@example.com', 'pasteur', 'PASTEUR-002'),
     ...
   ```
   - **Important** : Le `id` dans `profils` doit être **le même UUID** que celui créé dans `auth.users`
   - `role = 'pasteur'`
   - `identifiant_unique` : ex. `'PASTEUR-001'`, `'PASTEUR-002'`, etc.

**Résultat** : 4 pasteurs peuvent se connecter à l'application et accéder au Dashboard Pasteur.

**Note importante** : 
- Les comptes Auth Supabase peuvent être créés :
  1. **Via l'interface Supabase** : Dashboard > Authentication > Users > Add User (manuel)
  2. **Via l'application** : Page d'inscription (`/signup/pasteur`)
  3. **Via SQL** : `INSERT INTO auth.users (...)` (nécessite des permissions admin Supabase)
- Une fois le compte Auth créé, récupérer l'UUID (`id`) et l'utiliser pour créer la ligne dans `profils` avec le même `id`.

---

### 10.0.2 "Créer 8 superviseurs" = Créer des comptes utilisateurs + profils + liaison aux pasteurs

**Ce que cela implique** :
1. **Créer 8 comptes d'authentification Supabase** (email/password)
   - Ex. : `superviseur1@example.com`, `superviseur2@example.com`, etc.

2. **Créer 8 lignes dans `profils`**
   ```sql
   INSERT INTO profils (id, first_name, last_name, email, role, pasteur_id)
   VALUES 
     (uuid_auth_superviseur1, 'Superviseur', '1', 'superviseur1@example.com', 'superviseur', uuid_pasteur1),
     (uuid_auth_superviseur2, 'Superviseur', '2', 'superviseur2@example.com', 'superviseur', uuid_pasteur1),
     (uuid_auth_superviseur3, 'Superviseur', '3', 'superviseur3@example.com', 'superviseur', uuid_pasteur2),
     ...
   ```
   - `role = 'superviseur'`
   - `pasteur_id` : référence vers le `profils.id` du pasteur de tutelle

**Résultat** : 8 superviseurs peuvent se connecter et accéder au Dashboard Superviseur. Chaque superviseur est lié à son pasteur.

**Note** : Même processus que pour les pasteurs (créer Auth d'abord, puis `profils` avec le même UUID).

---

### 10.0.3 "Créer 8 familles" = Créer des lignes dans `familles_disciples`

**Ce que cela implique** :
```sql
INSERT INTO familles_disciples (nom, identifiant_famille, superviseur_id, objectif_disciples, statut, pasteur_id)
VALUES 
  ('LES DÉTERMINÉS', 'FAM001', uuid_superviseur1, 70, 'actif', uuid_pasteur1),
  ('LES VAILLANTS', 'FAM002', uuid_superviseur2, 70, 'actif', uuid_pasteur1),
  ('LES FIDÈLES', 'FAM003', uuid_superviseur3, 70, 'actif', uuid_pasteur2),
  ...
```
- `nom` : Nom de la famille (ex. "LES DÉTERMINÉS")
- `identifiant_famille` : Identifiant unique (ex. "FAM001", "FAM002")
- `superviseur_id` : Référence vers `profils.id` du superviseur (qui a `role = 'superviseur'`)
- `objectif_disciples` : 70 (par défaut)
- `pasteur_id` : Référence vers `profils.id` du pasteur (optionnel, peut être déduit via `superviseur_id`)

**Résultat** : 8 familles existent dans la base, chacune liée à un superviseur (et indirectement à un pasteur).

---

### 10.0.4 "Créer disciples niveau 1, 2, 3" = Créer des lignes dans `cercle_personnes` (fiches de disciples)

**Important** : Les disciples dans `cercle_personnes` sont des **fiches de contact**, pas forcément des comptes utilisateurs. Seuls certains auront un compte Auth (pour tester la page "Suivi de présence").

**Niveau 1** (disciples directs du superviseur) :
```sql
INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, parent_disciple_id)
VALUES 
  (uuid_superviseur1, 'Marc DUPONT', 'Marc', 'DUPONT', 'Disciple', NULL),
  (uuid_superviseur1, 'Sophie MARTIN', 'Sophie', 'MARTIN', 'Disciple', NULL),
  ...
```
- `user_id` = `profils.id` du **superviseur** (pas du disciple)
- `parent_disciple_id` = `NULL` (pas de parent, disciple direct)
- `circle_type` = `'Disciple'`

**Niveau 2** (disciples de disciples niveau 1) :
```sql
INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, parent_disciple_id)
VALUES 
  (uuid_superviseur1, 'Thomas MARTINEZ', 'Thomas', 'MARTINEZ', 'Disciple', id_marc_dupont),
  (uuid_superviseur1, 'Camille ROUX', 'Camille', 'ROUX', 'Disciple', id_marc_dupont),
  ...
```
- `user_id` = toujours le superviseur (pour la cohérence)
- `parent_disciple_id` = `id` du disciple niveau 1 (ex. `id_marc_dupont` = l'ID retourné lors de l'INSERT de "Marc DUPONT")

**Niveau 3** (disciples de disciples niveau 2) :
```sql
INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, parent_disciple_id)
VALUES 
  (uuid_superviseur1, 'Olivier DUBOIS', 'Olivier', 'DUBOIS', 'Disciple', id_thomas_martinez),
  ...
```
- `parent_disciple_id` = `id` du disciple niveau 2 (ex. `id_thomas_martinez`)

**Résultat** : 
- **~264-304 entrées** dans `cercle_personnes` (tous les disciples, avec hiérarchie)
- L'arbre généalogique peut être visualisé (page Arbre généalogique / GenealogicalTree)
- **Seulement 50-80 de ces disciples** auront aussi un compte `profils` + Auth (pour tester la présence)

**Différence importante** :

| Aspect | `cercle_personnes` | `profils` |
|--------|-------------------|-----------|
| **Type** | Fiche de contact / liste de disciples | Compte utilisateur |
| **Compte Auth requis ?** | ❌ Non | ✅ Oui (Supabase Auth) |
| **Peut se connecter ?** | ❌ Non | ✅ Oui |
| **Utilisation** | Liste des disciples d'un mentor/superviseur, arbre généalogique | Connexion à l'app, enregistrement de présence |
| **Lien** | `user_id` = superviseur/mentor | `id` = UUID Auth (`auth.uid()`) |
| **Pour la présence** | Utilisé pour afficher les noms dans les listes | `attendance_tracking.disciple_id` doit être un `profils.id` |

**Exemple concret** :
- **Disciple "Marc DUPONT"** :
  - ✅ Existe dans `cercle_personnes` (fiche, visible dans l'arbre généalogique)
  - ❌ N'a **pas** de compte `profils` + Auth
  - ❌ Ne peut **pas** se connecter pour enregistrer sa présence
  - ✅ Apparaît dans les listes de disciples du superviseur
- **Disciple "Sophie MARTIN"** :
  - ✅ Existe dans `cercle_personnes` (fiche)
  - ✅ A un compte `profils` + Auth (`profils.id = uuid_auth_sophie`)
  - ✅ Peut se connecter
  - ✅ Peut enregistrer sa présence (`attendance_tracking.disciple_id = uuid_auth_sophie`)

---

## 10. Spécifications détaillées pour la structure de test complète

### 10.1 Structure hiérarchique cible

**⚠️ IMPORTANT : Les pasteurs, superviseurs et familles EXISTENT DÉJÀ dans Supabase**

**Objectif** : Créer les disciples, présences, prières et rapports pour tester tous les KPI, en utilisant la structure existante (4 pasteurs, 8 superviseurs, 8 familles).

**Structure existante (à utiliser)** :
```
4 Pasteurs de tutelle
├── Pasteur 1
│   ├── Famille 1 (superviseur A)
│   │   ├── 15-20 disciples (niveau 1)
│   │   │   ├── 20-40% ont des disciples (niveau 2)
│   │   │   │   └── Certains ont aussi des disciples (niveau 3)
│   │   └── Famille 2 (superviseur B)
│   │       └── (même structure)
│   └── Pasteur 2
│       └── (même structure)
│   └── ... (Pasteur 3, Pasteur 4)
```

**Structure existante (déjà dans Supabase)** :
- ✅ **4 pasteurs** (`profils.role = 'pasteur'`, identifiant_unique: PASTEUR-001 à PASTEUR-004)
- ✅ **8 superviseurs** (`profils.role = 'superviseur'`, 2 par pasteur, avec `pasteur_id` renseigné)
- ✅ **8 familles** (`familles_disciples`, 1 par superviseur, avec `superviseur_id` renseigné)

**Ce que le script va créer** :
- **~264-304 disciples** dans `cercle_personnes` (15-20 par famille × 8 familles, avec hiérarchie niveau 1, 2, 3)
- **24-64 disciples "mentors"** (20-40% de 120-160) qui ont des disciples
- **50-80 disciples sélectionnés** pour avoir un compte profils (pour tester la présence)
- **~4,050-6,480 présences** à créer (après création des comptes profils)
- **120-160 sujets de prière** (`prayer_requests`)
- **48 rapports** (`reports`, 6 mois × 8 superviseurs)

---

### 10.2 Données de présence (KPI) pour chaque disciple

**Objectif** : Chaque disciple (qui a un compte `profils` avec Auth) doit avoir des données de présence dans `attendance_tracking` pour tester les KPI de présence.

**Spécifications** :
- **Période** : 6-12 mois de données (pour tester les filtres mensuel/trimestriel/annuel)
- **Types d'activité** : Les 6 types (`sunday_worship`, `sunday_sharing`, `saturday_prayer`, `saturday_evening_worship`, `after_culte`, `evangelization_outing`)
- **Fréquence par disciple** :
  - `sunday_worship` : 2-4 fois par mois (majorité `present`, quelques `absent` avec `absence_reason`)
  - `sunday_sharing` : 1-2 fois par mois
  - `saturday_prayer` : 2-3 fois par mois
  - `saturday_evening_worship` : 1-2 fois par mois
  - `after_culte` : 1-2 fois par mois
  - `evangelization_outing` : 0-1 fois par mois (optionnel)
- **Répartition** : 70-80% `present`, 20-30% `absent` (avec `absence_reason` varié)
- **`church_name`** : Renseigné pour les cultes (`sunday_worship`, `saturday_evening_worship`) quand `status = 'present'`

**Exemple de calcul** :
- Pour 120 disciples × 6 mois × (4 sunday_worship + 2 sunday_sharing + 3 saturday_prayer + 2 saturday_evening + 2 after_culte + 0.5 evangelization) = **~120 × 6 × 13.5 ≈ 9,720 lignes** dans `attendance_tracking`

---

### 10.3 Arbre généalogique par famille

**Objectif** : 20-40% des disciples dans chaque famille doivent avoir des disciples (qui peuvent aussi avoir des disciples) pour tester l'arbre généalogique.

**Spécifications** :
- **Niveau 1** : 15-20 disciples directs du superviseur (dans `cercle_personnes` avec `user_id = superviseur_id`, `parent_disciple_id = NULL`)
- **Niveau 2** : 20-40% des disciples niveau 1 ont des disciples (dans `cercle_personnes` avec `parent_disciple_id = id du disciple niveau 1`)
  - Exemple : Sur 18 disciples niveau 1, 4-7 ont des disciples (2-5 disciples chacun)
- **Niveau 3** : Certains disciples niveau 2 ont aussi des disciples (dans `cercle_personnes` avec `parent_disciple_id = id du disciple niveau 2`)
  - Exemple : 1-2 disciples niveau 2 par famille ont 1-3 disciples chacun

**Structure dans `cercle_personnes`** :
```sql
-- Niveau 1 (disciples directs du superviseur)
INSERT INTO cercle_personnes (user_id, name, parent_disciple_id, ...)
VALUES (superviseur_id, 'Disciple N1-1', NULL, ...);

-- Niveau 2 (disciples de "Disciple N1-1")
INSERT INTO cercle_personnes (user_id, name, parent_disciple_id, ...)
VALUES (superviseur_id, 'Disciple N2-1', id_disciple_n1_1, ...);

-- Niveau 3 (disciples de "Disciple N2-1")
INSERT INTO cercle_personnes (user_id, name, parent_disciple_id, ...)
VALUES (superviseur_id, 'Disciple N3-1', id_disciple_n2_1, ...);
```

**Répartition recommandée par famille (18 disciples niveau 1)** :
- **6 disciples niveau 1** (33%) ont des disciples niveau 2 :
  - 2 ont 3-4 disciples niveau 2
  - 2 ont 2 disciples niveau 2
  - 2 ont 1 disciple niveau 2
- **2-3 disciples niveau 2** ont des disciples niveau 3 (1-2 chacun)

**Total par famille** : ~18 (niveau 1) + ~12-15 (niveau 2) + ~3-5 (niveau 3) = **~33-38 entrées dans `cercle_personnes`**

---

### 10.4 Sujets de prière envoyés aux superviseurs

**Objectif** : Créer des sujets de prière (`prayer_requests`) qui sont "assignés" ou visibles par les superviseurs pour tester la liste des sujets en attente.

**Spécifications** :
- **Table** : `prayer_requests`
- **Champs utilisés** : `user_id` (qui crée la prière), `request_text` (sujet), `disciple_name` (pour qui), `is_urgent`, `is_answered`
- **Logique d'assignation** :
  - Option A : Si `prayer_requests` a un champ `superviseur_id` ou `assigned_to` → lier directement
  - Option B : Si pas de champ direct, lier via `disciple_name` → trouver le disciple dans `cercle_personnes` → récupérer `user_id` (superviseur) → les prières des disciples d'une famille sont visibles par le superviseur de cette famille
- **Répartition** :
  - **Par famille** : 10-20 sujets de prière
  - **Statuts** : 60-70% `is_answered = false` (en attente), 30-40% `is_answered = true` (exaucées)
  - **Urgence** : 10-20% `is_urgent = true`
  - **Auteurs** : Les prières peuvent être créées par :
    - Les disciples eux-mêmes (`user_id = disciple_id`)
    - Les mentors (`user_id = mentor_id`)
    - Les superviseurs (`user_id = superviseur_id`)
- **Sujets variés** : Guérison, Examen, Protection, Travail, Famille, Finances, Relations, Conversion, etc.

**Exemple de données** :
```sql
-- Pour chaque famille (8 familles × 15-20 prières = 120-160 prayer_requests)
INSERT INTO prayer_requests (user_id, request_text, disciple_name, is_urgent, is_answered)
VALUES
  (disciple_id_1, 'Prière pour la guérison de ma mère', 'Marie DUPONT', false, false),
  (disciple_id_2, 'Examen important la semaine prochaine', 'Jean MARTIN', true, false),
  (superviseur_id, 'Prière pour la famille de Pierre', 'Pierre LEBLANC', false, true),
  ...
```

**Pour tester la "liste en attente"** :
- Les superviseurs doivent voir les prières de leurs disciples (via `disciple_name` correspondant à un `cercle_personnes.name` où `cercle_personnes.user_id = superviseur_id`)
- Filtrer `is_answered = false` pour voir les sujets en attente

---

### 10.5 Plan de génération des données

**⚠️ IMPORTANT : Les pasteurs, superviseurs et familles EXISTENT DÉJÀ dans Supabase**

**Ce qui existe déjà** :
- ✅ **4 pasteurs** (`profils.role = 'pasteur'`, identifiant_unique: PASTEUR-001 à PASTEUR-004)
- ✅ **8 superviseurs** (`profils.role = 'superviseur'`, 2 par pasteur, avec `pasteur_id` renseigné)
- ✅ **8 familles** (`familles_disciples`, 1 par superviseur, avec `superviseur_id` renseigné)

**Ce que le script SQL `074_seed_donnees_test_completes_kpi_presence.sql` va créer** :

1. **Créer les disciples dans `cercle_personnes`** (niveau 1, 2, 3)
   - **Action** : Insérer des lignes dans `cercle_personnes` (fiches de disciples, **pas de comptes Auth**)
   - **Niveau 1** : 15-20 disciples par famille
     - `user_id` = `profils.id` du superviseur
     - `parent_disciple_id` = `NULL`
     - `circle_type` = `'Disciple'`
   - **Niveau 2** : 20-40% des disciples niveau 1 ont 1-4 disciples
     - `user_id` = toujours le superviseur
     - `parent_disciple_id` = `id` du disciple niveau 1 (récupéré après INSERT)
   - **Niveau 3** : Certains disciples niveau 2 ont 1-3 disciples
     - `parent_disciple_id` = `id` du disciple niveau 2
   - **Total** : ~33-38 entrées par famille × 8 familles = **~264-304 entrées dans `cercle_personnes`**
   - **Résultat** : Arbre généalogique complet par famille (testable dans la page Arbre généalogique)

5. **Créer des comptes `profils` pour certains disciples** (pour la présence)
   - **Action** : Sélectionner 50-80 disciples (sur les 264-304) et créer pour eux :
     - Un compte Auth Supabase (email/password)
     - Une ligne dans `profils` avec `role = 'disciple'` et `id` = UUID Auth
   - **Pourquoi** : La page "Suivi de présence" nécessite que `attendance_tracking.disciple_id` = `user.id` (compte connecté)
   - **Résultat** : 50-80 disciples peuvent se connecter et enregistrer leur présence

6. **Générer `attendance_tracking`** (présences)
   - Pour chaque disciple avec compte (`profils.id`) :
     - 6 mois de données
     - 6 types d'activité
     - 2-4 présences par mois par type (selon le type)
   - Total estimé : **~50-80 disciples × 6 mois × 13.5 présences/mois ≈ 4,050-6,480 lignes**

7. **Générer `reports`** (rapports des superviseurs)
   - Pour chaque superviseur (8 superviseurs) :
     - 6 rapports mensuels (6 derniers mois)
     - `status = 'submitted'`
     - `statistics_snapshot` cohérent avec les `attendance_tracking` de leurs disciples
   - Total : **8 superviseurs × 6 mois = 48 rapports**

8. **Générer `prayer_requests`** (sujets de prière)
   - 15-20 prières par famille
   - Réparties entre disciples, mentors, superviseurs
   - 60-70% en attente (`is_answered = false`)
   - Total : **8 familles × 15-20 = 120-160 prières**

9. **Générer autres données** (optionnel selon KPI)
   - `personnes_evangelisees` : 20-50 entrées
   - `user_challenge_progress` : 30-60 entrées avec `is_completed = true`
   - `calendar_events` : 50-100 événements (meetings, prayer reminders)

---

### 10.6 Résumé des volumes de données

| Table | Volume estimé | Détails |
|-------|---------------|---------|
| `profils` | 4 + 8 + 50-80 = **62-92** | 4 pasteurs + 8 superviseurs + 50-80 disciples (comptes Auth) |
| `familles_disciples` | **8** | 1 par superviseur |
| `cercle_personnes` | **264-304** | Disciples niveau 1, 2, 3 (tous les disciples, pas seulement ceux avec compte) |
| `attendance_tracking` | **4,050-6,480** | Présences sur 6 mois pour 50-80 disciples avec compte |
| `reports` | **48** | 6 rapports mensuels × 8 superviseurs |
| `prayer_requests` | **120-160** | 15-20 par famille |
| `personnes_evangelisees` | **20-50** | (optionnel) |
| `user_challenge_progress` | **30-60** | (optionnel) |
| `calendar_events` | **50-100** | (optionnel) |

---

### 10.7 Script SQL créé

**Fichier** : `sql/migrations/074_seed_donnees_test_completes_kpi_presence.sql`

**⚠️ PRÉREQUIS** : Les 4 pasteurs, 8 superviseurs et 8 familles doivent **EXISTER DÉJÀ** dans Supabase.

**Ce que le script fait** :

1. **Section 1** : Trouve les 4 pasteurs (par `identifiant_unique` PASTEUR-001 à PASTEUR-004)
2. **Section 2** : Trouve les 8 superviseurs (2 par pasteur, via `pasteur_id`)
3. **Section 3** : Trouve les 8 familles (1 par superviseur, via `superviseur_id`)
4. **Section 4** : Crée disciples niveau 1 (15-20 par famille, dans `cercle_personnes`)
5. **Section 5** : Crée disciples niveau 2 (20-40% des niveau 1 ont 1-4 disciples)
6. **Section 6** : Crée disciples niveau 3 (certains niveau 2 ont 1-3 disciples)
7. **Section 7** : Sélectionne 50-80 disciples pour avoir un compte profils (mais ne crée PAS les comptes Auth - à faire manuellement)
8. **Section 8** : Calcule le nombre de présences à créer (mais ne crée PAS les présences - nécessite les comptes profils d'abord)
9. **Section 9** : Génère `reports` (6 mois × 8 superviseurs = 48 rapports)
10. **Section 10** : Génère `prayer_requests` (15-20 par famille = 120-160 prières)
11. **Section 11** : Vérifications post-génération (requêtes SQL pour vérifier les données)

**Note** : Le script utilise des `DO $$ ... END $$` blocks pour gérer les IDs dynamiques (récupérer les IDs créés et les réutiliser pour les niveaux suivants).

**Actions manuelles requises après exécution du script** :
1. Créer les comptes Auth Supabase pour les 50-80 disciples sélectionnés
2. Créer les profils avec `role = 'disciple'` et `id` = UUID Auth
3. Créer un script séparé `075_generer_presences_apres_comptes.sql` pour générer les `attendance_tracking` une fois les comptes créés

---

### 10.8 Points d'attention spécifiques

- **Arbre généalogique** : S'assurer que `cercle_personnes.parent_disciple_id` pointe vers un `id` existant dans `cercle_personnes` (pas vers un `profils.id`).
- **Présences** : Seuls les disciples avec un compte `profils` + Auth peuvent enregistrer leur présence (page `/attendance`). Pour les KPI agrégés (Pasteur/Superviseur), on peut aussi créer des `attendance_tracking` avec `disciple_id` = `profils.id` même si le disciple n'a pas de compte Auth (mais cela nécessite de connaître les `profils.id` correspondants aux `cercle_personnes`).
- **Sujets de prière** : Si `prayer_requests` n'a pas de champ `superviseur_id`, la logique d'assignation se fait via `disciple_name` → `cercle_personnes.name` → `cercle_personnes.user_id` (superviseur). Les superviseurs voient les prières de leurs disciples.
- **Périodes** : Générer des données sur **6-12 mois** pour tester les filtres mensuel/trimestriel/annuel dans les dashboards.
- **Réalisme** : Varier les dates, les noms, les sujets de prière, les motifs d'absence pour que les données semblent réelles.

---

### 10.9 Vérifications post-génération

**Requêtes SQL pour vérifier** :

```sql
-- Vérifier la structure hiérarchique
SELECT 
  f.nom AS famille,
  COUNT(DISTINCT cp1.id) AS disciples_niveau_1,
  COUNT(DISTINCT cp2.id) AS disciples_niveau_2,
  COUNT(DISTINCT cp3.id) AS disciples_niveau_3
FROM familles_disciples f
LEFT JOIN cercle_personnes cp1 ON cp1.user_id = f.superviseur_id AND cp1.parent_disciple_id IS NULL
LEFT JOIN cercle_personnes cp2 ON cp2.parent_disciple_id = cp1.id
LEFT JOIN cercle_personnes cp3 ON cp3.parent_disciple_id = cp2.id
GROUP BY f.id, f.nom
ORDER BY f.nom;

-- Vérifier les présences par famille
SELECT 
  f.nom AS famille,
  COUNT(DISTINCT at.disciple_id) AS disciples_avec_presences,
  COUNT(*) AS total_presences
FROM familles_disciples f
JOIN cercle_personnes cp ON cp.user_id = (SELECT superviseur_id FROM familles_disciples WHERE id = f.id)
JOIN profils p ON p.id = cp.user_id  -- ou autre logique de liaison
JOIN attendance_tracking at ON at.disciple_id = p.id
GROUP BY f.id, f.nom;

-- Vérifier les sujets de prière par famille
SELECT 
  f.nom AS famille,
  COUNT(*) AS total_prieres,
  COUNT(*) FILTER (WHERE pr.is_answered = false) AS en_attente,
  COUNT(*) FILTER (WHERE pr.is_urgent = true) AS urgentes
FROM familles_disciples f
JOIN cercle_personnes cp ON cp.user_id = f.superviseur_id
JOIN prayer_requests pr ON pr.disciple_name = cp.name
GROUP BY f.id, f.nom;
```

---

---

## 11. Instructions d'exécution du script SQL

### 11.1 Prérequis

**Vérifier que les données suivantes existent dans Supabase** :

```sql
-- 1. Vérifier les 4 pasteurs
SELECT COUNT(*) FROM profils 
WHERE role = 'pasteur' AND identifiant_unique IN ('PASTEUR-001', 'PASTEUR-002', 'PASTEUR-003', 'PASTEUR-004');
-- Doit retourner 4

-- 2. Vérifier les 8 superviseurs (2 par pasteur)
SELECT p.identifiant_unique, COUNT(s.id) AS nb_superviseurs
FROM profils p
LEFT JOIN profils s ON s.pasteur_id = p.id AND s.role = 'superviseur'
WHERE p.role = 'pasteur' AND p.identifiant_unique LIKE 'PASTEUR-%'
GROUP BY p.id, p.identifiant_unique;
-- Chaque pasteur doit avoir au moins 2 superviseurs

-- 3. Vérifier les 8 familles (1 par superviseur)
SELECT COUNT(*) FROM familles_disciples 
WHERE superviseur_id IN (
    SELECT id FROM profils WHERE role = 'superviseur' AND pasteur_id IN (
        SELECT id FROM profils WHERE identifiant_unique LIKE 'PASTEUR-%' AND role = 'pasteur'
    )
);
-- Doit retourner au moins 8
```

### 11.2 Exécution du script

1. **Exécuter le script SQL** :
   ```bash
   # Via l'éditeur SQL Supabase ou psql
   psql -h [host] -U [user] -d [database] -f sql/migrations/074_seed_donnees_test_completes_kpi_presence.sql
   ```

2. **Vérifier les résultats** :
   - Le script affiche des `RAISE NOTICE` avec les statistiques
   - Vérifier les requêtes de vérification à la fin du script

3. **Identifier les disciples sélectionnés pour compte profils** :
   ```sql
   -- Les disciples avec le plus de "chance" d'avoir un compte sont ceux créés en premier
   -- Pour identifier les disciples sélectionnés, exécuter :
   SELECT id, name, first_name, last_name, user_id, parent_disciple_id, created_at
   FROM cercle_personnes
   WHERE user_id IN (
       SELECT id FROM profils WHERE role = 'superviseur' AND pasteur_id IN (
           SELECT id FROM profils WHERE identifiant_unique LIKE 'PASTEUR-%' AND role = 'pasteur'
       )
   )
   ORDER BY created_at
   LIMIT 80; -- Les 80 premiers créés ont plus de chance d'être sélectionnés
   ```

### 11.3 Créer les comptes Auth + profils pour les disciples

**Option A : Via l'interface Supabase** (recommandé pour quelques comptes)
1. Dashboard Supabase > Authentication > Users > Add User
2. Créer le compte avec email/password
3. Noter l'UUID créé
4. Créer la ligne dans `profils` :
   ```sql
   INSERT INTO profils (id, first_name, last_name, email, role)
   VALUES (uuid_auth, 'Prénom', 'Nom', 'email@example.com', 'disciple');
   ```

**Option B : Via script SQL** (pour créer en masse)
- Créer un script qui génère des emails/passwords et utilise l'API Supabase Auth
- Ou utiliser l'interface d'inscription de l'application

### 11.4 Générer les présences (après création des comptes profils)

**Créer le script `075_generer_presences_apres_comptes.sql`** :

```sql
-- Pour chaque disciple avec compte profils
-- Générer 6 mois de présences pour les 6 types d'activité
-- Utiliser disciple_id = profils.id (UUID Auth)
```

**Structure du script** :
- Récupérer tous les `profils` avec `role = 'disciple'`
- Pour chaque disciple, générer des présences sur 6 mois
- Types : `sunday_worship` (4/mois), `sunday_sharing` (2/mois), `saturday_prayer` (3/mois), etc.
- 70-80% `present`, 20-30% `absent`

### 11.5 Vérifications finales

```sql
-- Vérifier la structure hiérarchique
SELECT 
    f.nom AS famille,
    COUNT(DISTINCT cp1.id) AS niveau_1,
    COUNT(DISTINCT cp2.id) AS niveau_2,
    COUNT(DISTINCT cp3.id) AS niveau_3
FROM familles_disciples f
LEFT JOIN cercle_personnes cp1 ON cp1.user_id = f.superviseur_id AND cp1.parent_disciple_id IS NULL
LEFT JOIN cercle_personnes cp2 ON cp2.parent_disciple_id = cp1.id
LEFT JOIN cercle_personnes cp3 ON cp3.parent_disciple_id = cp2.id
GROUP BY f.id, f.nom;

-- Vérifier les présences
SELECT attendance_type, COUNT(*), 
       COUNT(*) FILTER (WHERE status = 'present') AS presents,
       COUNT(*) FILTER (WHERE status = 'absent') AS absents
FROM attendance_tracking
GROUP BY attendance_type;

-- Vérifier les sujets de prière par famille
SELECT 
    f.nom AS famille,
    COUNT(pr.id) AS total_prieres,
    COUNT(*) FILTER (WHERE pr.is_answered = false) AS en_attente
FROM familles_disciples f
JOIN cercle_personnes cp ON cp.user_id = f.superviseur_id
JOIN prayer_requests pr ON pr.disciple_name = cp.name
GROUP BY f.id, f.nom;

-- Vérifier les rapports
SELECT 
    s.first_name || ' ' || s.last_name AS superviseur,
    COUNT(r.id) AS nb_rapports,
    MIN(r.created_at) AS premier_rapport,
    MAX(r.created_at) AS dernier_rapport
FROM profils s
LEFT JOIN reports r ON r.user_id = s.id
WHERE s.role = 'superviseur'
GROUP BY s.id, s.first_name, s.last_name;
```

---

## 12. Résumé des actions

**✅ Fait automatiquement par le script `074_seed_donnees_test_completes_kpi_presence.sql`** :
- Trouve les 4 pasteurs, 8 superviseurs, 8 familles existants
- Crée ~264-304 disciples dans `cercle_personnes` (niveau 1, 2, 3)
- Génère 120-160 `prayer_requests` (sujets de prière)
- Génère 48 `reports` (rapports mensuels)

**⚠️ À faire manuellement** :
1. Créer les comptes Auth Supabase pour 50-80 disciples sélectionnés
2. Créer les profils avec `role = 'disciple'` et `id` = UUID Auth
3. Créer le script `075_generer_presences_apres_comptes.sql` pour générer les `attendance_tracking`

**Résultat final** :
- ✅ Arbre généalogique complet par famille (testable)
- ✅ KPI de présence pour chaque disciple (testable après étape 3)
- ✅ Sujets de prière en attente pour les superviseurs (testable)
- ✅ Rapports avec statistiques pour les dashboards (testable)
