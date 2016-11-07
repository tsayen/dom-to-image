var Server = require('karma').Server
process.stdin.on('readable', function () {
  var data = JSON.parse(process.stdin.read())
  var server = new Server(data)
  server.start(data)
})
