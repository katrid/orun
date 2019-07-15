from sqlalchemy.ext.compiler import compiles
from sqlalchemy.types import Integer, Numeric


class Identity(Integer):
    fk_type = Numeric


@compiles(Identity, 'oracle')
def compile_identity(element, compiler, **kwargs):
    return 'NUMBER GENERATED ALWAYS AS IDENTITY'
