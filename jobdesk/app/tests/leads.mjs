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
if (!APP_PASSWORD) {
  console.error('ต้องตั้ง APP_PASSWORD ก่อน — รันผ่าน tests/run.sh หรือ export เอง');
  process.exit(2);
}
const fails = [];
const ok = (n, c, x='') => { console.log(`${c ? '  ok  ' : ' FAIL '} ${n}${c?'':' — '+x}`); if(!c) fails.push(n); };

const b = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light', locale: 'th-TH' });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await p.goto(BASE + '/login', { waitUntil: 'load' });
await p.fill('input[name=password]', APP_PASSWORD);
await p.locator('main button[type=submit]').click();
await p.waitForURL(BASE + '/', { timeout: 15000 });

// ---------- home surfaces stale leads
let t = await p.locator('body').innerText();
ok('หน้าแรกเตือนว่ามีคนทักค้างเกิน 2 วัน', /มีคนทัก\s*\d+\s*คน\s*รอมาเกิน 2 วัน/.test(t.replace(/\s+/g,' ')), t.slice(0,160));
ok('มีเมนู "คนทัก"', await p.locator('nav a[href="/leads"]').count() === 1);

// ---------- the leads page itself
await p.locator('nav a[href="/leads"]').click();
await p.waitForURL(/\/leads$/, { timeout: 15000 });
t = await p.locator('body').innerText();
ok('หน้าคนทักโหลดได้', t.includes('คนทัก'));
ok('KPI นับคนที่ทักมาเดือนนี้ได้ 8', /ทักมาเดือนนี้\s*8/.test(t.replace(/\s+/g,' ')), t.slice(0,400));
ok('KPI คำนวณอัตราปิดให้ 25%', /อัตราปิด\s*25/.test(t.replace(/\s+/g,' ')));
ok('KPI คำนวณต้นทุนต่อคนทักจากค่าโฆษณาจริง', /ต้นทุนต่อคนทัก\s*210/.test(t.replace(/\s+/g,' ')));
ok('แยกกล่องคนที่ยังต้องตามต่อ', t.includes('ยังต้องตามต่อ'));
ok('สรุปเหตุผลที่ไม่ซื้อ', t.includes('เหตุผลที่ไม่ซื้อ') && t.includes('แพงไป'));
ok('คนที่ปิดได้ลิงก์ไปหน้างานได้', await p.locator('a:has-text("ดูงาน")').count() >= 2);
await p.screenshot({ path: `${OUT}/01-leads.png`, fullPage: true });

// ---------- add a lead
const before = await p.locator('form[action] >> nth=0').count();
await p.fill('input[name=contact_name]', 'คุณทดสอบ ร้านทดสอบ');
await p.fill('input[name=enquiry]', 'ถามราคาเว็บสองภาษา');
await p.locator('main form button[type=submit]:has-text("บันทึก")').first().click();
await p.waitForTimeout(1500);
t = await p.locator('body').innerText();
ok('เพิ่มคนทักใหม่แล้วขึ้นในรายการ', t.includes('คุณทดสอบ ร้านทดสอบ'), t.slice(0,300));
ok('คนใหม่ถูกนับเข้าเดือนนี้ทันที', /ทักมาเดือนนี้\s*9/.test(t.replace(/\s+/g,' ')));

// ---------- lost requires a reason (the db constraint, enforced in the UI)
// แถวมี id ของตัวเอง — จับให้ตรงแถว ไม่ใช่ .last() ของทั้งหน้า
const newRowId = await p.evaluate(() => {
  const el = [...document.querySelectorAll('[id^="lead-"]')]
    .find(e => e.textContent.includes('คุณทดสอบ ร้านทดสอบ'));
  return el ? el.id : null;
});
ok('แถวคนทักมี id ของตัวเอง (ลิงก์ /leads#lead-12 ได้)', newRowId !== null, String(newRowId));
const row = p.locator(`#${newRowId}`);
await row.locator('select[name=status]').selectOption('lost');
await p.waitForTimeout(400);
ok('เลือก "ไม่เอา" แล้วต้องเลือกเหตุผลก่อน', await row.locator('select[name=lost_reason]').count() > 0);
ok('ช่องเหตุผลบังคับกรอก',
   await row.locator('select[name=lost_reason]').getAttribute('required') !== null);
await row.locator('select[name=lost_reason]').selectOption('not_ready');
await row.locator('button[type=submit]').click();
await p.waitForTimeout(1500);
t = await p.locator('body').innerText();
ok('บันทึกเหตุผลแล้วเข้าไปอยู่ในสรุป', t.includes('ยังไม่พร้อม'), t.slice(0,300));

