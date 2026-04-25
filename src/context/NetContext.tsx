"use client";
import React, { ReactNode, useState, useMemo, useCallback, useEffect, useRef } from 'react';

import { NetStatus, ModelType, MODEL_CONFIGS } from '@/libs/nets/types';
import toast from 'react-hot-toast';
import { MaiaModel } from '@/libs/nets/MaiaModel';
import { LeelaModel } from '@/libs/nets/LeelaModel';
import { Maia3Model } from '@/libs/nets/Maia3Model';


export const NetModelContext = React.createContext<{
  maia2: MaiaModel | undefined;
  bigLeela: LeelaModel | undefined;
  elitemaia: LeelaModel | undefined;
  maia3: Maia3Model | undefined;
  downloadModel: (modelType: ModelType) => Promise<void>;
}>({
  maia2: undefined,
  bigLeela: undefined,
  elitemaia: undefined,
  maia3: undefined,
  downloadModel: async () => {
    throw new Error('poorly provided MaiaEngineContext');
  },
});

// Separate context for frequently-changing state
export const NetModelStatusContext = React.createContext<{
  status: Record<ModelType, NetStatus>;
  progress: Record<ModelType, number>;
  activeModels: ModelType[];
}>({
  status: {
    maia2: 'loading',
    bigLeela: 'loading',
    elitemaia: 'loading',
    maia3: 'loading',
  },
  progress: {
    maia2: 0,
    bigLeela: 0,
    elitemaia: 0,
    maia3: 0,
  },
  activeModels: [],
});

export const NetModelContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<Record<ModelType, NetStatus>>({
    maia2: 'loading',
    bigLeela: 'loading',
    elitemaia: 'loading',
    maia3: 'loading',
  });
  
  const [progress, setProgress] = useState<Record<ModelType, number>>({
    maia2: 0,
    bigLeela: 0,
    elitemaia: 0,
    maia3: 0,
  });
  
  const [error, setError] = useState<Record<ModelType, string | null>>({
    maia2: null,
    bigLeela: null,
    elitemaia: null,
    maia3: null,
  });

  const toastIds = useRef<Record<ModelType, string | null>>({
    maia2: null,
    bigLeela: null,
    elitemaia: null,
    maia3: null,
  });

  const hasTriggeredDownload = useRef<Record<ModelType, boolean>>({
    maia2: false,
    bigLeela: false,
    elitemaia: false,
    maia3: false,
  });

  const modelsRef = useRef<{
    maia2: MaiaModel
    bigLeela: LeelaModel
    elitemaia: LeelaModel
    maia3: Maia3Model
  } | null>(null)

  if (!modelsRef.current) {
    modelsRef.current = {
      maia2: new MaiaModel({
        model: MODEL_CONFIGS.maia2.path,
        modelType: MODEL_CONFIGS.maia2.modelType,
        setStatus: s => setStatus(prev => ({ ...prev, maia2: s })),
        setProgress: p => setProgress(prev => ({ ...prev, maia2: p })),
        setError: e => setError(prev => ({ ...prev, maia2: e })),
      }),
      bigLeela: new LeelaModel({
        model: MODEL_CONFIGS.bigLeela.path,
        modelType: MODEL_CONFIGS.bigLeela.modelType,
        setStatus: s => setStatus(prev => ({ ...prev, bigLeela: s })),
        setProgress: p => setProgress(prev => ({ ...prev, bigLeela: p })),
        setError: e => setError(prev => ({ ...prev, bigLeela: e })),
      }),
      elitemaia: new LeelaModel({
        model: MODEL_CONFIGS.elitemaia.path,
        modelType: MODEL_CONFIGS.elitemaia.modelType,
        setStatus: s => setStatus(prev => ({ ...prev, elitemaia: s })),
        setProgress: p => setProgress(prev => ({ ...prev, elitemaia: p })),
        setError: e => setError(prev => ({ ...prev, elitemaia: e })),
      }),
      maia3: new Maia3Model({
        model: MODEL_CONFIGS.maia3.path,
        modelType: 'maia3' as const,
        setStatus: s => setStatus(prev => ({ ...prev, maia3: s })),
        setProgress: p => setProgress(prev => ({ ...prev, maia3: p })),
        setError: e => setError(prev => ({ ...prev, maia3: e })),
      }),
    }
  }

  const models = modelsRef.current

  useEffect(() => {
    models.maia2.initializeIfNeeded()
    models.bigLeela.initializeIfNeeded()
    models.elitemaia.initializeIfNeeded()
    models.maia3.initializeIfNeeded()
  }, [models])

  const downloadModel = useCallback(async (modelType: ModelType) => {
    try {
      setStatus(prev => ({ ...prev, [modelType]: 'downloading' }));
      await models[modelType].downloadModel();
      // Belt-and-suspenders: ensure status is 'ready' after successful download
      setStatus(prev => ({ ...prev, [modelType]: 'ready' }));
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

  // Memoize engine context value
  const engineValue = useMemo(() => ({
    maia2: models.maia2,
    bigLeela: models.bigLeela,
    elitemaia: models.elitemaia,
    maia3: models.maia3,
    downloadModel,
  }), [models, downloadModel]);

  // Memoize status context value
  const statusValue = useMemo(() => ({
    status,
    progress,
    activeModels,
  }), [status, progress, activeModels]);

  return (
    <NetModelContext.Provider value={engineValue}>
      <NetModelStatusContext.Provider value={statusValue}>
        {children}
      </NetModelStatusContext.Provider>
    </NetModelContext.Provider>
  );
};

// Custom hooks
export const useNetModels = () => {
  const context = React.useContext(NetModelContext);
  if (!context) {
    throw new Error('useNetModel must be used within NetModelContextProvider');
  }
  return context;
};

export const useNetStatus = () => {
  const context = React.useContext(NetModelStatusContext);
  if (!context) {
    throw new Error('useNetStatus must be used within NetModelContextProvider');
  }
  return context;
};