-- ============================================
-- Correction: Lier FAM017 (LES VICTORIEUX) à LAETITIA MISSATOU et PASTEUR-003
-- Objectif: S'assurer que FAM017 est correctement liée au bon superviseur
-- ============================================

-- Étape 1: Vérifier et corriger les associations
DO $$
DECLARE
    v_famille_017_id UUID;
    v_laetitia_missatou_id UUID;
    v_laetitia_obame_id UUID;
    v_pasteur_003_id UUID;
    v_famille_017_nom TEXT;
    v_famille_017_superviseur_id UUID;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CORRECTION FAM017 - LES VICTORIEUX';
    RAISE NOTICE '========================================';
    
    -- Vérifier si FAM017 existe
    SELECT id, nom, superviseur_id INTO v_famille_017_id, v_famille_017_nom, v_famille_017_superviseur_id
    FROM familles_disciples 
    WHERE identifiant_famille = 'FAM017' 
    LIMIT 1;
    
    IF v_famille_017_id IS NULL THEN
        RAISE NOTICE '⚠️  FAM017 n''existe pas. Création...';
        INSERT INTO familles_disciples (nom, identifiant_famille, objectif_disciples, statut, created_at, updated_at)
        VALUES ('LES VICTORIEUX', 'FAM017', 70, 'actif', NOW(), NOW())
        RETURNING id, nom INTO v_famille_017_id, v_famille_017_nom;
        RAISE NOTICE '✅ FAM017 créée';
    ELSE
        RAISE NOTICE '✅ FAM017 existe: % (ID: %)', v_famille_017_nom, v_famille_017_id;
    END IF;
    
    -- Trouver LAETITIA MISSATOU (chercher avec variations du nom)
    SELECT id INTO v_laetitia_missatou_id
    FROM profils
    WHERE role = 'superviseur'
    AND (
        (LOWER(first_name) IN ('laetitia', 'laëtitia') AND LOWER(last_name) = 'missatou')
        OR LOWER(TRIM(CONCAT(first_name, ' ', last_name))) = 'laetitia missatou'
        OR LOWER(TRIM(CONCAT(first_name, ' ', last_name))) = 'laëtitia missatou'
        OR email = 'laetitia.missatou@example.com'
    )
    LIMIT 1;
    
    IF v_laetitia_missatou_id IS NULL THEN
        RAISE EXCEPTION '❌ LAETITIA MISSATOU non trouvée dans profils. Créez d''abord ce superviseur.';
    END IF;
    
    RAISE NOTICE '✅ LAETITIA MISSATOU trouvée (ID: %)', v_laetitia_missatou_id;
    
    -- Trouver LAETITIA OBAME (pour s'assurer qu'elle n'est pas liée à FAM017 par erreur)
    SELECT id INTO v_laetitia_obame_id
    FROM profils
    WHERE role = 'superviseur'
    AND (
        (LOWER(first_name) IN ('laetitia', 'laëtitia') AND LOWER(last_name) = 'obame')
        OR email = 'laetitia.obame@example.com'
    )
    LIMIT 1;
    
    -- Trouver PASTEUR-003
    SELECT id INTO v_pasteur_003_id
    FROM profils
    WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur'
    LIMIT 1;
    
    IF v_pasteur_003_id IS NULL THEN
        RAISE EXCEPTION '❌ PASTEUR-003 (PS PEGGY NN) non trouvé. Exécutez d''abord la migration 049_complete_pasteurs_setup.sql';
    END IF;
    
    RAISE NOTICE '✅ PASTEUR-003 trouvé (ID: %)', v_pasteur_003_id;
    
    -- Étape 2: Vérifier si FAM017 est liée au mauvais superviseur
    IF v_famille_017_superviseur_id IS NOT NULL AND v_famille_017_superviseur_id = v_laetitia_obame_id THEN
        RAISE NOTICE '⚠️  FAM017 est liée à LAETITIA OBAME (erreur). Correction...';
        UPDATE familles_disciples
        SET superviseur_id = v_laetitia_missatou_id,
            updated_at = NOW()
        WHERE id = v_famille_017_id;
        RAISE NOTICE '✅ FAM017 maintenant liée à LAETITIA MISSATOU';
    ELSIF v_famille_017_superviseur_id IS NULL OR v_famille_017_superviseur_id != v_laetitia_missatou_id THEN
        RAISE NOTICE '⚠️  FAM017 n''est pas liée à LAETITIA MISSATOU. Correction...';
        UPDATE familles_disciples
        SET superviseur_id = v_laetitia_missatou_id,
            updated_at = NOW()
        WHERE id = v_famille_017_id;
        RAISE NOTICE '✅ FAM017 liée à LAETITIA MISSATOU';
    ELSE
        RAISE NOTICE '✅ FAM017 est déjà correctement liée à LAETITIA MISSATOU';
    END IF;
    
    -- Étape 3: Lier LAETITIA MISSATOU à PASTEUR-003
    UPDATE profils
    SET pasteur_id = v_pasteur_003_id,
        updated_at = NOW()
    WHERE id = v_laetitia_missatou_id
    AND (pasteur_id IS NULL OR pasteur_id != v_pasteur_003_id);
    
    RAISE NOTICE '✅ LAETITIA MISSATOU liée à PASTEUR-003';
    
    -- Étape 4: Lier FAM017 à PASTEUR-003
    UPDATE familles_disciples
    SET pasteur_id = v_pasteur_003_id,
        updated_at = NOW()
    WHERE id = v_famille_017_id
    AND (pasteur_id IS NULL OR pasteur_id != v_pasteur_003_id);
    
    RAISE NOTICE '✅ FAM017 liée à PASTEUR-003';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CORRECTION TERMINÉE AVEC SUCCÈS';
    RAISE NOTICE '========================================';
END $$;

-- Étape 5: Vérification finale de FAM017
SELECT 
    '=== VÉRIFICATION FINALE FAM017 ===' AS info;

SELECT 
    f.identifiant_famille,
    f.nom AS nom_famille,
    s.first_name || ' ' || s.last_name AS superviseur,
    s.email AS email_superviseur,
    (SELECT identifiant_unique FROM profils WHERE id = f.pasteur_id) AS pasteur_identifiant,
    CASE 
        WHEN f.superviseur_id IS NOT NULL 
            AND (LOWER(s.first_name) IN ('laetitia', 'laëtitia') AND LOWER(s.last_name) = 'missatou')
            THEN '✅ Superviseur correct (LAETITIA MISSATOU)'
        WHEN f.superviseur_id IS NULL 
            THEN '❌ Pas de superviseur'
        ELSE '⚠️  Superviseur incorrect: ' || s.first_name || ' ' || s.last_name
    END AS statut_superviseur,
    CASE 
        WHEN f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
            THEN '✅ Liée à PASTEUR-003'
        WHEN f.pasteur_id IS NULL
            THEN '❌ Non liée à un pasteur'
        ELSE '⚠️  Liée à un autre pasteur'
    END AS statut_pasteur
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE f.identifiant_famille = 'FAM017';

-- Étape 6: Afficher toutes les familles de PASTEUR-003 (doivent être 4)
SELECT 
    '=== TOUTES LES FAMILLES DE PASTEUR-003 (doivent être 4) ===' AS info;

SELECT 
    f.identifiant_famille,
    f.nom AS nom_famille,
    s.first_name || ' ' || s.last_name AS superviseur,
    CASE 
        WHEN f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
            THEN '✅ LIÉE'
        ELSE '❌ NON LIÉE'
    END AS statut_liaison
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE f.superviseur_id IN (
    SELECT p.id
    FROM profils p
    WHERE p.pasteur_id = (
        SELECT id FROM profils 
        WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur'
        LIMIT 1
    )
    AND p.role = 'superviseur'
)
ORDER BY f.identifiant_famille;

-- Étape 7: Compter les familles liées à PASTEUR-003 (doit être 4)
SELECT 
    '=== COMPTE FINAL ===' AS info;

SELECT 
    COUNT(*) AS nb_familles_liees,
    (SELECT COUNT(*) FROM profils WHERE pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1) AND role = 'superviseur') AS nb_superviseurs,
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ CORRECT (4 familles)'
        ELSE '⚠️  ATTENTION: ' || COUNT(*) || ' familles (attendu: 4)'
    END AS statut
FROM familles_disciples
WHERE pasteur_id = (
    SELECT id FROM profils 
    WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur'
    LIMIT 1
);
