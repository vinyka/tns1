"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Chat_1 = __importDefault(require("../../models/Chat"));
const ChatMessage_1 = __importDefault(require("../../models/ChatMessage"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const fs_2 = __importDefault(require("fs"));
const path_2 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../../utils/logger"));
const util_1 = require("util");
// Converter o método fs.unlink para Promise
const unlinkAsync = (0, util_1.promisify)(fs_2.default.unlink);
/**
 * Serviço para excluir um chat e todos os seus arquivos associados
 * @param id ID do chat a ser excluído
 */
const DeleteService = async (id) => {
    logger_1.default.info(`Iniciando exclusão do chat ${id}`);
    // Buscar o chat com todas as suas mensagens e a informação da empresa
    // É importante especificar explicitamente todos os atributos incluindo 'files'
    const record = await Chat_1.default.findOne({
        where: { id },
        include: [
            {
                model: ChatMessage_1.default,
                as: "messages",
                attributes: ["id", "message", "mediaPath", "mediaName", "files"] // Incluir explicitamente o campo files
            }
        ]
    });
    if (!record) {
        throw new AppError_1.default("ERR_NO_CHAT_FOUND", 404);
    }
    logger_1.default.info(`Chat encontrado: ID ${record.id}, Empresa ${record.companyId}, Mensagens: ${record.messages?.length || 0}`);
    // Processar a exclusão de arquivos antes de remover o chat
    await deleteAssociatedFiles(record);
    // Depois de excluir os arquivos, excluir o chat
    await record.destroy();
    logger_1.default.info(`Chat ${id} e seus arquivos excluídos com sucesso`);
};
/**
 * Exclui todos os arquivos associados às mensagens de um chat
 * @param chat Objeto do chat com mensagens associadas
 */
const deleteAssociatedFiles = async (chat) => {
    if (!chat.messages || chat.messages.length === 0) {
        logger_1.default.info(`Chat ${chat.id} não possui mensagens para excluir arquivos`);
        return;
    }
    let deletedFilesCount = 0;
    let failedFilesCount = 0;
    const companyId = chat.companyId;
    logger_1.default.info(`Iniciando exclusão de arquivos para ${chat.messages.length} mensagens do chat ${chat.id}`);
    // Para cada mensagem, verificar se tem arquivos
    for (const message of chat.messages) {
        // Log para debug da estrutura da mensagem
        logger_1.default.info(`Processando mensagem ${message.id}, files: ${message.files ? JSON.stringify(message.files).substring(0, 100) + '...' : 'null'}`);
        if (message.files && Array.isArray(message.files) && message.files.length > 0) {
            logger_1.default.info(`Processando ${message.files.length} arquivos da mensagem ${message.id}`);
            // Para cada arquivo na mensagem, excluir o arquivo físico
            for (const file of message.files) {
                if (file.url) {
                    try {
                        // Determinar o diretório de uploads - usando o caminho absoluto
                        const uploadDir = path_2.default.resolve(__dirname, "..", "..", "..", "public");
                        // Verificar se o diretório existe
                        if (!fs_2.default.existsSync(uploadDir)) {
                            logger_1.default.warn(`Diretório de uploads não encontrado: ${uploadDir}`);
                            continue;
                        }
                        // Extrair o nome do arquivo da URL
                        const fileNameMatch = file.url.match(/\/([^\/]+)$/);
                        if (!fileNameMatch) {
                            logger_1.default.warn(`Formato de URL inválido: ${file.url}`);
                            failedFilesCount++;
                            continue;
                        }
                        const fileName = fileNameMatch[1];
                        const chatFolder = path_2.default.join(uploadDir, `company${companyId}`, "chats");
                        const filePath = path_2.default.join(chatFolder, fileName);
                        logger_1.default.info(`Tentando excluir arquivo: ${filePath}`);
                        // Verificar se o arquivo existe
                        if (fs_2.default.existsSync(filePath)) {
                            // Excluir o arquivo
                            await unlinkAsync(filePath);
                            deletedFilesCount++;
                            logger_1.default.info(`Arquivo excluído com sucesso: ${filePath}`);
                            // Se existe thumbnail, excluir também (geralmente tem o mesmo nome do arquivo)
                            if (file.thumbnail && file.thumbnail !== file.url) {
                                const thumbnailNameMatch = file.thumbnail.match(/\/([^\/]+)$/);
                                if (thumbnailNameMatch) {
                                    const thumbnailName = thumbnailNameMatch[1];
                                    const thumbnailPath = path_2.default.join(chatFolder, thumbnailName);
                                    if (fs_2.default.existsSync(thumbnailPath)) {
                                        await unlinkAsync(thumbnailPath);
                                        logger_1.default.info(`Thumbnail excluído: ${thumbnailPath}`);
                                    }
                                }
                            }
                        }
                        else {
                            logger_1.default.warn(`Arquivo não encontrado: ${filePath}`);
                            failedFilesCount++;
                        }
                    }
                    catch (error) {
                        logger_1.default.error(`Erro ao excluir arquivo: ${error.message}`);
                        failedFilesCount++;
                    }
                }
            }
        }
        else if (message.mediaPath) {
            // Tratamento para mensagens com mediaPath (campo mais antigo)
            try {
                const uploadDir = path_2.default.resolve(__dirname, "..", "..", "..", "public");
                const mediaPath = message.mediaPath.startsWith('/') ? message.mediaPath.substring(1) : message.mediaPath;
                const filePath = path_2.default.join(uploadDir, mediaPath);
                logger_1.default.info(`Tentando excluir mediaPath: ${filePath}`);
                if (fs_2.default.existsSync(filePath)) {
                    await unlinkAsync(filePath);
                    deletedFilesCount++;
                    logger_1.default.info(`MediaPath excluído com sucesso: ${filePath}`);
                }
            }
            catch (error) {
                logger_1.default.error(`Erro ao excluir mediaPath: ${error.message}`);
                failedFilesCount++;
            }
        }
    }
    logger_1.default.info(`Exclusão de arquivos concluída para o chat ${chat.id}. ${deletedFilesCount} arquivos excluídos, ${failedFilesCount} falhas.`);
};
exports.default = DeleteService;
