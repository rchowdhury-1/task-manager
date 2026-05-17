import sharp from 'sharp';
import path from 'path';

const SOURCE = path.join(process.cwd(), 'public', 'logo-mark.svg');

async function main() {
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
      background: { r: 249, g: 249, b: 251, alpha: 1 }, // --color-page light
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
}

main().catch(e => { console.error(e); process.exit(1); });
