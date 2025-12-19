"use client";
import Maia from '@/libs/maia/maia'
import { MaiaStatus, MaiaEngine, ModelType, MODEL_CONFIGS } from '@/libs/maia/types'
import React, {
  ReactNode,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import toast from 'react-hot-toast'

export const MaiaEngineContext = React.createContext<MaiaEngine>({
  maia2: undefined,
  maia2200: undefined,
  elitemaia: undefined,
  status: {
    maia2: 'loading',
    maia2200: 'loading',
    elitemaia: 'loading',
  },
  progress: {
    maia2: 0,
    maia2200: 0,
    elitemaia: 0,
  },
  activeModels: [],
  downloadModel: async () => {
    throw new Error('poorly provided MaiaEngineContext, missing downloadModel')
  },
})

export const MaiaEngineContextProvider: React.FC<{ children: ReactNode }> = ({
  children,
}: {
  children: ReactNode
}) => {
  const [status, setStatus] = useState<Record<ModelType, MaiaStatus>>({
    maia2: 'loading',
    maia2200: 'loading',
    elitemaia: 'loading',
  })
  
  const [progress, setProgress] = useState<Record<ModelType, number>>({
    maia2: 0,
    maia2200: 0,
    elitemaia: 0,
  })
  
  const [error, setError] = useState<Record<ModelType, string | null>>({
    maia2: null,
    maia2200: null,
    elitemaia: null,
  })

  const toastIds = useRef<Record<ModelType, string | null>>({
    maia2: null,
    maia2200: null,
    elitemaia: null,
  })

  const hasTriggeredDownload = useRef<Record<ModelType, boolean>>({
    maia2: false,
    maia2200: false,
    elitemaia: false,
  })

  // Create all three model instances
  const models = useMemo(() => {
    return {
      maia2: new Maia({
        model: MODEL_CONFIGS.maia2.path,
        modelType: MODEL_CONFIGS.maia2.modelType,
        setStatus: (s: MaiaStatus) => setStatus(prev => ({ ...prev, maia2: s })),
        setProgress: (p: number) => setProgress(prev => ({ ...prev, maia2: p })),
        setError: (e: string) => setError(prev => ({ ...prev, maia2: e })),
      }),
      maia2200: new Maia({
        model: MODEL_CONFIGS.maia2200.path,
        modelType: MODEL_CONFIGS.maia2200.modelType,
        setStatus: (s: MaiaStatus) => setStatus(prev => ({ ...prev, maia2200: s })),
        setProgress: (p: number) => setProgress(prev => ({ ...prev, maia2200: p })),
        setError: (e: string) => setError(prev => ({ ...prev, maia2200: e })),
      }),
      elitemaia: new Maia({
        model: MODEL_CONFIGS.elitemaia.path,
        modelType: MODEL_CONFIGS.elitemaia.modelType,
        setStatus: (s: MaiaStatus) => setStatus(prev => ({ ...prev, elitemaia: s })),
        setProgress: (p: number) => setProgress(prev => ({ ...prev, elitemaia: p })),
        setError: (e: string) => setError(prev => ({ ...prev, elitemaia: e })),
      }),
    }
  }, [])

  const downloadModel = useCallback(async (modelType: ModelType) => {
    try {
      setStatus(prev => ({ ...prev, [modelType]: 'downloading' }))
      await models[modelType].downloadModel()
    } catch (err) {
      setError(prev => ({
        ...prev,
        [modelType]: err instanceof Error ? err.message : 'Failed to download model'
      }))
      setStatus(prev => ({ ...prev, [modelType]: 'error' }))
    }
  }, [models])

  // Auto-download models when status is 'no-cache'
  useEffect(() => {
    (Object.keys(status) as ModelType[]).forEach(modelType => {
      if (status[modelType] === 'no-cache' && !hasTriggeredDownload.current[modelType]) {
        hasTriggeredDownload.current[modelType] = true
        console.log(`Auto-downloading ${modelType}...`)
        downloadModel(modelType)
      }
    })
  }, [status, downloadModel])

  // Get list of models that are ready
  const activeModels = useMemo(() => {
    return (Object.keys(status) as ModelType[]).filter(
      modelType => status[modelType] === 'ready'
    )
  }, [status])

  // Toast notifications for each model
  useEffect(() => {
    return () => {
      toast.dismiss()
    }
  }, [])

  useEffect(() => {
    (Object.keys(status) as ModelType[]).forEach(modelType => {
      const modelStatus = status[modelType]
      const modelName = MODEL_CONFIGS[modelType].name

      if (modelStatus === 'loading' && !toastIds.current[modelType]) {
        toastIds.current[modelType] = toast.loading(`Loading ${modelName}...`)
      } else if (modelStatus === 'downloading') {
        const downloadProgress = progress[modelType]
        if (toastIds.current[modelType]) {
          toast.loading(
            `Downloading ${modelName}... ${downloadProgress}%`,
            { id: toastIds.current[modelType]! }
          )
        } else {
          toastIds.current[modelType] = toast.loading(
            `Downloading ${modelName}... ${downloadProgress}%`
          )
        }
      } else if (modelStatus === 'ready') {
        if (toastIds.current[modelType]) {
          toast.success(`${modelName} loaded! Analysis is ready`, {
            id: toastIds.current[modelType]!,
          })
          toastIds.current[modelType] = null
        }
      } else if (modelStatus === 'error') {
        if (toastIds.current[modelType]) {
          toast.error(`Failed to load ${modelName}`, {
            id: toastIds.current[modelType]!,
          })
          toastIds.current[modelType] = null
        } else {
          toast.error(`Failed to load ${modelName}`)
        }
      } else if (modelStatus === 'no-cache') {
        // Clear loading toast when transitioning to no-cache
        if (toastIds.current[modelType]) {
          toast.dismiss(toastIds.current[modelType]!)
          toastIds.current[modelType] = null
        }
      }
    })
  }, [status, progress])

  return (
    <MaiaEngineContext.Provider
      value={{
        maia2: models.maia2,
        maia2200: models.maia2200,
        elitemaia: models.elitemaia,
        status,
        progress,
        downloadModel,
        activeModels,
      }}
    >
      {children}
    </MaiaEngineContext.Provider>
  )
}