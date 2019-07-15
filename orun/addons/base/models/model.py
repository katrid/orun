from orun.core.exceptions import ObjectDoesNotExist
from orun.db import models
from orun.utils.translation import gettext_lazy as _


class Model(models.Model):
    name = models.CharField(null=False, verbose_name=_('Name'))
    parent = models.ForeignKey('self', verbose_name=_('Parent'))
    object_name = models.CharField(null=False, verbose_name=_('Object Name'))
    object_type = models.CharField(
        16, null=False, default='user', verbose_name=_('Object Type'),
        readonly=True,
        choices=(
            ('user', _('User Model')),
            ('base', _('Base Model')),
        )
    )
    description = models.TextField(verbose_name=_('Description'))

    class Meta:
        name = 'ir.model'

    def get_by_natural_key(self, name):
        try:
            return self.objects.filter(self.c.name == name).one()
        except ObjectDoesNotExist:
            raise ObjectDoesNotExist('Model not found %s' % name)

    def get_for_model(self, obj):
        obj._meta.name

    def get_for_id(self, id):
        """
        Lookup a Model by ID. Uses the same shared cache as get_for_model
        (though Model are obviously not created on-the-fly by get_by_id).
        """
        # try:
        #     ct = cls._cache[self.db][id]
        # except KeyError:
        #     ct = cls.get(pk=id)
        #     self._add_to_cache(self.db, ct)
        # return ct
        ct = self.objects.filter(self._meta.pk.column == id).one()
        return ct

    def save(self, *args, **kwargs):
        if not self.object_name:
            self.object_name = self.name
        super(Model, self).save(*args, **kwargs)

    def model_class(self):
        "Returns the Python model class for this type of content."
        try:
            return self.env[self.name]
        except LookupError:
            return None

    def get_object_for_this_type(self, id):
        """
        Returns an object of this type for the keyword arguments given.
        Basically, this is a proxy around this object_type's get_object() model
        method. The ObjectNotExist exception, if thrown, will not be caught,
        so code that calls this method should catch it.
        """
        model = self.model_class()
        return model.objects.filter(model._meta.pk.column == id).one()

    def get_all_objects_for_this_type(self, **kwargs):
        """
        Returns all objects of this type for the keyword arguments given.
        """
        return self.model_class()._base_manager.using(self._state.db).filter(**kwargs)

    def natural_key(self):
        return self.name


class Field(models.Model):
    name = models.CharField(null=False)
    full_name = models.CharField(256)
    model = models.ForeignKey(Model)
    copy = models.BooleanField(default=False)
    required = models.BooleanField(default=False)
    readonly = models.BooleanField(default=False)
    index = models.BooleanField(default=False)
    size = models.IntegerField()
    field_type = models.CharField(16, choices=(
        ('user', _('User Field')),
        ('base', _('Base Field')),
    ))
    domain = models.TextField()

    class Meta:
        name = 'ir.model.field'

