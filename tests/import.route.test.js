import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGO_URI = 'mongodb://127.0.0.1:1/none';
process.env.JWT_SECRET = 'test';
process.env.GEMINI_API_KEY = ''; // key নেই, তাই সার্ভিস পর্যন্ত পৌঁছালে 503 আসবে

const { default: express } = await import('express');
const { uploadImages } = await import('../src/middleware/upload.js');
const { extractFromImages } = await import('../src/controllers/import.controller.js');
const { errorHandler } = await import('../src/middleware/error.js');

// লগইন যাচাই বাদ দিয়ে শুধু ছবি নেওয়া আর নম্বর পড়ার অংশটা পরীক্ষা করা হয়
const app = express();
app.post('/from-images', uploadImages, extractFromImages);
app.use(errorHandler);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

const png = (name = 'a.png', type = 'image/png') => new File([new Uint8Array([1, 2, 3])], name, { type });

async function post(build) {
  const form = new FormData();
  build(form);
  const res = await fetch(`${base}/from-images`, { method: 'POST', body: form });
  return [res.status, (await res.json()).message];
}

test('no image -> 400', async () => {
  const [status, message] = await post((f) => f.append('mode', 'all'));
  assert.equal(status, 400);
  assert.match(message, /কমপক্ষে একটা ছবি/);
});

test('selected mode without numbers -> 400', async () => {
  const [status, message] = await post((f) => { f.append('images', png()); f.append('mode', 'selected'); });
  assert.equal(status, 400);
  assert.match(message, /কোন কোন নম্বর/);
});

test('bad number text -> 400 before calling Gemini', async () => {
  const [status, message] = await post((f) => { f.append('images', png()); f.append('mode', 'selected'); f.append('numbers', 'abc'); });
  assert.equal(status, 400);
  assert.match(message, /বোঝা যাচ্ছে না/);
});

test('non-image file -> 400', async () => {
  const [status, message] = await post((f) => f.append('images', png('a.pdf', 'application/pdf')));
  assert.equal(status, 400);
  assert.match(message, /JPG, PNG/);
});

test('more than 5 images -> 400', async () => {
  const [status, message] = await post((f) => { for (let i = 0; i < 6; i++) f.append('images', png(`${i}.png`)); });
  assert.equal(status, 400);
  assert.match(message, /সর্বোচ্চ ৫টা/);
});

test('valid request reaches the service (503 because no key in this test)', async () => {
  const [status, message] = await post((f) => { f.append('images', png()); f.append('mode', 'selected'); f.append('numbers', '৩৪, ৩৫'); });
  assert.equal(status, 503);
  assert.match(message, /GEMINI_API_KEY/);
});
