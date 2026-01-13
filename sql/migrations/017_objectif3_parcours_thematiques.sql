-- ============================================
-- OBJECTIF 3: Insertion des parcours et modules de transformation
-- Basé sur les thématiques fournies
-- ============================================

-- 1. PARCOURS: Guérison des coeurs brisés
INSERT INTO parcours_transformation (nom, description, thematique, duree_jours, niveau, objectifs, statut, ordre_affichage, categorie)
VALUES (
  'Guérison des Cœurs Brisés',
  'Un parcours complet pour guérir les blessures du cœur et retrouver la paix intérieure en Jésus-Christ.',
  'Jésus guérit les coeurs brisés',
  21,
  'debutant',
  '[
    {"objectif": "Comprendre comment Jésus guérit les cœurs brisés", "points": 1},
    {"objectif": "Identifier les blessures personnelles", "points": 2},
    {"objectif": "Appliquer les principes de guérison bibliques", "points": 3},
    {"objectif": "Expérimenter la restauration divine", "points": 4}
  ]'::jsonb,
  'actif',
  1,
  'restauration_ame'
) ON CONFLICT DO NOTHING;

-- Modules pour "Guérison des Cœurs Brisés"
INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Jésus guérit les cœurs brisés',
  'Découvrez comment Jésus-Christ est venu pour guérir les cœurs brisés et restaurer votre vie.',
  '## Jésus guérit les cœurs brisés

Jésus-Christ est venu sur terre pour guérir les cœurs brisés. Dans Ésaïe 61:1, il est écrit : "L''Esprit du Seigneur, l''Éternel, est sur moi, Car l''Éternel m''a oint pour porter de bonnes nouvelles aux malheureux; Il m''a envoyé pour guérir ceux qui ont le cœur brisé."

### Points clés :
- Jésus comprend votre douleur
- Il a le pouvoir de guérir
- La guérison est un processus
- Vous n''êtes pas seul dans cette épreuve

### Versets bibliques :
- Psaume 34:18 - "L''Éternel est près de ceux qui ont le cœur brisé"
- Psaume 147:3 - "Il guérit ceux qui ont le cœur brisé"
- Luc 4:18 - "Il m''a envoyé pour guérir ceux qui ont le cœur brisé"',
  'texte',
  20,
  1,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Jésus guérit les coeurs brisés'
ON CONFLICT DO NOTHING;

INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Comment guérir un cœur brisé ?',
  'Les étapes pratiques pour expérimenter la guérison de votre cœur.',
  '## Comment guérir un cœur brisé ?

### Étapes de guérison :

1. **Reconnaître la blessure**
   - Admettre votre douleur
   - Identifier la source de la blessure
   - Accepter que vous avez besoin de guérison

2. **Apporter votre cœur à Jésus**
   - Confier votre douleur à Dieu
   - Lui permettre de toucher votre cœur
   - Croire en Sa puissance de guérison

3. **Pardonner**
   - Pardonner à ceux qui vous ont blessé
   - Pardonner à vous-même
   - Recevoir le pardon de Dieu

4. **Renouveler votre pensée**
   - Méditer sur les promesses de Dieu
   - Remplacer les pensées négatives par la Parole
   - Croire en votre identité en Christ

5. **Marcher dans la guérison**
   - Pratiquer la gratitude
   - Servir les autres
   - Partager votre témoignage',
  'texte',
  25,
  2,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Jésus guérit les coeurs brisés'
ON CONFLICT DO NOTHING;

-- 2. PARCOURS: Restauration des Finances
INSERT INTO parcours_transformation (nom, description, thematique, duree_jours, niveau, objectifs, statut, ordre_affichage, categorie)
VALUES (
  'Restauration et Prospérité Financière',
  'Découvrez les principes bibliques pour restaurer vos finances et prospérer selon la volonté de Dieu.',
  'Jesus restaure les Finances',
  30,
  'intermediaire',
  '[
    {"objectif": "Comprendre pourquoi Dieu veut que tu prospères", "points": 1},
    {"objectif": "Appliquer les principes bibliques de gestion financière", "points": 2},
    {"objectif": "Sortir des dettes et des pièges financiers", "points": 3},
    {"objectif": "Établir un plan de prospérité financière", "points": 4}
  ]'::jsonb,
  'actif',
  2,
  'finances'
) ON CONFLICT DO NOTHING;

