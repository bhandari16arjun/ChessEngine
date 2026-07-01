from flask import Flask, render_template, request, jsonify, session
import sys
import os
import secrets
import queue

# Add the src folder to the system path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
import chessengine
import ChessAI

base_dir = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, 
            static_folder=os.path.join(base_dir, 'static'),
            template_folder=os.path.join(base_dir, 'templates'))
app.secret_key = secrets.token_hex(16)

# Global dictionary to map session IDs to GameState instances
games = {}

def get_game_state():
    if 'session_id' not in session:
        session['session_id'] = secrets.token_hex(8)
    
    sid = session['session_id']
    if sid not in games:
        games[sid] = chessengine.GameState()
    return games[sid]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/reset', methods=['POST'])
def reset_game():
    if 'session_id' in session:
        games[session['session_id']] = chessengine.GameState()
    return jsonify({"status": "success"})

@app.route('/api/state', methods=['GET'])
def get_state():
    gs = get_game_state()
    valid_moves = gs.getValidMoves()
    
    # Serialize valid moves for the frontend
    # Format: { "row-col": [{"row": end_row, "col": end_col}, ...] }
    moves_dict = {}
    for move in valid_moves:
        start_key = f"{move.start_row}-{move.start_col}"
        if start_key not in moves_dict:
            moves_dict[start_key] = []
        moves_dict[start_key].append({"row": move.end_row, "col": move.end_col})
        
    return jsonify({
        "board": gs.board,
        "white_to_move": gs.white_to_move,
        "checkmate": gs.checkmate,
        "stalemate": gs.stalemate,
        "in_check": gs.in_check,
        "valid_moves": moves_dict,
        "move_log": [move.getChessNotation() for move in gs.move_log]
    })

@app.route('/api/move', methods=['POST'])
def make_move():
    data = request.json
    start_row = data.get('start_row')
    start_col = data.get('start_col')
    end_row = data.get('end_row')
    end_col = data.get('end_col')

    gs = get_game_state()
    valid_moves = gs.getValidMoves()
    
    # Reconstruct the move object
    requested_move = chessengine.Move((start_row, start_col), (end_row, end_col), gs.board)
    
    move_made = False
    for i in range(len(valid_moves)):
        if requested_move == valid_moves[i]:
            gs.makeMove(valid_moves[i])
            move_made = True
            break
            
    if not move_made:
        return jsonify({"status": "error", "message": "Invalid move"}), 400
        
    # Check if game ended after human move
    valid_moves = gs.getValidMoves()
    if gs.checkmate or gs.stalemate:
        return jsonify({"status": "success", "game_over": True})
        
    # Trigger AI Move if it's black's turn
    if not gs.white_to_move:
        # We run the AI synchronously here for simplicity in the web response
        q = queue.Queue()
        ChessAI.findBestMove(gs, valid_moves, q)
        ai_move = q.get()
        if ai_move is None:
            ai_move = ChessAI.findRandomMove(valid_moves)
            
        gs.makeMove(ai_move)

    return jsonify({"status": "success", "game_over": gs.checkmate or gs.stalemate})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
