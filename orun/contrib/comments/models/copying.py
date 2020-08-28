import json
from orun import api
from orun.apps import apps
from orun.db import models
from orun.utils.translation import gettext_lazy as _


class CopyTo(models.Model):
    source_model = models.ForeignKey('content.type', null=False, label=_('Source Model'))
    action = models.ForeignKey('ui.action.window', label=_('Action (Optional)'))
    dest_model = models.ForeignKey('content.type', null=False, label=_('Destination Model'))
    caption = models.CharField(label=_('Caption'))
    active = models.BooleanField(default=True)
    fields_mapping = models.TextField(label=_('Fields Mapping'), template={'form': 'view.form.code-editor.pug'})

    class Meta:
        name = 'ir.copy.to'
        verbose_name = _('Copying Settings')
        verbose_name_plural = _('Copying Settings')

    def __str__(self):
        return 'Copy from "%s" to "%s"' % (self.source_model, self.dest_model)

    @api.method
    def get_copy_to_choices(self, model):
        opts = self.objects.filter(source_model__name=model)
        return [
            {'id': opt.pk, 'name': str(opt.caption or opt.dest_model.model_class()._meta.verbose_name)}
            for opt in opts
        ]

    @api.method
    def copy_to(self, id, source_id):
        ir_copy_to = self.objects.get(id)
        if source_id is not None and ir_copy_to.active:
            source = self.env[ir_copy_to.source_model.name]
            source_obj = source.objects.get(source_id)
            dest = self.env[ir_copy_to.dest_model.name]
            mapping = ir_copy_to.fields_mapping
            mapping = json.loads(mapping)
            values = copy_to_dest(mapping, dest, source_obj.to_json())
            return {
                'model': dest._meta.name,
                'value': values,
                'context': {
                    'copy_from': [source._meta.name, source_id],
                }
            }


def auto_mapping_fields(source, dest):
    res = {}
    for f in source._meta.fields:
        if f.copy and f.name in dest._meta.fields._dict:
            name = f.name
            df = dest._meta.fields[name]
            if f.one_to_many:
                assert df.one_to_many
                res[f] = (df, auto_mapping_fields(f.rel.model, df.rel.model))
            else:
                res[f] = (df, None)
    return res


def get_val(obj, attr: str):
    if attr.startswith('='):
        return attr[1:]
    else:
        return obj.get(attr)


def copy_to_dest(mapping, dest, source):
    values = {}
    for k, v in mapping.items():
        field = dest._meta.fields[k]
        if field.one_to_many:
            values[k] = []
            if isinstance(v, dict):
                lines = source[v['field']]
                if v and lines:
                    for line in lines:
                        values[k].append({'action': 'CREATE', 'values': copy_to_dest(v['values'], field.rel.model, line)})
            elif isinstance(v, list):
                for line in v:
                    values[k].append({'action': 'CREATE', 'values': copy_to_dest(line, field.rel.model, source)})
        else:
            values[k] = get_val(source, v)
    return values

