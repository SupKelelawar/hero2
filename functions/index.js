const pick = require("../util/pick"),
  fetch = require("node-fetch"),
  shouldCompress = require("../util/shouldCompress"),
  compress = require("../util/compress"),
  DEFAULT_QUALITY = 85;

exports.handler = async (e, t) => {
  let { url: r } = e.queryStringParameters,
    { jpeg: s, l: a } = e.queryStringParameters;
  if (!r) return { statusCode: 200, body: "Bandwidth Hero Data Compression Service" };
  
  try {
    r = JSON.parse(r);
  } catch {}
  
  Array.isArray(r) && (r = r.join("&url="));
  r = r.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, "http://");
  
  let i = parseInt(a, 10) || DEFAULT_QUALITY; // Set default quality to 80

  try {
    let h = {},
      { data: c, type: l } = await fetch(r, {
        headers: {
          ...pick(e.headers, ["cookie", "dnt", "referer"]),
          "user-agent": "Bandwidth-Hero Compressor",
          "x-forwarded-for": e.headers["x-forwarded-for"] || e.ip,
          via: "1.1 bandwidth-hero",
        },
      }).then(async (e) =>
        e.ok
          ? ((h = e.headers),
            {
              data: await e.buffer(),
              type: e.headers.get("content-type") || "",
            })
          : { statusCode: e.status || 302 },
      ),
      p = c.length;

    // Log untuk debugging
    console.log("Processing image with type:", l, "and size:", p);
    
    if (!shouldCompress(l, p, true)) {
      console.log("Bypassing compression...");
      return {
        statusCode: 200,
        body: c.toString("base64"),
        isBase64Encoded: !0,
        headers: { "content-encoding": "identity", ...h },
      };
    }

    // Set width dan quality sesuai default atau nilai yang diterima
    let { err: u, output: y, headers: g } = await compress(c, 300, i, p);
    if (u) throw (console.log("Conversion failed: ", r), u);
    
    console.log(`Compressed from ${p} to ${y.length}, Saved: ${(p - y.length) / p}%`);
    let $ = y.toString("base64");
    
    return {
      statusCode: 200,
      body: $,
      isBase64Encoded: !0,
      headers: { "content-encoding": "identity", ...h, ...g },
    };
  } catch (f) {
    console.error(f);
    return { statusCode: 500, body: f.message || "" };
  }
};
