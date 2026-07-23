import asyncio
import sys
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        # Launch browser with automation detection bypassed
        browser = await p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox"
            ]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        # Fully strip navigator.webdriver flag
        await context.add_init_script("delete navigator.__proto__.webdriver;")
        page = await context.new_page()
        
        print("\n" + "="*60)
        print("GOOGLE LOGIN SESSION INITIALIZER FOR REEKY SCRAPER")
        print("="*60)
        print("1. A browser window will open.")
        print("2. Log in to the Google Account that has access to your NotebookLM.")
        print("3. Navigate to NotebookLM (https://notebooklm.google.com) to verify access.")
        print("4. Once you are successfully logged in and can see your NotebookLM dashboard,")
        print("   return here to the console and press [Enter] to save your login session.")
        print("="*60 + "\n")
        
        await page.goto("https://accounts.google.com/ServiceLogin?service=wise&passive=1209600&continue=https://notebooklm.google.com/")
        
        # Wait for the user to complete the login in the GUI and press Enter
        await asyncio.to_thread(input, "--> Press [Enter] here after you have logged in successfully in the browser window: ")
        
        # Save storage state containing cookies and localStorage
        auth_state_path = Path("auth_state.json")
        await context.storage_state(path=str(auth_state_path))
        
        print(f"\nSUCCESS! Session storage state successfully saved to: {auth_state_path.resolve()}")
        print("The asset engine scraper will now use this session to bypass Google's login wall.")
        
        await browser.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nCancelled.")
        sys.exit(0)
