import Chat from "../../models/Chat";
import ChatMessage from "../../models/ChatMessage";
import AppError from "../../errors/AppError";
import fs from "fs";
import path from "path";
import logger from "../../utils/logger";
import { promisify } from "util";

// Converter o método fs.unlink para Promise
const unlinkAsync = promisify(fs.unlink);

/**
 * Serviço para excluir um chat e todos os seus arquivos associados
 * @param id ID do chat a ser excluído
 */
const DeleteService = async (id: string): Promise<void> => {
  logger.info(`Iniciando exclusão do chat ${id}`);
  
  // Buscar o chat com todas as suas mensagens e a informação da empresa
  // É importante especificar explicitamente todos os atributos incluindo 'files'
  const record = await Chat.findOne({
    where: { id },
    include: [
      {
        model: ChatMessage,
        as: "messages",
        attributes: ["id", "message", "mediaPath", "mediaName", "files"] // Incluir explicitamente o campo files
      }
    ]
  });

  if (!record) {
    throw new AppError("ERR_NO_CHAT_FOUND", 404);
  }

  logger.info(`Chat encontrado: ID ${record.id}, Empresa ${record.companyId}, Mensagens: ${record.messages?.length || 0}`);

  // Processar a exclusão de arquivos antes de remover o chat
  await deleteAssociatedFiles(record);
  
  // Depois de excluir os arquivos, excluir o chat
  await record.destroy();
  
  logger.info(`Chat ${id} e seus arquivos excluídos com sucesso`);
};

/**
 * Exclui todos os arquivos associados às mensagens de um chat
 * @param chat Objeto do chat com mensagens associadas
 */
const deleteAssociatedFiles = async (chat: Chat): Promise<void> => {
  if (!chat.messages || chat.messages.length === 0) {
    logger.info(`Chat ${chat.id} não possui mensagens para excluir arquivos`);
    return;
  }
  
  let deletedFilesCount = 0;
  let failedFilesCount = 0;
  const companyId = chat.companyId;
  
  logger.info(`Iniciando exclusão de arquivos para ${chat.messages.length} mensagens do chat ${chat.id}`);
  
  // Para cada mensagem, verificar se tem arquivos
  for (const message of chat.messages) {
    // Log para debug da estrutura da mensagem
    logger.info(`Processando mensagem ${message.id}, files: ${message.files ? JSON.stringify(message.files).substring(0, 100) + '...' : 'null'}`);
    
    if (message.files && Array.isArray(message.files) && message.files.length > 0) {
      logger.info(`Processando ${message.files.length} arquivos da mensagem ${message.id}`);
      
      // Para cada arquivo na mensagem, excluir o arquivo físico
      for (const file of message.files) {
        if (file.url) {
          try {
            // Determinar o diretório de uploads - usando o caminho absoluto
            const uploadDir = path.resolve(__dirname, "..", "..", "..", "public");
            
            // Verificar se o diretório existe
            if (!fs.existsSync(uploadDir)) {
              logger.warn(`Diretório de uploads não encontrado: ${uploadDir}`);
              continue;
            }
            
            // Extrair o nome do arquivo da URL
            const fileNameMatch = file.url.match(/\/([^\/]+)$/);
            if (!fileNameMatch) {
              logger.warn(`Formato de URL inválido: ${file.url}`);
              failedFilesCount++;
              continue;
            }
            
            const fileName = fileNameMatch[1];
            const chatFolder = path.join(uploadDir, `company${companyId}`, "chats");
            const filePath = path.join(chatFolder, fileName);
            
            logger.info(`Tentando excluir arquivo: ${filePath}`);
            
            // Verificar se o arquivo existe
            if (fs.existsSync(filePath)) {
              // Excluir o arquivo
              await unlinkAsync(filePath);
              deletedFilesCount++;
              logger.info(`Arquivo excluído com sucesso: ${filePath}`);
              
              // Se existe thumbnail, excluir também (geralmente tem o mesmo nome do arquivo)
              if (file.thumbnail && file.thumbnail !== file.url) {
                const thumbnailNameMatch = file.thumbnail.match(/\/([^\/]+)$/);
                if (thumbnailNameMatch) {
                  const thumbnailName = thumbnailNameMatch[1];
                  const thumbnailPath = path.join(chatFolder, thumbnailName);
                  
                  if (fs.existsSync(thumbnailPath)) {
                    await unlinkAsync(thumbnailPath);
                    logger.info(`Thumbnail excluído: ${thumbnailPath}`);
                  }
                }
              }
            } else {
              logger.warn(`Arquivo não encontrado: ${filePath}`);
              failedFilesCount++;
            }
          } catch (error) {
            logger.error(`Erro ao excluir arquivo: ${error.message}`);
            failedFilesCount++;
          }
        }
      }
    } else if (message.mediaPath) {
      // Tratamento para mensagens com mediaPath (campo mais antigo)
      try {
        const uploadDir = path.resolve(__dirname, "..", "..", "..", "public");
        const mediaPath = message.mediaPath.startsWith('/') ? message.mediaPath.substring(1) : message.mediaPath;
        const filePath = path.join(uploadDir, mediaPath);
        
        logger.info(`Tentando excluir mediaPath: ${filePath}`);
        
        if (fs.existsSync(filePath)) {
          await unlinkAsync(filePath);
          deletedFilesCount++;
          logger.info(`MediaPath excluído com sucesso: ${filePath}`);
        }
      } catch (error) {
        logger.error(`Erro ao excluir mediaPath: ${error.message}`);
        failedFilesCount++;
      }
    }
  }
  
  logger.info(`Exclusão de arquivos concluída para o chat ${chat.id}. ${deletedFilesCount} arquivos excluídos, ${failedFilesCount} falhas.`);
};

export default DeleteService;
