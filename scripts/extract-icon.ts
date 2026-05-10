import sharp from 'sharp';
import path from 'path';

const SOURCE = path.join(process.cwd(), 'design/stitch/personalos-logo-v2.png');

async function main() {
  const meta = await sharp(SOURCE).metadata();
  if (!meta.width || !meta.height) throw new Error('Cannot read dimensions');

  const halfWidth = Math.floor(meta.width / 2); // 936

  // Extract the icon from the RIGHT half (light variant — darker red, better for favicon).
  // The compass+clock icon sits in the upper-center of each half.
  // Need enough height and width to capture the full compass with all 4 cardinal points.
  const iconSize = Math.floor(meta.height * 0.62); // ~357px — capture full compass
  const left = halfWidth + Math.floor((halfWidth - iconSize) / 2); // center in right half
  const top = Math.floor(meta.height * 0.0); // start from very top

  await sharp(SOURCE)
    .extract({ left, top, width: iconSize, height: iconSize })
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toFile(path.join(process.cwd(), 'app', 'icon.png'));

  console.log('✓ app/icon.png (1024x1024)');
}

main().catch(e => { console.error(e); process.exit(1); });
