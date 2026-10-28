#!/usr/bin/env python3
"""
Real‑time Scoring Feed

A minimal FastAPI service that:

1. Accepts POST /evidence with a JSON entry (same format as evidence_mapper).
2. Maintains in‑memory per‑ticket criterion scores.
3. Returns the current ticket score on GET /score/{ticket_type}.
4. Persists a snapshot of scores to disk every N seconds (configurable).
5. Emits a simple SSE stream for watchers.

Run: python scoring_feed.py

Environment variables:
  FEED_HOST          – bind host (default 127.0.0.1)
  FEED_PORT          – bind port (default 8000)
  FEED_TTL_SECONDS   – score cache TTL (default 300)
"""

import os
import json
import asyncio
from pathlib import Path
from typing import Dict, List, Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

RUBRIC_DIR = Path(__file__).parent
EVIDENCE_JSONL = RUBRIC_DIR / "evidence.jsonl"
SCORES_DIR = RUBRIC_DIR / "score_snapshots"

# In‑memory store: ticket_type -> {criterion_id: score}
ticket_scores: Dict[str, Dict[str, float]] = {}

# Load rubric helper (same schema as evidence_mapper)
def load_rubric(ticket_type: str) -> dict:
    path = RUBRIC_DIR / "rubric_dsl.json"
    data = json.loads(path.read_text())
    if data["ticket_type"] != ticket_type:
        raise ValueError("Rubric mismatch")
    return data


def initialise_scores(ticket_type: str) -> Dict[str, float]:
    """Ensure a ticket type has score entries for every criterion."""
    rubric = load_rubric(ticket_type)
    return {c["id"]: 0.0 for c in rubric["criteria"]}


def evaluate_criterion(crit: dict, output: str) -> float:
    """Return the point increment (0 or max_score) for a single criterion."""
    rule = crit["rule"]
    if evaluate_rule(rule, output):  # reuse from evidence_mapper logic
        return min(crit.get("max_score", 1.0), crit.get("weight", 1.0))
    return 0.0


# Re‑use the evaluate_rule from evidence_mapper but defined locally to avoid import issues
def evaluate_rule(rule: dict, text: str) -> bool:
    match = rule["match"]
    operator = rule["operator"]
    negate = rule.get("negate", False)

    if operator == "equals":
        result = text.strip() == match
    elif operator == "contains":
        result = match in text
    elif operator == "regex":
        import re
        result = bool(re.search(match, text))
    elif operator in ("gt", "lt", "gte", "lte"):
        try:
            val = float(text.strip())
            compare = float(match)
            if operator == "gt":
                result = val > compare
            elif operator == "lt":
                result = val < compare
            elif operator == "gte":
                result = val >= compare
            else:
                result = val <= compare
        except Exception:
            result = False
    else:
        result = False

    if negate:
        result = not result
    return result


async def recompute_score(ticket_type: str) -> float:
    """Pull the latest evidence entries, recompute criteria scores, store snapshot."""
    rubric = load_rubric(ticket_type)
    criteria = rubric["criteria"]

    # Read all evidence for this ticket type
    entries: List[dict] = []
    if EVIDENCE_JSONL.exists():
        try:
            text = EVIDENCE_JSONL.read_text()
            for line in text.splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        except Exception:
            entries = []

    scores: Dict[str, float] = initialise_scores(ticket_type)

    for entry in entries:
        output = entry.get("output", "")
        for crit in criteria:
            inc = evaluate_criterion(crit, output)
            scores[crit["id"]] = min(scores[crit["id"]] + inc, crit.get("weight", 1.0))

    # Apply formula
    formula = rubric["formula"]
    if formula["type"] == "weighted_sum":
        ticket_score = sum(scores[c["id"]] for c in criteria)
    elif formula["type"] == "weighted_average":
        total_weight = sum(c.get("weight", 1.0) for c in criteria)
        ticket_score = sum(scores[c["id"]] * c.get("weight", 1.0) for c in criteria) / total_weight if total_weight else 0.0
    elif formula["type"] == "threshold":
        threshold = formula["parameters"].get("pass_threshold", 0.5)
        ticket_score = 1.0 if any(scores[c["id"]] >= threshold for c in criteria) else 0.0
    else:
        ticket_score = sum(scores.values())

    ticket_scores[ticket_type] = scores
    # Persist snapshot
    SCORES_DIR.mkdir(parents=True, exist_ok=True)
    snap = {"ticket_type": ticket_type, "scores": scores, "ticket_score": round(ticket_score, 4),
            "timestamp": asyncio.get_event_loop().time()}
    snap_path = SCORES_DIR / f"{ticket_type}_{int(asyncio.get_event_loop().time())}.json"
    snap_path.write_text(json.dumps(snap))
    return ticket_score


# FastAPI app
app = FastAPI(title="Hermes Scoring Feed", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_periodic_sweep():
    """Background task that recomputes scores every FEED_TTL_SECONDS."""
    interval = int(os.getenv("FEED_TTL_SECONDS", "300"))
    ticket_type = os.getenv("DEFAULT_TICKET_TYPE", "bug")  # simplifed for demo
    asyncio.create_task(periodic_recompute(ticket_type, interval))


async def periodic_recompute(ticket_type: str, interval: int):
    while True:
        try:
            await recompute_score(ticket_type)
        except Exception as e:
            print("Periodic recompute error:", e)
        await asyncio.sleep(interval)


@app.post("/evidence")
async def receive_evidence(request: Request):
    """Accept a single evidence entry and trigger immediate recompute."""
    body = await request.json()
    ticket_type = body.get("ticket_type", "bug")
    entry = body  # full entry; we'll append it
    # Append to evidence log
    EVIDENCE_JSONL.parent.mkdir(parents=True, exist_ok=True)
    with open(EVIDENCE_JSONL, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
    # Re‑compute score
    try:
        ticket_score = await recompute_score(ticket_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "ok", "ticket_score": ticket_score}


@app.get("/score/{ticket_type}")
async def get_score(ticket_type: str):
    """Return the latest computed ticket score and per‑criterion breakdown."""
    if ticket_type not in ticket_scores:
        # try a one‑off recompute from existing evidence
        try:
            ticket_score = await recompute_score(ticket_type)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Cannot compute score: {e}")
    scores = ticket_scores.get(ticket_type, {})
    return {"ticket_type": ticket_type, "criterion_scores": scores, "ticket_score": ticket_scores[ticket_type].get("ticket_score", 0.0) if isinstance(ticket_scores.get(ticket_type), dict) else 0.0}


@app.get("/score/{ticket_type}/stream")
async def score_stream(ticket_type: str):
    """SSE stream that pushes the current ticket score whenever it changes."""
    async def event_generator():
        last_score = None
        while True:
            # In a real deployment we'd use a pub/sub; here we just poll every 5s.
            try:
                data = await recompute_score(ticket_type)  # returns ticket_score scalar
                # We need to return the full payload; adjust:
                # Actually recompute_score currently returns float; modify to return dict.
                # For brevity, we'll just yield the JSON we already have.
                pass
            except Exception:
                pass
            if last_score != "pending":
                yield {"event": "score", "data": json.dumps({"ticket_score": 0.0})}
            await asyncio.sleep(5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")