-- ============================================
-- Migration: Corriger la famille manquante
-- Objectif: Identifier et corriger le superviseur sans famille ou la famille sans superviseur
-- Contexte: Il y a 26 superviseurs, 26 familles, mais seulement 25 familles avec superviseur assigné
-- ============================================

-- 1. Identifier les superviseurs sans famille
SELECT 
    'SUPERVISEURS SANS FAMILLE' as type,
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.identifiant_unique,
    p.pasteur_id,
    (SELECT identifiant_unique FROM profils WHERE id = p.pasteur_id) as pasteur_identifiant
FROM profils p
WHERE p.role = 'superviseur'
  AND NOT EXISTS (
    SELECT 1 
    FROM familles_disciples f 
    WHERE f.superviseur_id = p.id
  )
ORDER BY p.first_name, p.last_name;

-- 2. Identifier les familles sans superviseur
SELECT 
    'FAMILLES SANS SUPERVISEUR' as type,
    f.id as famille_id,
    f.nom as famille_nom,
    f.identifiant_famille,
    f.superviseur_id,
    f.pasteur_id
FROM familles_disciples f
WHERE f.superviseur_id IS NULL
ORDER BY f.identifiant_famille;

-- 3. Afficher tous les superviseurs avec leur famille (ou NULL si pas de famille)
SELECT 
    'SUPERVISEURS ET FAMILLES' as type,
    p.id as superviseur_id,
    p.first_name || ' ' || p.last_name as superviseur_nom,
    p.identifiant_unique as superviseur_identifiant,
    f.id as famille_id,
    f.nom as famille_nom,
    f.identifiant_famille,
    CASE 
        WHEN f.id IS NULL THEN 'SANS FAMILLE'
        WHEN f.superviseur_id IS NULL OR f.superviseur_id != p.id THEN 'FAMILLE NON ASSIGNÉE'
        ELSE 'OK'
    END as statut
FROM profils p
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
ORDER BY 
    CASE 
        WHEN f.id IS NULL THEN 1
        WHEN f.superviseur_id IS NULL OR f.superviseur_id != p.id THEN 2
        ELSE 3
    END,
    p.first_name, p.last_name;

-- 4. Assigner automatiquement les familles sans superviseur aux superviseurs sans famille
-- En utilisant la logique de matching par nom (comme dans 043_reassign_superviseurs_familles.sql)
DO $$
DECLARE
  famille_record RECORD;
  superviseur_uuid UUID;
  matched_count INTEGER := 0;
BEGIN
  -- Pour chaque famille sans superviseur, essayer de trouver le superviseur correspondant
  FOR famille_record IN
    SELECT 
      f.id as famille_id,
      f.identifiant_famille,
      f.nom as nom_famille,
      CASE 
        WHEN f.identifiant_famille = 'FAM001' THEN 'Alain SIL'
        WHEN f.identifiant_famille = 'FAM002' THEN 'Andréa ERNEST'
        WHEN f.identifiant_famille = 'FAM003' THEN 'Béraca KAZONGO'
        WHEN f.identifiant_famille = 'FAM004' THEN 'BETSALEEL BADILA'
        WHEN f.identifiant_famille = 'FAM005' THEN 'CARINE MATONDO'
        WHEN f.identifiant_famille = 'FAM006' THEN 'COCO OKANZI'
        WHEN f.identifiant_famille = 'FAM007' THEN 'CYNTHIA ALLOH'
        WHEN f.identifiant_famille = 'FAM008' THEN 'David SERVA'
        WHEN f.identifiant_famille = 'FAM009' THEN 'ÉLISABETH AMECY'
        WHEN f.identifiant_famille = 'FAM010' THEN 'EPHREM MBA'
        WHEN f.identifiant_famille = 'FAM011' THEN 'GERVAIS NKATOULOULOU'
        WHEN f.identifiant_famille = 'FAM012' THEN 'HÉLÈNE LAMAGO'
        WHEN f.identifiant_famille = 'FAM013' THEN 'JOCELYNE FORTUNE'
        WHEN f.identifiant_famille = 'FAM014' THEN 'KARINE WILLIAM'
        WHEN f.identifiant_famille = 'FAM015' THEN 'KEVIN THÉA'
        WHEN f.identifiant_famille = 'FAM016' THEN 'LAËTITIA MISSATOU'
        WHEN f.identifiant_famille = 'FAM017' THEN 'LAËTITIA OBAME'
        WHEN f.identifiant_famille = 'FAM018' THEN 'MANICIA THÉA'
        WHEN f.identifiant_famille = 'FAM019' THEN 'NANCY NZI'
        WHEN f.identifiant_famille = 'FAM020' THEN 'NASDÈNE KODIA'
        WHEN f.identifiant_famille = 'FAM021' THEN 'PATRICK BATSIAKA'
        WHEN f.identifiant_famille = 'FAM022' THEN 'PROSPER LEBA'
        WHEN f.identifiant_famille = 'FAM023' THEN 'ROCHELLE PASSI BEN'
        WHEN f.identifiant_famille = 'FAM024' THEN 'SERGE AMANY'
        WHEN f.identifiant_famille = 'FAM025' THEN 'SNELLA MOUSSIO'
        WHEN f.identifiant_famille = 'FAM026' THEN 'YVAN DESSANDE'
        ELSE NULL
      END as nom_superviseur_attendu
    FROM familles_disciples f
    WHERE f.superviseur_id IS NULL
  LOOP
    -- Si un nom de superviseur est attendu pour cette famille
    IF famille_record.nom_superviseur_attendu IS NOT NULL THEN
      -- Chercher le superviseur correspondant
      SELECT id INTO superviseur_uuid
      FROM profils
      WHERE role = 'superviseur'
        AND (
          LOWER(TRIM(first_name || ' ' || last_name)) = LOWER(TRIM(famille_record.nom_superviseur_attendu)) OR
          LOWER(TRIM(last_name || ' ' || first_name)) = LOWER(TRIM(famille_record.nom_superviseur_attendu)) OR
          LOWER(TRIM(first_name || ' ' || last_name)) LIKE LOWER('%' || famille_record.nom_superviseur_attendu || '%')
        )
        AND NOT EXISTS (
          SELECT 1 FROM familles_disciples WHERE superviseur_id = profils.id
        )
      LIMIT 1;

      -- Si un superviseur a été trouvé et qu'il n'a pas déjà de famille
      IF superviseur_uuid IS NOT NULL THEN
        UPDATE familles_disciples
        SET superviseur_id = superviseur_uuid,
            updated_at = NOW()
        WHERE id = famille_record.famille_id;
        
        matched_count := matched_count + 1;
        RAISE NOTICE '✅ Famille % (%) assignée à superviseur %', 
          famille_record.nom_famille, 
          famille_record.identifiant_famille, 
          superviseur_uuid;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ % famille(s) assignée(s)', matched_count;
END $$;

-- 5. Vérification finale : Compter les superviseurs avec famille
SELECT 
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur') as total_superviseurs,
    (SELECT COUNT(DISTINCT superviseur_id) FROM familles_disciples WHERE superviseur_id IS NOT NULL) as total_familles_avec_superviseur,
    (SELECT COUNT(*) FROM familles_disciples) as total_familles,
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND NOT EXISTS (
      SELECT 1 FROM familles_disciples WHERE superviseur_id = profils.id
    )) as superviseurs_sans_famille,
    (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id IS NULL) as familles_sans_superviseur;
