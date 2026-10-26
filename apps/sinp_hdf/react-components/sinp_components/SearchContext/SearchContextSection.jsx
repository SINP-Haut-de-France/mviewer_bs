import React from "react";
import CollapsibleFilterSection from "../../components/CollapsibleFilterSection/CollapsibleFilterSection";
import MultiSelectSearchComponent from "../../components/MultiSelectSearch/MultiSelectSearchComponent";
import Datasource from "../../components/Datasource/Datasource";
import { PRECISION_LEVELS } from "../../configs/filtersConfig";
import InfoTooltip from "../../components/InfoTooltip/InfoTooltip";
import { getCoverageRateBounds, getSinpConfigValue } from "../../configs/sinpConfiguration";
import "./SearchContextSection.css";

const LOCATION_TOUR_TARGETS = [
  "filter-department",
  "filter-commune",
  "filter-epci",
];

const CONTEXT_MODE_INPUT_ID = "sinp-search-context-input";
const CONTEXT_MODE_SELECTION_ID = "sinp-search-context-selection";

const PRECISION_SECTION_HELP =
  "Une observation est localisée sur une zone (un point, un tracé, une commune…). " +
  "Ce réglage fixe la part de cette zone qui doit se trouver dans votre périmètre pour que l'observation soit retenue.";

const INPUT_MODE_HELP =
  "Définissez votre périmètre en tapant le nom ou le code d'un département, d'une commune ou d'un EPCI.";

const SELECTION_MODE_HELP =
  "Définissez votre périmètre en cliquant sur un zonage (site protégé, zone d'inventaire…) affiché sur la carte.";

/** Explications grand public des niveaux de précision, d'après les seuils configurés. */
const getPrecisionHelp = (id, { min, max }) => {
  switch (id) {
    case "exhaustive":
      return `Retient toutes les observations dont au moins ${getSinpConfigValue("INCLUSION_EXHAUSTIF", 25)} % de la zone de localisation est dans votre périmètre. Vous obtenez le plus de résultats, y compris des observations en bordure.`;
    case "balanced":
      return `Vous choisissez la part minimale de la zone de localisation qui doit être dans votre périmètre, entre ${min} % et ${max} %. C'est un compromis entre nombre et fiabilité des résultats.`;
    case "strict":
      return `Ne retient que les observations dont au moins ${getSinpConfigValue("INCLUSION_STRICT", 75)} % de la zone de localisation est dans votre périmètre. Vous obtenez moins de résultats, mais très bien situés.`;
    default:
      return null;
  }
};

/**
 * Niveau de précision (toujours visible) suivi du choix du périmètre
 * géographique (à la saisie ou à la sélection d'un zonage).
 */
