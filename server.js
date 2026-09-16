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

// 1. የቴሌግራም ቦት እና የአድሚን መረጃዎች
const BOT_TOKEN = '8968682397:AAHzaLWI-jsyf4e4l02njeGr_xUqlmgedok';
const ADMIN_CHAT_ID = '1921121534'; // የእርስዎ ቴሌግራም ID
const TELEBIRR_NUMBER = '0930488187'; // የእርስዎ Telebirr ቁጥር

const bot = new Telegraf(BOT_TOKEN);
const userBalances = {}; // የተጫዋቾች ቀሪ ሂሳብ መያዣ

// የላቁ ቁልፎች (Reply Keyboard)
const mainKeyboard = Markup.keyboard([
  [Markup.button.webApp('🎮 Play Now', 'https://natnael-befikadu.vercel.app/?v=1.1')],
  ['💰 Balance', '📥 Deposit'],
  ['📤 Withdraw', '🔗 Invite'],
  ['💎 VIP Room', '🌟 Special Promoter'],
  ['🆘 Support', '📜 Terms'],
  ['🎁 Rewards Hub']
]).resize();

bot.start((ctx) => {
  const userId = ctx.from.id;
  if (!userBalances[userId]) userBalances[userId] = 0;

  ctx.reply(`👋 Welcome back, ${ctx.from.first_name}!\n\nSystem online. Ready to win?`, mainKeyboard);
});

// 💰 Balance
bot.hears('💰 Balance', (ctx) => {
  const userId = ctx.from.id;
  const balance = userBalances[userId] || 0;
  ctx.reply(`💳 የእርስዎ ቀሪ ሂሳብ፦ ${balance} ETB`);
});

// 📥 Deposit መመሪያ
bot.hears('📥 Deposit', (ctx) => {
  ctx.reply(
    `📥 *ገንዘብ ገቢ ለማድረግ (Deposit)*\n\n` +
    `1. በ Telebirr ወደዚህ ቁጥር ብር ይላኩ፦ \`${TELEBIRR_NUMBER}\`\n` +
    `2. ብሩን ልከው ሲጨርሱ የላኩበትን **Transaction ID** ወይም **የስክሪንሾት ምስል** እዚህ ይላኩ።\n\n` +
    `ማረጋገጫው እንደደረሰን ሂሳብዎ ወዲያውኑ ይስተካከላል!`,
    { parse_mode: 'Markdown' }
  );
});

// 📤 Withdraw መመሪያ
bot.hears('📤 Withdraw', (ctx) => {
  const userId = ctx.from.id;
  const balance = userBalances[userId] || 0;
  ctx.reply(`📤 ገንዘብ ለማውጣት ያላችሁ ቀሪ ሂሳብ፦ ${balance} ETB\n\nለማውጣት የሚፈልጉትን መጠን እና የ Telebirr ቁጥርዎን ለ Support ይላኩ።`);
});

// የቪአይፒ እና ሰፖርት መልእክቶች
bot.hears('🆘 Support', (ctx) => ctx.reply('💬 ማንኛውንም ጥያቄ ለማቅረብ አድሚንን ያውሩ፦ @MamaNB30'));

bot.launch().then(() => console.log('Telegram Bot successfully started!')).catch(err => console.error(err));

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
