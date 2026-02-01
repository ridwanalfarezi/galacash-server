/**
 * Seed Past Cash Bills Script
 * Creates CashBill and Transaction records for past periods:
 * - Sep - Dec 2024
 * - Mar - June 2025
 * - Sep - Dec 2025
 *
 * Generates both:
 * 1. PAID bills (sudah_dibayar) - with Transaction records (income)
 * 2. UNPAID bills (belum_dibayar) - without payment details
 *
 * Usage:
 *   bun run seed:past-bills
 */

import "dotenv/config";

// Use dynamic import to avoid module resolution issues
const { prisma } = await import("../src/utils/prisma-client.ts");

// Map student names to NIMs
const nameToNimMap: Record<string, string> = {
  "DEVIA ARITONDI NATALSYA": "1313624001",
  "HAMIM MUMTAZ RAMADHAN LALENO": "1313624002",
  "NAZWA SYALSA DAVIRA": "1313624003",
  "FARIS MAULANA AL BA I": "1313624004",
  "MUTIA PUTRI ASSYIFA": "1313624005",
  SALSABILA: "1313624006",
  "RICKY DARMAWAN": "1313624007",
  "FUJIONO NUR IKHSAN": "1313624008",
  "NADINE ALYSHA MAHESWARI": "1313624009",
  "SUKARNO ADI PRASETYO": "1313624010",
  "ERNANDO FEBRIAN": "1313624021",
  "FAZLI MAWLA DIAPARI": "1313624022",
  "CANDRA AFRIANSYAH": "1313624023",
  "RAFA CALLYSTA ARRAISSA": "1313624024",
  "MUHAMMAD DAFFA RAMDHANI": "1313624025",
  "PATRICK JULIAN RUSLI": "1313624026",
  "DHIMAS EKA PUTRA": "1313624027",
  "DANIEL TADEO EVANTIYASA": "1313624028",
  "MUHAMMAD AERLANGGA": "1313624029",
  "NANDANA AMMAR TRIABIMANYU": "1313624030",
  "LEONARD DWI CHRISDIASA": "1313624031",
  "AUFA LEVINA HAPSARI": "1313624032",
  "DIAJENG KARIMA SADIDA": "1313624033",
  "NUGRAHA BAGYA": "1313624034",
  "AQILAH ANDRA AMAGASAKI": "1313624035",
  "MICHAEL RENATTO ZITHA SETIAWAN": "1313624036",
  "MUHAMMAD FABIO USAMA": "1313624054",
  "IBRAHIM FARIS MAHARDIKA": "1313624055",
  "FATHYA KHAIRANI R": "1313624056",
  JODI: "1313624057",
  "MUHAMMAD YASYFI ALHAFIZH": "1313624058",
  "ADE AZHAR FIRDAUS": "1313624059",
  "SEAN MARSHEL BUDYANA": "1313624060",
  "ABDUL HAKIM FERDIYANTO": "1313624061",
  "ANINDYA KAILA PREMONO": "1313624062",
  "ADRI LORENZO PATIARAJA": "1313624063",
  "FAZA SULTHAN HAFIYYAN": "1313624064",
  "SAYYIED RIDHO ARHAMI": "1313624065",
  "AXELO ANDRIAN VALENTINO": "1313624066",
  "RIZKY RAFFANDY HALIM": "1313624067",
  "MOHAMMAD ZACKY NAUVAL": "1313624068",
  "HAVIZ FACHRIAN ALBAR": "1313624011",
  "NASYWA ZAHRA ZETTIRA": "1313624013",
  "MUHAMMAD RINGAN PRAYOGA": "1313624014",
  "REVIANSYAH GUNARYA ISMA": "1313624015",
  "DAMAR RAYYAN PRAMONO": "1313624016",
  "KHAIRUL AKMAL": "1313624017",
  "FARDAN SAKHA ARDHIKA": "1313624018",
  "MUHAMMAD PRADIPTA ARYA ANINDITA": "1313624019",
  "RIDWAN ALFAREZI": "1313624020",
  "AHMAD HANIF NAUFAL JAMIL": "1313624037",
  "ANANDA GIWANK ABHINAYA": "1313624038",
  "FIKRI AHMAD ARSALAN": "1313624039",
  "MUHAMMAD AZFA HERMAWAN": "1313624040",
  "FAIZ RIFAT PRADITAMA": "1313624041",
  AHMAD: "1313624042",
  MUHAMMAD: "1313624043",
  "RIZA ARYADWITO": "1313624044",
  "RAMA ADITTYA SAPUTRA": "1313624045",
  "ALIEF FADHILLAH NUR RACHMAN": "1313624046",
  "DUTA SETYAWAN": "1313624047",
  "KEMAL DERMAWAN": "1313624048",
  "BAHTIAR RIFAI KHUMAIDI": "1313624049",
  "RAFIANDRA DIRGA MEAZZA": "1313624050",
  "RAFLY RABBANI ZALFA PATEDA": "1313624051",
  "RIZKY WULAN PURNAMASARI": "1313624052",
  "DAYU AJI PRIAWAN": "1313624053",
  "ANDRA ALDOVIAN SYARIEF": "1313624069",
  "IR KURNIA": "1313624070",
  "TRYSTAN PRASTANOV GABRIEL": "1313624071",
  "RAFI RUZAIN RABA": "1313624072",
  "GENOVERRE ABRAHAM ESTHEREDITH WOWOR": "1313624073",
  "ALI URAIDY": "1313624074",
  "NAYLA ZAHRA": "1313624075",
  "MUHAMMAD DHEKI AKBAR": "1313624076",
  "MUHAMMAD NAUFAL AULIA": "1313624077",
  "BARA JUANG INDONESIANO": "1313624078",
  "CAREAL ALIF MAFAZI": "1313624079",
  "ILHAM DWIKY ARDIANSYAH": "1313624080",
  "GIDEON MIRACLE SIHOMBING": "1313624081",
  "SYAUQI RAFLY RAMADHAN": "1313624082",
  "AGUNG AGRO PRAWIRO": "1313624083",
  "AYUB TRI SUBIYANTO": "1313624085",
  "FATAH ADILIANSYAH": "1313624084",
};

