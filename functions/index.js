const fetch = require('node-fetch');           // jika belum terpasang, install: npm install node-fetch
const { compress } = require('./compress');    // helper compress-mu
typeof DEFAULT_QUALITY === 'undefined' && (global.DEFAULT_QUALITY = 80);
typeof MAX_WIDTH === 'undefined'     && (global.MAX_WIDTH     = 400);

exports.handler = async (event, context) => {
  const { url, w, q } = event.queryStringParameters || {};

  if (!url) {
    return {
      statusCode: 200,
      body: 'bandwidth-hero-proxy'
    };
  }

  try {
    // Parse width & quality, falling back to defaults
    const maxWidth = parseInt(w, 10) || MAX_WIDTH;
    const quality  = parseInt(q, 10) || DEFAULT_QUALITY;

    // Always output WebP, no grayscale
    const webp      = true;
    const grayscale = false;

    // Fetch the original image
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
    const data = await resp.buffer();

    // Perform compression/resizing
    const originSize = data.length;
    const { err, output, headers } = await compress(
      data,
      webp,
      grayscale,
      quality,
      originSize,
      maxWidth
    );
    if (err) throw err;

    // Return compressed image as Base64 WebP
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers,
      body: output.toString('base64')
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: err.message || 'Internal Server Error'
    };
  }
};