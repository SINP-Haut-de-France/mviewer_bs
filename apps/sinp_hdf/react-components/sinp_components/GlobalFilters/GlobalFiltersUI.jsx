import React, { useEffect, useState } from "react";
import CollapsibleFilterSection from "../../components/CollapsibleFilterSection/CollapsibleFilterSection";
import DateFilter from "../../components/DateFilter/DateFilter";
import MultiSelectSearchComponent from "../../components/MultiSelectSearch/MultiSelectSearchComponent";
import CheckBoxTreeView from "../../components/CheckBoxTreeView/CheckBoxTreeView";
import Datasource from "../../components/Datasource/Datasource";
import SearchContextSection from "../SearchContext/SearchContextSection";

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
  handleEpciChange,
  handleGrpChange,
  isLoading = false,
  locationInputMode = false,
  selectionMode = false,
  hasValidSelection = false,
  selectionLabel = null,
  visibleEnvironmentalLayers = [],
  selectedSelectionLayerId = null,
  onLocationInputModeChange = null,
  onSelectionModeChange = null,
  onSelectionChangeRequest = null,
  onRevealLayers = null,
  onPrecisionLevelChange = null,
  onCoverageRateChange = null,
  useBuffer = true,
  onUseBufferChange = null,
}) => {
  const selectedTaxonFilterCount =
    (filters.filteredTaxons || []).length + (filters.filteredGroupes || []).length;
  const [taxonSectionExpanded, setTaxonSectionExpanded] = useState(true);

  // La recherche par sélection demande de manipuler la carte et le menu des
  // couches : on replie les filtres pour laisser la place à ces derniers.
  useEffect(() => {
    if (selectionMode) {
      setTaxonSectionExpanded(false);
    }
  }, [selectionMode]);

  return (
    <div className="global-filters-container">
        <SearchContextSection
          filters={filters}
          filterVisibility={filterVisibility}
          isLoading={isLoading}
          locationInputMode={locationInputMode}
          selectionMode={selectionMode}
          hasValidSelection={hasValidSelection}
          selectionLabel={selectionLabel}
          visibleEnvironmentalLayers={visibleEnvironmentalLayers}
          onLocationInputModeChange={onLocationInputModeChange}
          onSelectionModeChange={onSelectionModeChange}
          onSelectionChangeRequest={onSelectionChangeRequest}
          onRevealLayers={onRevealLayers}
          handleDptChange={handleDptChange}
          handleComChange={handleComChange}
          handleEpciChange={handleEpciChange}
          onPrecisionLevelChange={onPrecisionLevelChange}
          onCoverageRateChange={onCoverageRateChange}
          useBuffer={useBuffer}
          onUseBufferChange={onUseBufferChange}
        />

        {(filterVisibility.showTaxonomicGroup ||
          filterVisibility.showTaxon ||
          filterVisibility.showDate) && (
          <CollapsibleFilterSection
            title="Taxon"
            icon="fa-leaf"
            expanded={taxonSectionExpanded}
            onExpandedChange={setTaxonSectionExpanded}
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
    </div>
  );
};

export default GlobalFiltersUI;
