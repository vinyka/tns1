import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { promisify } from "util";
import { exec } from "child_process";

import CreateService from "../services/ChatService/CreateService";
import ListService from "../services/ChatService/ListService";
import ShowFromUuidService from "../services/ChatService/ShowFromUuidService";
import DeleteService from "../services/ChatService/DeleteService";
import FindMessages from "../services/ChatService/FindMessages";
import UpdateService from "../services/ChatService/UpdateService";

import Chat from "../models/Chat";
import CreateMessageService from "../services/ChatService/CreateMessageService";
import User from "../models/User";
import ChatUser from "../models/ChatUser";
import fs from "fs";
import path from "path";
import AppError from "../errors/AppError";
import { getAudioDurationInSeconds } from "get-audio-duration";

type IndexQuery = {
  pageNumber: string;
  companyId: string | number;
  ownerId?: number;
};

type StoreData = {
  users: any[];
  title: string;
};

type FindParams = {
  companyId: number;
  ownerId?: number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { pageNumber } = req.query as unknown as IndexQuery;
  const ownerId = +req.user.id;

  const { records, count, hasMore } = await ListService({
    ownerId,
    pageNumber
  });

  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const ownerId = +req.user.id;
  const data = req.body as StoreData;

  const record = await CreateService({
    ...data,
    ownerId,
    companyId
  });

  const io = getIO();

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

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body;
  const { id } = req.params;

  const record = await UpdateService({
    ...data,
    id: +id
  });

  const io = getIO();

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

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const record = await ShowFromUuidService(id);

  return res.status(200).json(record);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  try {
    // O DeleteService agora cuida da exclusão de arquivos associados antes de remover o chat
  await DeleteService(id);

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-chat`, {
      action: "delete",
      id
    });

    return res.status(200).json({ 
      message: "Chat e arquivos associados excluídos com sucesso" 
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ 
      error: "Erro ao excluir chat", 
      details: error.message 
    });
  }
};

export const saveMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { message } = req.body;
  const { id } = req.params;
  const senderId = +req.user.id;
  const chatId = +id;

  const newMessage = await CreateMessageService({
    chatId,
    senderId,
    message
  });

  const chat = await Chat.findByPk(chatId, {
    include: [
      { model: User, as: "owner" },
      { model: ChatUser, as: "users" }
    ]
  });

  const io = getIO();
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

export const uploadFiles = async (
  req: Request,
  res: Response
): Promise<Response> => {
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
  
  const files = req.files as Express.Multer.File[];
  console.log("[DEBUG] Arquivos recebidos:", files.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype })));

  try {
    // Processar os arquivos enviados
    const fileData = await Promise.all(
      files.map(async file => {
        // Gerar caminho para arquivos do chat
        const chatFolder = path.join("public", `company${companyId}`, "chats");
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
        if (!fs.existsSync(chatFolder)) {
          console.log("[DEBUG] Criando pasta:", chatFolder);
          fs.mkdirSync(chatFolder, { recursive: true });
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
          newPath = path.join(chatFolder, fileName);
          
          // Converter o arquivo de áudio para M4A usando FFmpeg
          try {
            console.log("[DEBUG] Convertendo áudio para M4A com FFmpeg:", { oldPath, newPath });
            
            // Executar o comando FFmpeg para conversão
            const execPromise = promisify(exec);
            await execPromise(`ffmpeg -y -i "${oldPath}" -c:a aac -b:a 128k "${newPath}"`);
            
            console.log("[DEBUG] Conversão para M4A concluída com sucesso");
            
            // Forçar tipo MIME para compatibilidade com Safari
            file.mimetype = 'audio/mp4';
          } catch (conversionError) {
            console.error("[ERROR] Erro ao converter áudio para M4A:", conversionError);
            // Se falhar a conversão, tentar apenas mover o arquivo original
            try {
              await promisify(fs.copyFile)(oldPath, newPath);
              console.log("[DEBUG] Arquivo copiado sem conversão como fallback");
            } catch (copyError) {
              console.error("[ERROR] Erro ao copiar arquivo original:", copyError);
              throw copyError;
            }
          }
          
          // Tentar remover o arquivo temporário original
          try {
            await promisify(fs.unlink)(oldPath);
          } catch (unlinkError) {
            console.error("[DEBUG] Aviso: Não foi possível remover arquivo temporário:", unlinkError);
            // Continuar mesmo se não conseguir remover
          }
        } else {
          // Para outros tipos de arquivo, manter o processamento original
          fileName = `${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`;
          newPath = path.join(chatFolder, fileName);
          
          try {
            // Mover arquivo 
            await promisify(fs.rename)(oldPath, newPath);
            console.log("[DEBUG] Arquivo movido com sucesso");
          } catch (moveError) {
            console.error("[ERROR] Erro ao mover arquivo:", moveError);
            // Tentar copiar em vez de mover como fallback
            try {
              await promisify(fs.copyFile)(oldPath, newPath);
              await promisify(fs.unlink)(oldPath);
              console.log("[DEBUG] Arquivo copiado como fallback");
            } catch (copyError) {
              console.error("[ERROR] Erro ao copiar arquivo:", copyError);
              throw copyError;
            }
          }
        }
        
        // Objeto para armazenar metadados do arquivo
        const metadata: any = {};
        
        // Extrair metadados específicos para áudio
        if (isAudio) {
          try {
            console.log("[DEBUG] Extraindo duração do áudio:", newPath);
            const duration = await getAudioDurationInSeconds(newPath);
            metadata.duration = duration;
            metadata.format = 'm4a';
            metadata.universalCompatible = true;
            console.log("[DEBUG] Duração do áudio:", duration);
          } catch (audioError) {
            console.error("[ERROR] Erro ao extrair duração do áudio:", audioError);
            // Continuar mesmo se não conseguir extrair a duração
          }
        }
        
        // Gerar URL pública para o arquivo
        fileURL = path.join("company" + companyId, "chats", fileName).replace(/\\/g, "/");
        
        return {
          name: isAudio ? `${file.originalname.split('.')[0]}.m4a` : file.originalname,
          size: file.size,
          type: file.mimetype,
          url: fileURL,
          metadata
        };
      })
    );
    
    console.log("[DEBUG] Arquivos processados:", fileData);
    
    // Criar a mensagem com os arquivos processados
    const newMessage = await CreateMessageService({
      chatId,
      senderId,
      message: message || "",
      files: fileData
    });
    
    // Buscar o chat para incluir nas notificações
    const chat = await Chat.findByPk(chatId, {
      include: [
        { model: User, as: "owner" },
        { model: ChatUser, as: "users" }
      ]
    });
    
    // Emitir eventos de socket para notificar os clientes
    const io = getIO();
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
  } catch (error) {
    console.error("[ERROR] Erro ao processar upload:", error);
    return res.status(500).json({ 
      error: "Erro ao processar o upload de arquivos", 
      details: error.message 
    });
  }
};

export const checkAsRead = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { userId } = req.body;
  const { id } = req.params;

  const chatUser = await ChatUser.findOne({ where: { chatId: id, userId } });
  await chatUser.update({ unreads: 0 });

  const chat = await Chat.findByPk(id, {
    include: [
      { model: User, as: "owner" },
      { model: ChatUser, as: "users" }
    ]
  });

  const io = getIO();
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

export const messages = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { pageNumber } = req.query as unknown as IndexQuery;
  const { id: chatId } = req.params;
  const ownerId = +req.user.id;

  const { records, count, hasMore } = await FindMessages({
    chatId,
    ownerId,
    pageNumber
  });

  return res.json({ records, count, hasMore });
};