const SearchContextSection = ({
  filters,
  filterVisibility,
  isLoading = false,
  locationInputMode = false,
  selectionMode = false,
  hasValidSelection = false,
  selectionLabel = null,
  visibleEnvironmentalLayers = [],
  useBuffer = true,
  onLocationInputModeChange,
  onSelectionModeChange,
  onSelectionChangeRequest,
  onRevealLayers,
  handleDptChange,
  handleComChange,
  handleEpciChange,
  onPrecisionLevelChange,
  onCoverageRateChange,
  onUseBufferChange,
}) => {
  const showLocationInputs =
    filterVisibility.showDepartment ||
    filterVisibility.showCommune ||
    filterVisibility.showEpci;
  const precisionLevel = filters.precisionLevel;
  const coverageRate = filters.coverageRate;
  const { min: COVERAGE_RATE_MIN, max: COVERAGE_RATE_MAX } = getCoverageRateBounds();

  const badge = selectionMode
    ? hasValidSelection
      ? 1
      : null
    : (filters.filteredCommunes?.length || 0) +
        (filters.filteredDepartments?.length || 0) +
        (filters.filteredEpcis?.length || 0) || null;

  return (
    <>
      <CollapsibleFilterSection
        title="Niveau de précision"
        icon="fa-bullseye"
        defaultExpanded={true}
        dataTour="filter-precision"
        helpText={PRECISION_SECTION_HELP}>
        <div className="mv-search-context__precision">
          {PRECISION_LEVELS.map(({ id, label }) => (
            <React.Fragment key={id}>
              <div className="form-check">
                <input
                  id={`sinp-precision-level-${id}`}
                  className="form-check-input"
                  type="checkbox"
                  checked={precisionLevel === id}
                  disabled={isLoading}
                  onChange={() => onPrecisionLevelChange?.(id)}
                />
                <label
                  className="form-check-label"
                  htmlFor={`sinp-precision-level-${id}`}>
                  {label}
                </label>
                <InfoTooltip text={getPrecisionHelp(id, { min: COVERAGE_RATE_MIN, max: COVERAGE_RATE_MAX })} />
              </div>

              {id === "balanced" && precisionLevel === "balanced" && (
                <div className="mv-search-context__coverage">
                  <label
                    htmlFor="sinp-coverage-rate"
                    className="mv-search-context__coverage-label">
                    Taux de recouvrement personnalisé :{" "}
                    <strong>{coverageRate} %</strong>
                  </label>
                  <input
                    id="sinp-coverage-rate"
                    className="form-range"
                    type="range"
                    min={COVERAGE_RATE_MIN}
                    max={COVERAGE_RATE_MAX}
                    step={5}
                    value={coverageRate}
                    disabled={isLoading}
                    onChange={(event) =>
                      onCoverageRateChange?.(Number(event.target.value))
                    }
                  />
                  <div className="mv-search-context__coverage-scale" aria-hidden="true">
                    <span>{COVERAGE_RATE_MIN} %</span>
                    <span>{COVERAGE_RATE_MAX} %</span>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}

        </div>
      </CollapsibleFilterSection>

      <CollapsibleFilterSection
        title="Contexte de recherche géographique"
        icon="fa-map-marker-alt"
        defaultExpanded={true}
        badge={badge}
        dataTour="filter-location"
        expandOnTourTargets={LOCATION_TOUR_TARGETS}>
        <div className="mv-search-context">
          {showLocationInputs && (
            <div className="mv-search-context__mode">
              <div className="form-check">
                <input
                  id={CONTEXT_MODE_INPUT_ID}
                  className="form-check-input"
                  type="checkbox"
                  checked={locationInputMode}
                  disabled={isLoading}
                  onChange={(event) => onLocationInputModeChange?.(event.target.checked)}
                />
                <label className="form-check-label" htmlFor={CONTEXT_MODE_INPUT_ID}>
                  À la saisie
                </label>
                <InfoTooltip text={INPUT_MODE_HELP} />
              </div>

              {locationInputMode && (
                <div className="mv-search-context__panel">
                  <Datasource
                    name="departmentsDatasource"
                    datatype="json"
                    datasource="apps/sinp_hdf/data/departements_hdf.json">
                    {({ data: departments, loading, error }) => {
                      if (loading) return <p className="loading-message">Chargement...</p>;
                      if (error)
                        return <p className="error-message">Erreur de chargement</p>;

                      return (
                        <>
                          {filterVisibility.showDepartment && (
                            <div data-tour="filter-department">
                              <MultiSelectSearchComponent
                                datasource={departments || []}
                                selectedValues={filters.filteredDepartments || []}
                                returnValueKey="code_dpt"
                                title="Département"
                                label={(item) => `${item.code_dpt} - ${item.libelle}`}
                                minCharacters={1}
                                maxResults={10}
                                multiselect={false}
                                onChange={handleDptChange}
                              />
                            </div>
                          )}

                          {filterVisibility.showCommune && (
                            <Datasource
                              name="communesDatasource"
                              datatype="json"
                              datasource="apps/sinp_hdf/data/communes_hdf.json">
                              {({
                                data: communes,
                                loading: loadingCommunes,
                                error: errorCommunes,
                              }) => {
                                if (loadingCommunes)
                                  return <p className="loading-message">Chargement...</p>;
                                if (errorCommunes)
                                  return <p className="error-message">Erreur</p>;

                                return (
                                  <div data-tour="filter-commune">
                                    <MultiSelectSearchComponent
                                      datasource={communes || []}
                                      selectedValues={filters.filteredCommunes || []}
                                      parentDatasource={filters.filteredDepartments}
                                      parentDatasourceKey="code_dpt"
                                      searchKey="code_dpt"
                                      returnValueKey="code_insee"
                                      minCharacters={1}
                                      maxResults={10}
                                      maxSelections={5}
                                      title="Commune (5 max.)"
                                      label={(item) =>
                                        `${item.code_insee} - ${item.libelle_commune}`
                                      }
                                      multiselect={true}
                                      onChange={handleComChange}
                                    />
                                  </div>
                                );
                              }}
                            </Datasource>
                          )}
                        </>
                      );
                    }}
                  </Datasource>

                  {filterVisibility.showEpci && (
                    <Datasource
                      name="epcisDatasource"
                      datatype="json"
                      datasource="apps/sinp_hdf/data/epci_hdf.json">
                      {({ data: epcis, loading, error }) => {
                        if (loading) return <p className="loading-message">Chargement...</p>;
                        if (error) return <p className="error-message">Erreur</p>;

                        return (
                          <div data-tour="filter-epci">
                            <MultiSelectSearchComponent
                              datasource={epcis || []}
                              selectedValues={filters.filteredEpcis || []}
                              returnValueKey="code_epci"
                              minCharacters={2}
                              maxResults={10}
                              maxSelections={5}
                              title="EPCI (5 max.)"
                              label={(item) => item.nom_epci}
                              multiselect={true}
                              onChange={handleEpciChange}
                            />
                          </div>
                        );
                      }}
                    </Datasource>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mv-search-context__mode">
            <div className="form-check">
              <input
                id={CONTEXT_MODE_SELECTION_ID}
                className="form-check-input"
                type="checkbox"
                checked={selectionMode}
                disabled={isLoading}
                onChange={(event) => onSelectionModeChange?.(event.target.checked)}
              />
              <label className="form-check-label" htmlFor={CONTEXT_MODE_SELECTION_ID}>
                À la sélection
              </label>
              <InfoTooltip text={SELECTION_MODE_HELP} />
            </div>

            {selectionMode && (
              <div className="mv-selection-filter mv-search-context__panel">
                {hasValidSelection ? (
                  <div className="mv-selection-filter__status is-valid" role="status">
                    <i className="fas fa-draw-polygon" aria-hidden="true"></i>
                    <span>
                      Zonage utilisé : <strong>{selectionLabel}</strong>
                    </span>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 ms-2"
                      onClick={() => onSelectionChangeRequest?.()}>
                      Modifier la sélection
                    </button>
                  </div>
                ) : visibleEnvironmentalLayers.length === 0 ? (
                  <div className="mv-selection-filter__status is-pending" role="status">
                    <span>
                      Affichez une couche de zonage dans le menu « Fonds de cartes »,
                      puis cliquez sur un zonage de la carte.{" "}
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 align-baseline"
                        onClick={() => onRevealLayers?.()}>
                        Afficher les couches
                      </button>
                    </span>
                  </div>
                ) : (
                  <div className="mv-selection-filter__status is-pending" role="status">
                    <span>
                      Cliquez sur un zonage visible sur la carte, puis cliquez sur «
                      Appliquer ».
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CollapsibleFilterSection>
    </>
  );
};

export default SearchContextSection;
