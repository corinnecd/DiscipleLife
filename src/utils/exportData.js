/**
 * Utilitaires pour l'export de données en CSV et PDF
 */

/**
 * Convertit un tableau d'objets en CSV
 * @param {Array} data - Tableau d'objets à convertir
 * @param {Array} columns - Colonnes à inclure (optionnel)
 * @returns {string} - Chaîne CSV
 */
export const convertToCSV = (data, columns = null) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Si les colonnes ne sont pas spécifiées, utiliser toutes les clés du premier objet
  const headers = columns || Object.keys(data[0]);

  // Créer la ligne d'en-tête
  const csvHeaders = headers.join(',');

  // Créer les lignes de données
  const csvRows = data.map(row => {
    return headers.map(header => {
      let value = row[header];

      // Gérer les valeurs null/undefined
      if (value === null || value === undefined) {
        return '';
      }

      // Gérer les tableaux
      if (Array.isArray(value)) {
        value = value.join('; ');
      }

      // Gérer les objets
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }

      // Convertir en chaîne et échapper les guillemets
      value = String(value).replace(/"/g, '""');

      // Entourer de guillemets si la valeur contient une virgule, un retour à la ligne ou des guillemets
      if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        value = `"${value}"`;
      }

      return value;
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
};

/**
 * Télécharge un fichier CSV
 * @param {Array} data - Données à exporter
 * @param {string} filename - Nom du fichier (sans extension)
 * @param {Array} columns - Colonnes à inclure (optionnel)
 */
export const downloadCSV = (data, filename = 'export', columns = null) => {
  const csv = convertToCSV(data, columns);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM pour Excel
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exporte les suivis post-crise en CSV
 * @param {Array} suivis - Liste des suivis
 * @param {string} filename - Nom du fichier
 */
export const exportSuivisToCSV = (suivis, filename = 'suivis_post_crise') => {
  const columns = [
    'type_crise',
    'description',
    'gravite',
    'statut',
    'date_debut',
    'etat_actuel',
    'objectifs',
    'besoins_specifiques',
    'ressources_utilisees',
    'prochaine_action',
    'date_prochaine_action',
    'frequence_rappels',
    'notes',
    'created_at'
  ];

  const formattedData = suivis.map(suivi => ({
    type_crise: suivi.type_crise,
    description: suivi.description,
    gravite: suivi.gravite,
    statut: suivi.statut,
    date_debut: suivi.date_debut ? new Date(suivi.date_debut).toLocaleDateString('fr-FR') : '',
    etat_actuel: suivi.etat_actuel || '',
    objectifs: Array.isArray(suivi.objectifs) ? suivi.objectifs.join('; ') : '',
    besoins_specifiques: Array.isArray(suivi.besoins_specifiques) ? suivi.besoins_specifiques.join('; ') : '',
    ressources_utilisees: Array.isArray(suivi.ressources_utilisees) ? suivi.ressources_utilisees.join('; ') : '',
    prochaine_action: suivi.prochaine_action || '',
    date_prochaine_action: suivi.date_prochaine_action ? new Date(suivi.date_prochaine_action).toLocaleDateString('fr-FR') : '',
    frequence_rappels: suivi.frequence_rappels || '',
    notes: suivi.notes || '',
    created_at: new Date(suivi.created_at).toLocaleDateString('fr-FR')
  }));

  downloadCSV(formattedData, filename, columns);
};

/**
 * Exporte l'historique de guérison en CSV
 * @param {Array} historique - Liste de l'historique
 * @param {string} filename - Nom du fichier
 */
export const exportHistoriqueToCSV = (historique, filename = 'historique_guerison') => {
  const columns = [
    'date_suivi',
    'etat_mental',
    'etat_spirituel',
    'etat_physique',
    'progres_observes',
    'defis_rencontres',
    'victoires',
    'versets_bibliques',
    'prieres_exaucees',
    'actions_prises',
    'notes'
  ];

  const formattedData = historique.map(entry => ({
    date_suivi: new Date(entry.date_suivi).toLocaleDateString('fr-FR'),
    etat_mental: entry.etat_mental,
    etat_spirituel: entry.etat_spirituel,
    etat_physique: entry.etat_physique,
    progres_observes: entry.progres_observes || '',
    defis_rencontres: entry.defis_rencontres || '',
    victoires: entry.victoires || '',
    versets_bibliques: Array.isArray(entry.versets_bibliques) ? entry.versets_bibliques.join('; ') : '',
    prieres_exaucees: Array.isArray(entry.prieres_exaucees) ? entry.prieres_exaucees.join('; ') : '',
    actions_prises: Array.isArray(entry.actions_prises) ? entry.actions_prises.join('; ') : '',
    notes: entry.notes || ''
  }));

  downloadCSV(formattedData, filename, columns);
};

/**
 * Génère un rapport PDF simple (HTML to PDF via impression)
 * @param {string} title - Titre du rapport
 * @param {string} content - Contenu HTML du rapport
 */
export const generatePDFReport = (title, content) => {
  const printWindow = window.open('', '_blank');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 {
          color: #14b8a6;
          border-bottom: 2px solid #14b8a6;
          padding-bottom: 10px;
        }
        h2 {
          color: #0f766e;
          margin-top: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #14b8a6;
          color: white;
        }
        tr:nth-child(even) {
          background-color: #f2f2f2;
        }
        .stat-card {
          display: inline-block;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          margin: 10px;
          min-width: 150px;
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #14b8a6;
        }
        .stat-label {
          font-size: 14px;
          color: #666;
        }
        @media print {
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p><strong>Date du rapport :</strong> ${new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}</p>
      ${content}
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

/**
 * Génère un rapport PDF pour les suivis post-crise
 * @param {Array} suivis - Liste des suivis
 * @param {Object} stats - Statistiques globales
 */
export const exportSuivisToPDF = (suivis, stats = {}) => {
  const statsHTML = stats ? `
    <div style="margin: 20px 0;">
      <div class="stat-card">
        <div class="stat-value">${stats.totalSuivis || suivis.length}</div>
        <div class="stat-label">Total de suivis</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.suivisActifs || 0}</div>
        <div class="stat-label">Suivis actifs</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.suivisResolus || 0}</div>
        <div class="stat-label">Suivis résolus</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.tauxGuerison || 0}%</div>
        <div class="stat-label">Taux de guérison</div>
      </div>
    </div>
  ` : '';

  const tableRows = suivis.map(suivi => `
    <tr>
      <td>${suivi.type_crise}</td>
      <td>${suivi.description?.substring(0, 100) || ''}...</td>
      <td>${suivi.gravite}/10</td>
      <td>${suivi.statut}</td>
      <td>${suivi.date_debut ? new Date(suivi.date_debut).toLocaleDateString('fr-FR') : '-'}</td>
    </tr>
  `).join('');

  const content = `
    <h2>Statistiques globales</h2>
    ${statsHTML}
    
    <h2>Liste des suivis</h2>
    <table>
      <thead>
        <tr>
          <th>Type de crise</th>
          <th>Description</th>
          <th>Gravité</th>
          <th>Statut</th>
          <th>Date de début</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;

  generatePDFReport('Rapport de Suivi Post-Crise', content);
};

/**
 * Génère un rapport PDF pour l'historique de guérison
 * @param {Object} suivi - Suivi concerné
 * @param {Array} historique - Historique de guérison
 */
export const exportHistoriqueToPDF = (suivi, historique) => {
  const tableRows = historique.map(entry => `
    <tr>
      <td>${new Date(entry.date_suivi).toLocaleDateString('fr-FR')}</td>
      <td>${entry.etat_mental}/10</td>
      <td>${entry.etat_spirituel}/10</td>
      <td>${entry.etat_physique}/10</td>
      <td>${entry.progres_observes || '-'}</td>
    </tr>
  `).join('');

  const content = `
    <h2>Informations du suivi</h2>
    <p><strong>Type de crise :</strong> ${suivi.type_crise}</p>
    <p><strong>Description :</strong> ${suivi.description}</p>
    <p><strong>Gravité :</strong> ${suivi.gravite}/10</p>
    <p><strong>Statut :</strong> ${suivi.statut}</p>
    
    <h2>Historique de guérison</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>État mental</th>
          <th>État spirituel</th>
          <th>État physique</th>
          <th>Progrès observés</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;

  generatePDFReport(`Historique de Guérison - ${suivi.type_crise}`, content);
};

export default {
  convertToCSV,
  downloadCSV,
  exportSuivisToCSV,
  exportHistoriqueToCSV,
  generatePDFReport,
  exportSuivisToPDF,
  exportHistoriqueToPDF
};
