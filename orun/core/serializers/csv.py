"""
Serialize data to/from CSV
"""
import os
import csv

from orun.core.serializers.python import Deserializer as PythonDeserializer
from orun.core.serializers import base


class Deserializer(base.Deserializer):
    def deserialize(self, stream_or_string):
        """
        Deserialize a stream or string of CSV data.
        """
        h = stream_or_string.readline()
        stream_or_string.seek(0, 0)
        reader = csv.DictReader(stream_or_string, delimiter=';' if ';' in h else ',')
        row = reader.reader
        cols = reader.fieldnames
        model_name = os.path.basename(self.options['filename']).rsplit('.', 1)[0]
        model = self.app[model_name]
        # mandatory fields for csv deserializer
        i = 0
        try:
            for i, obj in enumerate(PythonDeserializer(reader, app=self.app, model=model, fields=cols)):
                pass
        except:
            print('Error at line:', i)
            raise
        self.app.connection.schema_editor().reset_sequence(model._meta.table.fullname)
