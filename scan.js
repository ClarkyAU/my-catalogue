import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productsDir = path.join(__dirname, 'public', 'products');
const outputPath = path.join(__dirname, 'public', 'catalogue.json');

if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true });
}

const catalogue = {};
const folders = fs.readdirSync(productsDir).filter(f => fs.lstatSync(path.join(productsDir, f)).isDirectory());

folders.forEach(folder => {
  const files = fs.readdirSync(path.join(productsDir, folder));
  const images = files.filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

  if (images.length > 0) {
    catalogue[folder] = {
      displayName: folder.replace(/_/g, ' '),
      photo: `products/${folder}/${images[0]}`
    };
  }
});

fs.writeFileSync(outputPath, JSON.stringify(catalogue, null, 2));
console.log(`✅ Scanned ${folders.length} products.`);