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
class SinpBaseLayer {
  constructor(layerId, typeName, config = {}) {
    this.layerId = layerId;
    this.typeName = typeName;
    this.maxZoom = config.maxZoom || 15;
    this.style = config.style || this._getDefaultStyle();
    this.format = new ol.format.GeoJSON();
    this.serverStyle = config.serverStyle || null;
    this.serverRenderOnly = config.serverRenderOnly === true;
    this.serverRenderRatio = config.serverRenderRatio || 1.5;
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

  _attachServerRenderLoader(source) {
    if (!source?.on || source.get?.("sinpServerRenderLoaderAttached")) {
      return;
    }

    source.set?.("sinpServerRenderLoaderAttached", true);
    source.on("imageloadstart", () => {
      SinpBaseLayer._startServerRenderLoad();
    });
    source.on("imageloadend", () => {
      SinpBaseLayer._finishServerRenderLoad();
    });
    source.on("imageloaderror", () => {
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
      styleName: this.serverStyle?.styleName || "",
    };
  }

  _buildServerLegendUrl() {
    const serverStyleContext = this._getServerStyleContext();
    if (!serverStyleContext || typeof getLegendGraphicUrl !== "function") {
      return "";
    }

    const params = {
      LAYER: serverStyleContext.layerName,
      FORMAT: "image/png",
      TRANSPARENT: true,
    };

    if (serverStyleContext.styleName) {
      params.STYLE = encodeURIComponent(serverStyleContext.styleName);
    }

    return getLegendGraphicUrl(serverStyleContext.url, params);
  }

  _refreshLegacyLegend(config = {}) {
    const legend = document.getElementById(`legend-${this.layerId}`);
    if (!legend || !config.legendurl) {
      return;
    }

    legend.setAttribute("src", config.legendurl);
    legend.setAttribute("data-legendurl", config.legendurl);
  }

  attachLegacyConfig(config = null) {
    this.config = config;

    const serverStyleContext = this._getServerStyleContext();
    if (!config || !serverStyleContext) {
      return config;
    }

    const legendUrl = this._buildServerLegendUrl();

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
    return config;
  }

  _ensureServerRenderLayer() {
    if (!this._serverRenderLayer) {
      return;
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

  _updateServerRenderLayer(queryOptions = {}, hasFeatures = false) {
    if (!this._serverRenderLayer) {
      this._pendingServerRenderPromise = Promise.resolve();
      return this._pendingServerRenderPromise;
    }

    this._ensureServerRenderLayer();
    this.attachLegacyConfig(this.config);

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

    if (this.serverStyle?.styleName) {
      params.STYLES = this.serverStyle.styleName;
    }

    if (queryOptions?.VIEWPARAMS) {
      params.VIEWPARAMS = queryOptions.VIEWPARAMS;
    }

    if (queryOptions?.CQL_FILTER) {
      params.CQL_FILTER = queryOptions.CQL_FILTER;
    }

    this._serverStyleActive = true;
    this._syncServerRenderLayerState();
    this._pendingServerRenderPromise = this._waitForServerRender(
      this._serverRenderLayer.getSource(),
      () => {
        this._serverRenderLayer.getSource().updateParams(params);
        this._serverRenderLayer.getSource().refresh();
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
        panel.removeClass("active");
        panel.find(".popup-content").empty();
        this._syncPanelRevealHandle(panelId);
      });
    } catch (e) {
      console.warn("Panel reset failed:", e);
    }
  }

  _ensurePanelRevealHandle(panelType) {
    if (panelType !== "right-panel" || configuration.getConfiguration().mobile) {
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
          class="mv-panel-reveal-handle"
          aria-label="Réafficher le panneau d'informations"
          title="Réafficher le panneau d'informations">
          <i class="fas fa-chevron-left" aria-hidden="true"></i>
        </button>
      `);

      handle.on("click", () => {
        panel.addClass("active");
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
    const shouldShowHandle = !panel.hasClass("active") && hasContent;

    handle.toggleClass("is-visible", shouldShowHandle);
    handle.attr("aria-hidden", shouldShowHandle ? "false" : "true");
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

      this._syncPanelRevealHandle(viewData.panelType);
    } catch (e) {
      console.warn("Unable to show results panel:", e);
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
      jdd_data_loading: false,
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
    this._clearSelectedFeatures();
    this.layer?.getSource()?.clear();
    this._pendingServerRenderPromise = Promise.resolve();
    if (this._serverRenderLayer) {
      this._serverStyleActive = false;
      this._syncServerRenderLayerState();
    }
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
    if (this._serverRenderLayer) {
      mviewer.getMap()?.removeLayer(this._serverRenderLayer);
      this._serverRenderLayer = null;
    }
    this.layer = null;
  }
}

mviewer.customLayers.SinpBaseLayer = SinpBaseLayer;
