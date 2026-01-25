-- Migration: Assigner famille_id au superviseur Laetitia Missatou
-- Description: 
--   - Trouve ou crée la famille "LES VICTORIEUX" (FAM016 ou FAM017)
--   - Assigne le famille_id à Laetitia Missatou
--   - S'assure que Laetitia Missatou est sous la tutelle de PASTEUR-003 (PS PEGGY NN)
-- Date: 2025-01-XX

-- ⚠️ IMPORTANT: Créer un backup avant d'exécuter ce script

-- 1. Trouver le superviseur Laetitia Missatou et assigner le famille_id
DO $$
DECLARE
    v_superviseur_id uuid;
    v_famille_id uuid;
    v_pasteur_id uuid;
    v_pasteur_003_id uuid;
    v_identifiant_famille text;
    v_nom_famille text;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ASSIGNATION FAMILLE_ID - LAETITIA MISSATOU';
    RAISE NOTICE '========================================';

    -- Trouver le superviseur (avec variations du nom)
    SELECT id, pasteur_id INTO v_superviseur_id, v_pasteur_id
    FROM profils
    WHERE role = 'superviseur'
      AND (
        (LOWER(first_name) IN ('laetitia', 'laëtitia') AND LOWER(last_name) = 'missatou')
        OR LOWER(TRIM(CONCAT(first_name, ' ', last_name))) = 'laetitia missatou'
        OR LOWER(TRIM(CONCAT(first_name, ' ', last_name))) = 'laëtitia missatou'
        OR email = 'laetitia.missatou@example.com'
      )
    LIMIT 1;

    IF v_superviseur_id IS NULL THEN
        RAISE EXCEPTION '❌ Superviseur Laetitia Missatou non trouvé';
    END IF;

    RAISE NOTICE '✅ Superviseur trouvé: Laetitia Missatou (ID: %)', v_superviseur_id;
    RAISE NOTICE '   Pasteur ID actuel: %', v_pasteur_id;

    -- Trouver PASTEUR-003 (PS PEGGY NN)
    SELECT id INTO v_pasteur_003_id
    FROM profils
    WHERE identifiant_unique = 'PASTEUR-003'
      AND role = 'pasteur'
    LIMIT 1;

    IF v_pasteur_003_id IS NULL THEN
        RAISE EXCEPTION '❌ PASTEUR-003 (PS PEGGY NN) non trouvé';
    END IF;

    RAISE NOTICE '✅ PASTEUR-003 trouvé (ID: %)', v_pasteur_003_id;

    -- S'assurer que Laetitia Missatou est sous la tutelle de PASTEUR-003
    IF v_pasteur_id IS NULL OR v_pasteur_id != v_pasteur_003_id THEN
        UPDATE profils
        SET pasteur_id = v_pasteur_003_id,
            updated_at = NOW()
        WHERE id = v_superviseur_id;
        RAISE NOTICE '✅ Laetitia Missatou assignée à PASTEUR-003 (PS PEGGY NN)';
    ELSE
        RAISE NOTICE 'ℹ️  Laetitia Missatou est déjà sous la tutelle de PASTEUR-003';
    END IF;

    -- Vérifier si une famille existe déjà pour ce superviseur dans familles_disciples
    SELECT id, nom, identifiant_famille INTO v_famille_id, v_nom_famille, v_identifiant_famille
    FROM familles_disciples
    WHERE superviseur_id = v_superviseur_id
    LIMIT 1;

    -- Si aucune famille n'existe, chercher ou créer "LES VICTORIEUX"
    IF v_famille_id IS NULL THEN
        -- Chercher si une famille "LES VICTORIEUX" existe (FAM016 ou FAM017)
        SELECT id, nom, identifiant_famille INTO v_famille_id, v_nom_famille, v_identifiant_famille
        FROM familles_disciples
        WHERE nom ILIKE '%VICTORIEUX%'
           OR identifiant_famille IN ('FAM016', 'FAM017')
        ORDER BY 
          CASE WHEN identifiant_famille = 'FAM016' THEN 1
               WHEN identifiant_famille = 'FAM017' THEN 2
               ELSE 3 END
        LIMIT 1;

        -- Si "LES VICTORIEUX" existe mais n'est pas liée à ce superviseur, la lier
        IF v_famille_id IS NOT NULL THEN
            UPDATE familles_disciples
            SET superviseur_id = v_superviseur_id,
                nom = 'LES VICTORIEUX', -- S'assurer que le nom est correct
                updated_at = NOW()
            WHERE id = v_famille_id;
            RAISE NOTICE '✅ Famille existante "LES VICTORIEUX" liée au superviseur: % (%)', v_identifiant_famille, v_nom_famille;
        ELSE
            -- Créer une nouvelle famille "LES VICTORIEUX"
            -- Utiliser FAM016 selon la numérotation (16ème famille)
            v_identifiant_famille := 'FAM016';
            v_nom_famille := 'LES VICTORIEUX';
            
            INSERT INTO familles_disciples (
                nom,
                identifiant_famille,
                superviseur_id,
                statut,
                objectif_disciples,
                created_at,
                updated_at
            ) VALUES (
                v_nom_famille,
                v_identifiant_famille,
                v_superviseur_id,
                'actif',
                70,
                NOW(),
                NOW()
            ) RETURNING id INTO v_famille_id;

            RAISE NOTICE '✅ Nouvelle famille créée: % (%) - ID: %', v_identifiant_famille, v_nom_famille, v_famille_id;
        END IF;
    ELSE
        -- Vérifier que le nom de la famille est correct
        IF v_nom_famille != 'LES VICTORIEUX' THEN
            UPDATE familles_disciples
            SET nom = 'LES VICTORIEUX',
                updated_at = NOW()
            WHERE id = v_famille_id;
            RAISE NOTICE '✅ Nom de famille corrigé: LES VICTORIEUX';
        END IF;
        RAISE NOTICE '✅ Famille existante trouvée: % (%) - ID: %', v_identifiant_famille, v_nom_famille, v_famille_id;
    END IF;

    -- Assigner le famille_id au superviseur dans profils
    UPDATE profils
    SET famille_id = v_famille_id,
        updated_at = NOW()
    WHERE id = v_superviseur_id
      AND (famille_id IS NULL OR famille_id != v_famille_id);

    IF FOUND THEN
        RAISE NOTICE '✅ famille_id assigné avec succès au superviseur Laetitia Missatou';
        RAISE NOTICE '   famille_id: %', v_famille_id;
        RAISE NOTICE '   Famille: % (%)', v_nom_famille, v_identifiant_famille;
    ELSE
        RAISE NOTICE 'ℹ️  famille_id déjà assigné correctement';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ MIGRATION TERMINÉE AVEC SUCCÈS';
    RAISE NOTICE '========================================';

