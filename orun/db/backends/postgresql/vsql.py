from orun.db.backends.base import vsql
from orun.db.models.fields.triggers import AggFieldTrigger


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

    def gen_agg_trigger_code(self, agg_trigger: AggFieldTrigger):
        tr_name = agg_trigger.get_name()
        tr_sql = f'CREATE TRIGGER {tr_name} AFTER INSERT OR UPDATE OR DELETE ON {agg_trigger.model._meta.db_table}'
        tr_sql += f' FOR EACH ROW EXECUTE FUNCTION __tfn{tr_name}();'

        fn_sql = [
            f'CREATE OR REPLACE FUNCTION __tfn{tr_name}() RETURNS TRIGGER AS $$$$',
            'BEGIN',
            "IF TG_OP = 'DELETE' THEN",
            'RETURN OLD;',
            'ELSE',
            'RETURN NEW;',
            'END IF;',
            'END;',
            '$$$$ LANGUAGE plpgsql',
        ]
        return '\n'.join(fn_sql), tr_sql
