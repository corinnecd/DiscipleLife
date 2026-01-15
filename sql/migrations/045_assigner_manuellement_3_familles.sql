-- ============================================
-- Script pour assigner manuellement les 3 familles restantes
-- Objectif: Assigner les superviseurs manquants après diagnostic
-- ============================================
-- 
-- ⚠️ INSTRUCTIONS:
-- 1. Exécutez d'abord 044_diagnostic_familles_sans_superviseur.sql pour identifier les 3 familles
-- 2. Identifiez les IDs des superviseurs manquants dans la table profils
-- 3. Remplacez les UUIDs ci-dessous par les vrais IDs des superviseurs
-- 4. Exécutez ce script pour assigner les superviseurs
--
-- ============================================

-- Exemple d'assignation manuelle (remplacez les UUIDs par les vrais IDs)
-- Pour trouver les IDs, exécutez:
-- SELECT id, first_name, last_name, email FROM profils WHERE role = 'superviseur' ORDER BY last_name;

-- FAM008 - LES TÉMOINS - David SERVA
-- UPDATE familles_disciples
-- SET superviseur_id = 'UUID_DE_DAVID_SERVA_ICI',
--     updated_at = NOW()
-- WHERE identifiant_famille = 'FAM008';

-- FAM009 - LES COMBATTANTS - ÉLISABETH AMECY
-- UPDATE familles_disciples
-- SET superviseur_id = 'UUID_DE_ELISABETH_AMECY_ICI',
--     updated_at = NOW()
-- WHERE identifiant_famille = 'FAM009';

-- FAM016 - LES VICTORIEUX - LAËTITIA MISSATOU
-- UPDATE familles_disciples
-- SET superviseur_id = 'UUID_DE_LAETITIA_MISSATOU_ICI',
--     updated_at = NOW()
-- WHERE identifiant_famille = 'FAM016';

-- ============================================
-- Script automatique avec recherche flexible
-- ============================================
-- Ce script essaie de trouver automatiquement les superviseurs manquants
-- en utilisant une recherche flexible sur les noms

DO $$
DECLARE
  famille_record RECORD;
  superviseur_uuid UUID;
  superviseur_nom TEXT;
BEGIN
  -- Pour chaque famille sans superviseur, essayer de trouver le superviseur
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
      END as nom_superviseur
    FROM familles_disciples f
    WHERE f.superviseur_id IS NULL
  LOOP
    superviseur_nom := famille_record.nom_superviseur;
    
    -- Recherche flexible du superviseur
    SELECT id INTO superviseur_uuid
    FROM profils
    WHERE (
      -- Recherche exacte (first_name + last_name)
      LOWER(TRIM(first_name || ' ' || last_name)) = LOWER(TRIM(superviseur_nom))
      OR LOWER(TRIM(last_name || ' ' || first_name)) = LOWER(TRIM(superviseur_nom))
      -- Recherche par nom de famille seulement
      OR LOWER(TRIM(last_name)) = LOWER(TRIM(SPLIT_PART(superviseur_nom, ' ', 2)))
      -- Recherche par prénom seulement
      OR LOWER(TRIM(first_name)) = LOWER(TRIM(SPLIT_PART(superviseur_nom, ' ', 1)))
      -- Recherche partielle (contient)
      OR LOWER(first_name || ' ' || last_name) LIKE LOWER('%' || SPLIT_PART(superviseur_nom, ' ', 1) || '%')
      OR LOWER(first_name || ' ' || last_name) LIKE LOWER('%' || SPLIT_PART(superviseur_nom, ' ', 2) || '%')
      OR LOWER(last_name) LIKE LOWER('%' || SPLIT_PART(superviseur_nom, ' ', 2) || '%')
      OR LOWER(first_name) LIKE LOWER('%' || SPLIT_PART(superviseur_nom, ' ', 1) || '%')
    )
    AND role = 'superviseur'
    LIMIT 1;
    
    -- Mettre à jour la famille si un superviseur a été trouvé
    IF superviseur_uuid IS NOT NULL THEN
      UPDATE familles_disciples
      SET superviseur_id = superviseur_uuid,
          updated_at = NOW()
      WHERE id = famille_record.famille_id;
      
      RAISE NOTICE '✅ Famille % (%) : Superviseur % assigné (ID: %)', 
        famille_record.identifiant_famille, 
        famille_record.nom_famille,
        superviseur_nom,
        superviseur_uuid;
    ELSE
      RAISE NOTICE '❌ Famille % (%) : Superviseur % NON TROUVÉ - Assignation manuelle requise', 
        famille_record.identifiant_famille, 
        famille_record.nom_famille,
        superviseur_nom;
    END IF;
  END LOOP;
END $$;

-- Vérification finale
SELECT 
  COUNT(*) FILTER (WHERE superviseur_id IS NOT NULL) as familles_avec_superviseur,
  COUNT(*) FILTER (WHERE superviseur_id IS NULL) as familles_sans_superviseur,
  COUNT(*) as total_familles
FROM familles_disciples;

-- Afficher les familles toujours sans superviseur (si il en reste)
SELECT 
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
  END as superviseur_attendu,
  '❌ Assignation manuelle requise' as statut
FROM familles_disciples f
WHERE f.superviseur_id IS NULL
ORDER BY f.identifiant_famille;
