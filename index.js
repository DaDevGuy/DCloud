const express = require('express');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const Discord = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();
const app = express();
const upload = multer({ dest: 'uploads/' });
const discordClient = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES] });

const db = new sqlite3.Database('./files.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the database');
    db.run(`CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT,
      messageIds TEXT,
      size INTEGER
    )`);
  }
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

async function chunkAndUpload(file, filename) {
  const fileSize = fs.statSync(file).size;
  const chunkSize = 8 * 1024 * 1024; // 8MB is upload for bot
  const chunks = Math.ceil(fileSize / chunkSize);

  console.log(`File size: ${fileSize} bytes`);
  console.log(`Number of chunks: ${chunks}`);

  const readStream = fs.createReadStream(file, { highWaterMark: chunkSize });
  let currentChunk = 1;
  let messageIds = [];

  readStream.on('data', async (chunk) => {
    // Encrypt chunk
    const cipher = crypto.createCipher('aes256', ENCRYPTION_KEY);
    const encryptedChunk = Buffer.concat([cipher.update(chunk), cipher.final()]);

    // Upload chunk to Discord
    try {
      const channel = await discordClient.channels.fetch(CHANNEL_ID);
      const attachment = new Discord.MessageAttachment(encryptedChunk, `${filename}_chunk_${currentChunk}.bin`);
      const message = await channel.send({ files: [attachment] });
      messageIds.push(message.id);
      console.log(`Uploaded chunk ${currentChunk}/${chunks} to Discord: ${message.id}`);
    } catch (error) {
      console.error('Error uploading chunk to Discord:', error);
    }

    if (currentChunk === chunks) {
      // Save file metadata to database
    db.run('INSERT INTO files (filename, messageIds, size) VALUES (?, ?, ?)', [filename, messageIds.join(','), fileSize], (err) => {
        if (err) {
            console.error('Error inserting file metadata into database:', err.message);
        } else {
            console.log('File metadata inserted into database');
        }
    });
      console.log('All chunks uploaded to Discord');
    }

    currentChunk++;
  });

  readStream.on('error', (err) => {
    console.error('Error reading file:', err);
  });
}

app.get('/totalsize', (req, res) => {
    db.get('SELECT SUM(size) AS totalSize FROM files', (err, row) => {
        if (err) {
            console.error('Error retrieving total size from database:', err.message);
            return res.status(500).send('Error retrieving total size from database');
        }
        

        const totalSizeInBytes = row.totalSize || 0;
        const totalSizeReadable = convertFileSize(totalSizeInBytes);
        
        res.json({ totalSize: totalSizeReadable });
    });
});

function convertFileSize(bytes) {
    const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];

    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
}


app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file.path;
  const filename = req.file.originalname;

  chunkAndUpload(file, filename)
    .then(() => {
      res.send('File uploaded to Discord');
    })
    .catch((error) => {
      console.error('Error uploading file to Discord:', error);
      res.status(500).send('Error uploading file to Discord');
    });
});

app.get('/download/:id', async (req, res) => {
  const fileId = req.params.id;

  db.get('SELECT filename, messageIds FROM files WHERE id = ?', [fileId], async (err, row) => {
    if (err) {
      console.error('Error retrieving file metadata from database:', err.message);
      return res.status(500).send('Error retrieving file metadata from database');
    }

    if (!row) {
      return res.status(404).send('File not found');
    }

    const { filename, messageIds } = row;
    const chunks = messageIds.split(',');

    try {
      const channel = await discordClient.channels.fetch(CHANNEL_ID);
      const decryptedChunks = [];

      for (const messageId of chunks) {
        const message = await channel.messages.fetch(messageId);
        if (!message || !message.attachments.size) {
          console.error(`Attachment not found for message ID: ${messageId}`);
          return res.status(500).send('Error retrieving file from Discord');
        }
        const attachment = message.attachments.first();
        const response = await fetch(attachment.url);
        const encryptedChunk = await response.arrayBuffer();

const decipher = crypto.createDecipher('aes256', ENCRYPTION_KEY);
const encryptedChunkBuffer = Buffer.from(encryptedChunk);
const decryptedChunk = Buffer.concat([decipher.update(encryptedChunkBuffer), decipher.final()]);
decryptedChunks.push(decryptedChunk);

      }

      const decryptedFile = Buffer.concat(decryptedChunks);

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      res.send(decryptedFile);
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).send('Error downloading file');
    }
  });
});

app.get('/files', (req, res) => {
    db.all('SELECT id, filename, size FROM files', (err, rows) => {
        if (err) {
            console.error('Error retrieving files from database:', err.message);
            return res.status(500).send('Error retrieving files from database');
        }
        const filesWithReadableSize = rows.map(file => {
            return {
                id: file.id,
                filename: file.filename,
                size: convertFileSize(file.size)
            };
        });
        res.json(filesWithReadableSize);
    });
});


function convertFileSize(bytes) {
    const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];

    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

app.use(express.static('public'));

app.delete('/delete/:id', async (req, res) => {
    const fileId = req.params.id;


    db.get('SELECT messageIds FROM files WHERE id = ?', [fileId], async (err, row) => {
        if (err) {
            console.error('Error retrieving file metadata from database:', err.message);
            return res.status(500).send('Error retrieving file metadata from database');
        }

        if (!row) {
            return res.status(404).send('File not found');
        }

        const { messageIds } = row;
        const chunks = messageIds.split(',');

        try {
            const channel = await discordClient.channels.fetch(CHANNEL_ID);

            for (const messageId of chunks) {
                await channel.messages.delete(messageId); 
            }

            db.run('DELETE FROM files WHERE id = ?', [fileId], (err) => {
                if (err) {
                    console.error('Error deleting file record from database:', err.message);
                    return res.status(500).send('Error deleting file record from database');
                }
                res.status(200).json({ message: 'File deleted successfully' });
            });
        } catch (error) {
            console.error('Error deleting file:', error);
            res.status(500).send('Error deleting file');
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Dashbord online on http://localhost:${PORT}`);
});


discordClient.login(DISCORD_TOKEN);
