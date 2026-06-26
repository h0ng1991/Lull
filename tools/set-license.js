'use strict';
// 把 license 串写进 ~/.lull/config.json(无 BOM,避免 JSON.parse 失败)。
// 用法: node tools/set-license.js <license串>
const fs = require('fs');
const os = require('os');
const path = require('path');
const p = path.join(os.homedir(), '.lull', 'config.json');
const c = JSON.parse(fs.readFileSync(p, 'utf8'));
c.license = process.argv[2] || '';
fs.writeFileSync(p, JSON.stringify(c, null, 2)); // fs 默认 utf8 无 BOM
console.log('license 已写入 config.json');
