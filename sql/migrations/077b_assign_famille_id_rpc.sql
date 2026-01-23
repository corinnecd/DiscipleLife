-- Migration: Fonction RPC pour assigner les famille_id aux profils
-- Description: Crée une fonction RPC qui peut être appelée pour assigner les famille_id
-- Date: 2025-01-XX

-- Créer la fonction RPC
CREATE OR REPLACE FUNCTION assign_famille_id_to_profils()
RETURNS TABLE(
    famille_identifiant TEXT,
    famille_nom TEXT,
    superviseur_id UUID,
    superviseur_nom TEXT,
    updated BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    famille_record RECORD;
    superviseur_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    -- Pour chaque famille dans familles_disciples
    FOR famille_record IN
        SELECT id, nom, identifiant_famille, superviseur_id
        FROM familles_disciples
        WHERE statut = 'actif' OR statut IS NULL
        ORDER BY identifiant_famille
    LOOP
        -- 1. Assigner le famille_id au superviseur de la famille
        IF famille_record.superviseur_id IS NOT NULL THEN
            -- Vérifier si le superviseur existe
            SELECT * INTO superviseur_record
            FROM profils
            WHERE id = famille_record.superviseur_id;
            
            IF FOUND THEN
                -- Mettre à jour le famille_id
                UPDATE profils
                SET famille_id = famille_record.id,
                    updated_at = NOW()
                WHERE id = famille_record.superviseur_id
                  AND (famille_id IS NULL OR famille_id != famille_record.id);
                
                IF FOUND THEN
                    updated_count := updated_count + 1;
                    -- Retourner le résultat
                    famille_identifiant := famille_record.identifiant_famille;
                    famille_nom := famille_record.nom;
                    superviseur_id := famille_record.superviseur_id;
                    superviseur_nom := COALESCE(superviseur_record.first_name || ' ' || superviseur_record.last_name, superviseur_record.email);
                    updated := TRUE;
                    RETURN NEXT;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION assign_famille_id_to_profils() TO anon, authenticated;
