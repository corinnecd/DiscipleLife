-- Migration: Assigner les famille_id aux profils
-- Description: Lie les profils (superviseurs et disciples) aux familles dans familles_disciples
-- Date: 2025-01-XX

DO $$ 
DECLARE
    famille_record RECORD;
    superviseur_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Début de l''assignation des famille_id aux profils...';

    -- Pour chaque famille dans familles_disciples
    FOR famille_record IN
        SELECT id, nom, identifiant_famille, superviseur_id
        FROM familles_disciples
        WHERE statut = 'actif' OR statut IS NULL
        ORDER BY identifiant_famille
    LOOP
        -- 1. Assigner le famille_id au superviseur de la famille
        IF famille_record.superviseur_id IS NOT NULL THEN
            UPDATE profils
            SET famille_id = famille_record.id,
                updated_at = NOW()
            WHERE id = famille_record.superviseur_id
              AND (famille_id IS NULL OR famille_id != famille_record.id);
            
            IF FOUND THEN
                updated_count := updated_count + 1;
                RAISE NOTICE 'Superviseur % assigné à la famille % (%)', 
                    famille_record.superviseur_id, 
                    famille_record.identifiant_famille,
                    famille_record.nom;
            END IF;
        END IF;

        -- 2. Pour les disciples, on ne peut pas les assigner automatiquement
        -- car ils n'ont pas de lien direct avec la famille dans la structure actuelle
        -- Cette étape nécessitera une logique métier supplémentaire
        
    END LOOP;

    RAISE NOTICE 'Assignation terminée: % profil(s) mis à jour', updated_count;
END $$;

-- Vérification: Afficher les profils avec famille_id
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.role,
    p.famille_id,
    f.nom AS nom_famille,
    f.identifiant_famille
FROM profils p
LEFT JOIN familles_disciples f ON f.id = p.famille_id
WHERE p.famille_id IS NOT NULL
ORDER BY f.identifiant_famille, p.role, p.last_name, p.first_name;

-- Statistiques
SELECT 
    COUNT(*) FILTER (WHERE famille_id IS NOT NULL) AS profils_avec_famille,
    COUNT(*) FILTER (WHERE famille_id IS NULL) AS profils_sans_famille,
    COUNT(*) AS total_profils
FROM profils;
