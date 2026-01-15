-- ============================================
-- Script pour assigner les superviseurs aux familles
-- Objectif: Mettre à jour les superviseur_id dans familles_disciples
-- ============================================

-- ⚠️ IMPORTANT : 
-- Ce script nécessite que les comptes superviseurs existent dans la table profils
-- Avant d'exécuter ce script, assurez-vous d'avoir créé les comptes utilisateurs pour les superviseurs

-- Option 1 : Assignation automatique par recherche de nom (approximatif)
-- Cette méthode fonctionne si les noms dans profils correspondent aux noms des superviseurs
DO $$
DECLARE
  famille_record RECORD;
  superviseur_uuid UUID;
  superviseurs_map JSONB := '{
    "Alain SIL": "Alain SIL",
    "Andréa ERNEST": "Andréa ERNEST",
    "Béraca KAZONGO": "Béraca KAZONGO",
    "BETSALEEL BADILA": "BETSALEEL BADILA",
    "CARINE MATONDO": "CARINE MATONDO",
    "COCO OKANZI": "COCO OKANZI",
    "CYNTHIA ALLOH": "CYNTHIA ALLOH",
    "David SERVA": "David SERVA",
    "ELISABETH AMECY": "ELISABETH AMECY",
    "EPHREM MBA": "EPHREM MBA",
    "GERVAIS NKATOULOULOU": "GERVAIS NKATOULOULOU",
    "HÉLÈNE LAMAGO": "HÉLÈNE LAMAGO",
    "JOCELYNE FORTUNE": "JOCELYNE FORTUNE",
    "KARINE WILLIAM": "KARINE WILLIAM",
    "KEVIN THÉA": "KEVIN THÉA",
    "LAËTITIA MISSATOU": "LAËTITIA MISSATOU",
    "LAËTITIA OBAME": "LAËTITIA OBAME",
    "MANICIA THÉA": "MANICIA THÉA",
    "NANCY NZI": "NANCY NZI",
    "NASDÈNE KODIA": "NASDÈNE KODIA",
    "PATRICK BATSIAKA": "PATRICK BATSIAKA",
    "PROSPER LEBA": "PROSPER LEBA",
    "ROCHELLE PASSI BEN": "ROCHELLE PASSI BEN",
    "SERGE AMANY": "SERGE AMANY",
    "SNELLA MOUSSIO": "SNELLA MOUSSIO",
    "YVAN DESSANDE": "YVAN DESSANDE"
  }'::JSONB;
BEGIN
  -- Pour chaque famille, chercher et assigner le superviseur
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
        WHEN f.identifiant_famille = 'FAM009' THEN 'ELISABETH AMECY'
        WHEN f.identifiant_famille = 'FAM010' THEN 'EPHREM MBA'
        WHEN f.identifiant_famille = 'FAM011' THEN 'GERVAIS NKATOULOULOU'
        WHEN f.identifiant_famille = 'FAM012' THEN 'HÉLÈNE LAMAGO'
        WHEN f.identifiant_famille = 'FAM013' THEN 'HÉLÈNE LAMAGO'
        WHEN f.identifiant_famille = 'FAM014' THEN 'JOCELYNE FORTUNE'
        WHEN f.identifiant_famille = 'FAM015' THEN 'KARINE WILLIAM'
        WHEN f.identifiant_famille = 'FAM016' THEN 'KEVIN THÉA'
        WHEN f.identifiant_famille = 'FAM017' THEN 'LAËTITIA MISSATOU'
        WHEN f.identifiant_famille = 'FAM018' THEN 'LAËTITIA OBAME'
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
    -- Chercher le superviseur par nom (recherche flexible)
    SELECT id INTO superviseur_uuid
    FROM profils
    WHERE (
      -- Recherche par nom complet (first_name + last_name)
      LOWER(TRIM(first_name || ' ' || last_name)) = LOWER(TRIM(famille_record.nom_superviseur))
      OR LOWER(TRIM(last_name || ' ' || first_name)) = LOWER(TRIM(famille_record.nom_superviseur))
      -- Recherche par nom de famille seulement
      OR LOWER(TRIM(last_name)) = LOWER(TRIM(SPLIT_PART(famille_record.nom_superviseur, ' ', 2)))
      -- Recherche partielle
      OR LOWER(first_name || ' ' || last_name) LIKE LOWER('%' || famille_record.nom_superviseur || '%')
    )
    AND role IN ('superviseur', 'admin', 'super_admin', 'pasteur')
    LIMIT 1;
    
    -- Mettre à jour la famille si un superviseur a été trouvé
    IF superviseur_uuid IS NOT NULL THEN
      UPDATE familles_disciples
      SET superviseur_id = superviseur_uuid,
          updated_at = NOW()
      WHERE id = famille_record.famille_id;
      
      RAISE NOTICE 'Famille % (%) : Superviseur % assigné', 
        famille_record.identifiant_famille, 
        famille_record.nom_famille,
        famille_record.nom_superviseur;
    ELSE
      RAISE NOTICE 'Famille % (%) : Superviseur % non trouvé dans profils', 
        famille_record.identifiant_famille, 
        famille_record.nom_famille,
        famille_record.nom_superviseur;
    END IF;
  END LOOP;
END $$;

-- Vérification après assignation
SELECT 
  COUNT(*) FILTER (WHERE superviseur_id IS NOT NULL) as familles_avec_superviseur,
  COUNT(*) FILTER (WHERE superviseur_id IS NULL) as familles_sans_superviseur,
  COUNT(*) as total_familles
FROM familles_disciples;

-- Afficher les familles toujours sans superviseur
SELECT 
  identifiant_famille,
  nom,
  '❌ Superviseur non trouvé - Assignation manuelle requise' as statut
FROM familles_disciples
WHERE superviseur_id IS NULL
ORDER BY identifiant_famille;

