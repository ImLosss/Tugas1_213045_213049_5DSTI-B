const axios = require('axios');
const fs = require('fs');
const { API_KEY_OPEN_AI } = require('../config');

// Header yang diperlukan, termasuk kunci API
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ API_KEY_OPEN_AI }`,
};

// menambah handler yang akan menangani pemanggilan fungsi
const ChatAIHandler = async (msg, sender) => {
    const chat = await msg.getChat();

    let prompt = msg.body;
    prompt = prompt.split(' ');
    if(prompt.length >= 2) {
        prompt = prompt.slice(1, prompt.length);
        prompt = prompt.join(" ");
    } else return msg.reply("Pertanyaannya mana?").catch(() => { chat.sendMessage('Pertanyaannya mana?') })

    console.log(prompt);

    const response = await chapGPT(prompt, sender)
    msg.reply(response)
    .catch(() => {
        chat.sendMessage(response);
    })
}

const chapGPT = async (prompt, sender) => {

    const dir_history_chat = `database/data_chat/${ sender }`;

    if(prompt == "reset"){
        // menambah kode dimana apabila user mengirim pesan /tanya reset, maka akan menghapus seluruh riwayat chat user
        if (fs.existsSync(dir_history_chat)){
            fs.unlink(`./${ dir_history_chat }`, (err) => {
                if (err) {
                    console.error(err);
                } 
            });
            return 'berhasil menghapus riwayat chat';
        } else {
            return 'Gagal : Tidak menemukan riwayat chat';
        }
    } else {
        // baris kode yang akan melakukan POST ke API chatGPT
        try {
            let chatHistory = [];

            // mengambil data history chat pada database
            if(fs.existsSync(dir_history_chat)) {
                const fileData = fs.readFileSync(dir_history_chat, 'utf-8');
                chatHistory = JSON.parse(fileData);
            }

            chatHistory.push({ role: "user", content: `${ prompt }` });  // Update the chat history

            // Melakukan permintaan ke API menggunakan Axios
            const response = await axios.post("https://api.openai.com/v1/chat/completions", {
                model: 'gpt-3.5-turbo',
                messages: chatHistory
            }, { headers, timeout: 60000 })

            // mengambil respon dari chatGPT
            const answer = response.data.choices[0].message.content;

            chatHistory.push({ role: "assistant", content: answer }); // Update the chat history

            // mengambil jumlah token yang telah digunakan
            let jml_tokens = response.data.usage.total_tokens;
                
            // menambah kondisi apabila jmlah token yang digunakan melebihi 10000 pada user, maka akan mengurangi riwayat chat
            if (jml_tokens > 10000) chatHistory.splice(1, 6);

            // mengupdate/menyimpan riwayat chat user
            fs.writeFileSync(dir_history_chat, JSON.stringify(chatHistory));

            // mengembalikan var answer yang berisi respon/answer chatGPT
            return answer;
        } catch (error) {
            const info = `terjadi kesalahan : ${ error.message }, coba kembali...`;
            console.log(info);
            return info;
        }
    }
};

// export module secara global
module.exports = {
    ChatAIHandler
}