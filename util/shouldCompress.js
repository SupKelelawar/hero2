const MIN_COMPRESS_LENGTH = 1024; // 1 KB
const MIN_TRANSPARENT_COMPRESS_LENGTH = 10240; // 10 KB

/**
 * Memeriksa apakah gambar harus dikompres
 * @param {string} imageType - Tipe konten gambar
 * @param {number} size - Ukuran gambar dalam byte
 * @param {boolean} isTransparent - Apakah gambar transparan
 * @returns {boolean} - Apakah gambar harus dikompres
 */
function shouldCompress(imageType, size, isTransparent) {
  if (!imageType.startsWith("image")) {
    console.log("Skipping non-image type:", imageType);
    return false;
  }
  if (size === 0) {
    console.log("Skipping due to size 0");
    return false;
  }
  if (isTransparent && size < MIN_COMPRESS_LENGTH) {
    console.log("Skipping transparent image below min size:", size);
    return false;
  }
  if (!isTransparent && (imageType.endsWith("png") || imageType.endsWith("gif")) && size < MIN_TRANSPARENT_COMPRESS_LENGTH) {
    console.log("Skipping non-transparent PNG/GIF below min size:", size);
    return false;
  }
  return true;
}

module.exports = shouldCompress;
