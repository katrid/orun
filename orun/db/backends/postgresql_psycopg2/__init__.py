import warnings

from orun.utils.deprecation import RemovedInOrun30Warning

warnings.warn(
    "The orun.db.backends.postgresql_psycopg2 module is deprecated in "
    "favor of orun.db.backends.postgresql.",
    RemovedInOrun30Warning, stacklevel=2
)
