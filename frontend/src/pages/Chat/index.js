import React, { useContext, useEffect, useRef, useState } from "react";

import { useParams, useHistory } from "react-router-dom";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  makeStyles,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@material-ui/core";
import ChatList from "./ChatList";
import ChatMessages from "./ChatMessages";
import { UsersFilter } from "../../components/UsersFilter";
import api from "../../services/api";
// import { SocketContext } from "../../context/Socket/SocketContext";
import AddIcon from "@material-ui/icons/Add";

import { has, isObject } from "lodash";

import { AuthContext } from "../../context/Auth/AuthContext";
import withWidth, { isWidthUp } from "@material-ui/core/withWidth";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    padding: theme.spacing(2),
    height: `calc(100% - 48px)`,
    overflowY: "hidden",
    border: "none",
    borderRadius: 10,
    backgroundColor: theme.palette.background.default,
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
  },
  gridContainer: {
    flex: 1,
    height: "100%",
    border: "none",
    borderRadius: 8,
    background: theme.palette.background.paper,
    overflow: "hidden",
  },
  gridItem: {
    height: "100%",
  },
  gridItemTab: {
    height: "92%",
    width: "100%",
  },
  btnContainer: {
    textAlign: "right",
    padding: theme.spacing(1.5),
    borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  newButton: {
    borderRadius: 20,
    fontWeight: 500,
    textTransform: "none",
    padding: theme.spacing(0.8, 2),
    backgroundColor: "#FF8C00",
    color: "#fff",
    boxShadow: "0 2px 5px rgba(255, 140, 0, 0.3)",
    '&:hover': {
      backgroundColor: "#E67E00",
      boxShadow: "0 4px 8px rgba(255, 140, 0, 0.4)",
    },
  },
  chatListTitle: {
    fontWeight: 500,
    fontSize: '1.1rem',
    color: theme.palette.type === 'dark' ? '#f8f9fa' : theme.palette.text.primary,
  },
  dialogPaper: {
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: '450px',
  },
  dialogTitle: {
    backgroundColor: theme.palette.type === 'dark' ? '#343a40' : '#f8f9fa',
    color: theme.palette.type === 'dark' ? '#f8f9fa' : '#343a40',
    borderBottom: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
    padding: theme.spacing(1.5, 2),
  },
  dialogContent: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.type === 'dark' ? '#2d3238' : '#ffffff',
  },
  dialogActions: {
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.type === 'dark' ? '#343a40' : '#f8f9fa',
    borderTop: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
  },
  textField: {
    '& .MuiOutlinedInput-root': {
      borderRadius: 8,
      '&.Mui-focused fieldset': {
        borderColor: '#FF8C00',
      },
    },
    '& .MuiInputLabel-outlined.Mui-focused': {
      color: '#FF8C00',
    },
  },
  saveButton: {
    backgroundColor: '#FF8C00',
    color: '#fff',
    '&:hover': {
      backgroundColor: '#E67E00',
    },
    '&.Mui-disabled': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255, 140, 0, 0.3)' : 'rgba(255, 140, 0, 0.5)',
      color: theme.palette.type === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.8)',
    },
    borderRadius: 20,
    textTransform: 'none',
    padding: theme.spacing(0.8, 2),
  },
  cancelButton: {
    color: theme.palette.type === 'dark' ? '#f8f9fa' : '#343a40',
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    },
    borderRadius: 20,
    textTransform: 'none',
  },
}));

