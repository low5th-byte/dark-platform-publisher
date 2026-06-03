const path = require('path');
const fs = require('fs').promises;
const { app } = require('electron');
const { v4: uuidv4 } = require('uuid');

let postsFile;
let posts = [];

async function initStore() {
  const dataDir = path.join(app.getPath('userData'), 'data');
  postsFile = path.join(dataDir, 'posts.json');
  await fs.mkdir(dataDir, { recursive: true });

  try {
    const raw = await fs.readFile(postsFile, 'utf-8');
    posts = JSON.parse(raw);
  } catch {
    posts = [];
    await savePosts();
  }
}

async function savePosts() {
  await fs.writeFile(postsFile, JSON.stringify(posts, null, 2), 'utf-8');
}

function getPosts() {
  return posts;
}

async function addPost({ platforms, content, scheduledTime }) {
  const post = {
    id: uuidv4(),
    platforms,
    content,
    scheduledTime,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  posts.push(post);
  await savePosts();
  return post;
}

async function updatePost(id, updates) {
  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Post not found');
  posts[idx] = { ...posts[idx], ...updates };
  await savePosts();
  return posts[idx];
}

async function cancelPost(id) {
  return updatePost(id, { status: 'cancelled' });
}

module.exports = { initStore, getPosts, addPost, updatePost, cancelPost };
