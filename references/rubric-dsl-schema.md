# Rubric DSL Schema

## Schema Overview
The rubric DSL is JSON-based with the following structure:
```json
{
  "ticket_type": "string",
  "criteria": [
    {
      "id": "string",
      "name": "string",
      "type": "command",  // or "output"
      "rule": {
        "match": "string",
        "operator": "contains|regex|equals|gt|lt|gte|lte",
        "value": "string",
        "negate": false
      },
      "max_score": number,
      "weight": number
    }
  ],
  "formula": {
    "type": "weighted_sum|weighted_average|threshold",
    "parameters": {
      "pass_threshold": number
    }
  },
  "evidence_store": {
    "path": "string",
    "format": "jsonl"
  }
}
```

## Operators
- `contains`: `match in text`
- `regex`: `bool(re.search(match, text))`
- `equals`: `text.strip() == match`
- `gt`: `float(text.strip()) > float(match)`
- `lt`: `float(text.strip()) < float(match)`
- `gte`: `float(text.strip()) >= float(match)`
- `lte`: `float(text.strip()) <= float(match)`

## Formula Types
- `weighted_sum`: Sum of all criterion scores
- `weighted_average`: Weighted average divided by total weight
- `threshold`: 1.0 if any criterion meets threshold, else 0.0

## Evidence Store Format
- JSONL format: `{"ticket_type": "string", "command": "string", "output": "string", "timestamp": "ISO8601"}`
- One entry per command/observation pair
- Append-only format for auditability

## Example Rubric (bug ticket type)
```json
{
  "ticket_type": "bug",
  "criteria": [
    {"id": "c1", "name": "uses git log", "type": "command", "rule": {"match": "git log", "operator": "contains", "value": "", "negate": false}, "max_score": 0.5},
    {"id": "c2", "name": "has fix commit", "type": "command", "rule": {"match": "fix", "operator": "contains", "value": "", "negate": false}, "max_score": 0.5},
    {"id": "c3", "name": "no breaking change", "type": "command", "rule": {"match": "revert", "operator": "contains", "value": "", "negate": true}, "max_score": 1.0}
  ],
  "formula": {"type": "weighted_sum"},
  "evidence_store": {"path": "evidence.jsonl", "format": "jsonl"}
}
```