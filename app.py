from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session, g
import sqlite3
import requests
import json
import os
from datetime import datetime
import logging
import time
import re
from dotenv import load_dotenv
from flask_wtf.csrf import CSRFProtect, generate_csrf
from flask_talisman import Talisman
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()

# Aplicație Flask pentru generarea și gestionarea rețetelor cu AI
app = Flask(__name__)
# Secret key din .env
app.secret_key = os.getenv('SECRET_KEY') or os.getenv('FLASK_SECRET') or 'dev-secret-change-me'

# Config cookie-uri sigure
SECURE_COOKIES = (os.getenv('SECURE_COOKIES', 'false').lower() == 'true')
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=SECURE_COOKIES,
)

# CSRF Protection
# Activează protecția CSRF pentru formulare și endpoint-uri
csrf = CSRFProtect(app)

# Security headers (Talisman) + CSP minimă, compatibilă cu CDN-urile folosite
csp = {
    'default-src': ["'self'"],
    'script-src': [
        "'self'",
        'https://cdn.jsdelivr.net',
    ],
    'style-src': [
        "'self'",
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
        'https://fonts.googleapis.com',
        "'unsafe-inline'",
    ],
    'font-src': [
        "'self'",
        'https://cdnjs.cloudflare.com',
        'https://fonts.gstatic.com',
        'data:',
    ],
    'img-src': ["'self'", 'data:'],
    'connect-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'frame-ancestors': ["'self'"],
}

# În dezvoltare nu forțăm HTTPS (poți seta force_https=True în producție)
# Adaugă antete de securitate (CSP, X-Frame-Options, etc.) și controlează cookie-urile în funcție de mediu
talisman = Talisman(
    app,
    content_security_policy=csp,
    force_https=False,
    session_cookie_secure=SECURE_COOKIES,
)

# Expune tokenul CSRF în cookie și în template pentru formulare
# Middleware: atașează un cookie cu token CSRF pentru a putea fi folosit din JS (header X-CSRFToken)
@app.after_request
def set_csrf_cookie(response):
    try:
        csrf_token = generate_csrf()
        response.set_cookie(
            'csrf_token',
            csrf_token,
            secure=SECURE_COOKIES,
            httponly=False,  # vizibil în JS pentru header X-CSRFToken
            samesite='Lax'
        )
    except Exception:
        pass
    return response

@app.context_processor
# Injectează tokenul CSRF în contextul Jinja pentru a-l include ușor în formulare
def inject_csrf_token():
    try:
        return dict(csrf_token=generate_csrf())
    except Exception:
        return dict(csrf_token='')

# Configurare logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Cheie Gemini
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# Configurare bază de date
# Fișierul SQLite pentru persistența utilizatorilor și rețetelor
DATABASE = 'recipes.db'


