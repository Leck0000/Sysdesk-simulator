#!/usr/bin/env python3
"""
Evidence Collector / Mapper

Reads a rubric DSL (JSON) and a stream of command/observation entries,
produces a per‑criterion score and accumulates evidence for audit.

Entry format (JSONL):
{
  "ticket_type": "bug",
  "command": "git log --oneline -5",
  "output": "abc123|Fix typos|def456|Update docs",
  "timestamp": "2026-08-27T12:34:56Z"
}
"""

import json
import re
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Tuple

RUBRIC_PATH = Path("rubric_dsl.json")
EVIDENCE_PATH = Path("evidence.jsonl")


def load_rubric(ticket_type: str) -> Dict[str, Any]:
    """Load and validate the rubric for the given ticket type."""
    data = json.loads(RUBRIC_PATH.read_text())
    if data["ticket_type"] != ticket_type:
        raise ValueError(f"Rubric ticket_type={data['ticket_type']} != requested {ticket_type}")
    return data


def evaluate_rule(rule: Dict[str, Any], text: str) -> bool:
    """Evaluate a single rule against a text blob."""
    match = rule["match"]
    operator = rule["operator"]
    negate = rule.get("negate", False)

    if operator == "equals":
        result = text.strip() == match
    elif operator == "contains":
        result = match in text
    elif operator == "regex":
        result = bool(re.search(match, text))
    elif operator == "gt":
        try:
            result = float(text.strip()) > float(match)
        except Exception:
            result = False
    elif operator == "lt":
        try:
            result = float(text.strip()) < float(match)
        except Exception:
            result = False
    elif operator == "gte":
        try:
            result = float(text.strip()) >= float(match)
        except Exception:
            result = False
    elif operator == "lte":
        try:
            result = float(text.strip()) <= float(match)
        except Exception:
            result = False
    else:
        result = False

    if negate:
        result = not result
    return result


def collect_evidence(ticket_type: str, entries: List[Dict[str, Any]]) -> Tuple[Dict[str, Any], Dict[str, List[Dict[str, Any]]]]:
    """
    Given a list of evidence entries, compute per‑criterion scores
    and return (summary, per_criterion_evidence).

    summary := {criterion_id: score, "ticket_score": float}
    per_criterion_evidence := {criterion_id: [matching_entries, ...]}
    """
    rubric = load_rubric(ticket_type)
    criteria = rubric["criteria"]
    scores: Dict[str, float] = {c["id"]: 0.0 for c in criteria}
    evidence: Dict[str, List[Dict[str, Any]]] = {c["id"]: [] for c in criteria}

    for entry in entries:
        output = entry.get("output", "")
        for crit in criteria:
            rule = crit["rule"]
            if evaluate_rule(rule, output):
                scores[crit["id"]] = min(scores[crit["id"]] + crit.get("max_score", 1.0), crit.get("weight", 1.0))
                evidence[crit["id"]].append(entry)

    # Compute ticket‑wide score per formula
    formula = rubric["formula"]
    if formula["type"] == "weighted_sum":
        ticket_score = sum(scores[c["id"]] for c in criteria)
    elif formula["type"] == "weighted_average":
        total_weight = sum(c.get("weight", 1.0) for c in criteria)
        ticket_score = sum(scores[c["id"]] * c.get("weight", 1.0) for c in criteria) / total_weight if total_weight else 0.0
    elif formula["type"] == "threshold":
        # ticket_score is just the max criterion score if any meets threshold
        threshold = formula["parameters"].get("pass_threshold", 0.5)
        ticket_score = 1.0 if any(scores[c["id"]] >= threshold for c in criteria) else 0.0
    else:
        ticket_score = sum(scores.values())

    summary = {"criterion_scores": scores, "ticket_score": round(ticket_score, 4)}
    return summary, evidence


def persist_evidence(ticket_type: str, summary: Dict[str, Any], evidence: Dict[str, List[Dict[str, Any]]]) -> None:
    """Append summary + evidence to the audit log."""
    log_entry = {
        "ticket_type": ticket_type,
        "summary": summary,
        "evidence": evidence,
    }
    # keep JSONL; open append
    EVIDENCE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(EVIDENCE_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry) + "\n")


if __name__ == "__main__":
    # Minimal CLI demo
    import sys
    if len(sys.argv) < 3:
        print("Usage: python evidence_mapper.py <ticket_type> <evidence_jsonl_path>")
        sys.exit(2)
    evidence_path = Path(sys.argv[2])
    entries = [json.loads(line) for line in evidence_path.read_text().splitlines() if line.strip()]
    summary, ev = collect_evidence(sys.argv[1], entries)
    print("Summary:", json.dumps(summary, indent=2))
    persist_evidence(sys.argv[1], summary, ev)
    print("Evidence appended to", EVIDENCE_PATH)