from typing import Any
from dataclasses import dataclass

from orun.apps import apps
from orun.core.exceptions import PermissionDenied
from orun.http import HttpRequest, JsonResponse
from orun.utils.translation import gettext as _
from orun.contrib.auth.decorators import login_required


@dataclass(kw_only=True)
class QuerySpec:
    model: str
    fields: list[str]
    orderBy: list[str] = None
    where: dict[str, Any] = None
    limit: int = 10
    offset: int = 0


@login_required
def exec_query(request: HttpRequest):
    query = request.json['query']
    if isinstance(query, dict):
        return JsonResponse(_exec_single_query(request, query))

    raise NotImplementedError


def _exec_single_query(request: HttpRequest, query: dict):
    q = QuerySpec(**query)
    model = apps.models[q.model]
    if not model._meta.exposed:
        raise PermissionDenied(_('Permission denied'))
    qs = model._api_search(request, where=q.where, fields=q.fields, order=q.orderBy)
    qs = qs[q.offset : q.offset + q.limit]
    return {'data': [obj.to_dict(fields=q.fields) for obj in qs]}
