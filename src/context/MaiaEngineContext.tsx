"use client";
import React, { ReactNode, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Maia from '@/libs/maia/maia';
import { MaiaStatus, MaiaEngine, ModelType, MODEL_CONFIGS } from '@/libs/maia/types';
import toast from 'react-hot-toast';

// Stable context for models and methods
export const MaiaEngineContext = React.createContext<{
  maia2: Maia | undefined;
  bigLeela: Maia | undefined;
  elitemaia: Maia | undefined;
  downloadModel: (modelType: ModelType) => Promise<void>;
}>({
  maia2: undefined,
  bigLeela: undefined,
  elitemaia: undefined,
  downloadModel: async () => {
    throw new Error('poorly provided MaiaEngineContext');
  },
});

// Separate context for frequently-changing state
export const MaiaStatusContext = React.createContext<{
  status: Record<ModelType, MaiaStatus>;
  progress: Record<ModelType, number>;
  activeModels: ModelType[];
}>({
  status: {
    maia2: 'loading',
    bigLeela: 'loading',
    elitemaia: 'loading',
  },
  progress: {
    maia2: 0,
    bigLeela: 0,
    elitemaia: 0,
  },
  activeModels: [],
});

export const MaiaEngineContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<Record<ModelType, MaiaStatus>>({
    maia2: 'loading',
    bigLeela: 'loading',
    elitemaia: 'loading',
  });
  
  const [progress, setProgress] = useState<Record<ModelType, number>>({
    maia2: 0,
    bigLeela: 0,
    elitemaia: 0,
  });
  
  const [error, setError] = useState<Record<ModelType, string | null>>({
    maia2: null,
    bigLeela: null,
    elitemaia: null,
  });

  const toastIds = useRef<Record<ModelType, string | null>>({
    maia2: null,
    bigLeela: null,
    elitemaia: null,
  });

  const hasTriggeredDownload = useRef<Record<ModelType, boolean>>({
    maia2: false,
    bigLeela: false,
    elitemaia: false,
  });

  // Memoize models - they never change
  const models = useMemo(() => ({
    maia2: new Maia({
      model: MODEL_CONFIGS.maia2.path,
      modelType: MODEL_CONFIGS.maia2.modelType,
      setStatus: (s: MaiaStatus) => setStatus(prev => ({ ...prev, maia2: s })),
      setProgress: (p: number) => setProgress(prev => ({ ...prev, maia2: p })),
      setError: (e: string) => setError(prev => ({ ...prev, maia2: e })),
    }),
    bigLeela: new Maia({
      model: MODEL_CONFIGS.bigLeela.path,
      modelType: MODEL_CONFIGS.bigLeela.modelType,
      setStatus: (s: MaiaStatus) => setStatus(prev => ({ ...prev, bigLeela: s })),
      setProgress: (p: number) => setProgress(prev => ({ ...prev, bigLeela: p })),
      setError: (e: string) => setError(prev => ({ ...prev, bigLeela: e })),
    }),
    elitemaia: new Maia({
      model: MODEL_CONFIGS.elitemaia.path,
      modelType: MODEL_CONFIGS.elitemaia.modelType,
      setStatus: (s: MaiaStatus) => setStatus(prev => ({ ...prev, elitemaia: s })),
      setProgress: (p: number) => setProgress(prev => ({ ...prev, elitemaia: p })),
      setError: (e: string) => setError(prev => ({ ...prev, elitemaia: e })),
    }),
  }), []); 

  const downloadModel = useCallback(async (modelType: ModelType) => {
    try {
      setStatus(prev => ({ ...prev, [modelType]: 'downloading' }));
      await models[modelType].downloadModel();
    } catch (err) {
      setError(prev => ({
        ...prev,
        [modelType]: err instanceof Error ? err.message : 'Failed to download model'
      }));
      setStatus(prev => ({ ...prev, [modelType]: 'error' }));
    }
  }, [models]);


  const activeModels = useMemo(() => {
    return (Object.keys(status) as ModelType[]).filter(
      modelType => status[modelType] === 'ready'
    );
  }, [status]);

  // Toast notifications
  useEffect(() => {
    return () => {
      toast.dismiss();
    };
  }, []);

  useEffect(() => {
    (Object.keys(status) as ModelType[]).forEach(modelType => {
      const modelStatus = status[modelType];
      const modelName = MODEL_CONFIGS[modelType].name;

      if (modelStatus === 'loading' && !toastIds.current[modelType]) {
        toastIds.current[modelType] = toast.loading(`Loading ${modelName}...`);
      } else if (modelStatus === 'downloading') {
        const downloadProgress = progress[modelType];
        if (toastIds.current[modelType]) {
          toast.loading(
            `Downloading ${modelName}... ${downloadProgress}%`,
            { id: toastIds.current[modelType]! }
          );
        } else {
          toastIds.current[modelType] = toast.loading(
            `Downloading ${modelName}... ${downloadProgress}%`
          );
        }
      } else if (modelStatus === 'ready') {
        if (toastIds.current[modelType]) {
          toast.success(`${modelName} loaded! Analysis is ready`, {
            id: toastIds.current[modelType]!,
          });
          toastIds.current[modelType] = null;
        }
      } else if (modelStatus === 'error') {
        if (toastIds.current[modelType]) {
          toast.error(`Failed to load ${modelName}`, {
            id: toastIds.current[modelType]!,
          });
          toastIds.current[modelType] = null;
        } else {
          toast.error(`Failed to load ${modelName}`);
        }
      } else if (modelStatus === 'no-cache') {
        if (toastIds.current[modelType]) {
          toast.dismiss(toastIds.current[modelType]!);
          toastIds.current[modelType] = null;
        }
      }
    });
  }, [status, progress]);

  // Memoize engine context value
  const engineValue = useMemo(() => ({
    maia2: models.maia2,
    bigLeela: models.bigLeela,
    elitemaia: models.elitemaia,
    downloadModel,
  }), [models, downloadModel]);

  // Memoize status context value
  const statusValue = useMemo(() => ({
    status,
    progress,
    activeModels,
  }), [status, progress, activeModels]);

  return (
    <MaiaEngineContext.Provider value={engineValue}>
      <MaiaStatusContext.Provider value={statusValue}>
        {children}
      </MaiaStatusContext.Provider>
    </MaiaEngineContext.Provider>
  );
};

// Custom hooks
export const useMaiaEngineModels = () => {
  const context = React.useContext(MaiaEngineContext);
  if (!context) {
    throw new Error('useMaiaEngine must be used within MaiaEngineContextProvider');
  }
  return context;
};

export const useMaiaStatus = () => {
  const context = React.useContext(MaiaStatusContext);
  if (!context) {
    throw new Error('useMaiaStatus must be used within MaiaEngineContextProvider');
  }
  return context;
};