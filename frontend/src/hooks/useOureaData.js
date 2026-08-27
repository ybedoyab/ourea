import { useEffect, useState } from 'react';
import { loadOureaData } from '../services/dataService.js';

export function useOureaData() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    loadOureaData(controller.signal)
      .then(setData)
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError(error);
      });
    return () => controller.abort();
  }, []);

  return { data, loadError };
}
