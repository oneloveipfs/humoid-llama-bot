import logger from './logger.js'
import config from './config.js'
import LlamaCpp from './llama.js'
import DiscordHumoid from './discordClient.js'
import MatrixHumoid from './matrixClient.js'

let llm = new LlamaCpp()
await llm.start()

if (config.discord_bot_token) {
    let discord = new DiscordHumoid(llm)
    await discord.login()
}

if (config.matrix_bot_token) {
    let matrix = new MatrixHumoid(llm)
    await matrix.login()
}

process.on('uncaughtException',(error) => logger.error(error))
process.on('unhandledRejection',(reason) => logger.error(reason))