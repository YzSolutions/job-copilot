const databaseName = "job-copilot-local-resumes";
const storeName = "docx-files";

export type StoredResumeFile = { id: string; fileName: string; bytes: Uint8Array };

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local résumé storage could not be opened."));
  });
}

export async function saveResumeFile(id: string, fileName: string, bytes: Uint8Array): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put({ id, fileName, bytes });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("The local résumé file could not be saved."));
  });
  database.close();
}

export async function loadResumeFile(id: string): Promise<StoredResumeFile | undefined> {
  const database = await openDatabase();
  const value = await new Promise<unknown>((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("The local résumé file could not be read."));
  });
  database.close();
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return typeof source.id === "string" && typeof source.fileName === "string" && source.bytes instanceof Uint8Array
    ? source as StoredResumeFile
    : undefined;
}
