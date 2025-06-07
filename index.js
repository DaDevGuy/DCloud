const express = require('express');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const Discord = require('discord.js');
const { GatewayIntentBits, MessageAttachment } = Discord;
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dotenv = require('dotenv');
const { exec } = require('child_process');

['uploads', 'data', 'config'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
});

const configDir = path.resolve(__dirname, 'config');
const configPath = path.resolve(configDir, 'config.json');
let isConfigValid = false;

function validateConfig() {
  try {
    if (!fs.existsSync(configPath)) {
      console.log('No config file found');
      return false;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const requiredFields = ['DISCORD_TOKEN', 'CHANNEL_ID', 'ENCRYPTION_KEY', 'INIT_VECTOR'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      console.log(`Missing required fields in config: ${missingFields.join(', ')}`);
      return false;
    }
    
    try {
      const keyBuffer = Buffer.from(config.ENCRYPTION_KEY, 'hex');
      const ivBuffer = Buffer.from(config.INIT_VECTOR, 'hex');
      
      if (keyBuffer.length !== 32) {
        console.log(`Invalid ENCRYPTION_KEY length: ${keyBuffer.length} bytes (expected 32)`);
        return false;
      }
      
      if (ivBuffer.length !== 16) {
        console.log(`Invalid INIT_VECTOR length: ${ivBuffer.length} bytes (expected 16)`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.log('Error validating encryption keys:', error.message);
      return false;
    }
  } catch (error) {
    console.log('Error checking configuration:', error);
    return false;
  }
}

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const upload = multer({ dest: 'uploads/' });

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.css') || path.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.get('/api/system-status', (req, res) => {
  res.json({
    configExists: fs.existsSync(configPath),
    configValid: validateConfig(),
    setupMode: !isConfigValid
  });
});

function restartApp() {
  console.log('Restarting application to apply new configuration...');
  
  if (process.env.NODE_ENV === 'production') {
    process.exit(0);
  } else {
    exec('node index.js', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error restarting: ${error}`);
        return;
      }
      process.exit(0);
    });
  }
}

isConfigValid = validateConfig();
console.log(`Configuration valid: ${isConfigValid}`);

if (!isConfigValid) {
  console.log('Starting in SETUP mode');
  
  const setupPaths = ['/', '/index.html', '/setup', '/app'];
  setupPaths.forEach(route => {
    app.get(route, (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'setup.html'));
    });
  });
  
  app.post('/api/save-config', (req, res) => {
    const { token, channelId } = req.body;
    
    if (!token || !channelId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token and channel ID are required' 
      });
    }
    
    try {
      const encryptionKey = crypto.randomBytes(32).toString('hex');
      const initVector = crypto.randomBytes(16).toString('hex');
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const configData = {
        DISCORD_TOKEN: token,
        CHANNEL_ID: channelId,
        ENCRYPTION_KEY: encryptionKey,
        INIT_VECTOR: initVector,
        PORT: 3000
      };
      
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
      console.log('Configuration saved to config.json file');
      
      const envContent = 
`DISCORD_TOKEN=${token}
CHANNEL_ID=${channelId}
ENCRYPTION_KEY=${encryptionKey}
INIT_VECTOR=${initVector}
PORT=3000`;
    
      try {
        fs.writeFileSync(path.resolve(__dirname, '.env'), envContent);
      } catch (envError) {
        console.log('Note: Could not write .env file, but config.json is used instead:', envError.message);
      }
    
      res.json({ 
        success: true, 
        message: 'Configuration saved successfully',
        restartRequired: true
      });
      
      setTimeout(restartApp, 2000);
      
    } catch (error) {
      console.error('Error saving configuration:', error);
      res.status(500).json({ 
        success: false, 
        message: `Failed to save configuration: ${error.message}` 
      });
    }
  });
  
  const setupPort = process.env.PORT || 3000;
  app.listen(setupPort, () => {
    console.log(`Setup wizard available at http://localhost:${setupPort}`);
  });
} else {
  console.log('Starting in NORMAL mode');
  
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath));
  } catch (error) {
    console.error('Error loading configuration:', error);
    process.exit(1);
  }
  
  const db = new sqlite3.Database('./data/files.db', (err) => {
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
  
  const discordClient = new Discord.Client({ 
    intents: [
      GatewayIntentBits.Guilds, 
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ] 
  });
  
  const ENCRYPTION_KEY = Buffer.from(config.ENCRYPTION_KEY, 'hex');
  const IV = Buffer.from(config.INIT_VECTOR, 'hex');
  const DISCORD_TOKEN = config.DISCORD_TOKEN;
  const CHANNEL_ID = config.CHANNEL_ID;
  
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

  async function chunkAndUpload(file, filename) {
    const fileSize = fs.statSync(file).size;
    const chunkSize = 8 * 1024 * 1024; 
    const chunks = Math.ceil(fileSize / chunkSize);

    console.log(`File size: ${fileSize} bytes`);
    console.log(`Number of chunks: ${chunks}`);

    const readStream = fs.createReadStream(file, { highWaterMark: chunkSize });
    let currentChunk = 1;
    let messageIds = [];

    for await (const chunk of readStream) {
      const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
      const encryptedChunk = Buffer.concat([cipher.update(chunk), cipher.final()]);

      try {
        const channel = await discordClient.channels.fetch(CHANNEL_ID);
        let message;
        if (typeof MessageAttachment === 'function') {
          const attachment = new MessageAttachment(encryptedChunk, `${filename}_chunk_${currentChunk}.bin`);
          message = await channel.send({ files: [attachment] });
        } else {
          message = await channel.send({ 
            files: [{
              attachment: encryptedChunk,
              name: `${filename}_chunk_${currentChunk}.bin`
            }]
          });
        }
        messageIds.push(message.id);
        console.log(`Uploaded chunk ${currentChunk}/${chunks} to Discord: ${message.id}`);
      } catch (error) {
        console.error(`Error uploading chunk ${currentChunk} to Discord:`, error);
        throw error;
      }

      currentChunk++;
    }

    return new Promise((resolve, reject) => {
      db.run('INSERT INTO files (filename, messageIds, size) VALUES (?, ?, ?)', 
        [filename, messageIds.join(','), fileSize], 
        function(err) {
          if (err) {
            console.error('Error inserting file metadata into database:', err.message);
            reject(err);
          } else {
            console.log('File metadata inserted into database');
            resolve({ id: this.lastID, messageIds });
          }
        }
      );
    });
  }

  app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }
    
    const file = req.file.path;
    const filename = req.file.originalname;

    try {
      await chunkAndUpload(file, filename);
      res.send('File uploaded to Discord');
    } catch (error) {
      console.error('Error uploading file to Discord:', error);
      res.status(500).send('Error uploading file to Discord');
    } finally {
      fs.unlink(file, (err) => {
        if (err) console.error(`Error deleting temporary file ${file}:`, err);
      });
    }
  });

  app.get('/totalsize', (req, res) => {
    db.get('SELECT SUM(size) AS totalSize FROM files', (err, row) => {
      if (err) {
        console.error('Error retrieving total size from database:', err.message);
        return res.status(500).send('Error retrieving total size from database');
      }

      const totalSizeReadable = convertFileSize(row?.totalSize || 0);
      res.json({ totalSize: totalSizeReadable });
    });
  });

  app.get('/files', (req, res) => {
    db.all('SELECT id, filename, size FROM files ORDER BY id DESC', (err, rows) => {
      if (err) {
        console.error('Error retrieving files from database:', err.message);
        return res.status(500).send('Error retrieving files');
      }
      
      const files = rows.map(file => ({
        ...file,
        formattedSize: convertFileSize(file.size)
      }));
      
      res.json(files);
    });
  });

  app.get('/download/:id', async (req, res) => {
    const fileId = req.params.id;
    
    db.get('SELECT filename, messageIds, size FROM files WHERE id = ?', [fileId], async (err, file) => {
      if (err || !file) {
        console.error('Error retrieving file from database:', err?.message || 'File not found');
        return res.status(404).send('File not found');
      }
      
      try {
        res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
        res.setHeader('Content-Length', file.size);
        
        const messageIds = file.messageIds.split(',');
        
        const writeStream = res;
        
        for (let i = 0; i < messageIds.length; i++) {
          const messageId = messageIds[i];
          const channel = await discordClient.channels.fetch(CHANNEL_ID);
          const message = await channel.messages.fetch(messageId);
          
          if (message.attachments.size === 0) {
            throw new Error(`No attachment found for message ${messageId}`);
          }
          
          const attachment = message.attachments.first();
          const response = await fetch(attachment.url);
          const buffer = await response.arrayBuffer();
          
          const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
          const decryptedChunk = Buffer.concat([
            decipher.update(Buffer.from(buffer)), 
            decipher.final()
          ]);
          
          writeStream.write(decryptedChunk);
          
          console.log(`Downloaded and decrypted chunk ${i + 1}/${messageIds.length}`);
        }
        
        writeStream.end();
      } catch (error) {
        console.error('Error downloading file:', error);
        if (!res.headersSent) {
          res.status(500).send('Error downloading file');
        } else {
          res.end();
        }
      }
    });
  });

  app.delete('/file/:id', async (req, res) => {
    const fileId = req.params.id;
    
    db.get('SELECT messageIds FROM files WHERE id = ?', [fileId], async (err, file) => {
      if (err || !file) {
        console.error('Error retrieving file from database:', err?.message || 'File not found');
        return res.status(404).send('File not found');
      }
      
      try {
        const messageIds = file.messageIds.split(',');
        const channel = await discordClient.channels.fetch(CHANNEL_ID);
        
        for (const messageId of messageIds) {
          try {
            const message = await channel.messages.fetch(messageId);
            await message.delete();
            console.log(`Deleted message ${messageId}`);
          } catch (msgErr) {
            console.error(`Error deleting message ${messageId}:`, msgErr);
          }
        }
        
        db.run('DELETE FROM files WHERE id = ?', [fileId], function(dbErr) {
          if (dbErr) {
            console.error('Error deleting file from database:', dbErr.message);
            return res.status(500).send('Error deleting file from database');
          }
          
          console.log(`File with ID ${fileId} deleted successfully`);
          res.json({ success: true, message: 'File deleted successfully' });
        });
      } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).send('Error deleting file');
      }
    });
  });

  discordClient.login(DISCORD_TOKEN)
    .then(() => {
      console.log('Connected to Discord');
      
      const port = process.env.PORT || 3000;
      app.listen(port, () => {
        console.log(`Dashboard online at http://localhost:${port}`);
        console.log(`Using encryption with key length: ${ENCRYPTION_KEY.length} bytes`);
        console.log(`Using IV with length: ${IV.length} bytes`);
      });
    })
    .catch((err) => {
      console.error('Error logging into Discord:', err);
      process.exit(1);
    });
}
