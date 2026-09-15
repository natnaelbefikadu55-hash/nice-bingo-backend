const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
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

setInterval(() => {
  if (timer > 0) {
    timer--;
    io.emit('timer_update', { timer, jackpot });
  } else if (timer === 0) {
    timer = -1;
    startBingoDraw();
  }
}, 1000);

function startBingoDraw() {
  drawnNumbers = [];
  gameInterval = setInterval(() => {
    if (drawnNumbers.length < 75) {
      let nextNum;
      do {
        nextNum = Math.floor(Math.random() * 75) + 1;
      } while (drawnNumbers.includes(nextNum));

      drawnNumbers.push(nextNum);
      io.emit('number_drawn', { number: nextNum, history: drawnNumbers });
    } else {
      clearInterval(gameInterval);
      timer = 30;
    }
  }, 3000);
}

io.on('connection', (socket) => {
  socket.emit('init_state', { timer, jackpot, drawnNumbers });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Bingo Server running on port ${PORT}`);
});
