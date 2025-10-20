# 🍳 Recipe AI Generator

**Aplicație web pentru generarea automată de rețete culinare folosind inteligență artificială**

Proiect pentru susținerea cursului de Python - o platformă simplă care transformă ingredientele disponibile în rețete complete și detaliate, generate de Google Gemini AI.

---

Rezumat

Recipe AI Generator este o aplicație web Flask care permite utilizatorilor să:
- Introducă ingredientele pe care le au disponibile
- Genereze automat rețete complete cu ajutorul AI (Google Gemini)
- Salveze rețetele favorite într-o galerie personală
- Vizualizeze detalii complete pentru fiecare rețetă

**Limită**: 10 generări de rețete pe zi per utilizator (pentru gestionarea costurilor API).

---
Tehnologii Folosite

### Backend
- **Flask 3.0.0** - Framework web Python (routing, templates Jinja2, sesiuni)
- **SQLite** - Bază de date relațională (recipes.db) pentru utilizatori și rețete
- **Google Gemini API** - Model AI pentru generarea rețetelor (gemini-2.0-flash)
- **Gunicorn** - Server WSGI pentru producție

### Securitate
- **Flask-WTF** - Protecție CSRF pentru formulare și endpoint-uri
- **Flask-Talisman** - Antete HTTP de securitate (CSP, X-Frame-Options)
- **Werkzeug** - Hash-uri securizate pentru parole (PBKDF2)
- **python-dotenv** - Gestionarea cheilor secrete din `.env`

### Frontend
- **Bootstrap 5.3.2** - Framework CSS responsive
- **Font Awesome 6.4** - Iconițe
- **Vanilla JavaScript** - Interactivitate minimă (fără dependențe externe)
- **Google Fonts (Poppins)** - Tipografie modernă

### Deployment
- **Render.com** - Hosting cloud (configurație în `render.yaml`)
- **Git** - Control versiune

---
Structura Proiectului

```
recipe_ai_generator/
│
├── app.py                    # Aplicația Flask principală (rute, logică backend)
├── recipes.db                # Bază de date SQLite (users, recipes, usage_limits)
├── requirements.txt          # Dependențe Python cu comentarii
├── Procfile                  # Comandă de start pentru Render
├── render.yaml               # Configurație deployment Render
├── .env                      # Variabile de mediu (API keys) - NU se comite
├── .gitignore                # Fișiere ignorate de Git
│
├── templates/                # Template-uri Jinja2 (HTML)
│   ├── base.html             # Layout comun (navbar, footer, stiluri globale)
│   ├── index.html            # Pagina principală (formular ingrediente)
│   ├── login.html            # Autentificare
│   ├── register.html         # Înregistrare cont
│   ├── recipe_result.html    # Afișare rețetă generată (cu salvare)
│   ├── recipe_detail.html    # Detalii rețetă salvată (vizualizare simplă)
│   └── gallery.html          # Galeria de rețete (search + filtru dificultate)
│
└── static/                   # Resurse statice
    ├── css/
    │   └── custom.css        # Fișier CSS personalizat (neutilizat)
    └── js/
        ├── base.js           # JS comun (CSRF, smooth scroll, auto-hide alerts)
        ├── index.js          # Validare formular + loading animation
        ├── recipe_result.js  # Salvare rețetă în galerie
        └── gallery.js        # Filtrare și căutare rețete
```

---
Cum Funcționează

### 1. Autentificare și Sesiuni
- Utilizatorii se înregistrează cu **email + parolă** (hash PBKDF2 în baza de date)
- Sesiunea se salvează în cookie-uri securizate (HttpOnly, SameSite=Lax)
- Decorator `@login_required` protejează rutele private

### 2. Generarea Rețetelor
1. Utilizatorul introduce ingrediente în formular (ex: "pui, cartofi, rozmarin")
2. Backend verifică limita de 10 generări/zi per utilizator (tabel `usage_limits`)
3. Se trimite un prompt structurat către **Google Gemini API**:
   - "Creează o rețetă completă cu ingredientele: X, Y, Z"
   - Răspunsul trebuie să fie JSON strict cu: titlu, ingrediente (cantități), instrucțiuni (10+ pași), dificultate, vin recomandat
4. Backend parsează JSON-ul și validează structura
5. Rețeta se afișează cu toate detaliile

