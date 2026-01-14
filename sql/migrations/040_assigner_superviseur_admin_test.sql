-- ============================================
-- Script pour assigner l'admin actuel aux familles (pour test)
-- Objectif: Assigner l'utilisateur admin existant aux familles pour vérifier le fonctionnement
-- ============================================

-- ATTENTION: Ce script assigne l'utilisateur admin actuel à TOUTES les familles
-- C'est seulement pour tester. Dans la production, chaque famille doit avoir son propre superviseur.

-- Option 1: Assigner l'admin actuel à toutes les familles (pour test uniquement)
UPDATE familles_disciples
SET superviseur_id = (
  SELECT id FROM profils 
  WHERE role = 'admin' 
  LIMIT 1
),
updated_at = NOW()
WHERE superviseur_id IS NULL;

-- Vérification: Afficher les familles avec leur superviseur
SELECT 
  f.identifiant_famille,
  f.nom as nom_famille,
  p.first_name || ' ' || p.last_name as superviseur,
  p.email as email_superviseur,
  p.role as role_superviseur
FROM familles_disciples f
LEFT JOIN profils p ON f.superviseur_id = p.id
ORDER BY f.identifiant_famille
LIMIT 10;

