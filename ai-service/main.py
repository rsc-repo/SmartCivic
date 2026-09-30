"""
SmartCivic AI Service — Phase 2 (Optional)

This FastAPI service is a placeholder. In Phase 2 it will host:
  - Spatial duplicate-issue detection (scikit-learn clustering on
    reported issue locations + categories)
  - Image classification to help auto-triage issue categories/priority
    from uploaded photos (OpenCV / scikit-learn)

Not required for Phase 1 (environment setup & database initialization).

Run locally (after creating a venv and installing requirements.txt):
    python -m venv venv
    source venv/bin/activate        # Windows: venv\\Scripts\\activate
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI

app = FastAPI(title="SmartCivic AI Service", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok", "service": "smartcivic-ai-service"}
