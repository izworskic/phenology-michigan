"""Reusable evidence-first utilities for Python Intelligence OS v1.

No network calls, secrets, model training, or runtime dependencies.
Domain-specific biological forecasts are deliberately outside this package.
"""
from .quality import prepare_archive, evidence_window
from .scorecard import assess_candidate
__all__ = ["prepare_archive", "evidence_window", "assess_candidate"]
