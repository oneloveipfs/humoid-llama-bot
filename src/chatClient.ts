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
    abstract bridgeInbox(message: string): Promise<void>
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
    bridgeSend(message: string): void {
        for (let i in this.bridgedChats)
            this.bridgedChats[i].bridgeInbox(message)
    }
    /**
     * Disseminate message updates across bridge
     * @param message updated message
     * @param isFinal whether the updated message is the final response
     */
    bridgeUpdate(message: string, isFinal: boolean): void {
        for (let i in this.bridgedChats)
            this.bridgedChats[i].bridgeEdit(message, isFinal)
    }
}