-- Modules pour "Restauration des Finances"
INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Jésus restaure les Finances',
  'Découvrez comment Jésus peut restaurer vos finances selon Sa volonté.',
  '## Jésus restaure les Finances

Dieu veut restaurer tous les domaines de votre vie, y compris vos finances. La restauration financière fait partie du plan de Dieu pour votre vie.

### Principes de restauration :
- Dieu est votre pourvoyeur
- La restauration commence par l''obéissance
- La dîme et les offrandes ouvrent les écluses
- La sagesse divine pour gérer vos ressources',
  'texte',
  20,
  1,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Jesus restaure les Finances'
ON CONFLICT DO NOTHING;

INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Pourquoi Dieu veut que tu prospères dans tes finances ?',
  'Comprenez le cœur de Dieu concernant la prospérité financière.',
  '## Pourquoi Dieu veut que tu prospères dans tes finances ?

### Raisons bibliques :

1. **Pour bénir les autres**
   - 2 Corinthiens 9:8 - "Et Dieu peut vous combler de toutes sortes de grâces"
   - La prospérité vous permet de servir et bénir

2. **Pour accomplir votre destinée**
   - Dieu a un plan pour votre vie
   - Les finances sont un outil, pas une fin
   - La prospérité facilite l''accomplissement de votre appel

3. **Pour démontrer la gloire de Dieu**
   - Votre prospérité témoigne de la bonté de Dieu
   - Elle attire les autres vers Christ
   - Elle démontre la fidélité de Dieu

4. **Pour être libre**
   - La prospérité vous libère de l''inquiétude
   - Elle vous permet de vous concentrer sur l''essentiel
   - Elle vous donne la paix',
  'texte',
  25,
  2,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Jesus restaure les Finances'
ON CONFLICT DO NOTHING;

INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Comment prospérer dans mes finances ?',
  'Les étapes pratiques pour prospérer financièrement selon les principes bibliques.',
  '## Comment prospérer dans mes finances ?

### Principes pratiques :

1. **Donner avec générosité**
   - La dîme (10% de vos revenus)
   - Les offrandes au-delà de la dîme
   - Donner avec joie et foi

2. **Gérer sagement**
   - Établir un budget
   - Éviter les dettes inutiles
   - Épargner régulièrement

3. **Travailler avec excellence**
   - Colossiens 3:23 - "Tout ce que vous faites, faites-le de bon cœur"
   - L''excellence attire la prospérité
   - Honorer Dieu dans votre travail

4. **Investir dans le Royaume**
   - Soutenir l''œuvre de Dieu
   - Bénir les autres
   - Semer dans de bonnes terres

5. **Croire et déclarer**
   - Croire aux promesses de Dieu
   - Déclarer la prospérité sur votre vie
   - Attendre avec foi',
  'texte',
  30,
  3,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Jesus restaure les Finances'
ON CONFLICT DO NOTHING;

-- 3. PARCOURS: Libération et Victoire
INSERT INTO parcours_transformation (nom, description, thematique, duree_jours, niveau, objectifs, statut, ordre_affichage, categorie)
VALUES (
  'Libération et Victoire en Christ',
  'Apprenez à sortir des forteresses, crucifier la chair et marcher dans la liberté en Christ.',
  'Comment sortir des forteresses',
  28,
  'intermediaire',
  '[
    {"objectif": "Identifier les forteresses dans votre vie", "points": 1},
    {"objectif": "Comprendre comment crucifier la chair", "points": 2},
    {"objectif": "Pratiquer les armes spirituelles", "points": 3},
    {"objectif": "Marcher dans la liberté et la victoire", "points": 4}
  ]'::jsonb,
  'actif',
  3,
  'marcher_esprit'
) ON CONFLICT DO NOTHING;

-- Modules pour "Libération et Victoire"
INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Comment sortir des forteresses ?',
  'Découvrez comment identifier et détruire les forteresses spirituelles dans votre vie.',
  '## Comment sortir des forteresses ?

