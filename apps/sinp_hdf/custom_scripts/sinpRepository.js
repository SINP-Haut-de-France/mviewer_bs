/**Vibe Coding amélioré d'un query builder pour le sinp_hdf (inspiré des QueryBuilder et Expression en C#)**/
window.sinpRepository = (function () {
  const _defaultParameters = {
    BASEURL: `${mviewer.env?.[mviewer.env?.CURRENT_ENV]?.GEOSERVER_BASE_URL}/wfs`,
    SERVICE: "WFS",
    VERSION: "2.0.0",
    REQUEST: "GetFeature",
    outputFormat: "application/json",
    srsName: "EPSG:2154",
  };

  /**
   * Construit une URL GeoServer à partir des paramètres donnés
   * @param {Object} options - Paramètres optionnels pour la requête WFS
   * @return {string} - URL GeoServer encodée
   */
  const _buildQueryURL = function (options = {}) {
    const finalParams = { ..._defaultParameters, ...options };
    let url = finalParams.BASEURL + "?";

    Object.keys(finalParams).forEach((key) => {
      if (key !== "BASEURL" && key !== "VIEWPARAMS") {
        url += `&${key}=${encodeURIComponent(finalParams[key])}`;
      }
    });

    if (finalParams.VIEWPARAMS) {
      // ⚠️ CRITIQUE: GeoServer SQL View nécessite l'échappement avec backslash: \: \; \,
      // Les backslashes doivent être URL-encodés en %5C dans l'URL finale
      //
      // Flux correct:
      // 1. sinpQueryBuilder produit: "DATE_DEB\:2006-02-27\;DATE_FIN\:2026-02-27\;..."
      // 2. On encode manuellement (pas encodeURIComponent qui ré-encoderait les %)
      // 3. Résultat: "DATE_DEB%5C%3A2006-02-27%5C%3BDATE_FIN%5C%3A2026-02-27%5C%3B..."

      // Encoder manuellement en remplaçant les caractères spéciaux
      let encodedViewParams = finalParams.VIEWPARAMS
        .replace(/\\/g, '%5C')   // Backslash → %5C
        .replace(/:/g, '%3A')    // Deux-points → %3A
        .replace(/;/g, '%3B')    // Point-virgule → %3B
        .replace(/,/g, '%2C')    // Virgule → %2C
        .replace(/ /g, '%20');   // Espace → %20

      url += `&VIEWPARAMS=${encodedViewParams}`;
    }

    console.log("🔗 URL générée:", url);
    return url;
  };

  /**
   * Effectue une requête WFS et retourne les données sous forme JSON
   * @param {Object} options - Paramètres pour la requête
   * @param {number} timeoutDuration - Durée du timeout en millisecondes (par défaut 1 minute)
   * @return {Promise<Object>} - Résultat de la requête au format JSON
   */
  const _fetchGeoServerData = async function (options = {}, timeoutDuration = 60000) {
    let url = _buildQueryURL(options);

    // Utiliser le proxy mviewer si configuré (pour contourner CORS)
    const proxyUrl = mviewer.getProxy?.();
    if (proxyUrl && proxyUrl !== "") {
      console.log("🔧 Utilisation du proxy mviewer:", proxyUrl);
      url = proxyUrl + encodeURIComponent(url);
    }

    // Créer un AbortController pour gérer le timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutDuration); // Timeout après 'timeoutDuration' ms

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Erreur lors de la requête GeoServer : ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Requête annulée en raison du timeout");
      } else {
        console.error(`Erreur GeoServerAPI : ${error.message}`);
      }
      throw error; // Relancer l'erreur pour la gestion en aval
    } finally {
      clearTimeout(timeout); // Annuler le timeout une fois la requête terminée
    }
  };

  // ========== API PUBLIQUE ==========

  return {
    // Fonctions principales
    buildQueryURL: _buildQueryURL,
    fetchGeoServerData: _fetchGeoServerData,
  };
})();
