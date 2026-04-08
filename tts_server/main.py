from __future__ import annotations

import io
import os
import subprocess
import sys
import tempfile
from typing import Any

import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field


DEFAULT_MODELS = [
    "Qwen/Qwen3-TTS-0.6B",
    "Qwen/Qwen3-TTS-4B",
    "Qwen/Qwen3-TTS-8B",
]

EDGE_FALLBACK_MODELS = [
    "edge:en-US-AriaNeural",
    "edge:en-US-GuyNeural",
    "edge:en-GB-SoniaNeural",
    "edge:en-GB-RyanNeural",
    "edge:vi-VN-HoaiMyNeural",
    "edge:vi-VN-NamMinhNeural",
]


def parse_model_list() -> list[str]:
    env_val = os.getenv("QWEN_TTS_MODELS", "").strip()
    if not env_val:
        return DEFAULT_MODELS
    return [m.strip() for m in env_val.split(",") if m.strip()]


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1)
    model: str | None = None
    response_format: str = "wav"


class QwenTTSRuntime:
    def __init__(self) -> None:
        self._engines: dict[str, Any] = {}
        self._qwen_tts_cls: Any | None = None
        self._qwen_available = False

        try:
            from qwen_tts import QwenTTS  # type: ignore

            self._qwen_tts_cls = QwenTTS
            self._qwen_available = True
        except Exception:
            self._qwen_tts_cls = None
            self._qwen_available = False

    def get_available_models(self) -> list[str]:
        if self._qwen_available:
            return parse_model_list()
        return EDGE_FALLBACK_MODELS

    def using_qwen(self) -> bool:
        return self._qwen_available

    def _create_engine(self, model_name: str) -> Any:
        if not self._qwen_tts_cls:
            raise RuntimeError("Qwen-TTS runtime khong kha dung")

        try:
            return self._qwen_tts_cls(model_name=model_name)
        except TypeError:
            return self._qwen_tts_cls(model=model_name)

    def _get_engine(self, model_name: str) -> Any:
        if model_name not in self._engines:
            self._engines[model_name] = self._create_engine(model_name)
        return self._engines[model_name]

    def _synthesize_edge_mp3(self, text: str, voice_name: str) -> bytes:
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            output_path = f.name

        # Prefer module mode to match the user's working command.
        module_cmd = [
            sys.executable,
            "-m",
            "edge_tts",
            "--text",
            text,
            "--voice",
            voice_name,
            "--write-media",
            output_path,
        ]
        binary_cmd = [
            "edge-tts",
            "--text",
            text,
            "--voice",
            voice_name,
            "--write-media",
            output_path,
        ]

        errors: list[str] = []
        for cmd in (module_cmd, binary_cmd):
            proc = subprocess.run(cmd, capture_output=True, text=True)
            if proc.returncode == 0:
                break
            errors.append((proc.stderr or proc.stdout or "Unknown error").strip())
        else:
            try:
                os.remove(output_path)
            except OSError:
                pass
            raise RuntimeError(f"edge-tts fallback that bai: {' | '.join(errors)}")

        try:
            with open(output_path, "rb") as audio_file:
                return audio_file.read()
        finally:
            try:
                os.remove(output_path)
            except OSError:
                pass

    def synthesize_audio(self, text: str, model_name: str) -> tuple[bytes, str]:
        if model_name.startswith("edge:"):
            voice_name = model_name.split(":", 1)[1] or "en-US-AriaNeural"
            return self._synthesize_edge_mp3(text, voice_name), "audio/mpeg"

        if not self._qwen_available:
            # qwen-tts is optional; fallback to a stable edge voice.
            return self._synthesize_edge_mp3(text, "en-US-AriaNeural"), "audio/mpeg"

        engine = self._get_engine(model_name)

        # Try common qwen-tts method names defensively.
        if hasattr(engine, "tts"):
            result = engine.tts(text)
        elif hasattr(engine, "synthesize"):
            result = engine.synthesize(text)
        elif hasattr(engine, "generate"):
            result = engine.generate(text)
        else:  # pragma: no cover
            raise RuntimeError("Engine qwen-tts khong co ham tts/synthesize/generate")

        sample_rate = 24000
        audio_data = result

        if isinstance(result, tuple) and len(result) >= 2:
            audio_data, sample_rate = result[0], int(result[1])

        try:
            import numpy as np

            audio_np = np.asarray(audio_data, dtype="float32")
        except Exception as exc:  # pragma: no cover
            raise RuntimeError(f"Du lieu audio khong hop le: {exc}") from exc

        wav_buffer = io.BytesIO()
        sf.write(wav_buffer, audio_np, samplerate=sample_rate, format="WAV")
        return wav_buffer.getvalue(), "audio/wav"


app = FastAPI(title="Qwen TTS Local API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

runtime = QwenTTSRuntime()
available_models = runtime.get_available_models()


@app.get("/health")
def health() -> JSONResponse:
    return JSONResponse({
        "ok": True,
        "engine": "qwen-tts" if runtime.using_qwen() else "edge-tts-fallback",
        "models": available_models,
    })


@app.get("/models")
def models() -> JSONResponse:
    return JSONResponse({"models": available_models})


@app.post("/tts")
def tts(payload: TTSRequest) -> Response:
    model_name = payload.model or available_models[0]
    if model_name not in available_models:
        raise HTTPException(status_code=400, detail=f"Model khong duoc ho tro: {model_name}")

    try:
        audio_bytes, media_type = runtime.synthesize_audio(payload.text.strip(), model_name)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"TTS synthesis loi: {exc}") from exc

    return Response(content=audio_bytes, media_type=media_type)