### Qu''est-ce qu''une forteresse ?

Une forteresse est une pensée, une habitude ou un système de croyances qui s''oppose à la connaissance de Dieu (2 Corinthiens 10:4-5).

### Types de forteresses :
- Pensées négatives et mensonges
- Habitudes destructrices
- Liens avec le passé
- Peurs et anxiétés
- Addictions et dépendances

### Comment les détruire :

1. **Identifier la forteresse**
   - Examiner votre vie
   - Identifier les patterns destructeurs
   - Reconnaître les mensonges

2. **Utiliser les armes spirituelles**
   - La Parole de Dieu
   - La prière
   - Le jeûne
   - L''adoration

3. **Renouveler votre pensée**
   - Remplacer les mensonges par la vérité
   - Méditer sur la Parole
   - Croire en votre identité en Christ

4. **Marcher dans la liberté**
   - Pratiquer la discipline
   - Demander de l''aide
   - Rester connecté à Dieu',
  'texte',
  25,
  1,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Comment sortir des forteresses'
ON CONFLICT DO NOTHING;

INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Comment crucifier la chair ?',
  'Apprenez à crucifier la chair et marcher selon l''Esprit.',
  '## Comment crucifier la chair ?

### Qu''est-ce que la chair ?

La chair représente notre nature pécheresse, nos désirs charnels qui s''opposent à l''Esprit (Galates 5:17).

### Pourquoi crucifier la chair ?

- Pour marcher selon l''Esprit
- Pour vivre la vie abondante
- Pour plaire à Dieu
- Pour accomplir votre destinée

### Comment crucifier la chair :

1. **Reconnaître la chair**
   - Identifier les œuvres de la chair (Galates 5:19-21)
   - Admettre votre besoin
   - Décider de changer

2. **Marcher selon l''Esprit**
   - Cultiver le fruit de l''Esprit (Galates 5:22-23)
   - Méditer la Parole quotidiennement
   - Prier sans cesse

3. **Pratiquer la discipline**
   - Le jeûne
   - La prière
   - L''adoration
   - La communion fraternelle

4. **Renouveler votre esprit**
   - Remplacer les pensées charnelles
   - Fixer vos yeux sur Jésus
   - Vivre par la foi',
  'texte',
  30,
  2,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Comment sortir des forteresses'
ON CONFLICT DO NOTHING;

-- 4. PARCOURS: Suivre Jésus
INSERT INTO parcours_transformation (nom, description, thematique, duree_jours, niveau, objectifs, statut, ordre_affichage, categorie)
VALUES (
  'Suivre Jésus : Le Disciple Authentique',
  'Découvrez pourquoi et comment suivre Jésus, devenir un disciple authentique et avoir le cœur de Dieu.',
  'Pourquoi et Comment suivre Jésus ?',
  35,
  'debutant',
  '[
    {"objectif": "Comprendre pourquoi suivre Jésus", "points": 1},
    {"objectif": "Apprendre comment suivre Jésus", "points": 2},
    {"objectif": "Comprendre ce qu''est un disciple de Christ", "points": 3},
    {"objectif": "Développer le cœur de Dieu", "points": 4},
    {"objectif": "Apprendre à faire des disciples", "points": 5}
  ]'::jsonb,
  'actif',
  4,
  'discipolat'
) ON CONFLICT DO NOTHING;

-- Modules pour "Suivre Jésus"
INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Pourquoi et Comment suivre Jésus ?',
  'Découvrez les raisons et les moyens de suivre Jésus-Christ.',
  '## Pourquoi et Comment suivre Jésus ?

### Pourquoi suivre Jésus ?

1. **Il est le chemin, la vérité et la vie** (Jean 14:6)
   - Aucun autre chemin vers le Père
   - Il est la vérité absolue
   - Il donne la vie éternelle

2. **Il vous aime**
   - Il a donné Sa vie pour vous
   - Il veut votre bien
   - Il a un plan pour votre vie

3. **Il vous libère**
   - Du péché et de la condamnation
   - De la peur et de l''anxiété
   - De l''esclavage

