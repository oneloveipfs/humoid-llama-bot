import type LlamaCpp from './llama.js'

export default abstract class ChatHumoid {
    llama: LlamaCpp

    constructor(llama: LlamaCpp) {
        this.llama = llama
    }
}