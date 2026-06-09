import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- ES MODULE WORKAROUND ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ----------------------------

const directory = path.join(__dirname, 'public', 'products');
const dataDir = path.join(__dirname, 'src', 'data');
const outputFile = path.join(dataDir, 'catalogue.json');

if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const catalogue = {};
const categories = fs.readdirSync(directory).filter(f => fs.statSync(path.join(directory, f)).isDirectory());

function parseProduct(prodPath, catId, subCatId, prodId, files, catObj) {
  let desc = "No description available.";
  const descFile = files.find(f => f === 'description.txt' || f === 'desc.txt');
  if (descFile) desc = fs.readFileSync(path.join(prodPath, descFile), 'utf8');

  let isFeatured = false, basePrice = "0.00", metaData = {};
  const metaFile = files.find(f => f === 'metadata.json');
  if (metaFile) {
    metaData = JSON.parse(fs.readFileSync(path.join(prodPath, metaFile), 'utf8'));
    isFeatured = metaData.featured || false;
    basePrice = metaData.basePrice || "0.00";
  }

  const relativeProdPath = path.relative(directory, prodPath).replace(/\\/g, '/');

  const photos = files.filter(f => f.match(/\.(jpg|jpeg|png|webp|gif)$/i)).map(photo => {
    let photoData = { url: `/products/${relativeProdPath}/${photo}` };
    if (metaData[photo]) {
       photoData.filaments = metaData[photo].filaments || null;
       photoData.texture = metaData[photo].texture || null;
    }
    return photoData;
  });

  catObj[catId].subCategories[subCatId].products[prodId] = {
    id: prodId,
    displayName: prodId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: desc,
    featured: isFeatured,
    price: basePrice,
    photos: photos
  };
}

categories.forEach(category => {
  catalogue[category] = {
    id: category,
    displayName: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    subCategories: {}
  };

  const catPath = path.join(directory, category);
  const level2Items = fs.readdirSync(catPath).filter(f => fs.statSync(path.join(catPath, f)).isDirectory());

  level2Items.forEach(item => {
    const itemPath = path.join(catPath, item);
    const filesInside = fs.readdirSync(itemPath);

    const isProduct = filesInside.some(f => fs.statSync(path.join(itemPath, f)).isFile());

    if (isProduct) {
      const subCatId = 'General';
      if (!catalogue[category].subCategories[subCatId]) {
        catalogue[category].subCategories[subCatId] = { id: subCatId, displayName: 'General', products: {} };
      }
      parseProduct(itemPath, category, subCatId, item, filesInside, catalogue);
    } else {
      const subCatId = item;
      if (!catalogue[category].subCategories[subCatId]) {
        catalogue[category].subCategories[subCatId] = {
          id: subCatId,
          displayName: subCatId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          products: {}
        };
      }
      const level3Items = filesInside.filter(f => fs.statSync(path.join(itemPath, f)).isDirectory());
      level3Items.forEach(prodItem => {
         const prodPath = path.join(itemPath, prodItem);
         const prodFiles = fs.readdirSync(prodPath);
         parseProduct(prodPath, category, subCatId, prodItem, prodFiles, catalogue);
      });
    }
  });
});

fs.writeFileSync(outputFile, JSON.stringify(catalogue, null, 2));
console.log('✅ Smart Scanner Complete! catalogue.json updated.');