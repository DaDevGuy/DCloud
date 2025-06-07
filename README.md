# DCloud

This is a Discord-based cloud storage system designed for educational purposes, implemented in Node.js. It allows users to upload files, which are then broken into 8MB chunks and encrypted before being uploaded to a Discord server. Upon download, the files are decrypted and reassembled.

## Features

- Upload files to Discord server
- File encryption for enhanced security
- Chunking mechanism for efficient storage and retrieval

## Usage

1. Clone the repository:

```
git clone https://github.com/DaDevGuy/DCloud.git
```

2. Install dependencies:

```
npm install
```

3. Configure your Discord bot token and server details in the `config.json` file.

4. Run the application:

```
node index.js
```

5. Follow the on-screen instructions to upload/download files.

## License

This project is licensed under the [MIT License](LICENSE), which allows for both personal and commercial use, modification, distribution, and private use, with no liability and warranty.

## Disclaimer

This project is for educational purposes only. Usage of this software for any illegal activities is strictly prohibited. The developers of this software are not responsible for any misuse of the application.

# DCloud - Discord Cloud Storage

DCloud is a secure file storage solution that uses Discord as a backend storage provider. Files are encrypted and chunked before being uploaded to Discord, providing a free and secure cloud storage solution.

## Features

- Secure file encryption using AES-256-CBC
- File chunking for large file support
- Modern web UI with dark mode support
- File upload, download, and deletion capabilities

## Setup

### Prerequisites

- Node.js 16+
- Discord bot token with appropriate permissions
- Discord channel ID for storing files

### Environment Variables

Create a `.env` file in the root directory with:

```
DISCORD_TOKEN=your_discord_bot_token
CHANNEL_ID=your_discord_channel_id
ENCRYPTION_KEY=your_hex_formatted_encryption_key
INIT_VECTOR=your_hex_formatted_init_vector
PORT=3000
```

Note: 
- ENCRYPTION_KEY should be a 64-character hex string (32 bytes)
- INIT_VECTOR should be a 32-character hex string (16 bytes)

### Standard Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the application:
   ```
   node index.js
   ```

## Docker Deployment

### Using Docker Compose (Recommended)

1. Make sure Docker and Docker Compose are installed on your system
2. Set up your `.env` file as described above
3. Run:
   ```
   docker-compose up -d
   ```

### Using Docker Directly

1. Build the Docker image:
   ```
   docker build -t dcloud .
   ```

2. Run the container:
   ```
   docker run -d -p 3000:3000 --env-file .env -v $(pwd)/files.db:/app/files.db -v $(pwd)/uploads:/app/uploads --name dcloud dcloud
   ```

## Accessing the Application

Once running, access the application at:
```
http://localhost:3000
```
