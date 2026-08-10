#!/usr/bin/env node

/**
 * Decrypt an encrypted role slug
 */

const { decrypt } = require("../shared/lib/fieldCipher");

const encryptedSlug = process.argv[2];

if (!encryptedSlug) {
  console.error("Usage: node scripts/decrypt-role.js <encrypted-slug>");
  console.error("Example: node scripts/decrypt-role.js 'det:v2:a1d65429cb687e64ba9f5229:d8b3947a4f543d9909b3379ee52595a6:65c03d051f'");
  process.exit(1);
}

try {
  const decrypted = decrypt(encryptedSlug);
  console.log(`Encrypted: ${encryptedSlug}`);
  console.log(`Decrypted: ${decrypted}`);
} catch (error) {
  console.error("❌ Error decrypting:", error.message);
  process.exit(1);
}