// Data structure for cash bill payments
interface PaymentRecord {
  name: string;
  sept2024?: boolean;
  okt2024?: boolean;
  nov2024?: boolean;
  des2024?: boolean;
  mar2025?: boolean;
  apr2025?: boolean;
  mei2025?: boolean;
  juni2025?: boolean;
  sept2025?: boolean;
  okt2025?: boolean;
  nov2025?: boolean;
  des2025?: boolean;
}

// Sep - Dec 2024 data (all marked "Done")
const data2024: PaymentRecord[] = [
  { name: "DEVIA ARITONDI NATALSYA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  {
    name: "HAMIM MUMTAZ RAMADHAN LALENO",
    sept2024: true,
    okt2024: true,
    nov2024: true,
    des2024: true,
  },
  { name: "NAZWA SYALSA DAVIRA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "FARIS MAULANA AL BA I", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "MUTIA PUTRI ASSYIFA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "SALSABILA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "RICKY DARMAWAN", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "FUJIONO NUR IKHSAN", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "NADINE ALYSHA MAHESWARI", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "SUKARNO ADI PRASETYO", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "ERNANDO FEBRIAN", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "FAZLI MAWLA DIAPARI", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "CANDRA AFRIANSYAH", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "RAFA CALLYSTA ARRAISSA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "MUHAMMAD DAFFA RAMDHANI", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "PATRICK JULIAN RUSLI", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "DHIMAS EKA PUTRA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "DANIEL TADEO EVANTIYASA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "MUHAMMAD AERLANGGA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  {
    name: "NANDANA AMMAR TRIABIMANYU",
    sept2024: true,
    okt2024: true,
    nov2024: true,
    des2024: true,
  },
  { name: "LEONARD DWI CHRISDIASA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "AUFA LEVINA HAPSARI", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "DIAJENG KARIMA SADIDA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "NUGRAHA BAGYA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "AQILAH ANDRA AMAGASAKI", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  {
    name: "MICHAEL RENATTO ZITHA SETIAWAN",
    sept2024: true,
    okt2024: true,
    nov2024: true,
    des2024: true,
  },
  { name: "MUHAMMAD FABIO USAMA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "IBRAHIM FARIS MAHARDIKA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "FATHYA KHAIRANI R", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "JODI", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "MUHAMMAD YASYFI ALHAFIZH", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "ADE AZHAR FIRDAUS", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "SEAN MARSHEL BUDYANA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "ABDUL HAKIM FERDIYANTO", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "ANINDYA KAILA PREMONO", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "ADRI LORENZO PATIARAJA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "FAZA SULTHAN HAFIYYAN", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "SAYYIED RIDHO ARHAMI", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "AXELO ANDRIAN VALENTINO", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "RIZKY RAFFANDY HALIM", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "MOHAMMAD ZACKY NAUVAL", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "HAVIZ FACHRIAN ALBAR", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "NASYWA ZAHRA ZETTIRA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "MUHAMMAD RINGAN PRAYOGA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "REVIANSYAH GUNARYA ISMA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "DAMAR RAYYAN PRAMONO", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "KHAIRUL AKMAL", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "FARDAN SAKHA ARDHIKA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  {
    name: "MUHAMMAD PRADIPTA ARYA ANINDITA",
    sept2024: true,
    okt2024: true,
    nov2024: true,
    des2024: true,
  },
  { name: "RIDWAN ALFAREZI", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "AHMAD HANIF NAUFAL JAMIL", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "ANANDA GIWANK ABHINAYA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "FIKRI AHMAD ARSALAN", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "MUHAMMAD AZFA HERMAWAN", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "FAIZ RIFAT PRADITAMA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "AHMAD", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "MUHAMMAD", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "RIZA ARYADWITO", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "RAMA ADITTYA SAPUTRA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  {
    name: "ALIEF FADHILLAH NUR RACHMAN",
    sept2024: true,
    okt2024: true,
    nov2024: true,
    des2024: true,
  },
  { name: "DUTA SETYAWAN", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "KEMAL DERMAWAN", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "BAHTIAR RIFAI KHUMAIDI", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "RAFIANDRA DIRGA MEAZZA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  {
    name: "RAFLY RABBANI ZALFA PATEDA",
    sept2024: true,
    okt2024: true,
    nov2024: true,
    des2024: true,
  },
  { name: "RIZKY WULAN PURNAMASARI", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "DAYU AJI PRIAWAN", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "ANDRA ALDOVIAN SYARIEF", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "IR KURNIA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  {
    name: "TRYSTAN PRASTANOV GABRIEL",
    sept2024: true,
    okt2024: true,
    nov2024: true,
    des2024: true,
  },
  { name: "RAFI RUZAIN RABA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  {
    name: "GENOVERRE ABRAHAM ESTHEREDITH WOWOR",
    sept2024: true,
    okt2024: true,
    nov2024: true,
    des2024: true,
  },
  { name: "ALI URAIDY", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "NAYLA ZAHRA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "MUHAMMAD DHEKI AKBAR", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "MUHAMMAD NAUFAL AULIA", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "BARA JUANG INDONESIANO", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "CAREAL ALIF MAFAZI", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "ILHAM DWIKY ARDIANSYAH", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "GIDEON MIRACLE SIHOMBING", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "SYAUQI RAFLY RAMADHAN", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "AGUNG AGRO PRAWIRO", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "AYUB TRI SUBIYANTO", sept2024: true, okt2024: true, nov2024: true, des2024: true },
  { name: "FATAH ADILIANSYAH", sept2024: true, okt2024: true, nov2024: true, des2024: true },
];

// Mar - June 2025 data
const data2025Q1Q2: PaymentRecord[] = [
  { name: "DEVIA ARITONDI NATALSYA", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  {
    name: "HAMIM MUMTAZ RAMADHAN LALENO",
    mar2025: true,
    apr2025: true,
    mei2025: true,
    juni2025: true,
  },
  { name: "NAZWA SYALSA DAVIRA", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "FARIS MAULANA AL BA I", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "MUTIA PUTRI ASSYIFA", mar2025: true, apr2025: true },
  { name: "SALSABILA", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "RICKY DARMAWAN", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "NADINE ALYSHA MAHESWARI", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "ERNANDO FEBRIAN", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "FAZLI MAWLA DIAPARI", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "CANDRA AFRIANSYAH", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "RAFA CALLYSTA ARRAISSA", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "MUHAMMAD DAFFA RAMDHANI", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "PATRICK JULIAN RUSLI", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "DHIMAS EKA PUTRA", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "DANIEL TADEO EVANTIYASA", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  {
    name: "NANDANA AMMAR TRIABIMANYU",
    mar2025: true,
    apr2025: true,
    mei2025: true,
    juni2025: true,
  },
  { name: "LEONARD DWI CHRISDIASA", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "AUFA LEVINA HAPSARI", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "DIAJENG KARIMA SADIDA", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "NUGRAHA BAGYA", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "AQILAH ANDRA AMAGASAKI", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  {
    name: "MICHAEL RENATTO ZITHA SETIAWAN",
    mar2025: true,
    apr2025: true,
    mei2025: true,
    juni2025: true,
  },
  { name: "IBRAHIM FARIS MAHARDIKA", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "FATHYA KHAIRANI R", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "MUHAMMAD YASYFI ALHAFIZH", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "ADE AZHAR FIRDAUS", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "SEAN MARSHEL BUDYANA", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "ANINDYA KAILA PREMONO", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "ADRI LORENZO PATIARAJA", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "FAZA SULTHAN HAFIYYAN", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "SAYYIED RIDHO ARHAMI", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "RIZKY RAFFANDY HALIM", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "MOHAMMAD ZACKY NAUVAL", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "HAVIZ FACHRIAN ALBAR", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "NASYWA ZAHRA ZETTIRA", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "MUHAMMAD RINGAN PRAYOGA", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "DAMAR RAYYAN PRAMONO", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "KHAIRUL AKMAL", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  {
    name: "MUHAMMAD PRADIPTA ARYA ANINDITA",
    mar2025: true,
    apr2025: true,
    mei2025: true,
    juni2025: true,
  },
  { name: "RIDWAN ALFAREZI", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "AHMAD HANIF NAUFAL JAMIL", mar2025: true },
  { name: "ANANDA GIWANK ABHINAYA", mar2025: true, apr2025: true },
  { name: "FIKRI AHMAD ARSALAN", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "MUHAMMAD AZFA HERMAWAN", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "AHMAD", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "MUHAMMAD", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "RIZA ARYADWITO", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "RAMA ADITTYA SAPUTRA", mar2025: true },
  {
    name: "ALIEF FADHILLAH NUR RACHMAN",
    mar2025: true,
    apr2025: true,
    mei2025: true,
    juni2025: true,
  },
  { name: "DUTA SETYAWAN", mar2025: true },
  { name: "KEMAL DERMAWAN", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "BAHTIAR RIFAI KHUMAIDI", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "RAFIANDRA DIRGA MEAZZA", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  {
    name: "RAFLY RABBANI ZALFA PATEDA",
    mar2025: true,
    apr2025: true,
    mei2025: true,
    juni2025: true,
  },
  { name: "RIZKY WULAN PURNAMASARI", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "DAYU AJI PRIAWAN", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "ANDRA ALDOVIAN SYARIEF", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "RAFI RUZAIN RABA", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "NAYLA ZAHRA", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "MUHAMMAD DHEKI AKBAR", mar2025: true, apr2025: true, juni2025: true },
  { name: "MUHAMMAD NAUFAL AULIA", mar2025: true },
  { name: "BARA JUANG INDONESIANO", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
  { name: "GIDEON MIRACLE SIHOMBING", mar2025: true },
  { name: "FATAH ADILIANSYAH", mar2025: true, apr2025: true, mei2025: true, juni2025: true },
];

// Sep - Dec 2025 data
const data2025Q3Q4: PaymentRecord[] = [
  { name: "DEVIA ARITONDI NATALSYA", sept2025: true, okt2025: true, nov2025: true, des2025: true },
  { name: "MUHAMMAD DAFFA RAMDHANI", sept2025: true, okt2025: true, nov2025: true, des2025: true },
  { name: "DHIMAS EKA PUTRA", sept2025: true },
  { name: "DIAJENG KARIMA SADIDA", sept2025: true, okt2025: true, nov2025: true, des2025: true },
  { name: "ANINDYA KAILA PREMONO", sept2025: true, okt2025: true, nov2025: true, des2025: true },
  { name: "HAVIZ FACHRIAN ALBAR", sept2025: true },
  { name: "NASYWA ZAHRA ZETTIRA", sept2025: true, okt2025: true, nov2025: true, des2025: true },
  { name: "DAMAR RAYYAN PRAMONO", sept2025: true },
  { name: "KEMAL DERMAWAN", sept2025: true, okt2025: true, nov2025: true, des2025: true },
  { name: "BAHTIAR RIFAI KHUMAIDI", sept2025: true },
  { name: "RAFIANDRA DIRGA MEAZZA", sept2025: true },
  { name: "RIZKY WULAN PURNAMASARI", sept2025: true, okt2025: true, nov2025: true, des2025: true },
  { name: "DAYU AJI PRIAWAN", sept2025: true, okt2025: true },
  { name: "ANDRA ALDOVIAN SYARIEF", sept2025: true },
  { name: "RAFI RUZAIN RABA", sept2025: true, okt2025: true, nov2025: true, des2025: true },
  { name: "NAYLA ZAHRA", sept2025: true },
  { name: "MUHAMMAD DHEKI AKBAR", okt2025: true },
];

// Month to date mapping
interface MonthData {
  key: keyof PaymentRecord;
  monthNumber: number; // 1-12
  year: number;
  date: Date;
  label: string;
}

const months: MonthData[] = [
  {
    key: "sept2024",
    monthNumber: 9,
    year: 2024,
    date: new Date("2024-09-30"),
    label: "September 2024",
  },
  {
    key: "okt2024",
    monthNumber: 10,
    year: 2024,
    date: new Date("2024-10-31"),
    label: "October 2024",
  },
  {
    key: "nov2024",
    monthNumber: 11,
    year: 2024,
    date: new Date("2024-11-30"),
    label: "November 2024",
  },
  {
    key: "des2024",
    monthNumber: 12,
    year: 2024,
    date: new Date("2024-12-31"),
    label: "December 2024",
  },
  { key: "mar2025", monthNumber: 3, year: 2025, date: new Date("2025-03-31"), label: "March 2025" },
  { key: "apr2025", monthNumber: 4, year: 2025, date: new Date("2025-04-30"), label: "April 2025" },
  { key: "mei2025", monthNumber: 5, year: 2025, date: new Date("2025-05-31"), label: "May 2025" },
  { key: "juni2025", monthNumber: 6, year: 2025, date: new Date("2025-06-30"), label: "June 2025" },
  {
    key: "sept2025",
    monthNumber: 9,
    year: 2025,
    date: new Date("2025-09-30"),
    label: "September 2025",
  },
  {
    key: "okt2025",
    monthNumber: 10,
    year: 2025,
    date: new Date("2025-10-31"),
    label: "October 2025",
  },
  {
    key: "nov2025",
    monthNumber: 11,
    year: 2025,
    date: new Date("2025-11-30"),
    label: "November 2025",
  },
  {
    key: "des2025",
    monthNumber: 12,
    year: 2025,
    date: new Date("2025-12-31"),
    label: "December 2025",
  },
];

// Function to get payment amount based on year and month
function getPaymentAmount(year: number, month: number): number {
  // Sep-Dec 2025: Rp 10,000
  if (year === 2025 && month >= 9) {
    return 10000;
  }
  // Sep-Dec 2024 and Mar-June 2025: Rp 15,000
  return 15000;
}

async function seedPastCashBills() {
  try {
    console.log("🚀 Starting past cash bills seeding...\n");

    // Get class A
    const classA = await prisma.class.findUnique({
      where: { name: "A" },
    });

    if (!classA) {
      throw new Error("Class A not found");
    }

    // Get bendahara user for confirmation
    const bendahara = await prisma.user.findUnique({
      where: { nim: "1313624000" }, // Fatya Khairani R
    });

    if (!bendahara) {
      throw new Error("Bendahara user not found");
    }

    let totalBillsCreated = 0;
    let totalTransactionsCreated = 0;
    let totalPaidBills = 0;
    let totalUnpaidBills = 0;
    let totalIncomeAmount = 0;

    // Define month groups for each dataset
    const months2024 = months.filter((m) => m.year === 2024 && m.monthNumber >= 9);
    const months2025Q1Q2 = months.filter(
      (m) => m.year === 2025 && m.monthNumber >= 3 && m.monthNumber <= 6
    );
    const months2025Q3Q4 = months.filter((m) => m.year === 2025 && m.monthNumber >= 9);

    // Process Sep-Dec 2024 (all students have all 4 months)
    for (const payment of data2024) {
      const nim = nameToNimMap[payment.name];
      if (!nim) {
        console.warn(`⚠️  User not found: ${payment.name}`);
        continue;
      }

      const user = await prisma.user.findUnique({
        where: { nim },
      });

      if (!user) {
        console.warn(`⚠️  User not found in database: ${payment.name} (${nim})`);
        continue;
      }

      for (const month of months2024) {
        try {
          // Generate unique billId
          const billId = `BILL-${nim}-${month.label.replace(/\s+/g, "-").toUpperCase()}`;

          const isPaid = payment[month.key] ? true : false;
          const paymentAmount = getPaymentAmount(month.year, month.monthNumber);

          // Create or update CashBill
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const cashBill = await prisma.cashBill.upsert({
            where: { billId },
            create: {
              userId: user.id,
              classId: classA.id,
              billId,
              month: month.monthNumber,
              year: month.year,
              dueDate: month.date,
              kasKelas: paymentAmount,
              biayaAdmin: 0,
              totalAmount: paymentAmount,
              status: isPaid ? "sudah_dibayar" : "belum_dibayar",
              paymentMethod: isPaid ? "cash" : null,
              paidAt: isPaid ? month.date : null,
              confirmedBy: isPaid ? bendahara.id : null,
              confirmedAt: isPaid ? month.date : null,
            },
            update: {
              kasKelas: paymentAmount,
              totalAmount: paymentAmount,
              status: isPaid ? "sudah_dibayar" : "belum_dibayar",
              paymentMethod: isPaid ? "cash" : null,
              paidAt: isPaid ? month.date : null,
              confirmedBy: isPaid ? bendahara.id : null,
              confirmedAt: isPaid ? month.date : null,
            },
          });

          if (isPaid) {
            totalPaidBills++;

            // Create Transaction (income) only for paid bills
            const existingTransaction = await prisma.transaction.findFirst({
              where: {
                description: `Penerimaan iuran kas dari ${payment.name} - ${month.label}`,
                classId: classA.id,
              },
            });

            if (!existingTransaction) {
              await prisma.transaction.create({
                data: {
                  classId: classA.id,
                  type: "income",
                  category: "kas_kelas",
                  description: `Penerimaan iuran kas dari ${payment.name} - ${month.label}`,
                  amount: paymentAmount,
                  date: month.date,
                },
              });
              totalTransactionsCreated++;
              totalIncomeAmount += paymentAmount;
            }
          } else {
            totalUnpaidBills++;
          }

          totalBillsCreated++;
        } catch (error) {
          console.error(
            `❌ Error creating records for ${payment.name} (${nim}) in ${month.label}:`,
            error
          );
        }
      }
    }

    // Process Mar-June 2025 (only students in data2025Q1Q2)
    for (const payment of data2025Q1Q2) {
      const nim = nameToNimMap[payment.name];
      if (!nim) {
        console.warn(`⚠️  User not found: ${payment.name}`);
        continue;
      }

      const user = await prisma.user.findUnique({
        where: { nim },
      });

      if (!user) {
        console.warn(`⚠️  User not found in database: ${payment.name} (${nim})`);
        continue;
      }

      for (const month of months2025Q1Q2) {
        try {
          const billId = `BILL-${nim}-${month.label.replace(/\s+/g, "-").toUpperCase()}`;
          const isPaid = payment[month.key] ? true : false;
          const paymentAmount = getPaymentAmount(month.year, month.monthNumber);

          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const cashBill = await prisma.cashBill.upsert({
            where: { billId },
            create: {
              userId: user.id,
              classId: classA.id,
              billId,
              month: month.monthNumber,
              year: month.year,
              dueDate: month.date,
              kasKelas: paymentAmount,
              biayaAdmin: 0,
              totalAmount: paymentAmount,
              status: isPaid ? "sudah_dibayar" : "belum_dibayar",
              paymentMethod: isPaid ? "cash" : null,
              paidAt: isPaid ? month.date : null,
              confirmedBy: isPaid ? bendahara.id : null,
              confirmedAt: isPaid ? month.date : null,
            },
            update: {
              kasKelas: paymentAmount,
              totalAmount: paymentAmount,
              status: isPaid ? "sudah_dibayar" : "belum_dibayar",
              paymentMethod: isPaid ? "cash" : null,
              paidAt: isPaid ? month.date : null,
              confirmedBy: isPaid ? bendahara.id : null,
              confirmedAt: isPaid ? month.date : null,
            },
          });

          if (isPaid) {
            totalPaidBills++;

            const existingTransaction = await prisma.transaction.findFirst({
              where: {
                description: `Penerimaan iuran kas dari ${payment.name} - ${month.label}`,
                classId: classA.id,
              },
            });

            if (!existingTransaction) {
              await prisma.transaction.create({
                data: {
                  classId: classA.id,
                  type: "income",
                  category: "kas_kelas",
                  description: `Penerimaan iuran kas dari ${payment.name} - ${month.label}`,
                  amount: paymentAmount,
                  date: month.date,
                },
              });
              totalTransactionsCreated++;
              totalIncomeAmount += paymentAmount;
            }
          } else {
            totalUnpaidBills++;
          }

          totalBillsCreated++;
        } catch (error) {
          console.error(
            `❌ Error creating records for ${payment.name} (${nim}) in ${month.label}:`,
            error
          );
        }
      }
    }

    // Process Sep-Dec 2025 (all students, but only those in data2025Q3Q4 have paid bills)
    // Create a map of payments for quick lookup
    const paymentsQ3Q4Map = new Map(data2025Q3Q4.map((p) => [p.name, p]));

    for (const payment of data2024) {
      // Use data2024 as it contains all 85 students
      const nim = nameToNimMap[payment.name];
      if (!nim) {
        console.warn(`⚠️  User not found: ${payment.name}`);
        continue;
      }

      const user = await prisma.user.findUnique({
        where: { nim },
      });

      if (!user) {
        console.warn(`⚠️  User not found in database: ${payment.name} (${nim})`);
        continue;
      }

      for (const month of months2025Q3Q4) {
        try {
          const billId = `BILL-${nim}-${month.label.replace(/\s+/g, "-").toUpperCase()}`;

          // Check if this student has a payment record in Q3Q4 data
          const q3q4Payment = paymentsQ3Q4Map.get(payment.name);
          const isPaid = q3q4Payment && q3q4Payment[month.key] === true;

          const paymentAmount = getPaymentAmount(month.year, month.monthNumber);

          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const cashBill = await prisma.cashBill.upsert({
            where: { billId },
            create: {
              userId: user.id,
              classId: classA.id,
              billId,
              month: month.monthNumber,
              year: month.year,
              dueDate: month.date,
              kasKelas: paymentAmount,
              biayaAdmin: 0,
              totalAmount: paymentAmount,
              status: isPaid ? "sudah_dibayar" : "belum_dibayar",
              paymentMethod: isPaid ? "cash" : null,
              paidAt: isPaid ? month.date : null,
              confirmedBy: isPaid ? bendahara.id : null,
              confirmedAt: isPaid ? month.date : null,
            },
            update: {
              kasKelas: paymentAmount,
              totalAmount: paymentAmount,
              status: isPaid ? "sudah_dibayar" : "belum_dibayar",
              paymentMethod: isPaid ? "cash" : null,
              paidAt: isPaid ? month.date : null,
              confirmedBy: isPaid ? bendahara.id : null,
              confirmedAt: isPaid ? month.date : null,
            },
          });

          if (isPaid) {
            totalPaidBills++;

            const existingTransaction = await prisma.transaction.findFirst({
              where: {
                description: `Penerimaan iuran kas dari ${payment.name} - ${month.label}`,
                classId: classA.id,
              },
            });

            if (!existingTransaction) {
              await prisma.transaction.create({
                data: {
                  classId: classA.id,
                  type: "income",
                  category: "kas_kelas",
                  description: `Penerimaan iuran kas dari ${payment.name} - ${month.label}`,
                  amount: paymentAmount,
                  date: month.date,
                },
              });
              totalTransactionsCreated++;
              totalIncomeAmount += paymentAmount;
            }
          } else {
            totalUnpaidBills++;
          }

          totalBillsCreated++;
        } catch (error) {
          console.error(
            `❌ Error creating records for ${payment.name} (${nim}) in ${month.label}:`,
            error
          );
        }
      }
    }

    // Summary
    console.log("\n📊 Summary:");
    console.log("============================================");
    console.log(`Total Cash Bills Created: ${totalBillsCreated}`);
    console.log(`  - Paid Bills (sudah_dibayar): ${totalPaidBills}`);
    console.log(`  - Unpaid Bills (belum_dibayar): ${totalUnpaidBills}`);
    console.log(`Transactions Created: ${totalTransactionsCreated}`);
    console.log(`Total Income Amount: Rp ${totalIncomeAmount.toLocaleString("id-ID")}`);
    console.log("============================================");
    console.log("✅ Cash bills seeding completed!\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
seedPastCashBills();
