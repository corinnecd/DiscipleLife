-- ============================================
-- Migration: Identifier et créer les familles manquantes
-- Objectif: 
--   1. Identifier les superviseurs sans famille
--   2. Créer les familles manquantes
--   3. S'assurer que DR MODE a 12 familles
--   4. S'assurer qu'il y a 26 familles au total
-- Date: 2025-01-XX
-- ============================================

-- ⚠️ IMPORTANT: Créer un backup avant d'exécuter ce script

-- ============================================
-- ÉTAPE 1: DIAGNOSTIC INITIAL
-- ============================================

DO $$
DECLARE
    v_pasteur_001_id uuid;
    v_pasteur_002_id uuid;
    v_pasteur_003_id uuid;
    v_pasteur_004_id uuid;
    v_total_familles integer;
    v_familles_pasteur_001 integer;
    v_familles_pasteur_002 integer;
    v_familles_pasteur_003 integer;
    v_familles_pasteur_004 integer;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DIAGNOSTIC INITIAL';
    RAISE NOTICE '========================================';

    -- Trouver les pasteurs
    SELECT id INTO v_pasteur_001_id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1;
    SELECT id INTO v_pasteur_002_id FROM profils WHERE identifiant_unique = 'PASTEUR-002' AND role = 'pasteur' LIMIT 1;
    SELECT id INTO v_pasteur_003_id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1;
    SELECT id INTO v_pasteur_004_id FROM profils WHERE identifiant_unique = 'PASTEUR-004' AND role = 'pasteur' LIMIT 1;

    -- Compter les familles
    SELECT COUNT(*) INTO v_total_familles FROM familles_disciples;
    SELECT COUNT(*) INTO v_familles_pasteur_001 FROM familles_disciples WHERE pasteur_id = v_pasteur_001_id;
    SELECT COUNT(*) INTO v_familles_pasteur_002 FROM familles_disciples WHERE pasteur_id = v_pasteur_002_id;
    SELECT COUNT(*) INTO v_familles_pasteur_003 FROM familles_disciples WHERE pasteur_id = v_pasteur_003_id;
    SELECT COUNT(*) INTO v_familles_pasteur_004 FROM familles_disciples WHERE pasteur_id = v_pasteur_004_id;

    RAISE NOTICE 'Total familles actuelles: % (attendu: 26)', v_total_familles;
    RAISE NOTICE 'DR MODE (PASTEUR-001): % familles (attendu: 12)', v_familles_pasteur_001;
    RAISE NOTICE 'PS JULIANA (PASTEUR-002): % familles (attendu: 5)', v_familles_pasteur_002;
    RAISE NOTICE 'PS PEGGY NN (PASTEUR-003): % familles (attendu: 4)', v_familles_pasteur_003;
    RAISE NOTICE 'PS JESSY (PASTEUR-004): % familles (attendu: 5)', v_familles_pasteur_004;
END $$;

-- ============================================
-- ÉTAPE 2: IDENTIFIER LES SUPERVISEURS SANS FAMILLE
-- ============================================

SELECT 
    '=== SUPERVISEURS SANS FAMILLE ===' AS info;

SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.identifiant_unique,
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    CASE 
        WHEN pasteur.identifiant_unique = 'PASTEUR-001' THEN 'DR MODE'
        WHEN pasteur.identifiant_unique = 'PASTEUR-002' THEN 'PS JULIANA'
        WHEN pasteur.identifiant_unique = 'PASTEUR-003' THEN 'PS PEGGY NN'
        WHEN pasteur.identifiant_unique = 'PASTEUR-004' THEN 'PS JESSY'
        ELSE 'NON ASSIGNÉ'
    END AS pasteur_nom_complet
FROM profils p
LEFT JOIN profils pasteur ON p.pasteur_id = pasteur.id
WHERE p.role = 'superviseur'
  AND NOT EXISTS (
    SELECT 1 
    FROM familles_disciples f 
    WHERE f.superviseur_id = p.id
  )
ORDER BY pasteur.identifiant_unique, p.first_name, p.last_name;

-- ============================================
-- ÉTAPE 3: CRÉER LES FAMILLES MANQUANTES
-- ============================================

