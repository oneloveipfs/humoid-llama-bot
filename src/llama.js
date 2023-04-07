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
    constructor() {
        this.daemon = null
    }

    async start() {
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
        await new Promise((resolve) => {
            let started = (data) => {
                if (data.toString().includes('>')) {
                    logger.info('llama.cpp daemon started')
                    this.daemon.stdout.removeListener('data', started)
                    resolve(true)
                }
            }
            this.daemon.stdout.on('data', started)
        })
    }

    stop() {
        if (this.daemon) {
            this.daemon.kill()
            this.daemon = null
        }
    }

    prompt(prompt = '', stream = () => {}) {
        if (this.daemon === null)
            throw new Error('Daemon is not running')

        logger.info('[New message] '+prompt)
        prompt = prompt.replace(/\n/g, '\\\n')
        this.daemon.stdin.write(prompt+'\n')
    
        return new Promise((resolve, reject) => {
            let response = ''
            let timeoutId
            let hasBegunOutput = false
            let eor = false
    
            const onStdoutData = (data) => {
                let text = data.toString()
                if (timeoutId)
                    clearTimeout(timeoutId)

                if (!hasBegunOutput && text.startsWith(STARTER)) {
                    text = text.replace(STARTER,'')
                } else if (!eor && text.endsWith(TERMINATOR)) {
                    text = text.slice(0,text.length-TERMINATOR.length)
                    eor = true
                }
                hasBegunOutput = true
                response += text
                stream(text)

                if (eor) {
                    logger.debug('End of response')
                    terminateAndResolve(response) // Remove the trailing "\f" delimiter
                } else {
                    timeoutId = setTimeout(() => {
                        logger.warn('Response timeout')
                        terminateAndResolve(response)
                    }, 60000) // Set a timeout of 60000ms to wait for more data
                }
            }
    
            const onStdoutError = (err) => {
                this.daemon.stdout.removeListener("data", onStdoutData)
                this.daemon.stdout.removeListener("error", onStdoutError)
                reject(err)
            }
    
            const terminateAndResolve = (finalResponse) => {
                this.daemon.stdout.removeListener("data", onStdoutData)
                this.daemon.stdout.removeListener("error", onStdoutError)
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
                resolve(finalResponse.trim())
            }
    
            this.daemon.stdout.on("data", onStdoutData)
            this.daemon.stdout.on("error", onStdoutError)
        })
    }
}

export default LlamaCpp