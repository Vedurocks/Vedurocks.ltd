import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { userId, password } = req.query;
  
  if (!userId || !password) {
    return res.status(400).json({ error: 'Need userId and password' });
  }
  
  const authKey = `auth:${userId}`;
  const stored = await kv.get(authKey);
  
  if (!stored) {
    // New user
    await kv.set(authKey, password);
    return res.json({ success: true, newUser: true });
  }
  
  if (stored === password) {
    return res.json({ success: true });
  }
  
  res.status(401).json({ success: false, error: 'Wrong password' });
}
