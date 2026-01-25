import bcrypt from "bcrypt";
import "dotenv/config";
import { prisma } from "../src/utils/prisma-client";

const BCRYPT_ROUNDS = 10;
const DEFAULT_PASSWORD = "12345678";

// Real student data provided by user
const classAStudents = [
  { name: "DEVIA ARITONDI NATALSYA", nim: "1313624001" },
  { name: "HAMIM MUMTAZ RAMADHAN LALENO", nim: "1313624002" },
  { name: "NAZWA SYALSA DAVIRA", nim: "1313624003" },
  { name: "FARIS MAULANA AL BA I", nim: "1313624004" },
  { name: "MUTIA PUTRI ASSYIFA", nim: "1313624005" },
  { name: "SALSABILA", nim: "1313624006" },
  { name: "RICKY DARMAWAN", nim: "1313624007" },
  { name: "FUJIONO NUR IKHSAN", nim: "1313624008" },
  { name: "NADINE ALYSHA MAHESWARI", nim: "1313624009" },
  { name: "SUKARNO ADI PRASETYO", nim: "1313624010" },
  { name: "ERNANDO FEBRIAN", nim: "1313624021" },
  { name: "FAZLI MAWLA DIAPARI", nim: "1313624022" },
  { name: "CANDRA AFRIANSYAH", nim: "1313624023" },
  { name: "RAFA CALLYSTA ARRAISSA", nim: "1313624024" },
  { name: "MUHAMMAD DAFFA RAMDHANI", nim: "1313624025" },
  { name: "PATRICK JULIAN RUSLI", nim: "1313624026" },
  { name: "DHIMAS EKA PUTRA", nim: "1313624027" },
  { name: "DANIEL TADEO EVANTIYASA", nim: "1313624028" },
  { name: "MUHAMMAD AERLANGGA", nim: "1313624029" },
  { name: "NANDANA AMMAR TRIABIMANYU", nim: "1313624030" },
  { name: "LEONARD DWI CHRISDIASA", nim: "1313624031" },
  { name: "AUFA LEVINA HAPSARI", nim: "1313624032" },
  { name: "DIAJENG KARIMA SADIDA", nim: "1313624033" },
  { name: "NUGRAHA BAGYA", nim: "1313624034" },
  { name: "AQILAH ANDRA AMAGASAKI", nim: "1313624035" },
  { name: "MICHAEL RENATTO ZITHA SETIAWAN", nim: "1313624036" },
  { name: "MUHAMMAD FABIO USAMA", nim: "1313624054" },
  { name: "IBRAHIM FARIS MAHARDIKA", nim: "1313624055" },
  { name: "FATHYA KHAIRANI R", nim: "1313624056" },
  { name: "JODI", nim: "1313624057" },
  { name: "MUHAMMAD YASYFI ALHAFIZH", nim: "1313624058" },
  { name: "ADE AZHAR FIRDAUS", nim: "1313624059" },
  { name: "SEAN MARSHEL BUDYANA", nim: "1313624060" },
  { name: "ABDUL HAKIM FERDIYANTO", nim: "1313624061" },
  { name: "ANINDYA KAILA PREMONO", nim: "1313624062" },
  { name: "ADRI LORENZO PATIARAJA", nim: "1313624063" },
  { name: "FAZA SULTHAN HAFIYYAN", nim: "1313624064" },
  { name: "SAYYIED RIDHO ARHAMI", nim: "1313624065" },
  { name: "RIZKY RAFFANDY HALIM", nim: "1313624067" },
  { name: "MOHAMMAD ZACKY NAUVAL", nim: "1313624068" },
];

