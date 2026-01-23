-- Migration: Trigger automatique pour promouvoir les disciples en mentors
-- Description: Crée un trigger qui met automatiquement à jour le rôle d'un disciple
--              en 'mentor' lorsqu'il obtient son premier disciple dans cercle_personnes
-- Date: 2025-01-XX

-- Fonction pour vérifier et promouvoir un disciple en mentor
CREATE OR REPLACE FUNCTION check_and_promote_disciple_to_mentor()
RETURNS TRIGGER AS $$
DECLARE
    disciple_count_via_user_id INTEGER := 0;
    disciple_count_via_parent_id INTEGER := 0;
    total_disciples INTEGER := 0;
    current_role TEXT;
BEGIN
    -- Récupérer le rôle actuel de l'utilisateur (si user_id est défini)
    IF NEW.user_id IS NOT NULL THEN
        SELECT role INTO current_role
        FROM profils
        WHERE id = NEW.user_id;
        
        -- Vérifier si l'utilisateur est un disciple (hors pasteurs et superviseurs)
        IF current_role = 'disciple' THEN
            -- Compter les disciples via user_id (disciples directs)
            SELECT COUNT(*) INTO disciple_count_via_user_id
            FROM cercle_personnes
            WHERE user_id = NEW.user_id;
            
            -- Compter les disciples via parent_disciple_id (disciples de disciples)
            SELECT COUNT(*) INTO disciple_count_via_parent_id
            FROM cercle_personnes cp_inter
            INNER JOIN cercle_personnes cp_parent ON cp_parent.parent_disciple_id = cp_inter.id
            WHERE cp_inter.user_id = NEW.user_id;
            
            total_disciples := disciple_count_via_user_id + disciple_count_via_parent_id;
            
            -- Si l'utilisateur a au moins un disciple, le promouvoir en mentor
            IF total_disciples > 0 THEN
                UPDATE profils
                SET role = 'mentor',
                    updated_at = NOW()
                WHERE id = NEW.user_id
                  AND role = 'disciple';
                
                RAISE NOTICE 'Disciple promu automatiquement au statut de mentor (ID: %, % disciple(s))', 
                    NEW.user_id, 
                    total_disciples;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger après insertion dans cercle_personnes
DROP TRIGGER IF EXISTS trigger_promote_disciple_to_mentor ON cercle_personnes;

CREATE TRIGGER trigger_promote_disciple_to_mentor
    AFTER INSERT ON cercle_personnes
    FOR EACH ROW
    WHEN (NEW.user_id IS NOT NULL)
    EXECUTE FUNCTION check_and_promote_disciple_to_mentor();

-- Commentaire pour documentation
COMMENT ON FUNCTION check_and_promote_disciple_to_mentor() IS 
    'Fonction trigger qui promeut automatiquement un disciple en mentor lorsqu''il obtient son premier disciple';

COMMENT ON TRIGGER trigger_promote_disciple_to_mentor ON cercle_personnes IS 
    'Trigger qui vérifie et promeut automatiquement les disciples en mentors lorsqu''ils obtiennent des disciples';
