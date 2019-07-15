from io import BytesIO
import re

from . import token
from .core import Environment, Element


class Parser:
    def __init__(self):
        pass

    def parse(self, s, encoding='utf-8'):
        result = []
        prev_token = token.INDENT
        prev_val = None

        def goto(val):
            while True:
                toknum, tokval, pos, _, row = next(g)
                if tokval == val:
                    return toknum
                    break

        def read_attrs(attrs):
            k = None
            v = None
            last_val = None
            toknum, tokval, _, _ = next(g)
            while tokval != ')':
                if tokval == '=':
                    # set param name
                    k = last_val
                elif last_val == '=':
                    # set param value
                    attrs[k] = tokval
                    k = None
                last_val = tokval
                toknum, tokval, _, _ = next(g)

        g = token.tokenize(s)  # tokenize the string
        node = parent = None
        g = iter(g)
        indent = 0
        while True:
            toknum, tokval, _, _ = next(g)
            if toknum == 0:
                break
            elif toknum == token.INDENT:
                indent += 1
                parent = node
            elif toknum == token.DEDENT:
                indent -= 1
                if node:
                    parent = parent.parent

            if toknum == token.STRING:
                parent.stream.append(tokval)
                continue

            if prev_token in (token.INDENT, token.DEDENT, token.NEWLINE,):
                if toknum == token.NAME:
                    # start a new tag
                    element = Environment.tags.get(tokval, Element)
                    node = element(tokval, parent)
                    if parent is not None:
                        parent.stream.append(node)
                    toknum, tokval, _, _ = next(g)
                    # add css class
                    while toknum != token.NEWLINE:
                        if toknum == token.DOT:
                            toknum, tokval, _, _ = next(g)
                            if toknum == token.NEWLINE:
                                break
                            while toknum in (token.NAME, token.DOT):
                                if toknum == token.NAME:
                                    node.class_list.append(tokval)
                                if toknum == token.DOT:
                                    continue
                                toknum, tokval, _, _ = next(g)
                        # read attributes
                        if toknum == token.LPAR:
                            read_attrs(node.attrs)
                        if toknum == token.STRING:
                            # append the line content into current tag
                            node.stream.append(tokval)
                        toknum, tokval, _, _ = next(g)
                        if toknum == token.ENDMARKER:
                            break
                    if indent == 0:
                        result.append(node)
            prev_token, prev_val = toknum, tokval
            if prev_token == token.ENDMARKER:
                break
        return result