### 3. Salvarea și Gestionarea Rețetelor
- Butonul "Salvează în Galerie" trimite rețeta la `/save_recipe` (POST JSON)
- Rețetele se stochează în tabelul `recipes` (SQLite)
- Galeria (`/gallery`) afișează toate rețetele cu:
  - **Căutare** (search în titlu)
  - **Filtru dificultate** (1-5 stele)
  - **Preview** (primele 3 ingrediente, rating stele)

### 4. Vizualizare Detalii
- Click pe "Vezi Rețeta Completă" deschide pagina de detalii
- Afișare statică cu:
  - Titlu și rating dificultate
  - Listă ingrediente cu cantități
  - Instrucțiuni pas-cu-pas
  - Recomandare băutură

---

Instalare și Rulare Locală

### Pași:

1. **Clonează repository-ul**:
   ```bash
   git clone <url-repo>
   cd recipe_ai_generator
   ```

2. **Creează virtual environment**:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   # sau: source .venv/bin/activate  # Linux/Mac
   ```

3. **Instalează dependențele**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configurează variabilele de mediu** - Creează fișierul `.env`:
   ```env
   GEMINI_API_KEY=<cheia-ta-google-gemini>
   SECRET_KEY=<cheie-secreta-random>
   FLASK_DEBUG=true
   LOG_LEVEL=INFO
   SECURE_COOKIES=false
   ```

   **Obținere cheie Gemini**:
   - Accesează [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Generează o cheie API gratuită

5. **Rulează aplicația**:
   ```bash
   python app.py
   ```

6. **Deschide browserul**:
   ```
   http://localhost:8001
   ```

---
Securitate

- **CSRF Protection** - toate formularele și POST-urile sunt protejate cu token
- **Password Hashing** - parolele nu se stochează plain-text (PBKDF2)
- **Content Security Policy** - restricționează sursele de scripturi/stiluri
- **HttpOnly Cookies** - protejează sesiunea de XSS
- **Rate Limiting** - 10 generări/zi per utilizator (protecție cost API)
- **Input Validation** - validare server-side pentru toate intrările

---
Baza de Date (SQLite)

### Tabel `users`
| Coloană        | Tip       | Descriere                          |
|----------------|-----------|------------------------------------|
| id             | INTEGER   | ID unic (Primary Key)              |
| email          | TEXT      | Email utilizator (UNIQUE)          |
| password_hash  | TEXT      | Hash PBKDF2 al parolei             |
| created_at     | TIMESTAMP | Data înregistrării                 |

### Tabel `recipes`
| Coloană           | Tip       | Descriere                          |
|-------------------|-----------|------------------------------------|
| id                | INTEGER   | ID unic (Primary Key)              |
| title             | TEXT      | Titlul rețetei                     |
| ingredients       | TEXT      | Ingrediente (câte unul pe linie)   |
| instructions      | TEXT      | Instrucțiuni (câte una pe linie)   |
| difficulty_rating | INTEGER   | Dificultate 1-5                    |
| wine_pairing      | TEXT      | Recomandare băutură                |
| created_at        | TIMESTAMP | Data salvării                      |

### Tabel `usage_limits`
| Coloană  | Tip       | Descriere                          |
|----------|-----------|------------------------------------|
| id       | INTEGER   | ID unic (Primary Key)              |
| user_id  | INTEGER   | Referință la users.id              |
| day      | DATE      | Data (YYYY-MM-DD)                  |
| count    | INTEGER   | Număr generări în ziua respectivă  |

**Constrângere**: UNIQUE(user_id, day) - un singur rând per utilizator per zi

---
Design și UX

- **Responsive** - funcționează perfect pe mobil, tabletă, desktop
- **Animații subtile** - fade-in pentru carduri și secțiuni
- **Paletă de culori modernă**:
  - Primary: `#2d6cdf` (albastru)
  - Accent: `#1f8a70` (verde)
  - Background: `#f6f7fb` (gri deschis)
- **Tipografie**: Google Font Poppins (weights 300-700)
- **Iconițe**: Font Awesome 6.4

---

Funcționalități
Implementate
- [x] Autentificare și înregistrare utilizatori
- [x] Generare rețete cu Google Gemini AI
- [x] Limită 10 generări/zi per utilizator
- [x] Salvare rețete în baza de date
- [x] Galerie cu căutare și filtru dificultate
- [x] Vizualizare detalii rețetă
- [x] Ștergere rețete cu confirmare
- [x] Protecție CSRF
- [x] Security headers (CSP)
- [x] Deployment pe Render

---