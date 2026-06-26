'use strict';
// 离线 license 验签(核心/开源):用内置公钥验 Ed25519 签名。无服务端、可离线。
// license 串格式: base64url(payloadJSON) + "." + base64url(signature)。
// 安全性来自私钥保密(在厂商手里),不靠代码保密——这段开源无妨。
const crypto = require('crypto');

// 厂商公钥(由 tools/keygen.js 生成;私钥在 ~/lull-vendor,绝不入库)
const PUBLIC_KEY =
  '-----BEGIN PUBLIC KEY-----\n' +
  'MCowBQYDK2VwAyEAwj3iH2rCvecv72ny1cfQAMIEmsESM4vwfZhx6CnbNx4=\n' +
  '-----END PUBLIC KEY-----\n';

function b64urlDecode(s) {
  return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

// 返回 { valid:bool, payload?, reason? }
function verify(token) {
  try {
    if (!token || typeof token !== 'string' || token.indexOf('.') < 0) return { valid: false, reason: 'empty' };
    const dot = token.indexOf('.');
    const p = token.slice(0, dot);
    const s = token.slice(dot + 1);
    if (!p || !s) return { valid: false, reason: 'malformed' };
    const ok = crypto.verify(null, Buffer.from(p), PUBLIC_KEY, b64urlDecode(s));
    if (!ok) return { valid: false, reason: 'bad-signature' };
    const payload = JSON.parse(b64urlDecode(p).toString('utf8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return { valid: false, reason: 'expired', payload };
    return { valid: true, payload };
  } catch (e) {
    return { valid: false, reason: 'error' };
  }
}

// 便捷:某 plan 是否解锁(默认要求 pro)
function isPro(token) {
  const r = verify(token);
  return r.valid && r.payload && (r.payload.plan === 'pro' || r.payload.plan === 'team');
}

module.exports = { verify, isPro };
