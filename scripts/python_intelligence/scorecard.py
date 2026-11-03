"""Python Intelligence OS candidate assessment; not a prediction accuracy score."""
from __future__ import annotations
import math

WEIGHTS = {
    "visitorDecision": 30,
    "evidenceReliability": 25,
    "experienceValue": 15,
    "performanceCost": 15,
    "discoveryOpportunity": 15,
}
HARD_GATES = ("sourceLegal", "validatedEvidence", "fallbackSafe", "ownerVerified")


def assess_candidate(scores, gates):
    """Calculate a 0..100 prioritization score; hard gates always take precedence.

    Scores are 0..5. Missing/invalid scores cannot become zero silently.
    A high score never overrides a false scientific, licensing or safety gate.
    """
    if not isinstance(scores, dict) or not isinstance(gates, dict):
        raise ValueError("scores and gates must be objects")
    if set(scores) != set(WEIGHTS):
        raise ValueError("exactly five dimensions required")
    for value in scores.values():
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 5:
            raise ValueError("scores must be finite numbers from 0 to 5")
    if set(gates) != set(HARD_GATES) or any(not isinstance(v, bool) for v in gates.values()):
        raise ValueError("four explicit Boolean gates required")
    score = round(sum(scores[k] / 5 * w for k, w in WEIGHTS.items()), 1)
    blocked = [key for key in HARD_GATES if not gates[key]]
    return {"schema": "python-intelligence-scorecard-v1", "score": score,
            "blockedBy": blocked, "decision": "BLOCKED" if blocked else
            "PROCEED" if score >= 85 else "RESEARCH" if score >= 70 else "DEFER"}
