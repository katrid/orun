"""
Orun's support for templates.

The orun.template namespace contains two independent subsystems:

1. Multiple Template Engines: support for pluggable template backends,
   built-in backends and backend-independent APIs
2. Orun Template Language: Orun's own template engine, including its
   built-in loaders, context processors, tags and filters.

Ideally these subsystems would be implemented in distinct packages. However
keeping them together made the implementation of Multiple Template Engines
less disruptive .

Here's a breakdown of which modules belong to which subsystem.

Multiple Template Engines:

- orun.template.backends.*
- orun.template.loader
- orun.template.response

Orun Template Language:

- orun.template.base
- orun.template.context
- orun.template.context_processors
- orun.template.loaders.*
- orun.template.debug
- orun.template.defaultfilters
- orun.template.defaulttags
- orun.template.engine
- orun.template.loader_tags
- orun.template.smartif

Shared:

- orun.template.utils

"""

# Multiple Template Engines

from .engine import Engine
from .utils import EngineHandler

engines = EngineHandler()

__all__ = ('Engine', 'engines')


# Orun Template Language

# Public exceptions
from .base import VariableDoesNotExist                                  # NOQA isort:skip
from .context import ContextPopException                                # NOQA isort:skip
from .exceptions import TemplateDoesNotExist, TemplateSyntaxError       # NOQA isort:skip

# Template parts
from .base import (                                                     # NOQA isort:skip
    Context, Node, NodeList, Origin, RequestContext, Template, Variable,
)

# Library management
from .library import Library                                            # NOQA isort:skip


__all__ += ('Template', 'Context', 'RequestContext')
