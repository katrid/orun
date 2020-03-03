from orun.db.backends.base.features import BaseDatabaseFeatures
from orun.db.utils import InterfaceError


class DatabaseFeatures(BaseDatabaseFeatures):
    allows_group_by_selected_pks = True
    can_return_id_from_insert = True
    can_return_ids_from_bulk_insert = True
    has_real_datatype = True
    has_native_uuid_field = True
    has_native_duration_field = False
    can_defer_constraint_checks = True
    has_select_for_update = True
    has_select_for_update_nowait = True
    has_select_for_update_of = True
    can_release_savepoints = True
    supports_tablespaces = True
    supports_transactions = True
    can_introspect_autofield = True
    can_introspect_ip_address_field = True
    can_introspect_materialized_views = True
    can_introspect_small_integer_field = True
    can_distinct_on_fields = True
    can_rollback_ddl = True
    supports_combined_alters = True
    nulls_order_largest = True
    closed_cursor_error_class = InterfaceError
    has_case_insensitive_like = False
    greatest_least_ignores_nulls = True
    can_clone_databases = True
    supports_temporal_subtraction = True
    supports_slicing_ordering_in_compound = True
    create_test_procedure_without_params_sql = """
        CREATE PROCEDURE test_procedure () AS
        BEGIN
        DECLARE @V_I INT;
        SET @V_I = 1;
        END"""
    create_test_procedure_with_int_param_sql = """
        CREATE PROCEDURE test_procedure (@P_I INT) AS
        BEGIN
        DECLARE @V_I INT;
        SET @V_I = P_I;
        END"""
    requires_casted_case_in_updates = True
    supports_over_clause = True
    supports_aggregate_filter_clause = True
    supported_explain_formats = {'JSON', 'TEXT', 'XML'}
    validates_explain_options = False

