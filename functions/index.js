const fetch = require('node-fetch');
const { compress } = require('./compress');

const DEFAULT_QUALITY = 80;
const MAX_WIDTH = 400;

exports.handler = async (event, context) => {
  const { url, w, q } = event.queryStringParameters || {};

  if (!url) {
    return {
      statusCode: 200,
      body: 'bandwidth-hero-proxy'
    };
  }

  try {
    const maxWidth = parseInt(w, 10) || MAX_WIDTH;
    const quality  = parseInt(q, 10) || DEFAULT_QUALITY;
    const webp     = true;
    const grayscale = false;

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
    const data = await resp.buffer();

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
