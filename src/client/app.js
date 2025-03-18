import { Chess } from "chess.js";

const API_BASE_URL = window.location.origin;

async function loadGame() {
    const type = document.getElementById("input-type").value;
    const input = document.getElementById("game-input").value;

    if (!input) {
        alert("Por favor, insira um nome de usuário ou PGN.");
        return;
    }

    if (type === "chesscom") {
        fetchChessComGames(input);
    } else {
        console.log("Modo PGN ainda não implementado.");
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

    games.forEach((game, index) => {
        const { white, black, url } = game;
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
        const encodedGame = encodeURIComponent(JSON.stringify(game)); // 🔹 Correção para evitar quebras de linha no onclick

        gameItem.innerHTML = `
            <p>
                <span class="${whiteClass}">${white.username} (${white.rating})</span> vs 
                <span class="${blackClass}">${black.username} (${black.rating})</span>
            </p>
            <p>Resultado: ${white.result} - ${black.result}</p>
            <button onclick='selectGame("${encodedGame}")'>Selecionar</button>
        `;

        gameListDiv.appendChild(gameItem);
    });
}

let board = null;
let game = new Chess();
let moveIndex = 0;
let moves = [];

function selectGame(encodedGame) {
    const selectedGame = JSON.parse(decodeURIComponent(encodedGame));

    console.log("Partida selecionada:", selectedGame);

    // Carrega os movimentos do PGN
    game.load_pgn(selectedGame.pgn);

    // Obtém a lista de movimentos
    moves = game.history();
    moveIndex = 0;

    // Renderiza o tabuleiro inicial
    board = Chessboard('board', {
        draggable: false,
        position: 'start'
    });

    console.log("Movimentos carregados:", moves);
}

// Avança para o próximo movimento
function nextMove() {
    if (moveIndex < moves.length) {
        game.move(moves[moveIndex]);
        board.position(game.fen());
        moveIndex++;
    }
}

// Retrocede para o movimento anterior
function prevMove() {
    if (moveIndex > 0) {
        game.undo();
        board.position(game.fen());
        moveIndex--;
    }
}