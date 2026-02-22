/**
 * Export utilities for generating CSV, JSON, and other formats
 */

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) {
    alert('No data to export')
    return
  }
  
  // Get headers from first object
  const headers = Object.keys(data[0])
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Handle values with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ].join('\n')
  
  // Create and download file
  downloadFile(csvContent, filename, 'text/csv')
}

export const exportToJSON = (data: any, filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2)
  downloadFile(jsonContent, filename, 'application/json')
}

export const exportToHTML = (title: string, content: string, filename: string) => {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #f9fafb;
    }
    h1 {
      color: #1f2937;
      border-bottom: 2px solid #0ea5e9;
      padding-bottom: 0.5rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-top: 1rem;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #0ea5e9;
      color: white;
      font-weight: 600;
    }
    tr:hover {
      background: #f3f4f6;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  ${content}
</body>
</html>
  `
  downloadFile(htmlContent, filename, 'text/html')
}

export const generateHTMLTable = (data: any[]) => {
  if (data.length === 0) return '<p>No data available</p>'
  
  const headers = Object.keys(data[0])
  
  return `
    <table>
      <thead>
        <tr>
          ${headers.map(h => `<th>${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.map(row => `
          <tr>
            ${headers.map(h => `<td>${row[h] ?? 'N/A'}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Format data for export (flatten nested objects)
export const flattenObject = (obj: any, prefix = ''): any => {
  return Object.keys(obj).reduce((acc: any, key: string) => {
    const value = obj[key]
    const newKey = prefix ? `${prefix}.${key}` : key
    
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(acc, flattenObject(value, newKey))
    } else {
      acc[newKey] = value
    }
    
    return acc
  }, {})
}

export const prepareDataForExport = (data: any[]) => {
  return data.map(item => flattenObject(item))
}

