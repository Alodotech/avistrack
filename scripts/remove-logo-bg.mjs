import sharp from "sharp";
import { resolve } from "node:path";

async function main() {
  const inputPath = resolve("public/assets/logoavistrack.jpeg");
  const outputPath = resolve("public/assets/logoavistrack.png");

  const image = sharp(inputPath);
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  console.log(`Dimensions: ${width}x${height}, channels: ${channels}`);

  const visited = new Uint8Array(width * height);
  const isOuterBackground = new Uint8Array(width * height);

  function isNearWhite(idx) {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    return r > 225 && g > 225 && b > 225;
  }

  const queue = [];

  function pushPixel(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const pIdx = y * width + x;
    if (visited[pIdx]) return;
    visited[pIdx] = 1;
    const dIdx = pIdx * channels;
    if (isNearWhite(dIdx)) {
      isOuterBackground[pIdx] = 1;
      queue.push(x, y);
    }
  }

  // 1. Seed all four outer borders
  for (let x = 0; x < width; x++) {
    pushPixel(x, 0);
    pushPixel(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    pushPixel(0, y);
    pushPixel(width - 1, y);
  }

  // 2. Also seed the inner hole under the arch of the letter 'A'
  // (located roughly at x=530, y=420)
  for (let dy = -30; dy <= 30; dy += 10) {
    for (let dx = -30; dx <= 30; dx += 10) {
      pushPixel(530 + dx, 420 + dy);
    }
  }

  // Run BFS
  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];

    pushPixel(x + 1, y);
    pushPixel(x - 1, y);
    pushPixel(x, y + 1);
    pushPixel(x, y - 1);
  }

  console.log(`Flood fill completed.`);

  // Apply alpha with clean anti-aliasing feathering
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pIdx = y * width + x;
      const dIdx = pIdx * channels;

      if (isOuterBackground[pIdx]) {
        data[dIdx + 3] = 0; // completely transparent
      } else {
        const r = data[dIdx];
        const g = data[dIdx + 1];
        const b = data[dIdx + 2];

        // If it borders a background pixel, feather the edge
        let hasOuterNeighbor = false;
        const neighbors = [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (isOuterBackground[ny * width + nx]) {
              hasOuterNeighbor = true;
              break;
            }
          }
        }

        if (hasOuterNeighbor && (r > 190 || g > 190 || b > 190)) {
          const redness = r - (g + b) / 2;
          const alpha = Math.max(0, Math.min(255, Math.round((redness / 150) * 255)));
          data[dIdx + 3] = alpha;
        }
      }
    }
  }

  // Also trim excess transparent borders around the logo so it can be enlarged nicely!
  const trimmed = await sharp(data, {
    raw: {
      width,
      height,
      channels,
    },
  })
    .trim({ threshold: 10 })
    .png()
    .toBuffer();

  await sharp(trimmed).png().toFile(outputPath);

  console.log(`Saved transparent trimmed logo to ${outputPath}`);
}

main().catch(console.error);
