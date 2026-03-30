import { Servidor, SystemUser, seedServidores, seedSystemUsers } from '../data/mock';

const KEYS = {
  servidores: 'rsc-tae-servidores',
  systemUsers: 'rsc-tae-system-users',
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadServidores(): Servidor[] {
  return load<Servidor[]>(KEYS.servidores, seedServidores);
}

export function saveServidores(servidores: Servidor[]): void {
  save(KEYS.servidores, servidores);
}

export function loadSystemUsers(): SystemUser[] {
  return load<SystemUser[]>(KEYS.systemUsers, seedSystemUsers);
}

export function saveSystemUsers(users: SystemUser[]): void {
  save(KEYS.systemUsers, users);
}
