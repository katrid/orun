import re
from jinja2 import evalcontextfilter, Markup


@evalcontextfilter
def linebreaks(eval_ctx, value):
    """Converts newlines into <p> and <br />s."""
    value = re.sub(r'\r\n|\r|\n', '\n', value)  # normalize newlines
    lines = re.split('\n{2,}', value)
    lines = [u'<p>%s</p>' % p.replace('\n', '<br />') for p in lines]
    lines = u'\n\n'.join(lines)
    return Markup(lines)
