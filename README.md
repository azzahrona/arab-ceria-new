# Arab Ceria – Belajar Bahasa Arab Jadi Menyenangkan

Website pembelajaran bahasa Arab untuk siswa SD kelas 3–4. Versi ini dibuat **tanpa registrasi, tanpa login siswa, dan tanpa login guru**. Siswa dapat langsung membuka materi, kuis, permainan, dan halaman progres.

## Fitur

- Langsung digunakan tanpa membuat akun atau memasukkan username/password.
- 48 kosakata dalam 6 tema: warna, hewan, buah-buahan, benda sekolah, anggota tubuh, dan keluarga.
- Pencarian, filter tema, transliterasi, arti, emoji, dan pelafalan melalui Web Speech API (`ar-SA`) jika didukung browser.
- Penandaan kosakata yang sudah dipelajari.
- Kuis 10 soal pilihan ganda yang diacak dari 48 kosakata; jawaban diperiksa backend dan nilai disimpan.
- Dua permainan: Tebak Arti dan Pasangkan Kata.
- Halaman progres belajar dan riwayat nilai kuis.
- Dashboard guru dapat dibuka langsung tanpa login.
- Data disimpan secara lokal pada `server/data/db.json`.
- Penulisan JSON menggunakan antrean dan file sementara yang dipindahkan secara atomik.
- Tampilan responsif untuk laptop dan ponsel.

## Catatan penggunaan tanpa login

Karena tidak ada akun atau identitas siswa, aplikasi menggunakan **satu profil belajar bersama** bernama `Siswa Arab Ceria`. Semua siswa yang menggunakan instalasi/server yang sama akan berbagi progres kosakata dan riwayat nilai kuis. Data tetap tersimpan setelah server dimatikan dan dijalankan kembali.

Jika aplikasi dipakai bergantian oleh banyak siswa dan guru memerlukan nilai per anak, gunakan perangkat/server terpisah untuk tiap siswa atau tambahkan fitur pemilihan nama siswa tanpa password pada pengembangan berikutnya. Pada versi ini tidak ada login atau registrasi sama sekali.

## Teknologi dan persyaratan

- Node.js 18 atau lebih baru (disarankan Node.js 20+).
- npm.
- Frontend: React 18 + Vite.
- Backend: Node.js + Express.
- Penyimpanan: file JSON lokal.
- Browser modern. Chrome atau Edge terbaru disarankan untuk fitur suara.

Tidak diperlukan MySQL, PostgreSQL, MongoDB, Firebase, atau layanan database eksternal.

## Instalasi

1. Ekstrak ZIP proyek.
2. Buka folder `arab-ceria` menggunakan VS Code atau terminal.
3. Pastikan Node.js dan npm sudah terpasang.
4. Jalankan perintah berikut dari folder utama proyek:

```bash
npm run setup
```

Perintah tersebut memasang dependensi root, backend, dan frontend.

## Menjalankan website

Jalankan frontend dan backend secara bersamaan:

```bash
npm run dev
```

Buka alamat berikut di browser:

- Website: http://localhost:5173
- Pemeriksaan backend: http://localhost:4000/api/health

Untuk menghentikan server, tekan `Ctrl + C` pada terminal.

### Menjalankan secara terpisah

Jika ingin menggunakan dua terminal:

Terminal 1 – backend:

```bash
npm run dev --prefix server
```

Terminal 2 – frontend:

```bash
npm run dev --prefix client
```

## Build frontend

Untuk memeriksa dan membuat build produksi frontend:

```bash
npm run build
```

Hasil build tersedia di `client/dist`. Backend tetap dijalankan terpisah dengan:

```bash
npm start
```

## Penyimpanan data

Semua progres kosakata dan riwayat kuis disimpan pada:

```text
server/data/db.json
```

File dibuat otomatis saat backend pertama kali dijalankan. Untuk membuat cadangan, salin `server/data/db.json` ketika server sedang tidak melakukan aktivitas penulisan. Jangan menghapus atau mengedit file tersebut saat server sedang berjalan.

Jika sebelumnya menggunakan versi Arab Ceria yang memiliki akun siswa, backend akan mencoba menggabungkan progres kosakata dan riwayat kuis siswa lama ke profil belajar bersama pada saat migrasi pertama.

## API utama

| Metode | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/health` | Pemeriksaan backend |
| GET | `/api/words` | Mengambil 48 kosakata dan tema |
| GET | `/api/progress/me` | Mengambil progres profil belajar bersama |
| POST | `/api/progress/learned` | Menambah/menghapus status kosakata dipelajari |
| POST | `/api/quiz/start` | Membuat 10 soal acak |
| POST | `/api/quiz/answer` | Memeriksa satu jawaban pada sesi kuis |
| POST | `/api/quiz/submit` | Menyimpan hasil setelah 10 soal selesai |
| GET | `/api/teacher/students` | Ringkasan progres untuk dashboard guru |

Semua endpoint di atas dapat digunakan tanpa token login karena aplikasi ini memang ditujukan untuk penggunaan lokal tanpa akun.

## Struktur folder

```text
arab-ceria/
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── components/
│       ├── lib/
│       ├── pages/
│       ├── main.jsx
│       └── styles.css
├── server/
│   ├── data/
│   │   └── db.json
│   ├── src/
│   │   ├── db.js
│   │   ├── index.js
│   │   └── words.js
│   ├── .env.example
│   └── package.json
├── .gitignore
├── package.json
└── README.md
```

## Catatan keamanan

Versi tanpa login ini ditujukan untuk demonstrasi dan penggunaan lokal di lingkungan kelas. Dashboard guru dan endpoint progres tidak memiliki autentikasi, sehingga jangan mengekspos backend langsung ke internet atau jaringan publik. Jika website akan digunakan secara daring atau membutuhkan catatan nilai per siswa, perlu ditambahkan kembali mekanisme identitas dan otorisasi yang sesuai.
