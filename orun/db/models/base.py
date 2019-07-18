import copy
import datetime
import inspect
import os
from functools import partial
from itertools import chain
import sqlalchemy as sa
from sqlalchemy import orm, func
from sqlalchemy.ext.declarative import declarative_base

from orun import api, render_template
from orun import app, g
from orun.apps import apps, Application
from orun.core.exceptions import ObjectDoesNotExist, ValidationError, PermissionDenied
from orun.db import session
from orun.db.models import signals
from orun.utils.encoding import force_text
from orun.utils.translation import gettext, gettext_lazy
from orun.utils.xml import etree
from orun.utils.xml import get_xml_fields
from orun.db.models.fields.related import OneToOneField, CASCADE
from orun.db.models.options import Options
from orun.db.models.query import QuerySet, Insert, Update, Delete

CHOICES_PAGE_LIMIT = 10


class DO_NOTHING:
    pass


def create_meta(meta, attrs):
    attrs['__module__'] = None
    return type('Meta', tuple(meta), attrs)


def get_current_user():
    return g.user_id


def _add_auto_field(meta, name, field):
    if name not in meta.fields:
        meta.model.add_to_class(name, field)


def subclass_exception(name, parents, module, attached_to=None):
    """
    Create exception subclass. Used by ModelBase below.

    If 'attached_to' is supplied, the exception will be created in a way that
    allows it to be pickled, assuming the returned exception class will be added
    as an attribute to the 'attached_to' class.
    """
    class_dict = {'__module__': module}
    if attached_to is not None:
        def __reduce__(self):
            # Exceptions are special - they've got state that isn't
            # in self.__dict__. We assume it is all in self.args.
            return (unpickle_inner_exception, (attached_to, name), self.args)

        def __setstate__(self, args):
            self.args = args

        class_dict['__reduce__'] = __reduce__
        class_dict['__setstate__'] = __setstate__

    return type(name, parents, class_dict)


