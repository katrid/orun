from orun.apps import apps
from orun.reports.base import PaginatedReport


class AutoReport(PaginatedReport):
    content_type = 'text/plain'

    def auto_report(self, request, *args, **kwargs):
        model_name = request.GET.get('model')
        model = apps.get_model(model_name)
        fields = model._meta.get_fields_group('auto_report') or model._meta.list_fields
        # generate report from auto_report fields
        data = model.objects.all().only(*[f.name for f in fields])
        return {'data': list(data)}

    def get(self, request, *args, **kwargs):
        self.write_line('Teste')
        self.write_line('Teste')
        self.write_line('Teste')
        return '\n'.join(self.stream)


apps.register_service(AutoReport, 'admin.views.reports.AutoReport')
