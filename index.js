const defaultConfig = require('./defaults/config');
const BaseModule = require('lisk-framework/src/modules/base_module');
const { createLoggerComponent } = require('lisk-framework/src/components/logger');
const http = require('http');
const express = require('express');
const app = express();

const MODULE_ALIAS = 'lisk_dex_http_api';

/**
 * Lisk DEX HTTP API module specification
 *
 * HTTP API follows the Coinbase/GDAX format and conventions: https://docs.pro.coinbase.com/
 *
 * @namespace Framework.Modules
 * @type {module.LiskDEXHTTPAPIModule}
 */
module.exports = class LiskDEXHTTPAPIModule extends BaseModule {
  constructor(options) {
    super({...defaultConfig, ...options});
  }

  static get alias() {
    return MODULE_ALIAS;
  }

  static get info() {
    return {
      author: 'Jonathan Gros-Dubois',
      version: '1.0.0',
      name: MODULE_ALIAS,
    };
  }

  static get migrations() {
    return [];
  }

  static get defaults() {
    return defaultConfig;
  }

  get events() {
    return [
      'bootstrap',
    ];
  }

  get actions() {
    return {};
  }

  async getBids(channel) {
    let bids = await channel.invoke('lisk_dex:getBids', {});
    return bids.map((order) => {
      id: order.orderId,
      price: order.price,
      size: order.size,
      product_id: this.marketId,
      side: 'buy',
      stp: 'dc',
      type: 'limit',
      time_in_force: 'GTC',
      post_only: false,
      created_at: order.timestamp,
      fill_fees: '0.0000000000000000',
      filled_size: '0.00000000',
      executed_value: '0.0000000000000000',
      status: 'open',
      settled: false
    });
  }

  async getAsks(channel) {
    let asks = await channel.invoke('lisk_dex:getAsks', {});
    return asks.map((order) => {
      id: order.orderId,
      price: order.price,
      size: order.size,
      product_id: this.marketId,
      side: 'sell',
      stp: 'dc',
      type: 'limit',
      time_in_force: 'GTC',
      post_only: false,
      created_at: order.timestamp,
      fill_fees: '0.0000000000000000',
      filled_size: '0.00000000',
      executed_value: '0.0000000000000000',
      status: 'open',
      settled: false
    });
  }

  async load(channel) {
    let loggerConfig = await channel.invoke(
      'app:getComponentConfig',
      'logger',
    );
    this.logger = createLoggerComponent({...loggerConfig, ...this.options.logger});

    this.marketData = await channel.invoke('lisk_dex:getMarket', {});
    this.marketId = `${this.marketData.quoteSymbol}-${this.marketData.baseSymbol}`;

    app.get('/orders/bids', async (req, res) => {
      let bids;
      try {
        bids = await this.getBids(channel);
      } catch (error) {
        res.status(500).send('Server error');
        return;
      }
      res.send(JSON.stringify(bids));
    });

    app.get('/orders/asks', async (req, res) => {
      let asks;
      try {
        asks = await this.getAsks(channel);
      } catch (error) {
        res.status(500).send('Server error');
        return;
      }
      res.send(JSON.stringify(asks));
    });

    app.get('/orders', async (req, res) => {
      let bids;
      let asks;
      try {
        bids = await this.getBids(channel);
        asks = await this.getAsks(channel);
      } catch (error) {
        res.status(500).send('Server error');
        return;
      }
      let orders = bids.concat(asks);
      res.send(JSON.stringify(orders));
    });

    app.listen(this.options.port);

    channel.publish(`${MODULE_ALIAS}:bootstrap`);
  }

  async unload() {}
};
