import unittest
import json
from orun import app
import orun.auth


class ClientTestCase(unittest.TestCase):
    def setUpClass(cls):
        cls.client = app.test_client()

    def login(self, username, password):
        return self.client.post(
            '/web/login/', data={
                'username': username,
                'password': password,
            },
        )

    def rpc(self, service, meth, data):
        return self.client.post('/api/rpc/%s/call/' % service, data=json.dumps({
            'jsonrpc': 2.0,
            'method': meth,
            'id': 1,
            'params': data,
        }), content_type='application/json')
