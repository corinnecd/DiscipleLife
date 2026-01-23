# Guide Rapide : Promotion des Disciples en Mentors

## 🎯 Objectif

Promouvoir automatiquement tous les disciples qui ont des disciples au statut de "mentor".

## ✅ Solution Recommandée (Sans Risque)

**Utilisez le script Node.js** qui est sécurisé et ne causera pas de lenteur :

```bash
node scripts/promote_disciples_to_mentors.js
```

## 📋 Ce que fait le script

1. **Diagnostic** : Identifie tous les disciples qui ont des disciples
2. **Affichage** : Montre la liste avant modification
3. **Confirmation** : Attend 5 secondes avant de continuer
4. **Promotion** : Met à jour les rôles un par un
5. **Rapport** : Affiche le résultat détaillé

## 🔍 Vérification Manuelle (Optionnel)

Si vous voulez vérifier avant d'exécuter :

```sql
-- Dans Supabase SQL Editor, exécutez :
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.role,
    COUNT(DISTINCT cp_user.id) + COUNT(DISTINCT cp_parent.id) AS total_disciples
FROM profils p
LEFT JOIN cercle_personnes cp_user ON cp_user.user_id = p.id
LEFT JOIN cercle_personnes cp_inter ON cp_inter.user_id = p.id
LEFT JOIN cercle_personnes cp_parent ON cp_parent.parent_disciple_id = cp_inter.id
WHERE p.role = 'disciple'
  AND p.role NOT IN ('pasteur', 'superviseur', 'admin', 'super_admin')
GROUP BY p.id, p.first_name, p.last_name, p.email, p.role
HAVING (COUNT(DISTINCT cp_user.id) + COUNT(DISTINCT cp_parent.id)) > 0
ORDER BY total_disciples DESC;
```

## ⚙️ Installation du Trigger Automatique (Optionnel)

Pour que la promotion se fasse automatiquement à l'avenir :

```sql
-- Dans Supabase SQL Editor, exécutez :
\i sql/migrations/076_trigger_auto_promote_disciple_to_mentor.sql
```

## ❓ Problèmes ?

Si le script ne fonctionne pas :
1. Vérifiez que les variables d'environnement sont définies (`.env.local`)
2. Vérifiez la connexion à Supabase
3. Consultez les logs d'erreur dans la console
