const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const https = require('https');

// Създаваме нов Discord клиент
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const token = process.env.DISCORD_BOT_TOKEN; // Тук токенът ще се чете от .env файл

// Проверка за зловреден код в Lua файл
const scanForMalware = (filePath) => {
    const luaScript = fs.readFileSync(filePath, 'utf8');

    // Търсим подозрителни команди
    const suspiciousPatterns = [
        /os\\.execute/g,        // Изпълнение на системни команди
        /io\\.popen/g,          // Достъп до командната линия
        /http\\.request/g,      // HTTP заявки
        /loadstring/g,          // Зареждане на динамичен код
        /RunString/g,           // Динамично изпълнение на код
    ];

    const results = suspiciousPatterns.map((pattern) => ({
        pattern: pattern,
        found: pattern.test(luaScript)
    }));

    return results.filter(result => result.found);
};

client.once('ready', () => {
    console.log(`Bot is online as ${client.user.tag}`);
});

// Команда за сканиране
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!scan') && message.attachments.size > 0) {
        message.attachments.forEach(attachment => {
            const filePath = './downloads/' + attachment.name;

            // Изтегляме файла
            const file = fs.createWriteStream(filePath);
            const request = https.get(attachment.url, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();

                    // Сканираме за зловреден код
                    const results = scanForMalware(filePath);

                    if (results.length > 0) {
                        message.reply('Зловреден код открит: ' + JSON.stringify(results.map(r => r.pattern.toString())));
                    } else {
                        message.reply('Файлът е чист.');
                    }

                    // Изтриваме файла след сканирането
                    fs.unlinkSync(filePath);
                });
            });
        });
    }
});

client.login(token);
