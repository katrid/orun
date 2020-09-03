"""
Execute mako template before deserialize.
"""
import os
import tempfile
from jinja2 import Template

from orun.shortcuts import render
from orun.core.serializers import base
from orun.core.serializers import get_deserializer


class Deserializer(base.Deserializer):
    def deserialize(self):
        """
        Render file and then dispatch content to serializer
        """
        filename = self.options['filename']
        s = Template(self.stream.read()).render(deserializer=self)
        filename = filename.rsplit('.', 1)[0]
        fmt = filename.rsplit('.', 1)[1]
        deserializer = get_deserializer(fmt)
        with tempfile.NamedTemporaryFile('r+', suffix=f'.{fmt}', delete=False) as f:
            try:
                f.write(s)
                f.close()
                deserializer(s, self.addon, **self.options).deserialize()
            finally:
                os.remove(f.name)
