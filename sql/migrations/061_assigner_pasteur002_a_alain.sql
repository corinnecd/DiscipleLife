-- Migration: Assigner PASTEUR-002 comme pasteur de tutelle d'Alain (superviseur)
-- Date: 2024

-- Étape 1: Trouver l'ID du pasteur avec identifiant_unique = 'PASTEUR-002'
-- Étape 2: Trouver l'ID du superviseur Alain
-- Étape 3: Mettre à jour le pasteur_id du superviseur Alain

-- Mise à jour du pasteur_id pour Alain (même si un pasteur est déjà assigné, on le remplace)
UPDATE profils
SET pasteur_id = (
  SELECT id 
  FROM profils 
  WHERE identifiant_unique = 'PASTEUR-002' 
    AND role = 'pasteur'
  LIMIT 1
)
WHERE role = 'superviseur'
  AND (LOWER(first_name) LIKE '%alain%' OR LOWER(last_name) LIKE '%alain%');

-- Vérification : Afficher les informations du superviseur Alain avec son pasteur de tutelle
SELECT 
  s.id AS superviseur_id,
  s.first_name AS superviseur_prenom,
  s.last_name AS superviseur_nom,
  s.role AS superviseur_role,
  s.pasteur_id,
  p.id AS pasteur_id_verif,
  p.identifiant_unique AS pasteur_identifiant,
  p.first_name AS pasteur_prenom,
  p.last_name AS pasteur_nom
FROM profils s
LEFT JOIN profils p ON s.pasteur_id = p.id
WHERE s.role = 'superviseur'
  AND (LOWER(s.first_name) LIKE '%alain%' OR LOWER(s.last_name) LIKE '%alain%');
