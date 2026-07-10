import re
html = open('frame1.html', encoding='utf-8').read()

print("File size:", len(html))

# Look for AF_initDataCallback
callbacks = re.findall(r'AF_initDataCallback\(\{key: \'(.*?)\', isError:  false , hash: \'.*?\', data:(.*?)\}\);', html)
print(f"Found {len(callbacks)} callbacks")

for key, data in callbacks:
    if "TF-IDF" in data:
        print(f"Found flashcard data in callback key: {key}")
        # Parse it with regex to find QA pairs
        pairs = re.findall(r'\[\s*"((?:[^"\\]|\\.)+?)"\s*,\s*"((?:[^"\\]|\\.)+?)"\s*\]', data)
        print(f"Extracted {len(pairs)} flashcards using simple array regex!")
        
        # If that fails, let's just dump strings longer than 15 chars that don't have HTML tags
        if not pairs:
            strings = re.findall(r'"((?:[^"\\]|\\.)+?)"', data)
            for s in strings:
                if len(s) > 15 and '<' not in s and '{' not in s:
                    print("-", s)
        else:
            for q, a in pairs[:5]:
                print("Q:", q)
                print("A:", a)
                print("---")
