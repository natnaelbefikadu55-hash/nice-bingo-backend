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
let timerInterval = null;
let isGameRunning = false;

function startNewGame() {
  // ነባር ክፍለ-ጊዜዎችን (Intervals) ማጽዳት
  if (gameInterval) clearInterval(gameInterval);
  if (timerInterval) clearInterval(timerInterval);

  timer = 30;
  drawnNumbers = [];
  isGameRunning = false;

  io.emit('game_reset', { message: "አዲስ ጨዋታ ሊጀምር ነው!" });

  timerInterval = setInterval(() => {
    timer--;
    io.emit('timer_update', { timer, jackpot });

    if (timer <= 0) {
      clearInterval(timerInterval);
      startGameLoop();
    }
  }, 1000);
}

function startGameLoop() {
  isGameRunning = true;
  let allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
  // ቁጥሮቹን በዘፈቀደ ማዋሃድ (Shuffle)
  allNumbers.sort(() => Math.random() - 0.5);

  gameInterval = setInterval(() => {
    if (allNumbers.length === 0 || !isGameRunning) {
      clearInterval(gameInterval);
      isGameRunning = false;
      io.emit('game_over', { message: "ጨዋታው ተጠናቋል!" });
      setTimeout(startNewGame, 5000); // ከ 5 ሰከንድ በኋላ አዲስ ዙር ይጀምራል
      return;
    }

    const nextNum = allNumbers.pop();
    drawnNumbers.push(nextNum);

    io.emit('number_drawn', {
      number: nextNum,
      history: drawnNumbers
    });

  }, 2500); // በየ 2.5 ሰከንዱ ቁጥር ያወጣል
}

io.on('connection', (socket) => {
  socket.emit('init_state', { timer, jackpot, drawnNumbers, isGameRunning });

  // ተጫዋች BINGO ሲል
  socket.on('claim_bingo', (data) => {
    if (isGameRunning) {
      isGameRunning = false;
      if (gameInterval) clearInterval(gameInterval);
      
      io.emit('bingo_announced', {
        winner: socket.id,
        cardId: data.cardId,
        message: `🎉 BINGO! ካርቴላ #${data.cardId} አሸንፏል!`
      });

      setTimeout(startNewGame, 6000); // ከ 6 ሰከንድ በኋላ አዲስ ጨዋታ ያስጀምራል
    }
  });
});

startNewGame();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
