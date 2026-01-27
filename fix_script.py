#!/usr/bin/env python3
import re

# Lire le fichier
with open('sql/migrations/074_seed_donnees_test_completes_kpi_presence.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Ajouter gen_random_uuid() dans tous les INSERT INTO profils qui n'en ont pas
# Pattern: INSERT INTO profils (id, email, ... VALUES ( suivi de 'quelquechose
pattern = r"(INSERT INTO profils \(id, email, first_name, last_name, role, famille_id, mentor_id, created_at\)\s+VALUES \(\s+)(')"
replacement = r"\1gen_random_uuid(),\n      \2"
content = re.sub(pattern, replacement, content)

# 2. Pour les VALUES multi-lignes (gen_random_uuid(), déjà présent depuis nos corrections précédentes)
# Remplacer les autres VALUES simples qui commencent par ( suivi de '
pattern2 = r"(VALUES\s+)\(('[a-z]+\.)"
replacement2 = r"\1(gen_random_uuid(), \2"
content = re.sub(pattern2, replacement2, content)

# 3. Remplacer les noms africains par des noms français européens
noms_mapping = {
    # Mentors génération 1
    "'Pierre', 'EKOKO'": "'Pierre', 'MARTIN'",
    "pierre.ekoko": "pierre.martin",
    "'Grace', 'ONDONGO'": "'Sophie', 'BERNARD'",
    "grace.ondongo": "sophie.bernard",
    "'André', 'MINTSA'": "'André', 'DUBOIS'",
    "andre.mintsa": "andre.dubois",
    "'Esther', 'EYENE'": "'Isabelle', 'MERCIER'",
    "esther.eyene": "isabelle.mercier",
    "'Jacques', 'ONDO'": "'Jacques', 'PETIT'",
    "jacques.ondo": "jacques.petit",

    # Disciples simples génération 1
    "'Luc', 'MBA'": "'Luc', 'ROBERT'",
    "luc.mba": "luc.robert",
    "'Alice', 'EKANG'": "'Alice', 'LAURENT'",
    "alice.ekang": "alice.laurent",
    "'Martine', 'OWONO'": "'Martine', 'SIMON'",
    "martine.owono": "martine.simon",
    "'Joseph', 'BEKALE'": "'Joseph', 'MICHEL'",
    "joseph.bekale": "joseph.michel",
    "'Christine', 'MFOUBOU'": "'Christine', 'LEFEVRE'",
    "christine.mfoubou": "christine.lefevre",
    "'Daniel', 'NGUEMA'": "'Daniel', 'GARCIA'",
    "daniel.nguema": "daniel.garcia",
    "'Sandrine', 'MBADINGA'": "'Sandrine', 'ROUX'",
    "sandrine.mbadinga": "sandrine.roux",
    "'Éric', 'ANDEME'": "'Éric', 'MOREL'",
    "eric.andeme": "eric.morel",
    "'Valérie', 'MOUBAMBA'": "'Valérie', 'FOURNIER'",
    "valerie.moubamba": "valerie.fournier",
    "'Franck', 'NZIENGUI'": "'Franck', 'GIRARD'",
    "franck.nziengui": "franck.girard",

    # Génération 2
    "'Jean', 'MBIANDA'": "'Jean', 'DUPONT'",
    "jean.mbianda": "jean.dupont",
    "'David', 'AKONO'": "'David', 'MOREAU'",
    "david.akono": "david.moreau",
    "'Samuel', 'NTOUTOUME'": "'Samuel', 'LAMBERT'",
    "samuel.ntoutoume": "samuel.lambert",
    "'Ruth', 'MVONDO'": "'Julie', 'FONTAINE'",
    "ruth.mvondo": "julie.fontaine",
    "'Claire', 'OBAME'": "'Claire', 'ROUSSEAU'",
    "claire.obame": "claire.rousseau",
    "'Paul', 'ESSONO'": "'Paul', 'VINCENT'",
    "paul.essono": "paul.vincent",
    "'Sarah', 'ENGONE'": "'Sarah', 'CHEVALIER'",
    "sarah.engone": "sarah.chevalier",
    "'Patrick', 'NZAMBA'": "'Patrick', 'BONNET'",
    "patrick.nzamba": "patrick.bonnet",
    "'Marie', 'OBIANG'": "'Marie', 'BLANC'",
    "marie.obiang": "marie.blanc",
    "'Thomas', 'NKOGHE'": "'Thomas', 'MULLER'",
    "thomas.nkoghe": "thomas.muller",
    "'Rebecca', 'ANGO'": "'Rebecca', 'ROBIN'",
    "rebecca.ango": "rebecca.robin",

    # Génération 3
    "'Thierry', 'NGOMA'": "'Thierry', 'RENARD'",
    "thierry.ngoma": "thierry.renard",
    "'Nadine', 'OWONO'": "'Nadine', 'GIRAUD'",
    "nadine.owono": "nadine.giraud",
    "'Boris', 'AVOMO'": "'Boris', 'ANDRE'",
    "boris.avomo": "boris.andre",
    "'Melissa', 'BIBALOU'": "'Melissa', 'HENRY'",
    "melissa.bibalou": "melissa.henry",
    "'Kevin', 'MAPAGA'": "'Kevin', 'LOPEZ'",
    "kevin.mapaga": "kevin.lopez",

    # Génération 4
    "'Patricia', 'MOUITY'": "'Patricia', 'MARTINEZ'",
    "patricia.mouity": "patricia.martinez",
    "'Steve', 'MOUYOBI'": "'Steve', 'SANCHEZ'",
    "steve.mouyobi": "steve.sanchez",

    # Génération 5
    "'Benoît', 'NDONG'": "'Benoît', 'DUPUIS'",
    "benoit.ndong": "benoit.dupuis",
}

# Appliquer tous les remplacements
for old, new in noms_mapping.items():
    content = content.replace(old, new)

# Écrire le fichier corrigé
with open('sql/migrations/074_seed_donnees_test_completes_kpi_presence.sql', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fichier corrigé avec succès!")
print("- gen_random_uuid() ajouté partout")
print("- Noms français européens appliqués")
