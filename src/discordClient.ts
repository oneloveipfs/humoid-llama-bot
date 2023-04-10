import config from './config.js'
import logger from './logger.js'
import ChatHumoid from './chatClient.js'
import type LlamaCpp from './llama.js'
import {Client, GatewayIntentBits, Message} from 'discord.js'

export default class DiscordHumoid extends ChatHumoid {
    private client: Client
    private bridgedMsg: Message | null = null

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

            this.llama.setRunning(true)
            let reply = await msg.reply({
                content: config.discord_loading_emoji_id
            })
            await this.bridgeSend(msg.author.username+'#'+msg.author.tag+': '+msg.content)
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
            await this.bridgeUpdate(answer, true)
            this.llama.setRunning(false)
        })
    }

    public async bridgeInbox(message: string): Promise<void> {
        if (this.bridgedMsg !== null)
            throw new Error('Can only bridge new request when the current one is clear')
        let channel = await this.client.channels.fetch(config.discord_channel_id)
        if (channel?.isTextBased()) {
            let bridgedPrompt = await channel.send({ content: message })
            this.bridgedMsg = await bridgedPrompt.reply({ content: config.discord_loading_emoji_id })
        } else
            throw new Error('Not a text based channel, please ensure that the Discord channel ID is specified correctly in the config.')
    }

    public async bridgeEdit(newMessage: string, isFinal: boolean): Promise<void> {
        if (this.bridgedMsg === null)
            throw new Error('There is no bridged message pending for response completion')
        await this.bridgedMsg.edit({ content: newMessage })
        if (isFinal)
            this.bridgedMsg = null
    }
}