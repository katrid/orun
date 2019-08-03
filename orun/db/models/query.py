import sqlalchemy as sa
from sqlalchemy.sql import select, update, delete, text
from sqlalchemy import orm, or_, and_
from sqlalchemy.orm import load_only
from orun.core.exceptions import ObjectDoesNotExist

from orun.api import RecordsProxy
from orun.db import session, connection


class Node(object):
    def __init__(self, table=None, node=None):
        self.table = table
        self.parent = node
        self.columns = None
        self.where = None
        self.command = None
        self.ordering = None
        self.offset = None
        self.limit = None
        if node:
            self.command = node.command

    def set_limits(self, offset, limit):
        self.offset = offset
        self.limit = limit

    def compile(self):
        p = self.parent
        columns = []
        where = []
        ordering = self.ordering
        while p:
            if p.columns:
                columns.extend(p.columns)
            if p.where:
                where.extend(p.where)
            if ordering is None and p.ordering:
                ordering = p.ordering
            p = p.parent
        if self.columns:
            columns.extend(self.columns)
        if self.where:
            where.extend(self.where)
        if self.command is select:
            if not columns:
                columns = self.table.c.keys()
            q = self.command([getattr(self.table.c, col) for col in columns])
            if ordering:
                q = q.order_by(*ordering)
        else:
            q = self.command(self.table)
        if where:
            q = q.where(*where)
        if self.offset:
            q = q.offset(self.offset)
        if self.limit:
            q = q.limit(self.limit)
        return q


class QuerySet(object):
    command = select

    def __init__(self, model=None, query=None):
        self.model = model
        if query:
            query = Node(self.model._meta.table, query)
        self._query = query
        self._result_cache = None
        self.ordering = None
        self.ordered = False

    def _fetch_all(self, conn=connection):
        query = self.query
        if self._result_cache is None:
            self._result_cache = conn.execute(query.compile())

    def __call__(self, *args):
        self.query.columns = list(args)
        return self

    def first(self):
        """
        Returns the first object of a query, returns None if no match is found.
        """
        objects = list((self if self.ordered else self.order_by('pk'))[:1])
        if objects:
            return objects[0]
        return None

    def last(self):
        """
        Returns the last object of a query, returns None if no match is found.
        """
        objects = list((self.reverse() if self.ordered else self.order_by('-pk'))[:1])
        if objects:
            return objects[0]
        return None

    @property
    def query(self):
        if self._query is None:
            self._query = Node(self.model._meta.table, None)
            self._query.command = self.__class__.command
        return self._query

    def order_by(self, *args, **kwargs):
        clone = self._clone()
        clone.ordered = True

        params = []
        for arg in args:
            field = self.model._meta[arg]
            params.append(text(field.attname))

        clone.ordering = params
        clone.query.ordering = clone.ordering
        return clone

    def _clone(self, cls=None, **kwargs):
        if cls is None:
            cls = self.__class__
        clone = cls(model=self.model, query=self.query)
        clone.ordering = self.ordering
        clone.ordered = self.ordered
        clone.__dict__.update(kwargs)
        return clone

    def __len__(self):
        self._fetch_all()
        return len(self._result_cache)

    def __getitem__(self, k):
        """
        Retrieves an item or slice from the set of results.
        """
        if not isinstance(k, (slice, int)):
            raise TypeError
        assert ((not isinstance(k, slice) and (k >= 0)) or
                (isinstance(k, slice) and (k.start is None or k.start >= 0) and
                 (k.stop is None or k.stop >= 0))), \
            "Negative indexing is not supported."

        if self._result_cache is not None:
            return self._result_cache[k]

        if isinstance(k, slice):
            qs = self._clone()
            if k.start is not None:
                start = int(k.start)
            else:
                start = None
            if k.stop is not None:
                stop = int(k.stop)
            else:
                stop = None
            qs.query.set_limits(start, stop)
            return list(qs)[::k.step] if k.step else qs

        qs = self._clone()
        qs.query.set_limits(k, k + 1)
        return list(qs)[0]

    def __iter__(self):
        self._fetch_all()
        return iter(self._result_cache)

    def __bool__(self):
        self._fetch_all()
        return bool(self._result_cache)

    def where(self, *args, **kwargs):
        clone = self._clone(**kwargs)

        params = list(args)

        for k, v in kwargs.items():
            col = getattr(self.model._meta.table.c, k)
            params.append(col == v)

        clone._query.where = params
        return clone

    def get(self, pk=None, *args, **kwargs):
        pass

    @property
    def update(self):
        clone = self._clone(Update)
        clone.query.command = update
        return clone

    @property
    def delete(self):
        clone = self._clone(Delete)
        clone.query.command = delete
        return clone


