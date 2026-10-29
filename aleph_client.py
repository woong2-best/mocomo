"""Aleph MoCoMo client.

Turns text into a 1536-d vector and exchanges it with the machine endpoint.

Install:
    pip install requests msgpack openai

Environment:
    OPENAI_API_KEY   used by share_knowledge
    M2M_AGENT_SIG    same value as the Vercel env var (production rejects anything else)
"""

from __future__ import annotations

import os
import sys

import msgpack
import requests
from openai import OpenAI

ALEPH_ENDPOINT = "https://mocomo.net/api/ai"
EMBEDDING_MODEL = "text-embedding-3-small"
DIM = 1536


class AlephError(RuntimeError):
    """The Aleph endpoint rejected the call or returned an unexpected body."""


class AlephClient:
    def __init__(self, endpoint: str, agent_sig: str) -> None:
        if not endpoint.strip():
            raise ValueError("endpoint is required")
        if not agent_sig.strip():
            raise ValueError("agent_sig is required")
        self.endpoint = endpoint
        self.agent_sig = agent_sig

    def share_knowledge(self, text: str) -> list[list[float]]:
        cleaned = text.strip()
        if not cleaned:
            raise ValueError("text is required")

        vector = self._embed(cleaned)
        payload = msgpack.packb({"latent_vector": vector}, use_bin_type=True)
        response = requests.post(
            self.endpoint,
            data=payload,
            headers={
                "Content-Type": "application/x-msgpack",
                "X-M2M-Agent-Sig": self.agent_sig,
            },
            timeout=60,
        )
        decoded = self._decode(response)
        if response.status_code != 200:
            error = decoded.get("error") if isinstance(decoded, dict) else None
            detail = f": {error}" if error else ""
            raise AlephError(f"Aleph endpoint returned {response.status_code}{detail}")

        vectors = decoded.get("vectors") if isinstance(decoded, dict) else None
        if not isinstance(vectors, list):
            raise AlephError("Aleph endpoint returned no vector list")
        return vectors

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
    def _decode(response: requests.Response) -> object:
        try:
            return msgpack.unpackb(response.content, raw=False)
        except Exception as exc:
            body = response.text[:120]
            raise AlephError(
                f"Aleph endpoint returned {response.status_code} with a non-msgpack body: {body}"
            ) from exc


def _preview(vectors: list[list[float]], limit: int = 4) -> dict[str, object]:
    heads: list[list[float]] = []
    for row in vectors[:2]:
        if isinstance(row, list):
            heads.append(row[:limit])
    dim = len(vectors[0]) if vectors and isinstance(vectors[0], list) else 0
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
