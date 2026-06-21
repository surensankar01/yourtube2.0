import { openDB, DBSchema, IDBPDatabase } from "idb";

export interface DownloadedVideo {
  videoId: string;
  videotitle: string;
  videochanel: string;
  downloadedAt: string;
  videoBlob: Blob;
  filepath: string;
}

interface YouTubeCloneDB extends DBSchema {
  downloads: {
    key: string;
    value: DownloadedVideo;
  };
}

const DB_NAME = "youtube-downloads";
const STORE_NAME = "downloads";
const DB_VERSION = 1;

export async function initDB(): Promise<IDBPDatabase<YouTubeCloneDB>> {
  return openDB<YouTubeCloneDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "videoId" });
      }
    },
  });
}

export async function saveDownload(
  videoInfo: Omit<DownloadedVideo, "videoBlob">,
  videoBlob: Blob
): Promise<void> {
  const db = await initDB();
  await db.put(STORE_NAME, {
    ...videoInfo,
    videoBlob,
  });
}

export async function getDownload(videoId: string): Promise<DownloadedVideo | undefined> {
  if (!videoId) return undefined;
  const db = await initDB();
  return db.get(STORE_NAME, videoId);
}

export async function getAllDownloads(): Promise<DownloadedVideo[]> {
  const db = await initDB();
  return db.getAll(STORE_NAME);
}

export async function deleteDownload(videoId: string): Promise<void> {
  const db = await initDB();
  await db.delete(STORE_NAME, videoId);
}
