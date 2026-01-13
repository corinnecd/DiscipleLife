# 📋 INSTRUCTIONS MIGRATION - OBJECTIF 1B

## Migration SQL à exécuter

Exécutez le fichier suivant dans Supabase SQL Editor :

**Fichier :** `sql/migrations/004_objectif1b_retour_eloignes.sql`

## Étapes

1. Ouvrez **Supabase Dashboard** → **SQL Editor**
2. Ouvrez le fichier `sql/migrations/004_objectif1b_retour_eloignes.sql`
3. Copiez tout le contenu du fichier
4. Collez-le dans l'éditeur SQL de Supabase
5. Cliquez sur **Run** ou appuyez sur `Ctrl+Enter` (ou `Cmd+Enter` sur Mac)

## Tables créées

### 1. `contacts_relance`
Table pour tracker les tentatives de relance des membres éloignés :
- `id` : Identifiant unique
- `visiteur_id` : Référence au visiteur éloigné
- `contacteur_id` : Personne qui a fait la relance
- `date_contact` : Date/heure du contact
- `type_contact` : Type (téléphone, email, SMS, WhatsApp, visite, autre)
- `statut` : Statut (tenté, joint, pas de réponse, refusé, intéressé)
- `notes` : Notes supplémentaires
- `prochaine_relance` : Date prévue pour la prochaine relance

### 2. `historique_presence`
Table pour tracker l'historique de présence des visiteurs :
- `id` : Identifiant unique
- `visiteur_id` : Référence au visiteur
- `date_presence` : Date de présence
- `type_presence` : Type (culte dimanche, activité semaine, événement, autre)
- `presence_confirmee` : Boolean pour confirmer la présence
- `notes` : Notes supplémentaires
- `enregistre_par` : Personne qui a enregistré la présence

## Vérification

Après l'exécution, vérifiez que :
- ✅ Les tables `contacts_relance` et `historique_presence` sont créées
- ✅ Les indexes sont créés
- ✅ Les triggers sont créés
- ✅ Les politiques RLS sont activées

## En cas d'erreur

Si vous rencontrez des erreurs :
1. Vérifiez que les tables `visiteurs` et `profils` existent
2. Vérifiez que la fonction `update_updated_at_column()` existe (créée dans les migrations précédentes)
3. Vérifiez les permissions RLS si nécessaire




