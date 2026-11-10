// Minimal jsonwebtoken shim backed by node:crypto (HS256 only) — avoids
// installing packages in the sandbox; the real project uses jsonwebtoken.
const crypto = require("crypto");
function b64(obj) { return Buffer.from(JSON.stringify(obj)).toString("base64url"); }
function sign(payload, secret, opts = {}) {
    const header = { alg: "HS256", typ: "JWT" };
    const body = { ...payload };
    if (opts.expiresIn) body.exp = Math.floor(Date.now() / 1000) + parseSec(opts.expiresIn);
    if (opts.issuer) body.iss = opts.issuer;
    const data = b64(header) + "." + b64(body);
    const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
    return data + "." + sig;
}
function parseSec(v) {
    if (typeof v === "number") return v;
    const m = String(v).match(/^(\d+)([smhd])$/);
    const mult = { s: 1, m: 60, h: 3600, d: 86400 }[m[2]];
    return parseInt(m[1], 10) * mult;
}
function verify(token, secret, opts = {}) {
    const parts = String(token).split(".");
    if (parts.length !== 3) throw new Error("jwt malformed");
    const expect = crypto.createHmac("sha256", secret).update(parts[0] + "." + parts[1]).digest("base64url");
    if (expect !== parts[2]) throw new Error("invalid signature");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error("jwt expired");
    if (opts.issuer && payload.iss !== opts.issuer) throw new Error("jwt issuer invalid");
    return payload;
}
module.exports = { sign, verify };
