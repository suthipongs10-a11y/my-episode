import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg=await b.new_page();errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    await pg.goto('file:///home/claude/dragon-ep1.html');await pg.wait_for_function('window.__ready',timeout=60000)

    await pg.click('#bigplay');await pg.wait_for_timeout(4000);print(await pg.evaluate('[typeof AU, !!(window.__VOICE)]'))
    print(await pg.evaluate("[__VOICE.ready,__VOICE.buf.filter(Boolean).length]"))
    await pg.locator('#seek').evaluate('e=>e');await pg.evaluate('speed=1');await pg.wait_for_timeout(12000)
    print(await pg.evaluate("__VOICE.log"))
    print("errors",errs[:5])
    print('errors',errs[:5]);await b.close()
asyncio.run(main())
