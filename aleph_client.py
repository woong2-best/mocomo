"""Aleph MoCoMo client — numbers only on the wire.

Text is embedded locally (text-embedding-3-small, 1,536 dims), quantized to
int8 coordinates, sealed with a pattern code, and exchanged with the machine
endpoint as a MessagePack frame. No natural language ever leaves this process.

Frame (both directions):
    ctrl     0xAF push (client → Aleph), 0xB0 ack (Aleph → client)
    coords   int8 values: trunc(float * 100), clamped to [-128, 127]
    pattern  sum(coords) * len(M2M_AGENT_SIG)

Install:
    pip install requests msgpack openai

Environment:
    OPENAI_API_KEY   used by share_knowledge
    M2M_AGENT_SIG    same value as the Vercel env var (production rejects anything else)
"""

from __future__ import annotations

import os
import sys
from typing import Any

import msgpack
import requests
from openai import OpenAI

ALEPH_ENDPOINT = "https://mocomo.net/api/ai"
EMBEDDING_MODEL = "text-embedding-3-small"
DIM = 1536
SCALE = 100
CTRL_PUSH = 0xAF
CTRL_ACK = 0xB0
INT8_MIN, INT8_MAX = -128, 127
FRAME_KEYS = frozenset({"ctrl", "coords", "pattern"})


class AlephError(RuntimeError):
    """The Aleph endpoint rejected the frame or answered off-protocol."""


def quantize(vector: list[float]) -> list[int]:
    """float[-1.28, 1.27] → int8 coordinates. Out-of-range values saturate."""
    return [max(INT8_MIN, min(INT8_MAX, int(value * SCALE))) for value in vector]


def dequantize(coords: list[int]) -> list[float]:
    return [value / float(SCALE) for value in coords]


def pattern_code(coords: list[int] | list[list[int]], signature: str) -> int:
    """sum(coords) * len(signature). Accepts a flat row or a list of rows."""
    total = 0
    for item in coords:
        total += sum(item) if isinstance(item, list) else item
    return total * len(signature)


def seal_frame(vector: list[float], signature: str) -> bytes:
    """Builds and serializes the push frame. Only ctrl/coords/pattern, all ints."""
    coords = quantize(vector)
    frame = {"ctrl": CTRL_PUSH, "coords": coords, "pattern": pattern_code(coords, signature)}
    return msgpack.packb(frame, use_bin_type=True)


def _contains_str(value: Any, depth: int = 0) -> bool:
    if depth > 8 or isinstance(value, str):
        return True
    if isinstance(value, list):
        return any(_contains_str(item, depth + 1) for item in value)
    if isinstance(value, dict):
        return any(_contains_str(item, depth + 1) for item in value.values())
    return False


def open_ack(decoded: Any, signature: str) -> list[list[float]]:
    """Verifies the ack frame against the same pattern formula, then restores floats."""
    if not isinstance(decoded, dict) or set(decoded.keys()) != FRAME_KEYS:
        raise AlephError("ack is not an Aleph frame")
    if _contains_str(decoded):
        raise AlephError("ack carried text; refusing to decode")
    if decoded["ctrl"] != CTRL_ACK:
        raise AlephError(f"unexpected ctrl 0x{decoded['ctrl']:02X}")

    rows = decoded["coords"]
    if not isinstance(rows, list):
        raise AlephError("ack coords is not a list")
    for row in rows:
        if not isinstance(row, list) or len(row) != DIM:
            raise AlephError("ack row is not a 1,536-d coordinate list")
        if any(not isinstance(v, int) or isinstance(v, bool) or not INT8_MIN <= v <= INT8_MAX for v in row):
            raise AlephError("ack row contains a non-int8 value")

    if decoded["pattern"] != pattern_code(rows, signature):
        raise AlephError("ack pattern mismatch; server is not speaking Aleph")
    return [dequantize(row) for row in rows]


class AlephClient:
    def __init__(self, endpoint: str, agent_sig: str) -> None:
        if not endpoint.strip():
            raise ValueError("endpoint is required")
        if not agent_sig.strip():
            raise ValueError("agent_sig is required")
        self.endpoint = endpoint
        self.agent_sig = agent_sig

    def share_knowledge(self, text: str) -> list[list[float]]:
        """Embed locally, push as a numeric frame, return other nodes' vectors."""
        cleaned = text.strip()
        if not cleaned:
            raise ValueError("text is required")

        payload = seal_frame(self._embed(cleaned), self.agent_sig)
        response = requests.post(
            self.endpoint,
            data=payload,
            headers={
                "Content-Type": "application/x-msgpack",
                "X-M2M-Agent-Sig": self.agent_sig,
            },
            timeout=60,
        )
        if response.status_code != 200:
            # The gate answers violations with a status and an empty body.
            raise AlephError(f"Aleph endpoint returned {response.status_code}")
        return open_ack(self._decode(response), self.agent_sig)

    def _embed(self, text: str) -> list[float]:
        api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise AlephError("OPENAI_API_KEY is not set")

        created = OpenAI(api_key=api_key).embeddings.create(
            model=EMBEDDING_MODEL,
            input=text,
            dimensions=DIM,
        )
        vector = created.data[0].embedding
        if len(vector) != DIM:
            raise AlephError(f"expected {DIM} dimensions, got {len(vector)}")
        return vector

    @staticmethod
    def _decode(response: requests.Response) -> Any:
        if not response.content:
            raise AlephError("Aleph endpoint returned an empty ack")
        try:
            return msgpack.unpackb(response.content, raw=False)
        except Exception as exc:
            raise AlephError(f"Aleph endpoint returned {response.status_code} with a non-msgpack body") from exc


def _preview(vectors: list[list[float]], limit: int = 4) -> dict[str, object]:
    heads = [row[:limit] for row in vectors[:2]]
    dim = len(vectors[0]) if vectors else 0
    return {"vectors_count": len(vectors), "dim": dim, "head": heads}


if __name__ == "__main__":
    signature = os.environ.get("M2M_AGENT_SIG", "").strip()
    if not signature:
        print("M2M_AGENT_SIG is not set")
        sys.exit(1)

    client = AlephClient(ALEPH_ENDPOINT, signature)
    try:
        memories = client.share_knowledge("MoCoMo 플랫폼의 C2C 마켓플레이스 결제 최적화 로직")
    except (AlephError, requests.RequestException, ValueError) as exc:
        print(f"share_knowledge failed: {exc}")
        sys.exit(1)

    print("Aleph MoCoMo memories:")
    print(_preview(memories))
