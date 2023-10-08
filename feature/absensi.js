const fs = require('fs')

const file_grup_dir = `database/data_absen/data_grup`;

async function absensiHandler(msg, sender, isAdmin) {
    try {
        const prefix = ['!', '/', '.'];
        const file_absen_dir = `database/data_absen/${ msg.from }_absen`;

        const chat = await msg.getChat();

        let cmd = msg.body;
        cmd = cmd.split(' ');

        let dataGrup = fs.readFileSync(file_grup_dir, 'utf-8');
        dataGrup = JSON.parse(dataGrup);

        let data = { group_id: msg.from, sender: sender, cmd: cmd };

        if (prefix.some(pre => cmd[0].startsWith(`${ pre }absen`))) {
            if(!isAdmin) return msg.reply('Command khusus Admin');
            absen(data, dataGrup, file_absen_dir, chat)
            .then((result) => {
                msg.reply(result).catch(() => { chat.sendMessage(result) });
            });
        } else if (prefix.some(pre => cmd[0] == `${ pre }close`)) {
            if(!isAdmin) return msg.reply('Command khusus Admin');
            closeAbsen(data, dataGrup, file_absen_dir)
            .then((result) => {
                msg.reply(result).catch(() => { chat.sendMessage(result) });
            });
        } else if (prefix.some(pre => cmd[0].startsWith(`${ pre }hadirc`))) {
            hadirc(data, dataGrup, file_absen_dir)
            .then((result) => {
                msg.reply(result).catch(() => { chat.sendMessage(result) });
            });
        } else if (prefix.some(pre => cmd[0].startsWith(`${ pre }hadir`))) {
            hadir(data, dataGrup, file_absen_dir)
            .then((result) => {
                msg.reply(result).catch(() => { chat.sendMessage(result) });
            });
        }
        
    } catch(e) {
        return msg.reply('Error');
    }
}

async function absen(data, dataGrup, absen_dir, chat) {
    try {
        // cek apabila terdapat absen yg aktif maka akan mengembalikan pesan dibawah
        let indexGrup = dataGrup.findIndex(item => item.group_id == data.group_id);
        if (indexGrup !== -1) return 'terdapat absen yang masih aktif, kirim */close* untuk menutup absen'

        // mengambil batas waktu absen dari chat
        let timeout = data.cmd[1];
        if(!isNaN(timeout) && timeout > 720) return 'Batas waktu absen tidak boleh lebih dari 12 jam...';
        else if(!isNaN(timeout) && timeout > 0) timeout = Math.floor(timeout);
        else timeout = 'None';

        // menambah data kedalam array dataGroup
        let group = { group_name: chat.name, group_id: data.group_id, absen_start: getDate(), timeout: timeout,  }
        dataGrup.push(group);

        // menyimpan data absen ke database
        let data_absen = [];
        fs.writeFileSync(absen_dir, JSON.stringify(data_absen));
        fs.writeFileSync(file_grup_dir, JSON.stringify(dataGrup));

        if(timeout != 'None') {
            chat.sendMessage(`[⏳] Membuat absen dengan batas waktu ${ time_konversi(group.timeout) }...`);

            // mengatur interval yang akan mengurangi timeout tiap menit
            let sess = group.absen_start;
            const interval = setInterval(() => {
                let dataGrup = fs.readFileSync(file_grup_dir, 'utf-8');
                dataGrup = JSON.parse(dataGrup); 
                let indexGrup = dataGrup.findIndex(item => item.group_id == data.group_id && item.absen_start.time == sess.time);

                if(indexGrup === -1) return clearInterval(interval);
                else if (dataGrup[indexGrup].timeout > 1) dataGrup[indexGrup].timeout -= 1;
                else {
                    clearInterval(interval);
                    dataGrup.splice(indexGrup, 1);
                    fs.unlinkSync(absen_dir)
                    chat.sendMessage('Batas waktu absen telah habis..');
                }
                console.log('jalan')
                fs.writeFileSync(file_grup_dir, JSON.stringify(dataGrup));
            }, 60000);
        }

        let reply = `*Absensi ${ group.group_name } ${ group.absen_start.date } :*\n1. \n2. \n3.\n\nUntuk memulai absen kirim pesan */hadir [nama]*\nAbsen ini dapat ditutup dengan */close*\nEdit : */hadirc [nama]*\nSisa waktu : *${ time_konversi(group.timeout) }*`
        return reply;
    } catch (e) {
        console.log(e);
        return 'Error';
    }

}

