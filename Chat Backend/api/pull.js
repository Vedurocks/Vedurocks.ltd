import { loadData } from './_utils.js';

const secret = "mychatsecretkey2024";

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
  
  const { userId, password } = req.query;
  if (!userId) return res.status(400).json({ error: 'Need userId' });

  const db = await loadData();
  
  // Auth
  if (!db.users[userId]) {
    db.users[userId] = { channels: [], password };
    // Note: In real app, save password properly
  } else if (db.users[userId].password && db.users[userId].password !== password) {
    return res.status(401).json({ error: 'Wrong password' });
  }

  const userChannels = db.users[userId]?.channels || [];
  const chats = [];
  
  for (const channelId of userChannels) {
    const messages = db.messages
      .filter(m => m.channelId === channelId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);
    
    if (messages.length === 0) continue;
    
    const latest = messages[0];
    let groupName = null;
    
    if (latest.groupId) {
      try { groupName = decrypt(latest.groupId); } catch(e) { groupName = "Unknown"; }
    }
    
    chats.push({
      channelId,
      type: latest.type,
      groupId: latest.groupId,
      groupName,
      latestMessage: latest.data,
      latestTime: latest.timestamp,
      messages: messages.reverse()
    });
  }

  chats.sort((a, b) => (b.latestTime || 0) - (a.latestTime || 0));
  res.json({ userId, chats });
}
