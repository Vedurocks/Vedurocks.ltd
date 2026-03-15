import { loadData, saveData } from './_utils.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { raw } = req.body;
  const parts = raw.split('-');
  
  if (parts.length < 4) return res.status(400).json({ error: 'Invalid format' });

  const [channelId, data, userId, typeStr, groupId] = parts;
  const type = parseInt(typeStr);
  
  const db = await loadData();
  
  const message = {
    id: Date.now().toString(),
    channelId,
    data,
    userId,
    type,
    groupId: type === 1 ? groupId : null,
    timestamp: Date.now()
  };

  db.messages.push(message);
  
  // Keep only last 1000 messages
  if (db.messages.length > 1000) db.messages = db.messages.slice(-1000);
  
  // Track user channels
  if (!db.users[userId]) db.users[userId] = { channels: [] };
  if (!db.users[userId].channels.includes(channelId)) {
    db.users[userId].channels.push(channelId);
  }

  await saveData(db);

  res.json({ success: true, messageId: message.id });
}
