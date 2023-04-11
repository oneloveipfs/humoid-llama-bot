import config from './config.js'
import logger from './logger.js'
import ChatHumoid from './chatClient.js'
import type LlamaCpp from './llama.js'
import { MatrixClient, SimpleFsStorageProvider } from 'matrix-bot-sdk'
import { marked } from 'marked'

export default class MatrixHumoid extends ChatHumoid {
    private storage: SimpleFsStorageProvider
    private client: MatrixClient
    private bridgedMsg: string = '' // bridged event id

    constructor(llama: LlamaCpp) {
        super(llama)
        this.storage = new SimpleFsStorageProvider('bot.json')
        this.client = new MatrixClient(config.matrix_homeserver,config.matrix_bot_token,this.storage)
    }

    async login():Promise<void> {
        await this.client.start()
        logger.info('Matrix Bot started!')
        this.client.on('room.message', async (roomId, event) => {
            if (!event || !event.content) return
            if (event.sender === await this.client.getUserId()) return
            if (event.unsigned && event.unsigned.age > 60000) return
            if (roomId !== config.matrix_room_id) return
            if (event.content.msgtype !== 'm.text') return
            if (event.content['m.relates_to'] && event.content['m.relates_to'].rel_type === 'm.replace') return
            if (event.content.body.startsWith(config.ignore_prefix))
                return await this.bridgeSend(event.content.body, false)

            if (this.llama.isRunning()) {
                await this.client.replyNotice(roomId,event,'Another request is already running, please wait until it completes and try again later.')
                return
            }

            this.llama.setRunning(true)
            let replyId = await this.client.replyHtmlText(roomId,event,'Waiting for response...')
            await this.bridgeSend(event.content.body, true)
            let responseProgress = ''
            let responseLastLength = 0
            let stream = setInterval(async ():Promise<void> => {
                if (responseProgress.length > responseLastLength) {
                    responseLastLength = responseProgress.length
                    await this.editMsg(replyId, responseProgress, true)
                }
            },5000)
            let answer = await this.llama.prompt(event.content.body, (answerStream) => responseProgress += answerStream)
            clearInterval(stream)
            await this.editMsg(replyId, answer, false)
            await this.bridgeUpdate(answer, true)
            this.llama.setRunning(false)
        })
    }

    async bridgeInbox(message: string, isRequest: boolean = true): Promise<void> {
        if (this.bridgedMsg.length > 0)
            throw new Error('Can only bridge new request when the current one is clear')
        let bridgedPrompt = await this.client.sendNotice(config.matrix_room_id, message)
        if (isRequest) {
            let bridgedPromptEvt = await this.client.getEvent(config.matrix_room_id, bridgedPrompt)
            this.bridgedMsg = await this.client.replyHtmlText(config.matrix_room_id, bridgedPromptEvt, 'Waiting for response...')
        }
    }

    async bridgeEdit(message: string, isFinal: boolean): Promise<void> {
        if (this.bridgedMsg.length === 0)
            throw new Error('There is no bridged message pending for response completion')
        await this.editMsg(this.bridgedMsg, message, !isFinal)
        if (isFinal)
            this.bridgedMsg = ''
    }

    async editMsg(eventId: string, newMsg: string, progressSuffix: boolean = false): Promise<void> {
        await this.client.sendEvent(config.matrix_room_id, 'm.room.message', {
            'm.new_content': {
                body: newMsg,
                msgtype: 'm.text',
                format: "org.matrix.custom.html",
                formatted_body: marked.parse(newMsg)+(progressSuffix?' ...':'')
            },
            body: '* '+newMsg,
            formatted_body: '* '+marked.parse(newMsg)+(progressSuffix?' ...':''),
            msgtype: 'm.text',
            format: 'org.matrix.custom.html',
            'm.relates_to': {
                rel_type: 'm.replace',
                event_id: eventId
            }
        })
    }
}