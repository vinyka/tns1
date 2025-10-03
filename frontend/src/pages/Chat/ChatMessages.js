import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Box,
  FormControl,
  IconButton,
  Input,
  InputAdornment,
  makeStyles,
  Paper,
  Typography,
  CircularProgress,
  LinearProgress,
} from "@material-ui/core";
import SendIcon from "@material-ui/icons/Send";

import { AuthContext } from "../../context/Auth/AuthContext";
import { useDate } from "../../hooks/useDate";
import api from "../../services/api";
import ChatFilePreview from "./ChatFilePreview";
import ChatFileMessage from "./ChatFileMessage";
import ChatFileUpload from "./ChatFileUpload";
import ChatAudioRecorder from "./ChatAudioRecorder";
import ChatAudioPlayer from "./ChatAudioPlayer";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    overflow: "hidden",
    borderRadius: 0,
    height: "100%",
    borderLeft: "1px solid rgba(0, 0, 0, 0.12)",
  },
  messageList: {
    position: "relative",
    overflowY: "auto",
    height: "100%",
    ...theme.scrollbarStyles,
    backgroundColor: theme.mode === 'light' ? "#f2f2f2" : "#7f7f7f",
  },
  inputArea: {
    position: "relative",
    height: "auto",
  },
  input: {
    padding: "20px",
  },
  buttonSend: {
    margin: theme.spacing(1),
  },
  uploadInput: {
    display: "none",
  },
  buttonAttach: {
    margin: theme.spacing(1),
  },
  previewArea: {
    padding: "10px 15px",
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    background: theme.palette.background.default,
    borderTop: "1px solid rgba(0, 0, 0, 0.12)",
  },
  uploadProgress: {
    width: "100%",
    marginTop: 5,
  },
  boxLeft: {
    padding: "10px 10px 5px",
    margin: "10px",
    position: "relative",
    backgroundColor: "#ffffff",
    color: "#303030",
    maxWidth: 300,
    minWidth: 60,
    display: "inline-block",
    width: "auto",
    borderRadius: 10,
    borderBottomLeftRadius: 0,
    border: "1px solid rgba(0, 0, 0, 0.12)",
  },
  boxRight: {
    padding: "10px 10px 5px",
    margin: "10px 10px 10px auto",
    position: "relative",
    backgroundColor: "#dcf8c6",
    color: "#303030",
    textAlign: "right",
    maxWidth: 300,
    minWidth: 60,
    display: "inline-block",
    width: "auto",
    borderRadius: 10,
    borderBottomRightRadius: 0,
    border: "1px solid rgba(0, 0, 0, 0.12)",
  },
  messageListLoading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  messageListEmpty: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  timestamp: {
    marginLeft: theme.spacing(1),
  },
}));

