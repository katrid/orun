import re


ENDMARKER = 0
NAME = 1
NUMBER = 2
STRING = 3
NEWLINE = 4
INDENT = 5
DEDENT = 6
LPAR = 7
RPAR = 8
COMMA = 9
DOT = 10
EQUAL = 11
VBAR = 12
COMMENT = 13
OP = 14



strings_delim = ('"', "'")
NAME_RE = re.compile(r'^[\w\-\:\d]+')


def tokenize(code: str):
    lines = code.splitlines()
    continued = False
    indents = [0]
    last_indent = 0
    for i, line in enumerate(lines):
        max = len(line)
        pos = 0
        col = 0
        # new line
        if i > 0:
            yield(NEWLINE, '\n', i, 0)
        while pos < max:
            c = line[pos]
            if c == ' ':
                col += 1
            elif c == '\f':
                col = 0
            else:
                break
            pos += 1
        if pos == max:
            break
        if col > indents[-1]:
            indents.append(col)
            yield (INDENT, '', i, pos)
        elif continued and col < last_indent:
            continued = False

        while col < indents[-1]:
            if col not in indents:
                raise IndentationError(
                    "unindent does not match any outer indentation level",
                    ("<tokenise>", i, pos, i))
            indents = indents[:-1]

            if not continued:
                yield (DEDENT, line[:pos], i, pos)

        pare = False
        while pos < max:
            c = line[pos]
            if continued:
                yield (STRING, line[pos:], i, pos)
                break
            if c == '|':
                yield (VBAR, '|', i, pos)
                pos += 1
                yield (STRING, line[pos:], i, pos)
                break
            elif c == '(':
                yield (LPAR, '(', i, pos)
                pos += 1
                pare = True
                continue
            elif c == ')':
                yield (RPAR, ')', i, pos)
                pos += 1
                pare = False
                continue
            elif c == '=':
                yield (EQUAL, '=', i, pos)
                pos += 1
                continue
            elif c == ',':
                yield (COMMA, ',', i, pos)
                pos += 1
                continue
            elif c == ' ':
                pos += 1
                if not pare:
                    s = line[pos:]
                    if s:
                        yield (STRING, s, i, pos)
                        pos += len(s)
                        continue
            elif c == '.':
                last_indent = indents[-1]
                yield (DOT, '.', i, pos)
                pos += 1
                continued = DOT
            elif c in strings_delim:
                s = ''
                pos += 1
                while pos < max:
                    c2 = line[pos]
                    if c2 == c:
                        yield (STRING, s, i, pos - len(s))
                        pos += 1
                        break
                    else:
                        s += c2
                    pos += 1
                continue
            elif line[pos:2] == '//':
                continued = True
                last_indent = indents[-1]
                yield (COMMENT, line[pos:2], i, pos)
                yield (STRING, line[pos+2:], i, pos)
                break
            elif line[pos:3] == '//-':
                continued = True
                last_indent = indents[-1]
                yield (COMMENT, line[pos:3], i, pos)
                yield (STRING, line[pos+3:], i, pos)
                break
            match = NAME_RE.match(line[pos:])
            if match:
                continued = False
                span = match.span()[1]
                yield (NAME, match.group(), i, pos)
                pos += span
                if pos < max and line[pos] == ' ':
                    pos += 1
                    s = line[pos:]
                    yield (STRING, s, i, pos)
                    pos += len(s)
                    break
                continue
    yield (ENDMARKER, '', i, 0)


EXACT_TOKEN_TYPES = {
    '(':   LPAR,
    ')':   RPAR,
    ',':   COMMA,
    '|':   VBAR,
    '=':   EQUAL,
    '.':   DOT,
}


Name = r'\w+-*'
