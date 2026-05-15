import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const catalogueDir = path.join(process.cwd(), 'public/products'); 
const outputDir = path.join(process.cwd(), 'src/data');
const outputFile = path.join(outputDir, 'catalogue.json');

async function scanCatalogue() {
  if (!fs.existsSync(catalogueDir)) fs.mkdirSync(catalogueDir, { recursive: true });
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const categories = fs.readdirSync(catalogueDir);
  const data = {};

  // We use for...of instead of forEach so we can properly 'await' the image processing
  for (const category of categories) {
    const categoryPath = path.join(catalogueDir, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    let theme = { themeColor: "#00E5FF" }; 
    const themePath = path.join(categoryPath, 'theme.json');
    if (fs.existsSync(themePath)) {
      try {
        theme = JSON.parse(fs.readFileSync(themePath, 'utf8'));
      } catch (e) { console.error(`⚠️ Theme error in ${category}`); }
    }

    data[category] = {
      displayName: category.replace(/[-_]/g, ' ').toUpperCase(),
      theme: theme, 
      products: {}
    };

    const products = fs.readdirSync(categoryPath);
    for (const product of products) {
      const productPath = path.join(categoryPath, product);
      if (!fs.statSync(productPath).isDirectory()) continue;

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

      const photos = [];
      
      for (const f of files) {
        if (/\.(jpg|jpeg|png|webp)$/i.test(f)) {
          const filePath = path.join(productPath, f);
          
          try {
            // Read the file into memory
            const imageBuffer = await fs.promises.readFile(filePath);
            
            // Optimise the image (Max width 1200px, 80% quality compression)
            const optimisedBuffer = await sharp(imageBuffer)
              .resize({ width: 1200, withoutEnlargement: true })
              .jpeg({ quality: 80, force: false }) // force: false means it won't convert PNGs to JPEGs
              .png({ quality: 80, force: false })
              .webp({ quality: 80, force: false })
              .toBuffer();
              
            // Overwrite the original massive file with the web-ready version
            await fs.promises.writeFile(filePath, optimisedBuffer);
            
          } catch (error) {
            console.error(`⚠️ Failed to optimise image: ${f}`, error);
          }

          const meta = imageMetadata.find(m => m.filename === f);
          photos.push({
            url: `/products/${category}/${product}/${f}`, 
            filaments: meta ? (meta.filaments || []) : [],
            texture: meta ? meta.texture : null
          });
        }
      }

      data[category].products[product] = { 
        id: product, 
        displayName: product.replace(/[-_]/g, ' ').toUpperCase(), 
        description, 
        photos 
      };
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
  console.log('✅ Scan Complete: Images optimised and catalogue.json generated.');
}

scanCatalogue();