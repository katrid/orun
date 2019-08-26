"""
A XML Deserializer. Shortcut to deserialize complex structured Xml files.
"""
import functools
import os
from xml.etree import ElementTree as etree

from orun import app
from orun.core.exceptions import ObjectDoesNotExist
from orun.core.serializers import base
from orun.core.serializers.python import get_prep_value
from orun.db import models
from orun.utils.translation import gettext as _


def ref(app, xml_id):
    Object = app['ir.object']
    return Object.get_object(xml_id).object_id


class Deserializer(base.Deserializer):
    def deserialize(self, stream_or_string):
        if not isinstance(stream_or_string, (bytes, str)):
            data = etree.parse(stream_or_string).getroot()
        elif isinstance(stream_or_string, bytes):
            data = etree.fromstring(stream_or_string.decode('utf-8'))
        else:
            data = etree.fromstring(stream_or_string)
        lst = []
        trans = data.attrib.get('translate')
        for el in data:
            obj = self.TAGS[el.tag](self, el, translate=trans)
            if isinstance(obj, list):
                lst.extend(obj)
            elif obj:
                lst.append(obj)
        return lst

    def read_object(self, obj, trans=False, **attrs):
        ct = self.app['ir.model']
        if not isinstance(obj, dict):
            values = obj.getchildren()
            obj = dict(obj.attrib)
        else:
            values = obj.get('children', [])

        if 'fields' not in obj:
            obj['fields'] = {}

        for child in values:
            if child.tag == 'field':
                field_name = child.attrib['name']
                if 'ref' in child.attrib:
                    try:
                        obj['fields'][field_name] = ref(self.app, child.attrib['ref'])
                    except:
                        print('Error reading xml file file: ref:', child.attrib['ref'], self.app, self.options['filename'])
                        raise
                elif 'eval' in child.attrib:
                    obj['fields'][field_name] = eval(child.attrib['eval'], {'ref': functools.partial(ref, self.app)})
                elif 'model' in child.attrib:
                    obj['fields'][field_name] = ct.objects.only('pk').filter(ct.c.name == child.attrib['model']).first().pk
                elif 'file' in child.attrib:
                    obj['fields'][field_name] = open(
                        os.path.join(self.app_config.root_path, child.attrib['file']), encoding='utf-8'
                    ).read()
                else:
                    s = child.text
                    if child.attrib.get('translate', trans):
                        s = (s,)
                    obj['fields'][field_name] = s

        obj_name = obj.pop('id')
        obj_id = None
        Model = self.app[obj['model']]
        values = obj['fields']

        # # ui.view special case
        # if Model._meta.name == 'ui.view' and 'template_name' in values:
        #     template_name = values['template_name']
        #     values['template_name'] = self.app_config.schema + ':' + template_name
        #     assert '..' not in template_name
        #     template_name = os.path.join(self.app_config.path, self.app_config.template_folder, template_name)
        #     with open(template_name, encoding='utf-8') as f:
        #         values['content'] = f.read()

        Object = app['ir.object']
        can_update = not (obj.get('noupdate', False) and True)
        try:
            obj_id = Object.objects.filter(Object.c.name == obj_name).one()
            if can_update != obj_id.can_update:
                obj_id.can_update = can_update
                obj_id.save()
            instance = obj_id.object
            if not can_update:
                return instance
        except ObjectDoesNotExist:
            instance = Model()
        pk = instance.pk
        children = {}
        for k, v in values.items():
            # Check if there's a list of objects
            field = instance._meta.fields.get(k)
            if isinstance(v, list) and isinstance(field, models.OneToManyField):
                children[k] = v
            elif isinstance(v, tuple) and isinstance(field, models.CharField) and not field.translate:
                children[k] = _(v[0])
            else:
                setattr(instance, *get_prep_value(Model, k, field, v))
        instance.save()
        if pk is None:
            obj_id = Object.create(
                app_label=self.app_config.app_label,
                name=obj_name,
                object_id=instance.pk,
                model=instance._meta.name,
                can_update=not (obj.get('noupdate', False) and True),
            )
        for child, v in children.items():
            # Delete all items
            getattr(instance, child).delete()
            # Re-eval the xml data
            instance._meta.fields_dict[k].deserialize(v, instance)
        return instance

    def read_menu(self, obj, parent=None, **attrs):
        Object = self.app['ir.object']
        lst = []
        action = None
        action_id = obj.attrib.get('action')
        if action_id:
            try:
                action = Object.get_object(action_id).object
                action_id = action.pk
            except ObjectDoesNotExist:
                raise Exception('The object id "%s" does not exist' % action_id)
        s = obj.attrib.get('name')
        if s is None and action:
            s = action.name
        if 'parent' in obj.attrib:
            parent = Object.get_object(obj.attrib['parent']).object_id
        fields = {
            'parent_id': parent,
            'action_id': action_id,
            'name': s,
        }
        if obj.attrib.get('sequence'):
            fields['sequence'] = obj.attrib['sequence']
        menu = {
            'model': 'ui.menu',
            'id': obj.attrib.get('id'),
            'fields': fields
        }
        lst.append(menu)
        menu['children'] = []
        menu = self.read_object(menu, **attrs)
        for child in obj:
            r = self.read_menu(child, parent=menu.pk, **attrs)
            lst.extend(r)
        return lst

    def read_action(self, obj, **attrs):
        act = obj.attrib['type']
        model = obj.attrib.get('model')
        name = obj.attrib.get('name')
        if not name and model:
            name = str(app[model]._meta.verbose_name_plural)
        fields = {
            'name': name,
            'model': model,
        }
        action = {
            'model': act,
            'id': obj.attrib['id'],
            'children': obj.getchildren(),
            'fields': fields,
        }
        return self.read_object(action, **attrs)

    def delete_object(self, obj, **attrs):
        Object = app['ir.object']
        try:
            xml_obj = Object.get_object(obj.attrib['id'])
            obj = xml_obj.object
            obj.delete()
            xml_obj.delete()
        except:
            pass
        else:
            return True

    def read_template(self, obj, **attrs):
        templ = {
            'model': 'ui.view',
            'id': obj.attrib.get('id'),
            'fields': {
                'name': obj.attrib.get('name'),
                'view_type': 'template',
            }
        }
        template_name = obj.attrib.get('file')
        if template_name:
            templ['fields']['template_name'] = template_name
            module = self.app_config
            if module:
                filename = os.path.join(module.path, 'templates', template_name)
                if os.path.isfile(filename):
                    with open(filename) as f:
                        templ['fields']['content'] = f.read()
        return self.read_object(templ)

    def read_view(self, obj, **attrs):
        view = {
            'model': 'ui.view',
            'id': obj.attrib.get('id'),
            'fields': {
                'model': obj.attrib.get('model'),
                'name': obj.attrib.get('name'),
                'template_name': obj.attrib.get('file'),
            }
        }
        if 'parent' in obj.attrib:
            view['fields']['parent'] = ref(self.app, obj.attrib['parent'])
        template_name = obj.attrib.get('file')
        if template_name:
            view['fields']['template_name'] = template_name
            module = self.app_config
            if module:
                filename = os.path.join(module.path, 'templates', template_name)
                if os.path.isfile(filename):
                    with open(filename) as f:
                        view['fields']['content'] = f.read()
        return self.read_object(view)

    def read_report(self, obj, **attrs):
        model = obj.attrib.get('model')
        if model:
            ct = self.app['ir.model']
        print('model name', model)
        view = {
            'model': 'ui.view',
            'id': obj.attrib.get('view-id'),
            'fields': {
                'view_type': 'report',
                'template_name': obj.attrib.get('template'),
                'name': obj.attrib.get('view-id'),
                'model': (model and ct.objects.only('pk').filter(ct.c.name == model).one()) or None,
            },
        }
        view = self.read_object(view)
        report = {
            'model': 'ir.action.report',
            'id': obj.attrib.get('id'),
            'children': obj.getchildren(),
            'fields': {
                'report_type': obj.attrib.get('type', 'paginated'),
                'name': obj.attrib.get('name'),
                'view': view,
                'model': model,
            }
        }
        return self.read_object(report)

    TAGS = {
        'object': read_object,
        'action': read_action,
        'template': read_template,
        'view': read_view,
        'menuitem': read_menu,
        'report': read_report,
        'delete': delete_object,
    }
