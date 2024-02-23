# Discord Cloud Storage System

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
