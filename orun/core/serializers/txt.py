"""
Serialize data to/from TXT
"""
import os
import csv

from orun.db import session
from orun.core.serializers import python, Deserializer as BaseDeserializer


class Deserializer(BaseDeserializer):
    def deserialize(self, stream_or_string):
        """
        Deserialize a stream or string of TXT data.
        """
        reader = csv.DictReader(stream_or_string, delimiter='\t')
        cols = reader.fieldnames
        model_name = os.path.basename(self.filename).rsplit('.', 1)[0]
        model = self.app[model_name]
        # mandatory fields for txt deserializer
        assert 'pk' in cols or 'id' in cols, 'Unable do detect an identity column'
        i = 1
        try:
            for obj in python.Deserializer(reader, app=self.app, model=model, fields=cols):
                i += 1
        except:
            print('Error at line:', i)
            raise
        self.app.connection.schema_editor().reset_sequence(model._meta.table.fullname)
