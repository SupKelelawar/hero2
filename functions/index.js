const pick = require("../util/pick");
const fetch = require("node-fetch");
const shouldCompress = require("../util/shouldCompress");
const compress = require("../util/compress");

exports.handler = async (e, t) => {
  let { url: r } = e.queryStringParameters;
  let { jpeg: s, l: a } = e.queryStringParameters;

  if (!r) {
    return {
      statusCode: 200,
      body: "Bandwidth Hero Data Compression Service",
    };
  }

  try {
    r = JSON.parse(r);
  } catch {}

  Array.isArray(r) && (r = r.join("&url="));
  r = r.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, "http://");

  let i = parseInt(a, 10) || 85; // Set default quality to 85

  try {
    const fetchHeaders = {
      ...pick(e.headers, ["cookie", "dnt", "referer"]),
      "user-agent": "Bandwidth-Hero Compressor",
      "x-forwarded-for": e.headers["x-forwarded-for"] || e.ip,
      via: "1.1 bandwidth-hero",
    };

    if (r.includes("storage.shngm.id")) {
      fetchHeaders["Referer"] = "https://app.shinigami.asia/";
    }

    console.log("Fetching URL:", r);

    const res = await fetch(r, { headers: fetchHeaders });

    console.log("Response status:", res.status);

    if (!res.ok) {
      console.error(`Fetch failed with status ${res.status}`);
      return {
        statusCode: res.status || 500,
        body: `Failed to fetch image.`,
      };
    }

    const c = await res.buffer();

    if (!c || !c.length) {
      return {
        statusCode: 500,
        body: "No image data received.",
      };
    }

    const l = res.headers.get("content-type") || "";
    const p = c.length;

    console.log("Content-Type:", l);
    console.log("Image size:", p);

    if (!shouldCompress(l, p, true)) {
      console.log("Bypassing compression...");
      return {
        statusCode: 200,
        body: c.toString("base64"),
        isBase64Encoded: true,
        headers: {
          "content-encoding": "identity",
          ...res.headers,
        },
      };
    }

    const { err: u, output: y, headers: g } = await compress(c, 300, i, p);

    if (u) {
      console.error("Conversion failed:", r, u);
      throw u;
    }

    console.log(`Compressed from ${p} to ${y.length}, Saved: ${(p - y.length) / p}%`);

    return {
      statusCode: 200,
      body: y.toString("base64"),
      isBase64Encoded: true,
      headers: {
        "content-encoding": "identity",
        ...res.headers,
        ...g,
      },
    };
  } catch (f) {
    console.error(f);
    return {
      statusCode: 500,
      body: f.message || "",
    };
  }
};
