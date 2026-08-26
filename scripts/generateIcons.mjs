// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
/**
 * Generate minimal solid-color PNG icons for the PWA manifest.
 * Produces icon-192.png and icon-512.png in public/.
 * SimpleDocs brand: warm cream background (#FAF7F2) with a dark notch (#1A1A2E).
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePng(size, bgR, bgG, bgB, accentR, accentG, accentB) {
  // Build raw RGBA scanlines with a simple accent bar at top
  const accentHeight = Math.floor(size * 0.18);
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const isAccent = y < accentHeight;
      raw[offset++] = isAccent ? accentR : bgR;
      raw[offset++] = isAccent ? accentG : bgG;
      raw[offset++] = isAccent ? accentB : bgB;
      raw[offset++] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(PUBLIC_DIR, { recursive: true });

// SimpleDocs palette
const BG = [0xFA, 0xF7, 0xF2];
const ACCENT = [0x1A, 0x1A, 0x2E];

writeFileSync(join(PUBLIC_DIR, 'icon-192.png'), makePng(192, ...BG, ...ACCENT));
writeFileSync(join(PUBLIC_DIR, 'icon-512.png'), makePng(512, ...BG, ...ACCENT));

console.log('Generated icon-192.png and icon-512.png');