const classBStudents = [
  { name: "HAVIZ FACHRIAN ALBAR", nim: "1313624011" },
  { name: "NASYWA ZAHRA ZETTIRA", nim: "1313624013" },
  { name: "MUHAMMAD RINGAN PRIYOGA", nim: "1313624014" },
  { name: "REVIANSYAH GUNARYA ISMA", nim: "1313624015" },
  { name: "DAMAR RAYYAN PRAMONO", nim: "1313624016" },
  { name: "KHAIRUL AKMAL", nim: "1313624017" },
  { name: "FARDAN SAKHA ARDHIKA", nim: "1313624018" },
  { name: "MUHAMMAD PRADIPTA ARYA ANINDITA", nim: "1313624019" },
  { name: "RIDWAN ALFAREZI", nim: "1313624020" },
  { name: "AHMAD HANIF NAUFAL JAMIL", nim: "1313624037" },
  { name: "ANANDA GIWANK ABHINAYA", nim: "1313624038" },
  { name: "FIKRI AHMAD ARSALAN", nim: "1313624039" },
  { name: "MUHAMMAD AZFA HERMAWAN", nim: "1313624040" },
  { name: "FAIZ RIFAT PRADITAMA", nim: "1313624041" },
  { name: "AHMAD", nim: "1313624042" },
  { name: "MUHAMMAD", nim: "1313624043" },
  { name: "RIZA ARYADWITO", nim: "1313624044" },
  { name: "RAMA ADITYA SAPUTRA", nim: "1313624045" },
  { name: "ALIEF FADILLAH NUR RACHMAN", nim: "1313624046" },
  { name: "DUTA SETYAWAN", nim: "1313624047" },
  { name: "KEMAL DERMAWAN", nim: "1313624048" },
  { name: "BAHTIAR RIFAI KHUMAIDI", nim: "1313624049" },
  { name: "RAFIANDRA DIRGA MEAZZA", nim: "1313624050" },
  { name: "RAFLY RABBANY ZALFA PATEDA", nim: "1313624051" },
  { name: "RIZKY WULAN PURNAMASARI", nim: "1313624052" },
  { name: "DAYU AJI PRIAWAN", nim: "1313624053" },
  { name: "ANDRA ALDOVIAN SYARIEF", nim: "1313624069" },
  { name: "IR KURNIA", nim: "1313624070" },
  { name: "TRYSTAN PRASTANOV GABRIEL", nim: "1313624071" },
  { name: "RAFI RUZAIN RABA", nim: "1313624072" },
  { name: "GENOVERRE ABRAHAM ESTHEREDITH WOWOR", nim: "1313624073" },
  { name: "ALI URAIDY", nim: "1313624074" },
  { name: "NAYLA ZAHRA", nim: "1313624075" },
  { name: "MUHAMMAD DHEKI AKBAR", nim: "1313624076" },
  { name: "MUHAMMAD NAUFAL AULIA", nim: "1313624077" },
  { name: "BARA JUANG INDONESIANO", nim: "1313624078" },
  { name: "CAREAL ALIF MAFAZI", nim: "1313624079" },
  { name: "ILHAM DWIKY ARDIANSYAH", nim: "1313624080" },
  { name: "GIDEON MIRACLE SIHOMBING", nim: "1313624081" },
  { name: "SYAUQI RAFLY RAMADHAN", nim: "1313624082" },
  { name: "AGUNG AGRO PRAWIRO", nim: "1313624083" },
  { name: "FATAH ADILIANSYAH", nim: "1313624084" },
  { name: "AYUB TRI SUBIYANTO", nim: "1313624085" },
];

async function main() {
  console.log("🌱 Starting database seed...");

  // Hash the default password
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

  // Create Classes
  console.log("📚 Creating Classes...");
  const classA = await prisma.class.create({
    data: { name: "A" },
  });

  const classB = await prisma.class.create({
    data: { name: "B" },
  });

  // Create bendahara (Fatya Khairani R)
  // Maintains separate treasurer account as per request
  console.log("👤 Creating bendahara (Fatya Khairani R)...");
  const bendahara = await prisma.user.create({
    data: {
      nim: "1313624000",
      name: "Fatya Khairani R",
      email: null,
      password: hashedPassword,
      role: "bendahara",
      classId: classA.id,
    },
  });
  console.log(`✅ Bendahara created: ${bendahara.name} (NIM: ${bendahara.nim})`);

  // Create Students for Class A
  console.log(`👥 Creating ${classAStudents.length} students for Class A...`);
  for (const s of classAStudents) {
    await prisma.user.create({
      data: {
        nim: s.nim,
        name: s.name,
        password: hashedPassword,
        role: "user",
        classId: classA.id,
      },
    });
  }

  // Create Students for Class B
  console.log(`👥 Creating ${classBStudents.length} students for Class B...`);
  for (const s of classBStudents) {
    await prisma.user.create({
      data: {
        nim: s.nim,
        name: s.name,
        password: hashedPassword,
        role: "user",
        classId: classB.id,
      },
    });
  }

  // Summary
  console.log("\n📊 Seed Summary:");
  console.log("================");
  console.log(`Classes created: 2 (A, B)`);
  console.log(`Bendahara: 1 (Fatya Khairani R - NIM: 1313624000)`);
  console.log(`Students Class A: ${classAStudents.length}`);
  console.log(`Students Class B: ${classBStudents.length}`);
  console.log(`Total users: ${1 + classAStudents.length + classBStudents.length}`);
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
