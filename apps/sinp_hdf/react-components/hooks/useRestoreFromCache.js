import { useCallback } from 'react';
import useWFSCache from './useWFSCache';

/**
 * Hook pour récupérer les objets complets depuis le cache
 * Utilisé lors de la restauration des filtres depuis initialFilters
 * 
 * @param {string} cacheKey - Clé du cache (ex: 'taxons_selected')
 * @param {string} valueKey - Clé de l'objet (ex: 'cd_ref')
 */
export const useRestoreFromCache = (cacheKey, valueKey = 'id') => {
  const cache = useWFSCache(cacheKey, valueKey);

  /**
   * Récupère un objet depuis le cache par sa clé
   * Retourne l'objet si trouvé, sinon un objet stub avec juste la clé
   */
  const restoreFromCache = useCallback(
    (value) => {
      if (!value) return null;

      // Try to get from cache first
      const cached = cache.getFromCache(value);
      if (cached) {
        console.log(`🔄 Restored from cache ${cacheKey}:`, value);
        return cached;
      }

      // Fallback: return a stub object with just the key
      // This prevents display errors when cache misses
      console.log(`⚠️ Cache miss for ${cacheKey}:`, value);
      return { [valueKey]: value };
    },
    [cache, cacheKey, valueKey]
  );

  /**
   * Récupère plusieurs objets depuis le cache
   */
  const restoreMultipleFromCache = useCallback(
    (values) => {
      if (!Array.isArray(values)) return [];
      return values.map((value) => restoreFromCache(value)).filter(Boolean);
    },
    [restoreFromCache]
  );

  return {
    restoreFromCache,
    restoreMultipleFromCache,
  };
};

export default useRestoreFromCache;
