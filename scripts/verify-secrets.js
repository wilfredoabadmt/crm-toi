#!/usr/bin/env node
/**
 * Script de verificación de secretos
 * Uso: node scripts/verify-secrets.js
 */
import fs from 'fs';
import path from 'path';

const SECRET_PATTERNS = [
  /sk-or-v1-[a-zA-Z0-9]{32,}/g,
  /sk-[a-zA-Z0-9]{20,}/g,
  /Bearer\s+[a-zA-Z0-9._-]{20,}/g
];

const IGNORE_DIRS = ['node_modules', '.git', '.next'];
const ENV_EXTENSIONS = ['.env', '.env.example', '.env.local', '.env.development', '.env.production', '.json', '.ts', '.js', '.yml', '.yaml'];

let foundSecrets = [];

function scanDirectory(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        if (!IGNORE_DIRS.includes(file)) {
          scanDirectory(fullPath);
        }
      } else {
        const ext = path.extname(fullPath);
        const baseName = path.basename(fullPath);
        const isEnvFile = baseName.startsWith('.env') || ENV_EXTENSIONS.includes(ext);
        if (isEnvFile) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const pattern of SECRET_PATTERNS) {
            const matches = content.match(pattern);
            if (matches) {
              foundSecrets.push({ file: fullPath, matches: matches });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn(`Advertencia escaneando ${dir}: ${err.message}`);
  }
}

scanDirectory(process.cwd());

if (foundSecrets.length > 0) {
  console.log('=== ¡SECRETO ENCONTRADO! ===');
  foundSecrets.forEach(({ file, matches }) => {
    console.log(`${file}: ${matches.join(', ')}`);
  });
  process.exit(1);
} else {
  console.log('✅ No se encontraron secretos.');
  process.exit(0);
}
