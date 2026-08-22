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
const ok = (name, cond, extra='') => { console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${cond?'':' — '+extra}`); if(!cond) fails.push(name); };

const b = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light', locale: 'th-TH' });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

// ---------- login
await p.goto(BASE + '/board', { waitUntil: 'networkidle' });
ok('เข้าหน้าที่ต้องล็อกอินแล้วถูกเด้งไป /login', p.url().endsWith('/login'), p.url());
await p.fill('input[name=password]', 'wrong-password');
await p.locator('main button[type=submit]').click();
await p.waitForTimeout(1000);
ok('รหัสผิดขึ้นข้อความเตือน',
   (await p.locator('main form [role=alert]').first().textContent().catch(()=>'') || '').includes('ไม่ถูกต้อง'));
await p.fill('input[name=password]', APP_PASSWORD);
await p.locator('main button[type=submit]').click();
await p.waitForURL(BASE + '/', { timeout: 15000 });
ok('รหัสถูกเข้าหน้าแรกได้', p.url() === BASE + '/');
await p.waitForTimeout(500);
await p.screenshot({ path: `${OUT}/01-home.png`, fullPage: true });

// ---------- home content
const bodyText = await p.locator('body').innerText();
ok('หน้าแรกมีกล่อง "ต้องทำ"', bodyText.includes('ต้องทำ'));
ok('หน้าแรกมีกล่อง "ต้องทวง"', bodyText.includes('ต้องทวง'));
ok('เห็นงานที่รอเราอยู่', bodyText.includes('เว็บอู่ช่างเอก'));
ok('เห็นงานที่รอลูกค้า', bodyText.includes('เว็บร้านอะไหล่ตี๋ยนต์'));
ok('งานที่ส่งมอบแล้วไม่โผล่ในสองกล่องนี้', !bodyText.includes('เว็บร้านกาแฟบ้านสวน'));

// ---------- board
await p.goto(BASE + '/board', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/02-board.png`, fullPage: true });
ok('บอร์ดมี 7 คอลัมน์', await p.locator('main section h2').count() === 7,
   String(await p.locator('main section h2').count()));

// ---------- create a job with a brand new customer
await p.goto(BASE + '/jobs/new', { waitUntil: 'networkidle' });
await p.selectOption('select[name=customer_id]', 'new');
await p.fill('input[name=new_customer_name]', 'คุณแอม');
await p.fill('input[name=new_customer_business]', 'สปาบ้านทุ่ง');
await p.fill('input[name=new_customer_phone]', '085-555-5555');
// the form should open pre-filled for the product we actually sell
const defPrice = await p.inputValue('input[name=price_thb]');
const defPkg   = await p.inputValue('input[name=package]');
ok('ฟอร์มตั้งราคาเริ่มต้นเป็น 1990', defPrice === '1990', defPrice);
ok('ฟอร์มตั้งแพ็กเกจเริ่มต้นเป็นเว็บสองภาษา', defPkg.includes('สองภาษา'), defPkg);
await p.fill('input[name=title]', 'เว็บสปาบ้านทุ่ง');
await p.fill('input[name=price_thb]', '990');
await p.screenshot({ path: `${OUT}/03-new-job.png`, fullPage: true });
await p.locator('main form button[type=submit]:has-text("เปิดงาน")').click();
await p.waitForURL(/\/jobs\/\d+$/, { timeout: 15000 });
const jobUrl = p.url();
ok('เปิดงานใหม่แล้วเด้งเข้าหน้างาน', /\/jobs\/\d+$/.test(jobUrl), jobUrl);
let t = await p.locator('body').innerText();
ok('งานใหม่เริ่มที่ "รอข้อมูลลูกค้า"', t.includes('รอข้อมูลลูกค้า'));
ok('ค้างรับ = ราคาขาย', t.includes('฿990'));

