import { File, Paths } from 'expo-file-system';

import {
  createSweep,
  deleteSweep,
  type SweepDatabase,
} from '@/database/sweep-repository';
import type { Sweep } from '@/database/sweep-model';

type SaveSweepInput = {
  durationSeconds: number;
  roomName: string;
  temporaryVideoUri: string;
};

function deleteFileIfPresent(uri: string) {
  const file = new File(uri);

  if (file.exists) {
    file.delete();
  }
}

function createPermanentVideoFile(source: File) {
  const extension = source.extension || '.mp4';
  const uniqueSuffix = Math.random().toString(36).slice(2, 9);

  return new File(
    Paths.document,
    `saved-memory-${Date.now()}-${uniqueSuffix}${extension}`,
  );
}

export function isSweepVideoAvailable(videoUri: string) {
  try {
    return new File(videoUri).exists;
  } catch {
    return false;
  }
}

export async function saveSweepWithVideo(
  database: SweepDatabase,
  input: SaveSweepInput,
): Promise<Sweep> {
  const temporaryVideo = new File(input.temporaryVideoUri);

  if (!temporaryVideo.exists) {
    throw new Error('The recorded video is no longer available.');
  }

  const permanentVideo = createPermanentVideoFile(temporaryVideo);
  await temporaryVideo.copy(permanentVideo);

  try {
    const sweep = await createSweep(database, {
      durationSeconds: input.durationSeconds,
      roomName: input.roomName,
      status: 'saved',
      videoUri: permanentVideo.uri,
    });

    try {
      deleteFileIfPresent(temporaryVideo.uri);
    } catch {
      // A cache copy can safely remain; the permanent file and row are valid.
    }

    return sweep;
  } catch (error) {
    deleteFileIfPresent(permanentVideo.uri);
    throw error;
  }
}

export async function deleteSweepWithVideo(
  database: SweepDatabase,
  sweep: Sweep,
): Promise<boolean> {
  deleteFileIfPresent(sweep.videoUri);
  return deleteSweep(database, sweep.id);
}
