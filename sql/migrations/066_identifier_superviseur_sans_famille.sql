-- ============================================
-- Migration: Identifier le superviseur sans famille
-- Objectif: Trouver quel superviseur n'a pas de famille assignée
-- Contexte: Il y a 1 superviseur sans famille, mais 0 familles sans superviseur
-- ============================================

-- 1. Identifier le superviseur sans famille avec tous ses détails
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.identifiant_unique,
    p.pasteur_id,
    (SELECT identifiant_unique FROM profils WHERE id = p.pasteur_id) as pasteur_identifiant,
    p.created_at,
    p.updated_at
FROM profils p
WHERE p.role = 'superviseur'
  AND NOT EXISTS (
    SELECT 1 
    FROM familles_disciples f 
    WHERE f.superviseur_id = p.id
  )
ORDER BY p.first_name, p.last_name;

-- 2. Afficher toutes les familles avec leur superviseur actuel
SELECT 
    f.id as famille_id,
    f.nom as famille_nom,
    f.identifiant_famille,
    f.superviseur_id,
    p.first_name || ' ' || p.last_name as superviseur_nom,
    p.identifiant_unique as superviseur_identifiant,
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
    END as superviseur_attendu
FROM familles_disciples f
LEFT JOIN profils p ON f.superviseur_id = p.id
ORDER BY f.identifiant_famille;

-- 3. Identifier les familles avec un superviseur qui ne correspond pas au superviseur attendu
SELECT 
    f.id as famille_id,
    f.nom as famille_nom,
    f.identifiant_famille,
    f.superviseur_id as superviseur_actuel_id,
    p_actuel.first_name || ' ' || p_actuel.last_name as superviseur_actuel_nom,
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
    END as superviseur_attendu
FROM familles_disciples f
LEFT JOIN profils p_actuel ON f.superviseur_id = p_actuel.id
WHERE f.superviseur_id IS NOT NULL
  AND (
    p_actuel.first_name || ' ' || p_actuel.last_name != 
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
    END
  )
ORDER BY f.identifiant_famille;

-- 4. Vérifier s'il y a des familles dupliquées ou des superviseurs dupliqués
SELECT 
    'FAMILLES AVEC MÊME SUPERVISEUR' as type,
    superviseur_id,
    COUNT(*) as nombre_familles,
    STRING_AGG(identifiant_famille, ', ' ORDER BY identifiant_famille) as familles
FROM familles_disciples
WHERE superviseur_id IS NOT NULL
GROUP BY superviseur_id
HAVING COUNT(*) > 1;
