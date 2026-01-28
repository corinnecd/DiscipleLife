# Créer les comptes des 41 disciples (famille Les Déterminés)

Ce script crée les comptes **Supabase Auth** (et donc les profils) pour les disciples de la famille **« Les Déterminés »** qui n’ont pas encore de `profil_id` dans `cercle_personnes`.

---

## Prérequis

1. **Fichier `.env`** à la racine du projet avec :
   - `SUPABASE_URL=https://votre-projet.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role`

   La clé **service_role** se trouve dans Supabase → **Project Settings** → **API** → **service_role** (secret).

2. **Migration 075** déjà exécutée (trigger sync cercle → profils en place).

---

## Exécution

À la racine du projet :

```bash
node scripts/create_comptes_disciples_les_determines.js
```

Ou avec `dotenv` chargé explicitement :

```bash
npx dotenv node scripts/create_comptes_disciples_les_determines.js
```

---

## Comportement

1. Récupère l’ID de la famille **« Les Déterminés »** dans `familles_disciples`.
2. Récupère les superviseurs et mentors de cette famille.
3. Récupère les lignes de **`cercle_personnes`** sans `profil_id` dont le `user_id` (mentor/superviseur) appartient à cette famille.
4. Pour chaque disciple :
   - Génère un email (existant ou du type `prenom.nom.xxxx@disciplelife.local`).
   - Crée un utilisateur Auth avec **Supabase Auth Admin** (`email_confirm: true`).
   - Met à jour **`cercle_personnes.email`** → le trigger **sync_cercle_vers_profils** crée le profil dans **`profils`**.

---

## Mot de passe temporaire

Le script utilise le mot de passe : **`DiscipleLife2026!`**

À communiquer aux disciples ou à réinitialiser depuis **Supabase** → **Authentication** → **Users** si besoin.

---

## Vérification après exécution

Dans Supabase → **SQL Editor** :

```sql
SELECT COUNT(*) AS avec_profil_id FROM cercle_personnes WHERE profil_id IS NOT NULL;
SELECT COUNT(*) AS sans_profil_id FROM cercle_personnes WHERE profil_id IS NULL;
```

Vous devriez voir plus de lignes « avec profil_id » qu’avant (jusqu’à 72 si les 41 étaient bien tous de la famille Les Déterminés).
