
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from google.cloud import speech, texttospeech
import requests
import tempfile
import os
import logging
from dotenv import load_dotenv

load_dotenv()

ai_logger = logging.getLogger('ai_calls')


class CallSessionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        await self.accept()
        self.stt_client = speech.SpeechClient()
        self.tts_client = texttospeech.TextToSpeechClient()
        self.gemini_api_url = os.getenv("GEMINI_API_ENDPOINT", "YOUR_GEMINI_API_ENDPOINT")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY")
        self.script = ""
        self.audio_buffer = b''
        self.sample_rate = 16000
        self.language_code = "en-US"
        ai_logger.info(f"[Session {self.session_id}] WebSocket connected.")

    async def receive(self, text_data=None, bytes_data=None):
        if text_data:
            await self.handle_text_data(text_data)
        elif bytes_data:
            await self.handle_audio_data(bytes_data)

    async def handle_text_data(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get('type') == 'script':
                self.script = data.get('script', '')
                ai_logger.info(f"[Session {self.session_id}] Script received: {self.script}")
                await self.send(text_data="Script received. Start speaking.")
        except Exception as e:
            ai_logger.error(f"[Session {self.session_id}] Error parsing script: {e}")
            await self.send(text_data=f"Error parsing script: {e}")

    async def handle_audio_data(self, bytes_data):
        self.audio_buffer += bytes_data
        ai_logger.info(f"[Session {self.session_id}] Received audio chunk ({len(bytes_data)} bytes). Buffer size: {len(self.audio_buffer)} bytes.")
        if len(self.audio_buffer) > self.sample_rate * 2:
            await self.process_audio_buffer()

    async def process_audio_buffer(self):
        try:
            temp_audio_path, wav_path = self.save_and_convert_audio()
            transcript = self.transcribe_audio(wav_path)
            ai_logger.info(f"[Session {self.session_id}] Transcript: {transcript}")
            await self.send(text_data=transcript)
            ai_text = self.get_gemini_response(transcript)
            ai_logger.info(f"[Session {self.session_id}] Gemini response: {ai_text}")
            ai_audio = self.synthesize_speech(ai_text)
            ai_logger.info(f"[Session {self.session_id}] TTS audio generated ({len(ai_audio)} bytes). Sending to client.")
            await self.send(bytes_data=ai_audio)
            os.remove(temp_audio_path)
            os.remove(wav_path)
            self.audio_buffer = b''
        except Exception as e:
            ai_logger.error(f"[Session {self.session_id}] Error in audio processing: {e}")

    def save_and_convert_audio(self):
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as f:
            f.write(self.audio_buffer)
            temp_audio_path = f.name
        wav_path = temp_audio_path + '.wav'
        os.system(f'ffmpeg -y -i "{temp_audio_path}" -ar {self.sample_rate} -ac 1 -f wav "{wav_path}"')
        return temp_audio_path, wav_path

    def transcribe_audio(self, wav_path):
        with open(wav_path, 'rb') as audio_file:
            content = audio_file.read()
        audio = speech.RecognitionAudio(content=content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=self.sample_rate,
            language_code=self.language_code,
        )
        response = self.stt_client.recognize(config=config, audio=audio)
        transcript = ''
        for result in response.results:
            transcript += result.alternatives[0].transcript
        return transcript

    def get_gemini_response(self, transcript):
        gemini_payload = {
            "prompt": f"{self.script}\nUser: {transcript}\nAI:",
        }
        gemini_headers = {"Authorization": f"Bearer {self.gemini_api_key}"}
        ai_text = "(AI response placeholder)"
        try:
            gemini_response = requests.post(self.gemini_api_url, json=gemini_payload, headers=gemini_headers)
            if gemini_response.ok:
                ai_text = gemini_response.json().get("response", ai_text)
        except Exception as e:
            ai_logger.error(f"[Session {self.session_id}] Gemini API error: {e}")
            ai_text = f"[Gemini error: {e}]"
        return ai_text

    def synthesize_speech(self, ai_text):
        synthesis_input = texttospeech.SynthesisInput(text=ai_text)
        voice = texttospeech.VoiceSelectionParams(language_code="en-US", ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL)
        audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.LINEAR16)
        tts_response = self.tts_client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)
        return tts_response.audio_content

    async def disconnect(self, close_code):
        ai_logger.info(f"[Session {self.session_id}] WebSocket disconnected.")