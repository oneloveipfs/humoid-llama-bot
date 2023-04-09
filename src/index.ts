import logger from './logger.js'
import config from './config.js'
import LlamaCpp from './llama.js'
import DiscordHumoid from './discordClient.js'
import MatrixHumoid from './matrixClient.js'

let llm = new LlamaCpp()
await llm.start()

let discord = new DiscordHumoid(llm)
let matrix = new MatrixHumoid(llm)

if (config.discord_bot_token) {
    await discord.login()
    matrix.registerBridge(discord)
}

if (config.matrix_bot_token) {
    await matrix.login()
    discord.registerBridge(matrix)
}

process.on('uncaughtException',(error) => logger.error(error))
process.on('unhandledRejection',(reason) => logger.error(reason))