### Comment suivre Jésus ?

1. **L''accepter comme Seigneur et Sauveur**
   - Croire en Lui
   - Se repentir de vos péchés
   - Lui donner votre vie

2. **Prendre votre croix**
   - Renoncer à vous-même
   - Le suivre quotidiennement
   - Lui obéir

3. **Marcher avec Lui**
   - La prière quotidienne
   - La lecture de la Parole
   - La communion avec Lui',
  'texte',
  25,
  1,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Pourquoi et Comment suivre Jésus ?'
ON CONFLICT DO NOTHING;

INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Comment aimer Dieu ?',
  'Apprenez à aimer Dieu de tout votre cœur, de toute votre âme et de toute votre force.',
  '## Comment aimer Dieu ?

### Le plus grand commandement :

"Tu aimeras le Seigneur, ton Dieu, de tout ton cœur, de toute ton âme, et de toute ta pensée." (Matthieu 22:37)

### Comment aimer Dieu :

1. **Avec tout votre cœur**
   - Lui donner la première place
   - L''adorer sincèrement
   - Lui faire confiance

2. **Avec toute votre âme**
   - Lui consacrer votre vie
   - Le servir avec passion
   - Vivre pour Sa gloire

3. **Avec toute votre pensée**
   - Méditer Sa Parole
   - Penser à Lui constamment
   - Renouveler votre pensée

4. **Avec toute votre force**
   - Le servir de tout votre être
   - Donner le meilleur de vous-même
   - Ne rien réserver

### Expressions de l''amour pour Dieu :
- L''adoration et la louange
- L''obéissance à Sa Parole
- Le service et le ministère
- L''amour pour les autres',
  'texte',
  20,
  2,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Pourquoi et Comment suivre Jésus ?'
ON CONFLICT DO NOTHING;

INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'C''est quoi le Royaume de Dieu ?',
  'Comprenez ce qu''est le Royaume de Dieu et comment y entrer.',
  '## C''est quoi le Royaume de Dieu ?

### Définition :

Le Royaume de Dieu est le règne et la souveraineté de Dieu sur toutes choses. C''est là où la volonté de Dieu est faite parfaitement.

### Caractéristiques du Royaume :

1. **Il est spirituel**
   - "Le royaume de Dieu est au dedans de vous" (Luc 17:21)
   - Il commence dans votre cœur
   - Il se manifeste par l''Esprit

2. **Il est éternel**
   - Il ne passera jamais
   - Il est établi pour toujours
   - Il est votre héritage

3. **Il est puissant**
   - "Le royaume de Dieu ne consiste pas en paroles, mais en puissance" (1 Corinthiens 4:20)
   - Guérison et délivrance
   - Transformation et restauration

### Comment entrer dans le Royaume ?

1. **Naître de nouveau** (Jean 3:3)
   - Accepter Jésus-Christ
   - Recevoir le Saint-Esprit
   - Vivre selon l''Esprit

2. **Chercher le Royaume en premier** (Matthieu 6:33)
   - Donner la priorité à Dieu
   - Chercher Sa justice
   - Tout le reste vous sera donné

3. **Vivre comme citoyen du Royaume**
   - Marcher selon les valeurs du Royaume
   - Servir le Roi
   - Proclamer le Royaume',
  'texte',
  25,
  3,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Pourquoi et Comment suivre Jésus ?'
ON CONFLICT DO NOTHING;

INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Qu''est-ce qu''un disciple de Christ ?',
  'Découvrez ce que signifie être un disciple authentique de Jésus-Christ.',
  '## Qu''est-ce qu''un disciple de Christ ?

### Définition :

Un disciple est un élève, un apprenant qui suit son maître pour devenir comme lui. Un disciple de Christ suit Jésus pour devenir comme Lui.

### Caractéristiques d''un disciple :

1. **Il suit Jésus**
   - Il marche avec Jésus quotidiennement
   - Il apprend de Lui
   - Il Lui obéit

2. **Il renonce à lui-même**
   - Il prend sa croix
   - Il meurt à lui-même
   - Il vit pour Christ

