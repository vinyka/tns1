import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import api from "../../services/api";

export function ChatModal({
  open,
  chat,
  type,
  handleClose,
  handleLoadNewChat,
  handleUpdateChat,
}) {
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState("");
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTitle("");
    setUsers([]);
    if (type === "edit" && chat && chat.users) {
      const userList = chat.users.map((u) => ({
        id: u.user.id,
        name: u.user.name,
      }));
      setUsers(userList);
      setTitle(chat.title || "");
    }
  }, [chat, open, type]);

  const handleSave = async () => {
    setLoading(true);
    try {
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
        }
      }
      setLoading(false);
      handleClose();
    } catch (err) {
      setLoading(false);
      console.error("Erro ao salvar chat:", err);
      alert("Ocorreu um erro ao salvar o chat. Tente novamente.");
    }
  };
} 