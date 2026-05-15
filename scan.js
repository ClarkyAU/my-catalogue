import fs from 'fs';
import path from 'path';

const catalogueDir = path.join(process.cwd(), 'public/products'); 
const outputDir = path.join(process.cwd(), 'src/data');
const outputFile = path.join(outputDir, 'catalogue.json');

function scanCatalogue() {
  if (!fs.existsSync(catalogueDir)) fs.mkdirSync(catalogueDir, { recursive: true });
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const categories = fs.readdirSync(catalogueDir);
  const data = {};

  categories.forEach(category => {
    const categoryPath = path.join(catalogueDir, category);
    if (!fs.statSync(categoryPath).isDirectory()) return;

    let theme = { themeColor: "#00E5FF" }; 
    const themePath = path.join(categoryPath, 'theme.json');
    if (fs.existsSync(themePath)) {
      try {
        theme = JSON.parse(fs.readFileSync(themePath, 'utf8'));
      } catch (e) { console.error(`⚠️ Theme error in ${category}`); }
    }

    data[category] = {
      // Updated regex to catch both hyphens and underscores
      displayName: category.replace(/[-_]/g, ' ').toUpperCase(),
      theme: theme, 
      products: {}
    };

    const products = fs.readdirSync(categoryPath);
    products.forEach(product => {
      const productPath = path.join(categoryPath, product);
      if (!fs.statSync(productPath).isDirectory()) return;

      const files = fs.readdirSync(productPath);
      
      const descFile = files.find(f => f.toLowerCase() === 'desc.txt' || f.toLowerCase() === 'description.txt');
      const description = descFile ? fs.readFileSync(path.join(productPath, descFile), 'utf8') : "No description.";

      const metaFile = files.find(f => f === 'metadata.json');
      let imageMetadata = [];
      if (metaFile) {
        try {
          imageMetadata = JSON.parse(fs.readFileSync(path.join(productPath, metaFile), 'utf8')).images || [];
        } catch (e) { console.error(`Meta error in ${product}`); }
      }

      const photos = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).map(f => {
        const meta = imageMetadata.find(m => m.filename === f);
        return {
          url: `/products/${category}/${product}/${f}`, 
          filaments: meta ? (meta.filaments || []) : [],
          texture: meta ? meta.texture : null
        };
      });

      data[category].products[product] = { 
        id: product, 
        // Updated regex to catch both hyphens and underscores
        displayName: product.replace(/[-_]/g, ' ').toUpperCase(), 
        description, 
        photos 
      };
    });
  });

  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
  console.log('✅ Scan Complete: src/data/catalogue.json generated.');
}

scanCatalogue();