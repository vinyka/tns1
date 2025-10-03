// Função para criar e exibir o modal
function showModal() {
  // Verifica se o popup já foi exibido
  if (localStorage.getItem('popupShown') === 'true') return;
  if (document.getElementById('custom-notification-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'custom-notification-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.7)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';
  modal.style.backdropFilter = 'blur(5px)';

  modal.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      max-width: 90vw;
      width: 500px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      color: white;
    ">
      <h2 style="
        font-size: 28px;
        margin-bottom: 16px;
        color: #fff;
        font-family: 'Inter', sans-serif;
        font-weight: 700;
      ">ZapRun - Nova Versão</h2>
      
      <p style="
        font-size: 18px;
        margin-bottom: 24px;
        color: #ccc;
        line-height: 1.6;
        font-family: 'Inter', sans-serif;
      ">Descubra a evolução do nosso chat interno. Rápido. Intuitivo. Eficiente. Transforme suas conversas internas. Experiência sem igual.</p>
      
      <button id="modal-redirect-btn" style="
        margin-top: 16px;
        padding: 12px 32px;
        font-size: 16px;
        background: linear-gradient(135deg, #FF9800 0%, #FFB74D 100%);
        border: none;
        border-radius: 8px;
        color: white;
        cursor: pointer;
        font-weight: 600;
        transition: transform 0.2s, box-shadow 0.2s;
        font-family: 'Inter', sans-serif;
      ">Ver Nova Versão</button>
      
      <br><br>
      
      <button onclick="closeModal()" style="
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        font-size: 14px;
        font-family: 'Inter', sans-serif;
        transition: color 0.2s;
      ">Fechar</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Adiciona efeito hover no botão
  const button = document.getElementById('modal-redirect-btn');
  button.onmouseover = () => {
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 4px 12px rgba(0,122,255,0.3)';
  };
  button.onmouseout = () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = 'none';
  };

  // Redireciona para a página de chats
  button.onclick = function() {
    localStorage.setItem('popupShown', 'true');
    window.location.href = 'https://app.zaprun.com.br/chats';
  };
}

// Função para fechar o modal e marcar como exibido
function closeModal() {
  const modal = document.getElementById('custom-notification-modal');
  if (modal) {
    modal.remove();
    // Marca o popup como exibido no localStorage
    localStorage.setItem('popupShown', 'true');
  }
}

// Verifica se deve mostrar o popup
window.addEventListener('load', () => {
  // Pequeno delay para garantir que a página carregou completamente
  setTimeout(showModal, 1000);
}); 