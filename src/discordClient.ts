import config from './config.js'
import logger from './logger.js'
import ChatHumoid from './chatClient.js'
import type LlamaCpp from './llama.js'
import {Client, GatewayIntentBits} from 'discord.js'

export default class DiscordHumoid extends ChatHumoid {
    private client: Client

    constructor(llama: LlamaCpp) {
        super(llama)
        this.client = new Client({ intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]})
    }

    public async login():Promise<void> {
        await this.client.login(config.discord_bot_token)
        logger.info(`Logged into Discord as ${this.client.user!.tag}`)
        
        this.client.on('messageCreate', async (msg) => {
            if (msg.webhookId) return
            if (msg.author.id === this.client.user!.id) return
            if (msg.channel.id !== config.discord_channel_id) return
            if (msg.content.startsWith(config.ignore_prefix)) return

            if (this.llama.isRunning()) {
                await msg.reply({
                    content: 'Another request is already running, please wait until it completes and try again later.'
                })
                return
            }

            let reply = await msg.reply({
                content: config.discord_loading_emoji_id
            })
            let responseProgress = ''
            let responseLastLength = 0
            let stream = setInterval(async ():Promise<void> => {
                if (responseProgress.length > responseLastLength) {
                    responseLastLength = responseProgress.length
                    await reply.edit(responseProgress+' '+config.discord_loading_emoji_id)
                }
            },1000)
            let answer = await this.llama.prompt(msg.content, (answerStream) => responseProgress += answerStream)
            clearInterval(stream)
            await reply.edit(answer)
        })
    }
}