/**
 * Hook pour cacher SEULEMENT les items sélectionnés depuis WFS
 * Stocke les items les plus fréquemment utilisés (usage frequency tracking)
 * 
 * ⚠️ IMPORTANT: Cache UNIQUEMENT les items explicitement sélectionnés/recherchés
 * PAS tout le flux WFS (trop lourd et inutile)
 *
 * @param {string} cacheKey - Clé unique du cache (ex: 'taxons_selected')
 * @param {string} valueKey - Clé utilisée pour identifier l'objet (ex: 'cd_ref')
 */
export const useWFSCache = (cacheKey, valueKey = 'id') => {
  const STORAGE_KEY = `wfs_cache_selected_${cacheKey}`;
  const MAX_CACHE_ITEMS = 10; // Garder seulement les 10 items les plus récurrents
  const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 jours

  /**
   * Récupère un item du cache par sa valeur clé
   * ⚠️ NE PAS incrémenter la fréquence lors de la lecture du cache
   * (on ne veut pas pénaliser les items restaurés)
   */
  const getFromCache = (value) => {
    try {
      const cacheData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const key = String(value);
      
      if (cacheData[key] && cacheData[key].data) {
        const age = Date.now() - (cacheData[key].timestamp || 0);
        
        // Vérifier si le cache a expiré
        if (age < CACHE_TTL) {
          // Update lastUsed but do NOT increment frequency on cache read
          // (frequency is only incremented on explicit selection via addToCache)
          cacheData[key].lastUsed = Date.now();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
          
          console.log(`💾 Cache hit for ${cacheKey}:`, value);
          return cacheData[key].data;
        } else {
          // Supprimer l'entrée expirée
          delete cacheData[key];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
          return null;
        }
      }
      
      return null;
    } catch (e) {
      console.warn(`Error reading WFS cache for ${cacheKey}:`, e);
      return null;
    }
  };

  /**
   * Ajoute UN item au cache (seulement items NOUVELLEMENT sélectionnés)
   * Maintient le top 10 par fréquence d'utilisation
   * Distingue: nouvelle sélection (frequency++) vs restauration (pas de change)
   */
  const addToCache = (item) => {
    try {
      if (!item || !item[valueKey]) return;
      
      const cacheData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const key = String(item[valueKey]);
      
      // Différencier: nouvel item vs item existant
      const isNewSelection = !cacheData[key];
      
      if (cacheData[key]) {
        // Item already in cache: increment frequency (user explicitly selected it again)
        cacheData[key].frequency = (cacheData[key].frequency || 1) + 1;
        cacheData[key].lastUsed = Date.now();
        console.log(`📈 Updated frequency for ${cacheKey}:`, value, `→ ${cacheData[key].frequency}`);
      } else {
        // Nouvel item: commencer à fréquence 1
        cacheData[key] = {
          data: item,
          frequency: 1,
          timestamp: Date.now(),
          lastUsed: Date.now(),
        };
        console.log(`✅ Cached new selection for ${cacheKey}:`, item[valueKey]);
      }
      
      // Si le cache dépasse MAX_CACHE_ITEMS, supprimer les moins fréquents
      const cacheKeys = Object.keys(cacheData);
      if (cacheKeys.length > MAX_CACHE_ITEMS) {
        // Trier par fréquence (ascendant) puis par lastUsed
        const sortedKeys = cacheKeys.sort((a, b) => {
          const freqDiff = (cacheData[a].frequency || 0) - (cacheData[b].frequency || 0);
          if (freqDiff !== 0) return freqDiff;
          return (cacheData[a].lastUsed || 0) - (cacheData[b].lastUsed || 0);
        });
        
        // Supprimer les items les moins fréquents jusqu'à atteindre MAX_CACHE_ITEMS
        const toRemove = cacheKeys.length - MAX_CACHE_ITEMS;
        for (let i = 0; i < toRemove; i++) {
          console.log(`🗑️ Removing least used item from cache: ${sortedKeys[i]}`);
          delete cacheData[sortedKeys[i]];
        }
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
      console.log(`💾 Added to cache ${cacheKey}:`, item[valueKey]);
    } catch (e) {
      console.warn(`Error writing to WFS cache for ${cacheKey}:`, e);
      // Pas de panic sur localStorage plein, on laisse juste fonctionner sans cache
    }
  };

  /**
   * Ajoute plusieurs items au cache (usage sélection multiple)
   */
  const addMultipleToCache = (items) => {
    if (!Array.isArray(items)) return;
    items.forEach((item) => addToCache(item));
  };

  /**
   * Récupère un item du cache ou undefined
   */
  const getOrRetrieve = (value, fallbackItem = null) => {
    const cached = getFromCache(value);
    if (cached) {
      return cached;
    }
    return fallbackItem;
  };

  /**
   * Vide complètement le cache
   */
  const clearCache = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log(`🗑️ Cache cleared for ${cacheKey}`);
    } catch (e) {
      console.warn(`Error clearing cache for ${cacheKey}:`, e);
    }
  };

  /**
   * Retourne le contenu du cache (pour debug)
   */
  const getCacheStats = () => {
    try {
      const cacheData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const items = Object.entries(cacheData).map(([key, value]) => ({
        id: key,
        frequency: value.frequency || 0,
        lastUsed: new Date(value.lastUsed || 0).toLocaleString(),
      }));
      return {
        count: items.length,
        items: items.sort((a, b) => b.frequency - a.frequency),
      };
    } catch (e) {
      return { count: 0, items: [] };
    }
  };

  return {
    getFromCache,
    addToCache,
    addMultipleToCache,
    getOrRetrieve,
    clearCache,
    getCacheStats,
  };
};

export default useWFSCache;
