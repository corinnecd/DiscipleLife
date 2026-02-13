# Étape A – Données : migrations 075, 092, 093 + RPC arbre

## 1. Exécuter les migrations 092, 093, 075

1. Ouvrir le **SQL Editor** Supabase du projet.
2. Exécuter **dans l’ordre** le script :
   - **`sql/run_migrations_092_093_075.sql`**
   - Ordre des blocs : 092 (date_entree_famille) → 093 (phone, ville_residence) → 075 (profil_id + trigger sync cercle → profils).

**Prérequis :** les tables `profils` et `cercle_personnes` doivent exister. Si `cercle_personnes` est absente, exécuter uniquement les blocs 092 et 093.

## 2. Vérifier les migrations

Exécuter dans le SQL Editor :
- **`sql/verification_migrations_092_093_075.sql`**

Vérifier que :
- 092 : une ligne pour `date_entree_famille` sur `profils`.
- 093 : deux lignes pour `phone` et `ville_residence` sur `profils`.
- 075 : une ligne pour `profil_id` sur `cercle_personnes`, une pour la fonction `sync_cercle_personnes_vers_profils`, une pour le trigger `sync_cercle_vers_profils_trigger`.

## 3. RPC Arbre généalogique 100 % profils

La RPC **`get_arbre_4_niveaux(p_pasteur_id UUID)`** doit s’appuyer uniquement sur **`profils`** (alignement Phase 3). Si elle n’existe pas encore en base ou si elle lit encore `cercle_personnes`, exécuter :

- **`sql/migrations/103_arbre_4_niveaux_rpc_profils.sql`**

Cela crée ou remplace la fonction pour retourner les 4 niveaux (Pasteur → Superviseur → Mentor → Disciple) à partir de `profils` et `familles_disciples` uniquement.

---

*Document créé pour la suite A puis B (rapport tout à implémenter).*
