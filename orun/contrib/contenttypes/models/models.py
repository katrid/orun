from collections import defaultdict

from orun.apps import apps
from orun.db import models
from orun.utils.translation import gettext_lazy as _


class ContentTypeManager(models.Manager):
    use_in_migrations = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Cache shared by all the get_for_* methods to speed up
        # ContentType retrieval.
        self._cache = {}

    def get_by_natural_key(self, model):
        try:
            ct = self._cache[self.db][model]
        except KeyError:
            ct = self.get(name=model)
            self._add_to_cache(self.db, ct)
        return ct

    def _get_opts(self, model, for_concrete_model):
        if for_concrete_model:
            model = model._meta.concrete_model
        return model._meta

    def _get_from_cache(self, opts):
        key = opts.name
        return self._cache[self.db][key]

    def get_for_model(self, model, for_concrete_model=True):
        """
        Return the ContentType object for a given model, creating the
        ContentType if necessary. Lookups are cached so that subsequent lookups
        for the same model don't hit the database.
        """
        opts = self._get_opts(model, for_concrete_model)
        try:
            return self._get_from_cache(opts)
        except KeyError:
            pass

        # The ContentType entry was not found in the cache, therefore we
        # proceed to load or create it.
        try:
            # Start with get() and not get_or_create() in order to use
            # the db_for_read (see #20401).
            ct = self.get(name=opts.name)
        except self.model.DoesNotExist:
            # Not found in the database; we proceed to create it. This time
            # use get_or_create to take care of any race conditions.
            ct, created = self.get_or_create(
                schema=model._meta.schema,
                name=model._meta.name,
                verbose_name=model._meta.verbose_name,
                verbose_name_plural=model._meta.verbose_name_plural,
                object_name=model._meta.object_name,
            )
        self._add_to_cache(self.db, ct)
        return ct

    def get_for_models(self, *models, for_concrete_models=True):
        """
        Given *models, return a dictionary mapping {model: content_type}.
        """
        results = {}
        # Models that aren't already in the cache.
        needed_app_labels = set()
        needed_models = set()
        # Mapping of opts to the list of models requiring it.
        needed_opts = defaultdict(list)
        for model in models:
            opts = self._get_opts(model, for_concrete_models)
            try:
                ct = self._get_from_cache(opts)
            except KeyError:
                needed_app_labels.add(opts.schema)
                needed_models.add(opts.name)
                needed_opts[opts].append(model)
            else:
                results[model] = ct
        if needed_opts:
            # Lookup required content types from the DB.
            cts = self.filter(
                name__in=needed_models
            )
            for ct in cts:
                opts_models = needed_opts.pop(ct.model_class()._meta, [])
                for model in opts_models:
                    results[model] = ct
                self._add_to_cache(self.db, ct)
        # Create content types that weren't in the cache or DB.
        for opts, opts_models in needed_opts.items():
            ct = self.create(
                schema=opts.schema,
                name=opts.name,
            )
            self._add_to_cache(self.db, ct)
            for model in opts_models:
                results[model] = ct
        return results

    def get_for_id(self, id):
        """
        Lookup a ContentType by ID. Use the same shared cache as get_for_model
        (though ContentTypes are obviously not created on-the-fly by get_by_id).
        """
        try:
            ct = self._cache[self.db][id]
        except KeyError:
            # This could raise a DoesNotExist; that's correct behavior and will
            # make sure that only correct ctypes get stored in the cache dict.
            ct = self.get(pk=id)
            self._add_to_cache(self.db, ct)
        return ct

    def get_for_name(self, name):
        """
        Lookup a ContentType by Name. Use the same shared cache as get_for_model
        (though ContentTypes are obviously not created on-the-fly by get_by_name).
        """
        try:
            ct = self._cache[self.db][name]
        except KeyError:
            # This could raise a DoesNotExist; that's correct behavior and will
            # make sure that only correct ctypes get stored in the cache dict.
            ct = self.get(name=name)
            self._add_to_cache(self.db, ct)
        return ct

    def clear_cache(self):
        """
        Clear out the content-type cache.
        """
        self._cache.clear()

    def _add_to_cache(self, using, ct):
        """Insert a ContentType into the cache."""
        # Note it's possible for ContentType objects to be stale; model_class() will return None.
        # Hence, there is no reliance on model._meta.app_label here, just using the model fields instead.
        key = ct.name
        self._cache.setdefault(using, {})[key] = ct
        self._cache.setdefault(using, {})[ct.id] = ct