def init_db():
    """
    Inițializează baza de date cu tabelele necesare.
    
    Creează tabelele (dacă nu există):
    - recipes: stochează rețetele salvate
    - users: utilizatori (email + hash parolă)
    - usage_limits: contorizează generările pe zi pentru limitare
    """
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            ingredients TEXT NOT NULL,
            instructions TEXT NOT NULL,
            difficulty_rating INTEGER NOT NULL,
            wine_pairing TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usage_limits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            day DATE NOT NULL,
            count INTEGER NOT NULL DEFAULT 0,
            UNIQUE(user_id, day)
        )
    ''')

    conn.commit()
    conn.close()


# Asigură existența tabelelor și sub Gunicorn/Render (la importul aplicației)
# La import (inclusiv sub Gunicorn) ne asigurăm că tabelele necesare există
try:
    init_db()
except Exception:
    logger.exception("DB init failed at import time")


def get_gemini_response(ingredients_text):
    """
    Generează rețeta folosind Google Gemini API.
    
    Trimite un prompt structurat către Gemini pentru a obține JSON cu rețeta completă:
    - titlu, porții, timpi de preparare și gătit
    - ingrediente (cu cantități și unități)
    - instrucțiuni detaliate (minim 10 pași, cu timp și temperatură)
    - dificultate (1-5) și recomandare de vin
    
    Returns:
        dict sau None: rețeta parsată, sau None la eroare
    """
    if not GEMINI_API_KEY:
        return None

    prompt = (
        f"Ești un chef profesionist român. Creează o rețetă completă și realistă folosind DOAR ingredientele principale: {ingredients_text}. "
        "Poți adăuga în mod implicit doar ingrediente de bază (sare, piper, ulei de măsline, apă) dacă sunt necesare. "
        "RĂSPUNDE DOAR CU JSON VALID (fără explicații, fără text în afara JSON). Folosește exact această schemă:\n"
        "{\n"
        "  \"title\": string,\n"
        "  \"servings\": integer,\n"
        "  \"prep_time_minutes\": integer,\n"
        "  \"cook_time_minutes\": integer,\n"
        "  \"ingredients\": [ { \"item\": string, \"quantity\": number, \"unit\": string, \"notes\": string } ],\n"
        "  \"instructions\": [ { \"step\": integer, \"text\": string, \"time_minutes\": integer, \"temperature_c\": integer|null } ],\n"
        "  \"difficulty\": integer,\n"
        "  \"wine_pairing\": string\n"
        "}\n"
        "Cerințe stricte: \n"
        "- Minim 10 pași detaliați, fiecare cu durată estimată. \n"
        "- Fiecare ingredient trebuie să aibă cantitate numerică și unitate (g, ml, lingurițe, linguri, buc). \n"
        "- Cantitățile să fie realiste. \n"
        "- Include temperatură (°C) dacă se coace sau se prăjește. \n"
        "- \"servings\" între 2 și 6. \n"
        "- \"difficulty\" între 1 și 5. \n"
        "- Textul în română, clar și natural."
    )

    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    headers = {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY
    }
    body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    try:
        logger.info("Gemini call start | model=gemini-2.0-flash")
        t0 = time.time()
        response = requests.post(url, headers=headers, json=body, timeout=25)
        elapsed = time.time() - t0
        logger.info("Gemini response | status=%s elapsed=%.2fs", response.status_code, elapsed)
        if response.status_code != 200:
            logger.warning("Gemini call failed | body_preview=%s", (response.text or '')[:200].replace('\n', ' '))
            return None

        data = response.json()
        # Extrage textul răspunsului
        text = None
        try:
            text = data['candidates'][0]['content']['parts'][0]['text']
        except Exception:
            text = response.text

        parsed = parse_recipe_response(text or '', ingredients_text)
        if parsed:
            logger.info("Gemini parse OK | title='%s'", (parsed.get('title') or '')[:80])
            return parsed
        logger.warning("Gemini parse failed")
        return None
    except Exception as e:
        logger.exception("Gemini call error: %s", str(e))
        return None

def _ingredients_to_strings(ingredients):
    """
    Normalizează lista de ingrediente (din obiecte sau șiruri) în șiruri; nu inventează cantități.
    
    Converteste ingredientele din format JSON (dict cu item, quantity, unit, notes)
    în linii text formatate (ex: "• 200 g roșii (coapte)").
    """
    normalized = []
    if isinstance(ingredients, list):
        for ing in ingredients:
            if isinstance(ing, dict):
                item = (ing.get('item') or '').strip()
                quantity = ing.get('quantity')
                unit = (ing.get('unit') or '').strip()
                notes = (ing.get('notes') or '').strip()
                qty_parts = []
                if quantity not in (None, ''):
                    try:
                        qty_parts.append(str(int(quantity)) if float(quantity) == int(float(quantity)) else str(quantity))
                    except Exception:
                        qty_parts.append(str(quantity))
                if unit:
                    qty_parts.append(unit)
                qty_str = ' '.join(qty_parts).strip()
                line = ('• ' + (f"{qty_str} " if qty_str else '') + item).strip()
                if notes:
                    line += f" ({notes})"
                normalized.append(line)
            elif isinstance(ing, str):
                normalized.append(f"• {ing.strip()}")
    return normalized
@app.before_request
def load_current_user():
    """Atașează utilizatorul autentificat (dacă există) în `g.user` pentru a fi accesibil în request și templates."""
    user_id = session.get('user_id')
    user_email = session.get('user_email')
    g.user = {'id': user_id, 'email': user_email} if user_id and user_email else None


def login_required(view_func):
    """Decorator simplu: redirecționează la login dacă nu există utilizator autentificat."""
    def _wrapped(*args, **kwargs):
        if not g.get('user'):
            flash('Trebuie să te autentifici pentru a accesa această acțiune.', 'error')
            return redirect(url_for('login', next=request.path))
        return view_func(*args, **kwargs)
    _wrapped.__name__ = view_func.__name__
    return _wrapped


def _get_today_count(user_id):
    """Returnează numărul de generări făcute azi de utilizator (pentru limitare la 10/zi)."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    today = datetime.utcnow().date().isoformat()
    cursor.execute('SELECT count FROM usage_limits WHERE user_id = ? AND day = ?', (user_id, today))
    row = cursor.fetchone()
    conn.close()
    return (row[0] if row else 0)


def _inc_today_count(user_id):
    """Incrementează contorul de generări pentru ziua curentă, pentru utilizatorul dat."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    today = datetime.utcnow().date().isoformat()
    cursor.execute('SELECT id, count FROM usage_limits WHERE user_id = ? AND day = ?', (user_id, today))
    row = cursor.fetchone()
    if row:
        cursor.execute('UPDATE usage_limits SET count = ? WHERE id = ?', (row[1] + 1, row[0]))
    else:
        cursor.execute('INSERT INTO usage_limits (user_id, day, count) VALUES (?, ?, ?)', (user_id, today, 1))
    conn.commit()
    conn.close()


def parse_recipe_response(response_text, original_ingredients):
    """
    Parsează STRICT JSON-ul din răspunsul AI.
    
    Extrage JSON din răspunsul Gemini (care poate conține markdown ```json```),
    validează structura și formatează ingredientele/instrucțiunile pentru afișare.
    
    Returns:
        dict sau None: rețeta structurată cu toate câmpurile, sau None la eroare de parsare
    """
    try:
        json_text = response_text.strip()
        if json_text.startswith('```'):
            json_text = re.sub(r"^```[a-zA-Z]*", "", json_text).strip()
            if json_text.endswith('```'):
                json_text = json_text[:-3].strip()

        try:
            data = json.loads(json_text)
        except Exception:
            start = json_text.find('{')
            end = json_text.rfind('}')
            if start != -1 and end != -1 and end > start:
                possible_json = json_text[start:end + 1]
                data = json.loads(possible_json)
            else:
                logger.warning("JSON not found in AI response preview=%s", json_text[:200].replace('\n', ' '))
                return None

        if not isinstance(data, dict):
            logger.warning("AI response is not a JSON object")
            return None

        def _fmt_step(step_obj):
            if isinstance(step_obj, dict):
                # Nu adăugăm prefix numeric; UI-ul se ocupă de numerotare
                text = (step_obj.get('text') or '').strip()
                time_val = step_obj.get('time_minutes')
                temp_val = step_obj.get('temperature_c')
                extras = []
                if isinstance(time_val, (int, float)):
                    extras.append(f"~{int(time_val) if float(time_val).is_integer() else time_val} min")
                if isinstance(temp_val, (int, float)):
                    extras.append(f"{int(temp_val) if float(temp_val).is_integer() else temp_val}°C")
                suffix = f" ({' | '.join(extras)})" if extras else ''
                return f"{text}{suffix}".strip()
            return str(step_obj)

        servings = data.get('servings')
        prep_time = data.get('prep_time_minutes')
        cook_time = data.get('cook_time_minutes')
        try:
            servings = int(servings) if servings is not None else None
        except Exception:
            servings = None
        try:
            prep_time = int(prep_time) if prep_time is not None else None
        except Exception:
            prep_time = None
        try:
            cook_time = int(cook_time) if cook_time is not None else None
        except Exception:
            cook_time = None

        parsed = {
            'title': (data.get('title') or '').strip() or None,
            'ingredients': _ingredients_to_strings(data.get('ingredients') or []),
            'instructions': [_fmt_step(step) for step in (data.get('instructions') or [])],
            'difficulty': int(data.get('difficulty') or 3),
            'wine_pairing': (data.get('wine_pairing') or '').strip(),
            'servings': servings,
            'prep_time_minutes': prep_time,
            'cook_time_minutes': cook_time,
            'total_time_minutes': (prep_time or 0) + (cook_time or 0) if (prep_time or cook_time) else None
        }
        logger.debug("Parsed recipe keys: %s", list(parsed.keys()))
        return parsed
    except Exception:
        logger.exception("Error while parsing AI response")
        return None


@app.route('/')
def index():
    """Pagina principală"""
    if not g.get('user'):
        return redirect(url_for('login'))
    remaining = max(0, 10 - _get_today_count(g.user['id']))
    return render_template('index.html', remaining=remaining)
@app.route('/login', methods=['GET', 'POST'])
def login():
    """Autentifică utilizatorul pe baza email + parolă; setează sesiunea la succes."""
    if request.method == 'POST':
        email = (request.form.get('email') or '').strip().lower()
        password = request.form.get('password') or ''
        if not email or not password:
            flash('Email și parolă necesare', 'error')
            return redirect(url_for('login'))
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('SELECT id, password_hash FROM users WHERE email = ?', (email,))
        row = cursor.fetchone()
        conn.close()
        if not row or not check_password_hash(row[1], password):
            flash('Credențiale invalide', 'error')
            return redirect(url_for('login'))
        session['user_id'] = row[0]
        session['user_email'] = email
        flash('Bun venit!', 'success')
        next_url = request.args.get('next') or url_for('index')
        return redirect(next_url)
    return render_template('login.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    """Creează un cont nou, stocând un hash sigur al parolei; autentifică imediat utilizatorul."""
    if request.method == 'POST':
        email = (request.form.get('email') or '').strip().lower()
        password = request.form.get('password') or ''
        if not email or not password:
            flash('Email și parolă necesare', 'error')
            return redirect(url_for('register'))
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        try:
            cursor.execute('INSERT INTO users (email, password_hash) VALUES (?, ?)', (email, generate_password_hash(password)))
            conn.commit()
        except Exception:
            conn.close()
            flash('Email deja folosit', 'error')
            return redirect(url_for('register'))
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        row = cursor.fetchone()
        conn.close()
        session['user_id'] = row[0]
        session['user_email'] = email
        flash('Cont creat!', 'success')
        return redirect(url_for('index'))
    return render_template('register.html')


@app.route('/logout')
def logout():
    session.clear()
    flash('Te-ai delogat.', 'success')
    return redirect(url_for('index'))


@app.route('/generate_recipe', methods=['POST'])
@login_required
def generate_recipe():
    """
    Generează rețeta bazată pe ingrediente introduse de utilizator.
    
    - Verifică limita de 10 generări/zi per utilizator
    - Apelează Gemini pentru generarea rețetei
    - Incrementează contorul zilnic și afișează rezultatul
    """
    ingredients = request.form.get('ingredients', '').strip()

    if not ingredients:
        flash('Te rog să introduci cel puțin un ingredient!', 'error')
        return redirect(url_for('index'))

    # Limita: 10 generări/zi per utilizator
    user = g.get('user')
    if _get_today_count(user['id']) >= 10:
        flash('Ai atins limita de 10 rețete pe zi. Revino mâine!', 'error')
        return redirect(url_for('index'))

    # Generează rețeta folosind Gemini
    logger.info("Generate recipe requested | ingredients='%s'", ingredients)
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY lipsește")
        flash('Nu este configurată cheia GEMINI_API_KEY. Adaug-o în .env și reîncearcă.', 'error')
        return redirect(url_for('index'))

    recipe_data = get_gemini_response(ingredients)

    if not recipe_data or not recipe_data.get('title') or not recipe_data.get('ingredients') or not recipe_data.get('instructions'):
        logger.warning("Recipe generation failed | recipe_data=%s", bool(recipe_data))
        flash('Nu se poate genera rețeta în acest moment. Te rugăm încearcă din nou.', 'error')
        return redirect(url_for('index'))

    _inc_today_count(user['id'])
    logger.info("Recipe generated successfully | title='%s'", (recipe_data.get('title') or '')[:80])
    return render_template('recipe_result.html',
                           recipe=recipe_data,
                           original_ingredients=ingredients)


@app.route('/save_recipe', methods=['POST'])
@login_required
def save_recipe():
    """
    Salvează rețeta în baza de date (apelat din JS cu fetch).
    
    Primește JSON cu datele rețetei și le stochează în tabelul `recipes`.
    """
    try:
        data = request.get_json()

        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO recipes (title, ingredients, instructions, difficulty_rating, wine_pairing)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            data['title'],
            '\n'.join(data['ingredients']),
            '\n'.join(data['instructions']),
            data['difficulty'],
            data['wine_pairing']
        ))

        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': 'Rețeta a fost salvată cu succes!'})

    except Exception as e:
        return jsonify({'success': False, 'message': f'Eroare la salvare: {str(e)}'})


@app.route('/gallery')
@login_required
def gallery():
    """
    Afișează galeria de rețete salvate.
    
    Listează toate rețetele din baza de date, cu preview de ingrediente și date de creare.
    """
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute('''
        SELECT id, title, ingredients, difficulty_rating, created_at 
        FROM recipes 
        ORDER BY created_at DESC
    ''')

    recipes = []
    for row in cursor.fetchall():
        recipes.append({
            'id': row[0],
            'title': row[1],
            'ingredients': row[2].split('\n')[:3],  # Primele 3 ingrediente
            'difficulty': row[3],
            'created_at': row[4]
        })

    conn.close()

    return render_template('gallery.html', recipes=recipes)


@app.route('/recipe/<int:recipe_id>')
@login_required
def view_recipe(recipe_id):
    """
    Afișează o rețetă completă din galerie.
    
    Citește din baza de date toate detaliile rețetei (ingrediente, instrucțiuni, vin)
    și le pasează către template pentru vizualizare cu funcții interactive (timer, mod gătit, etc.).
    """
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM recipes WHERE id = ?', (recipe_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        flash('Rețeta nu a fost găsită!', 'error')
        return redirect(url_for('gallery'))

    recipe = {
        'id': row[0],
        'title': row[1],
        'ingredients': row[2].split('\n'),
        'instructions': row[3].split('\n'),
        'difficulty': row[4],
        'wine_pairing': row[5],
        'created_at': row[6]
    }

    return render_template('recipe_detail.html', recipe=recipe)


@app.route('/delete_recipe/<int:recipe_id>', methods=['POST'])
@login_required
def delete_recipe(recipe_id):
    """
    Șterge o rețetă din galerie.
    
    Elimină rețeta din baza de date și redirecționează la galerie.
    """
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute('DELETE FROM recipes WHERE id = ?', (recipe_id,))
    conn.commit()
    conn.close()

    flash('Rețeta a fost ștearsă cu succes!', 'success')
    return redirect(url_for('gallery'))


if __name__ == '__main__':
    # Inițializează baza de date (în caz de rulare directă cu python app.py)
    init_db()

    # Rulează aplicația local în modul debug. Pe Render se folosește Gunicorn + PORT.
    # Gunicorn va apela direct obiectul `app` fără să treacă prin acest if.
    port = int(os.getenv('PORT', '8001'))
    debug = os.getenv('FLASK_DEBUG', 'true').lower() == 'true'
    app.run(debug=debug, host='0.0.0.0', port=port)