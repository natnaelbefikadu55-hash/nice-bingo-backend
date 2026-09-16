const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Telegraf, Markup } = require('telegraf');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// 1. የቴሌግራም ቦት ማዋቀር
const bot = new Telegraf('8968682397:AAHzaLWI-jsyf4e4l02njeGr_xUqlmgedok');

bot.start((ctx) => {
  const firstName = ctx.from.first_name || 'ተጫዋች';

  ctx.reply(`👋 Welcome back, ${firstName}!\n\nSystem online. Ready to win?`, 
    Markup.keyboard([
      [Markup.button.webApp('🎮 Play Now', 'https://natnael-befikadu.vercel.app/?v=1.1')],
      ['💰 Balance', '📥 Deposit'],
      ['📤 Withdraw', '🔗 Invite'],
      ['💎 VIP Room', '🌟 Special Promoter'],
      ['🆘 Support', '📜 Terms'],
      ['🎁 Rewards Hub']
    ]).resize()
  );
});

bot.launch().then(() => {
  console.log('Telegram Bot successfully started!');
}).catch((err) => {
  console.error('Bot Launch Error:', err);
});

// 2. የቢንጎ ጨዋታ ሎጅክ (Backend Loop)
let timer = 30;
let jackpot = 1000;
let drawnNumbers = [];
let gameInterval = null;
let timerInterval = null;
let isGameRunning = false;

function startTimer() {
  if (gameInterval) clearInterval(gameInterval);
  if (timerInterval) clearInterval(timerInterval);

  timer = 30;
  drawnNumbers = [];
  isGameRunning = false;

  io.emit('game_reset', { message: "አዲስ ጨዋታ ሊጀምር ነው!" });

  timerInterval = setInterval(() => {
    timer--;
    io.emit('timer_update', { timer, jackpot, isGameRunning: false });

    if (timer <= 0) {
      clearInterval(timerInterval);
      startGame();
    }
  }, 1000);
}

function startGame() {
  isGameRunning = true;
  let allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
  allNumbers.sort(() => Math.random() - 0.5);

  gameInterval = setInterval(() => {
    if (allNumbers.length === 0 || !isGameRunning) {
      clearInterval(gameInterval);
      isGameRunning = false;
      io.emit('game_over', { message: "ጨዋታው ተጠናቋል! አዲስ ጨዋታ ይጀምራል..." });
      
      setTimeout(startTimer, 5000);
      return;
    }

    const nextNum = allNumbers.pop();
    drawnNumbers.push(nextNum);

    io.emit('number_drawn', {
      number: nextNum,
      history: drawnNumbers,
      isGameRunning: true
    });

  }, 2000);
}

io.on('connection', (socket) => {
  socket.emit('init_state', { timer, jackpot, drawnNumbers, isGameRunning });

  socket.on('claim_bingo', (data) => {
    if (isGameRunning) {
      isGameRunning = false;
      if (gameInterval) clearInterval(gameInterval);

      io.emit('bingo_announced', {
        winner: socket.id,
        cardId: data.cardId,
        message: `🎉 BINGO! ካርቴላ #${data.cardId} አሸንፏል!`
      });

      setTimeout(startTimer, 6000);
    }
  });
});

startTimer();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
