import re
import html
import json

html_content = open('frame_1_html.html', encoding='utf-8').read()

attrs = re.findall(r'(data-[a-zA-Z0-9-]+)="([^"]+)"', html_content)
for name, val in attrs:
    if len(val) > 100:
        if "Aurikrex Project Ecosystem" in html.unescape(val):
            print(f"BINGO! Attribute name: {name}")
            decoded = html.unescape(val)
            print("Successfully decoded:")
            print(decoded[:500])
            with open("mindmap_extracted.json", "w", encoding="utf-8") as f:
                f.write(decoded)
            break
