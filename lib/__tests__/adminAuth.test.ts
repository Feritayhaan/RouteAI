import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { ADMIN_KEY_HEADER, isAdminRequest, requireAdmin, timingSafeEqual } from '../adminAuth';

const SECRET = 'test-admin-secret';

function requestWith(headers: Record<string, string> = {}, query = ''): Request {
  return new Request(`https://routeai.test/api/admin/seed${query}`, { method: 'POST', headers });
}

describe('timingSafeEqual', () => {
  it('aynı dizeler için true döner', async () => {
    assert.strictEqual(await timingSafeEqual('s3cret', 's3cret'), true);
    assert.strictEqual(await timingSafeEqual('', ''), true);
  });

  it('farklı içerik ya da farklı uzunlukta false döner', async () => {
    assert.strictEqual(await timingSafeEqual('s3cret', 's3creT'), false);
    assert.strictEqual(await timingSafeEqual('s3cret', 's3cret-uzun'), false);
    assert.strictEqual(await timingSafeEqual('', 's3cret'), false);
  });
});

describe('isAdminRequest', () => {
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env.ADMIN_SECRET;
    process.env.ADMIN_SECRET = SECRET;
  });

  afterEach(() => {
    if (saved === undefined) delete process.env.ADMIN_SECRET;
    else process.env.ADMIN_SECRET = saved;
  });

  it('doğru x-admin-key başlığını kabul eder', async () => {
    assert.strictEqual(await isAdminRequest(requestWith({ [ADMIN_KEY_HEADER]: SECRET })), true);
  });

  it('?key= sorgu parametresini yok sayar', async () => {
    assert.strictEqual(await isAdminRequest(requestWith({}, `?key=${SECRET}`)), false);
  });

  it('yanlış ya da eksik başlığı reddeder', async () => {
    assert.strictEqual(await isAdminRequest(requestWith({ [ADMIN_KEY_HEADER]: 'yanlis' })), false);
    assert.strictEqual(await isAdminRequest(requestWith({ [ADMIN_KEY_HEADER]: '' })), false);
    assert.strictEqual(await isAdminRequest(requestWith()), false);
  });

  it('ADMIN_SECRET tanımsız ya da boşsa hiçbir isteği kabul etmez', async () => {
    delete process.env.ADMIN_SECRET;
    assert.strictEqual(await isAdminRequest(requestWith({ [ADMIN_KEY_HEADER]: '' })), false);
    assert.strictEqual(await isAdminRequest(requestWith({ [ADMIN_KEY_HEADER]: 'undefined' })), false);

    process.env.ADMIN_SECRET = '';
    assert.strictEqual(await isAdminRequest(requestWith({ [ADMIN_KEY_HEADER]: '' })), false);
  });
});

describe('requireAdmin', () => {
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env.ADMIN_SECRET;
    process.env.ADMIN_SECRET = SECRET;
  });

  afterEach(() => {
    if (saved === undefined) delete process.env.ADMIN_SECRET;
    else process.env.ADMIN_SECRET = saved;
  });

  it('yetkisiz istekte 401 döner', async () => {
    const denied = await requireAdmin(requestWith({}, `?key=${SECRET}`));
    assert.ok(denied);
    assert.strictEqual(denied.status, 401);
  });

  it('yetkili istekte null döner', async () => {
    assert.strictEqual(await requireAdmin(requestWith({ [ADMIN_KEY_HEADER]: SECRET })), null);
  });
});
