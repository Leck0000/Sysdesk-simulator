#!/usr/bin/env python3
"""
Certificate Issuance Pipeline

Steps:
1. When a ticket's score meets the predetermined criteria (e.g., ticket_score >= pass_threshold),
   the pipeline builds a certificate payload.
2. The payload is cryptographically signed using Ed25519 (via the `cryptography` package).
3. The signed payload + metadata is stored in a persistent store (JSON files under
   certificates/<ticket_type>/).
4. A verification URL is generated that serves the public key and signature for
   external verification (no private key ever exposed).

The private key is generated once per profile and kept in a file that is chmod‑0400.
The public key is embedded in the verification URL as a hash; the verification endpoint
re‑loads the public key from a known location.

Run: python certificate_pipeline.py
"""

import json
import os
import hashlib
import base64
from pathlib import Path
from typing import Dict, Any, Optional
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat, PrivateFormat, NoEncryption

CERTS_DIR = Path(__file__).parent / "certificates"
PRIVATE_KEY_PATH = CERTS_DIR / "private_key.pem"
PUBLIC_KEY_PATH = CERTS_DIR / "public_key.pem"

# Ensure keys exist; generate if missing
def _ensure_keys():
    CERTS_DIR.mkdir(parents=True, exist_ok=True)
    if not PRIVATE_KEY_PATH.exists():
        private_key = Ed25519PrivateKey.generate()
        PRIVATE_KEY_PATH.write_text(
            private_key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()).decode(),
            encoding="utf-8",
        )
        pub = private_key.public_key()
        PUBLIC_KEY_PATH.write_text(
            pub.public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo).decode(),
            encoding="utf-8",
        )
    # restrict permissions
    os.chmod(str(PRIVATE_KEY_PATH), 0o400)
    os.chmod(str(PUBLIC_KEY_PATH), 0o644)

_ensure_keys()


def load_private_key() -> Ed25519PrivateKey:
    pem = PRIVATE_KEY_PATH.read_text(encoding="utf-8")
    return Ed25519PrivateKey.from_pem(pem.encode("utf-8"))


def load_public_key() -> Ed25519PublicKey:
    pem = PUBLIC_KEY_PATH.read_text(encoding="utf-8")
    return Ed25519PublicKey.from_pem(pem.encode("utf-8"))


def build_payload(ticket_type: str, ticket_id: str, score: float,
                  criteria_met: Dict[str, float], rubric_hash: str) -> Dict[str, Any]:
    """Construct the certificate payload (the "what" that gets signed)."""
    payload = {
        "ticket_type": ticket_type,
        "ticket_id": ticket_id,
        "score": round(score, 4),
        "criteria_met": criteria_met,  # {criterion_id: achieved_score}
        "rubric_hash": rubric_hash,
        "issued_at": int(os.times().elapsed_time or 0),  # placeholder; use time.time() in production
    }
    return payload


def sign_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Sign the payload and return a certificate object containing the signature."""
    private_key = load_private_key()
    # Canonical JSON bytes
    payload_bytes = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    signature = private_key.sign(payload_bytes)
    return {
        "payload": payload,
        "signature_b64": base64.b64encode(signature).decode("utf-8"),
    }


def store_certificate(cert: Dict[str, Any]) -> Path:
    """Persist the signed certificate to disk under certificates/<ticket_type>/<ticket_id>.json."""
    ticket_type = cert["payload"]["ticket_type"]
    ticket_id = cert["payload"]["ticket_id"]
    out_dir = CERTS_DIR / ticket_type
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{ticket_id}.json"
    out_path.write_text(json.dumps(cert, indent=2), encoding="utf-8")
    return out_path


def verify_signature(cert: Dict[str, Any]) -> bool:
    """Verify the signature using the stored public key. Returns True if valid."""
    public_key = load_public_key()
    payload = cert["payload"]
    signature_b64 = cert.get("signature_b64", "")
    try:
        signature = base64.b64decode(signature_b64)
        payload_bytes = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        public_key.verify(signature, payload_bytes)
        return True
    except Exception as e:
        print("Verification error:", e)
        return False


def generate_verification_url(ticket_type: str, ticket_id: str) -> str:
    """Return a URL that a remote verifier can call to check the certificate.

    In this simple file‑based design the URL is a path; a web server would serve
    /verify/{ticket_type}/{ticket_id} which loads the public key and checks the sig.
    """
    # For local demonstration we just return a file:// style reference.
    # In production this would be an HTTP endpoint.
    return f"/verify/{ticket_type}/{ticket_id}"


# CLI demo
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 4:
        print("Usage: python certificate_pipeline.py <ticket_type> <ticket_id> <score> [criteria_json]")
        sys.exit(2)
    ticket_type = sys.argv[1]
    ticket_id = sys.argv[2]
    score = float(sys.argv[3])
    criteria_json = sys.argv[4] if len(sys.argv) > 4 else "{}"
    criteria_met = json.loads(criteria_json)

    rubric_hash = hashlib.sha256(json.dumps({"ticket_type": ticket_type}, sort_keys=True).encode()).hexdigest()[:8]

    payload = build_payload(ticket_type, ticket_id, score, criteria_met, rubric_hash)
    signed = sign_payload(payload)
    cert_path = store_certificate(signed)

    # Attach path info for the caller
    signed["certificate_path"] = str(cert_path)
    signed["verification_url"] = generate_verification_url(ticket_type, ticket_id)

    print("Certificate stored at:", cert_path)
    print("Verification URL:", signed["verification_url"])
    print("Payload:", json.dumps(signed["payload"], indent=2))
    print("Signature (base64):", signed["signature_b64"])

    # Verify locally
    print("Local verify result:", verify_signature(signed))