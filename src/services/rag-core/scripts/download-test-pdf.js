const fs = require('fs');
const path = require('path');
const https = require('https');

const dir = path.resolve(__dirname, '../knowledge-base');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const fileUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
const filePath = path.join(dir, 'audit-test.pdf');

console.log(`Downloading dummy PDF from ${fileUrl} to ${filePath}...`);

const file = fs.createWriteStream(filePath);
https.get(fileUrl, function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close();
    console.log('✅ Download complete! File size:', fs.statSync(filePath).size, 'bytes.');
  });
}).on('error', function(err) {
  fs.unlink(filePath, () => {});
  console.error('❌ Download failed:', err.message);
});
