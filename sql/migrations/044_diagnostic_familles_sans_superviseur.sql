-- ============================================
-- Script de diagnostic : Identifier les 3 familles sans superviseur
-- Objectif: Trouver quelles familles n'ont pas de superviseur et pourquoi
-- ============================================

-- 1. Identifier les 3 familles sans superviseur
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
  f.superviseur_id,
  f.created_at
FROM familles_disciples f
WHERE f.superviseur_id IS NULL
ORDER BY f.identifiant_famille;

-- 2. Vérifier si les superviseurs attendus existent dans la table profils
-- Pour les 3 familles identifiées ci-dessus, chercher leurs superviseurs
SELECT 
  'Superviseurs attendus pour les familles sans superviseur' as info,
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
  p.id as superviseur_trouve_id,
  p.first_name || ' ' || p.last_name as nom_superviseur_trouve,
  p.email as email_superviseur,
  p.role as role_superviseur,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ Trouvé'
    ELSE '❌ Non trouvé'
  END as statut
FROM familles_disciples f
LEFT JOIN profils p ON (
  LOWER(TRIM(p.first_name || ' ' || p.last_name)) = LOWER(TRIM(
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
    END
  ))
  OR LOWER(TRIM(p.last_name || ' ' || p.first_name)) = LOWER(TRIM(
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
    END
  ))
  AND p.role = 'superviseur'
WHERE f.superviseur_id IS NULL
ORDER BY f.identifiant_famille;

-- 3. Recherche flexible pour trouver les superviseurs manquants
-- Chercher des correspondances partielles dans profils
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
  p.id as candidat_id,
  p.first_name || ' ' || p.last_name as candidat_nom,
  p.email as candidat_email,
  p.role as candidat_role
FROM familles_disciples f
LEFT JOIN profils p ON (
  -- Recherche flexible par nom de famille
  LOWER(TRIM(SPLIT_PART(
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
    END, ' ', 2
  ))) = LOWER(TRIM(p.last_name))
  OR LOWER(TRIM(SPLIT_PART(
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
    END, ' ', 1
  ))) = LOWER(TRIM(p.first_name))
)
WHERE f.superviseur_id IS NULL
ORDER BY f.identifiant_famille, p.id;

-- 4. Liste tous les superviseurs disponibles dans profils
SELECT 
  'Superviseurs disponibles dans profils' as info,
  id,
  first_name || ' ' || last_name as nom_complet,
  email,
  role,
  created_at
FROM profils
WHERE role = 'superviseur'
ORDER BY last_name, first_name;
