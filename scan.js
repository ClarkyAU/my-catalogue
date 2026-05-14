import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productsDir = path.join(__dirname, 'public', 'products');
const outputFile = path.join(__dirname, 'public', 'catalogue.json');

const catalogue = {};

const formatName = (str) => {
  let clean = str.replace(/[_-]/g, ' ');
  clean = clean.replace(/([a-z])([A-Z0-9])/g, '$1 $2');
  return clean.trim().toUpperCase().replace(/\s+/g, ' ');
};

if (fs.existsSync(productsDir)) {
  const categories = fs.readdirSync(productsDir).filter(f => fs.statSync(path.join(productsDir, f)).isDirectory());

  categories.forEach(categoryFolder => {
    const catKey = categoryFolder.toLowerCase();
    catalogue[catKey] = {
      displayName: formatName(categoryFolder),
      products: {}
    };

    const catPath = path.join(productsDir, categoryFolder);
    const products = fs.readdirSync(catPath).filter(f => fs.statSync(path.join(catPath, f)).isDirectory());

    products.forEach(productFolder => {
      const prodKey = productFolder.toLowerCase();
      const prodPath = path.join(catPath, productFolder);

      let description = "No description data found.";
      const descPath = path.join(prodPath, 'desc.txt');
      if (fs.existsSync(descPath)) {
        description = fs.readFileSync(descPath, 'utf8');
      }

      // NEW: Find ALL images in the folder
      const files = fs.readdirSync(prodPath);
      const photoFiles = files
        .filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg'))
        .map(f => `products/${categoryFolder}/${productFolder}/${f}`);

      catalogue[catKey].products[prodKey] = {
        displayName: formatName(productFolder),
        photos: photoFiles, // Store the array of all photos
        description: description
      };
    });
  });
}

fs.writeFileSync(outputFile, JSON.stringify(catalogue, null, 2));
console.log("Scanner complete: Multiple photos supported!");