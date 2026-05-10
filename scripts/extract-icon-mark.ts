import sharp from 'sharp';
import path from 'path';

const SOURCE = path.join(process.cwd(), 'design/stitch/personalos-logo-v2.png');

async function main() {
  const meta = await sharp(SOURCE).metadata();
  if (!meta.width || !meta.height) throw new Error('No dimensions');

  const halfWidth = Math.floor(meta.width / 2); // 936

  // Extract icon from RIGHT half (light variant — dark red compass on light bg)
  const iconSize = Math.floor(meta.height * 0.62); // ~357px — full compass
  const left = halfWidth + Math.floor((halfWidth - iconSize) / 2);
  const top = 0;

  // Extract, add alpha channel, then remove near-white background
  const extracted = await sharp(SOURCE)
    .extract({ left, top, width: iconSize, height: iconSize })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = extracted;
  const pixels = new Uint8Array(data);

  // Make near-white pixels (and the light dot pattern) transparent
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    // If pixel is light (near white, light gray dots, or mid-gray pattern), make transparent
    if (r > 170 && g > 170 && b > 170) {
      pixels[i + 3] = 0; // set alpha to 0
    }
  }

  await sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(process.cwd(), 'public', 'icon-mark.png'));

  console.log('✓ public/icon-mark.png (512x512, transparent bg)');
}

main().catch(e => { console.error(e); process.exit(1); });
