from orun.apps import Application


settings = {
	'SETTINGS': '{{ secret_key }}',
    'DATABASES': {
        'default': {'ENGINE': '%s'},
    },
}

app = Application('{{ project_name }}-server', settings=settings)
with app.app_context():
	app.cli()
