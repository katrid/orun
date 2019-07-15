(function() {

  class Connection {
    constructor(name) {
      Katrid.Data.connections[name] = this;
      if (!Katrid.Data.connection)
        Katrid.Data.connection = this;
    }
  }


  class Adapter {

  }


  class MemoryAdaper extends Adapter {

  }

  Katrid.Data = {
    connections: {},
    connection: null,
    defaultConnection: 'default',
  }
})();
