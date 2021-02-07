
class BaseDeserializer:
    encoding = 'utf-8'

    def from_file(self, filename):
        with open(filename, 'r', encoding=self.encoding) as f:
            return self.read(f.read())

    def from_stream(self, stream):
        return self.read(stream.read())

    def read(self, string_or_bytes):
        raise NotImplementedError


class BaseObject:
    pass
