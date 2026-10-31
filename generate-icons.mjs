import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height, r, g, b) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 2; // Color type: Truecolor (RGB)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const chunkType = Buffer.from(type);
    const body = Buffer.concat([chunkType, data]);
    const crc = Buffer.alloc(4);
    crc.writeInt32BE(calculateCrc(body), 0);
    return Buffer.concat([len, body, crc]);
  }

  function calculateCrc(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (-(c & 1) & 0xedb88320);
      }
    }
    return (c ^ 0xffffffff) | 0;
  }

  // Raw image data with scanline filter byte 0
  const scanlineLength = 1 + width * 3;
  const rawData = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    const offset = y * scanlineLength;
    rawData[offset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pixelOffset = offset + 1 + x * 3;
      // Shopee Orange #EE4D2D = (238, 77, 45)
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const p16 = createPng(16, 16, 238, 77, 45);
const p48 = createPng(48, 48, 238, 77, 45);
const p128 = createPng(128, 128, 238, 77, 45);

fs.writeFileSync('public/icons/icon16.png', p16);
fs.writeFileSync('public/icons/icon48.png', p48);
fs.writeFileSync('public/icons/icon128.png', p128);
console.log('PNG Icons generated successfully!');

