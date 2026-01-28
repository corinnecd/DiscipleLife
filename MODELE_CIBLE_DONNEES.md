# Modèle cible des données entrantes — Tout en profils

## 1. Principe adopté

**Consolidation bidirectionnelle :** à chaque entrée ou modification dans **`cercle_personnes`**, **`profils`** est mis à jour ; à chaque entrée ou modification dans **`profils`** (disciple avec mentor), **`cercle_personnes`** est mis à jour. Les deux tables restent alignées.

## 2. Données entrantes : d’où viennent-elles ?

Les données “disciples” peuvent entrer par :

| Entrée | Table d’entrée | Consolidation cible |
|--------|----------------|---------------------|
| Cercle du mentor (fiches “mon cercle”) | `cercle_personnes` | `profils` |
| Familles de disciples (membres) | `profils` (ou lien via superviseur) | `profils` |
| Seeds / imports (tests, KPI, présence) | `profils` directement | `profils` |

Pour **cercle_personnes** en particulier :  
dès qu’une ligne est **ajoutée ou modifiée** dans `cercle_personnes`, elle doit être **automatiquement mise à jour et consolidée dans `profils`**.

## 3. Règle de synchronisation cercle_personnes → profils

- **Quand** : à chaque `INSERT` ou `UPDATE` sur `cercle_personnes`.
- **Quoi** :
  - Si la fiche n’a pas encore de profil : **créer** une ligne dans `profils` (role = `'disciple'`, `mentor_id` = `user_id` du cercle, `famille_id` dérivé du mentor si possible).
  - Si la fiche a déjà un `profil_id` : **mettre à jour** la ligne correspondante dans `profils` (first_name, last_name, email, etc.).
- **Lien** : la table `cercle_personnes` dispose d’une colonne `profil_id` (référence vers `profils(id)`), renseignée automatiquement par un trigger.

## 4. Schéma cible (résumé)

- **`profils`** : id, email, first_name, last_name, role, famille_id, mentor_id, superviseur_id, identifiant_disciple, … (voir migrations 035, 047, 058, etc.)
- **`cercle_personnes`** : id, user_id, name, first_name, last_name, email, phone, church, country, circle_type, parent_disciple_id, start_date, **profil_id** (→ profils.id), …

Le lien `cercle_personnes.profil_id → profils.id` est la traduction “cercle → profil” et garantit qu’une donnée ajoutée dans “cercle” est bien consolidée “en profils”.

## 5. Implémentation technique

La consolidation **cercle_personnes → profils** est assurée par :

1. **Colonne**  
   `cercle_personnes.profil_id UUID REFERENCES profils(id) ON DELETE SET NULL`  
   (ajoutée si nécessaire par la migration dédiée.)

2. **Trigger**  
   Une fonction trigger sur `cercle_personnes`, exécutée en **BEFORE INSERT OR UPDATE**, qui :
   - à l’**INSERT** : crée une ligne dans `profils` (first_name, last_name, email dérivé ou placeholder, role = `'disciple'`, mentor_id = `user_id`, famille_id depuis le profil du mentor si disponible), puis remplit `NEW.profil_id` ;
   - à l’**UPDATE** : si `NEW.profil_id` est non NULL, met à jour la ligne `profils` correspondante ; sinon, fait la même logique que l’INSERT (création + `NEW.profil_id`).

3. **Migration**  
   Fichier : **`sql/migrations/075_modele_cible_sync_cercle_vers_profils.sql`** (+ **075_finaliser_backfill.sql** : version avec contrainte auth).  
   Trigger : **`sync_cercle_vers_profils_trigger`** (BEFORE INSERT OR UPDATE sur `cercle_personnes`).  
   **Contrainte :** un profil n’est créé que si l’email du cercle correspond à un utilisateur dans `auth.users` (car `profils.id` → `auth.users.id`).

---

## 5b. Règle de synchronisation profils → cercle_personnes

- **Quand :** à chaque `INSERT` ou `UPDATE` sur `profils` où `role = 'disciple'` et `mentor_id IS NOT NULL`.
- **Quoi :**
  - À l’**INSERT** : **créer** une ligne dans `cercle_personnes` (`user_id` = `mentor_id`, `first_name`, `last_name`, `email`, `profil_id` = `profils.id`, `circle_type` = 'Disciple').
  - À l’**UPDATE** : **mettre à jour** la ligne de `cercle_personnes` dont `profil_id` = `profils.id` (nom, prénom, email, `user_id` si le mentor change), uniquement si les valeurs ont changé (pour éviter les boucles avec le trigger cercle → profils).

**Migration :** **`sql/migrations/077_sync_profils_vers_cercle_personnes.sql`**  
Trigger : **`sync_profils_vers_cercle_trigger`** (AFTER INSERT OR UPDATE sur `profils`, WHEN role = 'disciple' AND mentor_id IS NOT NULL).

## 6. Vérification

Pour vérifier que le modèle cible est respecté :

- Après chaque ajout/modification dans `cercle_personnes`, contrôler qu’il existe une ligne dans `profils` avec `id = cercle_personnes.profil_id` et que first_name, last_name (et si possible email) correspondent.
- Les rapports, KPI et présences qui s’appuient sur “disciples” doivent pouvoir s’appuyer sur `profils` (et éventuellement sur `cercle_personnes.profil_id` pour faire le lien avec le cercle).

## 7. Prérequis

- La table **`cercle_personnes`** doit exister (colonnes : user_id, first_name, last_name, email, circle_type, profil_id, created_at, etc.).
- La table **`profils`** doit exister avec au minimum : id, email, first_name, last_name, role, famille_id, mentor_id (voir `035_add_famille_to_profils.sql` et seeds).
- **profils.id** doit référencer **auth.users(id)** (contrainte Supabase) : les profils ne peuvent être créés que pour des utilisateurs Auth existants (cercle → profils ne crée un profil que si l’email correspond à un compte Auth).

## 8. Ordre d’exécution des migrations

1. **075** : colonne `profil_id` + trigger **cercle → profils**.
2. **075_finaliser_backfill.sql** : version du trigger qui respecte la contrainte auth (profil créé seulement si email dans auth.users).
3. **077** : trigger **profils → cercle_personnes** (consolidation dans l’autre sens).

---

*Document fixant la consolidation bidirectionnelle entre `cercle_personnes` et `profils`.*
