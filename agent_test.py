"""Simulator for the MoCoMo M2M swarm endpoint.

Install:
    pip install requests msgpack

Local `next dev` accepts X-M2M-Agent-Sig: test-agent-v1 when M2M_AGENT_SIG is unset.
Production answers 404 until M2M_AGENT_SIG is set to the same value this script sends.
"""

from __future__ import annotations

import os
import random
import sys

import msgpack
import requests

URL = os.environ.get("MOCOMO_AI_URL", "http://localhost:3000/api/ai")
SIG = os.environ.get("M2M_AGENT_SIG", "test-agent-v1")
DIM = 1536


def preview(value: object, limit: int = 4) -> object:
    if isinstance(value, dict) and "vectors" in value:
        vectors = value["vectors"]
        if isinstance(vectors, list):
            heads = []
            for row in vectors[:2]:
                if isinstance(row, list):
                    heads.append(row[:limit])
            return {
                "vectors_count": len(vectors),
                "dim": len(vectors[0]) if vectors and isinstance(vectors[0], list) else 0,
                "head": heads,
            }
    return value


def main() -> int:
    try:
        browser = requests.get(URL, timeout=20)
    except requests.RequestException as exc:
        print(f"GET failed: {exc}")
        print("Start the web app with: npm run dev:web")
        return 1

    print(f"browser GET status: {browser.status_code}")
    print(f"browser GET body: {browser.text!r}")
    if browser.status_code != 404:
        print("cloaking check failed: expected 404")
        return 1

    latent = [random.random() for _ in range(DIM)]
    payload = msgpack.packb({"latent_vector": latent}, use_bin_type=True)
    try:
        agent = requests.post(
            URL,
            data=payload,
            headers={
                "Content-Type": "application/x-msgpack",
                "X-M2M-Agent-Sig": SIG,
            },
            timeout=30,
        )
    except requests.RequestException as exc:
        print(f"POST failed: {exc}")
        return 1

    print(f"agent POST status: {agent.status_code}")
    print(f"agent POST content-type: {agent.headers.get('content-type')}")
    try:
        decoded = msgpack.unpackb(agent.content, raw=False)
    except Exception as exc:
        print(f"msgpack decode failed: {exc}")
        print(agent.content[:300])
        return 1

    print("decoded:")
    print(preview(decoded))
    if agent.status_code == 200:
        return 0
    if isinstance(decoded, dict) and decoded.get("error") in {"swarm_unavailable", "store_failed", "match_failed"}:
        print("binary call reached the swarm handler; database setup is still incomplete")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
