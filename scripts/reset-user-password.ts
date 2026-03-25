import 'dotenv/config';

// Use dynamic import to avoid module resolution issues
const { prisma } = await import('../src/utils/prisma-client.ts');

const nim = process.argv[2];
const newPassword = process.argv[3];

if (!nim || !newPassword) {
  console.error('Usage: bun scripts/reset-user-password.ts <nim> <newPassword>');
  process.exit(1);
}

try {
  const existingUser = await prisma.user.findUnique({
    where: { nim },
    select: { id: true, nim: true },
  });

  if (!existingUser) {
    console.error(`User with NIM ${nim} not found`);
    process.exit(2);
  }

  const hashedPassword = await Bun.password.hash(newPassword, {
    algorithm: 'bcrypt',
    cost: 10,
  });

  const updatedUser = await prisma.user.update({
    where: { nim },
    data: { password: hashedPassword },
    select: {
      id: true,
      nim: true,
      updatedAt: true,
      password: true,
    },
  });

  const hashVerified = await Bun.password.verify(newPassword, updatedUser.password);

  console.log(
    JSON.stringify(
      {
        status: 'updated',
        nim: updatedUser.nim,
        id: updatedUser.id,
        updatedAt: updatedUser.updatedAt,
        hashVerified,
      },
      null,
      2
    )
  );
} finally {
  await prisma.$disconnect();
}
