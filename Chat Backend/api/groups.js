import { kv } from '@vercel/kv';
import { encrypt, decrypt } from '../lib/crypto.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { action, name, groupId } = req.query;
  
  if (action === 'create' && name) {
    // Create new group, return encrypted ID
    const encrypted = encrypt(name);
    await kv.set(`groupname:${encrypted}`, name);
    return res.json({ 
      groupName: name, 
      groupId: encrypted 
    });
  }
  
  if (action === 'decrypt' && groupId) {
    try {
      const name = decrypt(groupId);
      return res.json({ groupId, groupName: name });
    } catch(e) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }
  }
  
  res.json({ error: 'Need action=name or action=decrypt' });
}
