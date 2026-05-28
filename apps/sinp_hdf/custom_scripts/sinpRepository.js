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
  const _FUNCTION_TYPENAME_PREFIX = "fn_";

  const _sanitizeViewParams = function (viewParams) {
    return String(viewParams).replace(/^;+|;+$/g, "").replace(/;;+/g, ";");
  };

  const _normalizeFinalParams = function (options = {}) {
    const finalParams = { ..._defaultParameters, ...options };

    if (finalParams.VIEWPARAMS) {
      finalParams.VIEWPARAMS = _sanitizeViewParams(finalParams.VIEWPARAMS);
    }

    return finalParams;
  };

  const _normalizeTypeName = function (typeName) {
    if (typeof typeName !== "string") {
      return "";
    }

    const trimmedTypeName = typeName.trim();
    if (!trimmedTypeName) {
      return "";
    }

    return trimmedTypeName.includes(":")
      ? trimmedTypeName.split(":").pop().trim()
      : trimmedTypeName;
  };

  const _escapePostViewParams = function (viewParams = "") {
    let escapedViewParams = "";

    for (let index = 0; index < viewParams.length; index += 1) {
      const currentChar = viewParams[index];
      const previousChar = index > 0 ? viewParams[index - 1] : "";

      if (currentChar === "," && previousChar !== "\\") {
        escapedViewParams += "\\,";
        continue;
      }

      escapedViewParams += currentChar;
    }

    return escapedViewParams;
  };

  const _shouldUsePost = function (options = {}) {
    return (
      Boolean(options.VIEWPARAMS) &&
      _normalizeTypeName(options.TYPENAME).startsWith(_FUNCTION_TYPENAME_PREFIX)
    );
  };

  const _resolveFetchUrl = function (url) {
    const proxyUrl = mviewer.getProxy?.();
    if (proxyUrl && proxyUrl !== "") {
      console.log("🔧 Utilisation du proxy mviewer:", proxyUrl);
      return proxyUrl + encodeURIComponent(url);
    }

    return url;
  };

  /**
   * Construit une URL GeoServer à partir des paramètres donnés
   * @param {Object} options - Paramètres optionnels pour la requête WFS
   * @return {string} - URL GeoServer encodée
   */
  const _buildQueryURL = function (options = {}) {
    const finalParams = _normalizeFinalParams(options);
    let url = finalParams.BASEURL + "?";

    Object.keys(finalParams).forEach((key) => {
      if (key !== "BASEURL" && key !== "VIEWPARAMS") {
        url += `&${key}=${encodeURIComponent(finalParams[key])}`;
      }
    });

    if (finalParams.VIEWPARAMS) {
      // Compat legacy: si un pipe subsiste dans VIEWPARAMS, on le conserve encodé.
      // Les VIEWPARAMS générés utilisent désormais "_" pour les listes.
      const encodedViewParams = finalParams.VIEWPARAMS.replace(/\|/g, "%7C");
      url += `&VIEWPARAMS=${encodedViewParams}`;
    }

    console.log("🔗 URL générée:", url);
    return url;
  };

  /**
   * Construit une requête POST GeoServer x-www-form-urlencoded
   * @param {Object} options - Paramètres optionnels pour la requête WFS
   * @return {{url: string, headers: Object, body: URLSearchParams}} - Configuration POST
   */
  const _buildPostRequest = function (options = {}) {
    const finalParams = _normalizeFinalParams(options);
    const body = new URLSearchParams();

    Object.keys(finalParams).forEach((key) => {
      if (key === "BASEURL") {
        return;
      }

      const value =
        key === "VIEWPARAMS"
          ? _escapePostViewParams(finalParams[key])
          : finalParams[key];

      body.append(key, value);
    });

    console.log("📮 Requête POST générée:", `${finalParams.BASEURL} :: ${body.toString()}`);

    return {
      url: finalParams.BASEURL,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    };
  };

  const _fetchGeoServerJSON = async function (
    url,
    fetchOptions = {},
    timeoutDuration = 960000
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutDuration);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de la requête GeoServer : ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Requête annulée en raison du timeout");
        error.userMessage =
          "Le serveur met trop de temps à répondre. Merci de réessayer.";
      } else {
        console.error(`Erreur GeoServerAPI : ${error.message}`);
        if (!error.userMessage) {
          error.userMessage =
            "Impossible de récupérer les données de recherche. Vérifiez votre connexion ou réessayez.";
        }
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  /**
   * Effectue une requête WFS en GET et retourne les données sous forme JSON
   * @param {Object} options - Paramètres pour la requête
   * @param {number} timeoutDuration - Durée du timeout en millisecondes (par défaut 1 minute)
   * @return {Promise<Object>} - Résultat de la requête au format JSON
   */
  const _fetchGeoServerDataGet = async function (options = {}, timeoutDuration = 960000) {
    const url = _resolveFetchUrl(_buildQueryURL(options));
    return _fetchGeoServerJSON(url, {}, timeoutDuration);
  };

  /**
   * Effectue une requête WFS en POST x-www-form-urlencoded
   * @param {Object} options - Paramètres pour la requête
   * @param {number} timeoutDuration - Durée du timeout en millisecondes (par défaut 1 minute)
   * @return {Promise<Object>} - Résultat de la requête au format JSON
   */
  const _fetchGeoServerDataPost = async function (options = {}, timeoutDuration = 960000) {
    const request = _buildPostRequest(options);
    const url = _resolveFetchUrl(request.url);

    return _fetchGeoServerJSON(
      url,
      {
        method: "POST",
        headers: request.headers,
        body: request.body,
      },
      timeoutDuration
    );
  };

  /**
   * Effectue une requête WFS et choisit automatiquement GET ou POST
   * @param {Object} options - Paramètres pour la requête
   * @param {number} timeoutDuration - Durée du timeout en millisecondes (par défaut 1 minute)
   * @return {Promise<Object>} - Résultat de la requête au format JSON
   */
  const _fetchGeoServerData = async function (options = {}, timeoutDuration = 960000) {
    if (_shouldUsePost(options)) {
      return _fetchGeoServerDataPost(options, timeoutDuration);
    }

    return _fetchGeoServerDataGet(options, timeoutDuration);
  };

  // ========== API PUBLIQUE ==========

  return {
    // Fonctions principales
    buildQueryURL: _buildQueryURL,
    buildPostRequest: _buildPostRequest,
    fetchGeoServerData: _fetchGeoServerData,
    fetchGeoServerDataGet: _fetchGeoServerDataGet,
    fetchGeoServerDataPost: _fetchGeoServerDataPost,
    shouldUsePost: _shouldUsePost,
  };
})();