export function ChatModal({
  open,
  chat,
  type,
  handleClose,
  handleLoadNewChat,
  handleUpdateChat,
}) {
  const classes = useStyles();
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState("");
  const { user } = useContext(AuthContext);

  useEffect(() => {
    setTitle("");
    setUsers([]);
    if (type === "edit") {
      const userList = chat.users.map((u) => ({
        id: u.user.id,
        name: u.user.name,
      }));
      setUsers(userList);
      setTitle(chat.title);
    }
  }, [chat, open, type]);

  const handleSave = async () => {
    try {
      // Adicionar estado de loading no salvamento para evitar múltiplos cliques
      const btnSave = document.querySelector('[data-btn-save="true"]');
      if (btnSave) btnSave.disabled = true;
      
      if (type === "edit") {
        const { data } = await api.put(`/chats/${chat.id}`, {
          users,
          title,
        });
        
        // Após editar o chat, atualizar a interface
        if (data) {
          handleUpdateChat(data);
        }
      } else {
        const { data } = await api.post("/chats", {
          users,
          title,
        });
        
        // Após criar o chat, notificar todos os participantes
        if (data) {
        handleLoadNewChat(data);
          
          // Se o usuário não estiver na lista de participantes, adicione-o
          if (!users.find(u => u.id === user.id)) {
            users.push({
              id: user.id,
              name: user.name
            });
          }
        }
      }
      handleClose();
    } catch (err) {
      console.error("Erro ao salvar chat:", err);
      alert("Ocorreu um erro ao salvar o chat. Tente novamente.");
    } finally {
      // Restaurar o botão, independente do resultado
      const btnSave = document.querySelector('[data-btn-save="true"]');
      if (btnSave) btnSave.disabled = false;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      maxWidth="sm"
      fullWidth
      classes={{ paper: classes.dialogPaper }}
    >
      <DialogTitle 
        id="alert-dialog-title" 
        className={classes.dialogTitle}
      >
        {type === "new" ? "Nova Conversa" : "Editar Conversa"}
      </DialogTitle>
      <DialogContent className={classes.dialogContent}>
        <Grid spacing={3} container>
          <Grid xs={12} style={{ marginTop: 8 }} item>
            <TextField
              label="Título da Conversa"
              placeholder="Digite um título para a conversa"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              variant="outlined"
              size="small"
              fullWidth
              className={classes.textField}
            />
          </Grid>
          <Grid xs={12} item>
            <Typography variant="subtitle1" style={{ marginBottom: 8 }}>
              Participantes
            </Typography>
            <UsersFilter
              onFiltered={(users) => setUsers(users)}
              initialUsers={users}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions className={classes.dialogActions}>
        <Button 
          onClick={handleClose} 
          className={classes.cancelButton}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          className={classes.saveButton}
          variant="contained"
          data-btn-save="true"
          disabled={users === undefined || users.length === 0 || title === null || title === "" || title === undefined}
        >
          {type === "new" ? "Criar" : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Chat(props) {
  const classes = useStyles();
  const { user, socket } = useContext(AuthContext);
  const history = useHistory();

  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState("new");
  const [currentChat, setCurrentChat] = useState({});
  const [chats, setChats] = useState([]);
  const [chatsPageInfo, setChatsPageInfo] = useState({ hasMore: false });
  const [messages, setMessages] = useState([]);
  const [messagesPageInfo, setMessagesPageInfo] = useState({ hasMore: false });
  const [messagesPage, setMessagesPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const isMounted = useRef(true);
  const scrollToBottomRef = useRef();
  const { id } = useParams();

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (isMounted.current) {
      findChats().then((data) => {
        const { records } = data;
        if (records.length > 0) {
          setChats(records);
          setChatsPageInfo(data);

          if (id && records.length) {
            const chat = records.find((r) => r.uuid === id);
            selectChat(chat);
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isObject(currentChat) && has(currentChat, "id")) {
      findMessages(currentChat.id).then(() => {
        if (typeof scrollToBottomRef.current === "function") {
          setTimeout(() => {
            scrollToBottomRef.current();
          }, 300);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChat]);

  useEffect(() => {
    const companyId = user.companyId;

    const onChatUser = (data) => {
      if (!data) return;
      
      if (data.action === "create" && data.record) {
        // Adicionar o novo chat ao início da lista
        setChats((prev) => [data.record, ...prev]);
      }
      
      if (data.action === "update" && data.record) {
        const changedChats = chats.map((chat) => {
          if (chat && chat.id === data.record.id) {
            // Atualizar também o chat atual se for o mesmo que está sendo editado
            if (currentChat && currentChat.id === data.record.id) {
            setCurrentChat(data.record);
            }
            return {
              ...data.record,
            };
          }
          return chat;
        });
        setChats(changedChats);
      }
    }
    
    const onChat = (data) => {
      if (!data) return;
      
      if (data.action === "delete" && data.id) {
        const filteredChats = chats.filter((c) => c && c.id !== +data.id);
        setChats(filteredChats);
        
        // Verificar se o chat atual foi excluído
        if (currentChat && currentChat.id === +data.id) {
        setMessages([]);
        setMessagesPage(1);
        setMessagesPageInfo({ hasMore: false });
        setCurrentChat({});
          
          // Adicionar um pequeno atraso antes do redirecionamento
          // para garantir que os estados sejam atualizados primeiro
          setTimeout(() => {
        history.push("/chats");
          }, 100);
        }
      }
      
      // Adicionar tratamento para novas mensagens em qualquer chat
      if (data.action === "new-message" && data.chatId) {
        // Atualizar a lista de chats com as informações atualizadas
        updateChatWithNewMessage(data.chatId, data.newMessage, data.chat);
      }
      
      // Adicionar tratamento para atualizações de status em qualquer chat
      if (data.action === "status-update" && data.chatId) {
        updateChatStatus(data.chatId, data.status);
      }
    }

    const onCurrentChat = (data) => {
      if (!data) return;
      
      if (data.action === "new-message" && data.newMessage) {
        // Atualizar mensagens apenas se for o chat atual
        if (currentChat && currentChat.id === data.newMessage.chatId) {
        setMessages((prev) => [...prev, data.newMessage]);
          if (typeof scrollToBottomRef.current === "function") {
            scrollToBottomRef.current();
          }
        }
        
        // Atualizar a lista de chats com as informações do novo chat
        updateChatWithNewMessage(data.newMessage.chatId, data.newMessage, data.chat);
      }

      if (data.action === "update" && data.chat) {
        const changedChats = chats.map((chat) => {
          if (chat && chat.id === data.chat.id) {
            return {
              ...data.chat,
            };
          }
          return chat;
        });
        setChats(changedChats);
        if (typeof scrollToBottomRef.current === "function") {
        scrollToBottomRef.current();
      }
      }
    }
    
    // Função para atualizar o chat com nova mensagem
    const updateChatWithNewMessage = (chatId, newMessage, updatedChat) => {
      if (!chatId || !newMessage) return;
      
      // Atualizar a lista de chats para mostrar a nova mensagem mesmo em chats inativos
      setChats((prevChats) => {
        return prevChats.map((chat) => {
          if (chat && chat.id === chatId) {
            // Determinar se devemos incrementar as mensagens não lidas
            const isCurrentChat = currentChat && currentChat.id === chatId;
            const shouldIncrementUnreads = !isCurrentChat;
            
            // Se estamos no chat atual, marcar como lido automaticamente
            if (isCurrentChat) {
              // Chamada assíncrona para marcar como lido no backend
              if (chat.unreads > 0) {
                markChatAsRead(chatId).catch(console.error);
              }
            }
            
            // Se temos o chat atualizado do servidor, usá-lo
            if (updatedChat) {
              return {
                ...updatedChat,
                lastMessage: newMessage.message || "(Arquivo)",
                lastMessageTime: newMessage.createdAt,
                // Incrementar contador de não lidos apenas se não for o chat atual
                unreads: shouldIncrementUnreads ? (chat.unreads || 0) + 1 : 0
              };
            } else {
              // Caso contrário, atualizar apenas os campos necessários
              return {
                ...chat,
                lastMessage: newMessage.message || "(Arquivo)",
                lastMessageTime: newMessage.createdAt,
                // Incrementar contador de não lidos apenas se não for o chat atual
                unreads: shouldIncrementUnreads ? (chat.unreads || 0) + 1 : 0
              };
            }
          }
          return chat;
        });
      });
    };
    
    // Função para atualizar status de um chat
    const updateChatStatus = (chatId, status) => {
      if (!chatId) return;
      
      setChats((prevChats) => {
        return prevChats.map((chat) => {
          if (chat && chat.id === chatId) {
            return {
              ...chat,
              status: status
            };
          }
          return chat;
        });
      });
    };

    // Configurar ouvintes de socket
    socket.on(`company-${companyId}-chat-user-${user.id}`, onChatUser);
    socket.on(`company-${companyId}-chat`, onChat);
    
    // Ouvinte específico para o chat atual
    if (isObject(currentChat) && has(currentChat, "id")) {
      socket.on(`company-${companyId}-chat-${currentChat.id}`, onCurrentChat);
    }
    
    // Adicionar ouvintes para todos os chats para receber atualizações em tempo real
    chats.forEach(chat => {
      if (chat.id !== currentChat.id) {
        socket.on(`company-${companyId}-chat-${chat.id}`, (data) => {
          // Precisamos tratar apenas atualizações de status e novas mensagens
          if (data.action === "new-message") {
            updateChatWithNewMessage(chat.id, data.newMessage, data.chat);
          }
          if (data.action === "update") {
            updateChatStatus(chat.id, data.status);
          }
        });
      }
    });

    return () => {
      // Remover todos os ouvintes
      socket.off(`company-${companyId}-chat-user-${user.id}`, onChatUser);
      socket.off(`company-${companyId}-chat`, onChat);
      
      if (isObject(currentChat) && has(currentChat, "id")) {
        socket.off(`company-${companyId}-chat-${currentChat.id}`, onCurrentChat);
      }
      
      // Remover ouvintes de todos os chats
      chats.forEach(chat => {
        if (chat.id !== currentChat.id) {
          socket.off(`company-${companyId}-chat-${chat.id}`);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChat, chats]);

  const selectChat = (chat) => {
    try {
      if (!chat || !chat.id) {
        console.error('Chat indefinido ou sem ID');
        return;
      }
      
      setMessages([]);
      setMessagesPage(1);
      setCurrentChat(chat);
      setTab(1);
      
      // Marcar mensagens como lidas explicitamente quando selecionar um chat
      markChatAsRead(chat.id);
        
      // Atualizar contagem de mensagens não lidas localmente
      const updatedChats = chats.map(c => {
        if (c && c.id === chat.id) {
          return { ...c, unreads: 0 };
        }
        return c;
      });
      setChats(updatedChats);
    } catch (err) {
      console.error('Erro ao selecionar chat:', err);
    }
  };

  // Função para marcar chat como lido
  const markChatAsRead = async (chatId) => {
    try {
      await api.post(`/chats/${chatId}/read`, { userId: user.id });
    } catch (err) {
      console.error('Erro ao marcar chat como lido:', err);
    }
  };

  const sendMessage = async (contentMessage) => {
    setLoading(true);
    try {
      await api.post(`/chats/${currentChat.id}/messages`, {
        message: contentMessage,
      });
    } catch (err) { }
    setLoading(false);
  };

  const deleteChat = async (chat) => {
    try {
      await api.delete(`/chats/${chat.id}`);
      // O socket se encarregará de atualizar a interface após a exclusão
    } catch (err) {
      console.error("Erro ao excluir chat:", err);
      alert("Não foi possível excluir o chat. Tente novamente.");
    }
  };

  const updateChat = (updatedChat) => {
    // Atualizar o chat localmente
    const updatedChats = chats.map(chat => {
      if (chat.id === updatedChat.id) {
        return updatedChat;
      }
      return chat;
    });
    
    setChats(updatedChats);
    
    // Se o chat atualmente selecionado for o mesmo que está sendo editado, atualizá-lo
    if (currentChat.id === updatedChat.id) {
      setCurrentChat(updatedChat);
    }
  };

  const findMessages = async (chatId) => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/chats/${chatId}/messages?pageNumber=${messagesPage}`
      );
      setMessagesPage((prev) => prev + 1);
      setMessagesPageInfo(data);
      setMessages((prev) => [...data.records, ...prev]);
    } catch (err) { }
    setLoading(false);
  };

  const loadMoreMessages = async () => {
    if (!loading) {
      findMessages(currentChat.id);
    }
  };

  // Adicionar função para atualizar mensagens em tempo real
  const handleMessagesUpdate = (updatedMessages) => {
    setMessages(updatedMessages);
  };

  const findChats = async () => {
    try {
      const { data } = await api.get("/chats");
      return data;
    } catch (err) {
      console.log(err);
    }
  };

  const renderGrid = () => {
    return (
      <Grid className={classes.gridContainer} container>
        <Grid className={classes.gridItem} md={3} item>
          <div className={classes.btnContainer}>
            <Typography className={classes.chatListTitle}>
              Conversas
            </Typography>
            <Button
              onClick={() => {
                setDialogType("new");
                setShowDialog(true);
              }}
              className={classes.newButton}
              variant="contained"
              startIcon={<AddIcon style={{ fontSize: 18 }} />}
            >
              Nova
            </Button>
          </div>
          <ChatList
            chats={chats}
            pageInfo={chatsPageInfo}
            loading={loading}
            handleSelectChat={(chat) => selectChat(chat)}
            handleDeleteChat={(chat) => deleteChat(chat)}
            handleEditChat={(chat) => {
              setCurrentChat(chat);
              setDialogType("edit");
              setShowDialog(true);
            }}
          />
        </Grid>
        <Grid className={classes.gridItem} md={9} item>
          {isObject(currentChat) && has(currentChat, "id") && (
            <ChatMessages
              chat={currentChat}
              scrollToBottomRef={scrollToBottomRef}
              pageInfo={messagesPageInfo}
              messages={messages}
              loading={loading}
              handleSendMessage={sendMessage}
              handleLoadMore={loadMoreMessages}
              onMessagesUpdate={handleMessagesUpdate}
            />
          )}
        </Grid>
      </Grid>
    );
  };

  const renderTab = () => {
    return (
      <Grid className={classes.gridContainer} container>
        <Grid md={12} item>
          <Tabs
            value={tab}
            indicatorColor="primary"
            textColor="primary"
            onChange={(e, v) => setTab(v)}
            aria-label="disabled tabs example"
          >
            <Tab label="Chats" />
            <Tab label="Mensagens" />
          </Tabs>
        </Grid>
        {tab === 0 && (
          <Grid className={classes.gridItemTab} md={12} item>
            <div className={classes.btnContainer}>
              <Typography className={classes.chatListTitle}>
                Conversas
              </Typography>
              <Button
                onClick={() => {
                  setDialogType("new");
                  setShowDialog(true);
                }}
                className={classes.newButton}
                variant="contained"
                startIcon={<AddIcon style={{ fontSize: 18 }} />}
              >
                Nova
              </Button>
            </div>
            <ChatList
              chats={chats}
              pageInfo={chatsPageInfo}
              loading={loading}
              handleSelectChat={(chat) => selectChat(chat)}
              handleDeleteChat={(chat) => deleteChat(chat)}
              handleEditChat={(chat) => {
                setCurrentChat(chat);
                setDialogType("edit");
                setShowDialog(true);
              }}
            />
          </Grid>
        )}
        {tab === 1 && (
          <Grid className={classes.gridItemTab} md={12} item>
            {isObject(currentChat) && has(currentChat, "id") && (
              <ChatMessages
                scrollToBottomRef={scrollToBottomRef}
                pageInfo={messagesPageInfo}
                messages={messages}
                loading={loading}
                handleSendMessage={sendMessage}
                handleLoadMore={loadMoreMessages}
                onMessagesUpdate={handleMessagesUpdate}
                chat={currentChat}
              />
            )}
          </Grid>
        )}
      </Grid>
    );
  };

  return (
    <>
      <ChatModal
        type={dialogType}
        open={showDialog}
        chat={currentChat}
        handleLoadNewChat={(data) => {
          // Quando um novo chat é criado, atualize-o localmente e também adicione-o à lista de chats
          setMessages([]);
          setMessagesPage(1);
          setCurrentChat(data);
          setTab(1);
          
          // Adicionar o novo chat ao início da lista
          setChats((prev) => [data, ...prev]);
          
          history.push(`/chats/${data.uuid}`);
        }}
        handleUpdateChat={(data) => {
          // Quando um chat é editado, atualize-o localmente
          updateChat(data);
        }}
        handleClose={() => setShowDialog(false)}
      />
      <Paper className={classes.mainContainer}>
        {isWidthUp("md", props.width) ? renderGrid() : renderTab()}
      </Paper>
    </>
  );
}

export default withWidth()(Chat);