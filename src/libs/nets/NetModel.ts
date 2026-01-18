import { NetStatus } from './types'
import { InferenceSession } from 'onnxruntime-web'
import { NetModelStorage } from './storage'

interface NetModelOptions {
  model: string
  setStatus: (status: NetStatus) => void
  setProgress: (progress: number) => void
  setError: (error: string) => void
  modelType?: 'maia2' | 'leela'
}

// Global download locks to prevent duplicate downloads across all instances
const downloadLocks = new Map<string, Promise<ArrayBuffer>>()

class NetModel {
  private model!: InferenceSession
  private readonly modelUrl: string
  protected readonly options: NetModelOptions
  private readonly storage = new NetModelStorage()
  private initPromise: Promise<void>

  constructor(options: NetModelOptions) {
  this.modelUrl = options.model
  this.options = options
  this.initPromise = Promise.resolve() 
}

public async initializeIfNeeded() {
  if (this.initPromise !== Promise.resolve()) return
  this.options.setStatus('loading')
  this.initPromise = this.initialize()
}

  private async initialize() {
    try {
      await this.storage.requestPersistentStorage()

      const cached = await this.storage.getModel(this.modelUrl)
      if (!cached) {
        console.log(`No cache found for ${this.modelUrl}, starting download...`)
        this.options.setStatus('no-cache')
        await this.downloadModel()
        return
      }

      console.log(`Cache found for ${this.modelUrl}, initializing...`)
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
    try {
      // Check if this model is already being downloaded
      if (downloadLocks.has(this.modelUrl)) {
        console.log(`Download already in progress for ${this.modelUrl}, waiting...`)
        this.options.setStatus('downloading')
        const buffer = await downloadLocks.get(this.modelUrl)!
        await this.initializeModel(buffer)
        this.options.setStatus('ready')
        return
      }

      // Create a new download promise
      const downloadPromise = this._performDownload()
      downloadLocks.set(this.modelUrl, downloadPromise)

      try {
        const buffer = await downloadPromise
        await this.initializeModel(buffer)
        this.options.setStatus('ready')
      } finally {
        // Clean up the lock after download completes (success or failure)
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

    const reader = res.body.getReader()
    const len = Number(res.headers.get('Content-Length') ?? 0)

    const chunks: Uint8Array[] = []
    let received = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      // if (len) {
      //   const progress = Math.floor((received / len) * 100)
      //   this.options.setProgress(progress)
      // }
    }

    console.log(`Download complete: ${this.modelUrl} (${received} bytes)`)

    const buffer = new Uint8Array(received)
    let offset = 0
    for (const c of chunks) {
      buffer.set(c, offset)
      offset += c.length
    }

    // Store in IndexedDB
    await this.storage.storeModel(this.modelUrl, buffer.buffer)
    console.log(`Stored in IndexedDB: ${this.modelUrl}`)

    return buffer.buffer
  }

  private async initializeModel(buffer: ArrayBuffer) {
    console.log(`Initializing ONNX model: ${this.modelUrl}`)
    this.model = await InferenceSession.create(buffer)
    console.log(`Model ready: ${this.modelUrl}`)
    // console.log('ONNX inputs:', this.model.inputNames)
    // console.log('ONNX outputs:', this.model.outputNames)
  }

  public get getModel() {
    return this.model
  }

  // Wait for initialization to complete
  public async waitUntilReady(): Promise<void> {
    await this.initPromise
  }

  // Check if model is ready
  public isReady(): boolean {
    return this.model !== undefined && this.model !== null
  }
}

export default NetModel