class ModelBase(type):
    """
    Metaclass for all models.
    """
    # @classmethod
    # def __prepare__(cls, name, bases):
    #     return collections.OrderedDict()

    Meta: Options = None
    _meta: Options = None
    __model__ = None

    def __new__(cls, name, bases, attrs):
        super_new = super().__new__
        registry = attrs.get('__registry__', apps)
        app = attrs.get('__app__')
        app_config = attrs.get('__app_config__')
        meta = attrs.pop('Meta', None)
        app_config = app_config or getattr(meta, 'app_config', None)
        parents = [b for b in bases if isinstance(b, ModelBase) and b.Meta]

        if app is None:
            if not bases:
                return super_new(cls, name, bases, attrs)

            module = attrs.get('__module__')
            if app_config:
                app_label = app_config.label
            else:
                app_label = module.split('.', 1)[0]
                app_config = registry[app_label]

            new_class = super_new(cls, name, bases, {k: v for k, v in attrs.items() if not isinstance(v, Field)})
            opts = Options.from_model(meta, new_class, parents, {
                'app_config': app_config,
                'app_label': app_label,
            })
            new_class.Meta = opts

            attr_items = attrs.items()
            if not opts.extension and not opts.abstract and issubclass(new_class, Model):
                pk = None
                for attr in attrs.values():
                    if isinstance(attr, Field) and attr.primary_key:
                        opts.pk = pk = attr
                if pk is None:
                    if parents:
                        for b in parents:
                            if not b.Meta.abstract:
                                if b.Meta.pk is not None:
                                    pk = OneToOneField(b, primary_key=True)
                                    pk.name = '%s_ptr' % b.Meta.model_name
                                    attr_items = chain(((pk.name, pk),), attr_items)
                                    new_class.Meta.parents[b] = pk
                                    opts.pk = pk
                                    break
                    if pk is None:
                        pk = BigAutoField(primary_key=True)
                        attr_items = chain((('id', pk),), attr_items)
                        opts.pk = pk

            fields = {k: v for k, v in attr_items if isinstance(v, BaseField) or hasattr(v, 'contribute_to_class')}
            opts.local_fields = fields

            if (not opts.inherited or bases[0].Meta.abstract) and not opts.extension and not opts.abstract:
                fields['display_name'] = CharField(label=opts.verbose_name, auto_created=True, getter='__str__', editable=False)
                if opts.log_changes:
                    fields['created_by'] = ForeignKey(
                        'auth.user', label=gettext_lazy('Created by'), auto_created=True, editable=False, deferred=True,
                        db_index=False, copy=False
                    )
                    fields['created_on'] = DateTimeField(
                        default=datetime.datetime.now, label=gettext_lazy('Created on'), auto_created=True,
                        editable=False, deferred=True, copy=False
                    )
                    fields['updated_by'] = ForeignKey(
                        'auth.user', auto_created=True, label=gettext_lazy('Updated by'), editable=False, deferred=True,
                        db_index=False, copy=False
                    )
                    fields['updated_on'] = DateTimeField(
                        on_update=datetime.datetime.now, label=gettext_lazy('Updated on'), auto_created=True,
                        editable=False, deferred=True, copy=False
                    )

            if not opts.abstract:
                app_config[opts.name] = new_class

            return new_class

        new_class = super_new(cls, name, bases, attrs)
        base_model = attrs.get('__model__')
        opts = new_class.Meta(base_model=base_model, app=app)
        new_class.add_to_class('_meta', opts)
        app[new_class._meta.name] = new_class
        bases = tuple(base for base in new_class.mro() if isinstance(base, ModelBase) and base.Meta and not base._meta)

        fields = {}
        for b in reversed(bases):
            for k, v in b.Meta.local_fields.items():
                if isinstance(v, BaseField):
                    f = fields.get(k)
                    if f is None:
                        field = v.assign()
                    else:
                        field = v.assign(f)

                    if b is base_model or b.__checkeq__(base_model.Meta.extending) or b.Meta.abstract or (b.__model__ is not None and b.__model__ is base_model.Meta.extending):
                        new_class._meta.local_fields.append(field)
                    if b.Meta.abstract or (b.__model__ is not None and b.__model__ is base_model.Meta.extending) or k in fields:
                        field.inherited = True

                    fields[k] = field
                    new_class._meta.parents.update({app.models[parent.Meta.name]: field for parent, field in b.Meta.parents.items()})
                else:
                    fields[k] = v

        for k, v in fields.items():
            new_class.add_to_class(k, v)

        new_class.insert = Insert(new_class)
        new_class.update = Update(new_class)
        new_class.delete = Delete(new_class)
        return new_class

    def __build__(cls, app):
        bases = [cls] + [
            app.models.get(base.Meta.name, base)
            for base in cls.Meta.bases
            if issubclass(base, Model) and base.Meta and base is not cls
        ]
        return type(cls.__name__, tuple(bases), {'__module__': cls.__module__, '__app__': app, '__model__': cls})

    def add_to_class(cls, name, value):
        if not inspect.isclass(value) and hasattr(value, 'contribute_to_class'):
            value.contribute_to_class(cls, name)
        else:
            setattr(cls, name, value)

    def __checkeq__(cls, other):
        return cls == other or (other is not None and cls.Meta.extending is other)

    def __subclasscheck__(cls, sub):
        if cls is Model:
            if hasattr(sub, '_sa_instance_state'):
                return False
            if isinstance(sub, Model):
                sub = sub.__class__
            return super(ModelBase, cls).__subclasscheck__(sub)
        if sub is not Model and sub._meta.parents:
            for parent in sub._meta.parents:
                return issubclass(cls, parent)
        return super(ModelBase, cls).__subclasscheck__(sub)

    @property
    def objects(cls):
        if cls._meta.app:
            return session.query(cls)
        else:
            return session.query(app[cls._meta.name].__class__)


class ModelStateFieldsCacheDescriptor:
    def __get__(self, instance, cls=None):
        if instance is None:
            return self
        res = instance.fields_cache = {}
        return res


class ModelState:
    """Store model instance state."""
    db = None
    # If true, uniqueness validation checks will consider this a new, unsaved
    # object. Necessary for correct validation of new instances of objects with
    # explicit (non-auto) PKs. This impacts validation only; it has no effect
    # on the actual save.
    adding = True
    fields_cache = ModelStateFieldsCacheDescriptor()


