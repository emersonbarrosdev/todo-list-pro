const fs = require('fs');
const path = require('path');

// 1. Create favicon.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="todoProGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#6366F1" />
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C084FC" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#818CF8" stop-opacity="0.4" />
    </linearGradient>
    <filter id="proGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.45" />
    </filter>
  </defs>
  <!-- Squircle Base -->
  <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#todoProGrad)" filter="url(#proGlow)" />
  <!-- Subtle Border Highlight -->
  <rect x="4.5" y="4.5" width="55" height="55" rx="15.5" fill="none" stroke="url(#borderGrad)" stroke-width="1.5" />
  <!-- Checkmark -->
  <polyline points="18 33 27 42 46 21" fill="none" stroke="#FFFFFF" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" />
  <!-- PRO Status Dot -->
  <circle cx="47" cy="17" r="3.5" fill="#22C55E" stroke="#0B0B12" stroke-width="1.5" />
</svg>
`;

const svgPath = path.join(__dirname, '..', 'src', 'favicon.svg');
fs.writeFileSync(svgPath, svgContent.trim(), 'utf8');
console.log('Created favicon.svg at', svgPath);

// 2. Generate 32x32 and 16x16 .ico
function createIcoBuffer(sizes) {
  // sizes is array of { width, height, pixels: Buffer (width*height*4 BGRA, bottom-to-top) }
  const headerSize = 6;
  const dirEntrySize = 16;
  const numImages = sizes.length;
  
  let currentOffset = headerSize + dirEntrySize * numImages;
  const entries = [];
  const imageBuffers = [];

  for (const img of sizes) {
    const { width, height, pixels } = img;
    const bihSize = 40;
    const maskRowBytes = Math.ceil(width / 32) * 4;
    const maskSize = maskRowBytes * height;
    const imageSize = bihSize + pixels.length + maskSize;

    // Directory entry
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // colorCount
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bitCount
    entry.writeUInt32LE(imageSize, 8); // size in bytes
    entry.writeUInt32LE(currentOffset, 12); // offset
    entries.push(entry);

    // BITMAPINFOHEADER
    const bih = Buffer.alloc(bihSize);
    bih.writeUInt32LE(bihSize, 0);
    bih.writeInt32LE(width, 4);
    bih.writeInt32LE(height * 2, 8); // Double height for mask
    bih.writeUInt16LE(1, 12); // planes
    bih.writeUInt16LE(32, 14); // bitCount
    bih.writeUInt32LE(0, 16); // BI_RGB
    bih.writeUInt32LE(pixels.length, 20); // biSizeImage
    bih.writeInt32LE(0, 24);
    bih.writeInt32LE(0, 28);
    bih.writeUInt32LE(0, 32);
    bih.writeUInt32LE(0, 36);

    const mask = Buffer.alloc(maskSize, 0); // All 0s: transparent handled by 32-bit alpha
    const imgBuf = Buffer.concat([bih, pixels, mask]);
    imageBuffers.push(imgBuf);

    currentOffset += imageSize;
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(numImages, 4);

  return Buffer.concat([header, ...entries, ...imageBuffers]);
}

// Generate pixel grid for size N (32 or 16)
function generatePixels(size) {
  // Returns Buffer with size*size*4 bytes in BGRA format, from bottom row (y = size-1) up to top row (y = 0)
  const buf = Buffer.alloc(size * size * 4);

  // Helper distance to segment
  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  // Define geometry scaled to size
  const scale = size / 32;
  const radius = 6 * scale;
  const minX = 2 * scale;
  const maxX = size - 1 - 2 * scale;
  const minY = 2 * scale;
  const maxY = size - 1 - 2 * scale;

  // Checkmark points (scaled)
  const p1 = [9 * scale, 16.5 * scale];
  const p2 = [13.5 * scale, 21.5 * scale];
  const p3 = [23 * scale, 10.5 * scale];
  const checkWidth = 1.6 * scale;

  // Pro dot
  const dotX = 23.5 * scale;
  const dotY = 8.5 * scale;
  const dotRadius = 1.8 * scale;

  // Row by row from bottom (size - 1) to top (0)
  for (let row = 0; row < size; row++) {
    const y = (size - 1) - row; // bottom row is y = size - 1
    for (let x = 0; x < size; x++) {
      const idx = (row * size + x) * 4;

      // 1. Check if inside squircle
      // Clamp to box
      const cx = Math.max(minX + radius, Math.min(maxX - radius, x));
      const cy = Math.max(minY + radius, Math.min(maxY - radius, y));
      const dSquircle = Math.hypot(x - cx, y - cy);

      if (dSquircle > radius + 0.5) {
        // Transparent
        buf[idx + 0] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Base gradient: from violet (#8B5CF6 -> [139, 92, 246]) to indigo (#6366F1 -> [99, 102, 241])
      const tY = y / size;
      let r = Math.round(139 * (1 - tY) + 99 * tY);
      let g = Math.round(92 * (1 - tY) + 102 * tY);
      let b = Math.round(246 * (1 - tY) + 241 * tY);
      let a = 255;

      // Squircle anti-aliasing on edge
      if (dSquircle > radius - 0.5) {
        const edgeFactor = (radius + 0.5 - dSquircle);
        a = Math.round(255 * Math.max(0, Math.min(1, edgeFactor)));
      }

      // 2. Check if checkmark
      const dLine1 = distToSegment(x, y, p1[0], p1[1], p2[0], p2[1]);
      const dLine2 = distToSegment(x, y, p2[0], p2[1], p3[0], p3[1]);
      const dCheck = Math.min(dLine1, dLine2);

      if (dCheck <= checkWidth + 0.5) {
        const checkAlpha = Math.max(0, Math.min(1, checkWidth + 0.5 - dCheck));
        r = Math.round(r * (1 - checkAlpha) + 255 * checkAlpha);
        g = Math.round(g * (1 - checkAlpha) + 255 * checkAlpha);
        b = Math.round(b * (1 - checkAlpha) + 255 * checkAlpha);
      }

      // 3. Check if PRO dot (Emerald #22C55E -> [34, 197, 94])
      const dDot = Math.hypot(x - dotX, y - dotY);
      if (dDot <= dotRadius + 0.5) {
        const dotAlpha = Math.max(0, Math.min(1, dotRadius + 0.5 - dDot));
        r = Math.round(r * (1 - dotAlpha) + 34 * dotAlpha);
        g = Math.round(g * (1 - dotAlpha) + 197 * dotAlpha);
        b = Math.round(b * (1 - dotAlpha) + 94 * dotAlpha);
      }

      // Write BGRA
      buf[idx + 0] = b;
      buf[idx + 1] = g;
      buf[idx + 2] = r;
      buf[idx + 3] = a;
    }
  }

  return buf;
}

const p32 = generatePixels(32);
const p16 = generatePixels(16);

const icoBuf = createIcoBuffer([
  { width: 32, height: 32, pixels: p32 },
  { width: 16, height: 16, pixels: p16 }
]);

const icoPath = path.join(__dirname, '..', 'src', 'favicon.ico');
fs.writeFileSync(icoPath, icoBuf);
console.log('Created multi-size favicon.ico at', icoPath, `(${icoBuf.length} bytes)`);
