import express, { Request, Response } from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { spawn } from "child_process"; // 🔹 Para rodar Stockfish

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV === "development";

// 🔹 Caminho do executável do Stockfish
const STOCKFISH_PATH = path.join(__dirname, "server", "bin", "stockfish.exe"); // 🛑 Ajuste se necessário

// 🔹 Configurações globais para evitar cache
app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
});

app.use(cors());
app.use(express.json());

// 🔹 Servir o frontend estático
const clientPath = path.join(__dirname, "client");
app.use(express.static(clientPath));

// 🔹 Rota para retornar a página inicial do frontend
app.get("/", (req: Request, res: Response) => {
    res.sendFile(path.join(clientPath, "index.html"));
});

// 🔹 Rota para buscar partidas de um usuário no Chess.com
app.get("/chesscom-games", async (req: Request, res: Response) => {
    const { username } = req.query;

    if (!username || typeof username !== "string") {
        res.status(400).json({ error: "Username é obrigatório" });
        return;
    }

    try {
        const archivesUrl = `https://api.chess.com/pub/player/${username}/games/archives?nocache=${Date.now()}`;
        const archivesResponse = await fetch(archivesUrl, {
            method: "GET",
            headers: { "Cache-Control": "no-cache" }
        });

        if (!archivesResponse.ok) {
            throw new Error(`Erro ao buscar arquivos: ${archivesResponse.status}`);
        }

        const data = await archivesResponse.json();
        if (!data.archives || data.archives.length === 0) {
            res.status(404).json({ error: "Usuário não encontrado ou sem partidas" });
            return;
        }

        const latestArchive = `${data.archives[data.archives.length - 1]}?nocache=${Date.now()}`;
        const latestGamesResponse = await fetch(latestArchive, {
            method: "GET",
            headers: { "Cache-Control": "no-cache" }
        });

        const latestGames = await latestGamesResponse.json();
        res.json(latestGames.games);
    } catch (error) {
        console.error("Erro ao buscar dados do Chess.com:", error);
        res.status(500).json({ error: "Erro ao buscar dados do Chess.com" });
    }
});

// 🔹 Rota para buscar uma partida específica
app.get("/chesscom-game", async (req: Request, res: Response) => {
    const { username, gameIndex } = req.query;

    if (!username || typeof username !== "string" || gameIndex === undefined) {
        res.status(400).json({ error: "Username e índice da partida são obrigatórios" });
        return;
    }

    try {
        const archivesUrl = `https://api.chess.com/pub/player/${username}/games/archives?nocache=${Date.now()}`;
        const archivesResponse = await fetch(archivesUrl, {
            method: "GET",
            headers: { "Cache-Control": "no-cache" }
        });

        if (!archivesResponse.ok) {
            throw new Error(`Erro ao buscar arquivos: ${archivesResponse.status}`);
        }

        const data = await archivesResponse.json();
        if (!data.archives || data.archives.length === 0) {
            res.status(404).json({ error: "Usuário não encontrado ou sem partidas" });
            return;
        }

        const latestArchive = `${data.archives[data.archives.length - 1]}?nocache=${Date.now()}`;
        const latestGamesResponse = await fetch(latestArchive, {
            method: "GET",
            headers: { "Cache-Control": "no-cache" }
        });

        const latestGames = await latestGamesResponse.json();
        const selectedGame = latestGames.games[parseInt(gameIndex as string)];

        if (!selectedGame) {
            res.status(404).json({ error: "Partida não encontrada" });
            return;
        }

        res.json(selectedGame);
    } catch (error) {
        console.error("Erro ao buscar partida:", error);
        res.status(500).json({ error: "Erro ao buscar partida" });
    }
});

// 🔹 Função para analisar um movimento usando Stockfish
function analyzeMove(fen: string, callback: (analysis: string) => void) {
    const engine = spawn(STOCKFISH_PATH);

    let analysisResult = "";

    engine.stdout.on("data", (data) => {
        const message = data.toString();

        if (message.includes("bestmove")) {
            analysisResult = message;
            engine.kill();
            callback(analysisResult);
        }
    });

    engine.stdin.write("uci\n");
    engine.stdin.write(`position fen ${fen}\n`);
    engine.stdin.write("go depth 15\n");
}

// 🔹 Rota para análise de jogadas usando Stockfish
app.post("/analyze-move", async (req: Request, res: Response) => {
    const { fen } = req.body;

    if (!fen) {
        res.status(400).json({ error: "FEN da posição é obrigatória" });
        return 
    }

    analyzeMove(fen, (analysis) => {
        res.json({ analysis });
    });
});

// 🔹 Iniciar o servidor
const baseURL = isDev ? `http://localhost:${PORT}` : process.env.PROD_URL || "https://seuservidor.com";
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando em ${baseURL}`);
});
