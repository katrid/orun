from typing import List
from collections import defaultdict
import copy
from functools import reduce
from itertools import chain

from orun.apps import apps
from orun.utils.xml import get_xml_fields, etree
from orun.utils.translation import gettext
from orun import api
from orun.db import models
from orun.db.models import NOT_PROVIDED, Field, BooleanField, Q, ObjectDoesNotExist
from orun.db.models.signals import (
    before_insert, before_update, before_delete,
    after_insert, after_update, after_delete,
)
from orun.db.models.aggregates import Count
from orun.utils.encoding import force_str

PAGE_SIZE = 100


class AdminModel(models.Model, helper=True):
    @api.classmethod
    def api_search(cls, fields=None, count=None, page=None, limit=None, format=None, **kwargs):
        qs = cls._api_search(fields=fields, **kwargs)
        if count:
            count = qs.count()
        if limit is None:
            limit = PAGE_SIZE
        elif limit == -1:
            limit = None
        if page and limit:
            page = int(page)
            limit = int(limit)
            qs = qs[(page - 1) * limit:page * limit]
        defer = [f.name for f in cls._meta.fields if f.defer]
        return {
            'data': [obj.to_dict(fields=fields, exclude=defer) for obj in qs],
            'count': count,
        }

    @classmethod
    def _api_search(cls, where=None, fields=None, params=None, join=None, **kwargs):
        # self.check_permission('read')
        qs = cls.objects.all()
        domain = kwargs.get('domain')
        if params is None:
            params = {}
        if domain:
            params.update(domain)
        if fields:
            if 'record_name' in fields:
                fields.append(cls._meta.name_field)

            # optimize select_related fields
            rel_fields = []
            only = []
            for f in fields:
                field = cls._meta.fields[f]
                if field.many_to_one:
                    rel_fields.append(field.name)
                    rel_fields.extend(field.get_select_related(only))

            qs = qs.select_related(*rel_fields)
            fields = [f.attname for f in [cls._meta.fields[f] for f in fields] if f.concrete]
            if only:
                fields.extend(only)

            pk = cls._meta.pk.attname
            if pk not in fields:
                fields.append(pk)
            # load only selected fields
            if fields:
                qs = qs.only(*fields)
        elif cls._meta.deferred_fields:
            qs.defer(cls._meta.deferred_fields)

        if where:
            if isinstance(where, list):
                _args = []
                _kwargs = {}
                for w in where:
                    for k, v in w.items():
                        f = None
                        if '__' in k:
                            f = cls._meta.fields[k.split('__', 1)[0]]
                        if isinstance(f, models.ForeignKey):
                            name_fields = list(
                                chain(*(_resolve_fk_search(fk) for fk in f.related_model._meta.get_name_fields())))
                            if len(name_fields) == 1:
                                _args.append(Q(**{f'{f.name}__{name_fields[0]}__icontains': v}))
                            elif name_fields:
                                _args.append(reduce(lambda f1, f2: f1 | f2,
                                                    [Q(**{f'{f.name}__{fk}__icontains': v}) for fk in name_fields]))
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
        # filter active records only
        if cls._meta.active_field is not None:
            qs = qs.filter(**{cls._meta.active_field: True})
        return qs

    def _api_format_choice(self, format=None, **context):
        return {'id': self.pk, 'text': str(self)}

    @api.classmethod
    def api_search_by_name(
            cls, name=None, count=None, page=None, label_from_instance=None, name_fields=None, *args, exact=False,
            **kwargs
    ):
        fmt = kwargs.get('format')
        where = kwargs.get('params')
        q = None
        if name:
            if name_fields is None:
                name_fields = chain(*(_resolve_fk_search(f) for f in cls._meta.get_name_fields()))
            else:
                name_fields = [f.name for f in name_fields]
            if exact:
                q = reduce(lambda f1, f2: f1 | f2, [Q(**{f'{f}__iexact': name}) for f in name_fields])
            else:
                q = reduce(lambda f1, f2: f1 | f2, [Q(**{f'{f}__icontains': name}) for f in name_fields])
        if where:
            if q is None:
                q = Q(**where)
            else:
                q &= Q(**where)
        if q is not None:
            kwargs = {'where': q}
        qs = cls._api_search(*args, **kwargs)
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
    def api_get_field_choices(cls, field: str, q=None, count=False, ids=None, page=None, exact=False, limit=None,
                              **kwargs):
        fmt = kwargs.get('format', 'str')
        field = cls._meta.fields[field]
        related_model = cls.objects[field.remote_field.model]
        search_params = {}
        if limit:
            search_params['limit'] = limit
        if field.many_to_many:
            field = field.remote_field.target_field
        if field.many_to_one:
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

    @api.classmethod
    def api_get_defaults(cls, context=None, *args, **kwargs):
        r = {}
        defaults = context or {}
        for f in cls._meta.fields:
            if 'default_' + f.name in defaults:
                val = r[f.name] = defaults['default_' + f.name]
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
    def api_group_by(cls, grouping: List[str], params):
        where = params
        field_name = grouping[0]
        field = cls._meta.fields[field_name]
        if field.group_choices:
            qs = field.get_group_choices(cls, where)
        else:
            qs = cls._api_search(where)
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
    def api_delete(self, ids):
        # self.check_permission('delete')
        ids = [v for v in self._api_search({'pk__in': ids}).only('pk')]
        r = []
        if not ids:
            raise ObjectDoesNotExist()
        for obj in ids:
            r.append(obj.pk)
            obj.delete()
        return {
            'ids': r,
        }

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
    def api_get(cls, id, fields=None):
        if id:
            obj = cls._api_search().get(pk=id)
            obj.__serialize__ = True
            return obj
        else:
            raise cls.DoesNotExist()

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
                before_update.send(cls._meta.name, old=obj, new=obj)
            else:
                cls._from_json(obj, row)
            if obj._state.adding:
                cls._from_json(obj, row)
            if obj._state.adding:
                if cls._meta.name in after_insert.models:
                    after_insert.send(cls._meta.name, old=None, new=obj)

            res.append(obj.pk)
        return res

    @api.classmethod
    def admin_on_field_change(cls, field, record, *args, **kwargs):
        for fn in cls._meta.field_change_event[field]:
            record = fn(cls, record)
        return record

    def _proxy_field_change(self, field):
        obj = getattr(self, field.proxy_field[0])
        if obj is not None:
            obj = getattr(obj, field.proxy_field[1])
        return {
            'value': {field.name: obj}
        }

    @api.classmethod
    def admin_get_formview_action(self, id=None):
        return {
            'action_type': 'ui.action.window',
            'model': self._meta.name,
            'object_id': id,
            'view_mode': 'form',
            'view_type': 'form',
            'target': 'current',
            'views': {
                'form': None,
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
        return field.formfield

    @classmethod
    def admin_get_field_info(cls, field, view_type=None):
        return field.formfield

    @api.classmethod
    def admin_get_fields_info(cls, view_id=None, view_type='form', toolbar=False, context=None, xml=None):
        opts = cls._meta
        if xml is not None:
            fields = get_xml_fields(xml)
            return {
                f.name: cls.admin_get_field_info(f, view_type)
                for f in [opts.fields[f.attrib['name']] for f in fields if 'name' in f.attrib] if f
            }
        if view_type == 'search':
            searchable_fields = opts.searchable_fields
            if searchable_fields:
                return {f.name: cls.admin_get_field_info(f, view_type) for f in searchable_fields}
            return {}
        else:
            r = {}
            for field in opts.fields:
                r[field.name] = cls.admin_get_field_info(field, view_type)
            return r

    @api.classmethod
    def admin_get_view_info(cls, view_type, view=None, toolbar=False):
        View = cls.objects['ui.view']
        model = cls.objects['content.type']

        if view is None:
            view = View.objects.filter(mode='primary', view_type=view_type, model=cls._meta.name).first()
        elif isinstance(view, (int, str)):
            view = View.objects.get(pk=view)

        if view:
            xml_content = view.get_xml(cls, {'request': cls.env.request})
            r = {
                'content': etree.tostring(xml_content, encoding='utf-8').decode('utf-8'),
                'fields': cls.admin_get_fields_info(view_type=view_type, xml=xml_content)
            }
        else:
            content = cls._admin_get_default_view(view_type=view_type)
            r = {
                'content': content,
                'fields': cls.admin_get_fields_info(view_type=view_type, xml=content),
            }
        if toolbar and view_type != 'search':
            bindings = cls.objects['ui.action'].get_bindings(cls._meta.name)
            r['toolbar'] = {
                'print': [action.to_dict() for action in bindings['print'] if
                          view_type == 'list' or not action.multiple],
                'action': [action.to_dict() for action in bindings['action'] if
                           view_type == 'list' or not action.multiple],
            }
        return r

    @api.classmethod
    def admin_load_views(cls, views=None, toolbar=False, **kwargs):
        if views is None and 'action' in kwargs:
            Action = cls.objects['ui.action.window']
            action = Action.objects.get(kwargs.get('action'))
            views = {mode: None for mode in action.view_mode.split(',')}
        elif views is None:
            views = {'form': None, 'list': None, 'search': None}

        return {
            'fields': cls.admin_get_fields_info(),
            'views': {
                mode: cls.admin_get_view_info(view_type=mode, view=v, toolbar=toolbar)
                for mode, v in views.items()
            }
        }

    @classmethod
    def _admin_get_default_view(cls, view_type):
        from orun.template.loader import select_template
        from orun.contrib.admin.models import ui
        template = select_template(
            [
                'views/%s/%s.jinja2' % (cls._meta.name, view_type),
                'views/%s/%s.html' % (cls._meta.name, view_type),
                'views/%s/%s.xml' % (cls._meta.name, view_type),
                'views/%s/%s.xml' % (cls._meta.addon.schema, view_type),
                'views/%s.jinja2' % view_type,
            ], using='jinja2'
        )
        templ = template.render(context=dict(opts=cls._meta, _=gettext))
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


def _resolve_fk_search(field: models.Field):
    if isinstance(field, models.ForeignKey):
        rel_model = apps[field.remote_field.model]
        name_fields = field.name_fields
        if not name_fields:
            name_fields = []
            for f in rel_model._meta.get_name_fields():
                if isinstance(f, models.ForeignKey):
                    name_fields.extend(_resolve_fk_search(f))
                else:
                    name_fields.append(f.name)
        return [f'{field.name}__{f}' for f in name_fields]
    return [field.name]
