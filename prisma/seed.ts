import bcrypt from "bcrypt";
import "dotenv/config";
import { prisma } from "../src/utils/prisma-client";

const BCRYPT_ROUNDS = 10;
const DEFAULT_PASSWORD = "password123";

// Indonesian names for realistic seed data
const indonesianNames = [
  "Ahmad Fauzi",
  "Siti Nurhaliza",
  "Budi Santoso",
  "Dewi Lestari",
  "Andi Wijaya",
  "Rina Kusuma",
  "Hendra Gunawan",
  "Lina Marlina",
  "Rizki Pratama",
  "Maya Sari",
  "Doni Saputra",
  "Wati Suryani",
  "Eko Prasetyo",
  "Nina Agustina",
  "Faisal Rahman",
  "Sri Wahyuni",
  "Bambang Supriyanto",
  "Tuti Handayani",
  "Yanto Setiawan",
  "Lia Permata",
  "Agus Salim",
  "Fitri Rahmawati",
  "Dedi Kurniawan",
  "Rini Astuti",
  "Hadi Wijayanto",
  "Sari Puspita",
  "Irfan Hidayat",
  "Nadia Azhari",
  "Pandu Wicaksono",
  "Ayu Lestari",
  "Teguh Pramono",
  "Indah Safitri",
  "Wahyu Nugroho",
  "Eka Fitriani",
  "Reza Maulana",
  "Ani Susanti",
  "Joko Widodo",
  "Yuni Kartika",
  "Arif Budiman",
  "Sinta Dewi",
  "Dimas Pradipta",
  "Ratna Sari",
  "Fajar Ramadhan",
  "Lisa Andriani",
  "Ilham Saputra",
  "Vina Melati",
  "Bayu Aditya",
  "Citra Kirana",
  "Fikri Hakim",
  "Diana Putri",
  "Gilang Pratama",
  "Erna Susilowati",
  "Hakim Nugraha",
  "Fika Anggraini",
  "Iwan Setiawan",
  "Gita Savitri",
  "Jaya Kusuma",
  "Hana Pertiwi",
  "Khalid Basalamah",
  "Ika Damayanti",
  "Lukman Hakim",
  "Jasmine Villegas",
  "Made Wirawan",
  "Karina Salim",
  "Nurul Hidayah",
  "Lestari Wijaya",
  "Oscar Lawalata",
  "Mega Utami",
  "Putra Nababan",
  "Novi Amelia",
  "Qori Sandioriva",
  "Olivia Zalianty",
  "Rama Soeprapto",
  "Putri Ayudya",
  "Surya Saputra",
  "Rina Gunawan",
  "Taufik Hidayat",
  "Sarah Sechan",
];

async function main() {
  console.log("🌱 Starting database seed...");

  // Hash the default password
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

  // Create Class A
  console.log("📚 Creating Class A...");
  const classA = await prisma.class.create({
    data: {
      name: "A",
    },
  });

  // Create Class B
  console.log("📚 Creating Class B...");
  const classB = await prisma.class.create({
    data: {
      name: "B",
    },
  });

  // Create bendahara (shared treasurer for Class A)
  console.log("👤 Creating bendahara (Ridwan Alfarezi)...");
  const bendahara = await prisma.user.create({
    data: {
      nim: "1313699999",
      name: "Ridwan Alfarezi",
      email: "ridwan.alfarezi@galacash.com",
      password: hashedPassword,
      role: "bendahara",
      classId: classA.id,
    },
  });

  console.log(`✅ Bendahara created: ${bendahara.name} (NIM: ${bendahara.nim})`);

  // Create 40 students for Class A (NIM: 1313600001-1313600040)
  console.log("👥 Creating 40 students for Class A...");
  const studentsA = [];
  for (let i = 1; i <= 40; i++) {
    const nim = `13136${String(i).padStart(5, "0")}`;
    const name = indonesianNames[i - 1] || `Student ${i}`;

    const student = await prisma.user.create({
      data: {
        nim,
        name,
        password: hashedPassword,
        role: "user",
        classId: classA.id,
      },
    });

    studentsA.push(student);
  }

  console.log(`✅ Created ${studentsA.length} students for Class A`);

  // Create 40 students for Class B (NIM: 1313600041-1313600080)
  console.log("👥 Creating 40 students for Class B...");
  const studentsB = [];
  for (let i = 41; i <= 80; i++) {
    const nim = `13136${String(i).padStart(5, "0")}`;
    const name = indonesianNames[i - 1] || `Student ${i}`;

    const student = await prisma.user.create({
      data: {
        nim,
        name,
        password: hashedPassword,
        role: "user",
        classId: classB.id,
      },
    });

    studentsB.push(student);
  }

  console.log(`✅ Created ${studentsB.length} students for Class B`);

  // Summary
  console.log("\n📊 Seed Summary:");
  console.log("================");
  console.log(`Classes created: 2 (A, B)`);
  console.log(`Bendahara: 1 (Ridwan Alfarezi - NIM: 1313699999)`);
  console.log(`Students in Class A: ${studentsA.length} (NIM: 1313600001-1313600040)`);
  console.log(`Students in Class B: ${studentsB.length} (NIM: 1313600041-1313600080)`);
  console.log(`Total users: ${1 + studentsA.length + studentsB.length}`);
  console.log(`\nDefault password for all users: ${DEFAULT_PASSWORD}`);
  console.log("\n✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
