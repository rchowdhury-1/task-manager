import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const SOURCE = path.join(process.cwd(), 'public', 'logo-mark.svg');
const ICONS_DIR = path.join(process.cwd(), 'public', 'icons');

async function main() {
  // Ensure icons directory exists
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  // app/icon.png — main favicon
  await sharp(SOURCE, { density: 300 })
    .resize(1024, 1024, { fit: 'contain' })
    .png()
    .toFile(path.join(process.cwd(), 'app', 'icon.png'));
  console.log('✓ app/icon.png (1024x1024)');

  // app/apple-icon.png — Apple touch icon
  await sharp(SOURCE, { density: 300 })
    .resize(180, 180, { fit: 'contain' })
    .png()
    .toFile(path.join(process.cwd(), 'app', 'apple-icon.png'));
  console.log('✓ app/apple-icon.png (180x180)');

  // app/opengraph-image.png — OG image (1200x630, logo centred on page-colored bg)
  const logoSize = 320;
  const logoBuffer = await sharp(SOURCE, { density: 300 })
    .resize(logoSize, logoSize, { fit: 'contain' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 249, g: 249, b: 251, alpha: 1 },
    },
  })
    .composite([{
      input: logoBuffer,
      left: Math.round((1200 - logoSize) / 2),
      top: Math.round((630 - logoSize) / 2),
    }])
    .png()
    .toFile(path.join(process.cwd(), 'app', 'opengraph-image.png'));
  console.log('✓ app/opengraph-image.png (1200x630)');

  // public/icon-mark.png — fallback raster
  await sharp(SOURCE, { density: 300 })
    .resize(512, 512, { fit: 'contain' })
    .png()
    .toFile(path.join(process.cwd(), 'public', 'icon-mark.png'));
  console.log('✓ public/icon-mark.png (512x512)');

  // ─── PWA Icons ────────────────────────────────────────────────────────

  // Standard icons (no padding, transparent bg)
  await sharp(SOURCE, { density: 300 })
    .resize(192, 192, { fit: 'contain' })
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-192.png'));
  console.log('✓ public/icons/icon-192.png');

  await sharp(SOURCE, { density: 300 })
    .resize(512, 512, { fit: 'contain' })
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512.png'));
  console.log('✓ public/icons/icon-512.png');

  // Maskable icons (20% safe-zone padding, crimson background)
  const CRIMSON = { r: 183, g: 0, b: 17, alpha: 1 };

  // 192 maskable: icon at 80% = 154px, padding = 19px each side
  const mask192Inner = 154;
  const mask192Pad = Math.round((192 - mask192Inner) / 2);
  await sharp(SOURCE, { density: 300 })
    .resize(mask192Inner, mask192Inner, { fit: 'contain' })
    .extend({
      top: mask192Pad,
      bottom: mask192Pad,
      left: mask192Pad,
      right: mask192Pad,
      background: CRIMSON,
    })
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-192-maskable.png'));
  console.log('��� public/icons/icon-192-maskable.png');

  // 512 maskable: icon at 80% = 410px, padding = 51px each side
  const mask512Inner = 410;
  const mask512Pad = Math.round((512 - mask512Inner) / 2);
  await sharp(SOURCE, { density: 300 })
    .resize(mask512Inner, mask512Inner, { fit: 'contain' })
    .extend({
      top: mask512Pad,
      bottom: mask512Pad,
      left: mask512Pad,
      right: mask512Pad,
      background: CRIMSON,
    })
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512-maskable.png'));
  console.log('✓ public/icons/icon-512-maskable.png');
}

main().catch(e => { console.error(e); process.exit(1); });
