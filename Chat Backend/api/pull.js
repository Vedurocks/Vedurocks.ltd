import { kv } from '@vercel/kv';
import { decrypt } from '../lib/crypto.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { userId, password } = req.query;
  
  if (!userId) return res.status(400).json({ error: 'Need userId' });

  // Simple auth check (store password in KV on first use)
  const authKey = `auth:${userId}`;
  const storedPass = await kv.get(authKey);
  
  if (storedPass && storedPass !== password) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  
  if (!storedPass && password) {
    // First time, set password
    await kv.set(authKey, password);
  }

  // Get all channels this user is in
  const userChannels = await kv.smembers(`user:${userId}:chats`);
  
  const chats = [];
  
  for (const channelId of userChannels) {
    const messages = await kv.lrange(`channel:${channelId}`, 0, 50);
    const parsed = messages.map(m => JSON.parse(m));
    
    // Get latest message for preview
    const latest = parsed[0];
    
    // Decrypt group name if exists
    let groupName = null;
    if (latest.groupId) {
      try {
        groupName = decrypt(latest.groupId);
      } catch(e) {
        groupName = "Unknown Group";
      }
    }
    
    chats.push({
      channelId,
      type: latest.type,
      groupId: latest.groupId,
      groupName,
      latestMessage: latest.data,
      latestTime: latest.timestamp,
      unread: 0, // TODO: implement read receipts
      messages: parsed.reverse() // Oldest first
    });
  }

  // Sort by latest message
  chats.sort((a, b) => b.latestTime - a.latestTime);

  res.json({ 
    userId,
    chats 
  });
}
