
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const ExportUtils = {
  exportToExcel: (data, filename, options = {}) => {
    try {
      if (!data || !data.length) {
        console.warn("No data to export");
        throw new Error("Aucune donnée à exporter");
      }

      const { 
        title = 'Export de données',
        description = '',
        author = 'DiscipleLife',
        additionalInfo = {}
      } = options;

      // Headers mapping for better column names
      const headerMapping = {
        'first_name': 'Prénom',
        'last_name': 'Nom',
        'name': 'Nom complet',
        'email': 'Email',
        'phone': 'Téléphone',
        'created_at': 'Date d\'inscription',
        'dateEntreeFamille': 'Disciple depuis le',
        'nombreDisciples': 'Nombre de Disciples',
        'statut': 'Statut',
        'statut_spirituel': 'Statut Spirituel',
        'role': 'Rôle',
        'affiliation': 'Est suivi par',
        'progression': 'Progression (%)',
        'formation_completed': 'Formations Terminées',
        'video_completed': 'Vidéos Terminées'
      };

      const headers = Object.keys(data[0]);
      if (!headers || headers.length === 0) {
        throw new Error("Aucune colonne trouvée dans les données");
      }

      // Format headers with mapping
      const formattedHeaders = headers.map(h => headerMapping[h] || h);

      // Build CSV with header info
      const csvLines = [];
      
      // Header section
      csvLines.push(`"${title}"`);
      if (description) {
        csvLines.push(`"${description}"`);
      }
      csvLines.push(`"Date d'export: ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}"`);
      csvLines.push(`"Auteur: ${author}"`);
      
      // Additional info
      Object.entries(additionalInfo).forEach(([key, value]) => {
        csvLines.push(`"${key}: ${value}"`);
      });
      
      csvLines.push(''); // Empty line
      
      // Column headers
      csvLines.push(formattedHeaders.join(','));
      
      // Data rows
      data.forEach(row => {
        csvLines.push(
          headers.map(header => {
            let cell = row[header];
            
            // Format dates
            if (cell && (header === 'created_at' || header === 'dateEntreeFamille' || header.includes('date'))) {
              try {
                cell = format(new Date(cell), 'dd/MM/yyyy', { locale: fr });
              } catch (e) {
                cell = cell;
              }
            }
            
            // Handle null/undefined
            if (cell === null || cell === undefined) {
              cell = '';
            }
            
            // Escape quotes and wrap in quotes
            const stringCell = String(cell).replace(/"/g, '""');
            return `"${stringCell}"`;
          }).join(',')
        );
      });
      
      // Footer
      csvLines.push('');
      csvLines.push(`"Total d'enregistrements: ${data.length}"`);
      csvLines.push(`"Généré par DiscipleLife - ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}"`);

      const csvContent = csvLines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `${filename}_${format(new Date(), 'yyyy-MM-dd_HH-mm', { locale: fr })}.csv`);
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      throw error;
    }
  },

  exportElementToPDF: async (elementId, filename, options = {}) => {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    const {
      title = 'Export de données',
      subtitle = '',
      author = 'DiscipleLife',
      showHeader = true,
      showFooter = true,
      logoUrl = null,
      additionalInfo = {}
    } = options;

    try {
      // Fonction pour extraire la couleur principale d'un gradient
      const getGradientColor = (classes) => {
        // Extraire la couleur du gradient depuis les classes Tailwind
        if (classes.includes('from-indigo-600') || classes.includes('to-indigo-800') || classes.includes('indigo')) return '#4f46e5';
        if (classes.includes('from-blue-600') || classes.includes('to-blue-800') || classes.includes('blue')) return '#2563eb';
        if (classes.includes('from-cyan-600') || classes.includes('to-cyan-800') || classes.includes('cyan')) return '#0891b2';
        if (classes.includes('from-amber-600') || classes.includes('to-amber-800') || classes.includes('amber')) return '#d97706';
        if (classes.includes('from-pink-600') || classes.includes('to-pink-800') || classes.includes('pink')) return '#db2777';
        if (classes.includes('from-emerald-600') || classes.includes('to-emerald-800') || classes.includes('emerald')) return '#059669';
        if (classes.includes('from-rose-600') || classes.includes('to-rose-800') || classes.includes('rose')) return '#e11d48';
        if (classes.includes('from-teal-600') || classes.includes('to-teal-800') || classes.includes('teal')) return '#0d9488';
        if (classes.includes('from-purple-600') || classes.includes('to-purple-800') || classes.includes('purple')) return '#9333ea';
        if (classes.includes('from-green-600') || classes.includes('to-green-800') || classes.includes('green')) return '#16a34a';
        if (classes.includes('from-red-600') || classes.includes('to-red-800') || classes.includes('red')) return '#dc2626';
        if (classes.includes('from-orange-600') || classes.includes('to-orange-800') || classes.includes('orange')) return '#ea580c';
        // Couleur par défaut si aucun gradient n'est trouvé
        return '#6366f1'; // Violet par défaut
      };

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        removeContainer: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        letterRendering: true,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById(elementId);
          if (!clonedElement) return;

          // Fonction pour obtenir le className comme string
          const getClassNameString = (el) => {
            if (typeof el.className === 'string') return el.className;
            if (el.className?.baseVal) return el.className.baseVal;
            if (el.classList) return Array.from(el.classList).join(' ');
            return '';
          };

          // Fonction pour forcer une couleur visible sur un élément
          const forceVisibleColor = (el, defaultColor = '#000000') => {
            const classes = getClassNameString(el);
            let solidColor = defaultColor;

            // Si l'élément a des classes de gradient, extraire la couleur
            if (classes.includes('bg-clip-text') || classes.includes('text-transparent') || 
                classes.includes('from-') || classes.includes('to-')) {
              solidColor = getGradientColor(classes);
            }

            // Retirer les classes problématiques
            if (el.classList) {
              el.classList.remove('bg-clip-text', 'text-transparent');
            } else if (typeof el.className === 'string') {
              el.className = el.className
                .replace(/bg-clip-text/g, '')
                .replace(/text-transparent/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            }

            // Forcer la couleur via tous les moyens possibles
            el.style.setProperty('color', solidColor, 'important');
            el.style.setProperty('-webkit-text-fill-color', solidColor, 'important');
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('background-clip', 'initial', 'important');
            el.style.setProperty('-webkit-background-clip', 'initial', 'important');
            
            // Vérifier le style calculé et forcer si nécessaire
            const computedStyle = clonedDoc.defaultView.getComputedStyle(el);
            if (computedStyle.color === 'rgba(0, 0, 0, 0)' || 
                computedStyle.webkitTextFillColor === 'rgba(0, 0, 0, 0)' ||
                computedStyle.color === 'transparent' ||
                computedStyle.webkitTextFillColor === 'transparent') {
              el.style.setProperty('color', solidColor, 'important');
              el.style.setProperty('-webkit-text-fill-color', solidColor, 'important');
            }
          };

          // Parcourir TOUS les éléments et forcer la visibilité des textes
          const allElements = clonedElement.querySelectorAll('*');
          allElements.forEach(el => {
            const classes = getClassNameString(el);
            
            // Si l'élément a des classes problématiques, forcer la couleur
            if (classes.includes('bg-clip-text') || classes.includes('text-transparent')) {
              forceVisibleColor(el);
            }
          });

          // Deuxième passe : vérifier tous les éléments avec du texte pour s'assurer qu'ils sont visibles
          allElements.forEach(el => {
            // Vérifier si l'élément contient du texte
            if (el.textContent && el.textContent.trim().length > 0 && el.children.length === 0) {
              const computedStyle = clonedDoc.defaultView.getComputedStyle(el);
              const color = computedStyle.color;
              const fillColor = computedStyle.webkitTextFillColor;
              
              // Si le texte est invisible, forcer une couleur visible
              if (!color || 
                  color === 'rgba(0, 0, 0, 0)' || 
                  color === 'transparent' ||
                  fillColor === 'rgba(0, 0, 0, 0)' ||
                  fillColor === 'transparent') {
                // Utiliser la couleur du parent si disponible, sinon couleur par défaut
                const parentEl = el.parentElement;
                if (parentEl) {
                  const parentStyle = clonedDoc.defaultView.getComputedStyle(parentEl);
                  const parentColor = parentStyle.color;
                  if (parentColor && parentColor !== 'rgba(0, 0, 0, 0)' && parentColor !== 'transparent') {
                    el.style.setProperty('color', parentColor, 'important');
                    el.style.setProperty('-webkit-text-fill-color', parentColor, 'important');
                  } else {
                    forceVisibleColor(el, '#000000');
                  }
                } else {
                  forceVisibleColor(el, '#000000');
                }
              }
            }
          });

          // Parcourir aussi les nœuds texte directement
          const walker = clonedDoc.createTreeWalker(
            clonedElement,
            NodeFilter.SHOW_TEXT,
            null
          );

          let node;
          while (node = walker.nextNode()) {
            const parent = node.parentElement;
            if (parent) {
              const classes = getClassNameString(parent);
              const computedStyle = clonedDoc.defaultView.getComputedStyle(parent);
              
              if (classes.includes('bg-clip-text') || classes.includes('text-transparent') ||
                  computedStyle.color === 'rgba(0, 0, 0, 0)' ||
                  computedStyle.webkitTextFillColor === 'rgba(0, 0, 0, 0)') {
                forceVisibleColor(parent);
              }
            }
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const pageWidth = 210;
      const margin = 10;
      const headerHeight = showHeader ? 30 : 0;
      const footerHeight = showFooter ? 20 : 0;
      const contentWidth = imgWidth;
      const contentHeight = pageHeight - headerHeight - footerHeight;
      
      const imgHeight = (canvas.height * contentWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = headerHeight;
      let pageNumber = 1;

      // Function to add header
      const addHeader = (pageNum) => {
        if (!showHeader) return;
        
        // Header background
        pdf.setFillColor(139, 92, 246); // Purple
        pdf.rect(0, 0, pageWidth, headerHeight, 'F');
        
        // Logo (if provided)
        if (logoUrl) {
          try {
            // For now, just add text logo. In production, you'd load and add an image
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text('DL', margin, 12);
          } catch (e) {
            console.warn('Logo not loaded:', e);
          }
        }
        
        // Title
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, logoUrl ? margin + 15 : margin, 12);
        
        // Subtitle
        if (subtitle) {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(subtitle, logoUrl ? margin + 15 : margin, 18);
        }
        
        // Date
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        const dateText = `Date: ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`;
        pdf.text(dateText, pageWidth - margin - pdf.getTextWidth(dateText), 12);
        
        // Additional info
        if (Object.keys(additionalInfo).length > 0) {
          let yPos = 18;
          Object.entries(additionalInfo).forEach(([key, value]) => {
            if (yPos < headerHeight - 5) {
              pdf.setFontSize(7);
              pdf.text(`${key}: ${value}`, pageWidth - margin - pdf.getTextWidth(`${key}: ${value}`), yPos);
              yPos += 4;
            }
          });
        }
        
        // Reset text color
        pdf.setTextColor(0, 0, 0);
      };

      // Function to add footer
      const addFooter = (pageNum, totalPages) => {
        if (!showFooter) return;
        
        const footerY = pageHeight - footerHeight + 5;
        
        // Footer line
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.5);
        pdf.line(0, pageHeight - footerHeight, pageWidth, pageHeight - footerHeight);
        
        // Footer text
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        
        // Left: Author
        pdf.text(`Généré par ${author}`, margin, footerY);
        
        // Center: Page number
        if (totalPages > 1) {
          const pageText = `Page ${pageNum} sur ${totalPages}`;
          pdf.text(pageText, pageWidth / 2 - pdf.getTextWidth(pageText) / 2, footerY);
        }
        
        // Right: URL/Info
        pdf.text('DiscipleLife App', pageWidth - margin - pdf.getTextWidth('DiscipleLife App'), footerY);
        
        // Reset text color
        pdf.setTextColor(0, 0, 0);
      };

      // Calculate total pages
      let totalPages = 1;
      let tempHeightLeft = heightLeft;
      while (tempHeightLeft > contentHeight) {
        totalPages++;
        tempHeightLeft -= contentHeight;
      }

      // Add header to first page
      addHeader(1);

      // Add first page content
      const firstPageImgHeight = Math.min(imgHeight, contentHeight);
      pdf.addImage(imgData, 'PNG', 0, position, contentWidth, firstPageImgHeight);
      heightLeft -= firstPageImgHeight;

      // Add footer to first page
      addFooter(1, totalPages);

      // Add additional pages if needed
      let currentPage = 2;
      while (heightLeft > 0) {
        pdf.addPage();
        addHeader(currentPage);
        
        const pageImgHeight = Math.min(heightLeft, contentHeight);
        const imgY = headerHeight;
        
        // Crop the image for this page
        pdf.addImage(imgData, 'PNG', 0, imgY, contentWidth, pageImgHeight, 
          `page${currentPage}`, 'FAST');
        
        heightLeft -= pageImgHeight;
        
        addFooter(currentPage, totalPages);
        currentPage++;
      }

      // Forcer le téléchargement direct sans boîte de dialogue
      const blob = pdf.output('blob');
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm', { locale: fr });
      saveAs(blob, `${filename}_${timestamp}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  }
};

// Export individual functions for convenience
export const exportToExcel = (data, filename) => ExportUtils.exportToExcel(data, filename);
export const exportElementToPDF = (elementId, filename) => ExportUtils.exportElementToPDF(elementId, filename);
