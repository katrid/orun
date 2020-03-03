"""
Serialize data to/from CSV
"""
import os
import csv
from functools import partial

from orun.core.serializers import python, base
from orun.apps import apps


class Deserializer(base.Deserializer):
    def deserialize(self):
        """
        Deserialize a stream or string of CSV data.
        """
        h = self.stream.readline().strip()
        stream_or_string = self.stream
        if self.format == 'csv':
            delimiter = ';'
            if delimiter not in h and ',' in h:
                delimiter = ','
        else:
            delimiter = '\t'
        cols = h.split(delimiter)
        reader = csv.DictReader(stream_or_string, fieldnames=cols, delimiter=delimiter)
        cols = reader.fieldnames
        model_name = self.path.name.rsplit('.', 1)[0]
        model = apps[model_name]
        # mandatory fields for csv deserializer
        i = 0
        try:
            for i, obj in enumerate(python.Deserializer(reader, model=model, fields=cols)):
                obj.save(using=self.database)
        except Exception as e:
            print('Error at line:', i)
            raise
        self.postpone = [partial(self.reset_sequence, model)]
