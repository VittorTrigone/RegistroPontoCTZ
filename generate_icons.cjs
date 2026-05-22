const sharp = require('sharp');
const path = require('path');

async function createIcons() {
  const logoPath = path.join(__dirname, 'public', 'logo.png');
  const icon192Path = path.join(__dirname, 'public', 'icon-192.png');
  const icon512Path = path.join(__dirname, 'public', 'icon-512.png');

  try {
    await sharp(logoPath)
      .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile(icon192Path);
      
    await sharp(logoPath)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile(icon512Path);
      
    console.log('Icons generated successfully.');
  } catch (err) {
    console.error('Error generating icons:', err);
  }
}

createIcons();
