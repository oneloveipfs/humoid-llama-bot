import logger from './logger.js'
import LlamaCpp from './llama.js'

let llm = new LlamaCpp()
await llm.start()
logger.info(await llm.prompt('Describe being a large language model',(msg) => logger.trace(msg)))
llm.stop()

process.on('uncaughtException',(error) => logger.error(error))
process.on('unhandledRejection',(reason) => logger.error(reason))