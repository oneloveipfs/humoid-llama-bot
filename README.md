# Humoid Llama Bot

Llama.cpp bot for use in the department of Humoids in OneLoveIPFS chat rooms.

## Features
* Invokes [llama.cpp](https://github.com/ggerganov/llama.cpp) daemon in chat mode
* Discord and Matrix for chat clients
* Native cross-posting across chat clients

## Dependencies required
* `nodejs` and `npm` (Latest LTS, v18 minimum supported)
* Matrix account for the bot
* Discord application for the bot

## Installation
1. Clone and compile [llama.cpp](https://github.com/ggerganov/llama.cpp).
2. Download the required models (i.e. `ggml-model-q4_0.bin`).
3. Copy the example `.env` file and configure.
```
cp .env.example .env
```
4. Install node modules.
```
npm i
```
5. Start bot
```
npm start
```

## Configuration
An example config file has been included in `.env.example` file. Copy this to `.env` file and modify. In addition, the bridge may be configured through environment variables and command line args.

Environment variables are prefixed with `HUMOID_LLAMA_` and uppercased.

|Argument|Description|Default|
|-|-|-|
|`--log_level`|Sets the log level of the bot|info|
|`--exec_path`|Path to compiled llama.cpp executable||
|`--exec_args`|Additional llama.cpp arguments||
|`--model_path`|Path to ggml model||
|`--prompt_file`|Path to text file containing prompt||
|`--ignore_prefix`|Message prefix ignored by bot|~|
|`--matrix_homeserver`|Matrix homeserver where bot lives||
|`--matrix_bot_token`|Matrix bot user access token||
|`--matrix_room_id`|Matrix room ID that bot responds to||
|`--discord_channel_id`|Discord channel ID where bot lives in||
|`--discord_bot_token`|Discord bot token||
|`--discord_loading_emoji_id`|Suffix to append for response progress on Discord||