from orun.test import ApplicationTestCase
from orun.core.exceptions import PermissionDenied
from orun.db import transaction


class ApprovalTestCase(ApplicationTestCase):
    addons = ['mail_module']

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with cls.app.app_context():
            cls.app.create_all()
            Model = cls.app['ir.model']
            cls.model = Model.create(name='mail_module_test.my.document')

    def setUp(self):
        self.approval_count = 0
        self.needed_count = 0
        self.approval_messages = 0
        self.approved_messages = 0

    def test_current_level(self):
        with self.app.app_context():
            with transaction.begin():

                import mail.models
                # empty model
                model = self.app['mail_module_test.my.document']
                model.objects.delete()
                model.create(name='Document 1', status='level1')

                ApprovalModel = self.app['mail.approval.model']
                ApprovalModel.objects.delete()
                approval_model = ApprovalModel.create(name='Document 1 Approval Levels', model=self.model)

                ApprovalLevel = self.app['mail.approval.level']
                ApprovalLevel.objects.delete()
                ApprovalLevel.create(approval_model=approval_model, sequence=1, level='level1', permission='allow')
                ApprovalLevel.create(approval_model=approval_model, sequence=2, level='level2', next_level='level3', permission='allow')

                def approved(doc, user, level):
                    self.approval_count += 1

                mail.models.document_approved.connect(approved)

                # auto evaluate approval
                obj = model.create(name='Document 2', status='level1')
                self.assertEqual(self.approval_count, 2)
                self.assertEqual(obj.current_approval_level.level, 'level2')
                self.assertEqual(obj.status, 'level3')

                mail.models.document_approved.disconnect(approved)

    def test_approval_flow(self):
        with self.app.app_context(), transaction.begin():
            import mail.models
            model = self.app['mail_module_test.my.document']
            model.objects.delete()
            model.create(name='Document 2', status='level1')

            ApprovalModel = self.app['mail.approval.model']
            ApprovalModel.objects.delete()
            approval_model = ApprovalModel.create(name='Document 1 Approval Levels', model=self.model)

            ApprovalLevel = self.app['mail.approval.level']
            ApprovalLevel.objects.delete()
            ApprovalLevel.create(approval_model=approval_model, sequence=1, level='level1', permission='user')
            ApprovalLevel.create(approval_model=approval_model, sequence=2, level='level2', next_level='level3', permission='user')

            def approved(doc, user, level):
                self.approval_count += 1

            mail.models.document_approved.connect(approved)

            # keep the original approval level
            obj = model.create(name='Document 2', status='level1')
            self.assertEqual(obj.current_approval_level.level, 'level1')
            self.assertEqual(obj.status, 'level1')

            obj.approve_document_level()
            obj.save()
            self.assertEqual(obj.current_approval_level.level, 'level2')
            self.assertEqual(obj.status, 'level2')

            obj.approve_document_level()
            obj.save()
            self.assertEqual(obj.current_approval_level.level, 'level2')
            self.assertEqual(obj.status, 'level3')

            self.assertEqual(self.approval_count, 2)

            mail.models.document_approved.disconnect(approved)

    def test_permission(self):
        with self.app.app_context(), transaction.begin():
            import mail.models

            User = self.app['auth.user']
            manager = User.create(username='manager_user')
            user = User.create(username='limited_user')

            model = self.app['mail_module_test.my.document']
            model.objects.delete()
            model.create(name='Document 2', status='level1')

            ApprovalModel = self.app['mail.approval.model']
            ApprovalModel.objects.delete()
            approval_model = ApprovalModel.create(name='Document 1 Approval Levels', model=self.model)

            ApprovalLevel = self.app['mail.approval.level']
            ApprovalLevel.objects.delete()
            ApprovalLevel.create(approval_model=approval_model, sequence=1, level='level1', permission='user', user=manager)
            ApprovalLevel.create(approval_model=approval_model, sequence=2, level='level2', permission='user', user=manager)
            ApprovalLevel.create(approval_model=approval_model, sequence=3, level='level3', next_level='level4', permission='user', user=manager)

            def approved(doc, user, level):
                self.approval_count += 1

            def approval_needed(doc, user, level):
                self.needed_count += 1

            def approval_message(doc, msg, user, level):
                self.approval_messages += 1

            def approved_message(doc, msg, user, level):
                self.approved_messages += 1

            mail.models.document_approved.connect(approved)
            mail.models.approval_needed.connect(approval_needed)
            mail.models.send_approval_message.connect(approval_message)
            mail.models.send_approved_message.connect(approved_message)

            # keep the original approval level
            obj = model.create(name='Document 2', status='level1')
            self.assertEqual(obj.current_approval_level.level, 'level1')
            self.assertEqual(obj.status, 'level1')

            with self.assertRaises(PermissionDenied):
                with self.app.app_context(user_id=user.pk):
                    obj.approve_document_level()
                    obj.save()

            with self.app.app_context(user_id=manager.pk):
                self.assertEqual(obj.current_approval_level.level, 'level1')
                obj.approve_document_level()
                obj.save()
                self.assertEqual(self.approval_count, 1)
                self.assertEqual(self.needed_count, 2)
                self.assertEqual(obj.current_approval_level.level, 'level2')
                self.assertEqual(obj.status, 'level2')

                obj.approve_document_level()
                obj.save()
                self.assertEqual(self.approval_count, 2)
                self.assertEqual(self.needed_count, 3)
                self.assertEqual(self.approval_messages, 3)
                self.assertEqual(self.approved_messages, 2)

            mail.models.document_approved.disconnect(approved)
            mail.models.approval_needed.disconnect(approval_needed)
            mail.models.send_approval_message.disconnect(approval_message)
            mail.models.send_approved_message.disconnect(approved_message)


class TestCopying(ApplicationTestCase):
    addons = ['mail_module']

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with cls.app.app_context():
            cls.app.create_all()
            Model = cls.app['ir.model']
            cls.source_model = Model.create(name='mail_module_test.my.document')
            cls.dest_model = Model.create(name='mail_module_test.my.document.dest')

    def test_copy_to(self):
        with self.app.app_context():
            copying = self.app['ir.copy.to']
            cp = copying.create(source_model=self.source_model, dest_model=self.dest_model, fields_mapping='{"name": "name"}')
            MyDocument = self.app['mail_module_test.my.document']
            my_doc = MyDocument.create(name='Document 1')
            dest = copying.copy_to(cp.pk, my_doc.pk)
            self.assertEqual(dest['value']['name'], my_doc.name)
