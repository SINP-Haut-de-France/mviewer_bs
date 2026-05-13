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
      const sanitizedViewParams = String(finalParams.VIEWPARAMS)
        .replace(/^;+|;+$/g, "")
        .replace(/;;+/g, ";");
      // GeoServer EXIGE: uniquement le pipe (|) encodé en %7C
      // Les deux-points (:) et points-virgules (;) doivent rester non-encodés!
      const encodedViewParams = sanitizedViewParams.replace(/\|/g, "%7C");
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
  const _fetchGeoServerData = async function (options = {}, timeoutDuration = 240000) {
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
        error.userMessage = "Le serveur met trop de temps à répondre. Merci de réessayer.";
      } else {
        console.error(`Erreur GeoServerAPI : ${error.message}`);
        if (!error.userMessage) {
          error.userMessage =
            "Impossible de récupérer les données de recherche. Vérifiez votre connexion ou réessayez.";
        }
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
