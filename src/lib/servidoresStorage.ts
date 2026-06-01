import { normalizeText } from './utils';

const DB_NAME = 'rsc-tae-servidores';
const STORE_NAME = 'servidores';
const DB_VERSION = 1;

export interface ServidorBase {
  id: string; // Id_SERVIDOR_PORTAL
  nome: string;
  nome_search: string; // normalized for search
  matricula: string;
  descricao_cargo: string;
  classe_cargo: string;
  cod_org_lotacao: string;
  org_lotacao: string;
  tipo_vinculo: string;
  situacao_vinculo: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('nome_search', 'nome_search', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearDatabase(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getServidoresCount(): Promise<number> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch {
    return 0;
  }
}

export async function saveServidoresBatch(
  rawRecords: any[],
  onProgress?: (percent: number) => void
): Promise<void> {
  const db = await openDatabase();

  // Clear database first
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Batch insert
  const batchSize = 10000;
  let index = 0;

  while (index < rawRecords.length) {
    const batch = rawRecords.slice(index, index + batchSize);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      batch.forEach((record) => {
        // Map columns correctly, accepting both original CSV headers and lowercase properties
        const id = String(record.Id_SERVIDOR_PORTAL || record.id_servidor_portal || record.id || `srv-db-${Math.random()}`);
        const nome = record.NOME || record.nome || '';
        const matricula = record.MATRICULA || record.matricula || '';
        const descricao_cargo = record.DESCRICAO_CARGO || record.descricao_cargo || '';
        const classe_cargo = record.CLASSE_CARGO || record.classe_cargo || '';
        const cod_org_lotacao = record.COD_ORG_LOTACAO || record.cod_org_lotacao || '';
        const org_lotacao = record.ORG_LOTACAO || record.org_lotacao || '';
        const tipo_vinculo = record.TIPO_VINCULO || record.tipo_vinculo || '';
        const situacao_vinculo = record.SITUACAO_VINCULO || record.situacao_vinculo || '';

        const item: ServidorBase = {
          id,
          nome,
          nome_search: normalizeText(nome),
          matricula,
          descricao_cargo,
          classe_cargo,
          cod_org_lotacao,
          org_lotacao,
          tipo_vinculo,
          situacao_vinculo,
        };

        store.put(item);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    index += batchSize;
    if (onProgress) {
      onProgress(Math.min(100, Math.round((index / rawRecords.length) * 100)));
    }
  }

  db.close();
}

export async function searchServidorByName(
  query: string,
  limit = 10
): Promise<ServidorBase[]> {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('nome_search');

    // Matches any key >= normalizedQuery and < normalizedQuery + next char
    const range = IDBKeyRange.bound(normalizedQuery, normalizedQuery + '\uffff');
    const request = index.openCursor(range);
    const results: ServidorBase[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        db.close();
        resolve(results);
      }
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}
