import React from "react";
import CollapsibleFilterSection from "../../components/CollapsibleFilterSection/CollapsibleFilterSection";
import DateFilter from "../../components/DateFilter/DateFilter";
import MultiSelectSearchComponent from "../../components/MultiSelectSearch/MultiSelectSearchComponent";
import CheckBoxTreeView from "../../components/CheckBoxTreeView/CheckBoxTreeView";
import Datasource from "../../components/Datasource/Datasource";

const TAXON_FILTER_TOUR_TARGETS = [
  "filter-taxonomic-group",
  "filter-taxon",
  "filter-date",
];

const GlobalFiltersUI = ({
  filters,
  filterVisibility,
  activeProfile,
  handleDateChange,
  handleTaxChange,
  handleDptChange,
  handleComChange,
  handleGrpChange,
  isLoading = false,
  selectionMode = false,
  hasValidSelection = false,
  selectionLabel = null,
  visibleEnvironmentalLayers = [],
  selectedSelectionLayerId = null,
  onSelectionModeChange = null,
  onSelectionLayerChange = null,
  onRequestSelectionChange = null,
  onSelectionChangeRequest = null,
}) => {
  const selectedTaxonFilterCount =
    (filters.filteredTaxons || []).length + (filters.filteredGroupes || []).length;

  return (
    <div className="global-filters-container">
        {/*/!* Indicateur du profil actif *!/*/}
        {/*{activeProfile && (*/}
        {/*  <div className="filter-profile-indicator">*/}
        {/*    <small className="text-muted">*/}
        {/*      <i className="fas fa-layer-group"></i> {activeProfile.name}*/}
        {/*    </small>*/}
        {/*  </div>*/}
        {/*)}*/}
        {(filterVisibility.showTaxonomicGroup ||
          filterVisibility.showTaxon ||
          filterVisibility.showDate) && (
          <CollapsibleFilterSection
            title="Taxon"
            icon="fa-leaf"
            defaultExpanded={true}
            badge={selectedTaxonFilterCount || null}
            dataTour="filter-taxon-group"
            expandOnTourTargets={TAXON_FILTER_TOUR_TARGETS}>
          {filterVisibility.showTaxonomicGroup && (
            <CollapsibleFilterSection
              title="Groupes taxinomiques"
              icon="fa-sitemap"
              defaultExpanded={false}
              badge={filters.filteredGroupes?.length || null}
              dataTour="filter-taxonomic-group">
              <Datasource
                name="groupesDatasource"
                datatype="json"
                datasource="apps/sinp_hdf/data/taxonomie_tree.json">
                {({ data: groupes, loading, error }) => {
                  if (loading) return <p className="loading-message">Chargement...</p>;
                  if (error) return <p className="error-message">Erreur</p>;

                  return (
                    <>
                      <CheckBoxTreeView
                        datasource={groupes || []}
                        selectedValues={filters.filteredGroupes || []}
                        idKey="id"
                        returnKey="id"
                        label={(node) => node.name}
                        childrenKey="children"
                        title=""
                        onSelectionChange={handleGrpChange}
                      />
                    </>
                  );
                }}
              </Datasource>
              </CollapsibleFilterSection>
            )}

          {filterVisibility.showTaxon && (
            <CollapsibleFilterSection
              title="Recherche d'espèce"
              icon="fa-leaf"
              defaultExpanded={true}
              dataTour="filter-taxon">
              <Datasource
                key={`taxon-datasource-${(filters.filteredGroupes || []).join("-")}`}
                name="taxonsDatasource"
                datatype="wfs"
                lazyloading={true}
                minCharacters={2}
                queryParams={{ maxFeatures: 10 }}
                searchDependencies={filters.filteredGroupes || []}
                searchUrlBuilder={(query, params, selectedGroupIds) => {
                  const baseURL = `${
                    mviewer.env?.[mviewer.env?.CURRENT_ENV]?.GEOSERVER_BASE_URL
                  }/wfs`;
                  const typeName = "sinp_diffusion:v_taxref_search";
                  const encodedFilter = encodeURIComponent(
                    `search_field ILIKE '%${query}%'`
                  );
                  const groupIds = (selectedGroupIds || []).filter(
                    (groupId) => groupId !== null && groupId !== undefined
                  );
                  const viewParams = `&VIEWPARAMS=${encodeURIComponent(
                    `GROUP_IDS:${groupIds.length > 0 ? groupIds.join("|") : "0"}`
                  )}`;

                  return `${baseURL}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=${typeName}&CQL_FILTER=${encodedFilter}&outputFormat=json&${new URLSearchParams(
                    params
                  ).toString()}${viewParams}`;
                }}>
                {({ data: taxons, loading, error, setQuery }) => (
                  <>
                    <MultiSelectSearchComponent
                      datasource={taxons || []}
                      selectedValues={filters.filteredTaxons || []}
                      returnValueKey="cd_ref"
                      cacheKey="taxons_selected"
                      title="Nom scientifique ou vernaculaire"
                      label={(item) => (
                        <div className="taxon-label">
                          <div className="taxon-vernacular">
                            {item.nom_vern || item.nom_complet}
                          </div>
                          <div className="taxon-scientific">{item.nom_complet}</div>
                        </div>
                      )}
                      minCharacters={3}
                      maxResults={200}
                      multiselect={true}
                      onChange={handleTaxChange}
                      onSearch={setQuery}
                      loading={loading}
                      error={error}
                    />
                  </>
                )}
              </Datasource>
            </CollapsibleFilterSection>
          )}

          {filterVisibility.showDate && (
            <CollapsibleFilterSection
              title="Période d'observation"
              icon="fa-calendar"
              defaultExpanded={true}
              dataTour="filter-date">
              <DateFilter
                dateDeb={filters.dateDeb}
                dateFin={filters.dateFin}
                defaultNbYears={20}
                title="Dates"
                onChange={handleDateChange}
              />
            </CollapsibleFilterSection>
          )}
        </CollapsibleFilterSection>
      )}

      {/* Section Géographique */}
      {(filterVisibility.showDepartment ||
        filterVisibility.showCommune ||
        visibleEnvironmentalLayers.length > 0 ||
        selectionMode) && (
        <CollapsibleFilterSection
          title="Localisation"
          icon="fa-map-marker-alt"
          defaultExpanded={true}
          badge={
            selectionMode
              ? hasValidSelection
                ? 1
                : null
              : filters.filteredCommunes?.length ||
                filters.filteredDepartments?.length ||
                null
          }
          dataTour="filter-location">
          <div className="mv-selection-filter">
            <div className="multi-select-header">
              <div className="multi-select-label mv-selection-filter__label">
                Recherche par sélection
              </div>
            </div>

            <div className="form-check">
              <input
                id="sinp-selection-filter-toggle"
                className="form-check-input"
                type="checkbox"
                checked={selectionMode}
                disabled={isLoading || visibleEnvironmentalLayers.length === 0}
                onChange={(event) => onSelectionModeChange?.(event.target.checked)}
              />
              <label
                className="form-check-label"
                htmlFor="sinp-selection-filter-toggle">
                Recherche par sélection
              </label>
            </div>

            {selectionMode && hasValidSelection ? (
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
            ) : null}

            {selectionMode && !hasValidSelection ? (
              <div className="mv-selection-filter__status is-pending" role="status">
                <span>
                  Cliquez sur un zonage visible sur la carte, puis cliquez sur « Appliquer le filtrage ».
                </span>
              </div>
            ) : null}

            {!selectionMode && visibleEnvironmentalLayers.length === 0 ? (
              <div className="mv-selection-filter__status is-pending" role="status">
                Activez au moins une couche de zonage environnemental pour utiliser
                ce mode.
              </div>
            ) : null}
          </div>

          <div
            className={`mv-location-standard-filters ${
              selectionMode ? "is-disabled" : ""
            }`}
            aria-disabled={selectionMode}>
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
                          disabled={selectionMode}
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
                                disabled={selectionMode}
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
          </div>
        </CollapsibleFilterSection>
      )}

    </div>
  );
};

export default GlobalFiltersUI;
