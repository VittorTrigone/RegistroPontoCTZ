import fs from 'fs';
import https from 'https';
import path from 'path';

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const modelsDir = path.join(process.cwd(), 'public', 'models');

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const files = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

const downloadFile = (file) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(modelsDir, file);
    const fileStream = fs.createWriteStream(filePath);
    
    https.get(baseUrl + file, (response) => {
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded ${file}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      console.error(`Error downloading ${file}:`, err);
      reject(err);
    });
  });
};

async function downloadAll() {
  console.log('Downloading face-api.js models...');
  for (const file of files) {
    await downloadFile(file);
  }
  console.log('All models downloaded successfully!');
}

downloadAll();
