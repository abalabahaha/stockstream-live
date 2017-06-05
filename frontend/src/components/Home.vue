<template>
  <div class="container">
    <h3>StockStream Live (Alpha)</h3>
    <p>Alpha site for a live-updating view of <a href="https://www.twitch.tv/stockstream">StockStream</a>'s portfolio</p>
    <p>Historical data @ <a href="https://stockstream.abal.moe/data">https://stockstream.abal.moe/data</a></p>
    <hr />
    <div v-if="!connected">
      <h4>Connecting...</h4>
    </div>
    <div class="row full-width">
      <div class="col text-center">
        <div>
          <h4>Trades Remaining</h4>
        </div>
        <p class="trades-remaining">{{ tradesRemaining }} / {{ totalTrades }}</p>
      </div>
      <div v-if="marketOpen" class="col">
        <div>
          <h4 class="text-center">Transaction History</h4>
        </div>
        <div v-if="transactionHistory && transactionHistory.length > 0" class="card">
          <p v-for="transaction in transactionHistory">
            <span v-text="transaction.type.toUpperCase()"></span> {{ transaction.symbol }} @ {{ transaction.shares }} x {{ formatPrice(transaction.price) }}
          </p>
        </div>
        <div v-else class="card">
          <p>No data yet</p>
        </div>
      </div>
      <div v-else class="col text-center">
        <h3>Market Closed</h3>
      </div>
      <div class="col">
        <div>
          <h4 class="text-center">Portfolio Status</h4>
        </div>
        <div class="row">
          <div class="col">
            <p class="compact">Total: {{ formatPrice(portfolioTotal + cashTotal) }}</p>
            <p class="compact">Cash: {{ formatPrice(cashTotal) }}</p>
          </div>
          <div class="col">
            <p class="compact">Portfolio: {{ formatPrice(portfolioTotal) }}</p>
            <!-- Ghetto Indents -->
            <!-- <p class="compact">&nbsp;&nbsp;&nbsp;&nbsp;• Referrals (estimated): {{ formatPrice(referralTotal) }}</p> -->
          </div>
        </div>
      </div>
    </div>
    <div v-if="assets">
      <div>
        <h4 class="text-center">Portfolio</h4>
      </div>
      <table class="bordered">
        <thead>
          <tr>
            <th class="symbol">Symbol</th>
            <th>Shares</th>
            <th>Paid</th>
            <th>Current Price</th>
            <th>Change ($)</th>
            <th>Change (%)</th>
            <th>Paid Total</th>
            <th>Current Total</th>
            <th>Total Change</th>
            <th>% of Portfolio</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="asset in assets">
            <td class="symbol text-left">
              <a :href="formatFinanceLink(asset.symbol)" target="_blank">{{ asset.symbol }}</a>
            </td>
            <td class="text-center">{{ asset.shares }}</td>
            <td class="text-right">{{ formatPrice(asset.averageCost) }}</td>
            <td class="text-right">{{ formatPrice(asset.currentCost) }}</td>
            <td class="text-right">{{ formatChange(asset.change) }}</td>
            <td class="text-right" v-bind:style="{ backgroundColor: assetChangePercentToColor(asset) }">{{ formatChangePercent(asset.changePercent) }}</td>
            <td class="text-right">{{ formatPrice(asset.paidTotal) }}</td>
            <td class="text-right">{{ formatPrice(asset.currentTotal) }}</td>
            <td class="text-right">{{ formatChange(asset.totalChange) }}</td>
            <td class="text-right">{{ formatPercent(asset.percentPortfolio) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      assets: null,
      quotes: null,
      transactionHistory: null,
      connected: false,
      cashTotal: 0,
      portfolioTotal: 0,
      referralTotal: 0,
      minChangePercent: 0,
      maxChangePercent: 0,
      marketOpen: true,
      tradesRemaining: 0,
      totalTrades: 78
    }
  },
  methods: {
    assetChangePercentToColor(asset) {
      if(asset.averageCost <= 0) {
        return "#ffffff"
      } else if(asset.change < 0) {
        return `hsl(1,70%,${100 - 35 * asset.changePercent / this.minChangePercent}%)`
      } else {
        return `hsl(120,50%,${100 - 50 * asset.changePercent / this.maxChangePercent}%)`
      }
    },
    formatChange(change) {
      if(change == null) {
        return "------"
      } else if(change < 0) {
        return `-$${Math.abs(change).toFixed(2)}`
      } else {
        return `+$${change.toFixed(2)}`
      }
    },
    formatChangePercent(change) {
      if(change == null) {
        return "------"
      } else if(change < 0) {
        return `-${Math.abs(change).toFixed(2)}%`
      } else {
        return `+${change.toFixed(2)}%`
      }
    },
    formatFinanceLink(symbol) {
      return `https://finance.yahoo.com/quote/${symbol}/`
    },
    formatPercent(percent) {
      if(percent == null) {
        return "------"
      } else {
        return `${percent.toFixed(2)}%`
      }
    },
    formatPrice(price) {
      if(price == null) {
        return "------"
      } else {
        return `$${price.toFixed(2)}`
      }
    }
  },
  socket: {
    events: {
      connect() {
        console.log("Connected")
        this.connected = true
      },
      disconnect() {
        console.log("Disconnected")
        this.connected = false
      },
      assets(msg) {
        this.cashTotal = msg.cashTotal
        this.portfolioTotal = msg.portfolioTotal
        this.referralTotal = msg.referralTotal
        this.assets = msg.assets

        this.minChangePercent = 0
        this.maxChangePercent = 0
        msg.assets.forEach((asset) => {
          if(asset.averageCost > 0 && asset.changePercent < this.minChangePercent) {
            this.minChangePercent = asset.changePercent
          }
          if(asset.averageCost > 0 && asset.changePercent > this.maxChangePercent) {
            this.maxChangePercent = asset.changePercent
          }
        })
      },
      quotes(msg) {
        this.quotes = msg.quotes
      },
      transactionHistory(msg) {
        this.transactionHistory = msg.transactionHistory
      },
      marketStateUpdate(msg) {
        this.marketOpen = msg.marketOpen
        this.tradesRemaining = msg.tradesRemaining
      }
    }
  }
}
</script>

<style>
h1, h2, h3, h4, h5, h6 {
  margin: 0.5em 0;
}
p {
  margin: 0.2em 0;
}
.container {
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
.col {
  display: flex;
  flex-direction: column;
  flex: 12;
  padding: 8px;
  justify-content: center;
}
.col-1 {
  flex: 1;
}
.col-2 {
  flex: 2;
}
.col-4 {
  flex: 4;
}
.col-6 {
  flex: 6;
}
.full-width {
  width: 100%;
}
table {
  border-collapse: collapse;
}
td, th {
  padding: 1px 4px;
}
table.bordered td {
  border: 1px solid #aaa;
}
table.bordered th {
  border-bottom: 1px solid #000;
  border-right: 1px solid #000;
}
table.bordered td.symbol, th.symbol {
  border-left: 0;
  border-right: 1px solid #000;
}
.text-left {
  text-align: left;
}
.text-center {
  text-align: center;
}
.text-right {
  text-align: right;
}
.card {
  border: 1px solid #aaa;
  border-radius: 4px;
  padding: 8px;
}
.trades-remaining {
  font-size: 24px;
}
@media (max-width: 600px) {
  .row {
    flex-direction: column;
  }
}
</style>
