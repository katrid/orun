"""
Execute mako template before deserialize.
"""
import os
import tempfile

from orun import render_template_string
from orun.core.serializers import base
from orun.core.serializers import get_deserializer


class Deserializer(base.Deserializer):
    def deserialize(self, stream_or_string):
        """
        Render file and then dispatch content to serializer
        """
        filename = self.options['filename']
        s = render_template_string(stream_or_string.read())
        filename = filename.rsplit('.', 1)[0]
        fmt = filename.rsplit('.', 1)[1]
        deserializer = get_deserializer(fmt)
        with tempfile.NamedTemporaryFile('r+', suffix='.sql', delete=False) as f:
            try:
                f.write(s)
                f.close()
                deserializer(f, self.app, **self.options)
            finally:
                os.remove(f.name)