class Update(QuerySet):
    command = update

    def values(self, *args, **kwargs):
        return session.execute(self.query.compile().values(*args, **kwargs))

    def __get__(self, instance, owner):
        if instance is not None and hasattr(self, '_sa_instance_state'):
            # Update the current instance
            return self.where(self.model._meta.pk.column == instance.pk)
        return self


class Delete(QuerySet):
    command = delete

    def __call__(self, *args, **kwargs):
        return session.execute(self.query.compile())

    def where(self, *args, **kwargs):
        autoexec = kwargs.pop('autoexec', True)
        r = super(Delete, self).where(*args, **kwargs)
        if autoexec:
            return r()
        return r

    def __get__(self, instance, owner):
        if instance:
            # Delete the current instance
            return self.where(self.model._meta.pk.column == instance.pk, autoexec=False)
        return self


class Insert(object):
    def __init__(self, model=None):
        self.model = model

    def __call__(self, *args, **kwargs):
        return self.model._meta.table.insert(*args, **kwargs)

    def values(self, *args, **kwargs):
        return session.execute(self.model._meta.table.insert().values(*args, **kwargs))


def convert_params(model, params, joins=None):
    from orun.db import models

    import ipdb; ipdb.set_trace()
    sub_param = None
    if not isinstance(params, (tuple, list)):
        params = [params]
    for param in params:
        for k, v in param.items():
            if k == 'OR':
                yield or_(*convert_params(model, v, joins))
            else:
                if isinstance(v, models.Model):
                    v = v.pk
                args = k.split('__', 1)
                col = args[0]
                fld = model._meta.fields_dict.get(col)
                col = fld.column
                attr = None
                if len(args) > 1:
                    for arg in args[1:]:
                        if arg == 'icontains':
                            arg = 'ilike'
                            v = '%' + v + '%'
                        attr = getattr(col, arg, getattr(col, arg + '_', None))
                        if (attr is None or not callable(attr)) and isinstance(fld, models.ForeignKey) and '__' in k:
                            joins.append([fld.rel.model, getattr(model, fld.rel.prop_name)])
                            for sub_param in convert_params(fld.rel.model, {arg: v}, joins):
                                yield sub_param
                            break
                if attr and callable(attr):
                    if isinstance(v, (list, tuple)):
                        yield attr(*v)
                    else:
                        import ipdb; ipdb.set_trace()
                        yield attr(v)
                elif sub_param is None:
                    yield col == v



class Query(orm.Query):
    def get_or_create(self, defaults=None, **kwargs):
        try:
            obj = self.filter(**kwargs).one()
        except ObjectDoesNotExist:
            obj = None
        if obj is None:
            obj = self._entities[0].type.create(**kwargs)
        return obj

    def filter(self, *criterion, **kwargs):
        # prepare django-styled params
        args = []
        joins = []
        if not criterion:
            criterion = []
        else:
            criterion = list(criterion)
        if kwargs:
            criterion.append(kwargs)
        for i, crit in enumerate(criterion):
            if isinstance(crit, dict):
                args.extend(convert_params(self._entities[0].entities[0], crit, joins))
            else:
                args.append(crit)

        # compile where clause
        res = super()
        for join in joins:
            res = res.outerjoin(*join)
        return res.filter(*args)

    def values_list(self, *fields):
        for obj in self:
            yield [getattr(obj, f, None) for f in fields]

    def only(self, *args):
        return self.options(load_only(*args))

    def join(self, *args, **kwargs):
        from orun.db import models

        args = list(args)
        for i, arg in enumerate(args):
            if isinstance(arg, models.Model):
                args[i] = arg.__class__
        return super(Query, self).join(*args, **kwargs)


Session = sa.orm.sessionmaker(autoflush=False, autocommit=True, query_cls=Query)


