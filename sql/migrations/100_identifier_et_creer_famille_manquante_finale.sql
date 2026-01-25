-- ============================================
-- Migration: Identifier et créer la famille manquante finale
-- Objectif: Trouver le superviseur qui a un famille_id mais pas de famille dans familles_disciples
-- Date: 2025-01-XX
-- ============================================

-- 1. Identifier le superviseur qui a un famille_id mais pas de famille dans familles_disciples
SELECT 
    '=== SUPERVISEUR AVEC famille_id MAIS SANS FAMILLE DANS familles_disciples ===' AS info;

SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.pasteur_id,
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
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
  AND f_superviseur.id IS NULL
ORDER BY 
    CASE 
        WHEN f_superviseur.id IS NULL AND f_profils.id IS NULL THEN 1
        WHEN f_superviseur.id IS NULL AND f_profils.id IS NOT NULL AND f_profils.superviseur_id != p.id THEN 2
        ELSE 3
    END,
    p.first_name, p.last_name;

-- 2. Corriger le problème
DO $$
DECLARE
    v_superviseur_record RECORD;
    v_famille_id uuid;
    v_famille_existante_id uuid;
    v_pasteur_id uuid;
    v_identifiant_famille text;
    v_nom_famille text;
    v_corrected_count integer := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CRÉATION DE LA FAMILLE MANQUANTE';
    RAISE NOTICE '========================================';

    -- Pour chaque superviseur sans famille dans familles_disciples
    FOR v_superviseur_record IN
        SELECT 
            p.id,
            p.first_name,
            p.last_name,
            p.email,
            p.pasteur_id,
            p.famille_id AS famille_id_dans_profils,
            pasteur.identifiant_unique AS pasteur_identifiant
        FROM profils p
        LEFT JOIN profils pasteur ON pasteur.id = p.pasteur_id
        LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
        WHERE p.role = 'superviseur'
          AND f.id IS NULL
        ORDER BY pasteur.identifiant_unique, p.first_name, p.last_name
    LOOP
        RAISE NOTICE '--- Traitement de % % (Pasteur: %) ---', 
            v_superviseur_record.first_name, 
            v_superviseur_record.last_name,
            v_superviseur_record.pasteur_identifiant;

        v_pasteur_id := v_superviseur_record.pasteur_id;

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
                        pasteur_id = v_pasteur_id,
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
                -- Déterminer la famille attendue selon le superviseur et le pasteur
                -- Utiliser la logique de mapping selon le pasteur
                IF v_superviseur_record.pasteur_identifiant = 'PASTEUR-001' THEN
                    -- DR MODE
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
                ELSIF v_superviseur_record.pasteur_identifiant = 'PASTEUR-003' THEN
                    -- PS PEGGY NN
                    SELECT 
                        CASE 
                            WHEN LOWER(v_superviseur_record.first_name) LIKE '%alain%' AND LOWER(v_superviseur_record.last_name) LIKE '%sil%' THEN ('FAM001', 'LES DÉTERMINÉS')
                            WHEN LOWER(v_superviseur_record.first_name) LIKE '%carine%' AND LOWER(v_superviseur_record.last_name) LIKE '%matondo%' THEN ('FAM005', 'Les AMOUREUX')
                            WHEN LOWER(v_superviseur_record.first_name) LIKE '%gervais%' AND LOWER(v_superviseur_record.last_name) LIKE '%nkatouloulou%' THEN ('FAM011', 'LES FIDÈLES')
                            WHEN LOWER(v_superviseur_record.first_name) LIKE '%laetitia%' AND LOWER(v_superviseur_record.last_name) LIKE '%missatou%' THEN ('FAM017', 'LES VICTORIEUX')
                            ELSE (NULL, NULL)
                        END
                    INTO v_identifiant_famille, v_nom_famille;
                ELSIF v_superviseur_record.pasteur_identifiant = 'PASTEUR-002' THEN
                    -- PS JULIANA
                    SELECT 
                        CASE 
                            WHEN (LOWER(v_superviseur_record.first_name) LIKE '%beraca%' OR LOWER(v_superviseur_record.first_name) LIKE '%béraca%') AND LOWER(v_superviseur_record.last_name) LIKE '%kazongo%' THEN ('FAM003', 'Les ENRACINÉS')
                            WHEN LOWER(v_superviseur_record.first_name) LIKE '%cynthia%' AND LOWER(v_superviseur_record.last_name) LIKE '%alloh%' THEN ('FAM007', 'INNARRÊTABLES')
                            WHEN LOWER(v_superviseur_record.first_name) LIKE '%jocelyne%' AND LOWER(v_superviseur_record.last_name) LIKE '%fortune%' THEN ('FAM014', 'LES PERSÉVERANTS')
                            WHEN LOWER(v_superviseur_record.first_name) LIKE '%patrick%' AND (LOWER(v_superviseur_record.last_name) LIKE '%batsiaga%' OR LOWER(v_superviseur_record.last_name) LIKE '%batsiaka%') THEN ('FAM021', 'LES CHOISIS')
                            WHEN LOWER(v_superviseur_record.first_name) LIKE '%snella%' AND LOWER(v_superviseur_record.last_name) LIKE '%moussio%' THEN ('FAM025', 'LES EMBRASÉS')
                            ELSE (NULL, NULL)
                        END
                    INTO v_identifiant_famille, v_nom_famille;
                ELSIF v_superviseur_record.pasteur_identifiant = 'PASTEUR-004' THEN
                    -- PS JESSY
                    SELECT 
                        CASE 
                            WHEN (LOWER(v_superviseur_record.first_name) LIKE '%andrea%' OR LOWER(v_superviseur_record.first_name) LIKE '%andréa%') AND LOWER(v_superviseur_record.last_name) LIKE '%ernest%' THEN ('FAM002', 'Les VAILLANTS')
                            WHEN LOWER(v_superviseur_record.first_name) LIKE '%david%' AND LOWER(v_superviseur_record.last_name) LIKE '%serva%' THEN ('FAM008', 'LES TÉMOINS')
                            WHEN LOWER(v_superviseur_record.first_name) LIKE '%nancy%' AND LOWER(v_superviseur_record.last_name) LIKE '%nzi%' THEN ('FAM019', 'LES INTIMES')
                            WHEN (LOWER(v_superviseur_record.first_name) LIKE '%prospere%' OR LOWER(v_superviseur_record.first_name) LIKE '%prosper%') AND LOWER(v_superviseur_record.last_name) LIKE '%leba%' THEN ('FAM022', 'LES BOULEVERSEURS')
                            WHEN LOWER(v_superviseur_record.first_name) LIKE '%serge%' AND LOWER(v_superviseur_record.last_name) LIKE '%amany%' THEN ('FAM024', 'LES CONSACRÉS')
                            ELSE (NULL, NULL)
                        END
                    INTO v_identifiant_famille, v_nom_famille;
                END IF;

                -- Si une famille a été identifiée
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
                            pasteur_id = v_pasteur_id,
                            nom = v_nom_famille,
                            updated_at = NOW()
                        WHERE id = v_famille_existante_id;
                        v_famille_id := v_famille_existante_id;
                        RAISE NOTICE '✅ Famille existante % (%) mise à jour et liée au superviseur', 
                            v_nom_famille, v_identifiant_famille;
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
                            v_pasteur_id,
                            'actif',
                            70,
                            NOW(),
                            NOW()
                        ) RETURNING id INTO v_famille_id;
                        RAISE NOTICE '✅ Nouvelle famille créée: % (%) pour superviseur % %', 
                            v_nom_famille, v_identifiant_famille,
                            v_superviseur_record.first_name, v_superviseur_record.last_name;
                    END IF;

                    -- Mettre à jour le famille_id dans profils
                    UPDATE profils
                    SET famille_id = v_famille_id,
                        updated_at = NOW()
                    WHERE id = v_superviseur_record.id;

                    v_corrected_count := v_corrected_count + 1;
                ELSE
                    RAISE NOTICE '⚠️  Impossible de déterminer la famille pour % %', 
                        v_superviseur_record.first_name, v_superviseur_record.last_name;
                END IF;
            END IF;
        ELSE
            -- Le superviseur n'a pas de famille_id dans profils
            -- Déterminer la famille attendue selon le superviseur et le pasteur
            IF v_superviseur_record.pasteur_identifiant = 'PASTEUR-001' THEN
                -- DR MODE (même logique que ci-dessus)
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
            ELSIF v_superviseur_record.pasteur_identifiant = 'PASTEUR-003' THEN
                -- PS PEGGY NN
                SELECT 
                    CASE 
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%alain%' AND LOWER(v_superviseur_record.last_name) LIKE '%sil%' THEN ('FAM001', 'LES DÉTERMINÉS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%carine%' AND LOWER(v_superviseur_record.last_name) LIKE '%matondo%' THEN ('FAM005', 'Les AMOUREUX')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%gervais%' AND LOWER(v_superviseur_record.last_name) LIKE '%nkatouloulou%' THEN ('FAM011', 'LES FIDÈLES')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%laetitia%' AND LOWER(v_superviseur_record.last_name) LIKE '%missatou%' THEN ('FAM017', 'LES VICTORIEUX')
                        ELSE (NULL, NULL)
                    END
                INTO v_identifiant_famille, v_nom_famille;
            ELSIF v_superviseur_record.pasteur_identifiant = 'PASTEUR-002' THEN
                -- PS JULIANA
                SELECT 
                    CASE 
                        WHEN (LOWER(v_superviseur_record.first_name) LIKE '%beraca%' OR LOWER(v_superviseur_record.first_name) LIKE '%béraca%') AND LOWER(v_superviseur_record.last_name) LIKE '%kazongo%' THEN ('FAM003', 'Les ENRACINÉS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%cynthia%' AND LOWER(v_superviseur_record.last_name) LIKE '%alloh%' THEN ('FAM007', 'INNARRÊTABLES')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%jocelyne%' AND LOWER(v_superviseur_record.last_name) LIKE '%fortune%' THEN ('FAM014', 'LES PERSÉVERANTS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%patrick%' AND (LOWER(v_superviseur_record.last_name) LIKE '%batsiaga%' OR LOWER(v_superviseur_record.last_name) LIKE '%batsiaka%') THEN ('FAM021', 'LES CHOISIS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%snella%' AND LOWER(v_superviseur_record.last_name) LIKE '%moussio%' THEN ('FAM025', 'LES EMBRASÉS')
                        ELSE (NULL, NULL)
                    END
                INTO v_identifiant_famille, v_nom_famille;
            ELSIF v_superviseur_record.pasteur_identifiant = 'PASTEUR-004' THEN
                -- PS JESSY
                SELECT 
                    CASE 
                        WHEN (LOWER(v_superviseur_record.first_name) LIKE '%andrea%' OR LOWER(v_superviseur_record.first_name) LIKE '%andréa%') AND LOWER(v_superviseur_record.last_name) LIKE '%ernest%' THEN ('FAM002', 'Les VAILLANTS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%david%' AND LOWER(v_superviseur_record.last_name) LIKE '%serva%' THEN ('FAM008', 'LES TÉMOINS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%nancy%' AND LOWER(v_superviseur_record.last_name) LIKE '%nzi%' THEN ('FAM019', 'LES INTIMES')
                        WHEN (LOWER(v_superviseur_record.first_name) LIKE '%prospere%' OR LOWER(v_superviseur_record.first_name) LIKE '%prosper%') AND LOWER(v_superviseur_record.last_name) LIKE '%leba%' THEN ('FAM022', 'LES BOULEVERSEURS')
                        WHEN LOWER(v_superviseur_record.first_name) LIKE '%serge%' AND LOWER(v_superviseur_record.last_name) LIKE '%amany%' THEN ('FAM024', 'LES CONSACRÉS')
                        ELSE (NULL, NULL)
                    END
                INTO v_identifiant_famille, v_nom_famille;
            END IF;

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
                        pasteur_id = v_pasteur_id,
                        nom = v_nom_famille,
                        updated_at = NOW()
                    WHERE id = v_famille_existante_id;
                    v_famille_id := v_famille_existante_id;
                    RAISE NOTICE '✅ Famille existante % (%) mise à jour et liée au superviseur', 
                        v_nom_famille, v_identifiant_famille;
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
                        v_pasteur_id,
                        'actif',
                        70,
                        NOW(),
                        NOW()
                    ) RETURNING id INTO v_famille_id;
                    RAISE NOTICE '✅ Nouvelle famille créée: % (%) pour superviseur % %', 
                        v_nom_famille, v_identifiant_famille,
                        v_superviseur_record.first_name, v_superviseur_record.last_name;
                END IF;

                -- Mettre à jour le famille_id dans profils
                UPDATE profils
                SET famille_id = v_famille_id,
                    updated_at = NOW()
                WHERE id = v_superviseur_record.id;

                v_corrected_count := v_corrected_count + 1;
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
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur') AS total_superviseurs,
    (SELECT COUNT(*) FROM familles_disciples) AS total_familles,
    (SELECT COUNT(*) FROM profils p JOIN familles_disciples f ON f.superviseur_id = p.id WHERE p.role = 'superviseur') AS superviseurs_avec_famille,
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND famille_id IS NOT NULL) AS superviseurs_avec_famille_id,
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND NOT EXISTS (SELECT 1 FROM familles_disciples WHERE superviseur_id = profils.id)) AS superviseurs_sans_famille,
    (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id IS NULL) AS familles_sans_superviseur,
    CASE 
        WHEN (SELECT COUNT(*) FROM profils WHERE role = 'superviseur') = 26
            AND (SELECT COUNT(*) FROM familles_disciples) = 26
            AND (SELECT COUNT(*) FROM profils p JOIN familles_disciples f ON f.superviseur_id = p.id WHERE p.role = 'superviseur') = 26
            AND (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND famille_id IS NOT NULL) = 26
        THEN '✅ TOUT EST CORRECT (26 superviseurs, 26 familles)'
        ELSE '⚠️  PROBLÈME DÉTECTÉ'
    END AS statut_final;
