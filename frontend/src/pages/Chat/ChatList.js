import React, { useContext, useState } from "react";
import {
  Avatar,
  Badge,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  makeStyles,
  Typography,
} from "@material-ui/core";

import { useHistory, useParams } from "react-router-dom";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useDate } from "../../hooks/useDate";

import DeleteIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";
import FiberManualRecordIcon from '@material-ui/icons/FiberManualRecord';

import ConfirmationModal from "../../components/ConfirmationModal";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    height: "calc(100% - 58px)",
    overflow: "hidden",
    borderRadius: 0,
    backgroundColor: theme.palette.type === 'dark' ? "#343a40" : "#f8f9fa",
  },
  chatList: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    padding: theme.spacing(0),
  },
  listItemActive: {
    cursor: "pointer",
    backgroundColor: theme.palette.type === 'dark' ? "#3d4449" : theme.palette.background.paper,
    borderLeft: "4px solid #FF8C00",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: theme.palette.type === 'dark' ? "#454d54" : "rgba(255, 140, 0, 0.08)",
    },
  },
  listItem: {
    cursor: "pointer",
    borderLeft: "4px solid transparent",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: theme.palette.type === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
    },
  },
  chatTitle: {
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    color: theme.palette.type === 'dark' ? "#f8f9fa" : "#212529",
  },
  chatDate: {
    fontSize: "0.75rem",
    color: theme.palette.type === 'dark' ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)",
    marginLeft: "auto",
  },
  messagePreview: {
    color: theme.palette.type === 'dark' ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)",
    fontSize: "0.85rem",
    maxWidth: "75%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  unreadBadge: {
    backgroundColor: "#FF8C00",
    color: "white",
    fontSize: "0.75rem",
    height: 20,
    minWidth: 20,
    marginLeft: theme.spacing(1),
  },
  actionButtons: {
    display: "flex",
    justifyContent: "flex-end",
    padding: "0 16px 8px 16px",
  },
  noChats: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(3),
    color: theme.palette.type === 'dark' ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)",
    height: "100%",
  },
  noChatsIcon: {
    fontSize: 80,
    color: theme.palette.type === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
    marginBottom: theme.spacing(1),
  },
  actionButton: {
    padding: 6,
    color: theme.palette.type === 'dark' ? "#f8f9fa" : "inherit",
  },
  unreadDot: {
    fontSize: 12,
    color: '#FF8C00',
    marginRight: theme.spacing(0.5),
  },
  avatar: {
    backgroundColor: theme.palette.type === 'dark' ? "#FF8C00" : "#FF8C00",
    color: "#fff",
  },
  actionsContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    position: "absolute",
    right: "16px",
    top: "50%",
    transform: "translateY(-50%)",
  },
}));

export default function ChatList({
  chats,
  handleSelectChat,
  handleDeleteChat,
  handleEditChat,
  pageInfo,
  loading,
}) {
  const classes = useStyles();
  const history = useHistory();
  const { user, socket } = useContext(AuthContext);
  const { datetimeToClient } = useDate();

  const [confirmationModal, setConfirmModalOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState({});

  const { id } = useParams();

  const goToMessages = async (chat) => {
    try {
    if (unreadMessages(chat) > 0) {
      try {
        await api.post(`/chats/${chat.id}/read`, { userId: user.id });
        } catch (err) {
          console.error("Erro ao marcar mensagens como lidas:", err);
        }
    }

      // Primeiro selecionar o chat na interface local
      handleSelectChat(chat);
      
      // Depois redirecionar, se o ID atual for diferente
      if (id !== chat.uuid) {
        setTimeout(() => {
          history.push(`/chats/${chat.uuid}`);
        }, 50);
      }
    } catch (err) {
      console.error("Erro ao navegar para mensagens:", err);
    }
  };

  const handleDelete = () => {
    handleDeleteChat(selectedChat);
  };

  const unreadMessages = (chat) => {
    try {
      if (!chat || !chat.users) return 0;
      const currentUser = chat.users.find((u) => u && u.userId === user.id);
      return currentUser?.unreads || 0;
    } catch (error) {
      console.error("Erro ao calcular mensagens nu00e3o lidas:", error);
      return 0;
    }
  };

  const formatDate = (date) => {
    const formattedDate = datetimeToClient(date);
    return formattedDate.split(' ')[1]; // Retorna apenas a hora
  };

  return (
    <>
      <ConfirmationModal
        title={"Excluir Conversa"}
        open={confirmationModal}
        onClose={setConfirmModalOpen}
        onConfirm={handleDelete}
      >
        Esta ação não pode ser revertida, confirmar?
      </ConfirmationModal>
      <div className={classes.mainContainer}>
        <div className={classes.chatList}>
          {Array.isArray(chats) && chats.length > 0 ? (
          <List>
              {chats.map((chat, key) => {
                const unreads = unreadMessages(chat);
                
                return (
                  <React.Fragment key={key}>
                <ListItem
                  onClick={() => goToMessages(chat)}
                      className={chat.uuid === id ? classes.listItemActive : classes.listItem}
                  button
                >
                      <ListItemAvatar>
                        <Avatar className={classes.avatar}>{chat.title ? chat.title.substr(0, 1).toUpperCase() : "C"}</Avatar>
                      </ListItemAvatar>
                  <ListItemText
                        primary={
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <Typography className={classes.chatTitle} noWrap>
                              {unreads > 0 && (
                                <FiberManualRecordIcon className={classes.unreadDot} />
                              )}
                              {chat.title}
                            </Typography>
                          </div>
                        }
                        secondary={
                          <Typography className={classes.messagePreview}>
                            {chat.lastMessage !== ""
                              ? `${chat.lastMessage} - ${formatDate(chat.updatedAt)}`
                              : `Nenhuma mensagem - ${formatDate(chat.updatedAt)}`}
                          </Typography>
                        }
                      />
                      
                      <ListItemSecondaryAction className={classes.actionsContainer}>
                        {unreads > 0 && (
                          <Badge
                            badgeContent={unreads}
                            classes={{ badge: classes.unreadBadge }}
                          />
                        )}
                        
                        {chat.ownerId === user.id && (
                          <>
                            <IconButton
                              className={classes.actionButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectChat(chat);
                                handleEditChat(chat);
                              }}
                              edge="end"
                              aria-label="edit"
                              size="small"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              className={classes.actionButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedChat(chat);
                                setConfirmModalOpen(true);
                              }}
                              edge="end"
                              aria-label="delete"
                              size="small"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </ListItemSecondaryAction>
                </ListItem>
                <Divider component="li" variant="inset" />
              </React.Fragment>
                );
              })}
          </List>
          ) : (
            <div className={classes.noChats}>
              <Typography variant="body1">
                Nenhuma conversa disponível
              </Typography>
              <Typography variant="body2">
                Crie uma nova conversa para começar
              </Typography>
            </div>
          )}
        </div>
      </div>
    </>
  );
}