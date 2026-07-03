'use strict';

const crypto = require('crypto');
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'archives.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: read archives
function readArchives() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (_) {
    return [];
  }
}

// Helper: write archives
function writeArchives(archives) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(archives, null, 2));
}

// GET all archives (with optional search/filter)
app.get('/api/archives', (req, res) => {
  let archives = readArchives();
  const { q, category } = req.query;

  if (q) {
    const query = q.toLowerCase();
    archives = archives.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        (a.description || '').toLowerCase().includes(query) ||
        a.author.toLowerCase().includes(query)
    );
  }

  if (category) {
    archives = archives.filter((a) => a.category === category);
  }

  res.json(archives);
});

// GET single archive
app.get('/api/archives/:id', (req, res) => {
  const archives = readArchives();
  const archive = archives.find((a) => a.id === req.params.id);
  if (!archive) {
    return res.status(404).json({ error: '档案未找到' });
  }
  res.json(archive);
});

// POST create archive
app.post('/api/archives', (req, res) => {
  const { title, category, author, date, description } = req.body;

  if (!title || !category || !author || !date) {
    return res.status(400).json({ error: '标题、分类、负责人和日期为必填项' });
  }

  const archives = readArchives();
  const newArchive = {
    id: crypto.randomBytes(8).toString('hex'),
    title,
    category,
    author,
    date,
    description: description || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  archives.push(newArchive);
  writeArchives(archives);
  res.status(201).json(newArchive);
});

// PUT update archive
app.put('/api/archives/:id', (req, res) => {
  const archives = readArchives();
  const index = archives.findIndex((a) => a.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: '档案未找到' });
  }

  const { title, category, author, date, description } = req.body;

  if (!title || !category || !author || !date) {
    return res.status(400).json({ error: '标题、分类、负责人和日期为必填项' });
  }

  archives[index] = {
    ...archives[index],
    title,
    category,
    author,
    date,
    description: description || '',
    updatedAt: new Date().toISOString(),
  };

  writeArchives(archives);
  res.json(archives[index]);
});

// DELETE archive
app.delete('/api/archives/:id', (req, res) => {
  const archives = readArchives();
  const index = archives.findIndex((a) => a.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: '档案未找到' });
  }

  archives.splice(index, 1);
  writeArchives(archives);
  res.status(204).send();
});

// GET categories
app.get('/api/categories', (req, res) => {
  const archives = readArchives();
  const categories = [...new Set(archives.map((a) => a.category))];
  res.json(categories);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`档案管理系统运行在 http://localhost:${PORT}`);
  });
}

module.exports = app;
