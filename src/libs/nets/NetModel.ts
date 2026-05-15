/**
 * NetModel — base class for all ONNX neural net models.
 *
 * Fixes applied:
 *
 * 1. Persistent storage denial is non-fatal
 *    requestPersistentStorage() denial was inside the main try/catch, so it
 *    threw and jumped to the catch block which called clearAllStorage() and
 *    set status to 'error'. IndexedDB still works when persistent storage is
 *    denied — the browser may just evict data under pressure. Fix: wrap the
 *    call in its own try/catch that only warns, never throws.
 *
 * 2. clearAllStorage() only on genuine corruption
 *    The catch block unconditionally called clearAllStorage() on any error,
 *    including transient ones. This wiped IndexedDB unnecessarily. Now only
 *    called for corruption signals.
 *
 * 3. initPromise lifecycle
 *    downloadModel() used to set initPromise = null before download finished,
 *    so waitUntilReady() returned immediately, isReady() returned false, and
 *    callers threw — leaving isLoading hung. Now downloadModel() assigns
 *    initPromise = this._runDownload() so callers correctly suspend.
 *
 * 4. Global session creation queue (sessionCreationQueue)
 *    InferenceSession.create() hangs silently when called concurrently across
 *    model instances. A module-level queue serializes all create() calls so
 *    only one session is built at a time.
 *
 * 5. inferenceQueue — tail is the full async span of fn()
 *    Rewritten from slot/resolveSlot pattern to direct chaining so the queue
 *    tail IS the inference, preventing overlap on slow devices.
 */

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

/**
 * Global queue that serializes InferenceSession.create() calls across ALL
 * model instances. ONNX Runtime Web hangs silently when multiple sessions
 * are created concurrently — one at a time keeps it stable.
 */
let sessionCreationQueue: Promise<unknown> = Promise.resolve()

class NetModel {
  private model!: InferenceSession
  private readonly modelUrl: string
  protected readonly options: NetModelOptions
  private readonly storage = new NetModelStorage()
  // null  = never started
  // Promise<void> = in-progress or completed (resolved = ready, rejected = error)
  private initPromise: Promise<void> | null = null
  private inferenceQueue: Promise<unknown> = Promise.resolve()

  constructor(options: NetModelOptions) {
    this.modelUrl = options.model
    this.options = options
  }

  /**
   * Serialize all ONNX run() calls — ONNX Runtime Web does not support
   * concurrent session.run() on the same InferenceSession.
   */
  protected runInference<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.inferenceQueue.then(() => fn()) as Promise<T>
    this.inferenceQueue = result.catch(() => {})
    return result
  }

  public async initializeIfNeeded(): Promise<void> {
    if (this.initPromise !== null) return
    this.options.setStatus('loading')
    this.initPromise = this.initialize()
    await this.initPromise
  }

  private async initialize(): Promise<void> {
    // Persistent storage is best-effort — denial is non-fatal.
    // IndexedDB still works; the browser may just evict data under pressure.
    try {
      await this.storage.requestPersistentStorage()
    } catch (err) {
      console.warn(`Persistent storage request failed for ${this.modelUrl} (non-fatal):`, err)
    }

    try {
      const cached = await this.storage.getModel(this.modelUrl)
      if (!cached) {
        console.log(`No cache for ${this.modelUrl}, downloading...`)
        this.options.setStatus('no-cache')
        await this._runDownload()
        return
      }

      console.log(`Cache hit for ${this.modelUrl}, loading ONNX session...`)
      await this.initializeModel(cached)
      this.options.setStatus('ready')
    } catch (err) {
      console.error(`Failed to initialize ${this.modelUrl}:`, err)
      // Only wipe storage for genuine corruption — not for permission errors
      // or transient failures. Unconditional clearAllStorage() was causing
      // models to re-download on every startup when persistent storage was denied.
      if (err instanceof Error && err.message.toLowerCase().includes('corrupt')) {
        await this.storage.clearAllStorage()
      }
      this.options.setError('Failed to load model')
      this.options.setStatus('error')
      throw err
    }
  }

  /**
   * Public entry point for manual / on-demand downloads (called from UI).
   * Assigns initPromise so waitUntilReady() suspends callers until fully done.
   */
  async downloadModel(): Promise<void> {
    this.initPromise = this._runDownload()
    await this.initPromise
  }

  /**
   * Core download + session init logic, shared by initialize() and downloadModel().
   */
  private async _runDownload(): Promise<void> {
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

  private async initializeModel(buffer: ArrayBuffer): Promise<void> {
    // Serialize session creation globally — ONNX Runtime Web hangs silently
    // when InferenceSession.create() is called concurrently across instances.
    const creation = sessionCreationQueue.then(async () => {
      console.log(`Initializing ONNX model: ${this.modelUrl}`)
      this.model = await InferenceSession.create(buffer)
      console.log(`Model ready: ${this.modelUrl}`)
    })
    // Swallow on the tail so one failure doesn't block subsequent models
    sessionCreationQueue = creation.catch(() => {})
    await creation
  }

  public get getModel(): InferenceSession {
    return this.model
  }

  public async waitUntilReady(): Promise<void> {
    if (this.initPromise !== null) await this.initPromise
  }

  public isReady(): boolean {
    return this.model !== undefined && this.model !== null
  }
}

export default NetModel