export default function ChatMessages({
  chat,
  messages,
  handleSendMessage,
  handleLoadMore,
  scrollToBottomRef,
  pageInfo,
  loading,
  onMessagesUpdate,
}) {
  const classes = useStyles();
  const { user, socket } = useContext(AuthContext);
  const { datetimeToClient } = useDate();
  const baseRef = useRef();

  const [contentMessage, setContentMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const scrollToBottom = () => {
    if (baseRef.current) {
      baseRef.current.scrollIntoView({});
    }
  };

  const unreadMessages = (chat) => {
    if (chat !== undefined) {
      const currentUser = chat.users.find((u) => u.userId === user.id);
      return currentUser.unreads > 0;
    }
    return 0;
  };

  useEffect(() => {
    if (unreadMessages(chat) > 0) {
      try {
        api.post(`/chats/${chat.id}/read`, { userId: user.id });
      } catch (err) {}
    }
    scrollToBottomRef.current = scrollToBottom;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = (e) => {
    const { scrollTop } = e.currentTarget;
    if (!pageInfo.hasMore || loading) return;
    if (scrollTop < 600) {
      handleLoadMore();
    }
  };

  const handleSend = async () => {
    if (contentMessage.trim() === "" && selectedFiles.length === 0) return;
    
    if (selectedFiles.length > 0) {
      setIsUploading(true);
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append("files", file);
      });
      
      if (contentMessage.trim() !== "") {
        formData.append("message", contentMessage);
      }
      
      try {
        // Criar uma mensagem provisória para feedback imediato ao usuário
        const tempMessage = {
          id: `temp-${Date.now()}`,
          message: contentMessage,
          fromMe: true,
          senderId: user.id,
          sender: { id: user.id, name: user.name },
          createdAt: new Date().toISOString(),
          isUploading: true,
          files: selectedFiles.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
            url: URL.createObjectURL(file),
            isUploading: true
          }))
        };
        
        // Adicionar a mensagem temporária ao estado local
        const updatedMessages = [...messages, tempMessage];
        // Aqui precisamos atualizar o estado global das mensagens
        // Se você estiver usando redux ou context, dispatch a ação apropriada
        // Por exemplo:
        // dispatch({ type: 'SET_MESSAGES', payload: updatedMessages });
        
        // Se você não tiver acesso direto ao estado global, você pode passar uma callback
        // para o componente pai que atualiza o estado
        if (typeof onMessagesUpdate === 'function') {
          onMessagesUpdate(updatedMessages);
        }
        
        const response = await api.post(`/chats/${chat.id}/messages/upload`, formData, {
          onUploadProgress: progressEvent => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
            
            // Atualizar o progresso da mensagem temporária
            const updatedMessagesWithProgress = messages.map(msg => 
              msg.id === tempMessage.id 
                ? { ...msg, uploadProgress: percentCompleted } 
                : msg
            );
            
            if (typeof onMessagesUpdate === 'function') {
              onMessagesUpdate(updatedMessagesWithProgress);
            }
          }
        });
        
        // Remover a mensagem temporária e adicionar a mensagem real retornada pelo servidor
        const newMessage = response.data;
        
        const updatedMessagesAfterUpload = messages
          .filter(msg => msg.id !== tempMessage.id)
          .concat(newMessage);
          
        if (typeof onMessagesUpdate === 'function') {
          onMessagesUpdate(updatedMessagesAfterUpload);
        }
        
        setSelectedFiles([]);
        setContentMessage("");
        setUploadProgress(0);
        
        // Forçar scroll para o fim após adicionar nova mensagem
        setTimeout(() => {
          if (scrollToBottomRef.current) {
            scrollToBottomRef.current();
          }
        }, 200);
      } catch (err) {
        console.error(err);
        window.alert("Erro ao enviar arquivos. Tente novamente.");
        
        // Remover a mensagem temporária em caso de erro
        const updatedMessagesAfterError = messages
          .filter(msg => msg.id !== `temp-${Date.now()}`);
          
        if (typeof onMessagesUpdate === 'function') {
          onMessagesUpdate(updatedMessagesAfterError);
        }
      } finally {
        setIsUploading(false);
      }
    } else if (contentMessage.trim() !== "") {
      handleSendMessage(contentMessage);
      setContentMessage("");
    }
  };

  const handleFilesSelected = (files, progressCallback, completeCallback) => {
    // Verificar se recebemos arquivos válidos
    if (!files || (Array.isArray(files) && files.length === 0)) {
      if (completeCallback) completeCallback();
      return;
    }
    
    const formData = new FormData();
    
    // Se for um único arquivo (caso do áudio) ou uma lista de arquivos
    if (files instanceof File) {
      // Verificar se o arquivo tem tamanho válido
      if (files.size === 0) {
        window.alert("O arquivo de áudio está vazio. Tente gravar novamente com um microfone diferente.");
        if (completeCallback) completeCallback();
        return;
      }
      
      // Para arquivos de áudio, verificar codec e converter se necessário
      if (files.type.startsWith('audio/')) {
        try {
          // Determinar a extensão correta com base no tipo MIME
          let audioExt = 'mp3';  // Padrão para compatibilidade máxima
          
          if (files.type === 'audio/webm') {
            audioExt = 'webm';
          } else if (files.type === 'audio/mp3' || files.type === 'audio/mpeg') {
            audioExt = 'mp3';
          } else if (files.type === 'audio/ogg') {
            audioExt = 'ogg';
          }
                          
          // Criar uma cópia do arquivo com nome garantido e verificar o tamanho novamente
          const newFileName = `audio_${Date.now()}.${audioExt}`;
          
          // Ler o arquivo como ArrayBuffer para garantir que os dados estão intactos
          const reader = new FileReader();
          
          // Usar uma Promise para trabalhar com o FileReader de forma assíncrona
          const processAudioFile = new Promise((resolve, reject) => {
            reader.onload = function(e) {
              try {
                if (!e.target.result || e.target.result.byteLength === 0) {
                  reject(new Error("Não foi possível ler os dados do arquivo de áudio"));
                  return;
                }
                
                // Criar blob a partir do ArrayBuffer
                const audioBlob = new Blob([e.target.result], { type: files.type });
                
                if (audioBlob.size === 0) {
                  reject(new Error("Falha ao processar dados do áudio"));
                  return;
                }
                
                // Criar arquivo a partir do blob
                const audioFile = new File([audioBlob], newFileName, { 
                  type: files.type,
                  lastModified: Date.now()
                });
                
                resolve(audioFile);
              } catch (error) {
                reject(error);
              }
            };
            
            reader.onerror = function() {
              reject(new Error("Erro ao ler o arquivo de áudio"));
            };
            
            // Iniciar a leitura do arquivo
            reader.readAsArrayBuffer(files);
          });
          
          // Processar o arquivo e depois enviar para o servidor
          processAudioFile
            .then(audioFile => {
              // Verificação final
              if (audioFile.size === 0) {
                window.alert("Erro ao processar o áudio. Tente novamente.");
                if (completeCallback) completeCallback();
                return;
              }
              
              // Adiciona o arquivo ao FormData e envia
              const audioFormData = new FormData();
              audioFormData.append("files", audioFile);
              
              if (contentMessage.trim() !== "") {
                audioFormData.append("message", contentMessage);
              }
              
              api.post(`/chats/${chat.id}/messages/upload`, audioFormData, {
                headers: {
                  'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: progressEvent => {
                  const percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                  );
                  if (progressCallback) progressCallback(percentCompleted);
                }
              })
              .then((response) => {
                setContentMessage("");
                if (completeCallback) completeCallback();
              })
              .catch(err => {
                window.alert("Erro ao enviar o áudio. Tente novamente.");
                if (completeCallback) completeCallback();
              });
            })
            .catch(error => {
              window.alert("Não foi possível processar o arquivo de áudio. Tente novamente.");
              if (completeCallback) completeCallback();
            });
          
          // Retorna aqui pois o envio será tratado pela Promise
          return;
        } catch (error) {
          window.alert("Erro ao processar o áudio. Tente novamente.");
          if (completeCallback) completeCallback();
          return;
        }
      } else {
        formData.append("files", files);
      }
    } else {
      let validFilesCount = 0;
      
      Array.from(files).forEach(file => {
        // Verificar se o arquivo tem tamanho válido
        if (file.size === 0) {
          return; // Pular este arquivo
        }
        
        formData.append("files", file);
        validFilesCount++;
      });
      
      if (validFilesCount === 0) {
        window.alert("Nenhum arquivo válido para enviar. Verifique se os arquivos selecionados não estão vazios.");
        if (completeCallback) completeCallback();
        return;
      }
    }
    
    // Adicionar mensagem de texto se houver
    if (contentMessage.trim() !== "") {
      formData.append("message", contentMessage);
    }
    
    // Verificar se temos arquivos no FormData antes de enviar
    const filesInFormData = formData.getAll("files");
    if (filesInFormData.length === 0) {
      window.alert("Erro: Nenhum arquivo válido para enviar.");
      if (completeCallback) completeCallback();
      return;
    }
    
    // Verificar tamanho dos arquivos
    const hasInvalidFiles = filesInFormData.some(file => file.size === 0);
    if (hasInvalidFiles) {
      if (!window.confirm("Alguns arquivos parecem estar vazios. Deseja continuar mesmo assim?")) {
        if (completeCallback) completeCallback();
        return;
      }
    }
    
    api.post(`/chats/${chat.id}/messages/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: progressEvent => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        if (progressCallback) progressCallback(percentCompleted);
      }
    })
      .then((response) => {
        setContentMessage("");
        if (completeCallback) completeCallback();
      })
      .catch(err => {
        console.error("[ERROR] Falha no upload:", err.message);
        console.error("[ERROR] Status:", err.response?.status);
        console.error("[ERROR] Dados:", err.response?.data);
        
        // Mensagem mais específica com base no tipo de erro
        let errorMessage = "Erro ao enviar arquivos. Tente novamente.";
        
        if (err.response?.status === 400) {
          errorMessage = "Erro: O servidor não recebeu os arquivos corretamente. Tente novamente.";
        } else if (err.response?.status === 413) {
          errorMessage = "Erro: O arquivo é muito grande para upload. Tente um arquivo menor.";
        } else if (err.response?.status >= 500) {
          errorMessage = "Erro no servidor. Por favor, tente novamente mais tarde.";
        }
        
        window.alert(errorMessage);
        if (completeCallback) completeCallback();
      });
  };

  const renderMessageContent = (message) => {
    // Usar a função auxiliar para detectar mensagens do usuário
    const isMe = isMessageFromMe(message, user.id);
    
    // Verificar se a mensagem tem arquivos
    if (message.files && message.files.length > 0) {
      // Verificar se há arquivos de áudio
      const audioFiles = message.files.filter(file => {
        const extension = file.name?.split('.').pop().toLowerCase();
        return ['mp3', 'wav', 'ogg', 'opus'].includes(extension);
      });

      // Se for apenas áudio, renderizar o player sem exibir a mensagem de texto
      if (audioFiles.length > 0 && audioFiles.length === message.files.length && !message.message) {
        return (
          <>
            <ChatFileMessage 
              files={message.files} 
              isRight={isMe} 
            />
          </>
        );
      }
    }

    // Renderização padrão para mensagens normais ou mistas
    return (
      <>
        {message.message && (
          <Typography style={{ 
            wordBreak: "break-word",
            textAlign: isMe ? "right" : "left",
            width: "100%"
          }}>
            {message.message}
          </Typography>
        )}
        {message.files && message.files.length > 0 && (
          <ChatFileMessage
            files={message.files}
            isRight={isMe}
          />
        )}
      </>
    );
  };
  
  // Função auxiliar para determinar se uma mensagem é do usuário atual
  const isMessageFromMe = (message, userId) => {
    // Se fromMe estiver explicitamente definido, usá-lo como determinante
    if (message.fromMe === true) {
      return true;
    } else if (message.fromMe === false) {
      return false;
    }
    
    // Se chegamos aqui, fromMe é undefined, então temos que usar outras heurísticas
    // IMPORTANTE: Para evitar falsos positivos, vamos ser mais rigorosos
    
    // Para mensagens com remetentes indefinidos, considerar como não sendo do usuário atual
    if (!message.senderId && !message.sender) {
      return false;
    }
    
    // Verificar IDs convertendo para string para garantir comparação correta
    if (userId && message.senderId) {
      return String(message.senderId) === String(userId);
    }
    
    // Verificar ID no objeto sender se disponível
    if (userId && message.sender && message.sender.id) {
      return String(message.sender.id) === String(userId);
    }
    
    // Se não conseguimos determinar com certeza, assumir que NÃO é do usuário atual
    // para garantir que o nome do remetente sempre seja exibido
    return false;
  };

  const renderMessages = () => {
    if (loading && messages.length === 0) {
      return (
        <div className={classes.messageListLoading}>
          <CircularProgress />
        </div>
      );
    }

    if (messages.length === 0) {
      return (
        <div className={classes.messageListEmpty}>
          <Typography variant="body1">
            Nenhuma mensagem encontrada.
          </Typography>
        </div>
      );
    }

    // Renderizar cada mensagem individualmente (sem agrupamento)
    return messages.map((message) => {
      const messageDate = datetimeToClient(message.createdAt);
      
      // Usar a função auxiliar para detectar mensagens do usuário
      const isMe = isMessageFromMe(message, user.id);
      
      // Para debugging: forçar todas as mensagens a mostrar o nome do remetente
      const forceShowSender = true; // Temporariamente mostrar todos os nomes para debug
      
      // Determinar o nome do remetente com fallbacks
      const senderName = (() => {
        // Se tiver um objeto sender, usar o nome dele
        if (message.sender && message.sender.name) {
          return message.sender.name;
        }
        
        // Se tiver propriedade senderName, usar ela
        if (message.senderName) {
          return message.senderName;
        }
        
        // Se tiver propriedade username, usar ela
        if (message.username) {
          return message.username;
        }
        
        // Se tivermos um nome no objeto 'user' da mensagem
        if (message.user && message.user.name) {
          return message.user.name;
        }
        
        // Verificar se existe nome do contato na mensagem
        if (message.contact && message.contact.name) {
          return message.contact.name;
        }
        
        // Se tivermos o objeto chat e o id do remetente
        if (chat && chat.users && message.senderId) {
          const chatUser = chat.users.find(u => 
            u.userId === message.senderId || 
            u.id === message.senderId ||
            String(u.userId) === String(message.senderId) ||
            String(u.id) === String(message.senderId)
          );
          if (chatUser) {
            return chatUser.name || chatUser.username || "Usuário";
          }
        }
        
        // Forçar um nome temporário para propósitos de debug
        return "Remetente";
      })();

      return (
        <div key={message.id} style={{ 
          display: "flex", 
          justifyContent: isMe ? "flex-end" : "flex-start",
          width: "100%",
          margin: "5px 0"
        }}>
          <div className={isMe ? classes.boxRight : classes.boxLeft}>
            {/* Mostrar o nome do remetente se a mensagem não for do usuário atual OU se forceShowSender for true */}
            {(!isMe || forceShowSender) && (
              <Box display="flex" alignItems="center" mb={0.5} justifyContent={isMe ? "flex-end" : "flex-start"} width="100%">
                <Typography 
                  variant="caption" 
                  style={{ 
                    fontWeight: 'bold', 
                    color: "#0000CC",
                    fontSize: '0.85rem',
                    textShadow: "0px 0px 1px rgba(0,0,0,0.1)"
                  }}
                >
                  {senderName}
                </Typography>
                <Typography
                  variant="caption"
                  style={{
                    color: "#777",
                    fontSize: '0.75rem',
                    marginLeft: '4px'
                  }}
                >
                  - {messageDate}
                </Typography>
              </Box>
            )}
            
            {/* Indicador de upload em progresso */}
            {message.isUploading && (
              <Box mt={1} mb={1} width="100%">
                <Typography variant="caption" style={{ display: 'block', marginBottom: 4 }}>
                  Enviando... {message.uploadProgress ? `${message.uploadProgress}%` : ''}
                </Typography>
                <LinearProgress 
                  variant={message.uploadProgress ? "determinate" : "indeterminate"}
                  value={message.uploadProgress || 0}
                />
              </Box>
            )}
            
            {/* Renderiza o conteúdo da mensagem */}
            {renderMessageContent(message)}
          </div>
        </div>
      );
    });
  };

  return (
    <Paper className={classes.mainContainer}>
      <div onScroll={handleScroll} className={classes.messageList}>
        {renderMessages()}
        <div ref={baseRef}></div>
      </div>
      
      {selectedFiles.length > 0 && (
        <div className={classes.previewArea}>
          <ChatFilePreview 
            files={selectedFiles} 
            onRemove={(index) => setSelectedFiles(prev => prev.filter((_, i) => i !== index))} 
          />
          {isUploading && (
            <LinearProgress 
              className={classes.uploadProgress} 
              variant="determinate" 
              value={uploadProgress} 
            />
          )}
        </div>
      )}
      
      <div className={classes.inputArea}>
        <FormControl variant="outlined" fullWidth>
          <Input
            multiline
            disabled={isUploading}
            value={contentMessage}
            onKeyUp={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isUploading) {
                e.preventDefault();
                handleSend();
              }
            }}
            onChange={(e) => setContentMessage(e.target.value)}
            className={classes.input}
            endAdornment={
              <InputAdornment position="end">
                <ChatFileUpload 
                  disabled={isUploading}
                  onFilesSelected={handleFilesSelected}
                />
                
                <ChatAudioRecorder
                  disabled={isUploading}
                  onAudioRecorded={handleFilesSelected}
                />
                
                <IconButton
                  onClick={handleSend}
                  disabled={isUploading || (contentMessage.trim() === "" && selectedFiles.length === 0)}
                  className={classes.buttonSend}
                >
                  {isUploading ? <CircularProgress size={24} /> : <SendIcon />}
                </IconButton>
              </InputAdornment>
            }
          />
        </FormControl>
      </div>
    </Paper>
  );
}