from os.path import abspath, join, normcase, sep, dirname

from orun.core.exceptions import SuspiciousFileOperation
from orun.utils.encoding import force_text


def safe_join(base, *paths):
    """
    Joins one or more path components to the base path component intelligently.
    Returns a normalized, absolute version of the final path.

    The final path must be located inside of the base path component (otherwise
    a ValueError is raised).
    """
    base = force_text(base)
    paths = [force_text(p) for p in paths]
    final_path = abspath(join(base, *paths))
    base_path = abspath(base)
    # Ensure final_path starts with base_path (using normcase to ensure we
    # don't false-negative on case insensitive operating systems like Windows),
    # further, one of the following conditions must be true:
    #  a) The next character is the path separator (to prevent conditions like
    #     safe_join("/dir", "/../d"))
    #  b) The final path must be the same as the base path.
    #  c) The base path must be the most root path (meaning either "/" or "C:\\")
    if (not normcase(final_path).startswith(normcase(base_path + sep)) and
            normcase(final_path) != normcase(base_path) and
            dirname(normcase(base_path)) != normcase(base_path)):
        raise SuspiciousFileOperation(
            'The joined path ({}) is located outside of the base path '
            'component ({})'.format(final_path, base_path))
    return final_path

