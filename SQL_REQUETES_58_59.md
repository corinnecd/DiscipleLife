# Requêtes SQL 58 et 59

## Migration 058 : Ajouter le champ 'titre' à la table profils

```sql
-- Migration: Ajouter le champ 'titre' à la table profils
-- Ce champ permet de stocker le titre du superviseur/mentor (Pasteur, Berger, Mentor)
-- Date: 2024

-- Ajouter la colonne 'titre' à la table profils
ALTER TABLE profils
ADD COLUMN IF NOT EXISTS titre TEXT;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN profils.titre IS 'Titre du superviseur ou mentor: Pasteur, Berger, ou Mentor';

-- Créer un index pour améliorer les performances des requêtes par titre
CREATE INDEX IF NOT EXISTS idx_profils_titre ON profils(titre);
```

## Migration 059 : Mettre à jour le titre d'Alain (superviseur) en "Pasteur"

```sql
-- Migration: Mettre à jour le titre d'Alain (superviseur) en "Pasteur"
-- Date: 2024

-- Mettre à jour le titre d'Alain pour qu'il apparaisse comme "Pasteur" dans son dashboard
-- Remplacez 'Alain' par le prénom exact et ajustez le nom si nécessaire
UPDATE profils
SET titre = 'Pasteur'
WHERE role = 'superviseur'
  AND (LOWER(first_name) LIKE '%alain%' OR LOWER(last_name) LIKE '%alain%')
  AND titre IS NULL;

-- Vérification
SELECT 
  id,
  first_name,
  last_name,
  role,
  titre,
  email
FROM profils
WHERE role = 'superviseur'
  AND (LOWER(first_name) LIKE '%alain%' OR LOWER(last_name) LIKE '%alain%');
```

## Notes importantes

1. **Migration 058** : Ajoute le champ `titre` à la table `profils` pour permettre aux superviseurs et mentors de spécifier leur titre (Pasteur, Berger, ou Mentor).

2. **Migration 059** : Met à jour spécifiquement le titre d'Alain (superviseur) en "Pasteur" pour qu'il apparaisse comme "Pasteur Alain" dans le bandeau de bienvenue.

3. **Ordre d'exécution** : Exécutez d'abord la migration 058, puis la migration 059.
