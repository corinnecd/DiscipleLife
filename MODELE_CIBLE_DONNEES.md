# Modèle cible des données entrantes — Tout en profils

## 1. Principe adopté

**Source de vérité : la table `profils`.**

Toute personne (disciple, mentor, superviseur, etc.) est représentée **en priorité dans `profils`**. Les autres tables (dont `cercle_personnes`) servent à la saisie ou au lien fonctionnel, mais le modèle cible pour la consolidation est **tout en profils**.

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
   Fichier : **`sql/migrations/075_modele_cible_sync_cercle_vers_profils.sql`**  
   (ajout de la colonne `profil_id`, création de la fonction `sync_cercle_personnes_vers_profils` et du trigger `sync_cercle_vers_profils_trigger`).

## 6. Vérification

Pour vérifier que le modèle cible est respecté :

- Après chaque ajout/modification dans `cercle_personnes`, contrôler qu’il existe une ligne dans `profils` avec `id = cercle_personnes.profil_id` et que first_name, last_name (et si possible email) correspondent.
- Les rapports, KPI et présences qui s’appuient sur “disciples” doivent pouvoir s’appuyer sur `profils` (et éventuellement sur `cercle_personnes.profil_id` pour faire le lien avec le cercle).

## 7. Prérequis

- La table **`cercle_personnes`** doit exister (créée dans Supabase ou par une migration propre au projet).
- La table **`profils`** doit exister et contenir au minimum : id, email, first_name, last_name, role, famille_id, mentor_id (voir `035_add_famille_to_profils.sql` et seeds).

---

*Document fixant le modèle cible des données entrantes : tout en profils, avec synchronisation automatique depuis `cercle_personnes`.*
