import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = path.resolve(here, '../data/db.json');
let writeQueue = Promise.resolve();

function emptyDb() {
  return {
    version: 2,
    classroom: {
      id: 'arab-ceria-local-class',
      name: 'Siswa Arab Ceria',
      learnedWords: [],
      quizHistory: [],
      createdAt: new Date().toISOString()
    }
  };
}

async function readFileDb() {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    // Migrasi otomatis dari versi sebelumnya yang menggunakan akun siswa.
    if (parsed?.classroom && Array.isArray(parsed.classroom.learnedWords) && Array.isArray(parsed.classroom.quizHistory)) {
      return { ...emptyDb(), ...parsed, classroom: { ...emptyDb().classroom, ...parsed.classroom } };
    }

    const legacyStudents = Array.isArray(parsed?.users)
      ? parsed.users.filter((user) => user.role === 'student')
      : [];
    if (legacyStudents.length) {
      const learnedWords = [...new Set(legacyStudents.flatMap((user) => user.learnedWords || []))];
      const quizHistory = legacyStudents
        .flatMap((user) => user.quizHistory || [])
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const migrated = emptyDb();
      migrated.classroom.learnedWords = learnedWords;
      migrated.classroom.quizHistory = quizHistory;
      migrated.classroom.name = legacyStudents.length === 1 ? legacyStudents[0].name : 'Kelas Arab Ceria';
      return migrated;
    }

    return emptyDb();
  } catch (error) {
    if (error.code === 'ENOENT') return emptyDb();
    if (error instanceof SyntaxError) throw new Error('Isi server/data/db.json tidak valid. Pulihkan dari cadangan atau kosongkan file agar dibuat ulang.');
    throw error;
  }
}

async function atomicWrite(db) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  const tempPath = `${DB_PATH}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(tempPath, `${JSON.stringify(db, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    await fs.rename(tempPath, DB_PATH);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function initializeDb() {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  const db = await readFileDb();
  await atomicWrite(db);
}

export async function getDb() {
  await writeQueue;
  return readFileDb();
}

/** Semua perubahan data melewati antrean tunggal dan ditulis secara atomik. */
export function updateDb(mutator) {
  const task = writeQueue.then(async () => {
    const db = await readFileDb();
    const result = await mutator(db);
    await atomicWrite(db);
    return result;
  });
  writeQueue = task.catch(() => undefined);
  return task;
}
