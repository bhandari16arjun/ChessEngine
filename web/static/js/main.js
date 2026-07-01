document.addEventListener("DOMContentLoaded", () => {
    const boardEl = document.getElementById("chessboard");
    const moveLogEl = document.getElementById("move-log");
    const statusEl = document.getElementById("status-text");
    const overlayEl = document.getElementById("game-over-overlay");
    const overlayMsg = document.getElementById("game-over-message");
    
    let gameState = null;
    let selectedSquare = null; // {row, col}
    let validMovesForSelected = [];
    
    // Initialize the game
    fetchState();

    function fetchState() {
        fetch('/api/state')
            .then(res => res.json())
            .then(data => {
                gameState = data;
                renderBoard();
                updateCapturedPieces();
                updateLogAndStatus();
                checkGameOver();
            });
    }

    function renderBoard() {
        boardEl.innerHTML = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement("div");
                const isLight = (row + col) % 2 === 0;
                square.className = `square ${isLight ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                // Add piece if exists
                const piece = gameState.board[row][col];
                if (piece !== "--") {
                    const pieceEl = document.createElement("div");
                    pieceEl.className = "piece";
                    pieceEl.style.backgroundImage = `url('/static/img/chesspieces/${piece}.png')`;
                    square.appendChild(pieceEl);
                }

                // Highlighting
                if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
                    square.classList.add("selected");
                }
                
                // Highlight valid moves
                const isMoveValid = validMovesForSelected.find(m => m.row === row && m.col === col);
                if (isMoveValid) {
                    if (piece !== "--") {
                        square.classList.add("valid-capture");
                    } else {
                        square.classList.add("valid-move");
                    }
                }

                // Click event
                square.addEventListener("click", () => handleSquareClick(row, col));
                
                boardEl.appendChild(square);
            }
        }
    }

    function handleSquareClick(row, col) {
        if (!gameState || !gameState.white_to_move) return; // Prevent moves during AI turn
        
        // If clicked on a valid move destination, make the move
        const isMoveValid = validMovesForSelected.find(m => m.row === row && m.col === col);
        
        if (selectedSquare && isMoveValid) {
            makeMove(selectedSquare.row, selectedSquare.col, row, col);
            selectedSquare = null;
            validMovesForSelected = [];
            return;
        }

        // Otherwise, select the piece
        const piece = gameState.board[row][col];
        if (piece !== "--" && piece[0] === 'w') { // Only allow selecting own pieces
            selectedSquare = { row, col };
            const key = `${row}-${col}`;
            validMovesForSelected = gameState.valid_moves[key] || [];
            renderBoard();
        } else {
            // Deselect
            selectedSquare = null;
            validMovesForSelected = [];
            renderBoard();
        }
    }

    function makeMove(startRow, startCol, endRow, endCol) {
        // Optimistic UI update for immediate feedback
        statusEl.innerText = "AI is thinking...";
        statusEl.style.background = "rgba(234, 179, 8, 0.2)";
        statusEl.style.color = "#fde047";
        
        // Temporarily move the piece visually before API response
        const piece = gameState.board[startRow][startCol];
        gameState.board[startRow][startCol] = "--";
        gameState.board[endRow][endCol] = piece;
        selectedSquare = null;
        validMovesForSelected = [];
        renderBoard();
        updateCapturedPieces();

        fetch('/api/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                start_row: startRow,
                start_col: startCol,
                end_row: endRow,
                end_col: endCol
            })
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === "error") {
                console.error(data.message);
            }
            // Fetch updated state (which includes AI's response)
            fetchState();
        });
    }

    function updateCapturedPieces() {
        const initialCounts = {
            'w': { 'p': 8, 'R': 2, 'N': 2, 'B': 2, 'Q': 1, 'K': 1 },
            'b': { 'p': 8, 'R': 2, 'N': 2, 'B': 2, 'Q': 1, 'K': 1 }
        };
        
        const currentCounts = {
            'w': { 'p': 0, 'R': 0, 'N': 0, 'B': 0, 'Q': 0, 'K': 0 },
            'b': { 'p': 0, 'R': 0, 'N': 0, 'B': 0, 'Q': 0, 'K': 0 }
        };

        // Count current pieces on board
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (piece !== "--") {
                    const color = piece[0];
                    const type = piece[1];
                    currentCounts[color][type]++;
                }
            }
        }

        // Render captured by white (missing black pieces)
        const whiteCapturedEl = document.getElementById('captured-by-white');
        whiteCapturedEl.innerHTML = '';
        const pieceOrder = ['Q', 'R', 'B', 'N', 'p']; // High value first
        pieceOrder.forEach(type => {
            const lost = initialCounts['b'][type] - currentCounts['b'][type];
            for (let i = 0; i < lost; i++) {
                const img = document.createElement("div");
                img.className = "mini-piece";
                img.style.backgroundImage = `url('/static/img/chesspieces/b${type}.png')`;
                whiteCapturedEl.appendChild(img);
            }
        });

        // Render captured by black (missing white pieces)
        const blackCapturedEl = document.getElementById('captured-by-black');
        blackCapturedEl.innerHTML = '';
        pieceOrder.forEach(type => {
            const lost = initialCounts['w'][type] - currentCounts['w'][type];
            for (let i = 0; i < lost; i++) {
                const img = document.createElement("div");
                img.className = "mini-piece";
                img.style.backgroundImage = `url('/static/img/chesspieces/w${type}.png')`;
                blackCapturedEl.appendChild(img);
            }
        });
    }

    function updateLogAndStatus() {
        moveLogEl.innerHTML = '';
        gameState.move_log.forEach((moveStr, idx) => {
            const el = document.createElement("div");
            el.innerText = `${Math.floor(idx/2) + 1}. ${moveStr}`;
            // If it's black's turn, prepend some space or align differently
            if (idx % 2 !== 0) el.style.opacity = "0.7";
            moveLogEl.appendChild(el);
        });
        
        // Scroll to bottom
        moveLogEl.scrollTop = moveLogEl.scrollHeight;

        if (gameState.checkmate) {
            statusEl.innerText = gameState.white_to_move ? "Black wins by Checkmate!" : "White wins by Checkmate!";
            statusEl.style.background = "rgba(239, 68, 68, 0.2)";
            statusEl.style.color = "#fca5a5";
        } else if (gameState.stalemate) {
            statusEl.innerText = "Draw by Stalemate!";
            statusEl.style.background = "rgba(107, 114, 128, 0.2)";
            statusEl.style.color = "#d1d5db";
        } else if (gameState.in_check) {
            statusEl.innerText = "Check!";
            statusEl.style.background = "rgba(239, 68, 68, 0.2)";
            statusEl.style.color = "#fca5a5";
        } else {
            statusEl.innerText = gameState.white_to_move ? "Your Turn (White)" : "AI is thinking (Black)...";
            statusEl.style.background = gameState.white_to_move ? "rgba(34, 197, 94, 0.2)" : "rgba(234, 179, 8, 0.2)";
            statusEl.style.color = gameState.white_to_move ? "#86efac" : "#fde047";
        }
    }

    function checkGameOver() {
        if (gameState.checkmate || gameState.stalemate) {
            overlayEl.classList.add("active");
            if(gameState.checkmate) {
                overlayMsg.innerText = gameState.white_to_move ? "Black Wins" : "White Wins";
            } else {
                overlayMsg.innerText = "Stalemate";
            }
        } else {
            overlayEl.classList.remove("active");
        }
    }

    window.resetGame = function() {
        fetch('/api/reset', { method: 'POST' })
            .then(() => {
                window.location.reload();
            });
    }
});