// ---------- open a job from a lead, and it counts as won
await p.goto(BASE + '/leads', { waitUntil: 'load' });
await p.locator('h1:has-text("คนทัก")').waitFor({ timeout: 15000 });
const openJob = p.locator('a[href^="/jobs/new?lead="]').first();
ok('คนที่ยังไม่ปิดมีปุ่มเปิดงาน', await openJob.count() === 1 || await p.locator('a[href^="/jobs/new?lead="]').count() > 0);
await p.locator('a[href^="/jobs/new?lead="]').first().click();
await p.waitForURL(/\/jobs\/new/, { timeout: 15000 });
t = await p.locator('body').innerText();
ok('หน้างานใหม่บอกว่ามาจากคนที่ทักมา', t.includes('เปิดงานจากคนที่ทักมา'));
const prefill = await p.inputValue('input[name=new_customer_name]');
ok('ชื่อลูกค้าถูกเติมมาจากคนที่ทักให้แล้ว', prefill.length > 0, JSON.stringify(prefill));
ok('พก lead_id ไปกับฟอร์มด้วย', await p.locator('input[name=lead_id]').count() === 1);
await p.fill('input[name=title]', 'เว็บจากคนทัก');
await p.locator('main form button[type=submit]:has-text("เปิดงาน")').click();
await p.waitForURL(/\/jobs\/\d+$/, { timeout: 15000 });
ok('เปิดงานจากคนทักได้', /\/jobs\/\d+$/.test(p.url()), p.url());

await p.goto(BASE + '/leads', { waitUntil: 'load' });
await p.locator('h1:has-text("คนทัก")').waitFor({ timeout: 15000 });
t = (await p.locator('body').innerText()).replace(/\s+/g,' ');
ok('คนทักคนนั้นถูกนับเป็นปิดได้ให้เอง', /ปิดได้เดือนนี้\s*3/.test(t), t.slice(0,400));
ok('อัตราปิดขยับตาม', /อัตราปิด\s*33\.3/.test(t), t.slice(0,400));
await p.screenshot({ path: `${OUT}/02-after-convert.png`, fullPage: true });

// ---------- a lead that already has a job cannot be un-won or deleted
await p.goto(BASE + '/leads', { waitUntil: 'load' });
await p.locator('h1:has-text("คนทัก")').waitFor({ timeout: 15000 });
const wonRowId = await p.evaluate(() => {
  const el = [...document.querySelectorAll('[id^="lead-"]')]
    .find(e => e.querySelector('a[href^="/jobs/"]') && !e.querySelector('a[href^="/jobs/new"]'));
  return el ? el.id : null;
});
ok('หาแถวที่เปิดงานไปแล้วเจอ', wonRowId !== null, String(wonRowId));
const wonRow = p.locator(`#${wonRowId}`);
ok('แถวที่เปิดงานไปแล้วไม่มีปุ่มลบ', await wonRow.locator('button:has-text("ลบ")').count() === 0);
ok('แถวที่เปิดงานไปแล้วไม่มีปุ่มเปิดงานซ้ำ', await wonRow.locator('a[href^="/jobs/new"]').count() === 0);
ok('แถวที่เปิดงานไปแล้วเปลี่ยนสถานะจากหน้านี้ไม่ได้',
   await wonRow.locator('select[name=status]').count() === 0);
ok('แต่ยังเห็นสถานะอยู่', (await wonRow.innerText()).includes('ปิดได้'), await wonRow.innerText());
await p.goto(BASE + '/leads', { waitUntil: 'load' });
await p.locator('h1:has-text("คนทัก")').waitFor({ timeout: 15000 });
t = (await p.locator('body').innerText()).replace(/\s+/g,' ');
ok('อัตราปิดไม่ถูกทำให้เพี้ยน', /ปิดได้เดือนนี้\s*3/.test(t), t.slice(0,400));

// ---------- mobile
const m = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', locale: 'th-TH',
                               storageState: await ctx.storageState() });
const mp = await m.newPage();
await mp.goto(BASE + '/leads', { waitUntil: 'load' });
await mp.locator('h1:has-text("คนทัก")').waitFor({ timeout: 15000 });
await mp.waitForTimeout(400);
const ov = await mp.evaluate(() => ({ d: document.documentElement.scrollWidth, w: window.innerWidth }));
ok('หน้าคนทักบนมือถือไม่ล้นแนวนอน', ov.d <= ov.w + 1, JSON.stringify(ov));
await mp.screenshot({ path: `${OUT}/03-mobile.png`, fullPage: true });

const real = errors.filter(e => !e.includes('ERR_CONNECTION_RESET'));
if (real.length) console.log('\nข้อผิดพลาดในเบราว์เซอร์:\n  ' + real.join('\n  '));
console.log(fails.length ? `\nล้มเหลว ${fails.length} ข้อ` : '\nผ่านทั้งหมด');
await b.close();
process.exit(fails.length ? 1 : 0);
