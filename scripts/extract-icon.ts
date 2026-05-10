import sharp from 'sharp';
import path from 'path';

// Use the original black SVG for rasterization (not the currentColor version)
const SOURCE = path.join(process.cwd(), 'design/stitch/logo-personal-os.svg');

async function main() {
  // app/icon.png — main favicon, white bg for light browser tabs
  await sharp(SOURCE, { density: 300 })
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toFile(path.join(process.cwd(), 'app', 'icon.png'));
  console.log('✓ app/icon.png (1024x1024, white bg)');

  // public/icon-mark.png — transparent fallback for any
  // <Image> usage that can't use SVG
  await sharp(SOURCE, { density: 300 })
    .resize(512, 512, { fit: 'contain' })
    .png()
    .toFile(path.join(process.cwd(), 'public', 'icon-mark.png'));
  console.log('✓ public/icon-mark.png (512x512, transparent)');
}

main().catch(e => { console.error(e); process.exit(1); });
