/**
 * Script pour générer un fichier CSV avec les informations des Pasteurs et Superviseurs
 * 
 * Usage: node scripts/generate_csv.js
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Liste des 4 pasteurs
const pasteurs = [
  {
    identifiant_unique: 'PASTEUR-001',
    first_name: 'DR',
    last_name: 'MODE',
    email: 'dr.mode@disciplelife.com',
    password: 'Pasteur001!2024',
    role: 'pasteur'
  },
  {
    identifiant_unique: 'PASTEUR-002',
    first_name: 'PS',
    last_name: 'JULIANA',
    email: 'ps.juliana@disciplelife.com',
    password: 'Pasteur002!2024',
    role: 'pasteur'
  },
  {
    identifiant_unique: 'PASTEUR-003',
    first_name: 'PS',
    last_name: 'PEGGY NN',
    email: 'ps.peggy.nn@disciplelife.com',
    password: 'Pasteur003!2024',
    role: 'pasteur'
  },
  {
    identifiant_unique: 'PASTEUR-004',
    first_name: 'PS',
    last_name: 'JESSY',
    email: 'ps.jessy@disciplelife.com',
    password: 'Pasteur004!2024',
    role: 'pasteur'
  }
];

// Liste des 26 superviseurs
const superviseurs = [
  { familleId: 'FAM001', prenom: 'Alain', nom: 'SIL', email: 'alain.sil@example.com' },
  { familleId: 'FAM002', prenom: 'Andréa', nom: 'ERNEST', email: 'andrea.ernest@example.com' },
  { familleId: 'FAM003', prenom: 'Béraca', nom: 'KAZONGO', email: 'beraca.kazongo@example.com' },
  { familleId: 'FAM004', prenom: 'BETSALEEL', nom: 'BADILA', email: 'betsaleel.badila@example.com' },
  { familleId: 'FAM005', prenom: 'CARINE', nom: 'MATONDO', email: 'carine.matondo@example.com' },
  { familleId: 'FAM006', prenom: 'COCO', nom: 'OKANZI', email: 'coco.okanzi@example.com' },
  { familleId: 'FAM007', prenom: 'CYNTHIA', nom: 'ALLOH', email: 'cynthia.alloh@example.com' },
  { familleId: 'FAM008', prenom: 'ELISABETH', nom: 'AMECY', email: 'elisabeth.amecy@example.com' },
  { familleId: 'FAM009', prenom: 'Andréa', nom: 'Ernest', email: 'andrea.ernest2@example.com' },
  { familleId: 'FAM010', prenom: 'EPHREM', nom: 'MBA', email: 'ephrem.mba@example.com' },
  { familleId: 'FAM011', prenom: 'GERVAIS', nom: 'NKATOULOULOU', email: 'gervais.nkatouloulou@example.com' },
  { familleId: 'FAM012', prenom: 'Andréa', nom: 'Ernest', email: 'andrea.ernest3@example.com' },
  { familleId: 'FAM013', prenom: 'HÉLÈNE', nom: 'LAMAGO', email: 'helene.lamago@example.com' },
  { familleId: 'FAM014', prenom: 'JOCELYNE', nom: 'FORTUNE', email: 'jocelyne.fortune@example.com' },
  { familleId: 'FAM015', prenom: 'KARINE', nom: 'WILLIAM', email: 'karine.william@example.com' },
  { familleId: 'FAM016', prenom: 'KEVIN', nom: 'THÉA', email: 'kevin.thea@example.com' },
  { familleId: 'FAM017', prenom: 'LAETITIA', nom: 'OBAME', email: 'laetitia.obame@example.com' },
  { familleId: 'FAM018', prenom: 'MANICIA', nom: 'THÉA', email: 'manicia.thea@example.com' },
  { familleId: 'FAM019', prenom: 'NANCY', nom: 'NZI', email: 'nancy.nzi@example.com' },
  { familleId: 'FAM020', prenom: 'NASDÈNE', nom: 'KODIA', email: 'nasdene.kodia@example.com' },
  { familleId: 'FAM021', prenom: 'PATRICK', nom: 'BATSIAGA', email: 'patrick.batsiaga@example.com' },
  { familleId: 'FAM022', prenom: 'PROSPERE', nom: 'LEBA', email: 'prospere.leba@example.com' },
  { familleId: 'FAM023', prenom: 'ROCHELLE', nom: 'PASSI BEN', email: 'rochelle.passiben@example.com' },
  { familleId: 'FAM024', prenom: 'SERGE', nom: 'AMANY', email: 'serge.amany@example.com' },
  { familleId: 'FAM025', prenom: 'SNELLA', nom: 'MOUSSIO', email: 'snella.moussio@example.com' },
  { familleId: 'FAM026', prenom: 'YVAN', nom: 'DESSANDE', email: 'yvan.dessande@example.com' }
];

const TEMPORARY_PASSWORD = 'TempPassword123!';

// Fonction pour échapper les valeurs CSV
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  // Si la valeur contient une virgule, des guillemets ou un saut de ligne, l'entourer de guillemets
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// Générer le contenu CSV
let csvContent = 'ROLE,Identifiant,Prénom,Nom,Email,Mot de passe,Pasteur de tutelle\n';

// Ajouter les pasteurs
pasteurs.forEach(pasteur => {
  csvContent += [
    'Pasteur',
    escapeCSV(pasteur.identifiant_unique),
    escapeCSV(pasteur.first_name),
    escapeCSV(pasteur.last_name),
    escapeCSV(pasteur.email),
    escapeCSV(pasteur.password),
    'N/A'
  ].join(',') + '\n';
});

// Ajouter les superviseurs
superviseurs.forEach(superviseur => {
  csvContent += [
    'Superviseur',
    escapeCSV(superviseur.familleId || ''),
    escapeCSV(superviseur.prenom),
    escapeCSV(superviseur.nom),
    escapeCSV(superviseur.email),
    escapeCSV(TEMPORARY_PASSWORD),
    'À assigner'
  ].join(',') + '\n';
});

// Écrire le fichier CSV
const csvPath = join(__dirname, '..', 'liste_pasteurs_superviseurs.csv');
writeFileSync(csvPath, csvContent, 'utf8');

console.log('✅ Fichier CSV généré avec succès !');
console.log(`📁 Emplacement: ${csvPath}`);
console.log(`📊 Total Pasteurs: ${pasteurs.length}`);
console.log(`📊 Total Superviseurs: ${superviseurs.length}`);
