import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOTS = ['src'];

const forbiddenFileFragments = [
  'supabase-fallback',
  'public-boot-debug',
  'tenant-public-isolation'
];

const forbiddenRuntimePatterns = [
  {
    label: 'production rid query parameter dependency',
    regex: /[?&]rid=/i
  },
  {
    label: 'legacy SHORASH global menu cache key',
    regex: /SHORASH_MENU_OFFLINE_CACHE_V1/
  },
  {
    label: 'legacy SHORASH global brand cache key',
    regex: /SHORASH_BRAND_CACHE_V1/
  },
  {
    label: 'legacy SHORASH production Supabase project URL',
    regex: /pklzxpivnoqnrzyjryqz\.supabase\.co/i
  },
  {
    label: 'service role browser credential marker',
    regex: /service[_-]?role/i
  },
  {
    label: 'JavaScript Proxy usage in runtime foundation',
    regex: /\bnew\s+Proxy\s*\(/
  }
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(full));
    } else {
      files.push(full);
    }
  }

  return files;
}

const violations = [];

for (const root of ROOTS) {
  let files = [];
  try {
    files = await walk(root);
  } catch {
    continue;
  }

  for (const file of files) {
    const normalized = file.split(path.sep).join('/');

    for (const fragment of forbiddenFileFragments) {
      if (normalized.toLowerCase().includes(fragment)) {
        violations.push(`${normalized}: forbidden experimental file name fragment: ${fragment}`);
      }
    }

    if (!/\.(?:js|mjs|html|css|json)$/i.test(file)) continue;

    const text = await readFile(file, 'utf8');

    for (const rule of forbiddenRuntimePatterns) {
      if (rule.regex.test(text)) {
        violations.push(`${normalized}: ${rule.label}`);
      }
    }
  }
}

if (violations.length) {
  console.error('RESTBR Gold architecture guard failed:\n');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('RESTBR Gold architecture guard passed.');
