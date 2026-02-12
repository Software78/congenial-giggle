#!/usr/bin/env node
/**
 * Tests that the content queue works: create creator → create content → wait for processing → verify published & in feed.
 * Usage: node scripts/test-queue.mjs [baseUrl]
 * Default baseUrl: http://localhost:3000
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';

async function request(method, path, body) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    throw new Error(
      `Cannot reach API at ${BASE_URL}. Is it running? (npm run start:dev)`,
    );
  }
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Invalid response from ${url} (status ${res.status})`);
  }
  if (data.code >= 400) {
    const msg = data.message || res.statusText;
    const hint =
      data.code >= 500
        ? '\n   Hint: Ensure Docker (PostgreSQL + Redis) is running: docker-compose up -d'
        : '';
    throw new Error(`Request failed: ${msg}${hint}`);
  }
  return data;
}

async function main() {
  console.log('Testing queue flow at', BASE_URL);
  console.log('');

  console.log('0. Health check...');
  await request('GET', '/');
  console.log('   API is reachable');

  const email = `queue-test-${Date.now()}@example.com`;

  console.log('1. Creating creator...');
  const creatorRes = await request('POST', '/creators', {
    name: 'Queue Test Creator',
    email,
  });
  const creatorId = creatorRes.data.id;
  console.log('   Created creator id:', creatorId);

  console.log('2. Creating content (status: draft, job enqueued)...');
  const contentRes = await request('POST', '/content', {
    title: 'Queue Test Post',
    description: 'Testing async publish',
    tags: ['test', 'queue'],
    creatorId,
  });
  const contentId = contentRes.data.id;
  const initialStatus = contentRes.data.status;
  console.log('   Created content id:', contentId, '| status:', initialStatus);

  if (initialStatus !== 'draft') {
    console.log('   WARN: Expected draft, got', initialStatus);
  }

  console.log('3. Waiting 3 seconds for queue to process...');
  await new Promise((r) => setTimeout(r, 3000));

  console.log('4. Fetching content (expect status: published)...');
  const getRes = await request('GET', `/content/${contentId}`);
  const status = getRes.data.status;
  console.log('   Status:', status);

  if (status !== 'published') {
    console.log('');
    console.log('FAIL: Content was not published. Status:', status);
    process.exit(1);
  }

  console.log('5. Checking feed for content...');
  const feedRes = await request('GET', '/feed?limit=10');
  const found = feedRes.data.some((item) => item.id === contentId);
  console.log('   Found in feed:', found ? 'yes' : 'no');

  if (!found) {
    console.log('');
    console.log('FAIL: Content not found in feed');
    process.exit(1);
  }

  console.log('');
  console.log('SUCCESS: Queue is working. Content was published and appears in feed.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
