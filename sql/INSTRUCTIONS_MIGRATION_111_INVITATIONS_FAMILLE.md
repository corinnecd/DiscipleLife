# Migration 111 – Invitations Famille (Phase 1 Authentification)

## Contenu

- **Table `invitations_famille`** : stocke les invitations avec code, token, type de rôle, validateur, expiration
- **RPC `valider_invitation_token(p_token)`** : valide un token et retourne les infos d'invitation (appelable sans auth)
- **RPC `creer_invitation_famille(p_type_role, p_famille_id, p_email_invite)`** : crée une invitation (validateur selon le rôle)

## Exécution

Dans Supabase SQL Editor :

```sql
-- Exécuter le fichier :
-- sql/migrations/111_invitations_famille.sql
```

## Test manuel

### 1. Créer une invitation (en tant que mentor ou superviseur)

Connecté en tant que mentor (ex. Corinne Test) ou superviseur :

```sql
-- Exemple : créer une invitation disciple (nécessite d'être connecté en mentor/superviseur)
SELECT * FROM creer_invitation_famille(
  'disciple'::TEXT,
  (SELECT id FROM familles_disciples WHERE nom ILIKE '%Déterminés%' LIMIT 1),
  NULL
);
```

Résultat attendu : `id`, `code`, `token`, `lien_complet` (ex. `/inscription/xxxxx`).

### 2. Tester la page d'inscription

1. Copier le `token` retourné
2. Ouvrir : `http://localhost:3000/inscription/{token}`
3. Remplir le formulaire (Prénom, Nom, Email, Confirmation email)
4. Soumettre → message de succès

### 3. Tester un token invalide

- `/inscription/token-inexistant` → message "Ce lien a expiré ou a déjà été utilisé"
- Token expiré (après 7 jours) → même message

## Règles de validation

| Rôle       | Qui peut créer l'invitation |
|------------|-----------------------------|
| Disciple   | Mentor, Pilier ou Superviseur de la famille |
| Mentor     | Superviseur de la famille   |
| Superviseur| Pasteur                     |
