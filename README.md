 
Run locally
1) python -m venv .venv && .venv\Scripts\activate
2) pip install -r requirements.txt
3) Create .env with:
   - GEMINI_API_KEY=...
   - SECRET_KEY=...
4) python app.py

Deploy on Render
- Connect repo, auto-detect render.yaml or add:
  - Build: pip install -r requirements.txt
  - Start: gunicorn app:app --workers 2 --threads 4 --timeout 120