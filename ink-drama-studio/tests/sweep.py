import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page();errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto('file:///home/claude/dragon-ep1.html');await pg.wait_for_function('window.__ready',timeout=60000)
    for t in range(0,145,1):
      await pg.evaluate(f"(()=>{{const s=document.getElementById('seek');s.value={t+.37};s.dispatchEvent(new Event('input'))}})()");await pg.wait_for_timeout(30)
    print('errors',errs[:5]);await b.close()
asyncio.run(main())
