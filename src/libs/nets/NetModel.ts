/**
 * NetModel — base class for all ONNX neural net models.
 *
 * Key fixes in this version:
 *
 * 1. initPromise is NEVER set to null after initialization starts.
 *    The original downloadModel() set initPromise = null at the top, which
 *    meant any concurrent call to initializeIfNeeded() (StrictMode, Fast
 *    Refresh, re-renders) would start a second initialize() cycle. This
 *    caused the UI to flicker back to "downloading" / "no-cache" even after
 *    models were fully ready, and caused the "download again" button flash.
 *
 * 2. initialize() owns the full lifecycle including download.
 *    _runDownload() is the single internal method used by both the auto-init
 *    path and the manual downloadModel() path. downloadModel() now assigns
 *    initPromise = this._runDownload() so waitUntilReady() always has a live
 *    promise to await.
 *
 * 3. Global sessionCreationQueue serializes InferenceSession.create() calls.
 *    ONNX Runtime Web hangs silently when multiple sessions are created
 *    concurrently. A module-level queue ensures only one create() runs at a time.
 *
 * 4. requestPersistentStorage() failure is non-fatal.
 *    Denial just means the browser may evict IndexedDB data under pressure.
 *    We warn and continue — IndexedDB still works.
 *
 * 5. clearAllStorage() is only called on genuine corruption, not on every error.
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

// Per-URL download lock: prevents duplicate network requests if two callers
// race to download the same model at the same time.
const downloadLocks = new Map<string, Promise<ArrayBuffer>>()

// Global session creation queue: ONNX Runtime Web silently hangs when
// InferenceSession.create() is called concurrently across model instances.
// This queue ensures only one session is being created at any moment.
let sessionCreationQueue: Promise<unknown> = Promise.resolve()

class NetModel {
  private model!: InferenceSession
  private readonly modelUrl: string
  protected readonly options: NetModelOptions
  private readonly storage = new NetModelStorage()

  // null  = initializeIfNeeded() has never been called
  // Promise = initialization is in progress OR has already completed.
  //           NEVER reset to null after it is set — this is the key invariant.
  private initPromise: Promise<void> | null = null

  // Per-instance inference queue: ONNX does not allow concurrent session.run()
  // on the same InferenceSession.
  private inferenceQueue: Promise<unknown> = Promise.resolve()

  constructor(options: NetModelOptions) {
    this.modelUrl = options.model
    this.options = options
  }

  // ── Inference serialization ───────────────────────────────────────────────

  protected runInference<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.inferenceQueue.then(() => fn()) as Promise<T>
    // Swallow on tail so one failed inference doesn't permanently block the queue
    this.inferenceQueue = result.catch(() => {})
    return result
  }

  // ── Initialization ────────────────────────────────────────────────────────

  public async initializeIfNeeded(): Promise<void> {
    if (this.initPromise !== null) return   // already started — idempotent
    this.options.setStatus('loading')
    this.initPromise = this._initialize()
    await this.initPromise
  }

  private async _initialize(): Promise<void> {
    // Persistent storage denial is non-fatal — IndexedDB still works.
    try {
      await this.storage.requestPersistentStorage()
    } catch (err) {
      console.warn(`Persistent storage request failed for ${this.modelUrl} (non-fatal):`, err)
    }

    try {
      const cached = await this.storage.getModel(this.modelUrl)

      if (cached) {
        console.log(`Cache hit for ${this.modelUrl}, loading ONNX session...`)
        await this._createSession(cached)
        this.options.setStatus('ready')
        return
      }

      // No cache — download automatically. We do NOT call the public
      // downloadModel() here because that would overwrite initPromise.
      // Instead we call _runDownload() directly so initPromise stays as
      // the promise for this entire _initialize() call.
      console.log(`No cache for ${this.modelUrl}, downloading...`)
      this.options.setStatus('no-cache')
      await this._runDownload()

    } catch (err) {
      console.error(`Failed to initialize ${this.modelUrl}:`, err)
      // Only wipe storage on genuine corruption — not transient/permission errors
      if (err instanceof Error && err.message.toLowerCase().includes('corrupt')) {
        await this.storage.clearAllStorage()
      }
      this.options.setError('Failed to load model')
      this.options.setStatus('error')
      throw err
    }
  }

  // ── Public download (called from UI "Download" button) ────────────────────

  /**
   * Trigger an explicit download. Replaces initPromise so that any concurrent
   * waitUntilReady() callers suspend until this download fully completes.
   * Does NOT set initPromise to null at any point.
   */
  async downloadModel(): Promise<void> {
    this.initPromise = this._runDownload()
    await this.initPromise
  }

  // ── Core download logic ───────────────────────────────────────────────────

  private async _runDownload(): Promise<void> {
    try {
      // If another instance is already downloading this URL, piggyback on it
      if (downloadLocks.has(this.modelUrl)) {
        console.log(`Download already in progress for ${this.modelUrl}, waiting...`)
        this.options.setStatus('downloading')
        const buffer = await downloadLocks.get(this.modelUrl)!
        await this._createSession(buffer)
        this.options.setStatus('ready')
        return
      }

      const downloadPromise = this._performDownload()
      downloadLocks.set(this.modelUrl, downloadPromise)

      try {
        const buffer = await downloadPromise
        await this._createSession(buffer)
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

  // ── ONNX session creation (serialized globally) ───────────────────────────

  private async _createSession(buffer: ArrayBuffer): Promise<void> {
    // Chain onto the global queue so only one InferenceSession.create() runs
    // at a time across all model instances.
    const creation = sessionCreationQueue.then(async () => {
      console.log(`Initializing ONNX model: ${this.modelUrl}`)
      this.model = await InferenceSession.create(buffer)
      console.log(`Model ready: ${this.modelUrl}`)
    })
    // Tail swallows so one failure doesn't block subsequent models
    sessionCreationQueue = creation.catch(() => {})
    await creation
  }

  // ── Public API ────────────────────────────────────────────────────────────

  public get getModel(): InferenceSession {
    return this.model
  }

  /**
   * Suspends until the model is fully ready (downloaded + ONNX session loaded).
   * Safe to call at any point — if initPromise is null the model hasn't been
   * initialized yet and we return immediately (callers should check isReady()).
   */
  public async waitUntilReady(): Promise<void> {
    if (this.initPromise !== null) await this.initPromise
  }

  public isReady(): boolean {
    return this.model !== undefined && this.model !== null
  }
}

export default NetModel