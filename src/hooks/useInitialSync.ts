import { useState, useEffect } from 'react';
import {
  subscribeInitialSyncState,
  getInitialSyncState,
  selectStrategy,
  cancelInitialSync,
  closeInitialSyncModal,
  type InitialSyncState,
} from '@/services/sync/initialSyncManager';

export function useInitialSync() {
  const [state, setState] = useState<InitialSyncState>(getInitialSyncState());

  useEffect(() => {
    const unsubscribe = subscribeInitialSyncState(setState);
    return unsubscribe;
  }, []);

  return {
    ...state,
    selectStrategy,
    cancelInitialSync,
    closeInitialSyncModal,
  };
}
