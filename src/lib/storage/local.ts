import { normalize, type AppData, type StorageAdapter } from './adapter'

const KEY = 'takt:data'

export class LocalStorageAdapter implements StorageAdapter {
  async load(): Promise<AppData | null> {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? normalize(JSON.parse(raw)) : null
    } catch {
      return null
    }
  }

  async save(data: AppData): Promise<void> {
    localStorage.setItem(KEY, JSON.stringify(data))
  }
}
