// Compresses an image using Sharp library
const sharp = require("sharp");

/**
 * Mengompres gambar dengan pengaturan lebar dan kualitas
 * @param {Buffer} imagePath - Path gambar asli
 * @param {boolean} useJPEG - Format gambar (true untuk WebP, false untuk JPEG)
 * @param {number} quality - Kualitas gambar (default: 80)
 * @param {number} originalSize - Ukuran asli gambar
 */
function compress(imagePath, useWebp, width = 300, quality = 80, originalSize) {
  let format = useWebp ? "webp" : "jpeg";

  return sharp(imagePath)
    .resize(width) // Mengatur lebar gambar menjadi 300
    .toFormat(format, { quality, progressive: true, optimizeScans: true })
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => ({
      err: null,
      headers: {
        "content-type": `image/${format}`,
        "content-length": info.size,
        "x-original-size": originalSize,
        "x-bytes-saved": originalSize - info.size,
      },
      output: data,
    }))
    .catch((err) => ({ err }));
}

module.exports = compress;
