const SocketIO = require("socket.io");

var dataManager = require("./dataManager");
var io;

dataManager.on("ready", function() {
    dataManager.on("assetsUpdate", function(data) {
        io.sockets.emit("assets", data);
    }).on("quotesUpdate", function(data) {
        // io.sockets.emit("quotes", data);
    }).on("transactionHistoryUpdate", function(data) {
        io.sockets.emit("transactionHistory", data);
    }).on("marketStateUpdate", function(data) {
        io.sockets.emit("marketStateUpdate", data);
    });

    io = SocketIO(4002, {
        path: "/ws/socket.io"
    });

    var server = io.on("connection", function(conn) {
        console.log("Connected");
        conn.emit("assets", dataManager.getAssets());
        // conn.emit("quotes", dataManager.getQuotes());
        conn.emit("transactionHistory", dataManager.getTransactionHistory());
        conn.emit("marketStateUpdate", dataManager.getMarketState());
    });
});
