# python3 ../../tests/screenshot.py out/<slug>.html 0,5,12.5 [check/shot]
import asyncio,sys,os
from playwright.async_api import async_playwright
PAGE='file://'+os.path.abspath(sys.argv[1]);TS=[float(x) for x in sys.argv[2].split(',')];OUT=sys.argv[3] if len(sys.argv)>3 else 'check/shot'
os.makedirs(os.path.dirname(OUT) or '.',exist_ok=True)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1100,'height':900});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    await pg.goto(PAGE);await pg.wait_for_function('window.__ready',timeout=60000)
    await pg.evaluate("document.getElementById('bigplay').hidden=true")
    for t in TS:
      await pg.evaluate(f"(()=>{{const s=document.getElementById('seek');s.value={t};s.dispatchEvent(new Event('input'))}})()");await pg.wait_for_timeout(250)
      await pg.locator('#stage').screenshot(path=f'{OUT}_{t:06.1f}.png')
    print('END',await pg.evaluate("document.getElementById('seek').max"));print('errors',errs[:6]);await b.close()
asyncio.run(main())
