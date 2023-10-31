const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { ChatAIHandler } = require('./feature/chat');
const { absensiHandler } = require('./feature/absensi');

// Inisialisasi objek client menggunakan Local Authentication
const client = new Client({
    authStrategy: new LocalAuth(),
});

// Event listener untuk menanggapi QR code yang dibutuhkan untuk login
client.on('qr', qr => {
    // Menghasilkan dan menampilkan QR code untuk proses otentikasi
    qrcode.generate(qr, { small: true });
});

// Event listener yang akan diaktifkan ketika client siap digunakan
client.on('ready', () => {
    // Menampilkan pesan di konsol ketika client siap
    console.log('Client is ready!');
});

// menambah Listener yang memantau pesan yang diterima oleh client
client.on('message', async msg => {
    try {
        const chat = await msg.getChat();
        const prefix = ['!', '/', '.'];
        const text = msg.body.toLowerCase() || '';

        const authorId = msg.author;
        let isAdmin = false;
        let sender = msg.from;

        // cek apakah pengirim pesan merupakan admin atau bukan
        if(chat.isGroup) {
            sender = msg.author;
            for(let participant of chat.participants) {
                if(participant.id._serialized === authorId && participant.isAdmin) {
                    isAdmin = true;
                    break;
                }
            }
        }

        if (prefix.some(pre => text.startsWith(`${ pre }tanya`))) await ChatAIHandler(msg, sender);
        else if(prefix.some(pre => text.startsWith(`${ pre }absen`) || text.startsWith(`${ pre }hadir`) || text.startsWith(`${ pre }hadirc`)  || text == `${ pre }close`) && chat.isGroup) await absensiHandler(msg, sender, isAdmin)
    } catch(e) {
        console.log(e);
    }
});

client.initialize();