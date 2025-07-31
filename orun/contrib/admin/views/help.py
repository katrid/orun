import os
import json
import mimetypes
from orun.apps import apps
from orun.conf import settings
from orun.http import HttpRequest, JsonResponse, HttpResponse, FileResponse
from orun.shortcuts import render


def help_center(request: HttpRequest):
    return render(request, 'help-center/help-center.jinja2', {'settings': settings})


def toc(request: HttpRequest):
    # collect toc from all apps
    docs = []
    for name, app in apps.addons.items():
        fname = os.path.join(app.path, 'docs', 'index.json')
        if os.path.isfile(fname):
            with open(fname, 'r') as f:
                data = json.load(f)
                if 'toc' in data:
                    data['toc'] = {title: f'{name}/{file}' for title, file in data['toc'].items()}
                data['name'] = name
                if 'title' not in data:
                    data['title'] = app.verbose_name
                if 'index' not in data and os.path.isfile(os.path.join(app.path, 'docs', 'index.md')):
                    data['index'] = os.path.join(name, 'index.md')
                docs.append(data)

    return JsonResponse({"toc": docs})


def _get_content_file(filename: str):
    if filename.startswith('/'):
        filename = filename[1:]
    app_name, fname = filename.split('/', 1)
    app = apps.addons.get(app_name)
    filepath = os.path.join(app.path, 'docs', fname)
    with open(filepath, 'r') as f:
        return f.read()


def get_content(request: HttpRequest):
    content_name = request.GET.get('content')
    return JsonResponse({'content': _get_content_file(content_name)})


def get_image(request: HttpRequest, app_name, path: str):
    path = os.path.normpath(path)
    app = apps.addons.get(app_name)
    path = os.path.join(app.path, 'docs', 'images', path)
    if os.path.isfile(path):
        content_type, _ = mimetypes.guess_type(path)
        return FileResponse(open(path, 'rb'), content_type=content_type)
    return None
