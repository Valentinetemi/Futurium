import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import type { SQLiteBindParams, SQLiteRunResult } from 'expo-sqlite';
import initSqlJs, { type Database } from 'sql.js';

import {
  mapSweepRow,
  normalizeCreateSweepInput,
  type SweepRow,
} from '@/database/sweep-model';
import {
  beginSweepUpload,
  countPreparedSweeps,
  createSweep,
  DATABASE_VERSION,
  deleteSweep,
  getSweep,
  initializeDatabase,
  listSweeps,
  saveSweepProcessingManifest,
  type SweepDatabase,
  updateSweepStatus,
} from '@/database/sweep-repository';

type SqlJsBindValue = null | number | string | Uint8Array;
type SqlJsBindParams = Record<string, SqlJsBindValue> | SqlJsBindValue[];

function normalizeParams(params: SQLiteBindParams): SqlJsBindParams {
  if (Array.isArray(params)) {
    return params.map((value) => {
      if (typeof value === 'boolean') {
        return value ? 1 : 0;
      }

      if (value instanceof ArrayBuffer) {
        return new Uint8Array(value);
      }

      return value;
    });
  }

  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === 'boolean') {
        return [key, value ? 1 : 0];
      }

      if (value instanceof ArrayBuffer) {
        return [key, new Uint8Array(value)];
      }

      return [key, value];
    }),
  );
}

class SqlJsSweepDatabase implements SweepDatabase {
  constructor(private readonly database: Database) {}

  async execAsync(source: string) {
    this.database.exec(source);
  }

  async getAllAsync<T>(source: string, params: SQLiteBindParams) {
    const statement = this.database.prepare(source, normalizeParams(params));
    const rows: T[] = [];

    try {
      while (statement.step()) {
        rows.push(statement.getAsObject() as T);
      }
    } finally {
      statement.free();
    }

    return rows;
  }

  async getFirstAsync<T>(source: string, params: SQLiteBindParams) {
    const rows = await this.getAllAsync<T>(source, params);
    return rows[0] ?? null;
  }

  async runAsync(
    source: string,
    params: SQLiteBindParams,
  ): Promise<SQLiteRunResult> {
    this.database.run(source, normalizeParams(params));
    const lastIdResult = this.database.exec(
      'SELECT last_insert_rowid() AS lastInsertRowId',
    );
    const lastInsertRowId = Number(lastIdResult[0]?.values[0]?.[0] ?? 0);

    return {
      changes: this.database.getRowsModified(),
      lastInsertRowId,
    };
  }
}

async function createCleanTestDatabase() {
  const SQL = await initSqlJs({
    locateFile: (file) => path.resolve('node_modules/sql.js/dist', file),
  });
  const nativeDatabase = new SQL.Database();

  return {
    close: () => nativeDatabase.close(),
    database: new SqlJsSweepDatabase(nativeDatabase),
  };
}

test('initializes the complete schema against a clean database', async () => {
  const testDatabase = await createCleanTestDatabase();

  try {
    await initializeDatabase(testDatabase.database);
    await initializeDatabase(testDatabase.database);

    const version = await testDatabase.database.getFirstAsync<{
      user_version: number;
    }>('PRAGMA user_version', {});
    const columns = await testDatabase.database.getAllAsync<{ name: string }>(
      'PRAGMA table_info(sweeps)',
      {},
    );

    assert.equal(version?.user_version, DATABASE_VERSION);
    assert.deepEqual(
      columns.map((column) => column.name),
      [
        'id',
        'roomName',
        'videoUri',
        'durationSeconds',
        'createdAt',
        'status',
        'processingJobId',
        'processingManifest',
      ],
    );
  } finally {
    testDatabase.close();
  }
});

test('migrates version one records without losing saved memories', async () => {
  const testDatabase = await createCleanTestDatabase();

  try {
    await testDatabase.database.execAsync(`
      CREATE TABLE sweeps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        roomName TEXT NOT NULL,
        videoUri TEXT NOT NULL,
        durationSeconds INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        status TEXT NOT NULL
      );
      CREATE INDEX sweeps_created_at_index ON sweeps(createdAt DESC);
      INSERT INTO sweeps (
        roomName, videoUri, durationSeconds, createdAt, status
      ) VALUES (
        'Kitchen', 'file:///documents/kitchen.mov', 12,
        '2026-09-23T10:00:00.000Z', 'saved'
      );
      PRAGMA user_version = 1;
    `);

    await initializeDatabase(testDatabase.database);

    const sweeps = await listSweeps(testDatabase.database);
    assert.equal(sweeps.length, 1);
    assert.equal(sweeps[0]?.roomName, 'Kitchen');
    assert.equal(sweeps[0]?.status, 'saved');
    assert.equal(sweeps[0]?.processingJobId, null);
    assert.equal(sweeps[0]?.processingManifest, null);
  } finally {
    testDatabase.close();
  }
});

