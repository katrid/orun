from typing import List
import enum

from .base import BaseDeserializer, BaseObject
from .fields import Field


class TextType(enum.Enum):
    FIXED_LENGTH = 1
    TEXT_SEPARATOR = 2


class BreakLine:
    pass


class TextDeserializer(BaseDeserializer):
    text_type: TextType = TextType.FIXED_LENGTH
    line_separator: str = BreakLine
    buffer = None
    lines: List[str] = None
    fields: List[Field] = None

    def read(self, string_or_stream):
        if isinstance(string_or_stream, bytes):
            string_or_stream = string_or_stream.decode('utf-8')
        self.buffer = string_or_stream
        if self.line_separator == BreakLine:
            self.lines = self.buffer.splitlines(keepends=False)
        else:
            self.lines = self.buffer.split(self.line_separator)
        for line in self.lines:
            obj = self.read_line(line)
            if obj is not None:
                yield obj

    def read_line(self, s: str):
        if s:
            l = 0
            obj = {}
            if self.text_type == TextType.FIXED_LENGTH:
                for f in self.fields:
                    val = s[l:f.fixed_length]
                    val = f.to_python(val)
                    obj[f.name] = val
                    l += f.fixed_length
