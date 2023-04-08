import logger from './logger.js'
import LlamaCpp from './llama.js'
import DiscordHumoid from './discordClient.js'

let llm = new LlamaCpp()
await llm.start()

let discord = new DiscordHumoid(llm)
await discord.login()

process.on('uncaughtException',(error) => logger.error(error))
process.on('unhandledRejection',(reason) => logger.error(reason))