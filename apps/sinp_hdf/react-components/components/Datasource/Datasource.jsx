
import React, { useEffect, useState, useRef, useCallback } from "react";
import debounce from "lodash.debounce";

// Cache global pour les données JSON statiques (partagé entre toutes les instances)
const jsonCache = new Map();

const Datasource = ({
  name,
  datasource,
  datatype = "json",
  searchUrlBuilder = null,
  queryParams = {},
  lazyloading = false,
  onDataFetch = () => {},
  minCharacters = 2,
  cacheDuration = null, // Durée du cache en ms (null = infini)
  children,
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  const fetchOnce = useRef(false);
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Fonction de chargement des données
  const fetchData = useCallback(
    async (searchQuery = "") => {
      // CAS 1: Chargement JSON statique avec cache
      if (datatype === "json") {
        // Vérifier d'abord le cache
        const cacheKey = datasource;
        const cachedData = jsonCache.get(cacheKey);

        if (cachedData) {
          // Vérifier si le cache est toujours valide
          if (!cacheDuration || (Date.now() - cachedData.timestamp < cacheDuration)) {
            //console.log(`📦 Données chargées depuis le cache : ${name || cacheKey}`);

            if (isMountedRef.current) {
              setData(cachedData.data);
              onDataFetch(cachedData.data);
            }
            return;
          } else {
            // Cache expiré, le supprimer
            jsonCache.delete(cacheKey);
          }
        }

        // Si pas de cache ou cache expiré, charger depuis le serveur
        if (fetchOnce.current) return;
        fetchOnce.current = true;

        setLoading(true);
        try {
          //console.log(`🌐 Chargement depuis le serveur : ${name || cacheKey}`);
          const response = await fetch(datasource);
          const rawData = await response.json();

          // Stocker dans le cache
          jsonCache.set(cacheKey, {
            data: rawData,
            timestamp: Date.now(),
          });

          if (isMountedRef.current) {
            setData(rawData);
            onDataFetch(rawData);
          }
        } catch (e) {
          console.error("Erreur JSON :", e);
          if (isMountedRef.current) {
            setError("Erreur lors du chargement des données JSON.");
          }
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
        return;
      }

      // CAS 2: Chargement WFS dynamique (pas de cache car données dynamiques)
      if (datatype === "wfs" && searchUrlBuilder) {
        if (searchQuery.length < minCharacters) {
          if (isMountedRef.current) {
            setData([]);
          }
          return;
        }

        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const url = searchUrlBuilder(searchQuery, queryParams);
        if (isMountedRef.current) {
          setLoading(true);
          setError(null);
        }

        try {
          const response = await fetch(url, { signal: abortController.signal });
          const rawData = await response.json();
          const features = rawData.features?.map((feature) => feature.properties) || [];

          if (isMountedRef.current) {
            setData(features);
            onDataFetch(features);
          }
        } catch (e) {
          if (e.name === 'AbortError') {
            console.log("Requête WFS annulée");
            return;
          }
          console.error("Erreur WFS :", e);
          if (isMountedRef.current) {
            setError("Erreur lors de la requête WFS.");
          }
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      }
    },
    [datatype, datasource, searchUrlBuilder, queryParams, minCharacters, onDataFetch, cacheDuration, name]
  );

  // Débounçage pour maîtriser les requêtes WFS fréquentes
  const debouncedFetchData = useRef(
    debounce((value) => {
      fetchData(value);
    }, 300)
  ).current;

  // Cleanup complet au démontage
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      debouncedFetchData.cancel();

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setData(null);
      setQuery("");
      setError(null);
      setLoading(false);

      // Ne pas réinitialiser fetchOnce car le cache persiste
      // fetchOnce.current = false;
    };
  }, [debouncedFetchData]);

  // Gestion des recherches dynamiques WFS
  useEffect(() => {
    if (datatype === "wfs" && query.length > 0) {
      if (query.length >= minCharacters) {
        debouncedFetchData(query);
      } else {
        setData([]);
      }
    }
  }, [query, datatype, minCharacters, debouncedFetchData]);

  // Chargement initial pour JSON
  useEffect(() => {
    if (datatype === "json" && !lazyloading) {
      fetchData();
    }
  }, [datatype, lazyloading, fetchData]);

  const handleSearchQuery = useCallback((searchQuery) => {
    setQuery(searchQuery);
  }, []);

  return children({
    data,
    loading,
    error,
    setQuery: handleSearchQuery,
  });
};

// Fonction utilitaire pour vider le cache (utile pour le développement ou le rafraîchissement)
export const clearJsonCache = (datasource) => {
  if (datasource) {
    jsonCache.delete(datasource);
    console.log(`🗑️ Cache vidé pour : ${datasource}`);
  } else {
    jsonCache.clear();
    console.log("🗑️ Tout le cache vidé");
  }
};

// Fonction pour obtenir les statistiques du cache
export const getCacheStats = () => {
  return {
    size: jsonCache.size,
    keys: Array.from(jsonCache.keys()),
  };
};

export default Datasource;