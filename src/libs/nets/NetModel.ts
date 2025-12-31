import { NetStatus } from './types'
import { InferenceSession} from 'onnxruntime-web'
import { NetModelStorage } from './storage'


interface NetModelOptions {
  model: string
  setStatus: (status: NetStatus) => void
  setProgress: (progress: number) => void
  setError: (error: string) => void
  modelType?: 'maia2' | 'leela'
}

class NetModel {
  private model!: InferenceSession
  private readonly modelUrl: string
  private readonly options: NetModelOptions
  private readonly storage = new NetModelStorage()

  constructor(options: NetModelOptions) {
    this.modelUrl = options.model
    this.options = options
    this.options.setStatus('loading')
    this.initialize()
  }

  private async initialize() {
    try {
      await this.storage.requestPersistentStorage()

      const cached = await this.storage.getModel(this.modelUrl)
      if (!cached) {
        this.options.setStatus('no-cache')
        return
      }

      await this.initializeModel(cached)
      this.options.setStatus('ready')
    } catch (err) {
      console.error(err)
      await this.storage.clearAllStorage()
      this.options.setError('Failed to load model')
      this.options.setStatus('no-cache')
    }
  }

  async downloadModel() {
    try {
      this.options.setStatus('downloading')
      this.options.setProgress(0)

      const res = await fetch(this.modelUrl)
      if (!res.ok || !res.body) throw new Error('Download failed')

      const reader = res.body.getReader()
      const len = Number(res.headers.get('Content-Length') ?? 0)

      const chunks: Uint8Array[] = []
      let received = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        received += value.length
        if (len) this.options.setProgress(Math.floor((received / len) * 100))
      }

      const buffer = new Uint8Array(received)
      let offset = 0
      for (const c of chunks) {
        buffer.set(c, offset)
        offset += c.length
      }

      await this.storage.storeModel(this.modelUrl, buffer.buffer)
      await this.initializeModel(buffer.buffer)

      this.options.setStatus('ready')
    } catch (e) {
      console.error(e)
      this.options.setError('Download failed')
      this.options.setStatus('error')
    }
  }

  private async initializeModel(buffer: ArrayBuffer) {
    this.model = await InferenceSession.create(buffer)
    // console.log('ONNX inputs:', this.model.inputNames)
    // console.log('ONNX outputs:', this.model.outputNames)
  }

  public get getModel(){
    return this.model;
  }

}

export default NetModel