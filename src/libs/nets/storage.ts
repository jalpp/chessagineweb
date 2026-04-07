interface ModelStorage {
  id: string
  url: string
  data: Blob
  timestamp: number
  size: number
}

export class NetModelStorage {
  private dbName = 'NetModels'
  private storeName = 'models'
  private version = 1
  private db: IDBDatabase | null = null

  async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  /**
   * Derives a stable cache key from the model URL so each model
   * gets its own IndexedDB record. Previously all models used the
   * hardcoded key 'maia-rapid-model', causing them to overwrite each other.
   */
  private modelKey(modelUrl: string): string {
    // Use the filename portion of the URL as the key, e.g.
    // '/static/nets/maia3_simplified.onnx' → 'model:maia3_simplified.onnx'
    const filename = modelUrl.split('/').pop() ?? modelUrl
    return `model:${filename}`
  }

  async storeModel(modelUrl: string, buffer: ArrayBuffer): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      const modelData: ModelStorage = {
        id: this.modelKey(modelUrl),   // ← per-model key
        url: modelUrl,
        data: new Blob([buffer]),
        timestamp: Date.now(),
        size: buffer.byteLength,
      }

      await new Promise<void>((resolve, reject) => {
        const request = store.put(modelData)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })

      console.log(`Model stored in IndexedDB: ${this.modelKey(modelUrl)}`)
    } catch (error) {
      console.error('Failed to store model in IndexedDB:', error)
      throw error
    }
  }

  async getModel(modelUrl: string): Promise<ArrayBuffer | null> {
    const key = this.modelKey(modelUrl)
    console.log(`Storage: getModel key=${key}`)

    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)

      const modelData = await new Promise<ModelStorage | null>((resolve, reject) => {
        const request = store.get(key)
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })

      if (!modelData) {
        console.log(`Storage: No cache for key=${key}`)
        return null
      }

      // Invalidate if the URL changed (e.g. model path updated)
      if (modelData.url !== modelUrl) {
        console.log(`Storage: URL mismatch for key=${key}, clearing`)
        await this.deleteModel(modelUrl)
        return null
      }

      const buffer = await modelData.data.arrayBuffer()
      console.log(`Storage: Cache hit key=${key} size=${buffer.byteLength}`)
      return buffer
    } catch (error) {
      console.error('Storage: IndexedDB operation failed:', error)
      return null
    }
  }

  async deleteModel(modelUrl: string): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(this.modelKey(modelUrl))
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to delete model from IndexedDB:', error)
    }
  }

  async getStorageInfo(): Promise<{
    supported: boolean
    quota?: number
    usage?: number
    modelSize?: number
    modelTimestamp?: number
  }> {
    try {
      const supported = 'indexedDB' in window
      if (!supported) return { supported: false }

      let quota: number | undefined
      let usage: number | undefined

      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        quota = estimate.quota
        usage = estimate.usage
      }

      return { supported: true, quota, usage }
    } catch (error) {
      console.error('Failed to get storage info:', error)
      return { supported: false }
    }
  }

  async requestPersistentStorage(): Promise<boolean> {
    try {
      if ('storage' in navigator && 'persist' in navigator.storage) {
        const isPersistent = await navigator.storage.persist()
        console.log(isPersistent ? 'Persistent storage granted' : 'Persistent storage denied')
        return isPersistent
      }
      return false
    } catch (error) {
      console.error('Failed to request persistent storage:', error)
      return false
    }
  }

  async clearAllStorage(): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      await new Promise<void>((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
      console.log('All model storage cleared')
    } catch (error) {
      console.warn('Failed to clear storage:', error)
    }
  }
}

export default NetModelStorage