const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const downloadsDir = 'C:\\Users\\sagar\\Downloads';
const files = ['LIST OF SECTIONS AND SUB-SECTIONS-PDF.pdf', 'Rules (14).pdf'];
const sections = ['2(68)', 'Section 62', 'Section 149', 'Section 185'];

async function verify() {
  for (const filename of files) {
    const filePath = path.join(downloadsDir, filename);
    console.log(`Analyzing ${filename}...`);
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new pdf.PDFParse({ data: dataBuffer });
      await parser.load();
      const result = await parser.getText();
      await parser.destroy();
      
      console.log(`Results for ${filename}:`);
      sections.forEach(sec => {
        const found = result.text.includes(sec);
        console.log(` - Contains "${sec}": ${found}`);
      });
    } catch (err) {
      console.error(`Error processing ${filename}:`, err.message);
    }
  }
}

verify();
