-- ============================================================================
-- FONCTION: Recalcul des rattachements administratifs ET grilles
-- ============================================================================
-- Optimisée pour:
--   1. Communes et intercommunalités (administratif)
--   2. Grilles 5x5, 10x10, etc. (avec table de mapping pré-calculée)
-- ============================================================================

-- DROP FUNCTION sinp_types.recalculer_rattachements(uuid, int4, text, uuid);

CREATE OR REPLACE FUNCTION sinp_types.recalculer_rattachements(p_id_loc_type uuid, p_typ_local_id integer, p_code text, p_objet_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_geom geometry;
    v_is_grille boolean;
    v_communes_ids integer[];
BEGIN
    v_is_grille := false;

    -- Récupération de la géométrie selon le type
    IF p_objet_id IS NOT NULL THEN
        SELECT geometry INTO v_geom
        FROM sinp_types."objetGeographiqueType"
        WHERE "objGeoId" = p_objet_id;
    ELSIF p_typ_local_id IN (2201, 2214) THEN
        -- Communes et intercommunalités
        SELECT adm.geometry INTO v_geom
        FROM sinp_referentiels.ref_administratif adm
        WHERE adm.type_localisation = p_typ_local_id
          AND adm.code = p_code;
    ELSIF p_typ_local_id IN (2204, 2205, 2206, 2207, 2208, 2211, 2212, 2213) THEN
        v_is_grille := true;
        -- Grilles référentielles
        SELECT gri.geometry INTO v_geom
        FROM sinp_referentiels.ref_grille gri
        WHERE gri."typeLocId" = p_typ_local_id
          AND lower(gri.cd_sig) = lower(p_code);
    ELSE
        v_geom := NULL;
    END IF;

    IF v_geom IS NULL THEN
        RAISE NOTICE 'AUCUNE GEOMETRIE TROUVEE POUR LA LOCALISATION <%> DE TYPE <%> - <%>',
            p_id_loc_type, p_code, p_typ_local_id;
        RETURN;
    END IF;

    -- Supprimer les rattachements existants
    DELETE FROM sinp_types.rel_ratt_adm WHERE "idLocType" = p_id_loc_type;
    DELETE FROM sinp_types.rel_ratt_grille WHERE "idLocType" = p_id_loc_type;

    -- ========================================================================
    -- RATTACHEMENT ADMINISTRATIF (communes, départements, EPCI)
    -- ========================================================================
    INSERT INTO sinp_types.rel_ratt_adm(
        ratt_adm_id,
        "idLocType",
        ref_adm_id,
        taux_recouvrement,
        date_calc
    )
    SELECT
        sinp_core.check_and_cast_uuid('', true),
        p_id_loc_type,
        com.id,
        CASE ST_GeometryType(v_geom)
            WHEN 'ST_Polygon' THEN
                ST_Area(ST_Intersection(v_geom, com.geometry)) / NULLIF(ST_Area(v_geom), 0) * 100
            WHEN 'ST_MultiPolygon' THEN
                ST_Area(ST_Intersection(v_geom, com.geometry)) / NULLIF(ST_Area(v_geom), 0) * 100
            WHEN 'ST_LineString' THEN
                ST_Length(ST_Intersection(v_geom, com.geometry)) / NULLIF(ST_Length(v_geom), 0) * 100
            WHEN 'ST_MultiLineString' THEN
                ST_Length(ST_Intersection(v_geom, com.geometry)) / NULLIF(ST_Length(v_geom), 0) * 100
            WHEN 'ST_Point' THEN
                CASE WHEN ST_Intersects(v_geom, com.geometry) THEN 100 ELSE 0 END
            WHEN 'ST_MultiPoint' THEN
                (ST_NumGeometries(ST_Intersection(v_geom, com.geometry))::float /
                 NULLIF(ST_NumGeometries(v_geom), 0) * 100)
            WHEN 'ST_GeometryCollection' THEN
                -- Pour les collections, on utilise l'aire si disponible, sinon longueur
                CASE
                    WHEN ST_Area(v_geom) > 0 THEN
                        ST_Area(ST_Intersection(v_geom, com.geometry)) / NULLIF(ST_Area(v_geom), 0) * 100
                    WHEN ST_Length(v_geom) > 0 THEN
                        ST_Length(ST_Intersection(v_geom, com.geometry)) / NULLIF(ST_Length(v_geom), 0) * 100
                    ELSE
                        CASE WHEN ST_Intersects(v_geom, com.geometry) THEN 100 ELSE 0 END
                END
            ELSE 0
        END AS recouvrement,
        CURRENT_DATE
    FROM sinp_referentiels.ref_administratif com
    WHERE com.type_localisation IN (2201, 2214)
      AND ST_Intersects(com.geometry, v_geom);

    -- Récupérer les IDs des communes intersectées pour filtrer les grilles
    SELECT array_agg(ref_adm_id) INTO v_communes_ids
    FROM sinp_types.rel_ratt_adm
    WHERE "idLocType" = p_id_loc_type;

    -- ========================================================================
    -- RATTACHEMENT GRILLES (optimisé avec table de mapping communes-grilles)
    -- ========================================================================
    -- ACTIVE: Utilise la table de mapping pré-calculée pour performance
    INSERT INTO sinp_types.rel_ratt_grille(
        ratt_adm_id,
        "idLocType",
        ref_gri_id,
        taux_recouvrement,
        date_calc
    )
    SELECT
        sinp_core.check_and_cast_uuid('', true),
        p_id_loc_type,
        gri.grid_id,
        CASE ST_GeometryType(v_geom)
            WHEN 'ST_Polygon' THEN
                ROUND(ST_Area(ST_Intersection(v_geom, gri.geometry)) / NULLIF(ST_Area(v_geom), 0) * 100)::integer
            WHEN 'ST_MultiPolygon' THEN
                ROUND(ST_Area(ST_Intersection(v_geom, gri.geometry)) / NULLIF(ST_Area(v_geom), 0) * 100)::integer
            WHEN 'ST_LineString' THEN
                ROUND(ST_Length(ST_Intersection(v_geom, gri.geometry)) / NULLIF(ST_Length(v_geom), 0) * 100)::integer
            WHEN 'ST_MultiLineString' THEN
                ROUND(ST_Length(ST_Intersection(v_geom, gri.geometry)) / NULLIF(ST_Length(v_geom), 0) * 100)::integer
            WHEN 'ST_Point' THEN
                CASE WHEN ST_Intersects(v_geom, gri.geometry) THEN 100 ELSE 0 END
            WHEN 'ST_MultiPoint' THEN
                ROUND((ST_NumGeometries(ST_Intersection(v_geom, gri.geometry))::float /
                 NULLIF(ST_NumGeometries(v_geom), 0) * 100))::integer
            WHEN 'ST_GeometryCollection' THEN
                CASE
                    WHEN ST_Area(v_geom) > 0 THEN
                        ROUND(ST_Area(ST_Intersection(v_geom, gri.geometry)) / NULLIF(ST_Area(v_geom), 0) * 100)::integer
                    WHEN ST_Length(v_geom) > 0 THEN
                        ROUND(ST_Length(ST_Intersection(v_geom, gri.geometry)) / NULLIF(ST_Length(v_geom), 0) * 100)::integer
                    ELSE
                        CASE WHEN ST_Intersects(v_geom, gri.geometry) THEN 100 ELSE 0 END
                END
            ELSE 0
        END AS recouvrement,
        CURRENT_DATE
    FROM sinp_referentiels.ref_grille gri
    INNER JOIN sinp_referentiels.ref_commune_grille_map cgm
        ON cgm.grille_id = gri.grid_id
        AND cgm.type_grille = gri."typeLocId"
    WHERE gri.geometry IS NOT NULL
      AND gri."typeLocId" IN (2204, 2205, 2206, 2207, 2208, 2211, 2212, 2213)
      -- OPTIMISATION: Utiliser la table de mapping pré-calculée
      AND cgm.commune_id = ANY(v_communes_ids)
      -- Intersection finale avec la géométrie complète (pas le centroïde!)
      AND ST_Intersects(gri.geometry, v_geom);

    RAISE NOTICE 'Rattachements recalculés pour localisation % (type: %, code: %)', 
        p_id_loc_type, p_typ_local_id, p_code;

END;
$function$
;


-- ============================================================================
-- FONCTION: Recalcul batch avec progression
-- ============================================================================

-- DROP FUNCTION sinp_types.recalculer_rattachements_batch(int4, int4);

CREATE OR REPLACE FUNCTION sinp_types.recalculer_rattachements_batch(p_batch_size integer DEFAULT 1000, p_type_loc_filter integer DEFAULT NULL::integer)
 RETURNS TABLE(total_traite bigint, total_erreurs bigint, duree interval)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_total_traite bigint := 0;
    v_total_erreurs bigint := 0;
    v_start_time timestamp;
    v_batch_start_time timestamp;
    v_loc_record record;
BEGIN
    v_start_time := clock_timestamp();

    RAISE NOTICE 'Démarrage du recalcul par lot (taille: %) - Filter: %', p_batch_size, p_type_loc_filter;

    FOR v_loc_record IN
        SELECT
            lt."idLocType",
            lt."typLocalId",
            lt."codeLocali",
            lt."objGeoId"
        FROM sinp_types."localisationType" lt
        WHERE (p_type_loc_filter IS NULL OR lt."typLocalId" = p_type_loc_filter)
        ORDER BY lt."idLocType"
    LOOP
        BEGIN
            v_batch_start_time := clock_timestamp();

            -- Appel de la fonction de recalcul
            PERFORM sinp_types.recalculer_rattachements(
                v_loc_record."idLocType"::uuid,
                v_loc_record."typLocalId"::integer,
                v_loc_record."codeLocali"::text,
                v_loc_record."objGeoId"::uuid
            );

            v_total_traite := v_total_traite + 1;

            -- Log de progression tous les N enregistrements
            IF v_total_traite % p_batch_size = 0 THEN
                COMMIT; -- Commit par lot
                RAISE NOTICE '% localisations traitées (dernière durée: %)',
                    v_total_traite,
                    clock_timestamp() - v_batch_start_time;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_total_erreurs := v_total_erreurs + 1;
            RAISE WARNING 'Erreur pour localisation % (type: %, code: %): %',
                v_loc_record."idLocType",
                v_loc_record."typLocalId",
                v_loc_record."codeLocali",
                SQLERRM;
        END;
    END LOOP;

    COMMIT; -- Commit final
    RAISE NOTICE 'Recalcul terminé: % traités, % erreurs, durée: %',
        v_total_traite, v_total_erreurs, clock_timestamp() - v_start_time;

    RETURN QUERY SELECT v_total_traite, v_total_erreurs, clock_timestamp() - v_start_time;
END;
$function$
;


-- ============================================================================
-- EXEMPLES D'UTILISATION
-- ============================================================================

-- 1. Recalculer tous les rattachements
-- SELECT * FROM sinp_types.recalculer_rattachements_batch(500);

-- 2. Recalculer uniquement les grilles 5x5 (type 2204)
-- SELECT * FROM sinp_types.recalculer_rattachements_batch(500, 2204);

-- 3. Vérifier les rattachements grilles pour une localisation
-- SELECT rg.*, gri.cd_sig, gri."typeLocId"
-- FROM sinp_types.rel_ratt_grille rg
-- LEFT JOIN sinp_referentiels.ref_grille gri ON gri.grid_id = rg.ref_gri_id
-- WHERE rg."idLocType" = 'YOUR_ID_HERE'
-- ORDER BY gri."typeLocId", gri.cd_sig;
