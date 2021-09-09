from orun.db.backends.base import vsql


class Compiler(vsql.Compiler):
    def begin_trigger(self, v_trigger, name: str, event: str):
        proc_name = '_tfn' + name
        self.fill(f'CREATE OR REPLACE FUNCTION {proc_name}() RETURNS TRIGGER LANGUAGE PLPGSQL AS \n$$\nBEGIN')

    def end_trigger(self, v_trigger, name: str, event: str):
        proc_name = '_tfn' + name
        if event.endswith('INSERT') or event.endswith('UPDATE'):
            ret = 'NEW'
        else:
            ret = 'OLD'
        self.fill(f'RETURN {ret};\nEND;\n$$')
        self.end_sql()
        self.fill(f'DROP TRIGGER IF EXISTS {name} ON {self._model._meta.db_table};')
        self.fill(f'CREATE TRIGGER {name} {event} ON {self._model._meta.db_table} FOR EACH ROW EXECUTE PROCEDURE {proc_name}();')