async function closeAbsen(data, dataGrup, absen_dir) {
    // cek apakah terdapat absen yang masih aktif
    let indexGrup = dataGrup.findIndex(item => item.group_id == data.group_id);
    if (indexGrup === -1) return 'Belum memulai absen, kirim */absen [time]* untuk memulai absensi';

    dataGrup.splice(indexGrup, 1);
    fs.writeFileSync(file_grup_dir, JSON.stringify(dataGrup));
    try {
        fs.unlinkSync(absen_dir)
    } catch(e) {
        console.log('Error: ' + e);
    }

    return 'Absen ditutup'
}

async function hadir(data, dataGrup, absen_dir) {
    // cek apakah terdapat absen yang masih aktif
    let indexGrup = dataGrup.findIndex(item => item.group_id == data.group_id);
    if (indexGrup === -1) return 'Belum ada absen yang dibuat, kirim */absen [time]* untuk memulai absensi';

    let dataAbsen = fs.readFileSync(absen_dir, 'utf-8');
    dataAbsen = JSON.parse(dataAbsen);

    // cek apakah user telah absen sebelumnya
    let indexMhs = dataAbsen.findIndex(item => item.id_pengirim == data.sender);
    if(indexMhs !== -1) return 'Absen hanya bisa 1x\nEdit: */hadirc [name]*';

    if (data.cmd.length < 2) return 'Format anda salah, kirim kembali dengan format */hadir [nama]*';

    let name = data.cmd;
    name = name.slice(1,name.length);
    name = name.join(" ");
    // menghilangkan karakter baris baru pada inputan 
    name = name.replace(/\n/g, ' ');

    dataAbsen.push({ name: name, id_pengirim: data.sender });

    fs.writeFileSync(absen_dir, JSON.stringify(dataAbsen));

    let reply = `*Absensi ${ dataGrup[indexGrup].group_name } ${ dataGrup[indexGrup].absen_start.date }:*\n`;
    let no = 0;
    for(let item of dataAbsen) {
        reply += `${ no += 1 }. ${ item.name }\n`
    }

    reply += `\nUntuk memulai absen kirim pesan */hadir [nama]*\nAbsen ini dapat ditutup dengan */close*\nEdit : */hadirc [nama]*\nSisa waktu : *${ time_konversi(dataGrup[indexGrup].timeout) }*`;
    return reply;
}

async function hadirc(data, dataGrup, absen_dir) {
    // cek apakah terdapat absen yang masih aktif
    let indexGrup = dataGrup.findIndex(item => item.group_id == data.group_id);
    if (indexGrup === -1) return 'Belum ada absen yang dibuat, kirim */absen [time]* untuk memulai absensi';
    
    let dataAbsen = fs.readFileSync(absen_dir, 'utf-8');
    dataAbsen = JSON.parse(dataAbsen);

    // cek apakah user telah absen sebelumnya
    let indexMhs = dataAbsen.findIndex(item => item.id_pengirim == data.sender);
    if(indexMhs === -1) return 'Anda belum absen\nAbsen: */hadir [name]*';

    let name = data.cmd;
    name = name.slice(1,name.length);
    name = name.join(" ");
    // menghilangkan karakter baris baru pada inputan 
    name = name.replace(/\n/g, ' ');

    dataAbsen[indexMhs].name = name;

    fs.writeFileSync(absen_dir, JSON.stringify(dataAbsen));

    let reply = `*Absensi ${ dataGrup[indexGrup].group_name } ${ dataGrup[indexGrup].absen_start.date }:*\n`;
    let no = 0;
    for(let item of dataAbsen) {
        reply += `${ no += 1 }. ${ item.name }\n`
    }

    reply += `\nUntuk memulai absen kirim pesan */hadir [nama]*\nAbsen ini dapat ditutup dengan */close*\nEdit : */hadirc [nama]*\nSisa waktu : *${ time_konversi(dataGrup[indexGrup].timeout) }*`;
    return reply;
}

function getDate() {
    // Buat objek Date
    const date = new Date();

    // Atur zona waktu ke WITA (GMT+8)
    date.setUTCHours(date.getUTCHours());

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
  	const hours = date.getHours();
  	const minutes = date.getMinutes();
	const seconds = date.getSeconds();
  	const formattedDate = `${day}/${month}/${year}`;
	const formattedTime = `${hours}:${minutes}:${seconds}`;

    return { date:`${ formattedDate }`, time: ` ${ formattedTime }` };
}

function time_konversi(time) {
    if(isNaN(time)) return 'None';
    let time_konversi = "";
    time = parseInt(time);
    let index;

    let jam = Math.floor(time / 60);
    let menit = time % 60;

    if (jam > 0) time_konversi += jam + " jam";
    if (menit > 0) time_konversi += menit + " menit";
    if(jam > 0 && menit > 0) time_konversi = `${ jam } jam ${ menit } menit`; 

    return time_konversi
}

module.exports = {
    absensiHandler
}