import sys
import warnings
from sqlalchemy.engine import reflection
import sqlalchemy.dialects.mssql.base
from sqlalchemy.dialects.mssql import base as mssql
import sqlalchemy.dialects.mssql.pyodbc

from orun.core.exceptions import DatabaseWarning


class MSSQLCompiler(sqlalchemy.dialects.mssql.base.MSSQLCompiler):
    def returning_clause(self, *args, **kwargs):
        sql = super(MSSQLCompiler, self).returning_clause(*args, **kwargs)
        return sql + ' INTO @table'

    def visit_insert(self, *args, **kwargs):
        sql = super(MSSQLCompiler, self).visit_insert(*args, **kwargs)
        if self.returning:
            sql = """SET ANSI_WARNINGS OFF SET NOCOUNT ON DECLARE @table table (id int) """ + sql + """ SELECT id FROM @table"""
        return sql


class MSDDLCompiler(sqlalchemy.dialects.mssql.base.MSDDLCompiler):
    def get_column_specification(self, column, **kwargs):
        if 'compute' in column.info:
            return '%s AS %s' % (column.name, column.info['compute'])
        col = super().get_column_specification(column, **kwargs)
        return col


class MSSQLDialect(sqlalchemy.dialects.mssql.pyodbc.dialect):
    statement_compiler = MSSQLCompiler
    ddl_compiler = MSDDLCompiler

    @reflection.cache
    @sqlalchemy.dialects.mssql.base._db_plus_owner
    def get_columns(self, connection, tablename, dbname, owner, schema, **kw):
        q = ''' SELECT c.name, t.Name data_type, c.max_length max_length, c.precision, c.scale, c.is_nullable, ISNULL(i.is_primary_key, 0) primary_key,
            object_definition(c.default_object_id) default_value, c.collation_name, c.is_identity, comp.definition
            FROM sys.columns c
            INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
            LEFT OUTER JOIN sys.index_columns ic ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            LEFT OUTER JOIN sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
            LEFT OUTER JOIN sys.computed_columns comp on comp.column_id = c.column_id and comp.object_id = c.object_id
            WHERE c.object_id = OBJECT_ID(?)
        '''
        cursor = connection.execute(q, '%s.%s' % (owner, tablename))
        cols = []
        for col in cursor.fetchall():
            type = col.data_type
            collation = col.collation_name
            kwargs = {}
            coltype = self.ischema_names.get(type, None)
            if coltype in (mssql.MSString, mssql.MSChar, mssql.MSNVarchar, mssql.MSNChar, mssql.MSText,
                           mssql.MSNText, mssql.MSBinary, mssql.MSVarBinary,
                           mssql.sqltypes.LargeBinary):
                if col.max_length == -1:
                    charlen = None
                kwargs['length'] = col.max_length
                if collation:
                    kwargs['collation'] = collation
            if coltype is None:
                warnings.warn(
                    "Did not recognize type '%s' of column '%s'" % (col.type, col.name),
                    DatabaseWarning,
                )
                coltype = mssql.sqltypes.NULLTYPE
            else:
                if issubclass(coltype, mssql.sqltypes.Numeric) and coltype is not mssql.MSReal:
                    kwargs['scale'] = col.scale
                    kwargs['precision'] = col.precision
                coltype = coltype(**kwargs)

            col_info = {
                'name': col.name,
                'type': coltype,
                'nullable': col.is_nullable,
                'default': col.default_value,
                'autoincrement': col.is_identity,
            }
            if col.definition:
                col_info['info'] = {'compute': col.definition}
            cols.append(col_info)
        return cols


    @sqlalchemy.dialects.mssql.base._db_plus_owner
    def get_foreign_keys(self, connection, tablename, dbname, owner, schema, **kw):
        if schema:
            tablename = schema + '.' + tablename
        sql = '''select fk.name constraint_name, cols.name as column_name, schemas.name as schema_name, rt.name as table_name, cols2.name as referred_name
from sys.foreign_keys fk
inner join sys.tables rt on fk.referenced_object_id = rt.object_id
inner join sys.foreign_key_columns fkc on fkc.constraint_object_id = fk.object_id
inner join sys.columns cols on cols.object_id = fk.parent_object_id and cols.column_id = fkc.parent_column_id
inner join sys.columns cols2 on cols2.object_id = fkc.referenced_object_id and cols2.column_id = fkc.referenced_column_id
inner join sys.schemas schemas on schemas.schema_id = rt.schema_id
where fk.parent_object_id = OBJECT_ID('%s')
''' % tablename
        for fk in connection.execute(sql).fetchall():
            yield {
                'name': fk.constraint_name,
                'constrained_columns': [fk.column_name],
                'referred_schema': fk.schema_name,
                'referred_table': fk.table_name,
                'referred_columns': [fk.referred_name]
            }


if 'gevent' in sys.modules:
    import gevent.socket
    # import pymssql
    #
    # def wait_callback(read_fileno):
    #     gevent.socket.wait_read(read_fileno)
    #
    # pymssql.set_wait_callback(wait_callback)
