-- ============================================
-- Migration: Création des pasteurs et liaisons avec superviseurs
-- Objectif: Créer les 4 pasteurs de tutelle et lier les superviseurs
-- ============================================

-- Étape 1: S'assurer que la colonne identifiant_unique existe dans profils
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profils' AND column_name = 'identifiant_unique'
    ) THEN
        ALTER TABLE profils ADD COLUMN identifiant_unique TEXT UNIQUE;
    END IF;
END $$;

-- Étape 2: S'assurer que la colonne pasteur_id existe dans profils (pour les superviseurs)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profils' AND column_name = 'pasteur_id'
    ) THEN
        ALTER TABLE profils ADD COLUMN pasteur_id UUID REFERENCES profils(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_profils_pasteur_id ON profils(pasteur_id);
    END IF;
END $$;

-- Étape 3: S'assurer que la colonne pasteur_id existe dans familles_disciples
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'familles_disciples' AND column_name = 'pasteur_id'
    ) THEN
        ALTER TABLE familles_disciples ADD COLUMN pasteur_id UUID REFERENCES profils(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_familles_disciples_pasteur_id ON familles_disciples(pasteur_id);
    END IF;
END $$;

-- Étape 4: Créer les profils des pasteurs (si les comptes Auth existent déjà)
-- Note: Les comptes Auth doivent être créés via le script create_pasteurs.js
-- Cette migration crée seulement les profils si les IDs Auth existent

-- Fonction pour créer un profil pasteur (à appeler après création Auth)
CREATE OR REPLACE FUNCTION create_pasteur_profil(
    p_user_id UUID,
    p_first_name TEXT,
    p_last_name TEXT,
    p_email TEXT,
    p_identifiant_unique TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO profils (
        id,
        first_name,
        last_name,
        email,
        role,
        identifiant_unique,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_first_name,
        p_last_name,
        p_email,
        'pasteur',
        p_identifiant_unique,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        role = 'pasteur',
        identifiant_unique = EXCLUDED.identifiant_unique,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Étape 5: Lier les superviseurs à leurs pasteurs de tutelle
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

-- Étape 6: Lier les familles aux pasteurs via leurs superviseurs
UPDATE familles_disciples fd
SET pasteur_id = (
    SELECT p.pasteur_id 
    FROM profils p 
    WHERE p.id = fd.superviseur_id 
    AND p.pasteur_id IS NOT NULL
    LIMIT 1
)
WHERE fd.superviseur_id IS NOT NULL;

-- Étape 7: Vérification et rapport
DO $$
DECLARE
    v_pasteur_count INTEGER;
    v_superviseur_count INTEGER;
    v_famille_count INTEGER;
BEGIN
    -- Compter les pasteurs
    SELECT COUNT(*) INTO v_pasteur_count
    FROM profils
    WHERE role = 'pasteur' AND identifiant_unique LIKE 'PASTEUR-%';
    
    -- Compter les superviseurs liés
    SELECT COUNT(*) INTO v_superviseur_count
    FROM profils
    WHERE role = 'superviseur' AND pasteur_id IS NOT NULL;
    
    -- Compter les familles liées
    SELECT COUNT(*) INTO v_famille_count
    FROM familles_disciples
    WHERE pasteur_id IS NOT NULL;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RAPPORT DE LIAISON PASTEURS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Pasteurs créés: %', v_pasteur_count;
    RAISE NOTICE 'Superviseurs liés: %', v_superviseur_count;
    RAISE NOTICE 'Familles liées: %', v_famille_count;
    RAISE NOTICE '========================================';
END $$;

-- Commentaires pour documentation
COMMENT ON COLUMN profils.pasteur_id IS 'Référence vers le pasteur de tutelle (pour les superviseurs)';
COMMENT ON COLUMN profils.identifiant_unique IS 'Identifiant unique du profil (ex: PASTEUR-001, FAM001-001)';
COMMENT ON COLUMN familles_disciples.pasteur_id IS 'Référence vers le pasteur de tutelle de la famille (via le superviseur)';
