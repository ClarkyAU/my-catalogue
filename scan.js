import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';

const catalogueDir = path.join(process.cwd(), 'public/products'); 
const outputDir = path.join(process.cwd(), 'src/data');
const outputFile = path.join(outputDir, 'catalogue.json');
const cacheFile = path.join(outputDir, '.image-cache.json');

// Helper to generate MD5 hash from a file buffer
function getBufferHash(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

async function scanCatalogue() {
  console.log('🚀 Starting verbose catalogue scan...');

  if (!fs.existsSync(catalogueDir)) fs.mkdirSync(catalogueDir, { recursive: true });
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Load existing image cache if it exists
  let imageCache = {};
  if (fs.existsSync(cacheFile)) {
    try {
      imageCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      console.log(`📦 Loaded existing image cache with ${Object.keys(imageCache).length} entries.`);
    } catch (e) { 
      console.error('⚠️ Failed to read image cache, starting fresh.'); 
    }
  } else {
    console.log('✨ No existing cache found. Starting fresh.');
  }

  const categories = fs.readdirSync(catalogueDir);
  const data = {};
  let cacheUpdated = false;
  
  // Trackers for the final summary
  let processedCount = 0;
  let skippedCount = 0;

  for (const category of categories) {
    const categoryPath = path.join(catalogueDir, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;
    
    console.log(`\n📂 Scanning Category: [${category}]`);

    let theme = { themeColor: "#00E5FF" }; 
    const themePath = path.join(categoryPath, 'theme.json');
    if (fs.existsSync(themePath)) {
      try {
        theme = JSON.parse(fs.readFileSync(themePath, 'utf8'));
      } catch (e) { console.error(`  ⚠️ Theme error in ${category}`); }
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
      
      console.log(`  📦 Product: [${product}]`);

      const files = fs.readdirSync(productPath);
      
      const descFile = files.find(f => f.toLowerCase() === 'desc.txt' || f.toLowerCase() === 'description.txt');
      const description = descFile ? fs.readFileSync(path.join(productPath, descFile), 'utf8') : "No description.";

      const metaFile = files.find(f => f === 'metadata.json');
      let imageMetadata = [];
      if (metaFile) {
        try {
          imageMetadata = JSON.parse(fs.readFileSync(path.join(productPath, metaFile), 'utf8')).images || [];
        } catch (e) { console.error(`    ⚠️ Meta error in ${product}`); }
      }

      const photos = [];
      
      for (const f of files) {
        if (/\.(jpg|jpeg|png|webp)$/i.test(f)) {
          const filePath = path.join(productPath, f);
          const cacheKey = `${category}/${product}/${f}`;
          
          try {
            const imageBuffer = await fs.promises.readFile(filePath);
            const currentHash = getBufferHash(imageBuffer);
            
            // If hash matches the cache, skip processing
            if (imageCache[cacheKey] !== currentHash) {
              console.log(`    ⚙️  Optimising: ${f}`);
              
              const optimisedBuffer = await sharp(imageBuffer)
                .resize({ width: 1200, withoutEnlargement: true })
                .jpeg({ quality: 80, force: false }) 
                .png({ quality: 80, force: false })
                .webp({ quality: 80, force: false })
                .toBuffer();
                
              await fs.promises.writeFile(filePath, optimisedBuffer);
              
              // Store the hash of the *newly optimised* file so it matches on the next run
              imageCache[cacheKey] = getBufferHash(optimisedBuffer);
              cacheUpdated = true;
              processedCount++;
            } else {
              console.log(`    ⏭️  Skipped (Cached): ${f}`);
              skippedCount++;
            }
            
          } catch (error) {
            console.error(`    ❌ Failed to process image: ${f}`, error);
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
  
  if (cacheUpdated) {
    fs.writeFileSync(cacheFile, JSON.stringify(imageCache, null, 2));
  }
  
  console.log('\n✅ Scan Complete!');
  console.log(`📊 Summary: ${processedCount} images optimised, ${skippedCount} images skipped.`);
}

scanCatalogue();