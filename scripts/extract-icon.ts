import sharp from 'sharp';
import path from 'path';

const SOURCE = path.join(process.cwd(), 'design/stitch/personal-os-logo-v3.png');

async function main() {
  const meta = await sharp(SOURCE).metadata();
  if (!meta.width || !meta.height) throw new Error('Cannot read dimensions');

  // Image is two halves side by side. LEFT half is transparent variant.
  const halfWidth = Math.floor(meta.width / 2);

  // The icon takes roughly the top 50% of the left variant,
  // centred horizontally within that half.
  const iconHeight = Math.floor(meta.height * 0.62);
  const iconWidth = iconHeight; // square
  const left = Math.floor((halfWidth - iconWidth) / 2);
  const top = 0;

  // public/icon-mark.png — transparent, for app header (works on both themes)
  await sharp(SOURCE)
    .extract({ left, top, width: iconWidth, height: iconHeight })
    .resize(512, 512, { fit: 'contain' })
    .png()
    .toFile(path.join(process.cwd(), 'public', 'icon-mark.png'));
  console.log('✓ public/icon-mark.png (transparent, from v3)');

  // app/icon.png — white background, for browser tab favicon
  await sharp(SOURCE)
    .extract({ left, top, width: iconWidth, height: iconHeight })
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toFile(path.join(process.cwd(), 'app', 'icon.png'));
  console.log('✓ app/icon.png (white bg, for browser tabs)');
}

main().catch(e => { console.error(e); process.exit(1); });
