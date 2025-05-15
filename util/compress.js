const sharp = require('sharp');

exports.compress = async (buffer, webp, grayscale, quality, originSize, maxWidth) => {
  try {
    let transformer = sharp(buffer)
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true });

    if (grayscale) {
      transformer = transformer.grayscale();
    }

    transformer = webp
      ? transformer.webp({ quality })
      : transformer.jpeg({ quality });

    const outputBuffer = await transformer.toBuffer();
    const metadata = await sharp(outputBuffer).metadata();

    const headers = {
      'content-type': webp ? 'image/webp' : 'image/jpeg',
      'cache-control': 'public, max-age=31536000',
      'content-length': metadata.size.toString()
    };

    return { err: null, output: outputBuffer, headers };
  } catch (err) {
    return { err, output: null, headers: {} };
  }
};
