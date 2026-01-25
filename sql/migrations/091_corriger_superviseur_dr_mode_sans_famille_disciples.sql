-- ============================================
-- Migration: Corriger le superviseur de DR MODE sans famille dans familles_disciples
-- Objectif: Identifier et créer/corriger la famille manquante pour le superviseur
-- Date: 2025-01-XX
-- ============================================

-- 1. Identifier le superviseur qui a un famille_id dans profils mais pas de famille dans familles_disciples
SELECT 
    '=== SUPERVISEUR AVEC famille_id MAIS SANS FAMILLE DANS familles_disciples ===' AS info;

SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.famille_id AS famille_id_dans_profils,
    f_profils.id AS famille_trouvee_via_famille_id,
    f_profils.nom AS famille_nom_via_famille_id,
    f_profils.identifiant_famille AS identifiant_via_famille_id,
    f_profils.superviseur_id AS superviseur_id_dans_famille,
    f_superviseur.id AS famille_trouvee_via_superviseur_id,
    f_superviseur.nom AS famille_nom_via_superviseur_id,
    f_superviseur.identifiant_famille AS identifiant_via_superviseur_id,
    CASE 
        WHEN f_superviseur.id IS NULL AND f_profils.id IS NULL THEN '❌ AUCUNE FAMILLE TROUVÉE'
        WHEN f_superviseur.id IS NULL AND f_profils.id IS NOT NULL AND f_profils.superviseur_id != p.id THEN '⚠️  famille_id POINTE VERS UNE FAMILLE D''UN AUTRE SUPERVISEUR'
        WHEN f_superviseur.id IS NULL AND f_profils.id IS NOT NULL AND f_profils.superviseur_id = p.id THEN '✅ FAMILLE TROUVÉE VIA famille_id (mais pas via superviseur_id)'
        WHEN f_superviseur.id IS NOT NULL AND f_profils.id IS NULL THEN '⚠️  FAMILLE TROUVÉE VIA superviseur_id (mais pas via famille_id)'
        WHEN f_superviseur.id != f_profils.id THEN '⚠️  INCOHÉRENCE: Deux familles différentes'
        ELSE '✅ CORRECT'
    END AS statut
FROM profils p
LEFT JOIN familles_disciples f_profils ON f_profils.id = p.famille_id
LEFT JOIN familles_disciples f_superviseur ON f_superviseur.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
  AND (f_superviseur.id IS NULL OR f_profils.superviseur_id != p.id)
ORDER BY 
    CASE 
        WHEN f_superviseur.id IS NULL AND f_profils.id IS NULL THEN 1
        WHEN f_superviseur.id IS NULL AND f_profils.id IS NOT NULL AND f_profils.superviseur_id != p.id THEN 2
        ELSE 3
    END,
    p.first_name, p.last_name;

