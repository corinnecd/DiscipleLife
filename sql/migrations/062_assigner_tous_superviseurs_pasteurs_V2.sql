-- Migration: Assigner tous les superviseurs à leur pasteur de tutelle (Version 2 - Table de correspondance)
-- Date: 2024
-- Objectif: Répartir les 26 superviseurs entre les 4 pasteurs de manière équitable

-- ============================================
-- MÉTHODE: Utilisation d'une table temporaire de correspondance
-- ============================================

-- Créer une table temporaire avec les assignations
CREATE TEMP TABLE IF NOT EXISTS assignations_superviseurs_pasteurs (
  superviseur_email TEXT,
  pasteur_identifiant TEXT
);

-- Insérer les assignations spécifiques connues
INSERT INTO assignations_superviseurs_pasteurs (superviseur_email, pasteur_identifiant) VALUES
  ('alain.sil@example.com', 'PASTEUR-002'),
  ('coco.okanzi@example.com', 'PASTEUR-001');

-- Assigner les superviseurs selon la table de correspondance
UPDATE profils s
SET pasteur_id = (
  SELECT p.id 
  FROM profils p
  INNER JOIN assignations_superviseurs_pasteurs a ON p.identifiant_unique = a.pasteur_identifiant
  WHERE a.superviseur_email = s.email
    AND p.role = 'pasteur'
  LIMIT 1
)
WHERE s.role = 'superviseur'
  AND EXISTS (
    SELECT 1 
    FROM assignations_superviseurs_pasteurs a 
    WHERE a.superviseur_email = s.email
  );

-- ============================================
-- RÉPARTITION ÉQUITABLE DES SUPERVISEURS RESTANTS
-- ============================================
-- Répartir les superviseurs restants de manière séquentielle entre les 4 pasteurs

WITH superviseurs_restants AS (
  SELECT 
    id,
    email,
    first_name,
    last_name,
    ROW_NUMBER() OVER (ORDER BY email) AS row_num
  FROM profils
  WHERE role = 'superviseur'
    AND pasteur_id IS NULL
),
pasteurs_avec_numero AS (
  SELECT 
    id,
    identifiant_unique,
    ROW_NUMBER() OVER (ORDER BY identifiant_unique) AS pasteur_num
  FROM profils
  WHERE role = 'pasteur'
)
UPDATE profils s
SET pasteur_id = p.id
FROM superviseurs_restants sr
JOIN pasteurs_avec_numero p ON ((sr.row_num - 1) % 4) + 1 = p.pasteur_num
WHERE s.id = sr.id;

-- ============================================
-- VÉRIFICATION ET RAPPORT FINAL
-- ============================================

-- Afficher la répartition finale par pasteur
SELECT 
  p.identifiant_unique AS pasteur_identifiant,
  p.first_name || ' ' || p.last_name AS pasteur_nom_complet,
  COUNT(s.id) AS nombre_superviseurs,
  STRING_AGG(s.first_name || ' ' || s.last_name, ', ' ORDER BY s.first_name) AS liste_superviseurs
FROM profils p
LEFT JOIN profils s ON s.pasteur_id = p.id AND s.role = 'superviseur'
WHERE p.role = 'pasteur'
GROUP BY p.id, p.identifiant_unique, p.first_name, p.last_name
ORDER BY p.identifiant_unique;

-- Afficher les superviseurs sans pasteur assigné (s'il y en a)
SELECT 
  id,
  first_name,
  last_name,
  email,
  identifiant_unique,
  pasteur_id
FROM profils
WHERE role = 'superviseur'
  AND pasteur_id IS NULL
ORDER BY email;

-- Nettoyer la table temporaire
DROP TABLE IF EXISTS assignations_superviseurs_pasteurs;
