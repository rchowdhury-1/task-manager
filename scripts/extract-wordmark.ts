import sharp from 'sharp';
import path from 'path';

const SOURCE = path.join(process.cwd(), 'design/stitch/personalos-logo-v2.png');
const PUBLIC = path.join(process.cwd(), 'public');

async function main() {
  const meta = await sharp(SOURCE).metadata();
  if (!meta.width || !meta.height) throw new Error('Cannot read dimensions');

  const halfWidth = Math.floor(meta.width / 2);

  // Left half = dark variant
  await sharp(SOURCE)
    .extract({ left: 0, top: 0, width: halfWidth, height: meta.height })
    .toFile(path.join(PUBLIC, 'logo-dark.png'));
  console.log('✓ public/logo-dark.png');

  // Right half = light variant
  await sharp(SOURCE)
    .extract({ left: halfWidth, top: 0, width: halfWidth, height: meta.height })
    .toFile(path.join(PUBLIC, 'logo-light.png'));
  console.log('✓ public/logo-light.png');
}

main().catch(e => { console.error(e); process.exit(1); });
