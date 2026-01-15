-- ============================================
-- Migration COMPLÈTE: Configuration des pasteurs
-- Objectif: 
-- 1. Ajouter identifiant_unique à profils
-- 2. Mettre à jour les 4 profils de pasteurs
-- 3. Ajouter pasteur_id à profils et familles_disciples
-- 4. Lier les superviseurs à leurs pasteurs
-- ============================================

-- ============================================
-- ÉTAPE 1: Ajouter identifiant_unique à profils
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profils' AND column_name = 'identifiant_unique'
    ) THEN
        ALTER TABLE profils 
        ADD COLUMN identifiant_unique TEXT UNIQUE;
        
        CREATE INDEX IF NOT EXISTS idx_profils_identifiant_unique ON profils(identifiant_unique);
        
        RAISE NOTICE '✅ Colonne identifiant_unique ajoutée à la table profils';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne identifiant_unique existe déjà';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 2: Mettre à jour les profils des 4 pasteurs
-- ============================================

-- DR MODE (PASTEUR-001)
UPDATE profils 
SET 
  identifiant_unique = 'PASTEUR-001',
  role = 'pasteur',
  first_name = 'DR',
  last_name = 'MODE',
  updated_at = NOW()
WHERE email = 'dr.mode@disciplelife.com';

-- PS JULIANA (PASTEUR-002)
UPDATE profils 
SET 
  identifiant_unique = 'PASTEUR-002',
  role = 'pasteur',
  first_name = 'PS',
  last_name = 'JULIANA',
  updated_at = NOW()
WHERE email = 'ps.juliana@disciplelife.com';

-- PS PEGGY NN (PASTEUR-003)
UPDATE profils 
SET 
  identifiant_unique = 'PASTEUR-003',
  role = 'pasteur',
  first_name = 'PS',
  last_name = 'PEGGY NN',
  updated_at = NOW()
WHERE email = 'ps.peggy.nn@disciplelife.com';

-- PS JESSY (PASTEUR-004)
UPDATE profils 
SET 
  identifiant_unique = 'PASTEUR-004',
  role = 'pasteur',
  first_name = 'PS',
  last_name = 'JESSY',
  updated_at = NOW()
WHERE email = 'ps.jessy@disciplelife.com';