// ---------- add a payment
await p.locator('form:has(select[name=kind] option[value=deposit])').first().locator('input[name=amount_thb]').fill('500');
await p.locator('form:has(select[name=kind] option[value=deposit])').first().locator('button[type=submit]').click();
await p.waitForTimeout(1200);
t = await p.locator('body').innerText();
ok('รับมัดจำแล้วค้างรับเหลือ 490', t.includes('490'), t.slice(0, 200));

// ---------- add an expense
const expForm = p.locator('form:has(select[name=kind] option[value=theme_plugin])').first();
await expForm.locator('input[name=amount_thb]').fill('60');
await expForm.locator('input[name=description]').fill('ธีม Astra Pro');
await expForm.locator('button[type=submit]').click();
await p.waitForTimeout(1200);
t = await p.locator('body').innerText();
ok('ลงต้นทุนแล้วกำไรขั้นต้นเป็น 930', t.includes('930'));
await p.screenshot({ path: `${OUT}/04-job.png`, fullPage: true });

// ---------- change status from the job page
await p.locator('select[name=status]').first().selectOption('in_progress');
await p.waitForTimeout(1500);
t = await p.locator('body').innerText();
ok('เปลี่ยนสถานะเป็น "กำลังทำ" ได้', t.includes('กำลังทำ'));
ok('ไทม์ไลน์บันทึกการเปลี่ยนสถานะ', t.includes('เปลี่ยนสถานะ'));

// ---------- the job moved sides on the home screen
await p.goto(BASE + '/', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
const doPanel = await p.locator('section:has(h2:text-is("ต้องทำ"))').innerText();
ok('งานย้ายไปอยู่กล่อง "ต้องทำ"', doPanel.includes('เว็บสปาบ้านทุ่ง'), doPanel.slice(0,200));

// ---------- customers
await p.goto(BASE + '/customers', { waitUntil: 'networkidle' });
await p.waitForTimeout(300);
t = await p.locator('body').innerText();
ok('ลูกค้าใหม่ถูกสร้างพร้อมงาน', t.includes('คุณแอม'));
ok('ยอดที่จ่ายมาแล้วโชว์ในรายชื่อ', t.includes('500'));
await p.screenshot({ path: `${OUT}/05-customers.png`, fullPage: true });
await p.goto(BASE + '/customers?q=ช่างเอก', { waitUntil: 'networkidle' });
t = await p.locator('body').innerText();
ok('ค้นหาลูกค้าได้', t.includes('ช่างเอก') && !t.includes('คุณแอม'));

// ---------- mobile + dark
const m = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', storageState: await ctx.storageState() });
const mp = await m.newPage();
await mp.goto(BASE + '/', { waitUntil: 'networkidle' });
await mp.waitForTimeout(500);
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok('มือถือไม่มีการเลื่อนแนวนอน', overflow <= 1, String(overflow));
await mp.screenshot({ path: `${OUT}/06-mobile-dark.png`, fullPage: true });
await mp.goto(BASE + '/board', { waitUntil: 'networkidle' });
await mp.waitForTimeout(400);
await mp.screenshot({ path: `${OUT}/07-mobile-board.png`, fullPage: true });

// ---------- logout
await p.goto(BASE + '/', { waitUntil: 'networkidle' });
await p.click('button:has-text("ออกจากระบบ")');
await p.waitForURL(/\/login$/, { timeout: 10000 });
ok('ออกจากระบบแล้วกลับไปหน้า login', /\/login$/.test(p.url()));
await p.goto(BASE + '/board', { waitUntil: 'networkidle' });
ok('ออกแล้วเข้าหน้าอื่นไม่ได้', p.url().endsWith('/login'));

await b.close();
if (errors.length) { console.log('\nข้อผิดพลาดในเบราว์เซอร์:'); errors.slice(0,10).forEach(e => console.log('  ' + e)); }
console.log(fails.length ? `\nไม่ผ่าน ${fails.length} ข้อ: ${fails.join(', ')}` : '\nผ่านทั้งหมด');
process.exit(fails.length ? 1 : 0);