class ContentType(models.Model):
    schema = models.CharField(max_length=128, null=False)
    name = models.CharField(verbose_name=_('name'), max_length=128, null=False, unique=True)
    object_name = models.CharField(verbose_name=_('Object Name'))
    verbose_name = models.CharField(verbose_name=_('verbose name'), translate=True)
    verbose_name_plural = models.CharField(verbose_name=_('verbose name plural'), translate=True)
    description = models.TextField()
    help = models.TextField()
    parent = models.ForeignKey('self', label=_('Parent'))
    objects = ContentTypeManager()
    object_type = models.ChoiceField(
        (
            ('user', _('User Model')),
            ('base', _('Base Model')),
        ), null=False, default='user', verbose_name=_('Object Type'),
        readonly=True,
    )
    fields = models.OneToManyField('content.field')

    class Meta:
        name = 'content.type'
        verbose_name = _('Document Model')
        verbose_name_plural = _('Document Models')

    def __str__(self):
        return self.model_name

    @property
    def model_name(self):
        model = self.model_class()
        if not model:
            return self.name
        return str(model._meta.verbose_name)

    def model_class(self):
        """Return the model class for this type of content."""
        try:
            return apps[self.name]
        except LookupError:
            return None

    def get_object_for_this_type(self, **kwargs):
        """
        Return an object of this type for the keyword arguments given.
        Basically, this is a proxy around this object_type's get_object() model
        method. The ObjectNotExist exception, if thrown, will not be caught,
        so code that calls this method should catch it.
        """
        return self.model_class()._base_manager.using(self._state.db).get(**kwargs)

    def get_all_objects_for_this_type(self, **kwargs):
        """
        Return all objects of this type for the keyword arguments given.
        """
        return self.model_class()._base_manager.using(self._state.db).filter(**kwargs)

    def natural_key(self):
        return self.name

    @classmethod
    def get_id_by_natural_key(cls, name: str):
        return cls.objects.only('pk').get(name=name).pk

    def create_field(self, field):
        Field = apps['content.field']
        kwargs = Field.deconstruct(field)
        Field.objects.create(
            model=self,
            model_name=self._meta.name,
            **kwargs,
        )

    def create_index(self, index: models.Index):
        Index.objects.create()



# class Domain(models.Model):
#     name = models.CharField(unique=True)
#     check = models.TextField()
#     filter = models.TextField()
#     choices = models.TextField()
#     display_mask = models.CharField()
#     edit_mask = models.CharField()
#     required = models.BooleanField()
#     nullable = models.BooleanField()
#
#     class Meta:
#         name = 'content.domain'


