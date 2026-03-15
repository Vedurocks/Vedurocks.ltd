import { get, put } from '@vercel/blob';

const BLOB_KEY = 'chat-data.json';

export async function loadData() {
  try {
    const blob = await get(BLOB_KEY);
    const text = await blob.text();
    return JSON.parse(text);
  } catch (e) {
    return { messages: [], users: {}, groups: {} };
  }
}

export async function saveData(data) {
  await put(BLOB_KEY, JSON.stringify(data), {
    contentType: 'application/json',
    access: 'public'
  });
}
