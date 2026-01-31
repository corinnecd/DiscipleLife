# Réinitialisation du mot de passe – Configuration Supabase

Pour que le lien « Mot de passe oublié » fonctionne, Supabase doit rediriger l’utilisateur vers la page de création d’un nouveau mot de passe après clic sur le lien reçu par email.

## 1. URL de redirection utilisée dans l’app

L’app envoie l’email de réinitialisation avec l’URL de redirection suivante :

- **En développement :** `http://localhost:5173/update-password` (ou le port utilisé par Vite)
- **En production :** `https://votre-domaine.com/update-password`

(Le code utilise `window.location.origin + '/update-password'`.)

## 2. Configurer les URLs dans Supabase

1. Ouvrez le **tableau de bord Supabase** du projet.
2. Allez dans **Authentication** → **URL Configuration** (ou **Settings** → **Auth**).
3. Dans **Redirect URLs**, ajoutez :
   - `http://localhost:5173/update-password` (dev)
   - `https://votre-domaine.com/update-password` (prod)
4. Enregistrez.

Si ces URLs ne sont pas dans la liste, Supabase refusera la redirection après clic sur le lien et l’utilisateur verra une erreur.

## 3. Parcours utilisateur

1. **Connexion** → lien « Mot de passe oublié ? » → `/forgot-password`
2. Saisie de l’**email** → clic sur « Envoyer le lien de réinitialisation »
3. Supabase envoie un **email** avec un lien magique
4. L’utilisateur clique sur le lien → redirection vers **`/update-password`**
5. Saisie du **nouveau mot de passe** (×2) → mise à jour

## 4. En cas de problème

- Vérifier que l’email de réinitialisation n’est pas en **spam**.
- Vérifier que l’URL de redirection est bien ajoutée dans Supabase (Redirect URLs).
- En local, l’URL doit correspondre exactement au `origin` (ex. `http://localhost:5173`).
