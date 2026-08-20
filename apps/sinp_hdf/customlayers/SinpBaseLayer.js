/**
 * CLASSE ABSTRAITE: SinpBaseLayer
 * ================================
 * Classe de base réutilisable pour tous les layers SINP.
 *
 * Contrat:
 * - entrée: un objet de filtres déjà normalisé côté client
 * - sortie: une requête GeoServer WFS avec TYPENAME + VIEWPARAMS (+ CQL_FILTER si besoin legacy)
 * - rendu: mise à jour du layer OL + injection du HTML du template dans le panneau mviewer
 */
const PANEL_REVEAL_HANDLE_CONFIG = {
  "right-panel": {
    positionClass: "mv-panel-reveal-handle--right",
    iconClass: "fa-chevron-left",
    panelLabel: "panneau latéral",
  },
  "bottom-panel": {
    positionClass: "mv-panel-reveal-handle--bottom",
    iconClass: "fa-chevron-up",
    panelLabel: "panneau inférieur",
  },
  "top-panel": {
    positionClass: "mv-panel-reveal-handle--top",
    iconClass: "fa-chevron-down",
    panelLabel: "panneau supérieur",
  },
};

class SinpBaseLayer {
  constructor(layerId, typeName, config = {}) {
    this.layerId = layerId;
    this.typeName = typeName;
    this.maxZoom = config.maxZoom || 15;
    this.style = config.style || this._getDefaultStyle();
    this.format = new ol.format.GeoJSON();
    this.serverStyle = config.serverStyle || null;
    this._resolvedServerStyleName = this.serverStyle?.styleName || "";
    this.serverRenderOnly = config.serverRenderOnly === true;
    this.serverRenderRatio = config.serverRenderRatio || 1.5;
    this.defaultSearchExtent =
      config.defaultSearchExtent || [550000, 6900000, 815000, 7115000];
    this._serverStyleActive = false;
    this._pendingServerRenderPromise = Promise.resolve();
    this._serverInfoFormat = config.serverInfoFormat || "application/vnd.ogc.gml";
    this._serverInfoFeatureCount = config.serverInfoFeatureCount || 10;
    this._selectionHighlightStyle = this._createSelectionHighlightStyle();
    this._selectionLayer = this._createSelectionLayer();

    this.layer = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: this.style,
    });

    if (this.serverStyle?.enabled) {
      this._serverRenderLayer = this._createServerRenderLayer();
      this.layer.on("change:visible", () => this._syncServerRenderLayerState());
      this.layer.on("change:opacity", () => this._syncServerRenderLayerState());
    }
  }

  static _getServerRenderLoaderState() {
    const stateKey = "__sinpServerRenderLoader";
    window[stateKey] = window[stateKey] || {
      pendingCount: 0,
      mapBlockCount: 0,
      hideTimer: null,
      messages: [],
    };

    return window[stateKey];
  }

  static _ensureServerRenderLoaderElement() {
    let loader = document.getElementById("sinp-server-render-loader");

    if (loader) {
      return loader;
    }

    loader = document.createElement("div");
    loader.id = "sinp-server-render-loader";
    loader.setAttribute("role", "status");
    loader.setAttribute("aria-live", "polite");
    loader.setAttribute("aria-hidden", "true");
    Object.assign(loader.style, {
      position: "fixed",
      right: "24px",
      bottom: "24px",
      zIndex: "99999",
      display: "none",
      alignItems: "center",
      gap: "10px",
      maxWidth: "360px",
      padding: "10px 14px",
      borderRadius: "999px",
      background: "rgba(15, 23, 42, 0.92)",
      color: "#ffffff",
      boxShadow: "0 10px 28px rgba(15, 23, 42, 0.28)",
      fontSize: "13px",
      fontWeight: "600",
      pointerEvents: "none",
    });

    loader.innerHTML =
      '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i>' +
      '<span class="sinp-server-render-loader-message">Rafraîchissement des données cartographiques…</span>';

    document.body.appendChild(loader);
    return loader;
  }

  static _ensureMapBlockerElement() {
    let blocker = document.getElementById("sinp-map-loading-blocker");

    if (blocker) {
      return blocker;
    }

    blocker = document.createElement("div");
    blocker.id = "sinp-map-loading-blocker";
    blocker.setAttribute("aria-hidden", "true");
    Object.assign(blocker.style, {
      position: "fixed",
      display: "none",
      zIndex: "99998",
      background: "transparent",
      cursor: "progress",
      pointerEvents: "all",
    });

    document.body.appendChild(blocker);
    return blocker;
  }

  static _syncMapBlocker() {
    const state = this._getServerRenderLoaderState();
    const blocker = this._ensureMapBlockerElement();
    const mapElement = document.getElementById("map");
    const shouldBlock = state.mapBlockCount > 0 && mapElement;

    blocker.style.display = shouldBlock ? "block" : "none";
    blocker.setAttribute("aria-hidden", shouldBlock ? "false" : "true");

    if (!shouldBlock) {
      return;
    }

    const mapBounds = mapElement.getBoundingClientRect();
    Object.assign(blocker.style, {
      left: `${mapBounds.left}px`,
      top: `${mapBounds.top}px`,
      width: `${mapBounds.width}px`,
      height: `${mapBounds.height}px`,
    });
  }

  static _syncServerRenderLoader() {
    const state = this._getServerRenderLoaderState();
    const loader = this._ensureServerRenderLoaderElement();
    const shouldDisplay = state.pendingCount > 0;
    const messageElement = loader.querySelector(".sinp-server-render-loader-message");

    if (messageElement) {
      messageElement.textContent =
        state.messages[state.messages.length - 1] ||
        "Rafraîchissement des données cartographiques…";
    }

    loader.style.display = shouldDisplay ? "flex" : "none";
    loader.setAttribute("aria-hidden", shouldDisplay ? "false" : "true");
    this._syncMapBlocker();
  }

  static _startServerRenderLoad(options = {}) {
    const state = this._getServerRenderLoaderState();

    if (state.hideTimer) {
      window.clearTimeout(state.hideTimer);
      state.hideTimer = null;
    }

    state.pendingCount += 1;
    if (options.blockMap === true) {
      state.mapBlockCount += 1;
    }
    state.messages.push(
      options.message || "Rafraîchissement des données cartographiques…"
    );
    this._syncServerRenderLoader();
  }

  static _finishServerRenderLoad(options = {}) {
    const state = this._getServerRenderLoaderState();

    state.pendingCount = Math.max(0, state.pendingCount - 1);
    if (options.blockMap === true) {
      state.mapBlockCount = Math.max(0, state.mapBlockCount - 1);
    }

    if (options.message && state.messages.length > 0) {
      const messageIndex = state.messages.lastIndexOf(options.message);
      if (messageIndex >= 0) {
        state.messages.splice(messageIndex, 1);
      } else {
        state.messages.pop();
      }
    } else if (state.messages.length > 0) {
      state.messages.pop();
    }

    if (state.pendingCount === 0) {
      state.mapBlockCount = 0;
      state.messages = [];
      state.hideTimer = window.setTimeout(() => {
        state.hideTimer = null;
        this._syncServerRenderLoader();
      }, 150);
      return;
    }

    this._syncServerRenderLoader();
  }

  _getDefaultStyle() {
    return new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: "rgba(45, 64, 89, 255)",
        width: 1.5,
      }),
      fill: new ol.style.Fill({
        color: "rgba(0, 0, 0, 0)",
      }),
    });
  }

  _createSelectionHighlightStyle() {
    return new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: "rgba(250, 204, 21, 1)",
        width: 3,
      }),
      fill: new ol.style.Fill({
        color: "rgba(250, 204, 21, 0.35)",
      }),
      zIndex: 1000,
    });
  }

  _createSelectionLayer() {
    const highlightLayer = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: this._selectionHighlightStyle,
      visible: true,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
    });

    highlightLayer.set("name", `${this.layerId}-selection-highlight`);
    highlightLayer.set("queryable", false);
    highlightLayer.setZIndex(1000);
    return highlightLayer;
  }

  _clearSelectedFeatures() {
    this._selectionLayer?.getSource?.()?.clear();
  }

  setSelectedFeatures(features = []) {
    this._clearSelectedFeatures();
    this._ensureSelectionLayer();

    const selectionSource = this._selectionLayer?.getSource?.();
    if (!selectionSource) {
      return;
    }

    const normalizedFeatures = Array.isArray(features) ? features.filter(Boolean) : [];
    normalizedFeatures.forEach((feature) => {
      const geometry = feature?.getGeometry?.();
      if (!geometry) {
        return;
      }

      selectionSource.addFeature(
        new ol.Feature({
          geometry: geometry.clone ? geometry.clone() : geometry,
        })
      );
    });
  }

  setFeatureInfoFeatures(features = []) {
    const source = this.layer?.getSource?.();
    if (!source) {
      return;
    }

    source.clear();

    const normalizedFeatures = Array.isArray(features) ? features.filter(Boolean) : [];
    if (!normalizedFeatures.length) {
      return;
    }

    source.addFeatures(normalizedFeatures);
  }

  _createServerRenderLayer() {
    const geoserverBaseUrl = mviewer.env?.[mviewer.env?.CURRENT_ENV]?.GEOSERVER_BASE_URL;
    const workspace = this.serverStyle?.workspace || "sinp_diffusion";
    const layerName = this.serverStyle?.layerName || `${workspace}:${this.typeName}`;
    const source = new ol.source.ImageWMS({
      url: `${geoserverBaseUrl}/wms`,
      params: {
        LAYERS: layerName,
        FORMAT: "image/png",
        TRANSPARENT: true,
      },
      ratio: this.serverRenderRatio,
      serverType: "geoserver",
    });

    this._attachServerRenderLoader(source);

    if (this.serverStyle?.styleName) {
      source.updateParams({
        STYLES: this.serverStyle.styleName,
      });
    }

    const renderLayer = new ol.layer.Image({
      source,
      visible: false,
    });

    renderLayer.set("name", `${this.layerId}-server-render`);
    renderLayer.set("queryable", false);
    return renderLayer;
  }

  _debugServerRender(event, details = {}, refreshId = null) {
    const mapLayers = mviewer.getMap?.()?.getLayers?.()?.getArray?.() || [];
    console.info(
      `[SINP restitution][refresh:${refreshId ?? "none"}][${this.layerId}] ${event}`,
      {
        targetLayerId: this.layerId,
        vectorVisible: this.layer?.getVisible?.() ?? null,
        serverRenderExists: Boolean(this._serverRenderLayer),
        serverRenderVisible: this._serverRenderLayer?.getVisible?.() ?? false,
        serverRenderAttached: mapLayers.includes(this._serverRenderLayer),
        visibleRestitutionLayers: mapLayers
          .filter(
            (layer) =>
              layer?.getVisible?.() &&
              String(layer.get?.("name") || "").endsWith("-server-render")
          )
          .map((layer) => ({
            name: layer.get("name"),
            params: layer.getSource?.()?.getParams?.() || null,
          })),
        ...details,
      }
    );
  }

  _attachServerRenderLoader(source) {
    if (!source?.on || source.get?.("sinpServerRenderLoaderAttached")) {
      return;
    }

    source.set?.("sinpServerRenderLoaderAttached", true);
    source.on("imageloadstart", () => {
      this._debugServerRender("WMS image load start", {
        sourceParams: source.getParams?.() || null,
      }, source.getParams?.()?.SINP_REFRESH);
      SinpBaseLayer._startServerRenderLoad();
    });
    source.on("imageloadend", () => {
      this._debugServerRender("WMS image load end", {
        sourceParams: source.getParams?.() || null,
      }, source.getParams?.()?.SINP_REFRESH);
      SinpBaseLayer._finishServerRenderLoad();
    });
    source.on("imageloaderror", () => {
      this._debugServerRender("WMS image load error", {
        sourceParams: source.getParams?.() || null,
      }, source.getParams?.()?.SINP_REFRESH);
      SinpBaseLayer._finishServerRenderLoad();
    });
  }

  _getServerStyleContext() {
    if (!this.serverStyle?.enabled) {
      return null;
    }

    const geoserverBaseUrl = mviewer.env?.[mviewer.env?.CURRENT_ENV]?.GEOSERVER_BASE_URL;
    if (!geoserverBaseUrl) {
      return null;
    }

    const workspace = this.serverStyle?.workspace || "sinp_diffusion";

    return {
      url: `${geoserverBaseUrl}/wms`,
      layerName: this.serverStyle?.layerName || `${workspace}:${this.typeName}`,
      styleName: this._resolvedServerStyleName,
    };
  }

  async _resolveServerStyleName(queryOptions = {}) {
    const legendTypeName = this.serverStyle?.legendTypeName;
    if (!legendTypeName) {
      return this._resolvedServerStyleName;
    }

    if (!window.sinpRepository?.fetchGeoServerData) {
      throw new Error(
        `[${this.layerId}] Impossible d'interroger ${legendTypeName}: dépôt GeoServer indisponible`
      );
    }

    const workspace = this.serverStyle?.workspace || "sinp_diffusion";
    const legendOptions = {
      TYPENAME: legendTypeName.includes(":")
        ? legendTypeName
        : `${workspace}:${legendTypeName}`,
    };

    if (queryOptions?.VIEWPARAMS) {
      legendOptions.VIEWPARAMS = queryOptions.VIEWPARAMS;
    }

    const legendData = await window.sinpRepository.fetchGeoServerData(legendOptions);
    const styleName = legendData?.features?.[0]?.properties?.style_name;
    const allowedStyleNames = this.serverStyle?.allowedStyleNames || [];

    if (
      typeof styleName !== "string" ||
      !styleName.trim() ||
      (allowedStyleNames.length > 0 && !allowedStyleNames.includes(styleName.trim()))
    ) {
      throw new Error(`[${this.layerId}] ${legendTypeName} a retourné un style invalide`);
    }

    this._resolvedServerStyleName = styleName.trim();
    return this._resolvedServerStyleName;
  }

  _appendUrlParams(url, params = {}) {
    const separator = url.includes("?") ? "&" : "?";
    const queryString = Object.keys(params)
      .filter(
        (key) => params[key] !== undefined && params[key] !== null && params[key] !== ""
      )
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join("&");

    return queryString ? `${url}${separator}${queryString}` : url;
  }

  _escapeViewParams(viewParams = "") {
    if (window.sinpRepository?.escapeViewParams) {
      return window.sinpRepository.escapeViewParams(viewParams);
    }

    return String(viewParams).replace(/(^|[^\\]),/g, "$1\\,");
  }

  _buildServerLegendUrl(queryOptions = {}) {
    const serverStyleContext = this._getServerStyleContext();
    if (!serverStyleContext) {
      return "";
    }

    const params = {
      SERVICE: "WMS",
      VERSION: "1.3.0",
      REQUEST: "GetLegendGraphic",
      SLD_VERSION: "1.1.0",
      WIDTH: "30",
      HEIGHT: "20",
      LAYER: serverStyleContext.layerName,
      FORMAT: "image/png",
      LEGEND_OPTIONS:
        "fontName:Open Sans;fontAntiAliasing:true;fontColor:0x777777;fontSize:10;dpi:96",
      TRANSPARENT: true,
    };

    if (serverStyleContext.styleName) {
      params.STYLE = serverStyleContext.styleName;
    }

    if (queryOptions?.VIEWPARAMS) {
      params.VIEWPARAMS = this._escapeViewParams(queryOptions.VIEWPARAMS);
    }

    if (queryOptions?.CQL_FILTER) {
      params.CQL_FILTER = queryOptions.CQL_FILTER;
    }

    return this._appendUrlParams(serverStyleContext.url, params);
  }

  _refreshLegacyLegend(config = {}) {
    const legend = document.getElementById(`legend-${this.layerId}`);
    if (!legend || !config.legendurl) {
      return;
    }

    legend.setAttribute("src", config.legendurl);
    legend.setAttribute("data-legendurl", config.legendurl);
  }

  attachLegacyConfig(config = null, queryOptions = {}) {
    this.config = config;

    const serverStyleContext = this._getServerStyleContext();
    if (!config || !serverStyleContext) {
      return config;
    }

    const legendUrl = this._buildServerLegendUrl(queryOptions);

    const legendConfig = {
      ...config,
      layername: serverStyleContext.layerName,
      style: serverStyleContext.styleName,
      legendurl: legendUrl || config.legendurl,
      url: serverStyleContext.url,
    };

    if (this.serverRenderOnly) {
      Object.assign(legendConfig, {
        infoformat: config.infoformat || this._serverInfoFormat,
        featurecount: config.featurecount || this._serverInfoFeatureCount,
        tooltip: false,
        tooltipenabled: false,
        tooltipcontent: "",
        nohighlight: true,
      });
    }

    Object.assign(config, legendConfig);
    this._refreshLegacyLegend(config);
    this._debugServerRender(
      "legacy layer and legend configured",
      {
        layerName: legendConfig.layername,
        style: legendConfig.style || "(style GeoServer par défaut)",
        legendUrl: legendConfig.legendurl,
        viewParams: queryOptions.VIEWPARAMS || null,
      },
      queryOptions.SINP_REFRESH
    );
    return config;
  }

  _ensureServerRenderLayer() {
    if (!this.serverStyle?.enabled) {
      return;
    }

    if (!this._serverRenderLayer) {
      this._serverRenderLayer = this._createServerRenderLayer();
    }

    const map = mviewer.getMap();
    if (!map) {
      return;
    }

    const existingLayers = map.getLayers().getArray();
    if (!existingLayers.includes(this._serverRenderLayer)) {
      map.addLayer(this._serverRenderLayer);
    }

    this._syncServerRenderLayerState();
  }

  _discardServerRenderLayer() {
    const renderLayer = this._serverRenderLayer;
    if (!renderLayer) {
      return;
    }

    const previousParams = renderLayer.getSource?.()?.getParams?.() || null;
    this._debugServerRender("discard WMS layer: before", {
      previousParams,
    }, previousParams?.SINP_REFRESH);
    renderLayer.setVisible?.(false);
    mviewer.getMap?.()?.removeLayer?.(renderLayer);
    renderLayer.setSource?.(null);
    this._serverRenderLayer = null;
    this._debugServerRender("discard WMS layer: after", {
      previousParams,
    }, previousParams?.SINP_REFRESH);
  }

  _ensureSelectionLayer() {
    if (!this._selectionLayer) {
      return;
    }

    const map = mviewer.getMap();
    if (!map) {
      return;
    }

    const existingLayers = map.getLayers().getArray();
    if (!existingLayers.includes(this._selectionLayer)) {
      map.addLayer(this._selectionLayer);
    }
  }

  _syncServerRenderLayerState() {
    if (!this._serverRenderLayer) {
      return;
    }

    this._serverRenderLayer.setVisible(this.layer.getVisible() && this._serverStyleActive);
    this._serverRenderLayer.setOpacity(this.layer.getOpacity());
  }

  _canQueryServerRender() {
    return Boolean(
      this.serverRenderOnly &&
        this._serverStyleActive &&
        this.layer?.getVisible?.() &&
        this._serverRenderLayer?.getVisible?.()
    );
  }

  _buildServerFeatureInfoUrl(coordinate, params = {}) {
    if (!this._canQueryServerRender()) {
      return "";
    }

    const map = mviewer.getMap();
    const source = this._serverRenderLayer?.getSource?.();
    if (!map || !source || !Array.isArray(coordinate)) {
      return "";
    }

    return (
      source.getFeatureInfoUrl(
        coordinate,
        map.getView().getResolution(),
        map.getView().getProjection(),
        {
          INFO_FORMAT: params.infoFormat || "application/vnd.ogc.gml",
          FEATURE_COUNT: params.featureCount || this._serverInfoFeatureCount,
        }
      ) || ""
    );
  }

  _parseServerFeatureInfoResponse(body, contentType = "") {
    const responseBody = typeof body === "string" ? body.trim() : "";
    if (!responseBody) {
      return [];
    }

    const normalizedContentType = String(contentType).toLowerCase();

    if (
      normalizedContentType.includes("json") ||
      responseBody.startsWith("{") ||
      responseBody.startsWith("[")
    ) {
      return new ol.format.GeoJSON().readFeatures(JSON.parse(responseBody));
    }

    return new ol.format.WMSGetFeatureInfo().readFeatures($.parseXML(responseBody));
  }

  async fetchServerRenderFeatures(coordinate, params = {}) {
    const url = this._buildServerFeatureInfoUrl(coordinate, params);
    if (!url) {
      return [];
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const body = await response.text();
    const contentType = response.headers?.get?.("content-type") || "";
    return this._parseServerFeatureInfoResponse(body, contentType);
  }

  _waitForServerRender(source, triggerRefresh) {
    if (!source) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let listenerKeys = [];
      const finalize = () => {
        if (listenerKeys.length) {
          ol.Observable.unByKey(listenerKeys);
          listenerKeys = [];
        }

        if (typeof window.requestAnimationFrame === "function") {
          window.requestAnimationFrame(() => resolve());
          return;
        }

        window.setTimeout(resolve, 0);
      };

      listenerKeys = [
        source.on("imageloadend", finalize),
        source.on("imageloaderror", finalize),
      ];

      triggerRefresh();
    });
  }

  async _updateServerRenderLayer(queryOptions = {}, hasFeatures = false) {
    const requestToken = Symbol("server-render");
    this._serverRenderRequestToken = requestToken;

    if (hasFeatures) {
      await this._resolveServerStyleName(queryOptions);
      if (this._serverRenderRequestToken !== requestToken) {
        return;
      }
    }

    this._ensureServerRenderLayer();

    if (!this._serverRenderLayer) {
      this._pendingServerRenderPromise = Promise.resolve();
      return this._pendingServerRenderPromise;
    }

    this.attachLegacyConfig(this.config, queryOptions);

    if (!hasFeatures) {
      this._serverStyleActive = false;
      this._syncServerRenderLayerState();
      this._pendingServerRenderPromise = Promise.resolve();
      return this._pendingServerRenderPromise;
    }

    const params = {
      LAYERS:
        this.serverStyle?.layerName ||
        `${this.serverStyle?.workspace || "sinp_diffusion"}:${this.typeName}`,
      FORMAT: "image/png",
      TRANSPARENT: true,
    };

    const serverStyleContext = this._getServerStyleContext();
    if (serverStyleContext?.styleName) {
      params.STYLES = serverStyleContext.styleName;
    }

    if (queryOptions?.VIEWPARAMS) {
      params.VIEWPARAMS = this._escapeViewParams(queryOptions.VIEWPARAMS);
    }

    if (queryOptions?.CQL_FILTER) {
      params.CQL_FILTER = queryOptions.CQL_FILTER;
    }

    if (queryOptions?.SINP_REFRESH) {
      params.SINP_REFRESH = queryOptions.SINP_REFRESH;
    }

    this._debugServerRender(
      "apply WMS rendering",
      {
        requestedParams: params,
        targetLocCode:
          String(queryOptions?.VIEWPARAMS || "").match(
            /(?:^|;)TARGET_LOC_CODE:([^;]+)/
          )?.[1] || null,
        style: params.STYLES || "(style GeoServer par défaut)",
        legendUrl: this._buildServerLegendUrl(queryOptions),
      },
      queryOptions.SINP_REFRESH
    );
    this._refreshLegacyLegend({
      legendurl: this._buildServerLegendUrl(queryOptions),
    });
    this._serverStyleActive = true;
    this._syncServerRenderLayerState();
    this._pendingServerRenderPromise = this._waitForServerRender(
      this._serverRenderLayer.getSource(),
      () => {
        this._serverRenderLayer.getSource().updateParams(params);
        this._serverRenderLayer.getSource().refresh();
        this._debugServerRender(
          "WMS source refreshed",
          {
            effectiveParams:
              this._serverRenderLayer.getSource().getParams?.() || null,
          },
          queryOptions.SINP_REFRESH
        );
      }
    );

    return this._pendingServerRenderPromise;
  }

  _fitMapToFeatures(features = []) {
    const map = mviewer.getMap();
    if (!map || !Array.isArray(features) || features.length === 0) {
      return;
    }

    const extent = ol.extent.createEmpty();
    let hasGeometry = false;

    features.forEach((feature) => {
      const geometry = feature?.getGeometry?.();
      if (!geometry) {
        return;
      }

      ol.extent.extend(extent, geometry.getExtent());
      hasGeometry = true;
    });

    if (!hasGeometry) {
      return;
    }

    map.getView().fit(extent, {
      duration: 500,
      maxZoom: this.maxZoom,
      padding: [24, 24, 24, 24],
    });
  }

  _resetPanels() {
    try {
      ["bottom-panel", "right-panel", "modal-panel"].forEach((panelId) => {
        const panel = $("#" + panelId);
        if (panelId === "modal-panel" && panel.length) {
          this._hideModalPanel(panel);
        }
        panel.removeClass("active");
        panel.find(".popup-content").empty();
        this._syncPanelRevealHandle(panelId);
      });
    } catch (e) {
      console.warn("Panel reset failed:", e);
    }
  }

  _ensurePanelRevealHandle(panelType) {
    const handleConfig = PANEL_REVEAL_HANDLE_CONFIG[panelType];
    if (!handleConfig || configuration.getConfiguration().mobile) {
      return null;
    }

    const panel = $("#" + panelType);
    if (!panel.length) {
      return null;
    }

    const handleId = `${panelType}-reveal-handle`;
    let handle = $("#" + handleId);

    if (!handle.length) {
      handle = $(`
        <button
          type="button"
          id="${handleId}"
          class="mv-panel-reveal-handle ${handleConfig.positionClass}"
          aria-controls="${panelType}"
          aria-expanded="false">
          <i class="fas ${handleConfig.iconClass}" aria-hidden="true"></i>
        </button>
      `);

      handle.on("click", () => {
        const isCollapsing = panel.hasClass("active");
        panel.toggleClass("active");
        if (isCollapsing) {
          this._hideLocationMarkers();
        }
        this._syncPanelRevealHandle(panelType);
      });

      $("body").append(handle);
    }

    if (!panel.data("mvRevealBound")) {
      panel.find(".btn-close").on("click.mvRevealHandle", () => {
        window.setTimeout(() => this._syncPanelRevealHandle(panelType), 0);
      });
      panel.data("mvRevealBound", true);
    }

    return handle;
  }

  _syncPanelRevealHandle(panelType = "right-panel") {
    const handle = this._ensurePanelRevealHandle(panelType);
    const panel = $("#" + panelType);

    if (!handle || !panel.length) {
      return;
    }

    const panelContent = panel.find(".popup-content");
    const hasContent = Boolean(panelContent.length && panelContent.html()?.trim());
    const isExpanded = panel.hasClass("active");
    const actionLabel = isExpanded ? "Réduire" : "Réafficher";
    const handleConfig = PANEL_REVEAL_HANDLE_CONFIG[panelType];

    handle.toggleClass("is-visible", hasContent);
    handle.toggleClass("is-expanded", isExpanded);
    handle.attr("aria-hidden", hasContent ? "false" : "true");
    handle.attr("aria-expanded", isExpanded ? "true" : "false");
    handle.attr("aria-label", `${actionLabel} le ${handleConfig.panelLabel}`);
    handle.attr("title", `${actionLabel} le ${handleConfig.panelLabel}`);
  }

  _hideLocationMarkers() {
    try {
      if (window.mviewer && typeof window.mviewer.hideLocation === "function") {
        mviewer.hideLocation();
      }
    } catch (e) {
      console.warn("hideLocation failed:", e);
    }
  }

  _renderHTML(features) {
    const layer = mviewer.getLayer(this.layerId);
    const htmlContent = layer?.template
      ? info.templateHTMLContent(features, layer)
      : info.formatHTMLContent(features, layer);

    return {
      html: Array.isArray(htmlContent) ? htmlContent.join("") : htmlContent || "",
      panelType: configuration.getConfiguration().mobile
        ? "modal-panel"
        : layer?.infospanel || "right-panel",
    };
  }

  _displayResults(features, viewData, queryOptions = null) {
    const source = this.layer.getSource();
    source.clear();
    source.addFeatures(features);
    const renderPromise = this._updateServerRenderLayer(queryOptions, features.length > 0);

    if (features.length > 0) {
      this._fitMapToFeatures(features);
      this._showResultsPanel(viewData);
    }

    return renderPromise;
  }

  _showResultsPanel(viewData) {
    try {
      const panelSelector = `#${viewData.panelType}`;
      const panel = $(panelSelector);
      if (!panel.length) {
        console.warn(`Panel ${panelSelector} introuvable`);
        return;
      }

      const panelContent = panel.find(".popup-content");
      if (panelContent.length) {
        panelContent.html(viewData.html);
      } else {
        panel.html(viewData.html);
      }

      if (!panel.hasClass("active")) {
        panel.addClass("active");
      }

      if (viewData.panelType === "modal-panel") {
        this._showModalPanel(panel);
      }

      this._syncPanelRevealHandle(viewData.panelType);
    } catch (e) {
      console.warn("Unable to show results panel:", e);
    }
  }

  _showModalPanel(panel) {
    const modalElement = panel?.get?.(0);

    if (!modalElement) {
      return;
    }

    panel
      .addClass("active show in")
      .css("display", "block")
      .attr("aria-modal", "true")
      .removeAttr("aria-hidden");

    $("body").addClass("modal-open");

    if (!panel.data("sinpModalCloseBound")) {
      panel.find(".btn-close, .close, [data-bs-dismiss='modal'], [data-dismiss='modal']")
        .on("click.sinpModalPanel", () => this._hideModalPanel(panel));
      panel.data("sinpModalCloseBound", true);
    }
  }

  _hideModalPanel(panel) {
    const modalElement = panel?.get?.(0);

    if (!modalElement) {
      return;
    }

    panel
      .removeClass("active show in")
      .css("display", "none")
      .removeAttr("aria-modal")
      .attr("aria-hidden", "true");

    const hasAnotherOpenModal = $(".modal.show, .modal.in")
      .not(panel)
      .filter(function () {
        return $(this).css("display") !== "none";
      }).length > 0;

    if (!hasAnotherOpenModal) {
      $("body").removeClass("modal-open");
    }
  }

  async _processFeatures(features, rawData) {
    // Hook de surcharge
  }

  beforeLoad() {
    this._hideLocationMarkers();
    this._resetPanels();
    this._pendingServerRenderPromise = Promise.resolve();
    this.clear();
  }

  renderFeatures(features, queryOptions = null) {
    const normalizedFeatures = Array.isArray(features) ? features : [];

    if (normalizedFeatures.length === 0) {
      this.clear();
      return;
    }

    const viewData = this._renderHTML(normalizedFeatures);
    return this._displayResults(normalizedFeatures, viewData, queryOptions);
  }

  renderServerOnly(queryOptions = null) {
    this._clearSelectedFeatures();
    this.layer?.getSource()?.clear();
    return this._updateServerRenderLayer(queryOptions, true);
  }

  fitToFeatures(features = []) {
    this._fitMapToFeatures(features);
  }

  fitToDefaultSearchExtent() {
    const map = mviewer.getMap();
    if (!map || !Array.isArray(this.defaultSearchExtent)) {
      return;
    }

    map.getView().fit(this.defaultSearchExtent, {
      duration: 500,
      padding: [24, 24, 24, 24],
    });
  }

  showFeatureInfo(features) {
    const normalizedFeatures = Array.isArray(features) ? features : [];

    if (normalizedFeatures.length === 0) {
      return;
    }

    const viewData = this._renderHTML(normalizedFeatures);
    this._showResultsPanel(viewData);
  }

  showFeatureInfoLoading() {
    const loadingFeature = new ol.Feature({
      details: [],
      jdd_details: [],
      entity_data_loading: true,
      entity_data_loaded: false,
      entity_data_error: null,
      jdd_data_loading: true,
      jdd_data_loaded: false,
      jdd_data_error: null,
    });

    if (!loadingFeature.ol_uid) {
      loadingFeature.ol_uid =
        typeof ol.getUid === "function"
          ? ol.getUid(loadingFeature)
          : `sinp-loading-${Date.now()}`;
    }

    this.setFeatureInfoFeatures([loadingFeature]);
    this.showFeatureInfo([loadingFeature]);
  }

  showSelectionPromptPanel() {
    this._showResultsPanel({
      html: `<mv-feature-search-results data-layer-id="${this.layerId}" data-selection-prompt="true"></mv-feature-search-results>`,
      panelType: configuration.getConfiguration().mobile
        ? "modal-panel"
        : mviewer.getLayer(this.layerId)?.infospanel || "right-panel",
    });
  }

  showSelectionPrompt(features, queryOptions = null) {
    const normalizedFeatures = Array.isArray(features) ? features : [];

    if (normalizedFeatures.length === 0) {
      this.clear();
      return this._pendingServerRenderPromise;
    }

    const source = this.layer.getSource();
    source.clear();
    source.addFeatures(normalizedFeatures);
    const renderPromise = this._updateServerRenderLayer(
      queryOptions,
      normalizedFeatures.length > 0
    );
    this._fitMapToFeatures(normalizedFeatures);

    this._showResultsPanel({
      html: `<mv-feature-search-results data-layer-id="${this.layerId}" data-selection-prompt="true"></mv-feature-search-results>`,
      panelType: configuration.getConfiguration().mobile
        ? "modal-panel"
        : mviewer.getLayer(this.layerId)?.infospanel || "right-panel",
    });

    return renderPromise;
  }

  clear() {
    this._serverRenderRequestToken = Symbol("server-render-cleared");
    this._clearSelectedFeatures();
    this.layer?.getSource()?.clear();
    this._pendingServerRenderPromise = Promise.resolve();
    this._serverStyleActive = false;
    this._discardServerRenderLayer();
  }

  getLayer() {
    return this.layer;
  }

  destroy() {
    this.clear();
    if (this._selectionLayer) {
      mviewer.getMap()?.removeLayer(this._selectionLayer);
      this._selectionLayer = null;
    }
    this.layer = null;
  }
}

SinpBaseLayer.STATS_STYLE_NAMES = Object.freeze([
  "fn_get_stats_100",
  "fn_get_stats_500",
  "fn_get_stats_5000",
  "fn_get_stats_50000",
]);
mviewer.customLayers.SinpBaseLayer = SinpBaseLayer;

if (typeof document !== "undefined") {
  document.addEventListener("infopanel-ready", (event) => {
    const panelType = event.detail?.panel;
    const layerInstance =
      mviewer.customLayers?.communeSearch?._instance ||
      mviewer.customLayers?.gridSearch5x5?._instance ||
      mviewer.customLayers?.grid10x10search?._instance;

    layerInstance?._syncPanelRevealHandle?.(panelType);
  });
}
