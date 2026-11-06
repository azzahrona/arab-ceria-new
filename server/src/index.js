import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { getDb, initializeDb, updateDb } from './db.js';
import { categories, words } from './words.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const allowedOrigins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);
const localNetworkOrigin = /^http:\/\/(?:10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.(?:\d{1,3}\.)\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.(?:\d{1,3}\.)\d{1,3}):5173$/;
const quizSessions = new Map();
const QUIZ_SESSION_TTL = 30 * 60 * 1000;

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || localNetworkOrigin.test(origin)) return callback(null, true);
    return callback(new Error('Asal permintaan tidak diizinkan.'));
  }
}));
app.use(express.json({ limit: '100kb' }));

function sendError(res, status, message) {
  return res.status(status).json({ message });
}

function getClassroom(db) {
  return db.classroom;
}

function progressFor(classroom) {
  const learned = new Set(classroom.learnedWords || []);
  const learnedCount = words.filter((word) => learned.has(word.id)).length;
  const history = [...(classroom.quizHistory || [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const bestScore = history.reduce((best, quiz) => Math.max(best, quiz.score), 0);
  return {
    learnedWords: [...learned],
    learnedCount,
    remainingCount: words.length - learnedCount,
    totalWords: words.length,
    percentage: Math.round((learnedCount / words.length) * 100),
    quizHistory: history,
    bestScore
  };
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function cleanExpiredQuizSessions() {
  const now = Date.now();
  for (const [id, session] of quizSessions.entries()) {
    if (now - session.createdAt > QUIZ_SESSION_TTL) quizSessions.delete(id);
  }
}

function quizMessage(score) {
  if (score >= 8) return 'Hebat! Kamu menguasai banyak kosakata. Pertahankan semangat belajarmu!';
  if (score >= 5) return 'Bagus! Kamu sudah berusaha dengan baik. Ayo berlatih lagi agar makin hebat!';
  return 'Jangan menyerah. Setiap latihan membuatmu semakin pintar. Yuk, pelajari kosakatanya lagi!';
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'Arab Ceria API', mode: 'tanpa-login' }));
app.get('/api/words', (_req, res) => res.json({ categories, words }));

// Satu profil belajar bersama untuk perangkat/kelas lokal. Tidak memerlukan akun siswa.
app.get('/api/progress/me', async (_req, res) => {
  try {
    const db = await getDb();
    const classroom = getClassroom(db);
    return res.json({ student: { id: classroom.id, name: classroom.name }, progress: progressFor(classroom) });
  } catch {
    return sendError(res, 500, 'Progres belajar belum dapat dimuat.');
  }
});

app.post('/api/progress/learned', async (req, res) => {
  const wordId = String(req.body?.wordId || '');
  const learned = req.body?.learned;
  if (!words.some((word) => word.id === wordId)) return sendError(res, 400, 'Kosakata tidak ditemukan.');
  if (typeof learned !== 'boolean') return sendError(res, 400, 'Status belajar tidak valid.');
  try {
    const updated = await updateDb((db) => {
      const classroom = getClassroom(db);
      const learnedSet = new Set(classroom.learnedWords || []);
      if (learned) learnedSet.add(wordId);
      else learnedSet.delete(wordId);
      classroom.learnedWords = [...learnedSet];
      return { student: { id: classroom.id, name: classroom.name }, progress: progressFor(classroom) };
    });
    return res.json(updated);
  } catch {
    return sendError(res, 500, 'Progres belum berhasil disimpan.');
  }
});

// Sepuluh kosakata unik dipilih secara acak. Arah soal dan urutan pilihan juga diacak.
app.post('/api/quiz/start', (_req, res) => {
  cleanExpiredQuizSessions();
  const quizId = randomUUID();
  const answerKey = {};
  const questions = shuffle(words).slice(0, 10).map((word) => {
    const direction = Math.random() < 0.5 ? 'arabic-to-meaning' : 'meaning-to-arabic';
    const options = shuffle([word, ...shuffle(words.filter((item) => item.id !== word.id)).slice(0, 3)]);
    const questionId = randomUUID();
    answerKey[questionId] = word.id;
    return {
      id: questionId,
      direction,
      prompt: direction === 'arabic-to-meaning' ? word.arabic : word.meaning,
      promptEmoji: direction === 'meaning-to-arabic' ? word.emoji : null,
      options: options.map((option) => ({
        id: option.id,
        label: direction === 'arabic-to-meaning' ? option.meaning : option.arabic,
        emoji: direction === 'arabic-to-meaning' ? option.emoji : null
      }))
    };
  });
  quizSessions.set(quizId, { answerKey, questions, answers: {}, createdAt: Date.now() });
  return res.status(201).json({ quizId, questions });
});

app.post('/api/quiz/answer', (req, res) => {
  const quizId = String(req.body?.quizId || '');
  const questionId = String(req.body?.questionId || '');
  const optionId = String(req.body?.optionId || '');
  const session = quizSessions.get(quizId);
  if (!session || Date.now() - session.createdAt > QUIZ_SESSION_TTL) {
    quizSessions.delete(quizId);
    return sendError(res, 410, 'Sesi kuis sudah berakhir. Silakan mulai kuis baru.');
  }
  const question = session.questions.find((item) => item.id === questionId);
  if (!question) return sendError(res, 400, 'Soal tidak ditemukan dalam kuis ini.');
  if (Object.hasOwn(session.answers, questionId)) return sendError(res, 409, 'Jawaban untuk soal ini sudah dikirim.');
  const option = question.options.find((item) => item.id === optionId);
  if (!option) return sendError(res, 400, 'Pilihan jawaban tidak tersedia.');
  session.answers[questionId] = optionId;
  const correctOptionId = session.answerKey[questionId];
  const correctOption = question.options.find((item) => item.id === correctOptionId);
  return res.json({
    isCorrect: optionId === correctOptionId,
    correctOptionId,
    correctAnswer: correctOption.label,
    correctEmoji: correctOption.emoji
  });
});

app.post('/api/quiz/submit', async (req, res) => {
  const quizId = String(req.body?.quizId || '');
  const session = quizSessions.get(quizId);
  if (!session || Date.now() - session.createdAt > QUIZ_SESSION_TTL) {
    quizSessions.delete(quizId);
    return sendError(res, 410, 'Sesi kuis sudah berakhir. Silakan mulai kuis baru.');
  }
  if (Object.keys(session.answers).length !== 10) return sendError(res, 400, 'Selesaikan semua 10 soal sebelum menyimpan nilai.');

  const score = session.questions.reduce((sum, question) => (
    sum + (session.answers[question.id] === session.answerKey[question.id] ? 1 : 0)
  ), 0);
  const result = {
    id: randomUUID(),
    score,
    total: 10,
    percentage: score * 10,
    createdAt: new Date().toISOString()
  };
  try {
    await updateDb((db) => {
      const classroom = getClassroom(db);
      classroom.quizHistory = [...(classroom.quizHistory || []), result];
    });
    quizSessions.delete(quizId);
    return res.status(201).json({ result, message: quizMessage(score) });
  } catch {
    return sendError(res, 500, 'Nilai kuis belum berhasil disimpan.');
  }
});

// Dashboard guru dapat dibuka langsung pada instalasi lokal, tanpa akun/login.
app.get('/api/teacher/students', async (_req, res) => {
  try {
    const db = await getDb();
    const classroom = getClassroom(db);
    const student = {
      id: classroom.id,
      name: classroom.name,
      username: 'Profil bersama',
      role: 'student',
      createdAt: classroom.createdAt,
      progress: progressFor(classroom)
    };
    return res.json({ students: [student], totalStudents: 1, mode: 'profil-bersama' });
  } catch {
    return sendError(res, 500, 'Data perkembangan belajar belum dapat dimuat.');
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  return sendError(res, 500, err.message === 'Asal permintaan tidak diizinkan.' ? err.message : 'Terjadi kesalahan pada server.');
});

await initializeDb();
app.listen(PORT, () => {
  console.log(`Arab Ceria API berjalan di http://localhost:${PORT}`);
  console.log('Mode tanpa login: progres dan nilai tersimpan pada satu profil bersama.');
});
