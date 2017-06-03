const Axios = require("axios");
const EventEmitter = require("events").EventEmitter;
const FS = require("fs");

const production = process.env.NODE_ENV === "production";

var events = new EventEmitter();
events.ready = false;

var assets = [];
var cashTotal = 0;
var portfolioTotal = 0;
var referralTotal = 0;
var tradesRemaining = 0;
var marketOpen = false;
var quotes = [];
var transactionHistory = [];
try {
    transactionHistory = require("./data/transactionHistory.json");
} catch(err) {}

function updateAssets() {
    portfolioTotal = 0;
    referralTotal = 0;

    var i = 0;
    var j = 0;

    // Already in alphabetical sort
    // Doing it in parallel is faster than searching for the symbol every time
    while(i < assets.length && j < quotes.length) {
        var asset = assets[i];
        var quote = quotes[j];

        if(asset.symbol == quote.symbol) {
            asset.currentCost = quote.askPrice;

            asset.currentTotal = asset.shares * asset.currentCost;
            asset.paidTotal = asset.shares * asset.averageCost;

            asset.change = asset.currentCost - asset.averageCost;
            asset.changePercent = 100 * asset.change / asset.averageCost;

            asset.totalChange = asset.currentTotal - asset.paidTotal;

            portfolioTotal += asset.currentTotal;

            // Hacky but kinda works
            if((asset.currentTotal - asset.paidTotal) / asset.currentCost >= 0.8) {
                // This probably has a better algorithm but whatever
                // Gets worse over time
                asset.referralShares = Math.round((asset.currentTotal - asset.paidTotal) / asset.currentCost);
                referralTotal += asset.referralShares * asset.currentCost;
            }

            ++i;
            ++j;
        } else if(asset.symbol.localeCompare(quote.symbol) < 0) {
            ++i;
        } else {
            ++j;
        }
    }

    for(var asset of assets) {
        asset.percentPortfolio = asset.currentTotal / portfolioTotal * 100;
    }

    events.emit("assetsUpdate", events.getAssets());

    console.log("Updated assets");
}

function processQuotes(newQuotes) {
    newQuotes.sort(function(a, b) {
        return a.symbol.localeCompare(b.symbol);
    });


    var i = 0;
    var j = 0;

    // Already in alphabetical sort
    // Doing it in parallel is faster than searching for the symbol every time
    while(i < quotes.length && j < newQuotes.length) {
        var quote = quotes[i];
        var newQuote = newQuotes[j];

        if(quote.symbol == newQuote.symbol) {
            quote.askPrice = parseFloat(newQuote.last_extended_hours_trade_price || newQuote.last_trade_price);
            ++i;
        } else if(quote.symbol.localeCompare(newQuote.symbol) < 0) {
            quotes.splice(i, 1);
        } else {
            quotes.splice(i, 0, {
                askPrice: (newQuote.last_extended_hours_trade_price || newQuote.last_trade_price),
                symbol: newQuote.symbol
            });
            ++i;
        }
        ++j;
    }
    while(j < newQuotes.length) {
        var newQuote = newQuotes[j];

        quotes.push({
            askPrice: parseFloat(newQuote.last_extended_hours_trade_price || newQuote.last_trade_price),
            symbol: newQuote.symbol
        });

        ++j;
    }

    events.emit("quotesUpdate", events.getQuotes());

    console.log("Processed quotes");
}

function processAssets(newAssets) {
    newAssets.sort(function(a, b) {
        return a.symbol.localeCompare(b.symbol);
    });


    var i = 0;
    var j = 0;

    // Already in alphabetical sort
    // Doing it in parallel is faster than searching for the symbol every time
    while(i < assets.length && j < newAssets.length) {
        var asset = assets[i];
        var newAsset = newAssets[j];

        if(asset.symbol == newAsset.symbol) {
            if(asset.shares < newAsset.shares) {
                addTransaction("buy", asset.symbol, newAsset.shares - asset.shares,
                    newAsset.shares * newAsset.avgCost - asset.shares * asset.averageCost);
            } else if(asset.shares > newAsset.shares) {
                addTransaction("sell", asset.symbol, asset.shares - newAsset.shares,
                    asset.shares * asset.averageCost - newAsset.shares * newAsset.avgCost);
            }
            asset.shares = newAsset.shares;
            asset.averageCost = newAsset.avgCost;
            ++i;
        } else if(asset.symbol.localeCompare(newAsset.symbol) < 0) {
            addTransaction("sell", asset.symbol, asset.shares, asset.averageCost);
            assets.splice(i, 1);
        } else {
            addTransaction("buy", asset.symbol, newAsset.shares, newAsset.avgCost);
            assets.splice(i, 0, {
                averageCost: newAsset.avgCost,
                shares: newAsset.shares,
                symbol: newAsset.symbol
            });
            ++i;
        }
        ++j;
    }
    while(j < newAssets.length) {
        var newAsset = newAssets[j];

        assets.push({
            averageCost: newAsset.avgCost,
            shares: newAsset.shares,
            symbol: newAsset.symbol
        });

        ++j;
    }

    events.emit("assetsUpdate", events.getAssets());

    console.log("Processed assets");
}

