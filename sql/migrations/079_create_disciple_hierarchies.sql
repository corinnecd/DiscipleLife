-- Migration: Créer les hiérarchies de disciples (parent_disciple_id)
-- Description: Crée les relations parent_disciple_id pour les disciples qui ont des disciples
-- Date: 2025-01-XX

-- Migration: Créer les hiérarchies de disciples (parent_disciple_id)
-- Description: Crée les relations parent_disciple_id pour les disciples qui ont des disciples
-- Date: 2025-01-XX
-- NOTE: Cette migration nécessite une logique métier spécifique pour déterminer
-- quels disciples sont parents d'autres disciples. Pour l'instant, elle prépare
-- la structure mais ne crée pas automatiquement les hiérarchies.

DO $$ 
DECLARE
    famille_record RECORD;
    disciple_mentor_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Début de la création des hiérarchies de disciples...';
    RAISE NOTICE 'NOTE: Cette migration nécessite une logique métier spécifique.';
    RAISE NOTICE 'Les hiérarchies parent_disciple_id seront créées manuellement ou via une autre logique.';

    -- Pour chaque famille
    FOR famille_record IN
        SELECT id, identifiant_famille, nom
        FROM familles_disciples
        WHERE statut = 'actif' OR statut IS NULL
        ORDER BY identifiant_famille
    LOOP
        -- Compter les disciples de cette famille
        SELECT COUNT(*) INTO updated_count
        FROM profils
        WHERE famille_id = famille_record.id
          AND role = 'disciple';
        
        IF updated_count > 1 THEN
            RAISE NOTICE 'Famille % a % disciple(s) - hiérarchie à déterminer manuellement', 
                famille_record.identifiant_famille, 
                updated_count;
        END IF;
    END LOOP;

    RAISE NOTICE 'Analyse terminée. Les hiérarchies parent_disciple_id nécessitent une logique métier spécifique.';
    RAISE NOTICE 'Pour créer les hiérarchies, utilisez une logique basée sur:';
    RAISE NOTICE '  - Date de création (premier disciple = parent)';
    RAISE NOTICE '  - Règle métier spécifique';
    RAISE NOTICE '  - Assignation manuelle';
END $$;

-- Vérification: Afficher les hiérarchies
SELECT 
    cp_parent.id AS parent_id,
    cp_parent.name AS parent_name,
    cp_child.id AS child_id,
    cp_child.name AS child_name,
    f.identifiant_famille AS famille
FROM cercle_personnes cp_parent
INNER JOIN cercle_personnes cp_child ON cp_child.parent_disciple_id = cp_parent.id
LEFT JOIN profils p ON p.id = cp_parent.user_id
LEFT JOIN familles_disciples f ON f.id = p.famille_id
ORDER BY f.identifiant_famille, cp_parent.name, cp_child.name;

-- Statistiques
SELECT 
    COUNT(*) AS total_entrees,
    COUNT(*) FILTER (WHERE parent_disciple_id IS NOT NULL) AS avec_parent,
    COUNT(*) FILTER (WHERE parent_disciple_id IS NULL) AS sans_parent
FROM cercle_personnes;
