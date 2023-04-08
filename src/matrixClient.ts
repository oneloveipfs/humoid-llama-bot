import config from './config.js'
import logger from './logger.js'
import ChatHumoid from './chatClient.js'
import type LlamaCpp from './llama.js'
import { MatrixClient, SimpleFsStorageProvider } from 'matrix-bot-sdk'
import { marked } from 'marked'

export default class MatrixHumoid extends ChatHumoid {
    private storage: SimpleFsStorageProvider
    private client: MatrixClient

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
            if (event.content.body.startsWith('~')) return

            if (this.llama.isRunning()) {
                await this.client.replyNotice(roomId,event,'Another request is already running, please wait until it completes and try again later.')
                return
            }

            let replyId = await this.client.replyHtmlText(roomId,event,'Waiting for response...')
            let responseProgress = ''
            let responseLastLength = 0
            let stream = setInterval(async ():Promise<void> => {
                if (responseProgress.length > responseLastLength) {
                    responseLastLength = responseProgress.length
                    await this.client.sendEvent(roomId, 'm.room.message', {
                        'm.new_content': {
                            body: responseProgress+' ...',
                            msgtype: 'm.text',
                            format: "org.matrix.custom.html",
                            formatted_body: marked.parse(responseProgress)+' ...'
                        },
                        body: '* '+responseProgress+' ...',
                        formatted_body: '* '+marked.parse(responseProgress)+' ...',
                        msgtype: 'm.text',
                        format: 'org.matrix.custom.html',
                        'm.relates_to': {
                            rel_type: 'm.replace',
                            event_id: replyId
                        }
                    })
                }
            },5000)
            let answer = await this.llama.prompt(event.content.body, (answerStream) => responseProgress += answerStream)
            clearInterval(stream)
            await this.client.sendEvent(roomId, 'm.room.message', {
                'm.new_content': {
                    body: answer,
                    msgtype: 'm.text',
                    format: "org.matrix.custom.html",
                    formatted_body: marked.parse(answer)
                },
                body: '* '+answer,
                formatted_body: '* '+marked.parse(answer),
                msgtype: 'm.text',
                format: 'org.matrix.custom.html',
                'm.relates_to': {
                    rel_type: 'm.replace',
                    event_id: replyId
                }
            })
        })
    }
}