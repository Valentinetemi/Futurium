import type { SQLiteBindParams, SQLiteRunResult } from 'expo-sqlite';

import {
  mapSweepRow,
  normalizeCreateSweepInput,
  type CreateSweepInput,
  type Sweep,
  type SweepRow,
  type SweepStatus,
} from '@/database/sweep-model';
import type { ProcessingManifest } from '@/types/processing';

// Keep the legacy filename so an app update continues to open existing memories.
export const DATABASE_NAME = 'futurium.db';
export const DATABASE_VERSION = 2;

export type SweepDatabase = {
  execAsync(source: string): Promise<void>;
  getAllAsync<T>(source: string, params: SQLiteBindParams): Promise<T[]>;
  getFirstAsync<T>(source: string, params: SQLiteBindParams): Promise<T | null>;
  runAsync(source: string, params: SQLiteBindParams): Promise<SQLiteRunResult>;
};

type DatabaseVersionRow = {
  user_version: number;
};

const CREATE_DATABASE_SQL = `
  BEGIN IMMEDIATE;

  CREATE TABLE IF NOT EXISTS sweeps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roomName TEXT NOT NULL CHECK(length(trim(roomName)) > 0),
    videoUri TEXT NOT NULL CHECK(length(trim(videoUri)) > 0),
    durationSeconds INTEGER NOT NULL CHECK(durationSeconds >= 0 AND durationSeconds <= 30),
    createdAt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'saved'
      CHECK(status IN ('saved', 'uploading', 'processing', 'ready', 'failed')),
    processingJobId TEXT,
    processingManifest TEXT
  );

  CREATE INDEX IF NOT EXISTS sweeps_created_at_index
    ON sweeps(createdAt DESC);

  PRAGMA user_version = ${DATABASE_VERSION};
  COMMIT;
`;

const MIGRATE_VERSION_1_TO_2_SQL = `
  BEGIN IMMEDIATE;

  DROP INDEX IF EXISTS sweeps_created_at_index;
  ALTER TABLE sweeps RENAME TO sweeps_version_1;

  CREATE TABLE sweeps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roomName TEXT NOT NULL CHECK(length(trim(roomName)) > 0),
    videoUri TEXT NOT NULL CHECK(length(trim(videoUri)) > 0),
    durationSeconds INTEGER NOT NULL CHECK(durationSeconds >= 0 AND durationSeconds <= 30),
    createdAt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'saved'
      CHECK(status IN ('saved', 'uploading', 'processing', 'ready', 'failed')),
    processingJobId TEXT,
    processingManifest TEXT
  );

  INSERT INTO sweeps (
    id, roomName, videoUri, durationSeconds, createdAt, status
  )
  SELECT id, roomName, videoUri, durationSeconds, createdAt, status
  FROM sweeps_version_1;

  DROP TABLE sweeps_version_1;

  CREATE INDEX sweeps_created_at_index ON sweeps(createdAt DESC);
  PRAGMA user_version = ${DATABASE_VERSION};
  COMMIT;
`;

const SWEEP_COLUMNS = `
  id,
  roomName,
  videoUri,
  durationSeconds,
  createdAt,
  status,
  processingJobId,
  processingManifest
`;

export async function initializeDatabase(database: SweepDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const versionRow = await database.getFirstAsync<DatabaseVersionRow>(
    'PRAGMA user_version',
    {},
  );
  const currentVersion = Number(versionRow?.user_version ?? 0);

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(
      `Database version ${currentVersion} is newer than supported version ${DATABASE_VERSION}.`,
    );
  }

  if (currentVersion === 0) {
    await database.execAsync(CREATE_DATABASE_SQL);
  } else if (currentVersion === 1) {
    await database.execAsync(MIGRATE_VERSION_1_TO_2_SQL);
  }
}

export async function createSweep(
  database: SweepDatabase,
  input: CreateSweepInput,
): Promise<Sweep> {
  const sweep = normalizeCreateSweepInput(input);
  const result = await database.runAsync(
    `INSERT INTO sweeps (
      roomName,
      videoUri,
      durationSeconds,
      createdAt,
      status
    ) VALUES (
      $roomName,
      $videoUri,
      $durationSeconds,
      $createdAt,
      $status
    )`,
    {
      $createdAt: sweep.createdAt,
      $durationSeconds: sweep.durationSeconds,
      $roomName: sweep.roomName,
      $status: sweep.status,
      $videoUri: sweep.videoUri,
    },
  );

  const createdSweep = await getSweep(database, result.lastInsertRowId);

  if (!createdSweep) {
    throw new Error('The saved memory could not be read after creation.');
  }

  return createdSweep;
}

export async function listSweeps(database: SweepDatabase): Promise<Sweep[]> {
  const rows = await database.getAllAsync<SweepRow>(
    `SELECT ${SWEEP_COLUMNS}
     FROM sweeps
     ORDER BY createdAt DESC, id DESC`,
    {},
  );

  return rows.map(mapSweepRow);
}

export async function getSweep(
  database: SweepDatabase,
  id: number,
): Promise<Sweep | null> {
  const row = await database.getFirstAsync<SweepRow>(
    `SELECT ${SWEEP_COLUMNS}
     FROM sweeps
     WHERE id = $id`,
    { $id: id },
  );

  return row ? mapSweepRow(row) : null;
}

export async function deleteSweep(
  database: SweepDatabase,
  id: number,
): Promise<boolean> {
  const result = await database.runAsync('DELETE FROM sweeps WHERE id = $id', {
    $id: id,
  });

  return result.changes > 0;
}

export async function updateSweepStatus(
  database: SweepDatabase,
  id: number,
  status: SweepStatus,
): Promise<Sweep | null> {
  const result = await database.runAsync(
    'UPDATE sweeps SET status = $status WHERE id = $id',
    { $id: id, $status: status },
  );

  if (result.changes === 0) {
    return null;
  }

  return getSweep(database, id);
}

export async function beginSweepUpload(
  database: SweepDatabase,
  id: number,
): Promise<Sweep | null> {
  const result = await database.runAsync(
    `UPDATE sweeps
     SET status = 'uploading',
         processingJobId = NULL,
         processingManifest = NULL
     WHERE id = $id`,
    { $id: id },
  );

  return result.changes > 0 ? getSweep(database, id) : null;
}

export async function saveSweepProcessingManifest(
  database: SweepDatabase,
  id: number,
  manifest: ProcessingManifest,
): Promise<Sweep | null> {
  if (manifest.sweepId !== id) {
    throw new Error(
      'The processing manifest does not match this saved memory.',
    );
  }

  const result = await database.runAsync(
    `UPDATE sweeps
     SET status = $status,
         processingJobId = $processingJobId,
         processingManifest = $processingManifest
     WHERE id = $id`,
    {
      $id: id,
      $processingJobId: manifest.jobId,
      $processingManifest: JSON.stringify(manifest),
      $status: manifest.status,
    },
  );

  return result.changes > 0 ? getSweep(database, id) : null;
}
