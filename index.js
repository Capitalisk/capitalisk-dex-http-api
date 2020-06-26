const defaultConfig = require('./defaults/config');
const http = require('http');
const express = require('express');
const cors = require('cors');
const app = express();
const pkg = require('./package.json');

const MODULE_ALIAS = 'lisk_dex_http_api';

/**
 * Lisk DEX HTTP API module specification
 *
 *
 * @namespace Framework.Modules
 * @type {module.LiskDEXHTTPAPIModule}
 */
module.exports = class LiskDEXHTTPAPIModule {
  constructor({alias, config, logger}) {
    this.alias = alias || MODULE_ALIAS;
    this.options = config;
    this.logger = logger;
    this.dexModuleAlias = config.dexModuleAlias;
    if (this.options.enableCORS) {
      app.use(cors());
    }
  }

  get dependencies() {
    return [this.dexModuleAlias];
  }

  static get alias() {
    return MODULE_ALIAS;
  }

  static get info() {
    return {
      author: 'Jonathan Gros-Dubois',
      version: pkg.version,
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

  _getSanitizedQuery(query) {
    let sanitizedQuery = {
      ...query
    };
    if (query.limit != null) {
      sanitizedQuery.limit = parseInt(query.limit);
    }
    return sanitizedQuery;
  }

  _respondWithError(res, error) {
    if (error.sourceError && error.sourceError.name === 'InvalidQueryError') {
      res.status(400).send(`Invalid query: ${error.sourceError.message}`);
      return;
    }
    res.status(500).send('Server error');
  }

  async load(channel) {
    this.marketData = await channel.invoke(`${this.dexModuleAlias}:getMarket`, {});
    this.marketId = `${this.marketData.quoteSymbol}-${this.marketData.baseSymbol}`;

    app.get('/status', async (req, res) => {
      let status;
      try {
        status = await channel.invoke(`${this.dexModuleAlias}:getStatus`, {});
      } catch (error) {
        this.logger.warn(error);
        this._respondWithError(res, error);
        return;
      }
      res.json(status);
    });

    app.get('/orders/bids', async (req, res) => {
      let sanitizedQuery = this._getSanitizedQuery(req.query);
      let bids;
      try {
        bids = await channel.invoke(`${this.dexModuleAlias}:getBids`, sanitizedQuery);
      } catch (error) {
        this.logger.warn(error);
        this._respondWithError(res, error);
        return;
      }
      res.json(bids);
    });

    app.get('/orders/asks', async (req, res) => {
      let sanitizedQuery = this._getSanitizedQuery(req.query);
      let asks;
      try {
        asks = await channel.invoke(`${this.dexModuleAlias}:getAsks`, sanitizedQuery);
      } catch (error) {
        this.logger.warn(error);
        this._respondWithError(res, error);
        return;
      }
      res.json(asks);
    });

    app.get('/orders', async (req, res) => {
      let sanitizedQuery = this._getSanitizedQuery(req.query);
      let orders;
      try {
        orders = await channel.invoke(`${this.dexModuleAlias}:getOrders`, sanitizedQuery);
      } catch (error) {
        this.logger.warn(error);
        this._respondWithError(res, error);
        return;
      }
      res.json(orders);
    });

    app.get('/order-book', async (req, res) => {
      let sanitizedQuery = this._getSanitizedQuery(req.query);
      if (sanitizedQuery.depth != null) {
        sanitizedQuery.depth = parseInt(sanitizedQuery.depth);
      }
      let orderBookEntries;
      try {
        orderBookEntries = await channel.invoke(`${this.dexModuleAlias}:getOrderBook`, sanitizedQuery);
      } catch (error) {
        this.logger.warn(error);
        this._respondWithError(res, error);
        return;
      }
      res.json(orderBookEntries);
    });

    app.get('/prices/recent', async (req, res) => {
      let sanitizedQuery = this._getSanitizedQuery(req.query);
      let recentPriceList;
      try {
        recentPriceList = await channel.invoke(`${this.dexModuleAlias}:getRecentPrices`, sanitizedQuery);
      } catch (error) {
        this.logger.warn(error);
        this._respondWithError(res, error);
        return;
      }
      res.json(recentPriceList);
    });

    app.get('/transfers/pending', async (req, res) => {
      let sanitizedQuery = this._getSanitizedQuery(req.query);
      let transfers;
      try {
        transfers = await channel.invoke(`${this.dexModuleAlias}:getPendingTransfers`, sanitizedQuery);
      } catch (error) {
        this.logger.warn(error);
        this._respondWithError(res, error);
        return;
      }
      res.json(transfers);
    });

    app.get('/transfers/recent', async (req, res) => {
      let sanitizedQuery = this._getSanitizedQuery(req.query);
      let transfers;
      try {
        transfers = await channel.invoke(`${this.dexModuleAlias}:getRecentTransfers`, sanitizedQuery);
      } catch (error) {
        this.logger.warn(error);
        this._respondWithError(res, error);
        return;
      }
      res.json(transfers);
    });

    app.listen(this.options.port);

    channel.publish(`${this.alias}:bootstrap`);
  }

  async unload() {}
};
