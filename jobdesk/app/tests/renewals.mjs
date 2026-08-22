// playwright ไม่ได้อยู่ใน dependencies เพราะมันหนัก และ CI กับเครื่อง dev มักมีติดมาแล้ว
// ชี้ที่อยู่เองได้ด้วย PLAYWRIGHT_PACKAGE ถ้าติดตั้งไว้คนละที่
// (แพ็กเกจเป็น CJS จึงต้องรับทั้งแบบ named export และแบบ .default)
const pw = await import(process.env.PLAYWRIGHT_PACKAGE ?? 'playwright');
const chromium = pw.chromium ?? pw.default?.chromium;
if (!chromium) {
  console.error('หา playwright ไม่เจอ — ติดตั้งก่อน หรือตั้ง PLAYWRIGHT_PACKAGE ให้ชี้ที่ index.js');
  process.exit(2);
}
const OUT = process.argv[2];
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
// รหัสผ่านไม่ฝังในโค้ด — มาจาก .env.local เหมือนที่แอปใช้ (tests/run.sh ส่งให้)
const APP_PASSWORD = process.env.APP_PASSWORD;
const CRON_SECRET = process.env.CRON_SECRET;
if (!APP_PASSWORD) {
  console.error('ต้องตั้ง APP_PASSWORD ก่อน — รันผ่าน tests/run.sh หรือ export เอง');
  process.exit(2);
}
const fails = [];
const ok = (n, c, extra='') => { console.log(`${c ? '  ok  ' : ' FAIL '} ${n}${c?'':' — '+extra}`); if(!c) fails.push(n); };

const b = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, colorScheme: 'light', locale: 'th-TH' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));

