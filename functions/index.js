const fetch = require('node-fetch');
const { compress } = require('./compress');

exports.handler = async (event) => {
  const { url, w, q } = event.queryStringParameters || {};

  // Pastikan parameter w (width), q (quality), dan url valid
  const maxWidth = parseInt(w, 10);
  const quality = parseInt(q, 10);

  if (!url || isNaN(maxWidth) || isNaN(quality)) {
    return {
      statusCode: 400,
      body: 'Missing or invalid "url", "w" (width), or "q" (quality) parameter'
    };
  }

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
    const data = await resp.buffer();

    const { err, output, headers } = await compress(
      data,
      true,        // webp
      false,       // grayscale
      quality,
      data.length,
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
