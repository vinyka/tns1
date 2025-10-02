"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messages = exports.checkAsRead = exports.uploadFiles = exports.saveMessage = exports.remove = exports.show = exports.update = exports.store = exports.index = void 0;
const socket_1 = require("../libs/socket");
const util_1 = require("util");
const child_process_1 = require("child_process");
const CreateService_1 = __importDefault(require("../services/ChatService/CreateService"));
const ListService_1 = __importDefault(require("../services/ChatService/ListService"));
const ShowFromUuidService_1 = __importDefault(require("../services/ChatService/ShowFromUuidService"));
const DeleteService_1 = __importDefault(require("../services/ChatService/DeleteService"));
const FindMessages_1 = __importDefault(require("../services/ChatService/FindMessages"));
const UpdateService_1 = __importDefault(require("../services/ChatService/UpdateService"));
const Chat_1 = __importDefault(require("../models/Chat"));
const CreateMessageService_1 = __importDefault(require("../services/ChatService/CreateMessageService"));
const User_1 = __importDefault(require("../models/User"));
const ChatUser_1 = __importDefault(require("../models/ChatUser"));
const fs_2 = __importDefault(require("fs"));
const path_2 = __importDefault(require("path"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const get_audio_duration_1 = require("get-audio-duration");
const index = async (req, res) => {
    const { pageNumber } = req.query;
    const ownerId = +req.user.id;
    const { records, count, hasMore } = await (0, ListService_1.default)({
        ownerId,
        pageNumber
    });
    return res.json({ records, count, hasMore });
};
exports.index = index;
const store = async (req, res) => {
    const { companyId } = req.user;
    const ownerId = +req.user.id;
    const data = req.body;
    const record = await (0, CreateService_1.default)({
        ...data,
        ownerId,
        companyId
    });
    const io = (0, socket_1.getIO)();
    record.users.forEach(user => {
        console.log(user.id);
        io.of(String(companyId))
            .emit(`company-${companyId}-chat-user-${user.id}`, {
            action: "create",
            record
        });
    });
    return res.status(200).json(record);
};
exports.store = store;
const update = async (req, res) => {
    const { companyId } = req.user;
    const data = req.body;
    const { id } = req.params;
    const record = await (0, UpdateService_1.default)({
        ...data,
        id: +id
    });
    const io = (0, socket_1.getIO)();
    record.users.forEach(user => {
        io.of(String(companyId))
            .emit(`company-${companyId}-chat-user-${user.id}`, {
            action: "update",
            record,
            userId: user.userId
        });
    });
    return res.status(200).json(record);
};
exports.update = update;
const show = async (req, res) => {
    const { id } = req.params;
    const record = await (0, ShowFromUuidService_1.default)(id);
    return res.status(200).json(record);
};
exports.show = show;
const remove = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    try {
        // O DeleteService agora cuida da exclusão de arquivos associados antes de remover o chat
        await (0, DeleteService_1.default)(id);
        const io = (0, socket_1.getIO)();
        io.of(String(companyId))
            .emit(`company-${companyId}-chat`, {
            action: "delete",
            id
        });
        return res.status(200).json({
            message: "Chat e arquivos associados excluídos com sucesso"
        });
    }
    catch (error) {
        if (error instanceof AppError_1.default) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        return res.status(500).json({
            error: "Erro ao excluir chat",
            details: error.message
        });
    }
};
exports.remove = remove;
const saveMessage = async (req, res) => {
    const { companyId } = req.user;
    const { message } = req.body;
    const { id } = req.params;
    const senderId = +req.user.id;
    const chatId = +id;
    const newMessage = await (0, CreateMessageService_1.default)({
        chatId,
        senderId,
        message
    });
    const chat = await Chat_1.default.findByPk(chatId, {
        include: [
            { model: User_1.default, as: "owner" },
            { model: ChatUser_1.default, as: "users" }
        ]
    });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId))
        .emit(`company-${companyId}-chat-${chatId}`, {
        action: "new-message",
        newMessage,
        chat
    });
    io.of(String(companyId))
        .emit(`company-${companyId}-chat`, {
        action: "new-message",
        newMessage,
        chat
    });
    return res.json(newMessage);
};
exports.saveMessage = saveMessage;
const uploadFiles = async (req, res) => {
    console.log("[DEBUG] Rota de upload acessada: /chats/:id/messages/upload");
    console.log("[DEBUG] Parâmetros: ", req.params);
    console.log("[DEBUG] Query: ", req.query);
    console.log("[DEBUG] Body: ", req.body);
    console.log("[DEBUG] Files: ", req.files ? "Tem arquivos" : "Sem arquivos");
    const { companyId } = req.user;
    const { message } = req.body;
    const { id } = req.params;
    const senderId = +req.user.id;
    const chatId = +id;
    console.log("[DEBUG] Rota de upload acessada:", { chatId, senderId, companyId });
    console.log("[DEBUG] Body da requisição:", req.body);
    // Verificar se existem arquivos na requisição
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        console.log("[ERROR] Nenhum arquivo recebido na requisição");
        return res.status(400).json({ error: "Nenhum arquivo recebido" });
    }
    const files = req.files;
    console.log("[DEBUG] Arquivos recebidos:", files.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype })));
    try {
        // Processar os arquivos enviados
        const fileData = await Promise.all(files.map(async (file) => {
            // Gerar caminho para arquivos do chat
            const chatFolder = path_2.default.join("public", `company${companyId}`, "chats");
            const oldPath = file.path;
            console.log("[DEBUG] Processando arquivo:", { name: file.originalname, oldPath });
            // Verificar se é um arquivo de áudio
            const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
            const isAudio = file.mimetype.includes('audio') ||
                ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'mpeg', 'opus'].includes(fileExtension);
            console.log("[DEBUG] Verificação de tipo:", {
                isAudio,
                mimeType: file.mimetype,
                extension: fileExtension
            });
            // Criar pasta se não existir
            if (!fs_2.default.existsSync(chatFolder)) {
                console.log("[DEBUG] Criando pasta:", chatFolder);
                fs_2.default.mkdirSync(chatFolder, { recursive: true });
            }
            // Criar nome de arquivo único
            const timestamp = new Date().getTime();
            let fileName = '';
            let newPath = '';
            let fileURL = '';
            // Processamento específico para arquivos de áudio
            if (isAudio) {
                // Criar nome com extensão .m4a para áudios
                const baseName = file.originalname.split('.')[0];
                fileName = `${timestamp}-${baseName.replace(/[^a-zA-Z0-9]/g, "_")}.m4a`;
                newPath = path_2.default.join(chatFolder, fileName);
                // Converter o arquivo de áudio para M4A usando FFmpeg
                try {
                    console.log("[DEBUG] Convertendo áudio para M4A com FFmpeg:", { oldPath, newPath });
                    // Executar o comando FFmpeg para conversão
                    const execPromise = (0, util_1.promisify)(child_process_1.exec);
                    await execPromise(`ffmpeg -y -i "${oldPath}" -c:a aac -b:a 128k "${newPath}"`);
                    console.log("[DEBUG] Conversão para M4A concluída com sucesso");
                    // Forçar tipo MIME para compatibilidade com Safari
                    file.mimetype = 'audio/mp4';
                }
                catch (conversionError) {
                    console.error("[ERROR] Erro ao converter áudio para M4A:", conversionError);
                    // Se falhar a conversão, tentar apenas mover o arquivo original
                    try {
                        await (0, util_1.promisify)(fs_2.default.copyFile)(oldPath, newPath);
                        console.log("[DEBUG] Arquivo copiado sem conversão como fallback");
                    }
                    catch (copyError) {
                        console.error("[ERROR] Erro ao copiar arquivo original:", copyError);
                        throw copyError;
                    }
                }
                // Tentar remover o arquivo temporário original
                try {
                    await (0, util_1.promisify)(fs_2.default.unlink)(oldPath);
                }
                catch (unlinkError) {
                    console.error("[DEBUG] Aviso: Não foi possível remover arquivo temporário:", unlinkError);
                    // Continuar mesmo se não conseguir remover
                }
            }
            else {
                // Para outros tipos de arquivo, manter o processamento original
                fileName = `${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`;
                newPath = path_2.default.join(chatFolder, fileName);
                try {
                    // Mover arquivo 
                    await (0, util_1.promisify)(fs_2.default.rename)(oldPath, newPath);
                    console.log("[DEBUG] Arquivo movido com sucesso");
                }
                catch (moveError) {
                    console.error("[ERROR] Erro ao mover arquivo:", moveError);
                    // Tentar copiar em vez de mover como fallback
                    try {
                        await (0, util_1.promisify)(fs_2.default.copyFile)(oldPath, newPath);
                        await (0, util_1.promisify)(fs_2.default.unlink)(oldPath);
                        console.log("[DEBUG] Arquivo copiado como fallback");
                    }
                    catch (copyError) {
                        console.error("[ERROR] Erro ao copiar arquivo:", copyError);
                        throw copyError;
                    }
                }
            }
            // Objeto para armazenar metadados do arquivo
            const metadata = {};
            // Extrair metadados específicos para áudio
            if (isAudio) {
                try {
                    console.log("[DEBUG] Extraindo duração do áudio:", newPath);
                    const duration = await (0, get_audio_duration_1.getAudioDurationInSeconds)(newPath);
                    metadata.duration = duration;
                    metadata.format = 'm4a';
                    metadata.universalCompatible = true;
                    console.log("[DEBUG] Duração do áudio:", duration);
                }
                catch (audioError) {
                    console.error("[ERROR] Erro ao extrair duração do áudio:", audioError);
                    // Continuar mesmo se não conseguir extrair a duração
                }
            }
            // Gerar URL pública para o arquivo
            fileURL = path_2.default.join("company" + companyId, "chats", fileName).replace(/\\/g, "/");
            return {
                name: isAudio ? `${file.originalname.split('.')[0]}.m4a` : file.originalname,
                size: file.size,
                type: file.mimetype,
                url: fileURL,
                metadata
            };
        }));
        console.log("[DEBUG] Arquivos processados:", fileData);
        // Criar a mensagem com os arquivos processados
        const newMessage = await (0, CreateMessageService_1.default)({
            chatId,
            senderId,
            message: message || "",
            files: fileData
        });
        // Buscar o chat para incluir nas notificações
        const chat = await Chat_1.default.findByPk(chatId, {
            include: [
                { model: User_1.default, as: "owner" },
                { model: ChatUser_1.default, as: "users" }
            ]
        });
        // Emitir eventos de socket para notificar os clientes
        const io = (0, socket_1.getIO)();
        io.of(String(companyId))
            .emit(`company-${companyId}-chat-${chatId}`, {
            action: "new-message",
            newMessage,
            chat
        });
        io.of(String(companyId))
            .emit(`company-${companyId}-chat`, {
            action: "new-message",
            newMessage,
            chat
        });
        return res.status(200).json(newMessage);
    }
    catch (error) {
        console.error("[ERROR] Erro ao processar upload:", error);
        return res.status(500).json({
            error: "Erro ao processar o upload de arquivos",
            details: error.message
        });
    }
};
exports.uploadFiles = uploadFiles;
const checkAsRead = async (req, res) => {
    const { companyId } = req.user;
    const { userId } = req.body;
    const { id } = req.params;
    const chatUser = await ChatUser_1.default.findOne({ where: { chatId: id, userId } });
    await chatUser.update({ unreads: 0 });
    const chat = await Chat_1.default.findByPk(id, {
        include: [
            { model: User_1.default, as: "owner" },
            { model: ChatUser_1.default, as: "users" }
        ]
    });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId))
        .emit(`company-${companyId}-chat-${id}`, {
        action: "update",
        chat
    });
    io.of(String(companyId))
        .emit(`company-${companyId}-chat`, {
        action: "update",
        chat
    });
    return res.json(chat);
};
exports.checkAsRead = checkAsRead;
const messages = async (req, res) => {
    const { pageNumber } = req.query;
    const { id: chatId } = req.params;
    const ownerId = +req.user.id;
    const { records, count, hasMore } = await (0, FindMessages_1.default)({
        chatId,
        ownerId,
        pageNumber
    });
    return res.json({ records, count, hasMore });
};
exports.messages = messages;
