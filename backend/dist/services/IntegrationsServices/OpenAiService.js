"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleOpenAi = void 0;
const wbotMessageListener_1 = require("../WbotServices/wbotMessageListener");
const fs_2 = __importDefault(require("fs"));
const path_2 = __importDefault(require("path"));
const openai_1 = __importDefault(require("openai"));
const Message_1 = __importDefault(require("../../models/Message"));
const sessionsOpenAi = [];
const deleteFileSync = (path) => {
    try {
        fs_2.default.unlinkSync(path);
    }
    catch (error) {
        console.error("Erro ao deletar o arquivo:", error);
    }
};
const sanitizeName = (name) => {
    let sanitized = name.split(" ")[0];
    sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, "");
    return sanitized.substring(0, 60);
};
const handleOpenAi = async (openAiSettings, msg, wbot, ticket, contact, mediaSent, ticketTraking) => {
    // REGRA PARA DESABILITAR O BOT PARA ALGUM CONTATO
    if (contact.disableBot) {
        return;
    }
    const bodyMessage = (0, wbotMessageListener_1.getBodyMessage)(msg);
    if (!bodyMessage)
        return;
    // console.log("GETTING WHATSAPP HANDLE OPENAI", ticket.whatsappId, ticket.id)
    if (!openAiSettings)
        return;
    if (msg.messageStubType)
        return;
    const publicFolder = path_2.default.resolve(__dirname, "..", "..", "..", "public", `company${ticket.companyId}`);
    let openai;
    const openAiIndex = sessionsOpenAi.findIndex(s => s.id === ticket.id);
    if (openAiIndex === -1) {
        console.log("OpenAiService", openAiSettings.apiKey);
        // const configuration = new Configuration({
        //   apiKey: prompt.apiKey
        // });
        openai = new openai_1.default({
            apiKey: "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"
        });
        openai.id = ticket.id;
        sessionsOpenAi.push(openai);
    }
    else {
        openai = sessionsOpenAi[openAiIndex];
    }
    const messages = await Message_1.default.findAll({
        where: { ticketId: ticket.id },
        order: [["createdAt", "ASC"]],
        limit: openAiSettings.maxMessages
    });
    const promptSystem = `Nas respostas utilize o nome ${sanitizeName(contact.name || "Amigo(a)")} para identificar o cliente.\nSua resposta deve usar no máximo ${openAiSettings.maxTokens} tokens e cuide para não truncar o final.\nSempre que possível, mencione o nome dele para ser mais personalizado o atendimento e mais educado. Quando a resposta requer uma transferência para o setor de atendimento, comece sua resposta com 'Ação: Transferir para o setor de atendimento'.\n
                ${openAiSettings.prompt}\n`;
    let messagesOpenAi = [];
    if (msg.message?.conversation || msg.message?.extendedTextMessage?.text) {
        console.log(135, "OpenAiService");
        messagesOpenAi = [];
        messagesOpenAi.push({ role: "system", content: promptSystem });
        for (let i = 0; i < Math.min(openAiSettings.maxMessages, messages.length); i++) {
            const message = messages[i];
            if (message.mediaType === "conversation" ||
                message.mediaType === "extendedTextMessage") {
                if (message.fromMe) {
                    messagesOpenAi.push({ role: "assistant", content: message.body });
                }
                else {
                    messagesOpenAi.push({ role: "user", content: message.body });
                }
            }
        }
        messagesOpenAi.push({ role: "user", content: bodyMessage });
        console.log(156, "OpenAiService");
        const chat = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-1106",
            messages: messagesOpenAi,
            max_tokens: openAiSettings.maxTokens,
            temperature: openAiSettings.temperature
        });
        let response = chat.choices[0].message?.content;
        if (response?.includes("Ação: Transferir para o setor de atendimento")) {
            console.log(166, "OpenAiService");
            await (0, wbotMessageListener_1.transferQueue)(openAiSettings.queueId, ticket, contact);
            response = response
                .replace("Ação: Transferir para o setor de atendimento", "")
                .trim();
        }
        if (openAiSettings.voice === "texto") {
            console.log(173, "OpenAiService");
            const sentMessage = await wbot.sendMessage(msg.key.remoteJid, {
                text: `\u200e ${response}`
            });
            await (0, wbotMessageListener_1.verifyMessage)(sentMessage, ticket, contact);
        }
        else {
            console.log(179, "OpenAiService");
            const fileNameWithOutExtension = `${ticket.id}_${Date.now()}`;
            (0, wbotMessageListener_1.convertTextToSpeechAndSaveToFile)((0, wbotMessageListener_1.keepOnlySpecifiedChars)(response), `${publicFolder}/${fileNameWithOutExtension}`, openAiSettings.voiceKey, openAiSettings.voiceRegion, openAiSettings.voice, "mp3").then(async () => {
                try {
                    console.log(194, "OpenAiService");
                    const sendMessage = await wbot.sendMessage(msg.key.remoteJid, {
                        audio: { url: `${publicFolder}/${fileNameWithOutExtension}.mp3` },
                        mimetype: "audio/mpeg",
                        ptt: true
                    });
                    await (0, wbotMessageListener_1.verifyMediaMessage)(sendMessage, ticket, contact, ticketTraking, false, false, wbot);
                    deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.mp3`);
                    deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.wav`);
                }
                catch (error) {
                    console.log(`Erro para responder com audio: ${error}`);
                }
            });
        }
    }
    else if (msg.message?.audioMessage) {
        console.log(201, "OpenAiService");
        const mediaUrl = mediaSent.mediaUrl.split("/").pop();
        const file = fs_2.default.createReadStream(`${publicFolder}/${mediaUrl}`);
        const transcription = await openai.audio.transcriptions.create({
            model: "whisper-1",
            file: file
        });
        messagesOpenAi = [];
        messagesOpenAi.push({ role: "system", content: promptSystem });
        for (let i = 0; i < Math.min(openAiSettings.maxMessages, messages.length); i++) {
            const message = messages[i];
            if (message.mediaType === "conversation" ||
                message.mediaType === "extendedTextMessage") {
                console.log(238, "OpenAiService");
                if (message.fromMe) {
                    messagesOpenAi.push({ role: "assistant", content: message.body });
                }
                else {
                    messagesOpenAi.push({ role: "user", content: message.body });
                }
            }
        }
        messagesOpenAi.push({ role: "user", content: transcription.text });
        const chat = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-1106",
            messages: messagesOpenAi,
            max_tokens: openAiSettings.maxTokens,
            temperature: openAiSettings.temperature
        });
        let response = chat.choices[0].message?.content;
        if (response?.includes("Ação: Transferir para o setor de atendimento")) {
            await (0, wbotMessageListener_1.transferQueue)(openAiSettings.queueId, ticket, contact);
            response = response
                .replace("Ação: Transferir para o setor de atendimento", "")
                .trim();
        }
        if (openAiSettings.voice === "texto") {
            const sentMessage = await wbot.sendMessage(msg.key.remoteJid, {
                text: `\u200e ${response}`
            });
            await (0, wbotMessageListener_1.verifyMessage)(sentMessage, ticket, contact);
        }
        else {
            const fileNameWithOutExtension = `${ticket.id}_${Date.now()}`;
            (0, wbotMessageListener_1.convertTextToSpeechAndSaveToFile)((0, wbotMessageListener_1.keepOnlySpecifiedChars)(response), `${publicFolder}/${fileNameWithOutExtension}`, openAiSettings.voiceKey, openAiSettings.voiceRegion, openAiSettings.voice, "mp3").then(async () => {
                try {
                    const sendMessage = await wbot.sendMessage(msg.key.remoteJid, {
                        audio: { url: `${publicFolder}/${fileNameWithOutExtension}.mp3` },
                        mimetype: "audio/mpeg",
                        ptt: true
                    });
                    await (0, wbotMessageListener_1.verifyMediaMessage)(sendMessage, ticket, contact, ticketTraking, false, false, wbot);
                    deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.mp3`);
                    deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.wav`);
                }
                catch (error) {
                    console.log(`Erro para responder com audio: ${error}`);
                }
            });
        }
    }
    messagesOpenAi = [];
};
exports.handleOpenAi = handleOpenAi;
