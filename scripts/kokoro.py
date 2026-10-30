# /// script
# requires-python = "==3.12.*"
# dependencies = ["kokoro-onnx==0.6.1"]
# ///
"""Kokoro-82M narration for scripts/voice.ts, run with `uv run scripts/kokoro.py`.

Reads {"items": [{"text", "words", "voice", "speed", "lang", "wav"}]} as JSON on stdin, writes each item's
audio to its "wav" path, and prints {"items": [{"words": [[start, end], ...] | null, "note": str | null}]}:
one [start, end] in seconds per entry of "words", or null when the timings could not be placed on the words.
The model downloads on first use into KOKORO_CACHE_DIR (default ~/.cache/video-studio/kokoro).
"""

import difflib
import hashlib
import json
import os
import sys
import urllib.request
import wave
from pathlib import Path

import numpy as np
from kokoro_onnx import Kokoro

RELEASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1"
FILES = {
    "kokoro-v1.0.onnx": "beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a",
    "voices-v1.0.bin": "bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d",
}
# Stress marks, spaces and punctuation are where espeak and the per-word phonemes disagree most.
STRESS = {"ˈ", "ˌ"}


def cache_dir() -> Path:
    if os.environ.get("KOKORO_CACHE_DIR"):
        return Path(os.environ["KOKORO_CACHE_DIR"])
    base = os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache"
    return Path(base) / "video-studio" / "kokoro"


def fetch(name: str, sha256: str, folder: Path) -> Path:
    path = folder / name
    if path.exists():
        return path
    folder.mkdir(parents=True, exist_ok=True)
    part = path.with_name(name + ".part")
    print(f"Downloading {name} to {folder} (first run only)", file=sys.stderr)
    digest = hashlib.sha256()
    with urllib.request.urlopen(f"{RELEASE}/{name}", timeout=60) as res, open(part, "wb") as out:
        total = int(res.headers.get("Content-Length") or 0)
        done, shown = 0, -1
        while chunk := res.read(1 << 20):
            out.write(chunk)
            digest.update(chunk)
            done += len(chunk)
            pct = done * 100 // total if total else -1
            if pct // 10 != shown // 10:
                print(f"  {name} {done >> 20} MB" + (f" ({pct}%)" if total else ""), file=sys.stderr)
                shown = pct
    if digest.hexdigest() != sha256:
        part.unlink()
        raise SystemExit(f"{name} failed its checksum; delete {folder} and run again")
    part.rename(path)
    return path


def core(phonemes: str) -> str:
    return "".join(p for p in phonemes if p.isalpha() and p not in STRESS)


def word_timings(kokoro: Kokoro, words: list[str], lang: str, spoken, seconds: float):
    """Places the per-phoneme timings on the words, or returns (None, why).

    espeak joins and splits words when it reads a whole sentence ("of the" becomes one word, "MP4" two), so
    each word is phonemized on its own and lined up with the spoken phonemes, letter by letter.
    """
    said = [(t.start, t.end) for t in spoken if core(t.phoneme)]
    heard = "".join(core(t.phoneme) for t in spoken)
    alone_by_word = [core(kokoro.tokenizer.phonemize(w, lang)) for w in words]
    alone = "".join(alone_by_word)
    owner = [i for i, p in enumerate(alone_by_word) for _ in p]
    if not said or not alone:
        return None, "the model returned no phoneme timings"
    matcher = difflib.SequenceMatcher(None, heard, alone, autojunk=False)
    blocks = matcher.get_matching_blocks()
    matched = sum(b.size for b in blocks)
    if matched < 0.6 * len(alone):
        return None, f"only {matched} of {len(alone)} phonemes lined up with the words"

    spans: list[list[float] | None] = [None] * len(words)
    for b in blocks:
        for k in range(b.size):
            start, end = said[b.a + k]
            i = owner[b.b + k]
            span = spans[i]
            spans[i] = [start, end] if span is None else [min(span[0], start), max(span[1], end)]

    # Words with no matched phoneme (a dash, a symbol espeak skips) share the gap around them by length.
    i = 0
    while i < len(words):
        if spans[i] is not None:
            i += 1
            continue
        j = i
        while j < len(words) and spans[j] is None:
            j += 1
        lo = spans[i - 1][1] if i > 0 else 0.0
        hi = spans[j][0] if j < len(words) else seconds
        hi = max(hi, lo)
        total = sum(len(w) for w in words[i:j])
        at = lo
        for k in range(i, j):
            step = (hi - lo) * len(words[k]) / total
            spans[k] = [at, at + step]
            at += step
        i = j
    for i in range(len(spans) - 1):
        spans[i][1] = max(spans[i][0], min(spans[i][1], spans[i + 1][0]))
    return [[round(s, 3), round(e, 3)] for s, e in spans], None


def write_wav(path: str, audio, sample_rate: int) -> None:
    pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(pcm.tobytes())


def main() -> None:
    request = json.load(sys.stdin)
    folder = cache_dir()
    paths = {name: fetch(name, sha, folder) for name, sha in FILES.items()}
    kokoro = Kokoro(str(paths["kokoro-v1.0.onnx"]), str(paths["voices-v1.0.bin"]))
    names = set(kokoro.get_voices())
    results = []
    for item in request["items"]:
        if item["voice"] not in names:
            raise SystemExit(f'Kokoro has no voice "{item["voice"]}". Voices: {", ".join(sorted(names))}')
        audio, sample_rate, spoken = kokoro.create_timed(item["text"], item["voice"], item["speed"], item["lang"])
        write_wav(item["wav"], audio, sample_rate)
        words, note = word_timings(kokoro, item["words"], item["lang"], spoken, len(audio) / sample_rate)
        results.append({"words": words, "note": note})
    json.dump({"items": results}, sys.stdout)


if __name__ == "__main__":
    main()