test('creates, orders, reads, updates and deletes sweep records', async () => {
  const testDatabase = await createCleanTestDatabase();

  try {
    await initializeDatabase(testDatabase.database);

    const bedroom = await createSweep(testDatabase.database, {
      createdAt: '2026-09-23T09:00:00.000Z',
      durationSeconds: 9.4,
      roomName: '  Bedroom  ',
      videoUri: 'file:///documents/bedroom.mov',
    });
    const kitchen = await createSweep(testDatabase.database, {
      createdAt: '2026-09-23T10:00:00.000Z',
      durationSeconds: 18,
      roomName: 'Kitchen',
      videoUri: 'file:///documents/kitchen.mov',
    });

    assert.equal(bedroom.roomName, 'Bedroom');
    assert.equal(bedroom.durationSeconds, 9);
    assert.equal(bedroom.status, 'saved');
    assert.equal(bedroom.processingJobId, null);
    assert.equal(bedroom.processingManifest, null);
    assert.deepEqual(
      (await listSweeps(testDatabase.database)).map((sweep) => sweep.id),
      [kitchen.id, bedroom.id],
    );
    assert.deepEqual(
      await getSweep(testDatabase.database, bedroom.id),
      bedroom,
    );

    const processing = await updateSweepStatus(
      testDatabase.database,
      kitchen.id,
      'processing',
    );
    assert.equal(processing?.status, 'processing');
    assert.equal(await deleteSweep(testDatabase.database, bedroom.id), true);
    assert.equal(await getSweep(testDatabase.database, bedroom.id), null);
    assert.equal(await deleteSweep(testDatabase.database, bedroom.id), false);
  } finally {
    testDatabase.close();
  }
});

test('persists upload and completed processing manifests on one sweep', async () => {
  const testDatabase = await createCleanTestDatabase();

  try {
    await initializeDatabase(testDatabase.database);
    const sweep = await createSweep(testDatabase.database, {
      durationSeconds: 3,
      roomName: 'Office',
      videoUri: 'file:///documents/office.mp4',
    });

    const uploading = await beginSweepUpload(testDatabase.database, sweep.id);
    assert.equal(uploading?.status, 'uploading');
    assert.equal(uploading?.processingJobId, null);

    const manifest = {
      createdAt: '2026-09-23T12:00:00.000Z',
      duration: 3,
      error: null,
      frames: [
        {
          frameId: 'frame_000001',
          thumbnailUrl:
            '/sweeps/11111111-1111-4111-8111-111111111111/thumbnails/frame_000001.jpg',
          timestamp: 0,
        },
      ],
      jobId: '11111111-1111-4111-8111-111111111111',
      rejectedBlurCount: 1,
      rejectedDuplicateCount: 1,
      retainedFrameCount: 1,
      status: 'ready' as const,
      sweepId: sweep.id,
      totalFramesSampled: 3,
    };
    const ready = await saveSweepProcessingManifest(
      testDatabase.database,
      sweep.id,
      manifest,
    );

    assert.equal(ready?.id, sweep.id);
    assert.equal(ready?.status, 'ready');
    assert.equal(ready?.processingJobId, manifest.jobId);
    assert.deepEqual(ready?.processingManifest, manifest);
    assert.equal((await listSweeps(testDatabase.database)).length, 1);
  } finally {
    testDatabase.close();
  }
});

test('counts only other spaces occupying a prepared-space slot', async () => {
  const testDatabase = await createCleanTestDatabase();

  try {
    await initializeDatabase(testDatabase.database);
    const readySweep = await createSweep(testDatabase.database, {
      durationSeconds: 4,
      roomName: 'Bedroom',
      videoUri: 'file:///documents/bedroom.mp4',
    });
    const savedSweep = await createSweep(testDatabase.database, {
      durationSeconds: 5,
      roomName: 'Kitchen',
      videoUri: 'file:///documents/kitchen.mp4',
    });
    const failedSweep = await createSweep(testDatabase.database, {
      durationSeconds: 6,
      roomName: 'Office',
      videoUri: 'file:///documents/office.mp4',
    });

    await updateSweepStatus(testDatabase.database, readySweep.id, 'ready');
    await updateSweepStatus(testDatabase.database, failedSweep.id, 'failed');

    assert.equal(
      await countPreparedSweeps(testDatabase.database, savedSweep.id),
      1,
    );
    assert.equal(
      await countPreparedSweeps(testDatabase.database, readySweep.id),
      0,
    );
  } finally {
    testDatabase.close();
  }
});

test('normalizes new sweeps and safely maps an unknown stored status', () => {
  const normalized = normalizeCreateSweepInput({
    createdAt: '2026-09-23T11:30:00Z',
    durationSeconds: 6.6,
    roomName: '  Living room ',
    videoUri: ' file:///documents/living-room.mp4 ',
  });
  const row: SweepRow = {
    ...normalized,
    id: 42,
    processingJobId: null,
    processingManifest: null,
    status: 'unexpected-status',
  };

  assert.equal(normalized.roomName, 'Living room');
  assert.equal(normalized.durationSeconds, 7);
  assert.equal(normalized.videoUri, 'file:///documents/living-room.mp4');
  assert.equal(mapSweepRow(row).status, 'failed');
});

test('rejects invalid sweep metadata before writing', async () => {
  const testDatabase = await createCleanTestDatabase();

  try {
    await initializeDatabase(testDatabase.database);

    await assert.rejects(
      createSweep(testDatabase.database, {
        durationSeconds: 31,
        roomName: 'Kitchen',
        videoUri: 'file:///documents/kitchen.mov',
      }),
      /between 0 and 30 seconds/,
    );
    assert.deepEqual(await listSweeps(testDatabase.database), []);
  } finally {
    testDatabase.close();
  }
});
