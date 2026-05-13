import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productsDir = path.join(__dirname, 'public', 'products');
const outputFile = path.join(__dirname, 'public', 'catalogue.json');

const catalogue = {};

// Adds spaces before capitals/numbers and makes it uppercase
const formatName = (str) => str.replace(/([A-Z0-9])/g, ' $1').trim().toUpperCase().replace(/\s+/g, ' ');

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

      // Read description
      let description = "No description data found.";
      const descPath = path.join(prodPath, 'desc.txt');
      if (fs.existsSync(descPath)) {
        description = fs.readFileSync(descPath, 'utf8');
      }

      // Find first image (jpg or png)
      let photoFile = "";
      const files = fs.readdirSync(prodPath);
      const imgFile = files.find(f => f.endsWith('.jpg') || f.endsWith('.png'));
      if (imgFile) {
        photoFile = imgFile;
      }

      catalogue[catKey].products[prodKey] = {
        displayName: formatName(productFolder),
        photo: `/products/${categoryFolder}/${productFolder}/${photoFile}`,
        description: description
      };
    });
  });
}

fs.writeFileSync(outputFile, JSON.stringify(catalogue, null, 2));
console.log("BOOM! Nested catalogue generated successfully!");