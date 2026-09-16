const { Telegraf, Markup } = require('telegraf');

// የሰጡትን Bot Token እዚህ ገብቷል
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

bot.launch();
console.log('Bot is running...');
