# Full-Stack Chess Engine Deployment Plan

## The "Best of Both Worlds" Architecture

This plan outlines the transformation of your Pygame desktop application into a modern, Full-Stack Web Application. We will use **Flask** for the backend, build a gorgeous custom **HTML/CSS/JS** frontend, and retain your custom **`chessengine.py`** and **`ChessAI.py`** to prove you built the rule engine and AI entirely from scratch.

---

### Phase 1: Directory Restructuring

We will separate the web logic from your existing engine logic without breaking your core algorithms. 
The new project structure will look like this:

```text
ChessEngine/
├── src/
│   ├── chessengine.py      # Your custom rule engine (Unchanged)
│   ├── ChessAI.py          # Your custom Minimax AI (Unchanged)
│   └── (Deprecated Pygame files: chessmain.py, MoveLog.py, etc.)
├── web/
│   ├── app.py              # New Flask Backend
│   ├── templates/
│   │   └── index.html      # Main Web UI
│   └── static/
│       ├── css/style.css   # Modern, premium styling
│       ├── js/main.js      # Frontend logic & API calls
│       └── img/            # Chess piece images
├── requirements.txt        # Deployment dependencies (Flask, gunicorn)
└── README.md
```

---

### Phase 2: Backend Development (Flask API)

We will build a lightweight Python Flask server (`web/app.py`) to act as the bridge between your web UI and your Python game engine.

**Key Endpoints:**
1. `GET /`: Serves the main `index.html` page.
2. `POST /api/move`: 
   - Receives the player's move from the frontend (e.g., `start_square: (6,4), end_square: (4,4)`).
   - Validates the move using your `chessengine.py`.
   - Triggers `ChessAI.py` to calculate the computer's response.
   - Returns the updated board state, valid moves, and game status (checkmate/stalemate) to the frontend.
3. `POST /api/reset`: Resets the board for a new game.

**State Management:**
To allow multiple recruiters to play the game simultaneously without interfering with each other, we will use Flask session IDs to map each user to their own unique `GameState` instance in memory.

---

### Phase 3: Frontend Development (Modern Web UI)

This is where we wow the recruiters. We will build a fully custom, interactive chessboard.

**Design Aesthetics (The "Wow" Factor):**
- **Theme**: A sleek, dark-mode glassmorphism aesthetic.
- **Interactivity**: Click-to-move mechanics with smooth CSS micro-animations.
- **Highlights**: When a piece is clicked, JS will request valid moves from the backend and highlight the valid destination squares.
- **No external libraries**: By not relying on libraries like `chessboard.js`, you prove you have strong vanilla JS and DOM manipulation skills.

---

### Phase 4: AI & Engine Adaptation

Your `chessengine.py` and `ChessAI.py` are already perfectly decoupled from Pygame (great architectural design on your part!). 

The only minor adjustment needed will be in `ChessAI.py`. Currently, it uses Python's `multiprocessing` to prevent the Pygame UI from freezing. In a web environment, HTTP requests are inherently asynchronous from the client's perspective, so we can run the AI synchronously inside the Flask route, or use a background thread, simplifying the code.

---

### Phase 5: Deployment

Once the web application is fully functional locally, we will deploy it to the internet.

**Target Platform**: [Render.com](https://render.com/) (Free Tier)
1. Generate a `requirements.txt` file containing `Flask` and `gunicorn`.
2. Push the updated codebase to GitHub.
3. Link the GitHub repository to Render and deploy it as a "Web Service".
4. Render will provide a live URL (e.g., `https://your-chess-engine.onrender.com`) that you can place directly on your resume.

---

### Next Steps

If you approve this plan, we will execute it in the following order:
1. **Step 1**: Initialize the Flask app and get the backend API running.
2. **Step 2**: Build the HTML/CSS chessboard layout.
3. **Step 3**: Write the Javascript to connect the UI to the Flask API.
4. **Step 4**: Deploy to Render.
