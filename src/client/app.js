document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = window.location.origin;
    let board = null;
    let game = new Chess();
    let moveIndex = 0;
    let moves = [];
    let currentPgn = '';
    let boardInitialized = false;

    document.getElementById('load-button').addEventListener('click', loadGame);
    document.getElementById('prev-move').addEventListener('click', prevMove);
    document.getElementById('next-move').addEventListener('click', nextMove);

    async function loadGame() {
        const type = document.getElementById("input-type").value;
        const input = document.getElementById("game-input").value;
        
        if (!input) {
            alert("Por favor, insira um nome de usuário ou PGN.");
            return;
        }
        
        if (type === "chesscom") {
            await fetchChessComGames(input);
        } else if (type === "pgn") {
            try {
                loadPgn(input);
            } catch (e) {
                alert("PGN inválido. Por favor, verifique o formato.");
                console.error(e);
            }
        }
    }

    function loadPgn(pgn) {
        game = new Chess();
        try {
            if (game.load_pgn(pgn)) {
                currentPgn = pgn;
                resetAndDisplayGame();
            } else {
                alert("Não foi possível carregar o PGN.");
            }
        } catch (e) {
            console.error("Erro ao carregar PGN:", e);
            alert("Erro ao carregar o PGN. Verifique o formato.");
        }
    }

    async function fetchChessComGames(username) {
        try {
            const response = await fetch(`${API_BASE_URL}/chesscom-games?username=${username}`);
            const data = await response.json();
            
            if (data.error) {
                alert(data.error);
                return;
            }
            
            if (Array.isArray(data)) {
                displayGameList(data, username);
            } else {
                console.error("Erro: resposta inesperada do servidor", data);
                alert("Erro ao processar os dados das partidas.");
            }
        } catch (error) {
            console.error("Erro ao buscar partidas do Chess.com:", error);
            alert("Erro ao buscar partidas do Chess.com.");
        }
    }

    function displayGameList(games, currentUser) {
        const gameListDiv = document.getElementById("game-list");
        gameListDiv.innerHTML = "<h2>Escolha uma partida:</h2>";
        
        games.reverse().forEach((game, index) => {
            const { white, black, url, pgn } = game;
            const isUserWhite = white.username.toLowerCase() === currentUser.toLowerCase();
            const isUserBlack = black.username.toLowerCase() === currentUser.toLowerCase();
            
            let userWon = false;
            let userLost = false;
            
            if (isUserWhite) {
                userWon = white.result === "win";
                userLost = black.result === "win";
            } else if (isUserBlack) {
                userWon = black.result === "win";
                userLost = white.result === "win";
            }
            
            const whiteClass = userWon && isUserWhite ? "winner" : userLost && isUserWhite ? "loser" : "";
            const blackClass = userWon && isUserBlack ? "winner" : userLost && isUserBlack ? "loser" : "";
            
            const gameItem = document.createElement("div");
            gameItem.classList.add("game-item");

            const gameButton = document.createElement("button");
            gameButton.textContent = "Visualizar detalhes";
            gameButton.addEventListener('click', () => selectGame(game));
            
            gameItem.innerHTML = `
                <p>
                    <span class="${whiteClass}">${white.username} (${white.rating})</span> vs
                    <span class="${blackClass}">${black.username} (${black.rating})</span>
                </p>
                <p>Resultado: ${white.result} - ${black.result}</p>
            `;
            
            gameItem.appendChild(gameButton);
            gameListDiv.appendChild(gameItem);
        });
    }

    function selectGame(selectedGame) {
        currentPgn = selectedGame.pgn;
        resetAndDisplayGame();
        
        // Garantir que o elemento existe antes de tentar rolar
        const boardContainer = document.getElementById('chessboard-container');
        if (boardContainer) {
            boardContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function initializeBoard() {
        if (!boardInitialized) {
            const boardElement = document.getElementById('board');
            if (boardElement) {
            board = Chessboard('board', {
                draggable: false,
                    position: 'start',
                    pieceTheme: './public/img/chesspieces/{piece}.svg'
            });            
            boardInitialized = true;
            } else {
                console.error("Elemento 'board' não encontrado!");
            }
        }
    }

    function resetAndDisplayGame() {
        initializeBoard();
        if (!board) {
            console.error("Tabuleiro não inicializado! Verifique se o elemento 'board' existe no HTML.");
            alert("Erro ao carregar o tabuleiro. Verifique o console para mais detalhes.");
            return;
        }
        
        game = new Chess();
        game.load_pgn(currentPgn);
        board.position('start');
        moves = game.history({ verbose: true });
        moveIndex = 0;
        game = new Chess();
    }

    // function updateMoveList() {
    //     const moveListDiv = document.getElementById("move-list");
    //     moveListDiv.innerHTML = "";

    //     const sanMoves = moves.map(move => move.san);
        
    //     sanMoves.forEach((san, index) => {
    //         // Adicionar número do movimento para movimentos brancos
    //         if (index % 2 === 0) {
    //             const moveNumber = Math.floor(index / 2) + 1;
    //             const moveNumberSpan = document.createElement("span");
    //             moveNumberSpan.textContent = `${moveNumber}. `;
    //             moveListDiv.appendChild(moveNumberSpan);
    //         }
            
    //         const moveButton = document.createElement("button");
    //         moveButton.textContent = san;
    //         moveButton.classList.add("move-button");
    //         if (index === moveIndex - 1) {
    //             moveButton.classList.add("current");
    //         }
            
    //         moveButton.addEventListener('click', () => goToMove(index + 1));
    //         moveListDiv.appendChild(moveButton);
    //     });
    // }

    function goToMove(targetIndex) {
        game = new Chess();
        for (let i = 0; i < targetIndex; i++) {
            if (i < moves.length) {
            game.move(moves[i]);
            }
        }
        
        moveIndex = targetIndex;
        board.position(game.fen());
        analyzePreviousMove();
    }

    // 🔹 Função para analisar a jogada anterior com Stockfish
    async function analyzePreviousMove() {
        if (!game || moveIndex === 0) return;

        let tempGame = new Chess();
        for (let i = 0; i < moveIndex - 1; i++) {
            tempGame.move(moves[i]);
        }

        const previousFEN = tempGame.fen();
        const lastMove = moves[moveIndex - 1].san;

        try {
            const response = await fetch(`${API_BASE_URL}/analyze-move`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fen: previousFEN })
            });

            const data = await response.json();
            if (data.analysis) {
                compareMoveWithBest(data.analysis, lastMove);
            }
        } catch (error) {
            console.error("Erro ao analisar a jogada anterior:", error);
        }
    }

    function compareMoveWithBest(analysis, lastMove) {
        const bestMoveDiv = document.getElementById("best-move");
    
        const bestMoveMatch = analysis.match(/bestmove\s(\w+)/);
        let bestMove = bestMoveMatch ? bestMoveMatch[1] : "Desconhecido";
        if (bestMove.length === 4) {
            bestMove = bestMove.slice(2, 4);
        }
    
        if (lastMove.replace("+", "").replace("#", "").toLowerCase() === bestMove) {
            bestMoveDiv.innerHTML = `<strong>Última jogada:</strong> ${lastMove} ✅ (Melhor jogada!)`;
        } else {
            bestMoveDiv.innerHTML = `<strong>Última jogada:</strong> ${lastMove} ❌ | <strong>Melhor jogada:</strong> ${bestMove}`;
        }
    }
    

    function nextMove() {
        if (moveIndex < moves.length) {
            game.move(moves[moveIndex]);
            board.position(game.fen());
            moveIndex++;
            analyzePreviousMove();
        }
    }

    function prevMove() {
        if (moveIndex > 0) {
            moveIndex--;
            game.undo();
            board.position(game.fen());
        }
    }
});
