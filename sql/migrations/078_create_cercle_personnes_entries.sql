-- Migration: Créer les entrées dans cercle_personnes
-- Description: Crée les relations disciple-mentor dans cercle_personnes basées sur les familles
-- Date: 2025-01-XX

DO $$ 
DECLARE
    famille_record RECORD;
    superviseur_record RECORD;
    disciple_record RECORD;
    mentor_entry_id UUID;
    created_count INTEGER := 0;
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Début de la création des entrées dans cercle_personnes...';

    -- Pour chaque famille avec un superviseur
    FOR famille_record IN
        SELECT f.id, f.nom, f.identifiant_famille, f.superviseur_id,
               s.first_name AS sup_first_name, s.last_name AS sup_last_name, s.email AS sup_email
        FROM familles_disciples f
        INNER JOIN profils s ON s.id = f.superviseur_id
        WHERE f.superviseur_id IS NOT NULL
          AND (f.statut = 'actif' OR f.statut IS NULL)
        ORDER BY f.identifiant_famille
    LOOP
        -- 1. Créer ou vérifier l'entrée du superviseur (mentor) dans cercle_personnes
        SELECT id INTO mentor_entry_id
        FROM cercle_personnes
        WHERE user_id = famille_record.superviseur_id
        LIMIT 1;

        IF mentor_entry_id IS NULL THEN
            -- Créer l'entrée pour le superviseur
            INSERT INTO cercle_personnes (
                user_id,
                name,
                first_name,
                last_name,
                email,
                circle_type,
                created_at
            ) VALUES (
                famille_record.superviseur_id,
                COALESCE(
                    TRIM(CONCAT(famille_record.sup_first_name, ' ', famille_record.sup_last_name)),
                    famille_record.sup_email,
                    'Superviseur'
                ),
                famille_record.sup_first_name,
                famille_record.sup_last_name,
                famille_record.sup_email,
                'Superviseur',
                NOW()
            )
            RETURNING id INTO mentor_entry_id;

            created_count := created_count + 1;
            RAISE NOTICE 'Entrée créée pour superviseur % (famille %)', 
                famille_record.superviseur_id,
                famille_record.identifiant_famille;
        END IF;

        -- 2. Pour chaque disciple de cette famille, créer une entrée dans cercle_personnes
        FOR disciple_record IN
            SELECT p.id, p.first_name, p.last_name, p.email, p.role
            FROM profils p
            WHERE p.famille_id = famille_record.id
              AND p.role = 'disciple'
        LOOP
            -- Vérifier si l'entrée existe déjà
            IF NOT EXISTS (
                SELECT 1 FROM cercle_personnes
                WHERE user_id = famille_record.superviseur_id
                  AND (
                    (first_name = disciple_record.first_name AND last_name = disciple_record.last_name)
                    OR email = disciple_record.email
                  )
            ) THEN
                -- Créer l'entrée pour le disciple
                INSERT INTO cercle_personnes (
                    user_id,
                    parent_disciple_id,
                    name,
                    first_name,
                    last_name,
                    email,
                    circle_type,
                    created_at
                ) VALUES (
                    famille_record.superviseur_id, -- Le superviseur est le mentor
                    NULL, -- parent_disciple_id sera géré dans la migration suivante
                    COALESCE(
                        TRIM(CONCAT(disciple_record.first_name, ' ', disciple_record.last_name)),
                        disciple_record.email,
                        'Disciple'
                    ),
                    disciple_record.first_name,
                    disciple_record.last_name,
                    disciple_record.email,
                    'Disciple',
                    NOW()
                );

                created_count := created_count + 1;
                RAISE NOTICE 'Entrée créée pour disciple % (famille %)', 
                    disciple_record.id,
                    famille_record.identifiant_famille;
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Création terminée: % entrée(s) créée(s)', created_count;
END $$;

-- Vérification: Afficher les entrées créées
SELECT 
    cp.id,
    cp.name,
    cp.first_name,
    cp.last_name,
    cp.user_id,
    cp.parent_disciple_id,
    cp.circle_type,
    p.role AS role_profil,
    f.identifiant_famille AS famille
FROM cercle_personnes cp
LEFT JOIN profils p ON p.id = cp.user_id
LEFT JOIN profils p2 ON p2.famille_id = (
    SELECT famille_id FROM profils WHERE id = cp.user_id LIMIT 1
)
LEFT JOIN familles_disciples f ON f.id = p2.famille_id
ORDER BY f.identifiant_famille, cp.circle_type, cp.name;

-- Statistiques
SELECT 
    COUNT(*) AS total_entrees,
    COUNT(DISTINCT user_id) AS mentors_uniques,
    COUNT(*) FILTER (WHERE parent_disciple_id IS NOT NULL) AS avec_parent,
    COUNT(*) FILTER (WHERE parent_disciple_id IS NULL) AS sans_parent
FROM cercle_personnes;
