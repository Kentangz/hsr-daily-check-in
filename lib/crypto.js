import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey() {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not defined');
  }
  if (keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
}

export function encrypt(plaintext) {
  if (!plaintext) return '';
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  const ivHex = iv.toString('hex');
  
  return `${ivHex}:${authTag}:${ciphertext}`;
}

export function decrypt(encryptedString) {
  if (!encryptedString) return '';
  const key = getKey();
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted string format. Expected iv:authTag:ciphertext');
  }
  
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let plaintext = decipher.update(ciphertext, undefined, 'utf8');
  plaintext += decipher.final('utf8');
  
  return plaintext;
}
