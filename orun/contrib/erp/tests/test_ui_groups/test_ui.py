from lxml import etree
from orun.test import TestCase
from orun.contrib.erp.models import User, Group, Permission, Partner, GroupPermissions
from orun.contrib.admin.models import View
from orun.contrib.contenttypes.models import ContentType, Object


class TestGroups(TestCase):
    def test_ui_groups(self):
        partner1 = Partner.objects.create(name='Partner 1')
        ct = ContentType.objects.filter(name='res.partner').first()
        perm1 = Permission.objects.create(name='cancel', content_type=ct, codename='cancel_partner')
        group1 = Group.objects.create(name='test_group')
        group2 = Group.objects.create(name='test_group2', allow_by_default=False)
        Object.objects.create(name='test_group', model_name='auth.group', object_id=group1.id, model=ct, schema='erp')
        user1 = User.objects.create(username='user1', name='First User', is_staff=True)
        user2 = User.objects.create(username='user2', name='Second User', is_staff=True)
        group1.users.add(user1)
        group2.users.add(user2)
        GroupPermissions.objects.create(group=group1, permission=perm1)
        GroupPermissions.objects.create(group=group2, permission=perm1, allow=False)
        self.assertTrue(user1.has_group('test_group'))
        self.assertFalse(user2.has_group('test_group'))
        self.assertTrue(user1.has_perm('cancel_partner', 'res.partner'))
        self.assertFalse(user2.has_perm('cancel_partner',  'res.partner'))
        xml = '<form><div has-perm="cancel_partner"><field name="name"/></div></form>'
        view1 = View.objects.create(name='test_view', content=xml, model='res.partner')
        s = etree.tostring(view1.get_xml(Partner, {'user_id': user2.id})).decode('utf-8')
        self.assertEqual(s, '<form/>')
        s = etree.tostring(view1.get_xml(Partner, {'user_id': user1.id})).decode('utf-8')
        self.assertEqual(s, '<form><div><field name="name"/></div></form>')
