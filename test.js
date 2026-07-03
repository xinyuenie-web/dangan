'use strict';

const assert = require('assert');
const http = require('http');

// We test the Express app directly without starting the server
const app = require('./server');

let server;
let baseUrl;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: '127.0.0.1',
      port: server.address().port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let json = null;
        try { json = raw ? JSON.parse(raw) : null; } catch (_ignored) {}
        resolve({ status: res.statusCode, body: json });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  // Start server on a random port
  await new Promise((res) => {
    server = app.listen(0, '127.0.0.1', res);
  });

  let passed = 0;
  let failed = 0;
  const createdIds = [];

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  console.log('\n档案管理系统 – API Tests\n');

  // ── GET /api/archives (initial) ──────────────────────────────────
  await test('GET /api/archives returns an array', async () => {
    const { status, body } = await request('GET', '/api/archives');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body));
  });

  // ── POST /api/archives ───────────────────────────────────────────
  await test('POST /api/archives creates a new archive', async () => {
    const { status, body } = await request('POST', '/api/archives', {
      title: '测试档案',
      category: '人事',
      author: '张三',
      date: '2024-01-01',
      description: '这是一条测试档案',
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(body.title, '测试档案');
    assert.strictEqual(body.category, '人事');
    assert.ok(body.id);
    createdIds.push(body.id);
  });

  await test('POST /api/archives validates required fields', async () => {
    const { status, body } = await request('POST', '/api/archives', {
      title: '缺少分类',
    });
    assert.strictEqual(status, 400);
    assert.ok(body.error);
  });

  // ── GET /api/archives/:id ────────────────────────────────────────
  await test('GET /api/archives/:id returns the archive', async () => {
    const id = createdIds[0];
    const { status, body } = await request('GET', `/api/archives/${id}`);
    assert.strictEqual(status, 200);
    assert.strictEqual(body.id, id);
    assert.strictEqual(body.title, '测试档案');
  });

  await test('GET /api/archives/:id returns 404 for unknown id', async () => {
    const { status } = await request('GET', '/api/archives/nonexistent-id');
    assert.strictEqual(status, 404);
  });

  // ── GET /api/archives?q= (search) ───────────────────────────────
  await test('GET /api/archives?q= filters by query', async () => {
    const { status, body } = await request('GET', `/api/archives?q=${encodeURIComponent('测试')}`);
    assert.strictEqual(status, 200);
    assert.ok(body.length >= 1);
    assert.ok(body.some((a) => a.title === '测试档案'));
  });

  await test('GET /api/archives?q= returns empty for no match', async () => {
    const { status, body } = await request('GET', `/api/archives?q=${encodeURIComponent('绝对不存在的内容xyz')}`);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body));
    assert.strictEqual(body.length, 0);
  });

  // ── GET /api/archives?category= ─────────────────────────────────
  await test('GET /api/archives?category= filters by category', async () => {
    const { status, body } = await request('GET', `/api/archives?category=${encodeURIComponent('人事')}`);
    assert.strictEqual(status, 200);
    assert.ok(body.every((a) => a.category === '人事'));
  });

  // ── PUT /api/archives/:id ────────────────────────────────────────
  await test('PUT /api/archives/:id updates the archive', async () => {
    const id = createdIds[0];
    const { status, body } = await request('PUT', `/api/archives/${id}`, {
      title: '已更新的档案',
      category: '财务',
      author: '李四',
      date: '2024-06-01',
      description: '已更新的描述',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.title, '已更新的档案');
    assert.strictEqual(body.category, '财务');
    assert.strictEqual(body.author, '李四');
  });

  await test('PUT /api/archives/:id returns 404 for unknown id', async () => {
    const { status } = await request('PUT', '/api/archives/nonexistent-id', {
      title: 'x',
      category: 'x',
      author: 'x',
      date: '2024-01-01',
    });
    assert.strictEqual(status, 404);
  });

  await test('PUT /api/archives/:id validates required fields', async () => {
    const id = createdIds[0];
    const { status } = await request('PUT', `/api/archives/${id}`, {
      title: '缺少其他字段',
    });
    assert.strictEqual(status, 400);
  });

  // ── GET /api/categories ──────────────────────────────────────────
  await test('GET /api/categories returns array of categories', async () => {
    const { status, body } = await request('GET', '/api/categories');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.includes('财务'));
  });

  // ── DELETE /api/archives/:id ─────────────────────────────────────
  await test('DELETE /api/archives/:id removes the archive', async () => {
    const id = createdIds[0];
    const { status } = await request('DELETE', `/api/archives/${id}`);
    assert.strictEqual(status, 204);

    // Confirm it's gone
    const { status: getStatus } = await request('GET', `/api/archives/${id}`);
    assert.strictEqual(getStatus, 404);
  });

  await test('DELETE /api/archives/:id returns 404 for unknown id', async () => {
    const { status } = await request('DELETE', '/api/archives/nonexistent-id');
    assert.strictEqual(status, 404);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test runner error:', err);
  if (server) server.close();
  process.exit(1);
});
