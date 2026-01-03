
import { saveAs } from 'file-saver';

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
  }
};
