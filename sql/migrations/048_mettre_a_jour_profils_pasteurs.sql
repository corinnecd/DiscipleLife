-- ============================================
-- Migration: Mettre à jour les profils des pasteurs avec leurs identifiants uniques
-- Objectif: Ajouter identifiant_unique et role='pasteur' aux 4 pasteurs créés
-- ============================================

-- Étape 1: S'assurer que la colonne identifiant_unique existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profils' AND column_name = 'identifiant_unique'
    ) THEN
        ALTER TABLE profils 
        ADD COLUMN identifiant_unique TEXT UNIQUE;
        
        CREATE INDEX IF NOT EXISTS idx_profils_identifiant_unique ON profils(identifiant_unique);
        
        RAISE NOTICE 'Colonne identifiant_unique ajoutée à la table profils';
    ELSE
        RAISE NOTICE 'Colonne identifiant_unique existe déjà';
    END IF;
END $$;

-- Étape 2: Mettre à jour le profil de DR MODE (PASTEUR-001)
UPDATE profils 
SET 
  identifiant_unique = 'PASTEUR-001',
  role = 'pasteur',
  first_name = 'DR',
  last_name = 'MODE',
  updated_at = NOW()
WHERE email = 'dr.mode@disciplelife.com'
RETURNING id, email, identifiant_unique, role;

-- Étape 3: Mettre à jour le profil de PS JULIANA (PASTEUR-002)
UPDATE profils 
SET 
  identifiant_unique = 'PASTEUR-002',
  role = 'pasteur',
  first_name = 'PS',
  last_name = 'JULIANA',
  updated_at = NOW()
WHERE email = 'ps.juliana@disciplelife.com'
RETURNING id, email, identifiant_unique, role;

-- Étape 4: Mettre à jour le profil de PS PEGGY NN (PASTEUR-003)
UPDATE profils 
SET 
  identifiant_unique = 'PASTEUR-003',
  role = 'pasteur',
  first_name = 'PS',
  last_name = 'PEGGY NN',
  updated_at = NOW()
WHERE email = 'ps.peggy.nn@disciplelife.com'
RETURNING id, email, identifiant_unique, role;

-- Étape 5: Mettre à jour le profil de PS JESSY (PASTEUR-004)
UPDATE profils 
SET 
  identifiant_unique = 'PASTEUR-004',
  role = 'pasteur',
  first_name = 'PS',
  last_name = 'JESSY',
  updated_at = NOW()
WHERE email = 'ps.jessy@disciplelife.com'
RETURNING id, email, identifiant_unique, role;

-- Étape 6: Vérification et rapport
DO $$
DECLARE
    v_pasteur_count INTEGER;
    v_pasteur_001_id UUID;
    v_pasteur_002_id UUID;
    v_pasteur_003_id UUID;
    v_pasteur_004_id UUID;
BEGIN
    -- Compter les pasteurs
    SELECT COUNT(*) INTO v_pasteur_count
    FROM profils
    WHERE role = 'pasteur' AND identifiant_unique LIKE 'PASTEUR-%';
    
    -- Vérifier chaque pasteur
    SELECT id INTO v_pasteur_001_id FROM profils WHERE identifiant_unique = 'PASTEUR-001';
    SELECT id INTO v_pasteur_002_id FROM profils WHERE identifiant_unique = 'PASTEUR-002';
    SELECT id INTO v_pasteur_003_id FROM profils WHERE identifiant_unique = 'PASTEUR-003';
    SELECT id INTO v_pasteur_004_id FROM profils WHERE identifiant_unique = 'PASTEUR-004';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RAPPORT DE MISE À JOUR DES PASTEURS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Nombre total de pasteurs: %', v_pasteur_count;
    RAISE NOTICE '';
    RAISE NOTICE 'PASTEUR-001 (DR MODE): %', 
        CASE WHEN v_pasteur_001_id IS NOT NULL THEN '✅ Créé (' || v_pasteur_001_id || ')' ELSE '❌ Non trouvé' END;
    RAISE NOTICE 'PASTEUR-002 (PS JULIANA): %', 
        CASE WHEN v_pasteur_002_id IS NOT NULL THEN '✅ Créé (' || v_pasteur_002_id || ')' ELSE '❌ Non trouvé' END;
    RAISE NOTICE 'PASTEUR-003 (PS PEGGY NN): %', 
        CASE WHEN v_pasteur_003_id IS NOT NULL THEN '✅ Créé (' || v_pasteur_003_id || ')' ELSE '❌ Non trouvé' END;
    RAISE NOTICE 'PASTEUR-004 (PS JESSY): %', 
        CASE WHEN v_pasteur_004_id IS NOT NULL THEN '✅ Créé (' || v_pasteur_004_id || ')' ELSE '❌ Non trouvé' END;
    RAISE NOTICE '========================================';
END $$;

-- Afficher les profils mis à jour
SELECT 
    identifiant_unique,
    first_name || ' ' || last_name AS nom_complet,
    email,
    role,
    created_at,
    updated_at
FROM profils
WHERE role = 'pasteur' AND identifiant_unique LIKE 'PASTEUR-%'
ORDER BY identifiant_unique;
