-- ============================================
-- Migration 107 : Corriger le rôle de DR MODE (pasteur, pas disciple)
-- Objectif : Mettre role = 'pasteur' et identifiant_unique = 'PASTEUR-001' pour dr.mode@disciplelife.com
-- ============================================

-- 1. Vérification avant : profil(s) concerné(s)
SELECT id, first_name, last_name, email, role, identifiant_unique
FROM profils
WHERE email = 'dr.mode@disciplelife.com'
   OR LOWER(TRIM(first_name || ' ' || last_name)) = 'dr mode'
   OR identifiant_unique = 'PASTEUR-001';

-- 2. Mise à jour : rôle pasteur + identifiant PASTEUR-001
UPDATE profils
SET
  role = 'pasteur',
  identifiant_unique = COALESCE(NULLIF(TRIM(identifiant_unique), ''), 'PASTEUR-001'),
  updated_at = NOW()
WHERE email = 'dr.mode@disciplelife.com'
   OR (LOWER(TRIM(first_name)) = 'dr' AND LOWER(TRIM(last_name)) = 'mode')
   OR identifiant_unique = 'PASTEUR-001';

-- 3. Vérification après
SELECT id, first_name, last_name, email, role, identifiant_unique, updated_at
FROM profils
WHERE email = 'dr.mode@disciplelife.com'
   OR identifiant_unique = 'PASTEUR-001';
