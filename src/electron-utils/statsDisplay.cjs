const {
	SlpParser,
	DolphinConnection,
	Ports,
	ConnectionEvent,
	DolphinMessageType,
	Command,
	ConnectionStatus,
	SlpCommandEventPayload,
	SlpParserEvent,
	FrameEntryType,
	SlpStream,
	SlpStreamEvent,
	SlippiGame,
	GameMode,
	Stats,
} = require('@slippi/slippi-js');

class StatsDisplay {
	constructor(messageHandler, eventEmitter, log, slpStream, slpParser, store, api) {
		this.messageHandler = messageHandler;
		this.eventEmitter = eventEmitter;
		this.log = log;
		this.slpStream = slpStream;
		this.parser = slpParser;
		this.store = store;
		this.api = api;

		this.initStatDisplay();
	}

	initStatDisplay() {
		this.slpStream.on(SlpStreamEvent.COMMAND, async (event) => {
			// console.log("Commmand parsed by SlpStream: " + event.command + event.payload)
			this.parser.handleCommand(event.command, event.payload);
			if (event.command == 54) {
				await this.messageGameStart(this.parser.getSettings());
			}
		});

		this.parser.on(SlpParserEvent.END, async (frameEntry) => {
			await this.messageGameEnd(frameEntry, this.parser.getSettings());
		});

		this.parser.on(SlpParserEvent.FRAME, (frameEntry) => {
			this.messageHandler.sendMessage('game_frame', frameEntry);
		});
	}

	// GAME START
	async messageGameStart(settings) {
		if (!settings.players.some((p) => !p.connectCode)) this.messageOfflineData(settings);
		await this.messageOnlineData(settings);
		// Save and emit scene
	}

	async messageOnlineData(settings) {
		let currentPlayersRankStats = [
			await this.api.getPlayerRankStats(settings.players[0].connectCode),
			await this.api.getPlayerRankStats(settings.players[1].connectCode),
		];

		let currentPlayerRankStats = currentPlayersRankStats[0]; // TODO: Return player with current player connectCode

		if (settings.matchInfo.gameNumber === 0) {
			this.store.setGameScore([0, 0]);
		}

		this.store.setCurrentPlayerCurrentRankStats(currentPlayerRankStats);
		this.store.setCurrentPlayersRankStats(currentPlayersRankStats);
		this.store.setGameSettings(settings);

		this.messageHandler.sendMessage('currentPlayer_rank_stats', currentPlayerRankStats);
		this.messageHandler.sendMessage('currentPlayers_rank_stats', currentPlayersRankStats);
		this.messageHandler.sendMessage('game_settings', settings);
	}

	messageOfflineData(settings) {
		const currentPlayersRankStats = this.store.getCurrentPlayersRankStats();

		this.store.setGameSettings(settings);

		this.messageHandler.sendMessage('currentPlayers_rank_stats', currentPlayersRankStats ?? []);
		this.messageHandler.sendMessage('game_settings', settings);
	}

	// GAME END
	async messageGameEnd(frameEntry, settings) {
		console.log(frameEntry, settings);

		this.handleScore(frameEntry);

		let currentPlayersRankStats = [
			await this.api.getPlayerRankStats(settings.players[0].connectCode),
			await this.api.getPlayerRankStats(settings.players[1].connectCode),
		];

		let currentPlayerRankStats = currentPlayersRankStats[0]; // TODO: Return player with current player connectCode

		this.store.setCurrentPlayerActualRankStats(currentPlayerRankStats);

		const currentPlayerRank = this.store.getCurrentPlayerRankStats();

		// Not tested
		if (currentPlayerRank && currentPlayerRank?.current != currentPlayerRank?.new) {
			await this.handleRankChange();
			this.store.setCurrentPlayerCurrentRankStats(currentPlayerRankStats);
		}

		let recentGameStats = this.getRecentGameStats();
		this.messageHandler.sendMessage('game_stats', recentGameStats);
		// Change scene
	}

	handleScore(frameEntry) {
		this.store.setGameScore([0, 0]);
		let score = this.store.getGameScore() ?? [0, 0];
		const winnerIndex = frameEntry.placements
			.filter((p) => p.position >= 0)
			.sort((a, b) => a.position - b.position)[0].playerIndex;
		score[winnerIndex] += 1;
		this.messageHandler.sendMessage('game_score', score);
		this.store.setGameScore(score);
	}

	async handleRankChange() {
		this.log.info('Rank change');
		// Handle rank up animation
		await new Promise((resolve) => {
			setTimeout(resolve, 10000);
		});
	}

	// OTHER
	getGameFiles() {
		const fs = require('fs');
		const re = new RegExp('^Game_.*.slp$');
		const path = require('path');

		const slippiDir = this.store.getSlippiRootDirectory();

		if (!slippiDir) return null;

		let files = fs.readdirSync(slippiDir).map((filename) => `${path.parse(filename).name}.slp`);

		files = files.filter((f) => re.test(f)).map((f) => `${slippiDir}/${f}`);
		return files.sort((a, b) => a.length - b.length);
	}

	getRecentGameStats() {
		const files = this.getGameFiles();
		if (!files) return null;
		const game = new SlippiGame(files[files.length - 1]);

		return game?.getStats();
	}
}

module.exports = { StatsDisplay };
