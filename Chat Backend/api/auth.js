import { loadData, saveData } from './_utils.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { userId, password } = req.query;
  
  if (!userId || !password) {
    return res.status(400).json({ error: 'Need userId and password' });
  }
  
  const db = await loadData();
  
  if (!db.users[userId]) {
    db.users[userId] = { channels: [], password };
    await saveData(db);
    return res.json({ success: true, newUser: true });
  }
  
  res.json({ success: db.users[userId].password === password });
}
