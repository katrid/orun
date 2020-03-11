from jinja2 import Markup
from functools import partial
from orun.db import models
from orun import app
from orun import render_template
#from orun.template.loader import select_template


def render_field(model_name, field_name, **ctx):
    model = app[model_name]
    field = model._meta.fields[field_name]
    templates = [
        'pwa/forms/fields/%s.jinja2' % field.get_internal_type(),
        'pwa/forms/fields/Field.jinja2',
    ]
    if field.choices:
        templates.insert(0, 'pwa/forms/fields/ChoiceField.jinja2')
        choices = field.choices
        if isinstance(choices, dict):
            choices = choices.items()
        elif isinstance(choices, list):
            choices = tuple(choices)
        ctx.setdefault('choices', choices)
    ctx.update({
        'field': field,
        'render_field': render_field,
        'render_col': render_col,
    })
    ctx.setdefault('prefix', '')
    if field.one_to_many:
        form_fields = ctx.get('form_fields')
        if form_fields:
            form_fields = [field.rel.model._meta.fields[f] for f in form_fields]
        else:
            form_fields = field.rel.model._meta.form_fields
        ctx['form_fields'] = form_fields
        list_fields = ctx.get('list_fields')
        if list_fields:
            list_fields = [field.remote_field.model._meta.fields[f] for f in list_fields]
        else:
            list_fields = form_fields
        ctx['list_fields'] = list_fields
    return Markup(
        render_template(templates, **ctx)
    )


def render_col(field):
    s = 'record.' + field.name
    if isinstance(field, models.DateField):
        s = """(%s | date:'short')""" % s
    elif isinstance(field, models.DateTimeField):
        s = """(%s | datetime:'short')""" % s
    s = """<td ng-bind="%s"></td>""" % s
    return Markup(s)
