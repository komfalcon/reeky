import json
import urllib.request

req = urllib.request.Request(
    'http://localhost:8000/admin/submit-assets',
    data=json.dumps({
        'user_id': 'test_user_123',
        'artifact_urls': [
            'https://notebooklm.google.com/notebook/5a776eb3-02f7-4ec7-860e-038c51b48c6a/artifact/98d4b6d4-1196-4e84-886b-fda78d58a925?utm_source=nlm_web_share&utm_medium=google_oo&utm_campaign=art_share_1&utm_content=&utm_smc=nlm_web_share_google_oo_art_share_1_',
            'https://notebooklm.google.com/notebook/5a776eb3-02f7-4ec7-860e-038c51b48c6a/artifact/84181ee4-2c64-4047-934f-c1c2ba11db33?utm_source=nlm_web_share&utm_medium=google_oo&utm_campaign=art_share_1&utm_content=&utm_smc=nlm_web_share_google_oo_art_share_1_'
        ],
        'podcast_audio': 'http://example.com/podcast.mp3',
        'video_overview': 'http://example.com/video.mp4'
    }).encode(),
    headers={'Content-Type': 'application/json'}
)

print(urllib.request.urlopen(req).read().decode())