await p.goto(BASE + '/login', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
await p.fill('input[name=password]', APP_PASSWORD);
await p.locator('main button[type=submit]').click();
await p.waitForURL(BASE + '/', { timeout: 15000 });
await p.waitForTimeout(600);

// ---------- home strip
let t = await p.locator('body').innerText();
ok('หน้าแรกมีแถบใกล้หมดอายุ', t.includes('ใกล้หมดอายุ'));
ok('แถบนี้โชว์เว็บที่จะหมดใน 7 วัน', t.includes('baansuancoffee.com'));
ok('เว็บที่หมดอีก 120 วันไม่ต้องขึ้นแถบนี้', !t.includes('jaidee-dental.com'));
await p.screenshot({ path: `${OUT}/20-home.png`, fullPage: true });

// ---------- renewals page
await p.goto(BASE + '/renewals', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
t = await p.locator('body').innerText();
ok('หน้าต่ออายุแสดงครบทั้ง 4 เว็บ',
   ['baansuancoffee.com','changek-garage.com','jaidee-dental.com','teeyon-parts.com'].every(d => t.includes(d)));
ok('เว็บที่เลยกำหนดขึ้นเตือนว่าเลยมา 3 วัน', t.includes('เลยมา 3 วัน'));
ok('KPI นับเว็บที่ดูแลได้ 4', /เว็บที่ดูแล\s*4/.test(t.replace(/\s+/g,' ')), t.slice(0,300));
ok('KPI นับที่หมดใน 30 วันได้ 2', /หมดใน 30 วัน\s*2/.test(t.replace(/\s+/g,' ')));
ok('ยังไม่ตั้งช่องทางแจ้งเตือนแล้วบอกให้รู้', t.includes('ยังไม่ได้ตั้งค่า'));
ok('บอกว่าเตือนล่วงหน้ากี่วัน', t.includes('30 / 14 / 7 / 1'));

// เรียงตามวันหมดอายุ
const order = await p.locator('a[href^="/websites/"]:not([href="/websites/new"])').allTextContents();
ok('เรียงจากที่หมดก่อน', order[0] === 'teeyon-parts.com' && order[1] === 'baansuancoffee.com',
   JSON.stringify(order.slice(0,4)));
await p.screenshot({ path: `${OUT}/21-renewals.png`, fullPage: true });

// ---------- run the reminder job from the page
await p.locator('button:has-text("รันงานเตือนตอนนี้")').click();
await p.waitForTimeout(2000);
t = await p.locator('body').innerText();
ok('รันงานเตือนแล้วรายงานว่าถึงคิว 2 เว็บ', /ถึงคิวเตือน\s*2/.test(t.replace(/\s+/g,' ')), t.slice(0,200));
ok('บอกตรง ๆ ว่าส่งไม่ออกเพราะยังไม่ได้ตั้งช่องทาง', t.includes('ยังไม่ได้ตั้งค่าช่องทางแจ้งเตือน'));

// ---------- record a renewal
await p.goto(BASE + '/renewals', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
const href = await p.locator('a[href^="/websites/"]:not([href="/websites/new"]):text("baansuancoffee.com")')
  .first().getAttribute('href');
const wid = href.split('/').pop();
await p.locator(`#renew-${wid} summary`).click();
await p.waitForTimeout(400);
const form = p.locator(`#renew-${wid} form:has(input[name=amount_thb])`);
await form.locator('input[name=amount_thb]').fill('990');
await form.locator('input[name=cost_thb]').fill('450');
await form.locator('button[type=submit]').click();
await p.waitForTimeout(2200);
t = await p.locator('body').innerText();
ok('ต่ออายุแล้ววันหมดอายุขยับไปปีหน้า', t.includes('2027'), t.slice(0,400));
ok('เว็บนั้นไม่อยู่ในกลุ่มใกล้หมดอายุแล้ว', !/baansuancoffee\.com[\s\S]{0,200}อีก 7 วัน/.test(t));
ok('เก็บได้ปีนี้ขยับเป็น 990', /เก็บได้ปีนี้\s*990/.test(t.replace(/\s+/g,' ')), t.slice(0,300));

// เงินไปโผล่ในหน้าการเงิน
await p.goto(BASE + '/money', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
t = await p.locator('body').innerText();
ok('ต้นทุนต่ออายุเข้าหมวดโดเมนในหน้าการเงิน', t.includes('โดเมน'));

// ---------- add a website
await p.goto(BASE + '/websites/new', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
await p.fill('input[name=domain]', 'buppha-flowers.com');
await p.fill('input[name=renewal_cost]', '450');
await p.fill('input[name=renewal_price]', '1290');
await p.fill('input[name=credential_ref]', 'Bitwarden: buppha');
await p.fill('input[name=domain_expires_on]', '2027-03-15');
await p.locator('main form button[type=submit]').click();
await p.waitForURL(/\/renewals/, { timeout: 15000 });
await p.waitForTimeout(700);
t = await p.locator('body').innerText();
ok('เพิ่มเว็บใหม่แล้วขึ้นในรายการ', t.includes('buppha-flowers.com'));
ok('กำไรต่ออายุคำนวณให้เอง 840', t.includes('840'));

// ---------- website detail
await p.locator('a[href^="/websites/"]:not([href="/websites/new"]):text("buppha-flowers.com")').first().click();
await p.waitForURL(/\/websites\/\d+/, { timeout: 15000 });
await p.waitForTimeout(700);
t = await p.locator('body').innerText();
ok('หน้าเว็บบอกว่ารหัสผ่านอยู่ที่ไหน', t.includes('Bitwarden: buppha'));
ok('ฟอร์มเตือนไม่ให้ใส่รหัสจริง', t.includes('ห้ามใส่รหัสจริง'));
await p.screenshot({ path: `${OUT}/22-website.png`, fullPage: true });

// ---------- renewal status select
await p.goto(BASE + '/renewals', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
const sel = p.locator('select[name=renewal_status]').first();
await sel.selectOption('declined');
await p.waitForTimeout(1800);
t = await p.locator('body').innerText();
ok('เปลี่ยนสถานะเป็นลูกค้าไม่ต่อได้', t.includes('ลูกค้าไม่ต่อ'));

// ---------- API ต้องกันตัวเอง: proxy ไม่ได้ครอบ /api/* (พิสูจน์ด้วย cron ที่เรียกได้โดยไม่มี cookie)
{
  const anon = await b.newContext();               // ไม่มี cookie เลย
  const req = anon.request;
  const ex = await req.get(BASE + '/api/export?from=2026-01-01&to=2026-12-31');
  ok('ไม่ล็อกอินโหลดไฟล์การเงินไม่ได้', ex.status() === 401, String(ex.status()));
  const fl = await req.get(BASE + '/api/files/1');
  ok('ไม่ล็อกอินโหลดไฟล์แนบไม่ได้', fl.status() === 401, String(fl.status()));
  const pg = await req.get(BASE + '/leads', { maxRedirects: 0 });
  ok('ไม่ล็อกอินเข้าหน้าคนทักไม่ได้', [302, 307].includes(pg.status()), String(pg.status()));
  const cronNoKey = await req.get(BASE + '/api/cron/renewals');
  ok('cron ที่ไม่มีกุญแจถูกปฏิเสธ แม้จะไม่มี cookie', cronNoKey.status() === 401, String(cronNoKey.status()));
  const cronOk = await req.get(BASE + '/api/cron/renewals', {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  ok('cron ที่มีกุญแจเรียกได้โดยไม่ต้องล็อกอิน (Vercel Cron เรียกแบบนี้)',
     [200, 500].includes(cronOk.status()), String(cronOk.status()));
  await anon.close();
}

// ---------- cron endpoint auth
const noAuth = await p.request.get(BASE + '/api/cron/renewals');
ok('cron ต้องมีกุญแจ', noAuth.status() === 401, String(noAuth.status()));
const withAuth = await p.request.get(BASE + '/api/cron/renewals', {
  headers: { Authorization: `Bearer ${CRON_SECRET}` },
});
const body = await withAuth.json();
ok('cron ที่มีกุญแจถูกทำงานได้', typeof body.due === 'number', JSON.stringify(body).slice(0,120));
ok('cron ไม่บันทึกว่าส่งแล้วถ้าส่งไม่ออก', body.sent === 0);

// ---------- mobile
const m = await b.newContext({ viewport: { width: 390, height: 900 }, colorScheme: 'dark', storageState: await ctx.storageState() });
const mp = await m.newPage();
await mp.goto(BASE + '/renewals', { waitUntil: 'networkidle' });
await mp.waitForTimeout(800);
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok('หน้าต่ออายุบนมือถือไม่ล้นแนวนอน', overflow <= 1, String(overflow));
await mp.screenshot({ path: `${OUT}/23-renewals-mobile.png`, fullPage: true });

await b.close();
if (errs.length) { console.log('\nข้อผิดพลาดในหน้า:'); errs.slice(0,6).forEach(e => console.log('  ' + e)); }
console.log(fails.length ? `\nไม่ผ่าน ${fails.length} ข้อ: ${fails.join(', ')}` : '\nผ่านทั้งหมด');
