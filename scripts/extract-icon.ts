import sharp from 'sharp';
import path from 'path';

// Use the bold filled SVG (brand reds, no background rect)
const SOURCE = path.join(process.cwd(), 'public', 'icon-mark.svg');

async function main() {
  // app/icon.png — main favicon, transparent bg
  await sharp(SOURCE, { density: 300 })
    .resize(1024, 1024, { fit: 'contain' })
    .png()
    .toFile(path.join(process.cwd(), 'app', 'icon.png'));
  console.log('✓ app/icon.png (1024x1024)');

  // public/icon-mark.png — transparent fallback for any
  // <Image> usage that can't use SVG
  await sharp(SOURCE, { density: 300 })
    .resize(512, 512, { fit: 'contain' })
    .png()
    .toFile(path.join(process.cwd(), 'public', 'icon-mark.png'));
  console.log('✓ public/icon-mark.png (512x512, transparent)');
}

main().catch(e => { console.error(e); process.exit(1); });
