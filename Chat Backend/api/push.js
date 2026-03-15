import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { raw } = req.body;
  
  // Parse: 132-ssissssszuldus-x45678-0 or 132-hello-x45678-1-x356
  const parts = raw.split('-');
  
  if (parts.length < 4) {
    return res.status(400).json({ error: 'Invalid format' });
  }

  const channelId = parts[0];
  const data = parts[1];
  const userId = parts[2];
  const type = parseInt(parts[3]); // 1=group, 2=single
  
  let groupId = null;
  if (type === 1 && parts[4]) {
    groupId = parts[4]; // encrypted group id
  }

  const messageId = Date.now().toString();
  
  const message = {
    id: messageId,
    channelId,
    data,           // encrypted message content
    userId,
    type,           // 1 or 2
    groupId,        // null or encrypted
    timestamp: Date.now()
  };

  // Store in multiple places for fast retrieval
  
  // 1. By channel (full history)
  const channelKey = `channel:${channelId}`;
  await kv.lpush(channelKey, JSON.stringify(message));
  await kv.ltrim(channelKey, 0, 99); // Keep last 100
  
  // 2. By user (for inbox)
  const userKey = `user:${userId}:chats`;
  await kv.sadd(userKey, channelId);
  
  // 3. If group, link group to channel
  if (groupId) {
    const groupKey = `group:${groupId}`;
    await kv.sadd(groupKey, channelId);
  }

  // 4. Store message individually
  await kv.setex(`msg:${messageId}`, 86400 * 7, JSON.stringify(message)); // 7 days

  res.json({ 
    success: true, 
    messageId,
    parsed: { channelId, userId, type, groupId }
  });
}
