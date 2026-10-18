import asyncio,sys
from playwright.async_api import async_playwright
TS=[float(x) for x in sys.argv[1].split(',')];OUT=sys.argv[2] if len(sys.argv)>2 else '/tmp/claude-0/-home-claude/997fe572-c1fe-5910-8749-bc5d8a1111b3/scratchpad/mk'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1100,'height':900});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    await pg.goto('file:///home/claude/dragon-ep1.html');await pg.wait_for_function('window.__ready',timeout=60000)
    await pg.evaluate("document.getElementById('bigplay').hidden=true")
    for t in TS:
      await pg.evaluate(f"(()=>{{const s=document.getElementById('seek');s.value={t};s.dispatchEvent(new Event('input'))}})()");await pg.wait_for_timeout(250)
      await pg.locator('#stage').screenshot(path=f'{OUT}_{t:06.1f}.png')
    print('END',await pg.evaluate("document.getElementById('seek').max"));print('errors',errs[:6]);await b.close()
asyncio.run(main())
