import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const requiredEnvVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([, v]) => !v)
  .map(([k]) => `VITE_FIREBASE_${k.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`);

if (missingVars.length > 0) {
  console.error(
    `[feedbackService] Variáveis de ambiente ausentes: ${missingVars.join(", ")}. ` +
      "O envio de feedbacks está desabilitado."
  );
}

const firebaseReady = missingVars.length === 0;

const app = firebaseReady
  ? getApps().length > 0
    ? getApps()[0]
    : initializeApp(requiredEnvVars)
  : null;

const db = app ? getFirestore(app) : null;

const LOCAL_STORAGE_KEY = "@rsc-feedback-queue";

export interface FeedbackAttachment {
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export interface FeedbackPayload {
  nome: string;
  email: string;
  mensagem: string;
  tipo: "bug" | "sugestao" | "elogio" | "duvida" | "outro";
  tela: string;
  rota: string;
  resolucao: string;
  navegador: string;
  attachments?: FeedbackAttachment[];
  createdAt?: ReturnType<typeof serverTimestamp>;
}

type QueuedItem = Omit<FeedbackPayload, "createdAt">;

function readQueue(): QueuedItem[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedItem[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
}

export const uploadFeedbackAttachments = async (files: File[]): Promise<FeedbackAttachment[]> => {
  if (!app || !firebaseReady) return [];

  const storage = getStorage(app);
  const results: FeedbackAttachment[] = [];

  for (const file of files) {
    const uuid = crypto.randomUUID();
    const storageRef = ref(storage, `feedbacks/${uuid}/${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    results.push({ url, name: file.name, size: file.size, mimeType: file.type });
  }

  return results;
};

export const sendFeedback = async (
  payload: Omit<FeedbackPayload, "createdAt">
): Promise<{ success: boolean; offline?: boolean }> => {
  if (!db || !firebaseReady) {
    console.warn("[feedbackService] Firebase não configurado, salvando localmente.");
    const queue = readQueue();
    writeQueue([...queue, payload]);
    return { success: false, offline: true };
  }

  try {
    await addDoc(collection(db, "feedbacks"), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("[feedbackService] Falha ao enviar, enfileirando localmente:", error);
    const queue = readQueue();
    writeQueue([...queue, payload]);
    return { success: false, offline: true };
  }
};

export const processOfflineQueue = async (): Promise<void> => {
  if (!db || !firebaseReady) return;

  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return;

  localStorage.removeItem(LOCAL_STORAGE_KEY);

  let queue: QueuedItem[];
  try {
    queue = JSON.parse(raw);
  } catch {
    return;
  }

  if (queue.length === 0) return;

  const failed: QueuedItem[] = [];
  for (const item of queue) {
    try {
      await addDoc(collection(db, "feedbacks"), {
        ...item,
        createdAt: serverTimestamp(),
        retry: true,
      });
    } catch {
      failed.push(item);
    }
  }

  if (failed.length > 0) {
    const newItems = readQueue();
    writeQueue([...failed, ...newItems]);
  }
};
