from orun import app
import json
from orun.core.serializers.json import OrunJSONEncoder
from orun.core.management import commands


@commands.command('dumpdata')
@commands.argument('models', nargs=-1, required=True)
def command(database, models, **kwargs):
    data = []
    for model in models:
        model = app[model]
        for obj in model.objects.all():
            data.append(obj)
    data = {
        'data': data,
    }
    res = json.dumps(data, default=OrunJSONEncoder, check_circular=False, ensure_ascii=False)
    print(res)
