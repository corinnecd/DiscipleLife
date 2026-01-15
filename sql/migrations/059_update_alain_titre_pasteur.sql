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
