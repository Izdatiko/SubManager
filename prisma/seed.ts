import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Функция для генерации случайного кода комнаты
function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  console.log("🌱 Seeding database...");

  // Создаем тестовых пользователей
  const user1 = await prisma.user.upsert({
    where: { telegramId: BigInt(123456789) },
    update: {},
    create: {
      telegramId: BigInt(123456789),
      username: "test_user_1",
      firstName: "Тестовый",
      lastName: "Пользователь 1",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { telegramId: BigInt(987654321) },
    update: {},
    create: {
      telegramId: BigInt(987654321),
      username: "test_user_2",
      firstName: "Тестовый",
      lastName: "Пользователь 2",
    },
  });

  console.log("✅ Test users created:", { user1, user2 });

  // Создаем тестовую комнату
  const roomCode = generateRoomCode();
  const testRoom = await prisma.room.create({
    data: {
      code: roomCode,
      name: "Netflix Premium",
      description: "Совместная подписка на Netflix Premium",
      totalAmount: 599.0, // Общая сумма подписки
      currency: "RUB",
      paymentDay: 15, // 15 число каждого месяца
      creatorId: user1.id,
    },
  });

  // Добавляем второго пользователя в комнату
  await prisma.roomMember.create({
    data: {
      userId: user2.id,
      roomId: testRoom.id,
    },
  });

  console.log("✅ Test room created:", {
    room: testRoom,
    code: roomCode,
  });

  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
