import sharp from 'sharp';
import path from 'path';

const SOURCE = path.join(process.cwd(), 'app', 'icon.png');

async function main() {
  // Apple touch icon — 180x180 with white bg
  await sharp(SOURCE)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toFile(path.join(process.cwd(), 'app', 'apple-icon.png'));
  console.log('✓ app/apple-icon.png');

  // OG image — 1200x630, icon centred on dark theme background
  const iconBuf = await sharp(SOURCE)
    .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 1200, height: 630, channels: 4,
      background: { r: 15, g: 15, b: 16, alpha: 255 },
    },
  })
    .composite([{ input: iconBuf, gravity: 'center' }])
    .png()
    .toFile(path.join(process.cwd(), 'app', 'opengraph-image.png'));
  console.log('✓ app/opengraph-image.png');
}

main().catch(e => { console.error(e); process.exit(1); });
