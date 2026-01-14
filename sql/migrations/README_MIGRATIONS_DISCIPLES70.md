# 📋 GUIDE D'INSTALLATION DES MIGRATIONS - DISCIPLES 70

## ✅ ÉTAT DES MIGRATIONS

### Migrations créées pour "Familles de Disciples de 70" :

1. ✅ **034_create_familles_disciples.sql** - Table `familles_disciples`
2. ✅ **035_add_famille_to_profils.sql** - Colonnes famille dans `profils`
3. ✅ **040_create_piliers_mentors.sql** - Table `piliers_mentors`
4. ✅ **035_insert_26_familles.sql** - Insertion des 26 familles

---

## ⚠️ ORDRE D'EXÉCUTION OBLIGATOIRE

**IMPORTANT :** Exécutez les migrations dans cet ordre exact :

### Étape 1 : Vérifier la fonction `update_updated_at_column()`

Cette fonction doit exister avant d'exécuter les migrations. Elle est normalement créée dans `016_objectif3_transformation_tables.sql`.

**Si elle n'existe pas, exécutez d'abord :**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### Étape 2 : Migration 034 - Créer la table familles_disciples

```sql
-- Exécuter : 034_create_familles_disciples.sql
```

**Ce que cette migration fait :**
- Crée la table `familles_disciples`
- Ajoute les index et triggers
- Configure les politiques RLS

**Vérification après exécution :**
```sql
SELECT * FROM familles_disciples LIMIT 1;
-- Doit retourner une erreur "relation does not exist" si la table n'existe pas encore
-- Doit retourner des lignes vides si la table existe mais est vide
```

---

### Étape 3 : Migration 035 - Ajouter les colonnes famille dans profils

```sql
-- Exécuter : 035_add_famille_to_profils.sql
```

**Ce que cette migration fait :**
- Ajoute `famille_id`, `identifiant_disciple`, `superviseur_id`, `mentor_id` à `profils`
- Met à jour la contrainte `role` pour inclure les nouveaux rôles
- Crée les index nécessaires

**⚠️ ATTENTION :** Cette migration fait référence à `familles_disciples(id)`, donc la migration 034 doit être exécutée en premier.

**Vérification après exécution :**
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profils' 
AND column_name IN ('famille_id', 'identifiant_disciple', 'superviseur_id', 'mentor_id');
-- Doit retourner 4 lignes
```

---

### Étape 4 : Migration 040 - Créer la table piliers_mentors

```sql
-- Exécuter : 040_create_piliers_mentors.sql
```

**Ce que cette migration fait :**
- Crée la table `piliers_mentors`
- Ajoute les index et triggers
- Configure les politiques RLS

**Vérification après exécution :**
```sql
SELECT * FROM piliers_mentors LIMIT 1;
-- Doit retourner des lignes vides si la table existe mais est vide
```

---

### Étape 5 : Migration 035_insert - Insérer les 26 familles

```sql
-- Exécuter : 035_insert_26_familles.sql
```

**⚠️ IMPORTANT :** 
- Les superviseurs doivent exister dans la table `profils` AVANT d'exécuter cette migration
- Si les superviseurs n'existent pas, les familles seront créées sans `superviseur_id`
- Vous devrez mettre à jour manuellement les `superviseur_id` après création des comptes

**Ce que cette migration fait :**
- Insère les 26 familles avec leurs identifiants
- Tente de trouver les superviseurs par nom (approximatif)
- Affiche un message si un superviseur n'est pas trouvé

**Vérification après exécution :**
```sql
SELECT COUNT(*) FROM familles_disciples;
-- Doit retourner 26
```

**Vérifier les superviseurs manquants :**
```sql
SELECT nom, identifiant_famille, superviseur_id 
FROM familles_disciples 
WHERE superviseur_id IS NULL;
-- Affiche les familles sans superviseur assigné
```

---

## 🔍 VÉRIFICATIONS POST-INSTALLATION

### 1. Vérifier que toutes les tables existent

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('familles_disciples', 'piliers_mentors')
ORDER BY table_name;
-- Doit retourner 2 lignes
```

