import assert from 'node:assert';
import { describe, it } from 'node:test';
import { classifyRequest, classifyViewport, isSplit, serverSplit } from '../device/classify';

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  androidPhone: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  androidTablet: 'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  firefoxTablet: 'Mozilla/5.0 (Android 13; Tablet; rv:127.0) Gecko/127.0 Firefox/127.0',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipadDesktopMode: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  windowsChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

describe('cihaz: sunucu tahmini (User-Agent + Sec-CH-UA-Mobile)', () => {
  it('telefonlar mobile', () => {
    assert.equal(classifyRequest({ userAgent: UA.iphone }), 'mobile');
    assert.equal(classifyRequest({ userAgent: UA.androidPhone, chUaMobile: '?1' }), 'mobile');
  });
  it('tabletler tablet (iPad UA\'sındaki "Mobile/" telefon sayılmaz)', () => {
    assert.equal(classifyRequest({ userAgent: UA.ipad }), 'tablet');
    assert.equal(classifyRequest({ userAgent: UA.androidTablet, chUaMobile: '?0' }), 'tablet');
    assert.equal(classifyRequest({ userAgent: UA.firefoxTablet }), 'tablet');
  });
  it('masaüstü; Client Hint ?1 gelirse mobile', () => {
    assert.equal(classifyRequest({ userAgent: UA.windowsChrome, chUaMobile: '?0' }), 'desktop');
    assert.equal(classifyRequest({ userAgent: UA.windowsChrome, chUaMobile: '?1' }), 'mobile');
    assert.equal(classifyRequest({}), 'desktop');
  });
  it('masaüstü UA\'lı iPadOS sunucuda desktop, tarayıcıda dokunmatikle tablet', () => {
    assert.equal(classifyRequest({ userAgent: UA.ipadDesktopMode }), 'desktop');
    assert.equal(classifyViewport({ width: 1180, coarsePointer: true, hover: false }), 'tablet');
  });
  it('yan yana düzeni sadece masaüstü tahmininde varsayar', () => {
    assert.equal(serverSplit('desktop'), true);
    assert.equal(serverSplit('tablet'), false);
    assert.equal(serverSplit('mobile'), false);
  });
});

describe('cihaz: tarayıcı ölçümü (genişlik + işaretçi)', () => {
  const fine = { coarsePointer: false, hover: true };
  it('genişlik sınırları 767/768/1023/1024', () => {
    assert.equal(classifyViewport({ width: 767, ...fine }), 'mobile');
    assert.equal(classifyViewport({ width: 768, ...fine }), 'tablet');
    assert.equal(classifyViewport({ width: 1023, ...fine }), 'tablet');
    assert.equal(classifyViewport({ width: 1024, ...fine }), 'desktop');
  });
  it('yan yana düzen 1024 ve üstü (yatay tablet dahil)', () => {
    assert.equal(isSplit(1023), false);
    assert.equal(isSplit(1024), true);
    assert.equal(classifyViewport({ width: 1366, coarsePointer: true, hover: false }), 'tablet');
  });
  it('dokunmatik ekranlı dizüstü (fare de var) desktop', () => {
    assert.equal(classifyViewport({ width: 1440, coarsePointer: true, hover: true }), 'desktop');
  });
});
