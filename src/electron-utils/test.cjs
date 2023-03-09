const { SlpParserEvent } = require('@slippi/slippi-js');

class Test {
	constructor(messageHandler, ipcMain, log, store, api, statsDisplay) {
		this.messageHandler = messageHandler;
		this.ipcMain = ipcMain;
		this.log = log;
		this.store = store;
		this.api = api;
		this.statsDisplay = statsDisplay;

		this.initIpcListeners();
	}

	async initIpcListeners() {
		this.ipcMain.on('test-live-stats', async (_, rating) => {
			await this.testLiveStats(rating);
		});
	}

	async testLiveStats(rating) {
		// TODO: Use statDisplay to fetch recent or random game
		console.log('testing..');
		// Waiting for dolphin
		await new Promise((resolve) => {
			this.messageHandler.sendMessage('live_stats_scene', 0);
			setTimeout(resolve, 1500);
		});
		// Players rank stats
		await new Promise((resolve) => {
			this.messageHandler.sendMessage('live_stats_scene', 2);
			setTimeout(resolve, 3000);
		});
		// Ongoing game
		await new Promise((resolve) => {
			this.messageHandler.sendMessage('live_stats_scene', 4);
			setTimeout(resolve, 10000);
		});
		// Rank up
		if (rating) {
			await new Promise((resolve) => {
				this.messageHandler.sendMessage('live_stats_scene', 8);
				setTimeout(resolve, 1500);
			});
		}
		// Post game stats
		await new Promise((resolve) => {
			this.messageHandler.sendMessage('live_stats_scene', 6);
			setTimeout(resolve, 10000);
		});

		// Return to original value
		this.messageHandler.initData(null);
	}
}

module.exports = { Test };
