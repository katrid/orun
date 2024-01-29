"""
Execute mako template before deserialize.
"""
import os
import warnings
from pathlib import Path
import tempfile
from jinja2 import Template

from orun.db import connection
from orun.core.serializers import base
from orun.core.serializers import get_deserializer


class Deserializer(base.Deserializer):
    def deserialize(self):
        """
        Render file and then dispatch content to serializer
        """
        filename = self.options['filename']
        if '%' in filename:
            self.stream_or_string = self.options['filename'] = filename = Path(filename % {'db_vendor': connection.vendor})
        else:
            filename = Path(filename)
        if not os.path.isfile(filename):
            warnings.warn(f'File "{filename}" does not exist')
        else:
            s = Template(self.stream.read()).render(deserializer=self)
            filename = filename.name.rsplit('.', 1)[0]
            fmt = filename.rsplit('.', 1)[1]
            deserializer = get_deserializer(fmt)
            with tempfile.NamedTemporaryFile('r+', suffix=f'.{fmt}', delete=False) as f:
                try:
                    f.write(s)
                    f.close()
                    deserializer(Path(f.name), self.addon, **self.options).deserialize()
                finally:
                    os.remove(f.name)
