from orun.test import Client


class ClientRPC(Client):
    def rpc(self, service: str, method: str, data: dict):
        """Emulate the JSONRPC write method"""
        return self.post(f'/api/rpc/{service}/{method}/', {'params': {'kwargs': {'data': data}}}, content_type='application/json')
