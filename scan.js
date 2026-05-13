import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productsDir = path.join(__dirname, 'public', 'products');
const outputFile = path.join(__dirname, 'public', 'catalogue.json');

const catalogue = {};

// FIX: Now replaces underscores/hyphens and handles camelCase properly
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

      let photoFile = "";
      const files = fs.readdirSync(prodPath);
      const imgFile = files.find(f => f.endsWith('.jpg') || f.endsWith('.png'));
      if (imgFile) {
        photoFile = imgFile;
      }

      catalogue[catKey].products[prodKey] = {
        displayName: formatName(productFolder),
        // FIX: Removed the leading '/' so GitHub Pages can route the image correctly
        photo: `products/${categoryFolder}/${productFolder}/${photoFile}`,
        description: description
      };
    });
  });
}

fs.writeFileSync(outputFile, JSON.stringify(catalogue, null, 2));
console.log("Scanner complete: Paths and underscores fixed!");