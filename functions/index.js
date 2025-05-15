const fetch = require('node-fetch');
const pick = require('../util/pick');
const shouldCompress = require('../util/shouldCompress');
const compress = require('../util/compress');

// Configuration
const API_URL = 'https://api.shngm.io';
const CDN_URL = 'https://storage.shngm.id';

// Build headers for API calls (similar to Tachiyomi)
function buildApiHeaders(initialHeaders = {}) {
  return {
    ...initialHeaders,
    'Accept': 'application/json',
    'Origin': 'https://app.shinigami.asia',
    'DNT': '1',
    'Sec-GPC': '1',
  };
}

/**
 * If given a raw CDN path (without token), use the official API
 * to retrieve a signed URL.
 */
async function getSignedUrl(rawUrl, apiHeaders) {
  try {
    const path = rawUrl.replace(CDN_URL, '');
    const endpoint = `${API_URL}/v1/manga/media/sign`;
    const res = await fetch(endpoint + `?path=${encodeURIComponent(path)}`, {
      headers: apiHeaders,
    });
    if (!res.ok) throw new Error(`API sign failed: ${res.status}`);
    const json = await res.json();
    return json.signedUrl || rawUrl;
  } catch (e) {
    console.warn('getSignedUrl failed, falling back to raw URL:', e.message);
    return rawUrl;
  }
}

exports.handler = async (event) => {
  let { url, jpeg, l: quality } = event.queryStringParameters || {};
  quality = parseInt(quality, 10) || 85;

  if (!url) {
    return { statusCode: 200, body: 'Bandwidth Hero Data Compression Service' };
  }

  try {
    try { url = JSON.parse(url); } catch {}
    if (Array.isArray(url)) url = url.join('&url=');
    url = url.replace(/http:\/\/1\.1\.\d+\.\d+\/bmi\/(https?:\/\/)?/i, 'http://');

    const fetchHeaders = {
      ...pick(event.headers, ['cookie', 'dnt', 'referer']),
      'user-agent': 'Bandwidth-Hero Compressor',
      'x-forwarded-for': event.headers['x-forwarded-for'] || event.requestContext?.identity?.sourceIp || '127.0.0.1',
      'via': '1.1 bandwidth-hero',
    };

    if (url.includes(CDN_URL)) {
      fetchHeaders['Referer'] = 'https://app.shinigami.asia/';
    }

    if (url.includes(CDN_URL) && !url.includes('?')) {
      const apiHeaders = buildApiHeaders();
      url = await getSignedUrl(url, apiHeaders);
    }

    console.log('Fetching:', url);
    const res = await fetch(url, { headers: fetchHeaders });
    console.log('Fetch status:', res.status);
    if (!res.ok) {
      return { statusCode: res.status, body: `Failed to fetch image: ${res.status}` };
    }

    const buffer = await res.buffer();
    if (!buffer || !buffer.length) {
      return { statusCode: 500, body: 'No image data received.' };
    }

    const contentType = res.headers.get('content-type') || '';
    const originalSize = buffer.length;
    console.log('Original size:', originalSize);

    if (!shouldCompress(contentType, originalSize, true)) {
      console.log('Bypassing compression');
      return {
        statusCode: 200,
        body: buffer.toString('base64'),
        isBase64Encoded: true,
        headers: { 'content-encoding': 'identity', ...Object.fromEntries(res.headers) },
      };
    }

    const { err, output, headers: compressHeaders } = await compress(buffer, 300, quality, originalSize);
    if (err) throw err;

    console.log(`Compressed ${originalSize} → ${output.length}`);
    return {
      statusCode: 200,
      body: output.toString('base64'),
      isBase64Encoded: true,
      headers: { 'content-encoding': 'identity', ...Object.fromEntries(res.headers), ...compressHeaders },
    };

  } catch (err) {
    console.error('Error in handler:', err);
    return { statusCode: 500, body: err.message || 'Internal error' };
  }
};
