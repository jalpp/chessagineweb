import { NetStatus } from './types'
import { InferenceSession } from 'onnxruntime-web'
import { NetModelStorage } from './storage'

interface NetModelOptions {
  model: string
  setStatus: (status: NetStatus) => void
  setProgress: (progress: number) => void
  setError: (error: string) => void
  modelType?: 'maia2' | 'leela' | 'maia3'
}

// Global download locks to prevent duplicate downloads across all instances
const downloadLocks = new Map<string, Promise<ArrayBuffer>>()

class NetModel {
  private model!: InferenceSession
  private readonly modelUrl: string
  protected readonly options: NetModelOptions
  private readonly storage = new NetModelStorage()
  private initPromise: Promise<void> | null = null  // null = not started yet

  constructor(options: NetModelOptions) {
    this.modelUrl = options.model
    this.options = options
  }

  
  public async initializeIfNeeded() {
    if (this.initPromise !== null) return   // already started or done
    this.options.setStatus('loading')
    this.initPromise = this.initialize()
    await this.initPromise
  }

  private async initialize() {
    try {
      await this.storage.requestPersistentStorage()

      const cached = await this.storage.getModel(this.modelUrl)
      if (!cached) {
        console.log(`No cache for ${this.modelUrl}, downloading...`)
        this.options.setStatus('no-cache')
        await this.downloadModel()
        return
      }

      console.log(`Cache hit for ${this.modelUrl}, loading ONNX session...`)
      await this.initializeModel(cached)
      this.options.setStatus('ready')
    } catch (err) {
      console.error(`Failed to initialize ${this.modelUrl}:`, err)
      await this.storage.clearAllStorage()
      this.options.setError('Failed to load model')
      this.options.setStatus('error')
    }
  }

  async downloadModel() {
    // Reset initPromise so waitUntilReady() works correctly after a manual retry
    this.initPromise = null
    try {
      if (downloadLocks.has(this.modelUrl)) {
        console.log(`Download already in progress for ${this.modelUrl}, waiting...`)
        this.options.setStatus('downloading')
        const buffer = await downloadLocks.get(this.modelUrl)!
        await this.initializeModel(buffer)
        this.options.setStatus('ready')
        return
      }

      const downloadPromise = this._performDownload()
      downloadLocks.set(this.modelUrl, downloadPromise)

      try {
        const buffer = await downloadPromise
        await this.initializeModel(buffer)
        this.options.setStatus('ready')
      } finally {
        downloadLocks.delete(this.modelUrl)
      }
    } catch (e) {
      console.error(`Download failed for ${this.modelUrl}:`, e)
      this.options.setError('Download failed')
      this.options.setStatus('error')
      throw e
    }
  }

  private async _performDownload(): Promise<ArrayBuffer> {
    this.options.setStatus('downloading')
    this.options.setProgress(0)

    console.log(`Starting download: ${this.modelUrl}`)

    const res = await fetch(this.modelUrl)
    if (!res.ok || !res.body) {
      throw new Error(`Download failed: ${res.status} ${res.statusText}`)
    }

    const contentLength = parseInt(res.headers.get('content-length') ?? '0', 10)
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      if (contentLength > 0) {
        const progress = Math.min(99, Math.floor((received / contentLength) * 100))
        this.options.setProgress(progress)
      }

    }

    console.log(`Download complete: ${this.modelUrl} (${received} bytes)`)

    const buffer = new Uint8Array(received)
    let offset = 0
    for (const c of chunks) {
      buffer.set(c, offset)
      offset += c.length
    }

    await this.storage.storeModel(this.modelUrl, buffer.buffer)
    console.log(`Stored in IndexedDB: ${this.modelUrl}`)

    this.options.setProgress(100)
    return buffer.buffer
  }

  private async initializeModel(buffer: ArrayBuffer) {
    console.log(`Initializing ONNX model: ${this.modelUrl}`)
    this.model = await InferenceSession.create(buffer)
    console.log(`Model ready: ${this.modelUrl}`)
  }

  public get getModel() {
    return this.model
  }

  public async waitUntilReady(): Promise<void> {
    if (this.initPromise) await this.initPromise
  }

  public isReady(): boolean {
    return this.model !== undefined && this.model !== null
  }
}

export default NetModel