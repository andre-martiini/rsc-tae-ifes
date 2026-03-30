const DB_NAME = 'rsc-tae-documents';
const STORE_NAME = 'document-files';

interface StoredDocumentRecord {
  id: string;
  servidorId: string;
  nomeArquivo: string;
  blob: Blob;
  hash: string;
  mimeType: string;
  tamanhoBytes: number;
  savedAt: string;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putRecord(record: StoredDocumentRecord) {
  const database = await openDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    store.put(record);

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function computeSha256(arrayBuffer: ArrayBuffer) {
  const digest = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
  return bytesToHex(new Uint8Array(digest));
}

export async function persistDocumentFile(params: {
  docId: string;
  servidorId: string;
  file: File;
}) {
  const { docId, servidorId, file } = params;
  const arrayBuffer = await file.arrayBuffer();
  const hash = await computeSha256(arrayBuffer);
  const mimeType = file.type || 'application/pdf';
  const blob = new Blob([arrayBuffer], { type: mimeType });

  await putRecord({
    id: docId,
    servidorId,
    nomeArquivo: file.name,
    blob,
    hash,
    mimeType,
    tamanhoBytes: blob.size,
    savedAt: new Date().toISOString(),
  });

  return {
    hash,
    mimeType,
    tamanhoBytes: blob.size,
    caminhoStorage: `indexeddb://uploads/${servidorId}/${docId}/${encodeURIComponent(file.name)}`,
  };
}

export async function getDocumentBlob(docId: string): Promise<Blob | null> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(docId);

    request.onsuccess = () => {
      database.close();
      const record = request.result as StoredDocumentRecord | undefined;
      resolve(record?.blob ?? null);
    };
    request.onerror = () => {
      database.close();
      reject(request.error);
    };
  });
}

export async function persistDocumentBlob(params: {
  docId: string;
  servidorId: string;
  nomeArquivo: string;
  blob: Blob;
}) {
  const { docId, servidorId, nomeArquivo, blob } = params;
  const arrayBuffer = await blob.arrayBuffer();
  const hash = await computeSha256(arrayBuffer);
  const mimeType = blob.type || 'application/pdf';

  await putRecord({
    id: docId,
    servidorId,
    nomeArquivo,
    blob,
    hash,
    mimeType,
    tamanhoBytes: blob.size,
    savedAt: new Date().toISOString(),
  });

  return {
    hash,
    mimeType,
    tamanhoBytes: blob.size,
    caminhoStorage: `indexeddb://uploads/${servidorId}/${docId}/${encodeURIComponent(nomeArquivo)}`,
  };
}

export async function clearDocumentStorage() {
  const database = await openDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    store.clear();

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}
