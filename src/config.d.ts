declare namespace config {
    const log_level: 'warn' | 'info' | 'debug' | 'trace'
    const exec_path: string
    const exec_args: string
    const model_path: string
    const prompt_file: string
    const ignore_prefix: string
    const discord_bot_token: string
    const discord_channel_id: string
    const discord_loading_emoji_id: string
    const matrix_bot_token: string
    const matrix_homeserver: string
    const matrix_room_id: string
}

export = config