# Vérification de la connexion Supabase - Objectif 1

## Tables requises

Les tables suivantes doivent être créées dans Supabase pour que l'objectif 1 fonctionne :

### Tables principales

1. **visiteurs**
   - Colonnes : id, nom, prenom, email, telephone, statut, source_contact, date_premier_contact, date_dernier_contact, invitant_id, notes, interesse_par, created_at, updated_at
   - Index : invitant_id, statut, email, date_premier_contact
   - RLS : Activé

2. **campagnes_evangelisation**
   - Colonnes : id, nom, description, type_campagne, date_debut, date_fin, responsable_id, objectif_participants, statut, created_at, updated_at
   - Index : responsable_id, statut
   - RLS : Activé

3. **campagne_visiteurs**
   - Colonnes : campagne_id, visiteur_id, date_inscription
   - Clé primaire composite : (campagne_id, visiteur_id)
   - RLS : Activé

4. **codes_invitation**
   - Colonnes : id, user_id, code, lien_invitation, nombre_invites, nombre_conversions, created_at, updated_at
   - Index : user_id, code
   - RLS : Activé

5. **invitations_envoyees**
   - Colonnes : id, code_invitation_id, invitant_id, visiteur_id, email, telephone, nom, prenom, canal, message, statut, date_envoi, date_ouverture, date_conversion, created_at
   - Index : code_invitation_id, invitant_id, visiteur_id, statut
   - RLS : Activé

## Vérification de la connexion

### Test dans la console du navigateur

Ouvrez la console du navigateur (F12) et exécutez :

```javascript
// Test de connexion Supabase
import { supabase } from '@/lib/customSupabaseClient';

// Test 1: Vérifier la table visiteurs
const { data: visiteurs, error: err1 } = await supabase
  .from('visiteurs')
  .select('count', { count: 'exact', head: true });
console.log('Visiteurs:', err1 ? '❌ Erreur: ' + err1.message : '✅ OK');

// Test 2: Vérifier la table campagnes_evangelisation
const { data: campagnes, error: err2 } = await supabase
  .from('campagnes_evangelisation')
  .select('count', { count: 'exact', head: true });
console.log('Campagnes:', err2 ? '❌ Erreur: ' + err2.message : '✅ OK');

// Test 3: Vérifier la table codes_invitation
const { data: codes, error: err3 } = await supabase
  .from('codes_invitation')
  .select('count', { count: 'exact', head: true });
console.log('Codes invitation:', err3 ? '❌ Erreur: ' + err3.message : '✅ OK');

// Test 4: Vérifier la table invitations_envoyees
const { data: invitations, error: err4 } = await supabase
  .from('invitations_envoyees')
  .select('count', { count: 'exact', head: true });
console.log('Invitations:', err4 ? '❌ Erreur: ' + err4.message : '✅ OK');
```

## Configuration Supabase

### URL du projet
- **URL**: `https://ggrkwivcspuwxuyrjyem.supabase.co`
- **Clé anonyme**: Configurée dans `src/lib/customSupabaseClient.js`

### Politiques RLS (Row Level Security)

Toutes les tables ont RLS activé avec les politiques suivantes :

- **visiteurs**: Les utilisateurs voient leurs propres visiteurs, les admins/mentors voient tout
- **campagnes_evangelisation**: Tout le monde peut voir, seuls les mentors/admins peuvent créer/modifier
- **codes_invitation**: Chaque utilisateur a son propre code unique
- **invitations_envoyees**: Les utilisateurs voient leurs propres invitations

## Fonctionnalités testées

✅ Connexion Supabase configurée
✅ Requêtes pour visiteurs
✅ Requêtes pour campagnes
✅ Requêtes pour codes d'invitation
✅ Requêtes pour invitations envoyées
✅ Jointures avec la table profils
✅ Gestion des erreurs

## Prochaines étapes

1. Vérifier que toutes les tables existent dans Supabase Dashboard
2. Vérifier que les politiques RLS sont correctement configurées
3. Tester la page `/evangelization` dans l'application
4. Vérifier que les données s'affichent correctement

## En cas d'erreur

Si vous rencontrez des erreurs :

1. **Erreur "relation does not exist"**: La table n'existe pas, exécutez la migration SQL
2. **Erreur "permission denied"**: Vérifiez les politiques RLS dans Supabase
3. **Erreur "foreign key violation"**: Vérifiez que la table `profils` existe et contient des données






