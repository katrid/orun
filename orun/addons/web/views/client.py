from collections import defaultdict
import datetime

from flask import redirect, send_from_directory, url_for, flash, Response

from orun import app, auth, g
from orun import render_template
from orun import request, session
from orun.auth.decorators import login_required
from orun.conf import settings
from orun.utils.json import jsonify
from orun.utils.translation import gettext
from orun.views import BaseView, route, json_route


def index(template_name='/web/index.jinja2', **kwargs):
    menu = app['ui.menu']
    menu_items = menu.search_visible_items()
    menu_id = menu_items[0]
    context = {
        'current_menu': menu_id,
        'root_menu': menu_items,
    }
    context.update(kwargs)
    if settings.USE_I18N:
        from .i18n import javascript_catalog
        context['i18n_js_catalog'] = javascript_catalog(request, packages=app.addons.keys())
    return render_template(template_name, **context)


def login():
    if request.method == 'POST':
        next_url = None
        if request.is_json:
            username = request.json['username']
            password = request.json['password']
            next_url = request.json['next']
        else:
            username = request.form['username']
            password = request.form['password']
        print('next url', next_url)
        # check if db exists
        u = auth.authenticate(username=username, password=password)
        if u and u.is_authenticated:
            auth.login(u)
            if request.is_json:
                return jsonify({
                    'ok': True,
                    'user_id': u.id,
                    'redirect': next_url or request.args.get('next', url_for('WebClient:index')),
                    'message': gettext('Login successful, please wait...'),
                })
            return redirect(request.args.get('next', url_for('WebClient:index')))
        if request.is_json:
            return jsonify({
                'error': True,
                'message': gettext('Invalid username and password.'),
            })
        flash(gettext('Invalid username and password.'), 'danger')
    return render_template('web/login.jinja2', current_db=request.cookies.get('db'))


class WebClient(BaseView):
    route_base = '/web/'

    @login_required
    def index(self):
        return index()

    @route('/company/logo/')
    def company_logo(self):
        if g.user_id is not None:
            company = app['auth.user'].objects.get(g.user_id).user_company
            if company and company.image:
                return redirect(f'/web/content/{company.image.decode("utf-8")}/?download')
        return redirect('/static/web/assets/img/katrid-logo.png')

    @route('/reports/<path:path>')
    def report(self, path):
        return send_from_directory(settings.REPORT_PATH, path)

    @route('/db/', methods=['GET', 'POST'])
    def select_db(self):
        """Select the database"""
        if request.method == 'POST':
            if request.is_json:
                data = request.json
                database = data['db']
                redir = url_for('WebClient:login')
                res = jsonify({'redirect': redir})
                res.set_cookie('db', database, expires=datetime.datetime.now() + datetime.timedelta(days=365))
                return res
            else:
                database = request.form.get('database')
                res = redirect(request.args.get('next', url_for('WebClient:login')))
                res.set_cookie('db', database, expires=datetime.datetime.now() + datetime.timedelta(days=365))
                return res
        else:
            res = render_template('web/select-db.jinja2')
            res = Response(res)
            res.delete_cookie('db')
            return res

    @route('/login/', methods=['GET', 'POST'])
    def login(self):
        return login()

    def logout(self):
        auth.logout()
        return redirect(url_for('WebClient:login'))

    @route('/client/templates/')
    def client_templates(self):
        return b'<templates>%s</templates>' % b''.join(
            [b''.join(addon.get_js_templates()) for addon in app.iter_blueprints() if addon.js_templates]
        )

    @route('/content/<int:content_id>/')
    def content(self, content_id=None):
        http = g.env['ir.http']
        return http.get_attachment(content_id)

    @route('/content/upload/', methods=['POST'])
    def upload_attachment(self):
        Attachment = app['ir.attachment']
        res = []
        for file in request.files.getlist('attachment'):
            obj = Attachment.create(
                name=file.filename,
                model=request.form['model'],
                object_id=request.form['id'],
                file_name=file.filename,
                stored_file_name=file.filename,
                content=file.stream,
                mimetype=file.mimetype,
            )
            res.append({'id': obj.pk, 'name': obj.name})
        return jsonify(res)

    @route('/file/upload/<model>/<meth>/', methods=['POST'])
    def upload_file(self, model, meth):
        model = app[model]
        meth = getattr(model, meth)
        if meth.exposed:
            res = meth([file for file in request.files.getlist('files')], **request.form)
            if isinstance(res, dict):
                res = jsonify(res)
            return res

    @json_route('/data/reorder/', methods=['POST'])
    def reorder(self, model, ids, field='sequence', offset=0):
        cls = app[model]
        for i, obj in enumerate(cls._search({'pk__in': ids})):
            setattr(obj, field, ids.index(obj.pk) + offset)
            obj.save()
        return {
            'status': 'ok',
            'ok': True,
            'result': True,
        }

    @route('/image/<model>/<field>/<id>/')
    def image(self, model, field, id):
        return redirect(app['ir.attachment'].objects.filter(id=id).one().get_download_url())

    @route('/query/')
    def query(self):
        id = request.args.get('id')
        queries = app['ir.query']
        query = None
        if id:
            query = queries.read(id, return_cursor=True)
        queries = queries.objects.all()
        cats = defaultdict(list)
        for q in queries:
            cats[q.category].append(q)
        return render_template('/web/query.html', categories=cats, query=query)


# @app.errorhandler(500)
# def error(e):
#     pass
    # return render_template('web/500.html')
