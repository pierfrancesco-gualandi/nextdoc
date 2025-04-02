import { getFullDocument } from "./document-utils";

/**
 * Exports document as HTML
 */
export async function exportToHtml(documentId: string) {
  try {
    const fullDocument = await getFullDocument(documentId);
    
    // Generate HTML content
    const htmlContent = generateHtmlContent(fullDocument);
    
    // Create a Blob with the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    
    // Create a URL for the Blob and trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fullDocument.title.replace(/\s+/g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to HTML:', error);
    throw new Error('Failed to export document as HTML');
  }
}

/**
 * Exports document as PDF
 */
export async function exportToPdf(documentId: string) {
  try {
    // In a real implementation, we would call a server endpoint to generate the PDF
    // For this example, we'll simulate it by generating a data URL
    
    const fullDocument = await getFullDocument(documentId);
    const htmlContent = generateHtmlContent(fullDocument);
    
    // For a real implementation, we would use a server-side PDF generation service
    // like html-pdf or puppeteer on the server
    
    // For the demo, let's make a call to our backend to generate the PDF
    const response = await fetch(`/api/documents/${documentId}/export/pdf`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      // If the server doesn't support PDF generation yet, fallback to HTML
      console.warn('PDF export not supported on server, falling back to HTML');
      return exportToHtml(documentId);
    }
    
    // Get the blob from the response
    const blob = await response.blob();
    
    // Create a URL for the Blob and trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fullDocument.title.replace(/\s+/g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    // Fallback to HTML if PDF export fails
    console.warn('Falling back to HTML export');
    return exportToHtml(documentId);
  }
}

/**
 * Generate HTML content for the document
 */
function generateHtmlContent(document: any) {
  // Create a basic HTML structure with CSS styles
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${document.title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .document-header {
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .document-title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .document-description {
      font-size: 16px;
      color: #666;
      margin-bottom: 15px;
    }
    .document-meta {
      font-size: 14px;
      color: #888;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #eee;
    }
    .section-description {
      font-size: 16px;
      margin-bottom: 15px;
    }
    .module {
      margin-bottom: 20px;
      padding: 15px;
      border: 1px solid #eee;
      border-radius: 5px;
    }
    .module-warning {
      background-color: #fff8e1;
      border-left: 4px solid #ffb300;
    }
    .module-image {
      text-align: center;
    }
    .module-image img {
      max-width: 100%;
    }
    .module-caption {
      text-align: center;
      font-style: italic;
      color: #666;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    table, th, td {
      border: 1px solid #ddd;
    }
    th, td {
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
    }
  </style>
</head>
<body>
  <div class="document-header">
    <div class="document-title">${document.title}</div>
    <div class="document-description">${document.description || ''}</div>
    <div class="document-meta">
      Versione: ${document.version} | Stato: ${document.status}
    </div>
  </div>
  <div class="document-content">
    ${renderDocumentSections(document.sections)}
  </div>
</body>
</html>
  `;
  
  return htmlTemplate;
}

/**
 * Render document sections as HTML
 */
function renderDocumentSections(sections: any[]) {
  if (!sections || !sections.length) return '<p>No content available</p>';
  
  return sections.map(section => {
    return `
      <div class="section">
        <h2 class="section-title">${section.title}</h2>
        ${section.description ? `<div class="section-description">${section.description}</div>` : ''}
        ${renderSectionModules(section.modules)}
      </div>
    `;
  }).join('');
}

/**
 * Render content modules for a section as HTML
 */
function renderSectionModules(modules: any[]) {
  if (!modules || !modules.length) return '';
  
  return modules.map(module => {
    switch (module.type) {
      case 'text':
        return `<div class="module module-text">${module.content.text}</div>`;
        
      case 'image':
        return `
          <div class="module module-image">
            <img src="${module.content.src}" alt="${module.content.alt || ''}">
            ${module.content.caption ? `<div class="module-caption">${module.content.caption}</div>` : ''}
          </div>
        `;
        
      case 'warning':
        return `
          <div class="module module-warning">
            <h3>${module.content.title || 'Attenzione'}</h3>
            <p>${module.content.message}</p>
          </div>
        `;
        
      case 'component':
        // This would require fetching component data
        return `<div class="module module-component">Component list</div>`;
        
      case 'checklist':
        if (!module.content.items || !module.content.items.length) return '';
        
        const checklistItems = module.content.items.map((item: any) => `
          <li>
            <input type="checkbox" ${item.checked ? 'checked' : ''} disabled>
            <span>${item.text}</span>
          </li>
        `).join('');
        
        return `
          <div class="module module-checklist">
            <ul>${checklistItems}</ul>
          </div>
        `;
        
      default:
        return `<div class="module">Unsupported module type: ${module.type}</div>`;
    }
  }).join('');
}
