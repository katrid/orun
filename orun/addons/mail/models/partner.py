from orun.db import models
import base.models

from .comment import Comments


class Partner(base.models.Partner, Comments):
    pass

