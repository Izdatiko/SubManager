import { Bot, InlineKeyboard, Context } from "grammy";
import dotenv from "dotenv";
import { prisma } from "./config/database.js";

// Extend context to include user
interface BotContext extends Context {
  user?: any;
}

// Load environment variables
dotenv.config();

// Create bot instance
const bot = new Bot<BotContext>(process.env.BOT_TOKEN!);

// Middleware to load user from database
bot.use(async (ctx, next) => {
  if (ctx.from) {
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(ctx.from.id) },
      update: {
        username: ctx.from.username || null,
        firstName: ctx.from.first_name || null,
        lastName: ctx.from.last_name || null,
      },
      create: {
        telegramId: BigInt(ctx.from.id),
        username: ctx.from.username || null,
        firstName: ctx.from.first_name || null,
        lastName: ctx.from.last_name || null,
      },
    });

    ctx.user = user;
  }
  await next();
});

// Функция для генерации кода комнаты
function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Функция для расчета суммы на участника
function calculateAmountPerUser(
  totalAmount: number,
  memberCount: number
): number {
  return Math.round((totalAmount / memberCount) * 100) / 100; // Округляем до 2 знаков
}

// Start command
bot.command("start", async (ctx) => {
  const user = ctx.user;
  await ctx.reply(
    `Привет, ${user.firstName || user.username || "пользователь"}! 👋\n\n` +
      `Добро пожаловать в бота управления совместными подписками! 🎉\n\n` +
      `Доступные команды:\n` +
      `/create_room - Создать комнату для совместной подписки\n` +
      `/join_room - Присоединиться к комнате по коду\n` +
      `/my_rooms - Мои комнаты\n` +
      `/help - Помощь`
  );
});

// Create room command
bot.command("create_room", async (ctx) => {
  await ctx.reply(
    "🏠 Создание новой комнаты\n\n" +
      "Отправьте данные в следующем формате:\n" +
      "Название подписки\n" +
      "Общая сумма в рублях\n" +
      "День оплаты (1-31)\n\n" +
      "Например:\n" +
      "Netflix Premium\n" +
      "599\n" +
      "15\n\n" +
      "💡 Сумма будет автоматически разделена между всеми участниками!"
  );
});

// Join room command
bot.command("join_room", async (ctx) => {
  await ctx.reply(
    "🔑 Присоединение к комнате\n\n" + "Отправьте код комнаты (6 символов)"
  );
});