DO $$
DECLARE
    v_superviseur_record RECORD;
    v_famille_id uuid;
    v_pasteur_id uuid;
    v_identifiant_famille text;
    v_nom_famille text;
    v_famille_num integer;
    v_created_count integer := 0;
    v_pasteur_001_id uuid;
    v_pasteur_002_id uuid;
    v_pasteur_003_id uuid;
    v_pasteur_004_id uuid;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CRÉATION DES FAMILLES MANQUANTES';
    RAISE NOTICE '========================================';

    -- Trouver les pasteurs
    SELECT id INTO v_pasteur_001_id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1;
    SELECT id INTO v_pasteur_002_id FROM profils WHERE identifiant_unique = 'PASTEUR-002' AND role = 'pasteur' LIMIT 1;
    SELECT id INTO v_pasteur_003_id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1;
    SELECT id INTO v_pasteur_004_id FROM profils WHERE identifiant_unique = 'PASTEUR-004' AND role = 'pasteur' LIMIT 1;

    -- Pour chaque superviseur sans famille, créer une famille
    FOR v_superviseur_record IN
        SELECT 
            p.id,
            p.first_name,
            p.last_name,
            p.email,
            p.pasteur_id,
            pasteur.identifiant_unique AS pasteur_identifiant
        FROM profils p
        LEFT JOIN profils pasteur ON p.pasteur_id = pasteur.id
        WHERE p.role = 'superviseur'
          AND NOT EXISTS (
            SELECT 1 
            FROM familles_disciples f 
            WHERE f.superviseur_id = p.id
          )
        ORDER BY pasteur.identifiant_unique, p.first_name, p.last_name
    LOOP
        -- Déterminer le numéro de famille et le nom selon le superviseur
        -- Utiliser la liste de référence de la migration 035
        SELECT 
            CASE 
                -- DR MODE (PASTEUR-001) - 12 superviseurs
                WHEN v_superviseur_record.pasteur_identifiant = 'PASTEUR-001' THEN
                    CASE 
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%betsaleel%' AND LOWER(v_superviseur_record.last_name) LIKE '%badila%' THEN ('FAM004', 'Les ÉCLAIRÉS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%coco%' AND LOWER(v_superviseur_record.last_name) LIKE '%okanzi%' THEN ('FAM006', 'ZÉLES')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%elisabeth%' AND LOWER(v_superviseur_record.last_name) LIKE '%amecy%' THEN ('FAM009', 'LES COMBATTANTS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%ephrem%' AND LOWER(v_superviseur_record.last_name) LIKE '%mba%' THEN ('FAM010', 'LES AGAPÉS')
                        WHEN (LOWER(v_superviseur_record.first_name) LIKE '%helene%' OR LOWER(v_superviseur_record.first_name) LIKE '%hélène%') AND LOWER(v_superviseur_record.last_name) LIKE '%lamago%' THEN ('FAM012', 'LES GLORIEUX')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%karine%' AND LOWER(v_superviseur_record.last_name) LIKE '%william%' THEN ('FAM015', 'LES ÉQUIPÉS')
                        WHEN (LOWER(v_superviseur_record.first_name) LIKE '%kevin%' OR LOWER(v_superviseur_record.first_name) LIKE '%kévin%') AND (LOWER(v_superviseur_record.last_name) LIKE '%thea%' OR LOWER(v_superviseur_record.last_name) LIKE '%théa%') THEN ('FAM016', 'LES INGÉNIEUX')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%laetitia%' AND LOWER(v_superviseur_record.last_name) LIKE '%obame%' THEN ('FAM017', 'LES RACHETÉS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%manicia%' AND (LOWER(v_superviseur_record.last_name) LIKE '%thea%' OR LOWER(v_superviseur_record.last_name) LIKE '%théa%') THEN ('FAM018', 'LES RADIEUSES')
                        WHEN (LOWER(v_superviseur_record.first_name) LIKE '%nasdene%' OR LOWER(v_superviseur_record.first_name) LIKE '%nasdène%') AND LOWER(v_superviseur_record.last_name) LIKE '%kodia%' THEN ('FAM020', 'LES INEBRANLABLES')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%rochelle%' AND LOWER(v_superviseur_record.last_name) LIKE '%passi%' THEN ('FAM023', 'LES PASSIONNÉS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%yvan%' AND LOWER(v_superviseur_record.last_name) LIKE '%dessande%' THEN ('FAM026', 'LES DISCIPLES')
                        ELSE (NULL, NULL)
                    END
                -- PS JULIANA (PASTEUR-002) - 5 superviseurs
                WHEN v_superviseur_record.pasteur_identifiant = 'PASTEUR-002' THEN
                    CASE 
                        WHEN (LOWER(v_superviseur_record.first_name) LIKE '%beraca%' OR LOWER(v_superviseur_record.first_name) LIKE '%béraca%') AND LOWER(v_superviseur_record.last_name) LIKE '%kazongo%' THEN ('FAM003', 'Les ENRACINÉS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%cynthia%' AND LOWER(v_superviseur_record.last_name) LIKE '%alloh%' THEN ('FAM007', 'INNARRÊTABLES')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%jocelyne%' AND LOWER(v_superviseur_record.last_name) LIKE '%fortune%' THEN ('FAM014', 'LES PERSÉVERANTS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%patrick%' AND (LOWER(v_superviseur_record.last_name) LIKE '%batsiaga%' OR LOWER(v_superviseur_record.last_name) LIKE '%batsiaka%') THEN ('FAM021', 'LES CHOISIS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%snella%' AND LOWER(v_superviseur_record.last_name) LIKE '%moussio%' THEN ('FAM025', 'LES EMBRASÉS')
                        ELSE (NULL, NULL)
                    END
                -- PS PEGGY NN (PASTEUR-003) - 4 superviseurs
                WHEN v_superviseur_record.pasteur_identifiant = 'PASTEUR-003' THEN
                    CASE 
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%alain%' AND LOWER(v_superviseur_record.last_name) LIKE '%sil%' THEN ('FAM001', 'LES DÉTERMINÉS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%carine%' AND LOWER(v_superviseur_record.last_name) LIKE '%matondo%' THEN ('FAM005', 'Les AMOUREUX')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%gervais%' AND LOWER(v_superviseur_record.last_name) LIKE '%nkatouloulou%' THEN ('FAM011', 'LES FIDÈLES')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%laetitia%' AND LOWER(v_superviseur_record.last_name) LIKE '%missatou%' THEN ('FAM017', 'LES VICTORIEUX')
                        ELSE (NULL, NULL)
                    END
                -- PS JESSY (PASTEUR-004) - 5 superviseurs
                WHEN v_superviseur_record.pasteur_identifiant = 'PASTEUR-004' THEN
                    CASE 
                        WHEN (LOWER(v_superviseur_record.first_name) LIKE '%andrea%' OR LOWER(v_superviseur_record.first_name) LIKE '%andréa%') AND LOWER(v_superviseur_record.last_name) LIKE '%ernest%' THEN ('FAM002', 'Les VAILLANTS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%david%' AND LOWER(v_superviseur_record.last_name) LIKE '%serva%' THEN ('FAM008', 'LES TÉMOINS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%nancy%' AND LOWER(v_superviseur_record.last_name) LIKE '%nzi%' THEN ('FAM019', 'LES INTIMES')
                        WHEN (LOWER(v_superviseur_record.first_name) LIKE '%prospere%' OR LOWER(v_superviseur_record.first_name) LIKE '%prosper%') AND LOWER(v_superviseur_record.last_name) LIKE '%leba%' THEN ('FAM022', 'LES BOULEVERSEURS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%serge%' AND LOWER(v_superviseur_record.last_name) LIKE '%amany%' THEN ('FAM024', 'LES CONSACRÉS')
                        ELSE (NULL, NULL)
                    END
                ELSE (NULL, NULL)
            END
        INTO v_identifiant_famille, v_nom_famille;

        -- Si une famille a été identifiée pour ce superviseur
        IF v_identifiant_famille IS NOT NULL AND v_nom_famille IS NOT NULL THEN
            -- Vérifier si la famille existe déjà (par identifiant)
            SELECT id INTO v_famille_id
            FROM familles_disciples
            WHERE identifiant_famille = v_identifiant_famille
            LIMIT 1;

            -- Si la famille existe déjà mais n'est pas liée au superviseur
            IF v_famille_id IS NOT NULL THEN
                UPDATE familles_disciples
                SET superviseur_id = v_superviseur_record.id,
                    pasteur_id = v_superviseur_record.pasteur_id,
                    nom = v_nom_famille,
                    updated_at = NOW()
                WHERE id = v_famille_id;
                RAISE NOTICE '✅ Famille existante % (%) liée au superviseur % %', 
                    v_nom_famille, v_identifiant_famille, 
                    v_superviseur_record.first_name, v_superviseur_record.last_name;
            ELSE
                -- Créer une nouvelle famille
                INSERT INTO familles_disciples (
                    nom,
                    identifiant_famille,
                    superviseur_id,
                    pasteur_id,
                    statut,
                    objectif_disciples,
                    created_at,
                    updated_at
                ) VALUES (
                    v_nom_famille,
                    v_identifiant_famille,
                    v_superviseur_record.id,
                    v_superviseur_record.pasteur_id,
                    'actif',
                    70,
                    NOW(),
                    NOW()
                ) RETURNING id INTO v_famille_id;
                v_created_count := v_created_count + 1;
                RAISE NOTICE '✅ Nouvelle famille créée: % (%) pour superviseur % %', 
                    v_nom_famille, v_identifiant_famille, 
                    v_superviseur_record.first_name, v_superviseur_record.last_name;
            END IF;

            -- Mettre à jour le famille_id dans profils
            UPDATE profils
            SET famille_id = v_famille_id,
                updated_at = NOW()
            WHERE id = v_superviseur_record.id
              AND (famille_id IS NULL OR famille_id != v_famille_id);
        ELSE
            RAISE NOTICE '⚠️  Impossible de déterminer la famille pour superviseur % % (pasteur: %)', 
                v_superviseur_record.first_name, v_superviseur_record.last_name,
                v_superviseur_record.pasteur_identifiant;
        END IF;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ % famille(s) créée(s) ou mise(s) à jour', v_created_count;
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- ÉTAPE 4: VÉRIFICATION FINALE
-- ============================================

SELECT 
    '=== VÉRIFICATION FINALE ===' AS info;

SELECT 
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    COUNT(DISTINCT s.id) AS nb_superviseurs,
    COUNT(DISTINCT f.id) AS nb_familles,
    CASE pasteur.identifiant_unique
        WHEN 'PASTEUR-001' THEN 12
        WHEN 'PASTEUR-002' THEN 5
        WHEN 'PASTEUR-003' THEN 4
        WHEN 'PASTEUR-004' THEN 5
        ELSE 0
    END AS nb_familles_attendu,
    CASE 
        WHEN COUNT(DISTINCT f.id) = CASE pasteur.identifiant_unique
            WHEN 'PASTEUR-001' THEN 12
            WHEN 'PASTEUR-002' THEN 5
            WHEN 'PASTEUR-003' THEN 4
            WHEN 'PASTEUR-004' THEN 5
            ELSE 0
        END THEN '✅ CORRECT'
        ELSE '⚠️  MANQUANT'
    END AS statut
FROM profils pasteur
LEFT JOIN profils s ON s.pasteur_id = pasteur.id AND s.role = 'superviseur'
LEFT JOIN familles_disciples f ON f.pasteur_id = pasteur.id
WHERE pasteur.role = 'pasteur' AND pasteur.identifiant_unique LIKE 'PASTEUR-%'
GROUP BY pasteur.id, pasteur.identifiant_unique, pasteur.first_name, pasteur.last_name
ORDER BY pasteur.identifiant_unique;

-- Résumé global
SELECT 
    '=== RÉSUMÉ GLOBAL ===' AS info;

SELECT 
    (SELECT COUNT(*) FROM familles_disciples) AS total_familles,
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur') AS total_superviseurs,
    (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id IS NOT NULL) AS familles_avec_superviseur,
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND famille_id IS NOT NULL) AS superviseurs_avec_famille,
    CASE 
        WHEN (SELECT COUNT(*) FROM familles_disciples) = 26 
            AND (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id IS NOT NULL) = 26
            AND (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND famille_id IS NOT NULL) = 26
        THEN '✅ TOUT EST CORRECT (26 familles)'
        ELSE '⚠️  PROBLÈME DÉTECTÉ'
    END AS statut_final;
