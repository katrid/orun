from unittest import TestCase
import sqlalchemy as sa

from orun.apps import AppConfig, Application, Registry
from orun.db import models
from orun.db.models.fields.related import OneToOneField


class TestInheritance(TestCase):
    def setUp(self):
        self.registry = Registry()

        class Addon(AppConfig):
            label = 'myaddon'

        self.addon = Addon(registry=self.registry)

    def test_model(self):

        class Model(models.Model):
            __app_config__ = self.addon

        self.assertIn('myaddon.model', self.addon.models)
        self.assertFalse(Model.Meta.abstract)
        self.assertFalse(Model.Meta.inherited)

        class ModelA(Model):
            __app_config__ = self.addon

        self.assertTrue(ModelA.Meta.inherited)
        self.assertTrue(ModelA.Meta.extension)
        self.assertIsNotNone(ModelA.Meta.extending)

        class ModelB(Model):
            __app_config__ = self.addon

        self.assertTrue(ModelB.Meta.inherited)
        self.assertTrue(ModelB.Meta.extension)

    def test_abstract(self):

        class AbstractModel(models.Model):
            class Meta:
                app_config = self.addon
                abstract = True

        self.assertTrue(AbstractModel.Meta.abstract)
        self.assertFalse(AbstractModel.Meta.inherited)

        class ModelA(AbstractModel):
            class Meta:
                app_config = self.addon

        self.assertFalse(ModelA.Meta.abstract)
        self.assertTrue(ModelA.Meta.inherited)
        self.assertIsNone(ModelA.Meta.extending)

    def test_orm(self):
        class ModelA(models.Model):
            name = models.CharField()

            class Meta:
                app_config = self.addon
                name = 'myaddon.new.model'
                log_changes = False

        class ModelB(ModelA):
            description = models.CharField()

            class Meta:
                app_config = self.addon
                name = 'myaddon.model.b'
                log_changes = False

        # check service name
        self.assertEqual(ModelA.Meta.name, 'myaddon.new.model')
        self.assertEqual(ModelA.Meta.db_table, 'myaddon_new_model')
        self.assertIsNotNone(ModelA.Meta.pk)

        # check one to one relation
        self.assertTrue(ModelB.Meta.inherited)
        self.assertTrue(isinstance(ModelB.Meta.pk, OneToOneField))
        self.assertEqual(ModelB.Meta.db_table, 'myaddon_model_b')

        app = Application('testapp', registry=self.registry, addons=[self.addon.label])

        model_a = ModelA.__build__(app)
        model_b = ModelB.__build__(app)
        app.do_pending_operations()

        model_a._meta.build_table(app.meta)
        model_b._meta.build_table(app.meta)

        engine = sa.create_engine('sqlite:///', echo=True)

        app.meta.create_all(engine)
        engine.execute(model_a.insert({'name': 'new record'}))
        row = engine.execute(sa.select(['*'], model_a._meta.table)).fetchone()
        self.assertEqual(row.id, 1)

