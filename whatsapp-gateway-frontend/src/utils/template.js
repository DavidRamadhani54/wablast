// Template processing utilities
export const processTemplate = (template, phoneNumber, contacts = []) => {
    if (!template) return template;
    
    // Find contact by phone number
    const contact = contacts.find(c => c.phone === phoneNumber);
    
    let processed = template;
    
    if (contact) {
      // Replace contact-specific variables
      processed = processed.replace(/\{nama\}/gi, contact.name || phoneNumber);
      processed = processed.replace(/\{name\}/gi, contact.name || phoneNumber);
      processed = processed.replace(/\{telepon\}/gi, contact.phone || phoneNumber);
      processed = processed.replace(/\{phone\}/gi, contact.phone || phoneNumber);
      processed = processed.replace(/\{kategori\}/gi, contact.category || '');
      processed = processed.replace(/\{category\}/gi, contact.category || '');
      processed = processed.replace(/\{group\}/gi, contact.group || '');
      processed = processed.replace(/\{grup\}/gi, contact.group || '');
    } else {
      // Fallback for unknown contacts
      processed = processed.replace(/\{nama\}/gi, phoneNumber);
      processed = processed.replace(/\{name\}/gi, phoneNumber);
      processed = processed.replace(/\{telepon\}/gi, phoneNumber);
      processed = processed.replace(/\{phone\}/gi, phoneNumber);
      processed = processed.replace(/\{kategori\}/gi, '');
      processed = processed.replace(/\{category\}/gi, '');
      processed = processed.replace(/\{group\}/gi, '');
      processed = processed.replace(/\{grup\}/gi, '');
    }
    
    // Replace common variables
    const now = new Date();
    processed = processed.replace(/\{tanggal\}/gi, now.toLocaleDateString('id-ID'));
    processed = processed.replace(/\{date\}/gi, now.toLocaleDateString('en-US'));
    processed = processed.replace(/\{waktu\}/gi, now.toLocaleTimeString('id-ID'));
    processed = processed.replace(/\{time\}/gi, now.toLocaleTimeString('en-US'));
    processed = processed.replace(/\{datetime\}/gi, now.toLocaleString('id-ID'));
    
    return processed;
  };
  
  // Added function for Regular Blast
  export const processTemplateForBlast = (template, phoneNumber, contacts = []) => {
    return processTemplate(template, phoneNumber, contacts);
  };
  
  export const processCustomBlastTemplate = (template, phoneNumber, dataMapping = {}, variables = [], contacts = []) => {
    if (!template) return template;
    
    let processed = template;
    
    // First, process Excel data if available
    if (dataMapping[phoneNumber]) {
      const rowData = dataMapping[phoneNumber];
      
      // Replace Excel variables
      variables.forEach(variable => {
        const value = rowData[variable] || '';
        const regex = new RegExp(`\\{${variable}\\}`, 'gi');
        processed = processed.replace(regex, value);
      });
    }
    
    // Then process standard contact variables
    processed = processTemplate(processed, phoneNumber, contacts);
    
    return processed;
  };
  
  export const extractVariables = (template) => {
    if (!template) return [];
    
    const regex = /\{([^}]+)\}/g;
    const variables = [];
    let match;
    
    while ((match = regex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  };
  
  export const validateTemplate = (template, availableVariables = []) => {
    const usedVariables = extractVariables(template);
    const invalidVariables = usedVariables.filter(variable => 
      !availableVariables.includes(variable)
    );
    
    return {
      isValid: invalidVariables.length === 0,
      usedVariables,
      invalidVariables
    };
  };
  
  export const getTemplatePreview = (template, sampleData = {}) => {
    let preview = template;
    
    // Sample data defaults
    const defaults = {
      nama: 'John Doe',
      name: 'John Doe',
      telepon: '628123456789',
      phone: '628123456789',
      kategori: 'Customer',
      category: 'Customer',
      group: 'VIP',
      grup: 'VIP',
      tanggal: new Date().toLocaleDateString('id-ID'),
      date: new Date().toLocaleDateString('en-US'),
      waktu: new Date().toLocaleTimeString('id-ID'),
      time: new Date().toLocaleTimeString('en-US'),
      datetime: new Date().toLocaleString('id-ID'),
      ...sampleData
    };
    
    // Replace variables with sample data
    Object.keys(defaults).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'gi');
      preview = preview.replace(regex, defaults[key]);
    });
    
    return preview;
  };
  
  // Auto-text generation functions
  export const generateAutoText = (variables = []) => {
    const autoTexts = [
      {
        name: "Salam Personal",
        template: `Halo {nama}, selamat {waktu}!`,
        description: "Sapaan personal dengan nama dan waktu"
      },
      {
        name: "Info Kontak",
        template: `Halo {nama}, nomor Anda {telepon} terdaftar dalam kategori {kategori}.`,
        description: "Informasi kontak berdasarkan data"
      },
      {
        name: "Custom Excel Data",
        template: variables.length > 0 ? `Halo {${variables[0]}}, ` + variables.slice(1).map(v => `{${v}}`).join(' ') : "Silakan import Excel terlebih dahulu",
        description: "Template berdasarkan data Excel yang diimport"
      }
    ];
    
    return autoTexts;
  };
  
  export const getQuickTemplates = (variables = []) => {
    const baseTemplates = [
      "Halo {nama}!",
      "Selamat {waktu}, {nama}",
      "Kepada Yth. {nama}",
      "Hi {nama}, semoga sehat selalu",
      "Assalamualaikum {nama}"
    ];
    
    if (variables.length > 0) {
      // Add Excel-based templates
      baseTemplates.push(
        `Halo {${variables[0]}}!`,
        `Selamat pagi {${variables[0]}}, alamat Anda di {${variables[1] || variables[0]}}`,
        `Info untuk {${variables[0]}} kategori {${variables[1] || 'umum'}}`
      );
    }
    
    return baseTemplates;
  };