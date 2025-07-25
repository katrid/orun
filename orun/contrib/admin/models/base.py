import os
import math
from typing import List
from collections import defaultdict
import copy
from functools import reduce
from itertools import chain
import io

from orun.apps import apps
from orun.core.exceptions import FieldDoesNotExist, ValidationError
from orun.utils.xml import get_xml_fields, etree
from orun.utils.translation import gettext
from orun import api
from orun.conf import settings
from orun import SUPERUSER
from orun.db import models
from orun.db.models.fields.related_descriptors import ReverseManyToOneDescriptor
from orun.template.loader import select_template
from orun.contrib.admin.models import ui
from orun.db.models import NOT_PROVIDED, Field, BooleanField, Q, ObjectDoesNotExist
from orun.db.models.signals import (
    before_insert, before_update, before_delete,
    after_insert, after_update, after_delete,
)
from orun.http import HttpRequest, HttpResponse
from orun.db.models.aggregates import Count
from orun.utils.encoding import force_str

PAGE_SIZE = 10


class AdminModel(models.Model, helper=True):
    @api.classmethod
    def api_search(cls, request: HttpRequest, fields=None, count=None, page=None, limit=None, **kwargs):
        qs = cls._api_search(request, fields=fields, **kwargs)
        if count:
            count = qs.count()
        if limit is None:
            limit = PAGE_SIZE
        elif limit == -1:
            limit = None
        if page is None:
            page = 1
        if limit:
            page = int(page)
            limit = int(limit)
            qs = qs[(page - 1) * limit:page * limit]
        defer = [f.name for f in cls._meta.fields if f.defer]
        return {
            'data': [obj.to_dict(fields=fields, exclude=defer) for obj in qs],
            'count': count,
        }

    @api.classmethod
    def api_list_id(cls, request: HttpRequest, where=None, limit=PAGE_SIZE):
        qs = cls._api_search(request, fields=[cls._meta.pk.name], where=where)
        qs = qs[:limit]
        return {
            'data': [obj.pk for obj in qs],
        }

    @classmethod
    def _api_search(cls, request: HttpRequest, where=None, fields=None, params=None, order=None, default=None,
                    **kwargs):
        # self.check_permission('read')
        qs = cls.objects.all()
        if order:
            # TODO order by custom expr
            order_by = ['-' + field.name if '-' + field.name in order else field.name for field in
                        [cls._meta.fields[f[1:] if f.startswith('-') else f] for f in order] if field.concrete]
            if order_by:
                qs = qs.order_by(*order)
        domain = kwargs.get('domain')
        if params is None:
            params = {}
        if domain:
            params.update(domain)
        if fields:
            if 'record_name' in fields and cls._meta.name_field:
                fields.append(cls._meta.name_field)

            # optimize select_related fields
            rel_fields = []
            only = []
            # special $id attr
            for f in fields:
                field = cls._meta.fields[f]
                if field.many_to_one:
                    rel_fields.append(field.name)
                    rel_fields.extend(field.get_select_related(only))

            qs = qs.select_related(*rel_fields)
            fields = [f.attname or f.name for f in [cls._meta.fields[f] for f in fields] if f.concrete]
            if only:
                fields.extend(only)

            pk = cls._meta.pk.attname
            if pk not in fields:
                fields.append(pk)
            # load only selected fields
        elif cls._meta.deferred_fields:
            qs.defer(cls._meta.deferred_fields)

        if default is None:
            default = {}
            # filter active records only
            if cls._meta.active_field is not None:
                default[cls._meta.active_field] = True

        if where:
            if isinstance(where, list):
                _args = []
                _kwargs = {}
                for w in where:
                    for k, v in w.items():
                        if k == cls._meta.active_field:
                            default.pop(cls._meta.active_field)
                        f = None
                        if '__' in k:
                            k_fname, k2 = k.split('__', 1)
                            try:
                                f = cls._meta.fields[k_fname]
                                if isinstance(f, models.OneToManyField):
                                    # special resolve o2m field
                                    # get name field
                                    assert f.related_model._meta.name_field
                                    name_field = f.related_model._meta.name_field
                                    k = f.name + '__' + name_field + '__' + k.split('__', 1)[1]
                                elif settings.ACCENT_INSENSITIVE and k.endswith('__icontains') and isinstance(f,
                                                                                                              models.CharField):
                                    k = k[:-11] + '__unaccent__icontains'
                            except FieldDoesNotExist:
                                # check if field is a related field
                                f = getattr(cls, k_fname, None)
                                if not isinstance(f, ReverseManyToOneDescriptor):
                                    # resolve related field
                                    raise
                        if k == 'OR':
                            _args.append(
                                reduce(lambda a, b: a | b, ([Q(**{k2: v2 for k2, v2 in f.items()}) for f in v]))
                            )
                        elif isinstance(f, models.ForeignKey):
                            name_fields = list(
                                chain(*(_resolve_fk_search(fk) for fk in f.related_model._meta.get_name_fields())))
                            if len(name_fields) == 1:
                                _args.append(Q(**{f'{f.name}__{name_fields[0]}': v}))
                            elif name_fields:
                                _args.append(
                                    reduce(
                                        lambda f1, f2: f1 | f2,
                                        [Q(**{f'{f.name}__{fk}': v}) for fk in name_fields]
                                    )
                                )
                            else:
                                kwargs[k] = v
                        else:
                            _kwargs[k] = v
                qs = qs.filter(*_args, **_kwargs)
            elif isinstance(where, dict):
                qs = qs.filter(**where)
            elif where is not None:
                qs = qs.filter(where)
        if params:
            qs = qs.filter(**params)
        if default:
            qs = qs.filter(**default)
        if fields:
            qs = qs.only(*fields)

        # TODO move to erp
        if 'auth.rule' in apps.models:
            Rule = apps.models['auth.rule']
            current_user = request.user
            current_user_id = request.user_id
            if current_user_id == SUPERUSER or current_user.is_superuser:
                return qs
            ctx = {'current_user': current_user, 'current_user_id': current_user.pk, 'user': current_user,
                   'user_id': current_user.pk}
            for r in Rule.get_rules(cls._meta.name):
                rule = r.eval_rule(ctx)
                if isinstance(rule, dict):
                    rule = [rule]
                if isinstance(rule, list):
                    for i in rule:
                        qs = qs.filter(**i)
        return qs

    def _api_format_choice(self, format=None, **context):
        return {'id': self.pk, 'text': str(self)}

    @api.classmethod
    def api_search_by_name(
            cls, request: HttpRequest, name=None, count=None, page=None, label_from_instance=None, name_fields=None,
            *args, exact=False,
            **kwargs
    ):
        fmt = kwargs.get('format')
        where = kwargs.get('params')
        q = None
        if name:
            if name_fields is None:
                name_fields = chain(*(_resolve_fk_search(f, exact=exact) for f in cls._meta.get_name_fields()))
                q = reduce(lambda f1, f2: f1 | f2, [Q(**{f: name}) for f in name_fields])
            else:
                name_fields = [f.name for f in name_fields]
                if exact:
                    q = reduce(lambda f1, f2: f1 | f2, [Q(**{f'{f}__iexact': name}) for f in name_fields])
                else:
                    q = reduce(lambda f1, f2: f1 | f2, [Q(**{f: name}) for f in name_fields])
        if where:
            if q is None:
                q = Q(**where)
            else:
                q &= Q(**where)
        if q is not None:
            kwargs = {'where': q}
        qs = cls._api_search(request, *args, **kwargs)
        limit = kwargs.get('limit') or 20
        if count:
            count = qs.count()
        if page:
            page = int(page)
            qs = qs[(page - 1) * limit:page * limit]
        else:
            qs = qs[:limit]
        if isinstance(label_from_instance, list):
            label_from_instance = lambda obj, format, label_from_instance=label_from_instance: (
                obj.pk,
                ' - '.join([str(getattr(obj, f, '')) for f in label_from_instance if f in cls._meta.fields_dict]))
        if callable(label_from_instance):
            res = [label_from_instance(obj, fmt) for obj in qs]
        else:
            res = [obj._api_format_choice(fmt, name=name) for obj in qs]
        return {
            'count': count,
            'items': res,
        }

    @api.classmethod
    def api_get_field_choice(cls, request: HttpRequest, field: str, q, **kwargs):
        return cls.api_get_field_choices(request, field, q, exact=True, limit=1)

    @api.classmethod
    def api_get_field_choices(
            cls, request: HttpRequest, field: str, q=None, count=False, ids=None, page=None, exact=False, limit=None,
            **kwargs
    ):
        fmt = kwargs.get('format', 'str')
        field = cls._meta.fields[field]
        related_model = apps[field.remote_field.model]
        search_params = {}
        if limit:
            search_params['limit'] = limit
        if field.many_to_many:
            field = field.remote_field.through._meta.fields[field.m2m_reverse_field_name()]
        if field.many_to_one or field.one_to_one:
            if ids is None:
                # search_params['name_fields'] = kwargs.get(
                #     'name_fields',
                #     (
                #             field.name_fields is not None and [related_model._meta.fields_dict[f] for f in
                #                                                field.name_fields]
                #     ) or None
                # )
                search_params['name'] = q
                search_params['page'] = page
                search_params['count'] = count
                filter = kwargs.get('filter', field.filter)
                if filter:
                    search_params['params'] = filter
            else:
                if isinstance(ids, (list, tuple)):
                    search_params['params'] = {'pk__in': ids}
                else:
                    search_params['params'] = {'pk': ids}
            label_from_instance = kwargs.get(
                'label_from_instance',
                field.label_from_instance or kwargs.get('name_fields')
            )
            return related_model.api_search_by_name(
                request,
                label_from_instance=label_from_instance, exact=exact, format=fmt,
                **search_params
            )
        elif field.one_to_many:
            from orun.db.models.query import QuerySet
            where = kwargs['filter']
            qs = field.get_queryset(where)
            return {
                'data': [obj.to_dict() for obj in qs] if isinstance(qs, QuerySet) else qs,
                'count': count,
            }

    @api.method
    def api_copy(self):
        return copy.copy(self)

    @classmethod
    def admin_do_view_action(cls, request, action_name, target, **kwargs):
        return cls.admin_dispatch_view_action(request, action_name, target, **kwargs)

    @classmethod
    def admin_dispatch_view_action(cls, request, action_name, target, **kwargs):
        pass

    @api.classmethod
    def api_get_defaults(cls, context=None, *args, **kwargs):
        r = {}
        defaults = (context or {}).get('default', {})
        if context is not None:
            for k in context:
                if k.startswith('default_'):
                    defaults[k[8:]] = context[k]
        for f in cls._meta.fields:
            if f.name in defaults:
                val = r[f.name] = defaults[f.name]
                if val and isinstance(f, models.ForeignKey):
                    r[f.name] = f.remote_field.model.objects.get(pk=val)._api_format_choice()
            elif f.editable:
                if f.default is not NOT_PROVIDED:
                    if callable(f.default):
                        r[f.name] = f.value_to_json(f.default())
                    else:
                        r[f.name] = f.value_to_json(f.default)
                elif isinstance(f, BooleanField):
                    r[f.name] = False
        if 'creation_name' in kwargs and cls._meta.name_field:
            r[cls._meta.name_field] = kwargs['creation_name']
        return r or None

    @api.classmethod
    def api_group_by(cls, request: HttpRequest, grouping: List[str], params):
        where = params
        field_name = grouping[0]
        field = cls._meta.fields[field_name]
        if field.group_choices:
            qs = field.get_group_choices(cls, where)
        else:
            qs = cls._api_search(request, where)
            qs = qs.values(field.name).annotate(pk__count=Count('pk')).order_by(field.name)
        res = []
        if field.many_to_one:
            for row in qs:
                key = row[field.name]
                count = row['pk__count']
                s = f'{str(field.remote_field.model.objects.get(pk=key)) if key else gettext("(Undefined)")} ({count})'
                res.append({
                    '$params': {field_name: key},
                    field_name: s,
                    '$count': count,
                })
            return res
        elif field.choices:
            choices = dict(field.flatchoices)
            values = {row[field.name]: row['pk__count'] for row in qs}
            for k, n in choices.items():
                count = values.get(k)
                s = force_str(choices.get(k, k), strings_only=True)
                if k in values and count:
                    s += f' ({count})'
                res.append({
                    '$params': {field_name: k},
                    field_name: s,
                    '$count': count,
                })
            for k, v in [(k, v) for k, v in values.items() if k not in choices]:
                res.append({
                    '$params': {field_name: k},
                    field_name: (gettext("(Undefined)") if k is None else k) + f' {(v)}',
                    '$count': v,
                })
            return res
        return list(qs)

    @api.classmethod
    def api_delete(cls, request: HttpRequest, ids):
        # self.check_permission('delete')
        ids = [v for v in cls._api_search(request, {'pk__in': ids}).only('pk')]
        r = []
        if not ids:
            raise ObjectDoesNotExist()
        for obj in ids:
            r.append(obj.pk)
            obj.delete()
        return r

    @api.classmethod
    def api_create_by_name(self, name, *args, **kwargs):
        context = kwargs.get('context')
        opts = self._meta
        assert opts.name_field
        data = {opts.name_field: name}
        if context:
            for k, v in context.items():
                if k.startswith('default_'):
                    data[k[8:]] = v
        return self.objects.create(**data)._api_format_choice()

    @api.classmethod
    def api_get(cls, request: HttpRequest, id, fields=None):
        if id:
            if fields and 'record_name' not in fields:
                fields.append('record_name')
            # default will remove active default condition
            obj = cls._api_search(request, fields=fields, default={}).get(pk=id)
            return {'data': obj.to_dict(fields=fields)}
        return {'error': 'the record ID must be specified'}

    @api.classmethod
    def api_write(cls, data):
        if isinstance(data, dict):
            data = [data]
        res = []
        for row in data:
            pk = row.pop('id', None)
            if pk:
                # _cache_change = _cache_change or cls.check_permission('change')
                obj = cls.objects.get(pk=pk)
            else:
                # _cache_create = _cache_create or cls.check_permission('create')
                obj = cls()

            # dispatch events
            # TODO events should be called from orm api internals
            if obj._state.adding:
                before_insert.send(cls._meta.name, old=None, new=obj)
            elif cls._meta.name in before_update.models:
                # make a copy of old data
                old = copy.deepcopy(obj)
                cls._from_json(obj, row)
                # before_update.send(cls._meta.name, old=obj, new=obj)
            else:
                cls._from_json(obj, row)
            if obj._state.adding:
                cls._from_json(obj, row)
                # dispatch event
                # if cls._meta.name in after_insert.models:
                #     after_insert.send(cls._meta.name, old=None, new=obj)

            res.append(obj.pk)
        return res

    @api.classmethod
    def admin_on_field_change(cls, field, record, *args, **kwargs):
        res = {}
        vals = {}
        for fn in cls._meta.field_change_event[field]:
            d = fn(cls, record)
            if isinstance(d, dict):
                if 'values' in d:
                    vals.update(d['values'])
                if 'value' in d:
                    vals.update(d['value'])
        if vals:
            res['values'] = vals
        return res

    def _proxy_field_change(self, field):
        obj = getattr(self, field.proxy_field[0])
        if obj is not None:
            obj = getattr(obj, field.proxy_field[1])
        return {
            'value': {field.name: obj}
        }

    @api.classmethod
    def admin_get_formview_action(cls, request: HttpRequest, id=None):
        return {
            'type': 'ui.action.window',
            'model': cls._meta.name,
            'object_id': id,
            'viewModes': ['form'],
            'viewMode': 'form',
            'target': 'current',
            'viewsInfo': {
                'form': cls._admin_get_view_info(request, 'form')
            },
            'context': {},
        }

    def _get_external_id(self):
        result = defaultdict(list)
        for obj in self.objects['ir.object'].objects.filter(model_name=self._meta.name,
                                                            object_id__in=self._get_pk_vals()).only('schema', 'name',
                                                                                                    'object_id'):
            result[obj.object_id].append('%s.%s' % (obj.schema, obj.name))
        return result

    @classmethod
    def admin_get_formfield(cls, field, view_type=None):
        return field.fieldinfo

    @classmethod
    def admin_get_field_info(cls, field, view_type=None):
        info = field.fieldinfo
        model = field.model
        # collect md documentation
        if model._meta.addon and model._meta.addon.path:
            app_docs = os.path.join(model._meta.addon.docs_path, 'models', model._meta.name, 'fields',
                                    f'{field.name}.md')
            if os.path.isfile(app_docs):
                with open(app_docs) as f:
                    info['help_text'] = f.read()
        return info

    @api.classmethod
    def admin_get_fields_info(cls, view_id=None, view_type='form', toolbar=False, context=None, xml=None):
        opts = cls._meta
        if xml is not None:
            if isinstance(xml, str):
                xml = etree.fromstring(xml)
            fields = [opts.fields[f.attrib['name']] for f in get_xml_fields(xml) if 'name' in f.attrib]
            if view_type == 'calendar':
                fields.append(opts.fields[xml.attrib.get('date-start')])
                if 'date-end' in xml.attrib:
                    fields.append(opts.fields[xml.attrib.get('date-end')])
            return {
                f.name: cls.admin_get_field_info(f, view_type)
                for f in fields
                if f.serialize
            }
        if view_type == 'search':
            searchable_fields = opts.searchable_fields
            if searchable_fields:
                return {f.name: cls.admin_get_field_info(f, view_type) for f in searchable_fields}
            return {}
        else:
            r = {}
            for field in opts.fields:
                if field.serialize:
                    r[field.name] = cls.admin_get_field_info(field, view_type)
            if opts.pk.name not in r:
                r[opts.pk.name] = cls.admin_get_field_info(opts.pk, view_type)
            return r

    @classmethod
    def _admin_get_view_info(cls, request, view_type, view=None, toolbar=False):
        View = apps['ui.view']
        model = apps['content.type']

        if view is None:
            view = View.objects.filter(mode='primary', view_type=view_type, model=cls._meta.name).first()
        elif isinstance(view, (int, str)):
            view = View.objects.get(pk=view)

        if view:
            xml_content = view.get_xml(cls, {'request': cls._env.request, 'opts': model._meta})
            r = {
                'template': etree.tostring(xml_content, encoding='utf-8').decode('utf-8'),
                'fields': cls.admin_get_fields_info(view_type=view_type, xml=xml_content)
            }
        else:
            content = cls._admin_get_default_view(request, view_type=view_type)
            r = {
                'template': content,
                'fields': cls.admin_get_fields_info(view_type=view_type, xml=content),
            }
        if toolbar and view_type != 'search':
            bindings = apps['ui.action'].get_bindings(cls._meta.name)
            r['toolbar'] = {
                'print': [action.to_dict() for action in bindings['print'] if
                          view_type == 'list' or not action.multiple],
                'action': [action.to_dict() for action in bindings['action'] if
                           view_type == 'list' or not action.multiple],
            }
        return r

    @api.classmethod
    def admin_get_view_info(cls, request: HttpRequest, view_type, view=None, toolbar=False):
        return cls._admin_get_view_info(request, view_type, view, toolbar)

    @api.classmethod
    def admin_load_views(cls, request: HttpRequest, views=None, toolbar=False, **kwargs):
        if views is None and 'action' in kwargs:
            Action = apps['ui.action.window']
            action = Action.objects.get(pk=kwargs.get('action'))
            views = {mode: None for mode in action.view_mode.split(',')}
            if 'search' not in views:
                views['search'] = None
        elif views is None:
            views = {'form': None, 'list': None, 'search': None}

        return {
            'fields': cls.admin_get_fields_info(),
            'views': {
                mode: cls.admin_get_view_info(request, view_type=mode, view=v, toolbar=toolbar)
                for mode, v in views.items()
            }
        }

    @classmethod
    def _admin_select_template(cls, view_type):
        return select_template(
            [
                'views/%s/%s.jinja2' % (cls._meta.name, view_type),
                'views/%s/%s.html' % (cls._meta.name, view_type),
                'views/%s/%s.xml' % (cls._meta.name, view_type),
                'views/%s/%s.xml' % (cls._meta.addon.schema, view_type),
                'views/%s.jinja2' % view_type,
                'views/%s.pug' % view_type,
            ], using='jinja2'
        )

    @classmethod
    def _admin_get_default_view(cls, request, view_type):
        template = cls._admin_select_template(view_type)
        templ = template.render(context=dict(opts=cls._meta, _=gettext, request=request))
        xml = ui.etree.fromstring(templ)
        ui.resolve_refs(xml)
        templ = ui.etree.tostring(xml, encoding='utf-8')
        return templ.decode('utf-8')

    @classmethod
    def _admin_get_default_form_view(cls):
        return cls._admin_get_default_view(view_type='form')

    @classmethod
    def _admin_get_default_list_view(cls):
        pass

    @classmethod
    def _admin_get_default_search_view(cls):
        pass

    @api.classmethod
    def reorder(cls, ids):
        objs = cls.select('pk').where(pk__in=ids)
        sequence = {id: i for i, id in enumerate(ids)}
        for obj in objs:
            obj.sequence = sequence[obj.pk]
        cls.objects.bulk_update(objs, [cls._meta.sequence_field])

    @api.classmethod
    def api_export(cls, request: HttpRequest, where=None, format='xlsx', fields=None):

        def serialize(field, value):
            if value is not None:
                if isinstance(field, models.ForeignKey):
                    return str(value)
                return value

        if fields is None:
            fields = [f.name for f in cls._meta.list_fields]
        qs = cls._api_search(request, where=where, fields=fields)
        if format == 'xlsx':
            import xlsxwriter
            buf = io.BytesIO()
            wb = xlsxwriter.Workbook(buf, {'in_memory': True})
            sheet = wb.add_worksheet()
            header_style = wb.add_format({'bold': True})
            caps = [cls._meta.get_field(f).label for f in fields]
            sheet.write_row(0, 0, caps, header_style)
            for i, obj in enumerate(qs):
                sheet.write_row(i + 1, 0, [serialize(cls._meta.fields[f], getattr(obj, f, None)) for f in fields])
            wb.close()
            buf.seek(0)
            res = HttpResponse(buf.read(),
                               content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            res['Content-Disposition'] = f'attachment; filename={cls._meta.verbose_name_plural.replace("/", " ")}.xlsx'
            return res

    @api.classmethod
    def api_import(cls, files, field_map=None, preview=False):
        for file in files:
            import pandas as pd
            buf = io.BytesIO(file.read())
            df = pd.read_excel(buf)
            not_found = []
            if not field_map:
                field_map = {}
                # try to find fields by name or label
                for c in df.columns:
                    f = cls._meta.fields.get(c)
                    if f is None:
                        for fl in cls._meta.fields:
                            if fl.label.lower() == c.lower():
                                f = fl
                                break
                        else:
                            not_found.append(c)
                    field_map[c] = (f and f.name)

            if preview and not preview == 'false':
                return {
                    'values': [list(r) for r in df.values],
                    'columns': list(df.columns),
                    'field_map': field_map,
                }
            if not_found:
                raise ValidationError(
                    gettext('The following fields were not found in the model: %s') % ', '.join(not_found)
                )
            cols = list(field_map.keys())

            def get_value(field: models.Field, col, data_row):
                input_value = data_row[cols.index(col)]
                if isinstance(input_value, float) and math.isnan(input_value):
                    input_value = None
                if isinstance(field, models.ForeignKey):
                    # find by the name field
                    name_fields = _resolve_fk_search(field)
                    return field.related_model.objects.filter(
                        **{f: input_value for f in name_fields}
                    ).only('pk').first()
                if input_value == '':
                    return None
                return input_value

            ids = []
            for row in df.values:
                ids.append(
                    cls.objects.create(
                        **{f: get_value(cls._meta.fields[f], c, row) for c, f in field_map.items()}
                    ).pk
                )
            return {
                'message': gettext('%s records imported successfully.') % len(df),
                'ids': ids,
                'type': 'ir.action.client',
                'tag': 'refresh',
            }


def _resolve_fk_search(field: models.Field, exact=False):
    if isinstance(field, models.ForeignKey):
        rel_model = apps[field.remote_field.model]
        name_fields = field.name_fields
        if not name_fields:
            name_fields = []
            for f in rel_model._meta.get_name_fields():
                if isinstance(f, models.ForeignKey):
                    name_fields.extend(_resolve_fk_search(f, exact=exact))
                elif isinstance(f, models.CharField):
                    t = f.name
                    if settings.ACCENT_INSENSITIVE:
                        t += '__unaccent'
                    if exact:
                        name_fields.append(t + '__iexact')
                    else:
                        name_fields.append(t + '__icontains')
                else:
                    name_fields.append(f.name)
        return [f'{field.name}__{f}' for f in name_fields]
    elif isinstance(field, models.CharField):
        if field.full_text_search:
            return [f'{field.name}__search']
        else:
            t = field.name
            if settings.ACCENT_INSENSITIVE:
                t += '__unaccent'
            if exact:
                return [f'{t}__iexact']
            else:
                return [f'{t}__icontains']
    return [field.name]
