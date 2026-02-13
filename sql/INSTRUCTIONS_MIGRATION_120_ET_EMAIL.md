# Migration 120 et envoi d'email inscription étape 1

## 1. Exécuter la migration SQL

Dans Supabase → SQL Editor, exécuter :

```
sql/migrations/120_inscription_step1_email.sql
```

Cela crée :
- La table `inscription_step1` (token, email, data_json, expire_at)
- La RPC `creer_lien_inscription_step1(p_email, p_data)`
- La RPC `get_inscription_step1_by_token(p_token)`

## 2. Configurer l'envoi d'email (Edge Function)

Pour que l'email soit effectivement envoyé après validation du formulaire :

1. **Créer un compte Resend** (https://resend.com) et récupérer une API Key
2. **Déployer l'Edge Function** :
   ```bash
   supabase functions deploy send-inscription-email
   ```
3. **Configurer la variable d'environnement** dans Supabase Dashboard :
   - Edge Functions → send-inscription-email → Secrets
   - Ajouter `RESEND_API_KEY` = votre clé Resend

4. **Personnaliser l'expéditeur** : Dans `supabase/functions/send-inscription-email/index.ts`, modifier la ligne `from` pour utiliser un domaine vérifié chez Resend (ex. `noreply@votredomaine.com`).

## 3. Flux utilisateur

1. L'utilisateur remplit le formulaire étape 1 sur la page d'accueil
2. Il clique sur « Continuer »
3. Le système crée un token via `creer_lien_inscription_step1`
4. L'Edge Function `send-inscription-email` envoie l'email avec le lien
5. L'utilisateur reçoit l'email et clique sur le lien → `/signup?token=xxx`
6. Le formulaire complet se préremplit avec les données stockées

Si l'Edge Function n'est pas déployée ou échoue, le lien est tout de même créé et l'utilisateur est redirigé vers `/signup?token=xxx` (les données sont aussi dans sessionStorage).