-- ============================================
-- ÉTAPE 3: Ajouter pasteur_id à profils (pour les superviseurs)
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profils' AND column_name = 'pasteur_id'
    ) THEN
        ALTER TABLE profils 
        ADD COLUMN pasteur_id UUID REFERENCES profils(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_profils_pasteur_id ON profils(pasteur_id);
        
        RAISE NOTICE '✅ Colonne pasteur_id ajoutée à la table profils';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne pasteur_id existe déjà';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 4: Ajouter pasteur_id à familles_disciples
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'familles_disciples' AND column_name = 'pasteur_id'
    ) THEN
        ALTER TABLE familles_disciples 
        ADD COLUMN pasteur_id UUID REFERENCES profils(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_familles_disciples_pasteur_id ON familles_disciples(pasteur_id);
        
        RAISE NOTICE '✅ Colonne pasteur_id ajoutée à la table familles_disciples';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne pasteur_id existe déjà dans familles_disciples';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 5: Lier les superviseurs à leurs pasteurs de tutelle
-- ============================================

-- DR MODE (PASTEUR-001) - 12 superviseurs
UPDATE profils
SET pasteur_id = (
    SELECT id FROM profils 
    WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur'
    LIMIT 1
)
WHERE role = 'superviseur' 
AND (
    LOWER(TRIM(CONCAT(first_name, ' ', last_name))) IN (
        'betsaleel badila',
        'coco okandzi',
        'elisabeth amecy',
        'ephrem mba',
        'hélène lamago',
        'karine william',
        'kevin thea',
        'laetitia obame',
        'manicia thea',
        'nasdene kodia',
        'rochelle passi ben',
        'yvan dessande'
    )
    OR email IN (
        'betsaleel.badila@example.com',
        'coco.okandzi@example.com',
        'elisabeth.amecy@example.com',
        'ephrem.mba@example.com',
        'helene.lamago@example.com',
        'karine.william@example.com',
        'kevin.thea@example.com',
        'laetitia.obame@example.com',
        'manicia.thea@example.com',
        'nasdene.kodia@example.com',
        'rochelle.passi.ben@example.com',
        'yvan.dessande@example.com'
    )
);

-- PS JULIANA (PASTEUR-002) - 5 superviseurs
UPDATE profils
SET pasteur_id = (
    SELECT id FROM profils 
    WHERE identifiant_unique = 'PASTEUR-002' AND role = 'pasteur'
    LIMIT 1
)
WHERE role = 'superviseur' 
AND (
    LOWER(TRIM(CONCAT(first_name, ' ', last_name))) IN (
        'beraca kazongo',
        'cynthia alloh',
        'jocelyne fortune',
        'patrick batsiaka',
        'snella moussio'
    )
    OR email IN (
        'beraca.kazongo@example.com',
        'cynthia.alloh@example.com',
        'jocelyne.fortune@example.com',
        'patrick.batsiaka@example.com',
        'snella.moussio@example.com'
    )
);

-- PS PEGGY NN (PASTEUR-003) - 4 superviseurs
UPDATE profils
SET pasteur_id = (
    SELECT id FROM profils 
    WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur'
    LIMIT 1
)
WHERE role = 'superviseur' 
AND (
    LOWER(TRIM(CONCAT(first_name, ' ', last_name))) IN (
        'alain sil',
        'carine matondo',
        'gervais nkatouloulou',
        'laetitia missatou'
    )
    OR email IN (
        'alain.sil@example.com',
        'carine.matondo@example.com',
        'gervais.nkatouloulou@example.com',
        'laetitia.missatou@example.com'
    )
);

-- PS JESSY (PASTEUR-004) - 5 superviseurs
UPDATE profils
SET pasteur_id = (
    SELECT id FROM profils 
    WHERE identifiant_unique = 'PASTEUR-004' AND role = 'pasteur'
    LIMIT 1
)
WHERE role = 'superviseur' 
AND (
    LOWER(TRIM(CONCAT(first_name, ' ', last_name))) IN (
        'andréa ernest',
        'david serva',
        'nancy nzi',
        'prosper leba',
        'serge amany'
    )
    OR email IN (
        'andrea.ernest@example.com',
        'david.serva@example.com',
        'nancy.nzi@example.com',
        'prosper.leba@example.com',
        'serge.amany@example.com'
    )
);

-- ============================================
-- ÉTAPE 6: Lier les familles aux pasteurs via leurs superviseurs
-- ============================================
-- Méthode 1: Lier via superviseur_id
UPDATE familles_disciples fd
SET pasteur_id = (
    SELECT p.pasteur_id 
    FROM profils p 
    WHERE p.id = fd.superviseur_id 
    AND p.pasteur_id IS NOT NULL
    LIMIT 1
),
updated_at = NOW()
WHERE fd.superviseur_id IS NOT NULL
AND (fd.pasteur_id IS NULL OR fd.pasteur_id != (
    SELECT p.pasteur_id 
    FROM profils p 
    WHERE p.id = fd.superviseur_id 
    AND p.pasteur_id IS NOT NULL
    LIMIT 1
));

-- Méthode 2: S'assurer que toutes les familles des superviseurs de PASTEUR-003 sont bien liées
-- (Correction spécifique pour le cas où une famille n'a pas été liée)
UPDATE familles_disciples fd
SET pasteur_id = (
    SELECT id FROM profils 
    WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur'
    LIMIT 1
),
updated_at = NOW()
WHERE fd.superviseur_id IN (
    SELECT p.id
    FROM profils p
    WHERE p.pasteur_id = (
        SELECT id FROM profils 
        WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur'
        LIMIT 1
    )
    AND p.role = 'superviseur'
)
AND (fd.pasteur_id IS NULL OR fd.pasteur_id != (
    SELECT id FROM profils 
    WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur'
    LIMIT 1
));

-- ============================================
-- ÉTAPE 7: Vérification et rapport final
-- ============================================
DO $$
DECLARE
    v_pasteur_count INTEGER;
    v_superviseur_lies_count INTEGER;
    v_famille_liees_count INTEGER;
    v_pasteur_001_id UUID;
    v_pasteur_002_id UUID;
    v_pasteur_003_id UUID;
    v_pasteur_004_id UUID;
BEGIN
    -- Compter les pasteurs
    SELECT COUNT(*) INTO v_pasteur_count
    FROM profils
    WHERE role = 'pasteur' AND identifiant_unique LIKE 'PASTEUR-%';
    
    -- Compter les superviseurs liés
    SELECT COUNT(*) INTO v_superviseur_lies_count
    FROM profils
    WHERE role = 'superviseur' AND pasteur_id IS NOT NULL;
    
    -- Compter les familles liées
    SELECT COUNT(*) INTO v_famille_liees_count
    FROM familles_disciples
    WHERE pasteur_id IS NOT NULL;
    
    -- Vérifier chaque pasteur
    SELECT id INTO v_pasteur_001_id FROM profils WHERE identifiant_unique = 'PASTEUR-001';
    SELECT id INTO v_pasteur_002_id FROM profils WHERE identifiant_unique = 'PASTEUR-002';
    SELECT id INTO v_pasteur_003_id FROM profils WHERE identifiant_unique = 'PASTEUR-003';
    SELECT id INTO v_pasteur_004_id FROM profils WHERE identifiant_unique = 'PASTEUR-004';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RAPPORT FINAL DE CONFIGURATION PASTEURS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 STATISTIQUES:';
    RAISE NOTICE '  • Pasteurs créés: %', v_pasteur_count;
    RAISE NOTICE '  • Superviseurs liés: %', v_superviseur_lies_count;
    RAISE NOTICE '  • Familles liées: %', v_famille_liees_count;
    RAISE NOTICE '';
    RAISE NOTICE '👥 PASTEURS:';
    RAISE NOTICE '  • PASTEUR-001 (DR MODE): %', 
        CASE WHEN v_pasteur_001_id IS NOT NULL THEN '✅ OK' ELSE '❌ Manquant' END;
    RAISE NOTICE '  • PASTEUR-002 (PS JULIANA): %', 
        CASE WHEN v_pasteur_002_id IS NOT NULL THEN '✅ OK' ELSE '❌ Manquant' END;
    RAISE NOTICE '  • PASTEUR-003 (PS PEGGY NN): %', 
        CASE WHEN v_pasteur_003_id IS NOT NULL THEN '✅ OK' ELSE '❌ Manquant' END;
    RAISE NOTICE '  • PASTEUR-004 (PS JESSY): %', 
        CASE WHEN v_pasteur_004_id IS NOT NULL THEN '✅ OK' ELSE '❌ Manquant' END;
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

-- Afficher le résumé des pasteurs
SELECT 
    identifiant_unique AS "Identifiant",
    first_name || ' ' || last_name AS "Nom complet",
    email AS "Email",
    role AS "Rôle",
    (SELECT COUNT(*) FROM profils WHERE pasteur_id = p.id) AS "Nb superviseurs",
    (SELECT COUNT(*) FROM familles_disciples WHERE pasteur_id = p.id) AS "Nb familles"
FROM profils p
WHERE role = 'pasteur' AND identifiant_unique LIKE 'PASTEUR-%'
ORDER BY identifiant_unique;
