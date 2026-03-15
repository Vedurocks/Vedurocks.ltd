// Simple XOR encryption for group names
// Same logic in Android app needed

const SECRET = "mychatsecretkey2024";

export function encrypt(text) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ SECRET.charCodeAt(i % SECRET.length)
    );
  }
  return Buffer.from(result).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function decrypt(encrypted) {
  // Restore padding
  let base64 = encrypted.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  
  const text = Buffer.from(base64, 'base64').toString();
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ SECRET.charCodeAt(i % SECRET.length)
    );
  }
  return result;
}