function tickPortfolio() {
    var date = new Date();
    // 8AM - 7PM EST
    if(production && (date.getUTCHours() <= 12 || date.getUTCHours() >= 22)) {
        return;
    }

    console.log("Fetching portfolio...");
    Axios.get("http://stockstream-data.s3-website-us-west-2.amazonaws.com/portfolio").then(function(res) {
        console.log("Successfuly fetched portfolio");

        cashTotal = res.data.cashBalance;
        processAssets(res.data.assets);

        if(quotes) {
            updateAssets();

            if(!events.ready) {
                events.ready = true;
                setTimeout(function() {
                    events.emit("ready");
                }, 1000);
            };
        }
    }).catch(function(err) {
        console.error(err);
    });
}

function tickQuotes() {
    var date = new Date();
    // 8AM - 7PM EST
    if(production && (date.getUTCHours() <= 12 || date.getUTCHours() >= 22)) {
        return;
    }

    console.log("Fetching quotes...");
    var symbols = assets.map(function(asset) { return asset.symbol}).join(",") || "AAPL";
    Axios.get("https://api.robinhood.com/quotes/?symbols=" + symbols).then(function(res) {
        console.log("Successfuly fetched quotes");

        processQuotes(res.data.results);

        if(assets) {
            updateAssets();

            if(!events.ready) {
                events.ready = true;
                setTimeout(function() {
                    events.emit("ready");
                }, 1000);
            };
        }
    }).catch(function(err) {
        console.error(err);
    });
}

var ticks = 29;
function tick() {
    ++ticks;
    if(ticks % 5 === 0) {
        tickQuotes();
    }
    if(ticks === 30) {
        ticks -= 30;

        tickPortfolio();
    }

    var date = new Date();
    var hours = date.getUTCHours();
    var changed = false;
    if(hours >= 22) {
        if(marketOpen) {
            changed = true;
            marketOpen = false;
        }
    } else if(hours >= 13) {
        if(!marketOpen) {
            changed = true;
            marketOpen = true;
        }
        var newTradesRemaining = Math.floor(((21 - hours) * 60 + (60 - date.getUTCMinutes())) / 5);
        if(newTradesRemaining !== tradesRemaining) {
            changed = true;
            tradesRemaining = newTradesRemaining;
        }
    }
    if(changed) {
        events.emit("marketStateUpdate", events.getMarketState());
    }
}
var tickInterval = setInterval(tick, 1000);

function addTransaction(type, symbol, shares, price) {
    while(transactionHistory.length > 4) {
        transactionHistory.pop();
    }
    transactionHistory.unshift({
        type,
        symbol,
        shares,
        price
    });

    saveDataFile("transactionHistory.json", transactionHistory);

    events.emit("transactionHistoryUpdate", events.getTransactionHistory());
}

function saveDataFile(filename, data) {
    if(!FS.existsSync("./data")) {
        FS.mkdirSync("./data");
    }
    FS.writeFile("./data/" + filename, JSON.stringify(data), function(err) {
        if(err) {
            console.error(err);
        } else {
            console.log("Successfuly saved " + filename);
        }
    });
}

events.getAssets = function() {
    return {
        cashTotal,
        portfolioTotal,
        referralTotal,
        assets
    };
}

events.getQuotes = function() {
    return {
        quotes
    };
}

events.getTransactionHistory = function() {
    return {
        transactionHistory
    };
}

events.getMarketState = function() {
    return {
        marketOpen,
        tradesRemaining
    };
}

module.exports = events
