import type LlamaCpp from './llama.js'

export default abstract class ChatHumoid {
    llama: LlamaCpp
    bridgedChats: ChatHumoid[] = []

    constructor(llama: LlamaCpp) {
        this.llama = llama
    }

    /**
     * Login into the chat app as humoid
     */
    abstract login(): Promise<void>

    // Bridge
    /**
     * Handle incoming requests from bridge
     * @param message the incoming prompt request
     */
    abstract bridgeInbox(message: string, isRequest: boolean): Promise<void>
    /**
     * Handle incoming message updates from bridge
     * @param message updated message
     * @param isFinal whether the incoming updated message is the final response
     */
    abstract bridgeEdit(message: string, isFinal: boolean): Promise<void>
    /**
     * Register external chats into bridge
     * @param humoid ChatHumoid
     */
    registerBridge(humoid: ChatHumoid): void {
        this.bridgedChats.push(humoid)
    }
    /**
     * Disseminate incoming requests across bridge
     * @param message the incoming prompt request
     */
    async bridgeSend(message: string, isRequest: boolean): Promise<void> {
        for (let i in this.bridgedChats)
            await this.bridgedChats[i].bridgeInbox(message, isRequest)
    }
    /**
     * Disseminate message updates across bridge
     * @param message updated message
     * @param isFinal whether the updated message is the final response
     */
    async bridgeUpdate(message: string, isFinal: boolean): Promise<void> {
        for (let i in this.bridgedChats)
            await this.bridgedChats[i].bridgeEdit(message, isFinal)
    }
}