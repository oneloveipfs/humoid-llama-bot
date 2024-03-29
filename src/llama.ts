// https://github.com/nomic-ai/gpt4all-ts/blob/main/src/gpt4all.ts

import {spawn} from 'child_process'
import config from './config.js'
import logger from './logger.js'

const ENDINGS = [
    '### Human:',
    '### Assistant:',
    '### Instruction:'
]
const STARTER = '[0m'
const TERMINATOR = '[1m[32m\n> '

export class LlamaCpp {
    private daemon: ReturnType<typeof spawn> | null = null
    private running: boolean = false

    public async start():Promise<void> {
        if (this.daemon !== null)
            throw new Error('Daemon is already running')

        let args = [
            '--model', config.model_path,
            '-f', config.prompt_file,
            '--color', '-ins', '--ignore-eos'
        ]

        for (let i in ENDINGS)
            args.push('--reverse-prompt', ENDINGS[i])

        let moarArgs = config.exec_args.split(' ')
        for (let i in moarArgs)
            args.push(moarArgs[i])

        this.daemon = spawn(config.exec_path, args, { stdio: ['pipe', 'pipe', 'ignore'] })
        await new Promise<void>((resolve) => {
            let started = (data: any) => {
                if (data.toString().includes('>')) {
                    logger.info('llama.cpp daemon started')
                    this.daemon!.stdout!.removeListener('data', started)
                    resolve()
                }
            }
            this.daemon!.stdout!.on('data', started)
        })
    }

    public stop():void {
        if (this.daemon) {
            this.daemon.kill()
            this.daemon = null
        }
    }

    public isRunning():boolean {
        return this.running
    }

    public setRunning(isRunning: boolean): void {
        this.running = isRunning
    }

    public prompt(prompt: string, stream: (data: string) => void):Promise<string> {
        if (this.daemon === null)
            throw new Error('Daemon is not running')

        this.setRunning(true)
        logger.info('New message')
        logger.debug(prompt)
        prompt = prompt.replace(/\n/g, '\\\n')
        this.daemon!.stdin!.write(prompt+'\n')
    
        return new Promise((resolve, reject) => {
            let response = ''
            let timeoutId: NodeJS.Timeout
            let hasBegunOutput = false
    
            const onStdoutData = (data: any) => {
                let text: string = data.toString()
                if (timeoutId)
                    clearTimeout(timeoutId)

                if (!hasBegunOutput && text.startsWith(STARTER)) {
                    text = text.replace(STARTER,'')
                }
                hasBegunOutput = true
                response += text
                stream(text)
                if (response.endsWith(TERMINATOR)) {
                    response = response.slice(0,response.length-TERMINATOR.length)
                    logger.trace(STARTER) // reset log formatting
                    logger.debug('End of response')
                    terminateAndResolve(response)
                } else {
                    timeoutId = setTimeout(() => {
                        logger.warn('Response timeout')
                        terminateAndResolve(response)
                    }, 60000) // Set a timeout of 60000ms to wait for more data
                }
            }
    
            const onStdoutError = (err: any) => {
                this.daemon!.stdout!.removeListener("data", onStdoutData)
                this.daemon!.stdout!.removeListener("error", onStdoutError)
                this.running = false
                reject(err)
            }
    
            const terminateAndResolve = (finalResponse: string) => {
                this.daemon!.stdout!.removeListener("data", onStdoutData)
                this.daemon!.stdout!.removeListener("error", onStdoutError)
                let endsWithEndings = false
                for (let i in ENDINGS)
                    if (finalResponse.endsWith(ENDINGS[i])) {
                        endsWithEndings = true
                        break
                    }
                if (endsWithEndings) {
                    let finalResponseSplit = finalResponse.split('###')
                    finalResponseSplit.pop()
                    finalResponse = finalResponseSplit.join('###')
                }
                logger.debug(finalResponse.trim())
                resolve(finalResponse.trim())
            }

            this.daemon!.stdout!.on("data", onStdoutData)
            this.daemon!.stdout!.on("error", onStdoutError)
        })
    }
}

export default LlamaCpp