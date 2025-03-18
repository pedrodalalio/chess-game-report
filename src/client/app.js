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

    // Carregar um PGN diretamente
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

    // Buscar jogos do Chess.com
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

    // Exibir lista de jogos
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

    // Selecionar um jogo para visualização
    function selectGame(selectedGame) {
        currentPgn = selectedGame.pgn;
        resetAndDisplayGame();
        
        // Garantir que o elemento existe antes de tentar rolar
        const boardContainer = document.getElementById('chessboard-container');
        if (boardContainer) {
            boardContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Inicializar o tabuleiro se ainda não estiver inicializado
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

    // Reiniciar e exibir o jogo
    function resetAndDisplayGame() {
        // Inicializar o tabuleiro se necessário
        initializeBoard();
        
        // Verificar se o tabuleiro foi inicializado com sucesso
        if (!board) {
            console.error("Tabuleiro não inicializado! Verifique se o elemento 'board' existe no HTML.");
            alert("Erro ao carregar o tabuleiro. Verifique o console para mais detalhes.");
            return;
        }
        
        // Reiniciar o jogo
        game = new Chess();
        game.load_pgn(currentPgn);
        
        // Reiniciar a posição do tabuleiro
        board.position('start');
        
        // Obter os movimentos
        moves = game.history({ verbose: true });
        moveIndex = 0;
        
        // Reiniciar o jogo para a posição inicial
        game = new Chess();
        
        // Atualizar a lista de movimentos
        updateMoveList();
    }

    // Atualizar a lista de movimentos
    function updateMoveList() {
        const moveListDiv = document.getElementById("move-list");
        if (!moveListDiv) {
            console.error("Elemento 'move-list' não encontrado!");
            return;
        }
        
        moveListDiv.innerHTML = "";
        
        const sanMoves = moves.map(move => move.san);
        
        sanMoves.forEach((san, index) => {
            // Adicionar número do movimento para movimentos brancos
            if (index % 2 === 0) {
                const moveNumber = Math.floor(index / 2) + 1;
                const moveNumberSpan = document.createElement("span");
                moveNumberSpan.textContent = `${moveNumber}. `;
                moveListDiv.appendChild(moveNumberSpan);
            }
            
            const moveButton = document.createElement("button");
            moveButton.textContent = san;
            moveButton.classList.add("move-button");
            if (index === moveIndex - 1) {
                moveButton.classList.add("current");
            }
            
            moveButton.addEventListener('click', () => goToMove(index + 1));
            moveListDiv.appendChild(moveButton);
        });
    }

    // Ir para um movimento específico
    function goToMove(targetIndex) {
        if (!board) {
            console.error("Tabuleiro não inicializado!");
            return;
        }
        
        game = new Chess();
        
        // Aplicar todos os movimentos até o índice alvo
        for (let i = 0; i < targetIndex; i++) {
            if (i < moves.length) {
                game.move(moves[i]);
            }
        }
        
        moveIndex = targetIndex;
        board.position(game.fen());
        updateMoveList();
    }

    // Avançar para o próximo movimento
    function nextMove() {
        if (!board) {
            console.error("Tabuleiro não inicializado!");
            return;
        }
        
        if (moveIndex < moves.length) {
            game.move(moves[moveIndex]);
            board.position(game.fen());
            moveIndex++;
            updateMoveList();
        }
    }

    // Retroceder para o movimento anterior
    function prevMove() {
        if (!board) {
            console.error("Tabuleiro não inicializado!");
            return;
        }
        
        if (moveIndex > 0) {
            moveIndex--;
            game.undo();
            board.position(game.fen());
            updateMoveList();
        }
    }
});