// My rooms command
bot.command("my_rooms", async (ctx) => {
  const user = ctx.user;

  // Комнаты, созданные пользователем
  const createdRooms = await prisma.room.findMany({
    where: {
      creatorId: user.id,
      isActive: true,
    },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  // Комнаты, в которых пользователь участник
  const memberRooms = await prisma.roomMember.findMany({
    where: {
      userId: user.id,
      isActive: true,
    },
    include: {
      room: {
        include: {
          creator: true,
          members: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  let message = "🏠 Ваши комнаты:\n\n";

  if (createdRooms.length > 0) {
    message += "📝 Созданные вами:\n";
    createdRooms.forEach((room, index) => {
      const totalMembers = room.members.length + 1; // +1 для создателя
      const amountPerUser = calculateAmountPerUser(
        Number(room.totalAmount),
        totalMembers
      );

      message += `${index + 1}. **${room.name}**\n`;
      message += `   💰 Общая сумма: ${room.totalAmount} ${room.currency}\n`;
      message += `   👤 С каждого: ${amountPerUser} ${room.currency}\n`;
      message += `   📅 День оплаты: ${room.paymentDay}\n`;
      message += `   🔑 Код: \`${room.code}\`\n`;
      message += `   👥 Участников: ${totalMembers}\n\n`;
    });
  }

  if (memberRooms.length > 0) {
    message += "👥 Участие в комнатах:\n";
    memberRooms.forEach((member, index) => {
      const room = member.room;
      const totalMembers = room.members.length + 1; // +1 для создателя
      const amountPerUser = calculateAmountPerUser(
        Number(room.totalAmount),
        totalMembers
      );

      message += `${index + 1}. **${room.name}**\n`;
      message += `   💰 Общая сумма: ${room.totalAmount} ${room.currency}\n`;
      message += `   👤 С каждого: ${amountPerUser} ${room.currency}\n`;
      message += `   📅 День оплаты: ${room.paymentDay}\n`;
      message += `   👤 Создатель: ${
        room.creator.firstName || room.creator.username
      }\n\n`;
    });
  }

  if (createdRooms.length === 0 && memberRooms.length === 0) {
    message =
      "❌ У вас пока нет комнат\n\n" +
      "Создайте комнату командой /create_room или присоединитесь к существующей командой /join_room";
  }

  await ctx.reply(message, { parse_mode: "Markdown" });
});

// Help command
bot.command("help", async (ctx) => {
  await ctx.reply(
    `🆘 Помощь по командам:\n\n` +
      `/start - Начать работу с ботом\n` +
      `/create_room - Создать комнату для совместной подписки\n` +
      `/join_room - Присоединиться к комнате по коду\n` +
      `/my_rooms - Посмотреть мои комнаты\n` +
      `/help - Показать эту справку\n\n` +
      `Если у вас есть вопросы, обратитесь к администратору.`
  );
});

// Handle room creation
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  const user = ctx.user;

  // Проверяем, создается ли комната (3 строки)
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  if (lines.length === 3) {
    const [name, amountStr, paymentDayStr] = lines;
    const totalAmount = parseFloat(amountStr || "0");
    const paymentDay = parseInt(paymentDayStr || "1");

    if (
      isNaN(totalAmount) ||
      isNaN(paymentDay) ||
      paymentDay < 1 ||
      paymentDay > 31 ||
      totalAmount <= 0
    ) {
      await ctx.reply(
        "❌ Неверный формат данных. Сумма должна быть больше 0, день оплаты от 1 до 31."
      );
      return;
    }

    const roomCode = generateRoomCode();

    try {
      const room = await prisma.room.create({
        data: {
          code: roomCode,
          name: name || "Unnamed Room",
          totalAmount: totalAmount,
          currency: "RUB",
          paymentDay: paymentDay,
          creatorId: user.id,
        },
      });

      const amountPerUser = calculateAmountPerUser(totalAmount, 1); // Пока только создатель

      await ctx.reply(
        `✅ Комната создана!\n\n` +
          `📋 Название: ${room.name}\n` +
          `💰 Общая сумма: ${room.totalAmount} ${room.currency}\n` +
          `👤 С каждого: ${amountPerUser} ${room.currency}\n` +
          `📅 День оплаты: ${room.paymentDay}\n` +
          `🔑 Код комнаты: \`${room.code}\`\n\n` +
          `💡 Сумма будет пересчитана при добавлении участников!\n` +
          `Поделитесь этим кодом с друзьями!`,
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      await ctx.reply("❌ Ошибка при создании комнаты. Попробуйте еще раз.");
    }
    return;
  }

  // Проверяем, присоединяется ли пользователь к комнате (код комнаты)
  if (text.length === 6 && /^[A-Z0-9]+$/.test(text)) {
    try {
      const room = await prisma.room.findUnique({
        where: { code: text },
        include: {
          creator: true,
          members: true,
        },
      });

      if (!room) {
        await ctx.reply("❌ Комната с таким кодом не найдена");
        return;
      }

      if (!room.isActive) {
        await ctx.reply("❌ Эта комната неактивна");
        return;
      }

      // Проверяем, не является ли пользователь создателем
      if (room.creatorId === user.id) {
        await ctx.reply("❌ Вы уже являетесь создателем этой комнаты");
        return;
      }

      // Проверяем, не является ли пользователь уже участником
      const existingMember = room.members.find(
        (member) => member.userId === user.id
      );
      if (existingMember) {
        await ctx.reply("❌ Вы уже являетесь участником этой комнаты");
        return;
      }

      // Добавляем пользователя в комнату
      await prisma.roomMember.create({
        data: {
          userId: user.id,
          roomId: room.id,
        },
      });

      // Пересчитываем сумму на участника после добавления нового участника
      const totalMembers = room.members.length + 2; // +1 для создателя, +1 для нового участника
      const amountPerUser = calculateAmountPerUser(
        Number(room.totalAmount),
        totalMembers
      );

      await ctx.reply(
        `✅ Вы присоединились к комнате!\n\n` +
          `📋 Название: ${room.name}\n` +
          `💰 Общая сумма: ${room.totalAmount} ${room.currency}\n` +
          `👤 С каждого: ${amountPerUser} ${room.currency}\n` +
          `📅 День оплаты: ${room.paymentDay}\n` +
          `👤 Создатель: ${room.creator.firstName || room.creator.username}\n` +
          `👥 Участников: ${totalMembers}\n\n` +
          `Теперь вы будете получать уведомления о необходимости оплаты!`
      );

      // Уведомляем создателя комнаты
      await bot.api.sendMessage(
        room.creator.telegramId.toString(),
        `👥 Новый участник присоединился к комнате "${room.name}"!\n\n` +
          `👤 Пользователь: ${
            user.firstName || user.username || "Неизвестно"
          }\n` +
          `📊 Теперь в комнате ${totalMembers} участников\n` +
          `💰 С каждого: ${amountPerUser} ${room.currency}`
      );
    } catch (error) {
      await ctx.reply(
        "❌ Ошибка при присоединении к комнате. Попробуйте еще раз."
      );
    }
    return;
  }
});

// Error handling
bot.catch((err) => {
  console.error("Bot error:", err);
});

// Start the bot
async function startBot() {
  try {
    console.log("🤖 Starting bot...");
    await bot.start();
    console.log("✅ Bot started successfully!");
  } catch (error) {
    console.error("❌ Failed to start bot:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down bot...");
  await bot.stop();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🛑 Shutting down bot...");
  await bot.stop();
  await prisma.$disconnect();
  process.exit(0);
});

// Start the bot
startBot();
