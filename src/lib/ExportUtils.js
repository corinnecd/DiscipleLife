
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const ExportUtils = {
  exportToExcel: (data, filename) => {
    if (!data || !data.length) {
      console.warn("No data to export");
      return;
    }

    // Simple CSV export for now as it's lighter than full Excel
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const cell = row[header] === null || row[header] === undefined ? '' : row[header];
        // Escape quotes and wrap in quotes if contains comma
        const stringCell = String(cell).replace(/"/g, '""');
        return `"${stringCell}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  },

  exportElementToPDF: async (elementId, filename) => {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

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
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  }
};

// Export individual functions for convenience
export const exportToExcel = (data, filename) => ExportUtils.exportToExcel(data, filename);
export const exportElementToPDF = (elementId, filename) => ExportUtils.exportElementToPDF(elementId, filename);
