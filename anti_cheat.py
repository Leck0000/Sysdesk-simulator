#!/usr/bin/env python3
"""
Anti‑Cheat: Deterministic Simulation Replay

Purpose: Given a recorded set of command/observation entries and the associated rubric,
replay the execution in a deterministic order and recompute scores. If the replayed
score differs from the originally recorded score, that is an audit flag.

The replay is deterministic because:
  • entries are sorted by (ticket_type, timestamp, command_hash) before processing,
  • rubric rules are pure functions of command output (no external state),
  • randomness / time‑based commands are disallowed or mocked.

Usage:
  python anti_cheat.py <ticket_type> <evidence_jsonl_path> <recorded_score>
"""

import json
import sys
import hashlib
from pathlib import Path
from typing import List, Dict, Any

# Import the same rubric and scoring logic we use elsewhere
from evidence_mapper import collect_evidence, load_rubric


def command_hash(entry: Dict[str, Any]) -> str:
    """Create a stable hash for a command entry so sorting is deterministic."""
    # Hash the command + output combination; ignore timestamp.
    raw = f"{entry.get('command','')}|{entry.get('output','')}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def replay_and_audit(ticket_type: str, evidence_path: Path, recorded_score: float) -> Dict[str, Any]:
    """Run a deterministic replay and compare the resulting score."""
    # 1️⃣ Load evidence entries
    raw = evidence_path.read_text(encoding="utf-8")
    entries: List[Dict[str, Any]] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError:
            continue

    # 2️⃣ Sort deterministically: by hash, then timestamp as tie‑breaker
    entries.sort(key=lambda e: (command_hash(e), e.get("timestamp", "")))

    # 3️⃣ Load rubric
    rubric = load_rubric(ticket_type)

    # 4️⃣ Re‑compute scores from scratch
    summary, _ = collect_evidence(ticket_type, entries)

    computed_score = summary.get("ticket_score", 0.0)

    # 5️⃣ Compare
    match = abs(computed_score - recorded_score) < 1e-6

    return {
        "ticket_type": ticket_type,
        "recorded_score": recorded_score,
        "computed_score": computed_score,
        "match": match,
        "difference": round(computed_score - recorded_score, 6),
        "entry_count": len(entries),
        "sorted_entry_hashes": [command_hash(e) for e in entries],
    }


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python anti_cheat.py <ticket_type> <evidence_jsonl_path> <recorded_score>")
        sys.exit(2)
    ticket_type = sys.argv[1]
    evidence_path = Path(sys.argv[2])
    recorded_score = float(sys.argv[3])
    result = replay_and_audit(ticket_type, evidence_path, recorded_score)
    print(json.dumps(result, indent=2))
    if not result["match"]:
        print("\n⚠️  AUDIT FLAG: replayed score does not match recorded score.")