END $$;

-- 2. Vérifier le résultat
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.role,
    p.pasteur_id,
    pasteur.identifiant_unique as pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name as pasteur_nom,
    p.famille_id,
    f.nom as famille_nom,
    f.identifiant_famille,
    CASE 
        WHEN p.famille_id IS NOT NULL AND p.pasteur_id IS NOT NULL THEN '✅ Configuration complète'
        WHEN p.famille_id IS NOT NULL THEN '⚠️ famille_id OK mais pasteur_id manquant'
        WHEN p.pasteur_id IS NOT NULL THEN '⚠️ pasteur_id OK mais famille_id manquant'
        ELSE '❌ Configuration incomplète'
    END as statut
FROM profils p
LEFT JOIN familles_disciples f ON p.famille_id = f.id
LEFT JOIN profils pasteur ON p.pasteur_id = pasteur.id
WHERE p.role = 'superviseur'
  AND (
    (LOWER(p.first_name) IN ('laetitia', 'laëtitia') AND LOWER(p.last_name) = 'missatou')
    OR LOWER(TRIM(CONCAT(p.first_name, ' ', p.last_name))) = 'laetitia missatou'
    OR LOWER(TRIM(CONCAT(p.first_name, ' ', p.last_name))) = 'laëtitia missatou'
    OR p.email = 'laetitia.missatou@example.com'
  );
