import asyncio
import json
import html
# pyrefly: ignore [missing-import]
from playwright.async_api import async_playwright

TEST_URL = "https://notebooklm.google.com/notebook/5a776eb3-02f7-4ec7-860e-038c51b48c6a/artifact/b285279c-c095-400d-8d78-336fc800e97f?utm_source=nlm_web_share&utm_medium=google_oo&utm_campaign=art_share_1&utm_content=&utm_smc=nlm_web_share_google_oo_art_share_1_"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        print("🌐 Navigating to URL...")
        await page.goto(TEST_URL, wait_until="networkidle")
        print("⏳ Waiting 5 seconds for the iframe to fully load and render...")
        await asyncio.sleep(5)
        
        frames = page.frames
        print(f"\n✅ Found {len(frames)} total frames on the page.")
        
        for idx, frame in enumerate(frames):
            try:
                state_elem = await frame.query_selector('div[data-app-data]')
                if state_elem:
                    print(f"\n--- 🌟 BINGO! FOUND PERFECT JSON STATE IN FRAME {idx} ---")
                    app_data_escaped = await state_elem.get_attribute('data-app-data')
                    app_data_json_str = html.unescape(app_data_escaped)
                    
                    with open("mindmap_data.json", "w", encoding="utf-8") as f:
                        f.write(app_data_json_str)
                    print("✅ Saved to mindmap_data.json")
                    break
                else:
                    # Dump HTML so I can see what it actually is!
                    content = await frame.content()
                    with open(f"frame_{idx}_html.html", "w", encoding="utf-8") as f:
                        f.write(content)
            except Exception as e:
                print(f"Error on frame {idx}: {e}")
                pass
                
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
