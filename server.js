const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let timer = 30;
let jackpot = 1000;
let drawnNumbers = [];
let gameInterval = null;
let isGameRunning = false;

function startNewGame() {
  timer = 30;
  drawnNumbers = [];
  isGameRunning = false;
  
  io.emit('game_reset', { message: "አዲስ ጨዋታ ሊጀምር ነው!" });

  const countInterval = setInterval(() => {
    timer--;
    io.emit('timer_update', { timer, jackpot });

    if (timer <= 0) {
      clearInterval(countInterval);
      startGameLoop();
    }
  }, 1000);
}

function startGameLoop() {
  isGameRunning = true;
  let allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
  // Shuffle numbers
  allNumbers.sort(() => Math.random() - 0.5);

  gameInterval = setInterval(() => {
    if (allNumbers.length === 0 || !isGameRunning) {
      clearInterval(gameInterval);
      io.emit('game_over', { message: "ጨዋታው ተጠናቋል!" });
      setTimeout(startNewGame, 5000); // 5 ሰከንድ ቆይቶ አዲስ ጨዋታ ይጀምራል
      return;
    }

    const nextNum = allNumbers.pop();
    drawnNumbers.push(nextNum);

    io.emit('number_drawn', {
      number: nextNum,
      history: drawnNumbers
    });

  }, 3000); // በየ 3 ሰከንዱ ቁጥር ያወጣል
}

io.on('connection', (socket) => {
  socket.emit('init_state', { timer, jackpot, drawnNumbers });

  // ተጫዋች BINGO ሲል
  socket.on('claim_bingo', (data) => {
    if (isGameRunning) {
      isGameRunning = false;
      clearInterval(gameInterval);
      
      io.emit('bingo_announced', {
        winner: socket.id,
        cardId: data.cardId,
        message: `🎉 BINGO! ካርቴላ #${data.cardId} አሸንፏል!`
      });

      setTimeout(startNewGame, 7000); // ከ7 ሰከንድ በኋላ አዲስ ጨዋታ ያስጀምራል
    }
  });
});

startNewGame();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
