# pyrefly: ignore [missing-import]
import asyncio
import io
import os
# pyrefly: ignore [missing-import]
import aiohttp
# pyrefly: ignore [missing-import]
from pydub import AudioSegment

# 🛡️ BUDGET PROTECTION SWITCH
# Set this to True during testing to prevent Gemini/Cartesia from eating your 30k credits.
DEVELOPMENT_MODE = True

class TTSManager:
    """
    Handles high-fidelity concurrent TTS generation using the Cartesia API.
    Utilizes asyncio.gather to pull multi-host audio chunks simultaneously.
    """
    
    def __init__(self, provider="cartesia"):
        self.provider = provider
        self.api_key = os.getenv("CARTESIA_API_KEY")
        self.base_url = "https://api.cartesia.ai/tts/bytes"

    async def _fetch_audio_chunk(self, session: aiohttp.ClientSession, host: str, text: str, index: int) -> tuple:
        """
        Hits the Cartesia API concurrently to convert a single dialogue row into raw audio bytes.
        """
        print(f"🚀 [TTS Engine] Fetching parallel chunk {index} for {host}...")
        
        # Budget Check: Fallback to local silence if API key is missing
        if not self.api_key or self.api_key == "dummy_key":
            print(f"⚠️ CARTESIA_API_KEY missing! Using free local silence for chunk {index}.")
            await asyncio.sleep(0.1)
            return (index, AudioSegment.silent(duration=1000)) # 1 second free silence

        headers = {
            "X-API-Key": self.api_key,
            "Cartesia-Version": "2024-06-10",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model_id": "sonic-english",
            "transcript": text,
            "voice": {
                "mode": "id",
                "id": self._get_voice_id(host)
            },
            "output_format": {
                "container": "mp3",
                "sample_rate": 44100,
                "bit_rate": 128000
            }
        }

        try:
            async with session.post(self.base_url, json=payload, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Cartesia API Error on chunk {index}: Status {response.status} - {error_text}")
                    return (index, AudioSegment.silent(duration=1000))
                
                audio_bytes = await response.read()
                audio_segment = AudioSegment.from_file(io.BytesIO(audio_bytes), format="mp3")
                return (index, audio_segment)
                
        except Exception as e:
            print(f"❌ Connection error on chunk {index}: {e}")
            return (index, AudioSegment.silent(duration=1000))

    async def generate_podcast(self, script_array: list) -> AudioSegment:
        """
        Main async orchestrator. Fires all voice requests over a single shared connection session,
        re-orders them chronologically, and merges them into a unified podcast file.
        """
        if not script_array:
            return AudioSegment.empty()

        # 🛡️ Budget Protection Rule
        if DEVELOPMENT_MODE and len(script_array) > 3:
            print(f"🛑 [Budget Mode Active] Truncating podcast script from {len(script_array)} lines to 3 lines to save your credits!")
            script_array = script_array[:3]

        async with aiohttp.ClientSession() as session:
            tasks = []
            for i, line in enumerate(script_array):
                # Strip clean conversational formatting markers out
                clean_text = line["text"].replace("[laughs]", "").replace("[pauses]", "").strip()
                tasks.append(self._fetch_audio_chunk(session, line["host"], clean_text, i))
            
            results = await asyncio.gather(*tasks)
        
        # Sort chronologically by index layout
        results.sort(key=lambda x: x[0])
        
        # Stitch individual fragments seamlessly
        final_audio = AudioSegment.empty()
        for _, chunk in results:
            final_audio += chunk + AudioSegment.silent(duration=300) # 300ms natural conversation pause
            
        print("🎉 [TTS Engine] Podcast rendering complete!")
        return final_audio

    def _get_voice_id(self, host: str) -> str:
        """
        Map custom host names to official Cartesia voice IDs.
        """
        voices = {
            "Alex": "638ab454-0676-4a41-94d1-be69e5c6be26",   # Professional inquisitive male
            "Taylor": "84b0511d-91cd-4ad9-bf9d-599d1396a84c" # Crisp engaging female
        }
        return voices.get(host, "638ab454-0676-4a41-94d1-be69e5c6be26")