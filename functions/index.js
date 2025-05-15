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
 * Use the official API to retrieve a signed URL for CDN paths
 */
async function getSignedUrl(rawUrl, apiHeaders) {
  try {
    const path = rawUrl.replace(CDN_URL, '');
    const endpoint = `${API_URL}/v1/manga/media/sign`;
    const res = await fetch(`${endpoint}?path=${encodeURIComponent(path)}`, { headers: apiHeaders });
    if (!res.ok) throw new Error(`API sign failed: ${res.status}`);
    const json = await res.json();
    return json.signedUrl || rawUrl;
  } catch (e) {
    console.warn('getSignedUrl failed, falling back to raw URL:', e.message);
    return rawUrl;
  }
}

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  let { url, jpeg, l: quality } = params;
  quality = parseInt(quality, 10) || 85;

  if (!url) {
    return { statusCode: 200, body: 'Bandwidth Hero Data Compression Service' };
  }

  try {
    // Parse possible JSON-array URL
    try { url = JSON.parse(url); } catch {}
    if (Array.isArray(url)) url = url.join('&url=');

    // Normalize internal proxy patterns
    url = url.replace(/http:\/\/1\.1\.\d+\.\d+\/bmi\/(https?:\/\/)?/i, 'http://');

    // Prepare fetch headers
    const fetchHeaders = {
      ...pick(event.headers, ['cookie', 'dnt', 'referer']),
      'user-agent': 'Bandwidth-Hero Compressor',
      'x-forwarded-for': event.headers['x-forwarded-for'] || (event.requestContext?.identity?.sourceIp) || '',
      'via': '1.1 bandwidth-hero',
    };

    // Ensure Referer for CDN
    if (url.includes(CDN_URL)) {
      fetchHeaders['Referer'] = 'https://app.shinigami.asia/';
      // Sign URL if missing token
      if (!url.includes('?')) {
        const apiHeaders = buildApiHeaders();
        url = await getSignedUrl(url, apiHeaders);
      }
    }

    console.log('Fetching image URL:', url);
    const res = await fetch(url, { headers: fetchHeaders });
    console.log('Fetch response status:', res.status);
    if (!res.ok) {
      return { statusCode: res.status, body: `Failed to fetch image: ${res.status}` };
    }

    const buffer = await res.buffer();
    if (!buffer || buffer.length === 0) {
      return { statusCode: 500, body: 'No image data received.' };
    }

    const contentType = res.headers.get('content-type') || '';
    const originalSize = buffer.length;
    console.log('Original image size:', originalSize);

    // Bypass compression if not needed
    if (!shouldCompress(contentType, originalSize, true)) {
      console.log('Skipping compression (shouldCompress=false)');
      return {
        statusCode: 200,
        body: buffer.toString('base64'),
        isBase64Encoded: true,
        headers: { 'content-encoding': 'identity', ...Object.fromEntries(res.headers) },
      };
    }

    // Compress image
    const result = await compress(buffer, 300, quality, originalSize);
    const { err, output, headers: compressHeaders = {} } = result;
    if (err || !output) {
      console.error('Compression error or no output:', err);
      throw err || new Error('Compression returned no output');
    }

    console.log(`Compressed image: ${originalSize} → ${output.length}`);
    return {
      statusCode: 200,
      body: output.toString('base64'),
      isBase64Encoded: true,
      headers: { 'content-encoding': 'identity', ...Object.fromEntries(res.headers), ...compressHeaders },
    };

  } catch (err) {
    console.error('Handler error:', err);
    return { statusCode: 500, body: err.message || 'Internal error' };
  }
};