class Model(metaclass=ModelBase):
    _state = None

    def __init__(self, *args, **kwargs):
        self._state = ModelState()
        for k, v in kwargs.items():
            if v is not None:
                setattr(self, k, v)

    @property
    def env(self):
        return g.env

    @orm.reconstructor
    def _init_from_db(self):
        self._state = ModelState()

    @property
    def objects(self):
        return session.query(self.__class__)

    # Add DML attributes
    @property
    def select(cls):
        if not cls._meta.app:
            cls = cls._meta.app[cls._meta.name]
        return QuerySet(cls)

    @classmethod
    def init(cls):
        """
        Initialize the model after database upgrade.
        """
        pass

    @classmethod
    def create(cls, **kwargs):
        obj = cls(**kwargs)
        obj.save()
        return obj

    @api.method
    def create_name(self, name, *args, **kwargs):
        context = kwargs.get('context')
        opts = self._meta
        assert opts.title_field
        data = {opts.title_field: name}
        if context:
            for k, v in context.items():
                if k.startswith('default_'):
                    data[k[8:]] = v
        return self.create(**data)._get_instance_label()

    def check_permission(self, operation, raise_exception=True):
        perm = app['auth.model.access'].has_permission(self._meta.name, operation)
        if raise_exception and not perm:
            raise PermissionDenied(gettext('Permission denied!'))
        return True

    def get_by_natural_key(self, *args, **kwargs):
        if self._meta.title_field:
            return self.objects.filter({self._meta.title_field: args[0]})
        raise NotImplementedError

    @api.method
    def load_views(self, views=None, toolbar=False, **kwargs):
        if views is None and 'action' in kwargs:
            Action = app['ir.action.window']
            action = Action.objects.get(kwargs.get('action'))
            views = {mode: None for mode in action.view_mode.split(',')}
        elif views is None:
            views = {'form': None, 'list': None, 'search': None}

        return {
            'fields': self.get_fields_info(),
            'views': {
                mode: self.get_view_info(view_type=mode, view=v, toolbar=toolbar)
                for mode, v in views.items()
            }
        }

    @classmethod
    def get_field_info(cls, field, view_type=None):
        return field.formfield

    @api.method
    def get_fields_info(self, view_id=None, view_type='form', toolbar=False, context=None, xml=None):
        opts = self._meta
        if xml is not None:
            fields = get_xml_fields(xml)
            return {
                f.name: self.get_field_info(f, view_type)
                for f in [opts.fields_dict.get(f.attrib['name']) for f in fields if 'name' in f.attrib] if f
            }
        if view_type == 'search':
            searchable_fields = opts.searchable_fields
            if searchable_fields:
                return {f.name: self.get_field_info(f, view_type) for f in searchable_fields}
            return {}
        else:
            r = {}
            for field in opts.fields:
                r[field.name] = self.get_field_info(field, view_type)
            return r

    @classmethod
    def _get_default_view(cls, view_type):
        return render_template([
            'views/%s/%s.html' % (cls._meta.name, view_type),
            'views/%s/%s.xml' % (cls._meta.name, view_type),
            'views/%s/%s.xml' % (cls._meta.app_config.schema, view_type),
            'views/%s.xml' % view_type,
        ], opts=cls._meta, _=gettext)

    @classmethod
    def _get_default_form_view(cls):
        return cls._get_default_view(view_type='form')

    @classmethod
    def _get_default_list_view(cls):
        pass

    @classmethod
    def _get_default_search_view(cls):
        pass

    @api.serialize
    def get(self, id):
        if id:
            return self._search().get(id)
        else:
            raise self.DoesNotExist()

    @api.method
    def get_view_info(self, view_type, view=None, toolbar=False):
        View = app['ui.view']
        model = app['ir.model']

        if view is None:
            view = list(View.objects.filter(mode='primary', view_type=view_type, model=self._meta.name))
            if view:
               view = view[0]
        elif isinstance(view, (int, str)):
            view = View.objects.get(view)

        if view:
            xml_content = view.get_xml(model=self)
            r = {
                'content': etree.tostring(xml_content, encoding='utf-8').decode('utf-8'),
                'fields': self.get_fields_info(view_type=view_type, xml=xml_content)
            }
        else:
            content = self._get_default_view(view_type=view_type)
            r = {
                'content': content,
                'fields': self.get_fields_info(view_type=view_type, xml=content),
            }
        if toolbar and view_type != 'search':
            bindings = app['ir.action'].get_bindings(self._meta.name)
            r['toolbar'] = {
                'print': [action.serialize() for action in bindings['print'] if view_type == 'list' or not action.multiple],
                'action': [action.serialize() for action in bindings['action'] if view_type == 'list' or not action.multiple],
            }
        return r

    @api.method
    def get_defaults(self, context=None, *args, **kwargs):
        r = {}
        defaults = context or {}
        for f in self._meta.fields:
            if 'default_' + f.name in defaults:
                r[f.name] = defaults['default_' + f.name]
                continue
            if f.editable:
                if f.default is not NOT_PROVIDED:
                    if callable(f.default):
                        r[f.name] = f.default()
                    else:
                        r[f.name] = f.default
                elif isinstance(f, BooleanField):
                    r[f.name] = False
        if 'creation_name' in kwargs and self._meta.title_field:
            r[self._meta.title_field] = kwargs['creation_name']
        return r or None

    def deserialize(self, instance, data, **kwargs):
        data.pop('id', None)
        children = {}
        for k, v in data.items():
            field = instance.__class__._meta.fields[k]
            v = field.to_python(v)
            if field.one_to_many:
                children[field] = v
            elif field.set:
                field.set(instance, v)
            else:
                setattr(instance, k, v)

        instance.full_clean()
        if instance.pk:
            flds = data.keys() - [f.name for f in children]
            if flds:
                instance.save(**kwargs)
        else:
            instance.save(**kwargs)

        for child, v in children.items():
            try:
                child.set(instance, v)
            except ValidationError as e:
                for k, v in dict(e.error_dict).items():
                    e.error_dict[f"{child.name}.{k}"] = e.error_dict.pop(k)
                raise

        return instance


        #post_data = cls.post_data.pop(id(instance), None)

        #for k, v in children.items():
        #    instance._deserialize_value(k, v)

    def _get_FIELD_display(self, field):
        value = getattr(self, field.attname)
        return force_text(dict(field.flatchoices).get(value, value), strings_only=True)

    def serialize(self, fields=None, exclude=None, view_type=None):
        return self.to_json(fields=fields, exclude=exclude, view_type=view_type)

    def to_json(self, fields=None, exclude=None, view_type=None):
        opts = self._meta
        data = {}
        if fields:
            deferred_fields = []
        else:
            deferred_fields = opts.deferred_fields
        for f in opts.fields:
            if f in deferred_fields:
                continue
            if not f.serializable:
                continue
            if fields and f.name not in fields:
                continue
            if exclude and f.name in exclude:
                continue
            data[f.name] = f.to_json(getattr(self, f.name, None))
        if 'id' not in data:
            data['id'] = self.pk
        return data

    def filter(self, *args, **kwargs):
        return self._search(*args, **kwargs)

    @api.method
    def search(cls, fields=None, count=None, page=None, limit=None, **kwargs):
        qs = cls._search(fields=fields, **kwargs)
        if count:
            count = qs.count()
        if page and limit:
            page = int(page)
            limit = int(limit)
            qs = qs[(page - 1) * limit:page * limit]
        return {
            'data': [obj.serialize(fields=fields) for obj in qs],
            'count': count,
        }

    def _get_instance_label(self):
        return (self.pk, str(self))

    @api.method
    def search_name(
            self, name=None, count=None, page=None, label_from_instance=None, name_fields=None, *args, exact=False,
            **kwargs
    ):
        params = kwargs.get('params')
        join = []
        if name:
            if name_fields is None:
                name_fields = chain(*(_resolve_fk_search(f, join) for f in self._meta.get_name_fields()))
            if exact:
                q = [sa.or_(*[fld.column == name for fld in name_fields])]
            else:
                q = [sa.or_(*[fld.column.ilike('%' + name + '%') for fld in name_fields])]
            if params:
                q.append(params)
            kwargs = {'params': q}
        kwargs['join'] = join
        qs = self._search(*args, **kwargs)
        if count:
            count = qs.count()
        if page:
            page = int(page)
            qs = qs[(page - 1) * CHOICES_PAGE_LIMIT:page * CHOICES_PAGE_LIMIT]
        else:
            qs = qs[:CHOICES_PAGE_LIMIT]
        if isinstance(label_from_instance, list):
            label_from_instance = lambda obj, label_from_instance=label_from_instance: (obj.pk, ' - '.join([str(getattr(obj, f, '')) for f in label_from_instance if f in self._meta.fields_dict]))
        if callable(label_from_instance):
            res = [label_from_instance(obj) for obj in qs]
        else:
            res = [obj._get_instance_label() for obj in qs]
        return {
            'count': count,
            'items': res,
        }

    @api.method
    def field_change_event(self, field, record, *args, **kwargs):
        for fn in self._meta.field_change_event[field]:
            record = fn(self, record)
        return record

    @api.method
    def get_field_choices(self, field, q=None, count=False, ids=None, page=None, exact=False, **kwargs):
        field_name = field
        field = self._meta.fields_dict[field_name]
        related_model = self.env[field.rel.model]
        search_params = {}
        if ids is None:
            search_params['name_fields'] = kwargs.get('name_fields', (field.name_fields is not None and [related_model._meta.fields_dict[f] for f in field.name_fields]) or None)
            search_params['name'] = q
            search_params['page'] = page
            search_params['count'] = count
            domain = kwargs.get('domain', field.domain)
            if domain:
                search_params['params'] = domain
        else:
            search_params['params'] = [related_model.c.pk.in_(ids if isinstance(ids, (list, tuple)) else [ids])]
        label_from_instance = kwargs.get('label_from_instance', field.label_from_instance or kwargs.get('name_fields'))
        return related_model.search_name(label_from_instance=label_from_instance, exact=exact, **search_params)

    @api.record
    def _proxy_field_change(self, field):
        obj = getattr(self, field.proxy_field[0])
        if obj is not None:
            obj = getattr(obj, field.proxy_field[1])
        return {
            'value': {field.name: obj}
        }

    @api.method
    def get_formview_action(self, id=None):
        return {
            'action_type': 'ir.action.window',
            'model': self._meta.name,
            'object_id': id,
            'view_mode': 'form',
            'view_type': 'form',
            'target': 'current',
            'views': {
                'form': None,
            },
            'context': self.env.context,
        }

    def clean_fields(self, exclude=None):
        """
        Clean all fields and raise a ValidationError containing a dict
        of all validation errors if any occur.
        """
        if exclude is None:
            exclude = []

        errors = {}
        for f in self._meta.fields:
            if f.name in exclude:
                continue

            if f.concrete:
                raw_value = getattr(self, f.attname or f.name, None)
                try:
                    f.clean(raw_value, self)
                except ValidationError as e:
                    errors[f.name] = e.error_list

        if errors:
            raise ValidationError(errors)

    def clean(self):
        """
        Hook for doing any extra model-wide validation after clean() has been
        called on every field by self.clean_fields. Any ValidationError raised
        by this method will not be associated with a particular field; it will
        have a special-case association with the field defined by NON_FIELD_ERRORS.
        """
        pass

    def full_clean(self, exclude=None, validate_unique=True):
        """
        Calls clean_fields, clean, and validate_unique, on the model,
        and raises a ``ValidationError`` for any errors that occurred.
        """
        errors = {}
        if exclude is None:
            exclude = []
        else:
            exclude = list(exclude)

        try:
            self.clean_fields(exclude=exclude)
        except ValidationError as e:
            errors = e.update_error_dict(errors)

        # Form.clean() is run even if other validation fails, so do the
        # same with Model.clean() for consistency.
        try:
            self.clean()
        except ValidationError as e:
            errors = e.update_error_dict(errors)

        # Run unique checks, but only for fields that passed validation.
        # TODO validate unique
        # if validate_unique:
        #     for name in errors.keys():
        #         if name != NON_FIELD_ERRORS and name not in exclude:
        #             exclude.append(name)
        #     try:
        #         self.validate_unique(exclude=exclude)
        #     except ValidationError as e:
        #         errors = e.update_error_dict(errors)

        if errors:
            raise ValidationError(errors)

    @api.method
    def write(self, data):
        if isinstance(data, dict):
            data = [data]
        _cache_change = _cache_create = None
        res = []
        for row in data:
            pk = row.pop('id', None)
            if pk:
                #_cache_change = _cache_change or cls.check_permission('change')
                obj = self.get(pk)
            else:
                #_cache_create = _cache_create or cls.check_permission('create')
                obj = self()
            self.deserialize(obj, row)
            res.append(obj.pk)
        return res

    def refresh(self):
        session.object_session(self).refresh(self)

    @api.method
    def destroy(self, ids):
        self.check_permission('delete')
        ids = [v for v in self._search((self._meta.pk.column.in_(ids),), fields=[self._meta.pk.name])]
        r = []
        if not ids:
            raise ObjectDoesNotExist()
        for obj in ids:
            r.append(obj.pk)
            obj._destroy()
        return {
            'ids': r,
        }

    def _destroy(self):
        session.delete(self)

    def __copy__(self):
        new_item = {}
        for f in self._meta.copyable_fields:
            v = getattr(self, f.name)
            if self._meta.title_field == f.name:
                new_item[f.name] = gettext('%s (copy)') % v
            elif f.one_to_many:
                new_item[f.name] = [
                    {
                        'action': 'CREATE',
                        'values': copy.copy(obj),
                    }
                    for obj in v
                ]

            else:
                new_item[f.name] = f.to_json(v)
        return new_item

    @api.method
    def copy(self, id):
        # ensure permission
        instance = self.get(id)
        return copy.copy(instance)

    @api.method
    def group_by(self, grouping, params):
        field = self._meta.fields_dict[grouping[0]]
        col = field.column
        qs = self._search(params).options(orm.load_only(field.attname))
        qs = qs.from_self(col, func.count(col)).order_by(col).group_by(col).all()
        if col.foreign_keys:
            for row in qs:
                yield {
                    grouping[0]: field.rel.model.objects.get(row[0])._get_instance_label() if row[0] else None,
                    'count': row[1]
                }
        else:
            for row in qs:
                yield {grouping[0]: row[0], 'count': row[1]}

    def _search(self, params=None, fields=None, domain=None, join=None, *args, **kwargs):
        self.check_permission('read')
        qs = self.objects
        if join:
            qs = qs.join(*join)
        if isinstance(params, dict):
            if isinstance(domain, dict):
                params.update(domain)
            qs = qs.filter(params)
        elif isinstance(params, (list, tuple)):
            qs = qs.filter(*params)
        if args:
            qs = qs.filter(*args)
        if fields:
            if 'display_name' in fields:
                fields.append(self._meta.title_field)
            fields = [f.attname for f in [self._meta.fields_dict[f] for f in fields] if f.concrete]
            pk = self._meta.pk.attname
            if pk not in fields:
                fields.append(pk)
            if fields:
                qs = qs.options(orm.load_only(*fields))
        return qs

    @api.method
    def auto_report(self, *args, **kwargs):
        view = render_template([
            'reports/%s/auto_report.xml' % self._meta.name,
            'reports/%s/auto_report.xml' % self._meta.app_config.schema,
            'reports/auto_report.xml',
        ], opts=self._meta, _=gettext)

        from orun.reports.engines import get_engine
        query = self._search()
        engine = get_engine()
        rep = engine.auto_report(view, self, query)
        out_file = '/web/reports/' + os.path.basename(rep.export())

        return {
            'open': out_file,
        }

    def __str__(self):
        if self._meta.title_field:
            f = self._meta.fields_dict[self._meta.title_field]
            v = f.to_json(getattr(self, self._meta.title_field))
            if not isinstance(v, str):
                v = str(v)
            return v
        return super(Model, self).__str__()

    def __iter__(self):
        for f in self._meta.fields:
            # Check for serializable fields
            if f.serializable:
                yield f.name, f.to_json(getattr(self, f.name))

    def __call__(self, *args, **kwargs):
        return self.__class__(*args, **kwargs)

    def __getitem__(self, item):
        raise DeprecationWarning('DONT USE THIS FIELD')

    def save(self, update_fields=None, force_insert=False):
        inserting = not self.pk or force_insert
        if inserting:
            self.__before_insert__()
            session.add(self)
            self.__after_insert__()
        session.flush((self,))

    def __before_insert__(self):
        pass

    def __after_insert__(self):
        pass


def unpickle_inner_exception(klass, exception_name):
    # Get the exception class from the class it is attached to:
    exception = getattr(klass, exception_name)
    return exception.__new__(exception)


def _resolve_fk_search(field, join_list):
    if isinstance(field, ForeignKey):
        rel_model = app[field.rel.model]
        join_list.append(rel_model)
        return rel_model._meta.get_name_fields()
    return [field]


from orun.db.models.fields import BaseField, CharField, Field, BigAutoField, BooleanField, NOT_PROVIDED
from orun.db.models.fields import DateTimeField
from orun.db.models.fields.related import ForeignKey
