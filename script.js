const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

window.addEventListener('DOMContentLoaded', () => {
  appendMessage('bot', '🌿 Selamat datang di Herbal Assistant! Saya siap membantu Anda dengan informasi tentang tanaman herbal, pengobatan tradisional, cara meracik, efek samping, dan dosis penggunaan. Silakan tanyakan apa saja tentang herbal!');
});

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  appendMessage('user', userMessage);
  input.value = '';

  const loadingMsg = appendMessage('bot', '⏳ Memproses pertanyaan Anda...', true);

  try {
    const response = await fetch('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: userMessage }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    
    if (loadingMsg) {
      loadingMsg.remove();
    }
    
    appendMessage('bot', data.output || 'Maaf, saya tidak bisa memproses permintaan Anda.');
  } catch (error) {
    console.error('Error:', error);
    if (loadingMsg) {
      loadingMsg.remove();
    }
    appendMessage('bot', '❌ Maaf, terjadi kesalahan. Pastikan server berjalan dan coba lagi.');
  }
});

function appendMessage(sender, text, isLoading = false) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  
  if (isLoading) {
    msg.classList.add('loading');
  }
  
  msg.innerHTML = text.replace(/\n/g, '<br>');
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

input.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    form.dispatchEvent(new Event('submit'));
  }
});