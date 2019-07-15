import os
import tempfile
import uuid
from orun import app
from orun.db import connection
from orun.conf import settings

from .base import ReportEngine, Report, etree


class FastReport(Report):
    def get_xml_columns(self):
        return ''.join(
            [
                """<Column Name="%s" DataType="System.String"/>""" % (f.name)
                for f in self.model._meta.fields
                if f.name in self.selected_fields
            ]
        )

    def export(self, format='pdf', params=None):
        url = connection.engine.url
        conn_str = ''
        import fastreport
        if format == 'native':
            format = 'fpx'
        try:
            base_name = uuid.uuid4().hex
            rep_file = os.path.join(tempfile.gettempdir(), base_name + '.frx')
            with open(rep_file, 'wb') as f:
                f.write(etree.tostring(self.document, encoding='utf-8', xml_declaration=True))
            out_file = os.path.join(settings.REPORT_PATH, base_name + '.' + format)
            fastreport.show_report(rep_file, out_file, format, conn_str, self.data)
            return out_file
        finally:
            os.unlink(rep_file)


class FastReports(ReportEngine):
    env = None
    portrait_template = 'reports/templates/portrait.frx'
    report_class = FastReport

    def make_conn_str(self):
        url = connection.engine.url
        if url.drivername.startswith('mssql'):
            if url.password:
                return 'Data Source=%s;Initial Catalog=%s;Integrated Security=False;Persist Security Info=False;User ID=%s;Password=%s' % (url.host, url.database, url.username, url.password)
            else:
                # Windows integrated security
                return 'Data Source=%s;Initial Catalog=%s;Integrated Security=True' % (url.host, url.database)

    def export(self, report, format='pdf', params=None, **kwargs):
        import fastreport

        if format == 'native':
            format = 'fpx'
        if isinstance(report, str):
            # load by filename
            report = app.jinja_env.get_or_select_template(report).filename
            out_file = os.path.join(app.config['REPORT_PATH'], uuid.uuid4().hex) + '.' + format
            print('params', params)
            fastreport.show_report(report, out_file, format, self.make_conn_str(), '', '', params)
            return out_file

    def _load_xml(self, xml, rep):
        field_templ = '''<TextObject Name="Text_{0}" Width="{2}" CanGrow="true" Height="18.9" Left="{1}" VertAlign="Center" Text="[master.{0}]" Font="Arial, 8pt" {3}/>'''
        header_templ = '''<TextObject Name="Text_h_{0}" Width="{3}" Height="18.9" Text="{1}" Left="{2}" VertAlign="Center" Font="Arial, 8pt, style=Bold" {4}/>'''

        report_page = rep.document.findall('./ReportPage')[0]
        dictionary = rep.document.findall('./Dictionary')[0]
        summary = rep.document.findall('./ReportPage/ReportSummaryBand')[0]
        data_band = rep.document.findall('./ReportPage/DataBand')[0]

        fields = {el.attrib['name']: el for el in xml.findall('./fields/field')}
        pos_fields = {}

        if rep.selected_fields:
            page_header = report_page.findall('PageHeaderBand')[0]
            cx = 0

            for txt in list(data_band):
                data_band.remove(txt)
            for txt in list(page_header):
                page_header.remove(txt)
            param_fields = rep.selected_fields
            for i, field in enumerate(param_fields):
                w = 80
                ftype = fields[field].get('type', 'str')
                fmt_field = ''
                fmt_header = ''
                if ftype == 'str':
                    if i == 0:
                        w = 260 if len(param_fields) == 1 else 500
                    else:
                        w = 160
                elif ftype == 'decimal':
                    w = 100
                    fmt_field = '''Format="Currency" Format.UseLocale="true" HorzAlign="Right" WordWrap="false"'''
                    fmt_header = '''HorzAlign="Right"'''
                elif ftype == 'datetime':
                    w = 100
                    fmt_field = '''Format="Date" Format.Format="dd/MM/yyyy" WordWrap="false"'''
                data_band.append(etree.fromstring(field_templ.format(field, cx, w, fmt_field)))
                page_header.append(
                    etree.fromstring(
                        header_templ.format(field, fields[field].get('label', field), cx, w, fmt_header)
                    )
                )
                pos_fields[field] = (cx, w)
                cx += w

        if rep.grouping:
            field_templ = '''<TextObject Name="Text_t_{3}_{0}" Width="{2}" CanGrow="true" Height="18.9" Left="{1}" Text="[Total_{3}_{0}]" Font="Arial, 8pt, style=Bold" Format="Currency" Format.UseLocale="true" HorzAlign="Right" WordWrap="false"/>'''
            total_templ = '''<Total Name="Total_{1}_{0}" Expression="[master.{0}]" Evaluator="Data1" PrintOn="GroupFooter_{1}"/>'''

            group_template = '''
            <GroupHeaderBand Name="GroupHeader_{0}" Top="102.5" Width="1047.06" Height="37.8" Condition="[master.{0}]">
            {1}
            </GroupHeaderBand>
                '''
            group_footer = '''<GroupFooterBand Name="GroupFooter_{0}" Top="167.2" Width="1047.06" Height="37.8"/>'''
            group_field = '''<TextObject Name="Text_g_{0}" Top="9.45" Width="270" Height="18.9" Text="[master.{0}]"/>'''

            for group in rep.grouping:
                g_text = group_field.format(group)
                g = etree.fromstring(group_template.format(group, g_text))
                report_page.append(g)
                report_page.remove(data_band)
                g.append(data_band)
                gf = etree.fromstring(group_footer.format(group,))
                g.append(gf)
                if rep.totals:
                    for total in rep.totals:
                        dictionary.append(etree.fromstring(total_templ.format(total, group)))
                        footer_text = etree.fromstring(field_templ.format(total, pos_fields[total][1], pos_fields[total][0], group))
                        gf.append(footer_text)

        if rep.totals:
            field_templ = '''<TextObject Name="Text_t_{0}" Width="{2}" CanGrow="true" Height="18.9" Left="{1}" Text="[Total_{0}]" Font="Arial, 8pt, style=Bold" Format="Currency" Format.UseLocale="true" HorzAlign="Right" WordWrap="false"/>'''
            total_templ = '''<Total Name="Total_{0}" Expression="[master.{0}]" Evaluator="Data1"/>'''
            for total in rep.totals:
                dictionary.append(etree.fromstring(total_templ.format(total)))
                footer_text = etree.fromstring(field_templ.format(total, pos_fields[total][1], pos_fields[total][0]))
                summary.append(footer_text)

        sel_cmd = rep.select_command

        if rep.report_title:
            rep_title = report_page.find('.//TextObject[@Name="ReportTitle"]')
            rep_title.attrib['Text'] = rep.report_title

        datasource = rep.document.findall('.//TableDataSource')[0]
        if rep.data:
            # Check if data is based on xml
            datasource.getparent().remove(datasource)
            xml_conn = """<XmlDataConnection Name="XmlAutoConnection">
                  <TableDataSource Name="master" Alias="master" DataType="System.Int32" Enabled="true" TableName="record">
                    %s
                  </TableDataSource>
                </XmlDataConnection>
            """ % rep.get_xml_columns()
            dictionary.append(etree.fromstring(xml_conn))
        else:
            if rep.sorting:
                sel_cmd += ' ORDER BY ' + ','.join(rep.sorting)
            # if sql:
            #     pattern = re.compile(r"/\*where\*/", re.IGNORECASE)
            #     sel_cmd = pattern.sub(sql, sel_cmd)
            #     pattern = re.compile(r"/\*where-clause\*/", re.IGNORECASE)
            #     sel_cmd = pattern.sub(' WHERE ' + sql, sel_cmd)
            #     pattern = re.compile(r"/\*whereclause\*/", re.IGNORECASE)
            #     sel_cmd = pattern.sub(' WHERE ' + sql, sel_cmd)
            datasource.attrib['SelectCommand'] = sel_cmd

        #open('/tmp/rep.frx', 'wb').write(etree.tostring(rep.document, encoding='utf-8', xml_declaration=True))

        return rep

