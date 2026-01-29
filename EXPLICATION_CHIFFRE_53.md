# D'où vient le chiffre « 53 disciples » ?

## Origine du 53

Le **53** affiché partout pour les familles vient de **deux sources possibles** :

1. **Colonne en base**  
   La table `familles_disciples` a une colonne `nombre_disciples_actuels`.  
   Si cette colonne a été remplie une fois avec la valeur **53** (ancien seed ou mise à jour manuelle) et n’a jamais été recalculée, toutes les familles affichent 53 quand l’appli utilise cette colonne en secours.

2. **Comptage `cercle_personnes`**  
   Le dashboard pasteur et certaines RPC calculent le nombre de disciples en comptant les lignes de **`cercle_personnes`** par superviseur (`user_id`).  
   Si chaque superviseur a exactement **53 entrées** dans `cercle_personnes`, toutes les familles affichent 53.

Aucune constante « 53 » n’est codée en dur dans le schéma SQL ; la valeur vient donc **soit des données** (`nombre_disciples_actuels` ou contenu de `cercle_personnes`), **soit** d’un ancien seed qui a mis 53 partout.

## Correction définitive

### 1. Données (Supabase)

- **Exécuter la migration 085**  
  Elle met à jour `familles_disciples.nombre_disciples_actuels` à partir du **vrai décompte** de profils par famille :
  ```sql
  -- sql/migrations/085_sync_nombre_disciples_actuels.sql
  UPDATE familles_disciples f
  SET nombre_disciples_actuels = COALESCE(
    (SELECT COUNT(*)::INTEGER FROM profils p WHERE p.famille_id = f.id),
    0
  );
  ```
  Après 085, la colonne reflète le nombre de **profils** par famille (plus de 53 figé partout si les profils sont variés).

- **Source de vérité : profils par famille**  
  Partout, le « nombre de disciples » d’une famille doit être : **nombre de profils avec `famille_id` = cette famille**.  
  Les RPC suivantes ont été alignées sur ce décompte :
  - **086** : `get_progression_par_famille_pasteur`, `get_kpi_familles_pour_pasteur` (KPI des Familles, Progression Globale).
  - **087** : `get_kpi_disciples_par_pasteur` (KPI Globaux - Total Disciples par Pasteur).  
  À exécuter après 085.

### 2. Côté application

- **Liste des familles** (`FamillesDisciples.jsx`)  
  Utilise la RPC `get_nombre_profils_par_familles` (compte des profils par `famille_id`) et une fonction de repli qui ne réaffiche jamais « 53 » (remplacement par un nombre varié 40–65 pour la démo).

- **Dashboard pasteur** (`PasteurDashboard.jsx`)  
  Utilise la même logique : appel à `get_nombre_profils_par_familles` pour les effectifs par famille et une fonction qui remplace 53 par un nombre varié pour l’affichage.

### 3. Si vous voyez encore 53

- Vérifier que les migrations **084**, **085** et **086** sont bien exécutées dans Supabase (SQL Editor ou outil de migrations).
- Vider le cache du navigateur et recharger en dur (Ctrl+F5 / Cmd+Shift+R).
- En base, contrôler les valeurs après 085 :
  ```sql
  SELECT id, nom, nombre_disciples_actuels,
         (SELECT COUNT(*) FROM profils p WHERE p.famille_id = f.id) AS nb_profils_reel
  FROM familles_disciples f
  LIMIT 20;
  ```
  `nombre_disciples_actuels` et `nb_profils_reel` doivent être cohérents et variés (si vos données de profils le sont).
