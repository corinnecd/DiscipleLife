-- Script pour créer 30 profils fictifs dans la famille "Les Déterminés"
-- Structure:
-- - 10 disciples directs du superviseur Alain SIL
-- - 20 disciples répartis sur 5 des 10 disciples directs (4 chacun)

-- Étape 1: Trouver le superviseur Alain SIL et sa famille
DO $$
DECLARE
    v_superviseur_id UUID;
    v_famille_id UUID;
    v_disciple_1_id UUID;
    v_disciple_2_id UUID;
    v_disciple_3_id UUID;
    v_disciple_4_id UUID;
    v_disciple_5_id UUID;
    v_disciple_6_id UUID;
    v_disciple_7_id UUID;
    v_disciple_8_id UUID;
    v_disciple_9_id UUID;
    v_disciple_10_id UUID;
    -- IDs pour les disciples de Marc DUPONT (niveau 2)
    v_thomas_id UUID;
    v_camille_id UUID;
    v_nicolas_id UUID;
BEGIN
    -- Trouver le superviseur Alain SIL
    SELECT id INTO v_superviseur_id
    FROM profils
    WHERE LOWER(first_name) = 'alain' AND LOWER(last_name) = 'sil'
    AND role = 'superviseur'
    LIMIT 1;

    IF v_superviseur_id IS NULL THEN
        RAISE EXCEPTION 'Superviseur Alain SIL non trouvé';
    END IF;

    -- Trouver la famille "Les Déterminés"
    SELECT id INTO v_famille_id
    FROM familles_disciples
    WHERE LOWER(nom) LIKE '%déterminé%' OR LOWER(nom) LIKE '%determine%'
    LIMIT 1;

    IF v_famille_id IS NULL THEN
        RAISE EXCEPTION 'Famille "Les Déterminés" non trouvée';
    END IF;

    RAISE NOTICE 'Superviseur ID: %, Famille ID: %', v_superviseur_id, v_famille_id;

    -- Étape 2: Créer 10 disciples directs (premiers noms pour les disciples directs)
    -- Disciples directs (1-10) - Création un par un pour récupérer les IDs
    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, created_at)
    VALUES (v_superviseur_id, 'Marc DUPONT', 'Marc', 'DUPONT', 'Disciple', NOW())
    RETURNING id INTO v_disciple_1_id;

    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, created_at)
    VALUES (v_superviseur_id, 'Sophie MARTIN', 'Sophie', 'MARTIN', 'Disciple', NOW())
    RETURNING id INTO v_disciple_2_id;

    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, created_at)
    VALUES (v_superviseur_id, 'Jean DURAND', 'Jean', 'DURAND', 'Disciple', NOW())
    RETURNING id INTO v_disciple_3_id;

    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, created_at)
    VALUES (v_superviseur_id, 'Marie BERNARD', 'Marie', 'BERNARD', 'Disciple', NOW())
    RETURNING id INTO v_disciple_4_id;

    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, created_at)
    VALUES (v_superviseur_id, 'Pierre LEBLANC', 'Pierre', 'LEBLANC', 'Disciple', NOW())
    RETURNING id INTO v_disciple_5_id;

    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, created_at)
    VALUES (v_superviseur_id, 'Julie DUBOIS', 'Julie', 'DUBOIS', 'Disciple', NOW())
    RETURNING id INTO v_disciple_6_id;

    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, created_at)
    VALUES (v_superviseur_id, 'Paul MOREAU', 'Paul', 'MOREAU', 'Disciple', NOW())
    RETURNING id INTO v_disciple_7_id;

    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, created_at)
    VALUES (v_superviseur_id, 'Emma LEFEBVRE', 'Emma', 'LEFEBVRE', 'Disciple', NOW())
    RETURNING id INTO v_disciple_8_id;

    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, created_at)
    VALUES (v_superviseur_id, 'Lucas GARCIA', 'Lucas', 'GARCIA', 'Disciple', NOW())
    RETURNING id INTO v_disciple_9_id;

    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, created_at)
    VALUES (v_superviseur_id, 'Léa FOURNIER', 'Léa', 'FOURNIER', 'Disciple', NOW())
    RETURNING id INTO v_disciple_10_id;

    RAISE NOTICE '10 disciples directs créés';

    -- Étape 3: Créer 20 disciples répartis sur les 5 premiers (4 chacun)
    -- 4 disciples de Marc DUPONT (v_disciple_1_id) - avec récupération des IDs pour niveau 3
    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, parent_disciple_id, created_at)
    VALUES (v_superviseur_id, 'Thomas MARTINEZ', 'Thomas', 'MARTINEZ', 'Disciple', v_disciple_1_id, NOW())
    RETURNING id INTO v_thomas_id;

    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, parent_disciple_id, created_at)
    VALUES (v_superviseur_id, 'Camille ROUX', 'Camille', 'ROUX', 'Disciple', v_disciple_1_id, NOW())
    RETURNING id INTO v_camille_id;

    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, parent_disciple_id, created_at)
    VALUES (v_superviseur_id, 'Nicolas SIMON', 'Nicolas', 'SIMON', 'Disciple', v_disciple_1_id, NOW())
    RETURNING id INTO v_nicolas_id;

    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, parent_disciple_id, created_at)
    VALUES (v_superviseur_id, 'Chloé VINCENT', 'Chloé', 'VINCENT', 'Disciple', v_disciple_1_id, NOW());

    -- 4 disciples de Sophie MARTIN (v_disciple_2_id)
    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, parent_disciple_id, created_at)
    VALUES 
        (v_superviseur_id, 'Alexandre LAMBERT', 'Alexandre', 'LAMBERT', 'Disciple', v_disciple_2_id, NOW()),
        (v_superviseur_id, 'Sarah BONNET', 'Sarah', 'BONNET', 'Disciple', v_disciple_2_id, NOW()),
        (v_superviseur_id, 'Antoine ROUSSEAU', 'Antoine', 'ROUSSEAU', 'Disciple', v_disciple_2_id, NOW()),
        (v_superviseur_id, 'Manon GIRARD', 'Manon', 'GIRARD', 'Disciple', v_disciple_2_id, NOW());

    -- 4 disciples de Jean DURAND (v_disciple_3_id)
    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, parent_disciple_id, created_at)
    VALUES 
        (v_superviseur_id, 'Hugo ANDRE', 'Hugo', 'ANDRE', 'Disciple', v_disciple_3_id, NOW()),
        (v_superviseur_id, 'Inès LEROY', 'Inès', 'LEROY', 'Disciple', v_disciple_3_id, NOW()),
        (v_superviseur_id, 'Maxime MOREAU', 'Maxime', 'MOREAU', 'Disciple', v_disciple_3_id, NOW()),
        (v_superviseur_id, 'Zoé FONTAINE', 'Zoé', 'FONTAINE', 'Disciple', v_disciple_3_id, NOW());

    -- 4 disciples de Marie BERNARD (v_disciple_4_id)
    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, parent_disciple_id, created_at)
    VALUES 
        (v_superviseur_id, 'Louis RENAUD', 'Louis', 'RENAUD', 'Disciple', v_disciple_4_id, NOW()),
        (v_superviseur_id, 'Lola DAVID', 'Lola', 'DAVID', 'Disciple', v_disciple_4_id, NOW()),
        (v_superviseur_id, 'Arthur BERTRAND', 'Arthur', 'BERTRAND', 'Disciple', v_disciple_4_id, NOW()),
        (v_superviseur_id, 'Juliette ROUSSEAU', 'Juliette', 'ROUSSEAU', 'Disciple', v_disciple_4_id, NOW());

    -- 4 disciples de Pierre LEBLANC (v_disciple_5_id)
    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, parent_disciple_id, created_at)
    VALUES 
        (v_superviseur_id, 'Gabriel LEFEVRE', 'Gabriel', 'LEFEVRE', 'Disciple', v_disciple_5_id, NOW()),
        (v_superviseur_id, 'Eva MULLER', 'Eva', 'MULLER', 'Disciple', v_disciple_5_id, NOW()),
        (v_superviseur_id, 'Raphaël GAUTHIER', 'Raphaël', 'GAUTHIER', 'Disciple', v_disciple_5_id, NOW()),
        (v_superviseur_id, 'Amélie PERRIER', 'Amélie', 'PERRIER', 'Disciple', v_disciple_5_id, NOW());

    RAISE NOTICE '20 disciples indirects créés (4 pour chacun des 5 premiers disciples directs)';

    -- Étape 4: Créer 11 disciples au 3ème niveau (sous 3 des disciples de Marc DUPONT)
    -- 6 disciples de Thomas MARTINEZ (v_thomas_id)
    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, parent_disciple_id, created_at)
    VALUES 
        (v_superviseur_id, 'Olivier DUBOIS', 'Olivier', 'DUBOIS', 'Disciple', v_thomas_id, NOW()),
        (v_superviseur_id, 'Claire MOREAU', 'Claire', 'MOREAU', 'Disciple', v_thomas_id, NOW()),
        (v_superviseur_id, 'Fabien LEFEBVRE', 'Fabien', 'LEFEBVRE', 'Disciple', v_thomas_id, NOW()),
        (v_superviseur_id, 'Nathalie GARCIA', 'Nathalie', 'GARCIA', 'Disciple', v_thomas_id, NOW()),
        (v_superviseur_id, 'Sébastien FOURNIER', 'Sébastien', 'FOURNIER', 'Disciple', v_thomas_id, NOW()),
        (v_superviseur_id, 'Isabelle CHEVALIER', 'Isabelle', 'CHEVALIER', 'Disciple', v_thomas_id, NOW());

    -- 3 disciples de Camille ROUX (v_camille_id)
    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, parent_disciple_id, created_at)
    VALUES 
        (v_superviseur_id, 'Yann COLLIN', 'Yann', 'COLLIN', 'Disciple', v_camille_id, NOW()),
        (v_superviseur_id, 'Valérie FERREIRA', 'Valérie', 'FERREIRA', 'Disciple', v_camille_id, NOW()),
        (v_superviseur_id, 'Julien BOUCHER', 'Julien', 'BOUCHER', 'Disciple', v_camille_id, NOW());

    -- 2 disciples de Nicolas SIMON (v_nicolas_id)
    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, circle_type, parent_disciple_id, created_at)
    VALUES 
        (v_superviseur_id, 'Marine LEMAIRE', 'Marine', 'LEMAIRE', 'Disciple', v_nicolas_id, NOW()),
        (v_superviseur_id, 'Benoît ROYER', 'Benoît', 'ROYER', 'Disciple', v_nicolas_id, NOW());

    RAISE NOTICE '11 disciples au 3ème niveau créés (6 pour Thomas, 3 pour Camille, 2 pour Nicolas)';
    RAISE NOTICE 'Total: 41 disciples créés pour la famille Les Déterminés';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erreur: %', SQLERRM;
END $$;
