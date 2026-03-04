/**
 * Script d'optimisation des images héro pour la production
 * Convertit les images en WebP et redimensionne les fichiers trop volumineux
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HERO_DIR = path.join(__dirname, '..', 'public', 'images', 'hero');
const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;
const JPEG_QUALITY = 85;
const MAX_SIZE_KB = 400;

async function optimizeImage(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName, ext);

  // Skip already optimized WebP files
  if (ext === '.webp') {
    console.log(`  ⏭️  ${fileName} — already WebP, skipping`);
    return;
  }

  const originalStats = fs.statSync(filePath);
  const originalKB = Math.round(originalStats.size / 1024);

  console.log(`\n📸 ${fileName} (${originalKB} KB)`);

  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    // Resize if wider than MAX_WIDTH
    const resizeOptions = metadata.width > MAX_WIDTH ? { width: MAX_WIDTH, withoutEnlargement: true } : {};

    // Generate optimized WebP
    const webpPath = path.join(HERO_DIR, `${baseName}.webp`);
    await sharp(filePath)
      .resize(resizeOptions)
      .webp({ quality: WEBP_QUALITY, effort: 6 })
      .toFile(webpPath);

    const webpStats = fs.statSync(webpPath);
    const webpKB = Math.round(webpStats.size / 1024);

    // Generate optimized JPEG fallback
    const jpgPath = path.join(HERO_DIR, `${baseName}-optimized.jpg`);
    await sharp(filePath)
      .resize(resizeOptions)
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toFile(jpgPath);

    const jpgStats = fs.statSync(jpgPath);
    const jpgKB = Math.round(jpgStats.size / 1024);

    const savings = Math.round((1 - webpKB / originalKB) * 100);
    console.log(`  ✅ WebP:  ${webpKB} KB (${savings}% smaller)`);
    console.log(`  ✅ JPEG:  ${jpgKB} KB (fallback)`);

    // If original was very large, rename it to .original as backup
    if (originalKB > MAX_SIZE_KB) {
      const backupPath = path.join(HERO_DIR, `${baseName}${ext}.original`);
      fs.renameSync(filePath, backupPath);
      // Replace original with the optimized JPEG
      fs.renameSync(jpgPath, filePath);
      console.log(`  📦 Original backed up as ${baseName}${ext}.original`);
      console.log(`  📦 Optimized JPEG replaces original`);
    } else {
      // Small enough, just keep the WebP alongside
      fs.unlinkSync(jpgPath);
      console.log(`  ℹ️  Original kept (already small)`);
    }
  } catch (err) {
    console.error(`  ❌ Error processing ${fileName}:`, err.message);
  }
}

async function main() {
  console.log('🚀 Image Optimization for Production');
  console.log(`📂 Directory: ${HERO_DIR}`);
  console.log(`📏 Max width: ${MAX_WIDTH}px`);
  console.log(`🎯 WebP quality: ${WEBP_QUALITY}, JPEG quality: ${JPEG_QUALITY}`);
  console.log('═'.repeat(50));

  if (!fs.existsSync(HERO_DIR)) {
    console.error('❌ Hero directory not found:', HERO_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(HERO_DIR)
    .filter(f => /\.(jpg|jpeg|jfif|png|gif|bmp|tiff)$/i.test(f))
    .filter(f => !f.includes('.original'))
    .map(f => path.join(HERO_DIR, f));

  console.log(`\nFound ${files.length} images to optimize\n`);

  let totalOriginal = 0;
  let totalAfter = 0;

  for (const file of files) {
    const before = fs.statSync(file).size;
    totalOriginal += before;
    await optimizeImage(file);
  }

  // Calculate final sizes
  const finalFiles = fs.readdirSync(HERO_DIR)
    .filter(f => /\.(jpg|jpeg|jfif|png|webp)$/i.test(f))
    .filter(f => !f.includes('.original'));

  for (const f of finalFiles) {
    totalAfter += fs.statSync(path.join(HERO_DIR, f)).size;
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`📊 Total before: ${Math.round(totalOriginal / 1024)} KB`);
  console.log(`📊 Total after:  ${Math.round(totalAfter / 1024)} KB`);
  console.log(`📊 Saved: ${Math.round((1 - totalAfter / totalOriginal) * 100)}%`);
  console.log('✅ Done!');
}

main().catch(console.error);
