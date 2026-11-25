import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
mkdirSync('public', { recursive: true });
const raw = Buffer.from(readFileSync('public/og-image.b64', 'utf8').replace(/\s+/g, ''), 'base64');
const sha = createHash('sha256').update(raw).digest('hex');
if (raw[0] !== 0xff || raw[1] !== 0xd8) throw new Error('og-image.b64 is not a valid JPEG. Re-copy it exactly.');
console.log('og-image.jpg bytes:', raw.length, 'sha256:', sha);
if (sha !== '00de29262e25956799c7bfa16ed1164d4896f7e0013a1431baddbbfd81b18617') console.warn('WARNING: checksum differs from the original; the image may be damaged. Expected 00de29262e25956799c7bfa16ed1164d4896f7e0013a1431baddbbfd81b18617');
writeFileSync('public/og-image.jpg', raw);
