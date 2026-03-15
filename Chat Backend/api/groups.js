import { loadData, saveData } from './_utils.js';

const secret = "mychatsecretkey2024";

function encrypt(text) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ secret.charCodeAt(i % secret.length));
  }
  return Buffer.from(result).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function decrypt(encrypted) {
  let base64 = encrypted.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const text = Buffer.from(base64, 'base64').toString();
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ secret.charCodeAt(i % secret.length));
  }
  return result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { action, name, groupId } = req.query;
  
  const db = await loadData();
  
  if (action === 'create' && name) {
    const encrypted = encrypt(name);
    db.groups[encrypted] = name;
    await saveData(db);
    return res.json({ groupName: name, groupId: encrypted });
  }
  
  if (action === 'decrypt' && groupId) {
    const name = db.groups[groupId];
    if (name) return res.json({ groupId, groupName: name });
    try {
      const decrypted = decrypt(groupId);
      return res.json({ groupId, groupName: decrypted });
    } catch(e) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }
  }
  
  res.json({ groups: db.groups });
}