-- 2. Corriger les problèmes identifiés
DO $$
DECLARE
    v_superviseur_record RECORD;
    v_famille_id uuid;
    v_famille_existante_id uuid;
    v_identifiant_famille text;
    v_nom_famille text;
    v_corrected_count integer := 0;
    v_pasteur_001_id uuid;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CORRECTION DES FAMILLES MANQUANTES';
    RAISE NOTICE '========================================';

    -- Trouver PASTEUR-001
    SELECT id INTO v_pasteur_001_id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1;

    -- Pour chaque superviseur de DR MODE sans famille dans familles_disciples
    FOR v_superviseur_record IN
        SELECT 
            p.id,
            p.first_name,
            p.last_name,
            p.email,
            p.famille_id AS famille_id_dans_profils
        FROM profils p
        LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
        WHERE p.role = 'superviseur'
          AND p.pasteur_id = v_pasteur_001_id
          AND f.id IS NULL
        ORDER BY p.first_name, p.last_name
    LOOP
        RAISE NOTICE '--- Traitement de % % ---', v_superviseur_record.first_name, v_superviseur_record.last_name;

        -- Vérifier si une famille existe déjà via famille_id dans profils
        IF v_superviseur_record.famille_id_dans_profils IS NOT NULL THEN
            SELECT id, nom, identifiant_famille, superviseur_id 
            INTO v_famille_existante_id, v_nom_famille, v_identifiant_famille, v_famille_id
            FROM familles_disciples
            WHERE id = v_superviseur_record.famille_id_dans_profils
            LIMIT 1;

            -- Si la famille existe mais n'est pas liée au superviseur
            IF v_famille_existante_id IS NOT NULL THEN
                IF v_famille_id != v_superviseur_record.id THEN
                    -- Mettre à jour la famille pour la lier au superviseur
                    UPDATE familles_disciples
                    SET superviseur_id = v_superviseur_record.id,
                        pasteur_id = v_pasteur_001_id,
                        updated_at = NOW()
                    WHERE id = v_famille_existante_id;
                    v_corrected_count := v_corrected_count + 1;
                    RAISE NOTICE '✅ Famille existante % (%) liée au superviseur % %', 
                        v_nom_famille, v_identifiant_famille,
                        v_superviseur_record.first_name, v_superviseur_record.last_name;
                ELSE
                    RAISE NOTICE 'ℹ️  Famille déjà correctement liée';
                END IF;
            ELSE
                -- La famille_id dans profils pointe vers une famille qui n'existe pas
                -- Déterminer la famille attendue selon le superviseur
                SELECT 
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
                INTO v_identifiant_famille, v_nom_famille;

                -- Si une famille a été identifiée, la créer ou la trouver
                IF v_identifiant_famille IS NOT NULL AND v_nom_famille IS NOT NULL THEN
                    -- Chercher si la famille existe déjà
                    SELECT id INTO v_famille_existante_id
                    FROM familles_disciples
                    WHERE identifiant_famille = v_identifiant_famille
                    LIMIT 1;

                    IF v_famille_existante_id IS NOT NULL THEN
                        -- Mettre à jour la famille existante
                        UPDATE familles_disciples
                        SET superviseur_id = v_superviseur_record.id,
                            pasteur_id = v_pasteur_001_id,
                            nom = v_nom_famille,
                            updated_at = NOW()
                        WHERE id = v_famille_existante_id;
                        v_corrected_count := v_corrected_count + 1;
                        RAISE NOTICE '✅ Famille existante % (%) mise à jour et liée au superviseur % %', 
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
                            v_pasteur_001_id,
                            'actif',
                            70,
                            NOW(),
                            NOW()
                        ) RETURNING id INTO v_famille_existante_id;
                        v_corrected_count := v_corrected_count + 1;
                        RAISE NOTICE '✅ Nouvelle famille créée: % (%) pour superviseur % %', 
                            v_nom_famille, v_identifiant_famille,
                            v_superviseur_record.first_name, v_superviseur_record.last_name;
                    END IF;

                    -- Mettre à jour le famille_id dans profils
                    UPDATE profils
                    SET famille_id = v_famille_existante_id,
                        updated_at = NOW()
                    WHERE id = v_superviseur_record.id
                      AND (famille_id IS NULL OR famille_id != v_famille_existante_id);
                ELSE
                    RAISE NOTICE '⚠️  Impossible de déterminer la famille pour % %', 
                        v_superviseur_record.first_name, v_superviseur_record.last_name;
                END IF;
            END IF;
        ELSE
            -- Le superviseur n'a pas de famille_id dans profils
            -- Déterminer la famille attendue et la créer
            SELECT 
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
            INTO v_identifiant_famille, v_nom_famille;

            IF v_identifiant_famille IS NOT NULL AND v_nom_famille IS NOT NULL THEN
                -- Chercher si la famille existe déjà
                SELECT id INTO v_famille_existante_id
                FROM familles_disciples
                WHERE identifiant_famille = v_identifiant_famille
                LIMIT 1;

                IF v_famille_existante_id IS NOT NULL THEN
                    -- Mettre à jour la famille existante
                    UPDATE familles_disciples
                    SET superviseur_id = v_superviseur_record.id,
                        pasteur_id = v_pasteur_001_id,
                        nom = v_nom_famille,
                        updated_at = NOW()
                    WHERE id = v_famille_existante_id;
                    v_famille_id := v_famille_existante_id;
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
                        v_pasteur_001_id,
                        'actif',
                        70,
                        NOW(),
                        NOW()
                    ) RETURNING id INTO v_famille_id;
                END IF;

                -- Mettre à jour le famille_id dans profils
                UPDATE profils
                SET famille_id = v_famille_id,
                    updated_at = NOW()
                WHERE id = v_superviseur_record.id;

                v_corrected_count := v_corrected_count + 1;
                RAISE NOTICE '✅ Famille % (%) créée/mise à jour pour superviseur % %', 
                    v_nom_famille, v_identifiant_famille,
                    v_superviseur_record.first_name, v_superviseur_record.last_name;
            ELSE
                RAISE NOTICE '⚠️  Impossible de déterminer la famille pour % %', 
                    v_superviseur_record.first_name, v_superviseur_record.last_name;
            END IF;
        END IF;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ % famille(s) créée(s) ou mise(s) à jour', v_corrected_count;
    RAISE NOTICE '========================================';
END $$;

-- 3. Vérification finale
SELECT 
    '=== VÉRIFICATION FINALE ===' AS info;

SELECT 
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)) AS total_superviseurs,
    (SELECT COUNT(DISTINCT superviseur_id) FROM familles_disciples WHERE pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)) AS total_familles_avec_superviseur,
    (SELECT COUNT(*) FROM familles_disciples WHERE pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)) AS total_familles,
    (SELECT COUNT(*) FROM profils p 
     LEFT JOIN familles_disciples f ON f.superviseur_id = p.id 
     WHERE p.role = 'superviseur' 
       AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
       AND f.id IS NULL) AS superviseurs_sans_famille,
    CASE 
        WHEN (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)) = 12
            AND (SELECT COUNT(DISTINCT superviseur_id) FROM familles_disciples WHERE pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)) = 12
        THEN '✅ CORRECT (12 superviseurs, 12 familles)'
        ELSE '⚠️  PROBLÈME DÉTECTÉ'
    END AS statut;