class Field(models.Model):
    owner_type = models.ChoiceField(
        (
            ('user', _('User')),
            ('system', _('System')),
        ), verbose_name=_('Field Type'), default='user',
    )
    name = models.CharField(128, null=False, verbose_name=_('Name'), default='x_')
    db_column = models.CharField(128, editable=False)
    # domain = models.ForeignKey(Domain)
    data_type = models.ChoiceField(
        # {
        #     'str',
        #     'int',
        #     'bigint',
        #     'smallint',
        #     'bool',
        #     'decimal',
        #     'float',
        #     'date',
        #     'datetime',
        #     'time',
        #     'text',
        #     'image',
        #     'file',
        #     'bytes',
        #     'enum',
        #     'uuid',
        #     'onetomany',
        #     'manytomany',
        # }
    )
    model = models.ForeignKey(ContentType, null=False, verbose_name=_('Document Model'), on_delete=models.CASCADE)
    model_name = models.CharField()
    primary_key = models.BooleanField(default=False, label=_('Primary Key'))
    related_model = models.ForeignKey(ContentType)
    full_name = models.CharField(256, verbose_name=_('Full Name'), readonly=True)
    label = models.TextField(verbose_name=_('Field Label'))
    description = models.TextField(verbose_name=_('Description'))
    help_text = models.TextField(verbose_name=_('Help Text'))
    copy = models.BooleanField(default=False, verbose_name=_('Copyable'))
    required = models.BooleanField(default=False, verbose_name=_('Required'))
    nullable = models.BooleanField(default=True, verbose_name=_('Nullable'), help_text=_('Database nullable'))
    unique = models.BooleanField(default=False, label=_('Unique'))
    readonly = models.BooleanField(default=False, verbose_name=_('Readonly'))
    db_index = models.BooleanField(default=False, verbose_name=_('DB Index'))
    # can_migrate = models.BooleanField()
    max_length = models.PositiveSmallIntegerField(verbose_name=_('Max Length'))
    max_digits = models.PositiveSmallIntegerField(label=_('Max Digits'))
    decimal_places = models.PositiveSmallIntegerField(verbose_name=_('Decimal Places'))
    filter = models.TextField(verbose_name=_('Limit Choices To'))
    widget = models.CharField()
    # templates = models.TextField()
    choices = models.TextField(verbose_name=_('Options List'))
    dependencies = models.TextField()
    compute = models.TextField(label=_('App Computed Formula'))
    db_compute = models.TextField(label=_('DB Computed Formula'))
    default = models.TextField(label=_('Default Field Value'))
    db_default = models.TextField(label=_('DB Default Value'))
    db_tablespace = models.CharField(128)
    auto_created = models.BooleanField(default=False)
    stored = models.BooleanField(default=True)
    # groups = models.ManyToManyField('auth.group')
    localize = models.BooleanField(default=False, verbose_name=_('Localize'), help_text=_('Field content must be localized'))

    class Meta:
        name = 'content.field'
        verbose_name = _('Field')
        verbose_name_plural = _('Fields')
        title_field = 'caption'

    @classmethod
    def deconstruct(cls, field: models.Field):
        res = {
            'label': field.label,
            'owner_type': 'system',
            'name': field.name,
            'full_name': str(field),
            'db_column': field.column,
            'data_type': field.get_data_type(),
            'primary_key': field.primary_key,
            'max_length': field.max_length,
            'unique': field._unique,
            'required': field.required,
            'nullable': field.null,
            'stored': field.concrete,
            'db_index': field.db_index,
            'default': field.default,
            'db_default': field.db_default,
            'db_compute': field.db_compute,
            'max_digits': getattr(field, 'max_digits', None),
            'decimal_places': getattr(field, 'decimal_places', None),
            'db_tablespace': field.db_tablespace,
        }
        if field.many_to_one and field.related_model:
            res['related_model_id'] = apps['content.type'].get_id_by_natural_key(field.related_model._meta.name)
        return res


class Constraint(models.Model):
    content_type = models.ForeignKey(ContentType, null=False)
    field = models.ForeignKey(Field)
    name = models.CharField(128, null=False)
    auto_created = models.BooleanField(default=False)
    check = models.TextField()
    fields = models.TextField()
    deferrable = models.ChoiceField(
        {
            'deferred': _('Deferred'),
            'immediate': _('Immediate'),
        }
    )
    object_type = models.ChoiceField(
        (
            ('user', _('User Model')),
            ('base', _('Base Model')),
        ), null=False, default='user', verbose_name=_('Object Type'),
        readonly=True,
    )

    class Meta:
        name = 'content.constraint'
        verbose_name = _('Model Constraint')
        title_field = 'name'


class Index(models.Model):
    content_type = models.ForeignKey(ContentType, null=False)
    field = models.ForeignKey(Field)
    name = models.CharField(128, null=False)
    auto_created = models.BooleanField(default=False)
    fields = models.TextField()
    condition = models.TextField()
    object_type = models.ChoiceField(
        (
            ('user', _('User Model')),
            ('base', _('Base Model')),
        ), null=False, default='user', verbose_name=_('Object Type'),
        readonly=True,
    )

    class Meta:
        name = 'content.index'
        verbose_name = _('Model Index')
