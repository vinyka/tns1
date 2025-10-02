import io from "socket.io-client";

class SocketWorker {
  constructor(companyId , userId) {
    if (!SocketWorker.instance) {
      this.companyId = companyId
      this.userId = userId
      this.socket = null;
      this.configureSocket();
      this.eventListeners = {}; // Armazena os ouvintes de eventos registrados
      SocketWorker.instance = this;

    } 

    return SocketWorker.instance;
  }

  configureSocket() {
    this.socket = io(`${process.env.REACT_APP_BACKEND_URL}/${this?.companyId}` , {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      query: { userId: this.userId }
    });

    this.socket.on("connect", () => {
    });

    this.socket.on("disconnect", () => {
      this.reconnectAfterDelay();
    });
  }

  // Adiciona um ouvinte de eventos
  on(event, callback) {
    this.connect();
    this.socket.on(event, callback);

    // Armazena o ouvinte no objeto de ouvintes
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  // Emite um evento
  emit(event, data) {
    this.connect();
    this.socket.emit(event, data);
  }

  // Desconecta um ou mais ouvintes de eventos
  off(event, callback) {
    this.connect();
    if (this.eventListeners[event]) {
      if (callback) {
        // Desconecta um ouvinte específico
        this.socket.off(event, callback);
        this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
      } else {

        // Desconecta todos os ouvintes do evento
        this.eventListeners[event].forEach(cb => this.socket.off(event, cb));
        delete this.eventListeners[event];
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null
      this.instance = null
    }
  }

  reconnectAfterDelay() {
    setTimeout(() => {
      if (!this.socket || !this.socket.connected) {
        this.connect();
      }
    }, 1000);
  }

  // Garante que o socket esteja conectado
  connect() {
    if (!this.socket) {
      this.configureSocket();
    }
  }

  forceReconnect() {

  }
}

// const instance = (companyId, userId) => new SocketWorker(companyId,userId);
const instance = (companyId, userId) => new SocketWorker(companyId, userId);

export default instance;