3. **Il aime les autres**
   - Il aime comme Jésus aime
   - Il sert les autres
   - Il pardonne

4. **Il porte du fruit**
   - Le fruit de l''Esprit
   - Des âmes gagnées
   - Une vie transformée

5. **Il fait des disciples**
   - Il enseigne les autres
   - Il les forme
   - Il les envoie

### Engagement du disciple :
- Suivre Jésus quotidiennement
- Apprendre de Sa Parole
- Obéir à Ses commandements
- Servir et aimer les autres',
  'texte',
  30,
  4,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Pourquoi et Comment suivre Jésus ?'
ON CONFLICT DO NOTHING;

INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Comment avoir le cœur de Dieu ?',
  'Apprenez à développer le cœur de Dieu pour les autres et pour le monde.',
  '## Comment avoir le cœur de Dieu ?

### Le cœur de Dieu :

Le cœur de Dieu est rempli d''amour, de compassion, de miséricorde et de grâce pour tous.

### Caractéristiques du cœur de Dieu :

1. **Amour inconditionnel**
   - Aimer comme Dieu aime
   - Aimer vos ennemis
   - Aimer sans condition

2. **Compassion**
   - Ressentir la douleur des autres
   - Être touché par leurs besoins
   - Agir avec miséricorde

3. **Passion pour les âmes**
   - Désirer que tous soient sauvés
   - Prier pour les perdus
   - Partager l''évangile

4. **Serviteur**
   - Servir humblement
   - Donner sans attendre
   - Se sacrifier pour les autres

### Comment développer le cœur de Dieu :

1. **Passer du temps avec Lui**
   - La prière et l''adoration
   - La méditation de Sa Parole
   - La communion avec Lui

2. **Demander le cœur de Dieu**
   - Prier pour avoir Son cœur
   - Lui demander de vous transformer
   - Lui permettre de vous façonner

3. **Pratiquer l''amour**
   - Aimer les autres concrètement
   - Servir ceux dans le besoin
   - Pardonner comme Dieu pardonne

4. **Voir comme Dieu voit**
   - Voir les gens avec les yeux de Dieu
   - Voir leur potentiel
   - Voir leur valeur',
  'texte',
  25,
  5,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Pourquoi et Comment suivre Jésus ?'
ON CONFLICT DO NOTHING;

INSERT INTO modules_parcours (parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, statut)
SELECT 
  p.id,
  'Comment faire des disciples de Christ ?',
  'Apprenez à faire des disciples selon le modèle de Jésus.',
  '## Comment faire des disciples de Christ ?

### Le mandat de Jésus :

"Allez, faites de toutes les nations des disciples" (Matthieu 28:19)

### Étapes pour faire des disciples :

1. **Évangéliser**
   - Partager l''évangile
   - Présenter Jésus-Christ
   - Inviter à la repentance

2. **Baptiser**
   - Baptiser dans l''eau
   - Baptiser dans le Saint-Esprit
   - Intégrer dans l''église

3. **Enseigner**
   - Enseigner la Parole de Dieu
   - Transmettre les principes bibliques
   - Former à la vie chrétienne

4. **Former**
   - Modéliser la vie chrétienne
   - Accompagner dans la croissance
   - Corriger avec amour

5. **Envoyer**
   - Les équiper pour le ministère
   - Les libérer pour servir
   - Les envoyer faire des disciples

### Principes de discipulat :

- Relation personnelle
- Enseignement pratique
- Modélisation
- Responsabilisation
- Multiplication',
  'texte',
  30,
  6,
  'actif'
FROM parcours_transformation p
WHERE p.thematique = 'Pourquoi et Comment suivre Jésus ?'
ON CONFLICT DO NOTHING;

-- Vérification finale
DO $$
DECLARE
  parcours_count INTEGER;
  modules_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO parcours_count FROM parcours_transformation WHERE statut = 'actif';
  SELECT COUNT(*) INTO modules_count FROM modules_parcours WHERE statut = 'actif';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PARCOURS ET MODULES INSÉRÉS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Parcours actifs: %', parcours_count;
  RAISE NOTICE 'Modules actifs: %', modules_count;
  RAISE NOTICE '========================================';
END $$;

