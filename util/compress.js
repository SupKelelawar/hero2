const sharp = require("sharp");

/**
 * Mengompres gambar dengan pengaturan lebar dan kualitas
 * @param {Buffer} data - Buffer gambar asli
 * @param {number} width - Lebar yang diinginkan (default: 300)
 * @param {number} quality - Kualitas yang diinginkan (default: 85)
 * @param {number} originalSize - Ukuran asli gambar
 */
function compress(data, width = 300, quality = 85, originalSize) {
  let format = "jpeg"; // Set format to jpeg only

  return sharp(data)
    .resize(width, null, {
      withoutEnlargement: true,  // Jangan membesarkan gambar
      kernel: sharp.kernel.lanczos3, // Menggunakan kernel Lanczos untuk kualitas tinggi
      // Lanczos3 adalah algoritma resampling yang bagus untuk mempertahankan kualitas gambar saat resize
    })
    .toFormat(format, { quality })  // Atur kualitas kompresi
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
