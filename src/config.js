import yargs from 'yargs'
import * as dotenv from 'dotenv'

dotenv.config()
const { argv } = yargs(process.argv)

let config = {
    // logging
    log_level: 'info',

    // llama.cpp
    exec_path: '',
    exec_args: '',
    model_path: '',
    prompt_file: '',

    // discord
    discord_bot_token: '',
    discord_channel_id: '',
    discord_ignore_prefix: '~',
    discord_loading_emoji_id: ''
}

// Config overwrites through CLI args or environment vars
for (let c in config)
    if (typeof config[c] === 'number')
        config[c] = parseFloat(argv[c]) || parseFloat(process.env['HUMOID_LLAMA_' + c.toUpperCase()]) || config[c]
    else
        config[c] = argv[c] || process.env['HUMOID_LLAMA_' + c.toUpperCase()] || config[c]

export default config