### 2. Vérifier les colonnes dans profils

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profils' 
AND column_name IN ('famille_id', 'identifiant_disciple', 'superviseur_id', 'mentor_id', 'role')
ORDER BY column_name;
-- Doit retourner 5 lignes
```

### 3. Vérifier les contraintes de rôle

```sql
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'profils_role_check';
-- Doit inclure tous les rôles : super_admin, admin, pasteur, superviseur, mentor, disciple, tutore
```

### 4. Vérifier les 26 familles

```sql
SELECT 
  identifiant_famille,
  nom,
  CASE WHEN superviseur_id IS NULL THEN '❌ Sans superviseur' ELSE '✅ Avec superviseur' END as statut_superviseur
FROM familles_disciples 
ORDER BY identifiant_famille;
-- Doit retourner 26 lignes
```

### 5. Vérifier les politiques RLS

```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('familles_disciples', 'piliers_mentors')
ORDER BY tablename, policyname;
-- Doit retourner au moins 4 politiques (2 par table)
```

---

## 🐛 PROBLÈMES COURANTS ET SOLUTIONS

### Problème 1 : "relation 'familles_disciples' does not exist"

**Cause :** La migration 034 n'a pas été exécutée ou a échoué.

**Solution :** Exécutez d'abord `034_create_familles_disciples.sql`

---

### Problème 2 : "function update_updated_at_column() does not exist"

**Cause :** La fonction n'existe pas dans la base de données.

**Solution :** Exécutez d'abord cette requête :
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

---

### Problème 3 : "constraint profils_role_check already exists"

**Cause :** La contrainte existe déjà avec d'anciennes valeurs.

**Solution :** La migration 035 devrait gérer cela automatiquement, mais si ça échoue :
```sql
ALTER TABLE profils DROP CONSTRAINT IF EXISTS profils_role_check;
-- Puis réexécutez la migration 035
```

---

### Problème 4 : "Les 26 familles ne sont pas créées"

**Cause :** La migration 035_insert n'a pas été exécutée ou a échoué silencieusement.

**Solution :** 
1. Vérifiez les logs Supabase pour voir les messages `RAISE NOTICE`
2. Exécutez manuellement :
```sql
INSERT INTO familles_disciples (nom, identifiant_famille, objectif_disciples, statut)
VALUES ('LES DÉTERMINÉS', 'FAM001', 70, 'actif')
ON CONFLICT (identifiant_famille) DO NOTHING;
-- Répétez pour les 26 familles
```

---

### Problème 5 : "Tous les superviseur_id sont NULL"

**Cause :** Les comptes superviseurs n'existent pas encore dans `profils`.

**Solution :** 
1. Créez d'abord les comptes utilisateurs pour les superviseurs
2. Mettez à jour manuellement :
```sql
UPDATE familles_disciples 
SET superviseur_id = (SELECT id FROM profils WHERE first_name = 'Alain' AND last_name = 'SIL' LIMIT 1)
WHERE identifiant_famille = 'FAM001';
-- Répétez pour chaque famille
```

---

## 📝 CHECKLIST D'INSTALLATION

- [ ] Fonction `update_updated_at_column()` existe
- [ ] Migration 034 exécutée avec succès
- [ ] Table `familles_disciples` créée
- [ ] Migration 035 exécutée avec succès
- [ ] Colonnes famille ajoutées à `profils`
- [ ] Contrainte `role` mise à jour
- [ ] Migration 040 exécutée avec succès
- [ ] Table `piliers_mentors` créée
- [ ] Migration 035_insert exécutée avec succès
- [ ] 26 familles créées
- [ ] Superviseurs assignés (ou à assigner manuellement)
- [ ] Toutes les vérifications post-installation passées

---

## 🚀 PROCHAINES ÉTAPES

Une fois toutes les migrations exécutées :

1. ✅ Créer les comptes utilisateurs pour les 26 superviseurs
2. ✅ Mettre à jour les `superviseur_id` dans `familles_disciples`
3. ✅ Assigner les disciples existants aux familles
4. ✅ Tester la page `FamillesDisciples.jsx`
5. ✅ Passer à l'ÉTAPE 2 : Page de Présence

---

## 📞 SUPPORT

Si vous rencontrez des erreurs, vérifiez :
1. L'ordre d'exécution des migrations
2. Les logs Supabase pour les messages d'erreur détaillés
3. Que toutes les dépendances sont satisfaites (tables, fonctions, contraintes)

