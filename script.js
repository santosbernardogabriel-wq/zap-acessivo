/* ==========================================
   ARQUIVO: script.js
   ZapAcessível - Com Tradutor e Chat de Voz
   ========================================== */

// Lista de Contatos
let contacts = [
    {
      id: 1,
      name: "Ana Silva (Acessibilidade)",
      avatar: "A",
      status: "Online",
      unread: 0,
      messages: [
        { id: 101, sender: "them", text: "Olá! Seja bem-vindo ao ZapAcessível. Como posso ajudar você hoje?", time: "09:30" },
        { id: 102, sender: "me", text: "Oi Ana! Estou testando a tradução e o assistente de voz.", time: "09:31" },
        { id: 103, sender: "them", text: "Excelente! Experimente clicar na ferramenta de tradução ou usar o Chat por Voz para ouvir tudo automaticamente.", time: "09:32" }
      ]
    },
    {
      id: 2,
      name: "Carlos Eduardo",
      avatar: "C",
      status: "Visto por último às 08:15",
      unread: 1,
      messages: [
        { id: 201, sender: "them", text: "Ficou ótimo para quem usa leitores de tela!", time: "08:15" }
      ]
    },
    {
      id: 3,
      name: "Grupo Trabalho Inclusivo",
      avatar: "G",
      status: "Maria, João, Lucas, Você",
      unread: 0,
      messages: [
        { id: 301, sender: "them", text: "Reunião de acessibilidade agendada para 14:00.", time: "Ontem" }
      ]
    }
  ];
  
  // Estado da Aplicação
  let activeChatId = 1;
  let currentTheme = "light";
  let fontSizeBase = 15;
  let isRecording = false;
  let isContinuousVoiceChatActive = false;
  
  // Dicionário offline para simulação rápida de tradução
  const translationDictionary = {
    "en": {
      "Olá! Seja bem-vindo ao ZapAcessível. Como posso ajudar você hoje?": "Hello! Welcome to ZapAcessível. How can I help you today?",
      "Oi Ana! Estou testando a tradução e o assistente de voz.": "Hi Ana! I am testing translation and the voice assistant.",
      "Excelente! Experimente clicar na ferramenta de tradução ou usar o Chat por Voz para ouvir tudo automaticamente.": "Great! Try clicking the translation tool or using Voice Chat to hear everything automatically.",
      "Ficou ótimo para quem usa leitores de tela!": "It turned out great for screen reader users!",
      "Reunião de acessibilidade agendada para 14:00.": "Accessibility meeting scheduled for 2:00 PM."
    },
    "es": {
      "Olá! Seja bem-vindo ao ZapAcessível. Como posso ajudar você hoje?": "¡Hola! Bienvenido a ZapAcessível. ¿Cómo posso ayudarte hoy?",
      "Oi Ana! Estou testando a tradução e o assistente de voz.": "¡Hola Ana! Estoy probando la traducción y el asistente de voz.",
      "Excelente! Experimente clicar na ferramenta de tradução ou usar o Chat por Voz para ouvir tudo automaticamente.": "¡Excelente! Prueba hacer clic en la herramienta de traducción o usar el Chat de Voz para escuchar todo automáticamente.",
      "Ficou ótimo para quem usa leitores de tela!": "¡Quedó genial para quienes usan lectores de pantalla!",
      "Reunião de acessibilidade agendada para 14:00.": "Reunión de accesibilidad programada para las 14:00."
    }
  };
  
  // Motores de Voz e Reconhecimento
  const synth = window.speechSynthesis;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;
  }
  
  // Elementos da DOM
  const chatListEl = document.getElementById('chat-list');
  const messagesContainerEl = document.getElementById('messages-container');
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  const searchInput = document.getElementById('search-input');
  const autoTtsToggle = document.getElementById('auto-tts-toggle');
  const srAnnouncer = document.getElementById('sr-announcer');
  
  const modalShortcuts = document.getElementById('modal-shortcuts');
  const modalCall = document.getElementById('modal-call');
  const emojiPicker = document.getElementById('emoji-picker');
  const appContainer = document.getElementById('app-container');
  
  // Inicialização
  document.addEventListener('DOMContentLoaded', () => {
    renderChatList();
    selectChat(activeChatId);
    setupEventListeners();
    setupKeyboardShortcuts();
  });
  
  // Anúncios para leitores de tela (Accessibility Live Region)
  function announceToSR(message) {
    if (!srAnnouncer) return;
    srAnnouncer.textContent = '';
    setTimeout(() => {
      srAnnouncer.textContent = message;
    }, 100);
  }
  
  // Emissão de Bipes Sonoros (Auditory Feedback)
  function playBeep(freq = 440, type = 'sine', duration = 0.1) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }
  
  // Renderização da Lista de Contatos
  function renderChatList(filter = '') {
    chatListEl.innerHTML = '';
    const filtered = contacts.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
  
    if (filtered.length === 0) {
      chatListEl.innerHTML = `<li style="padding:15px; text-align:center; color:var(--text-secondary)">Nenhum contato encontrado</li>`;
      return;
    }
  
    filtered.forEach(contact => {
      const lastMsg = contact.messages[contact.messages.length - 1];
      const lastText = lastMsg ? lastMsg.text : 'Nenhuma mensagem';
      const lastTime = lastMsg ? lastMsg.time : '';
  
      const li = document.createElement('li');
      li.className = `chat-item ${contact.id === activeChatId ? 'active' : ''}`;
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-label', `Conversa com ${contact.name}. ${contact.unread > 0 ? contact.unread + ' mensagens não lidas.' : ''} Última mensagem: ${lastText}`);
  
      li.innerHTML = `
        <div class="avatar" aria-hidden="true">${contact.avatar}</div>
        <div class="chat-item-details">
          <div class="chat-item-header">
            <span class="chat-item-name">${contact.name}</span>
            <span class="chat-item-time">${lastTime}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="chat-item-lastmsg">${lastText}</span>
            ${contact.unread > 0 ? `<span class="unread-badge" aria-hidden="true">${contact.unread}</span>` : ''}
          </div>
        </div>
      `;
  
      li.addEventListener('click', () => selectChat(contact.id));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectChat(contact.id);
        }
      });
  
      chatListEl.appendChild(li);
    });
  }
  
  // Seleção de Contato
  function selectChat(contactId) {
    activeChatId = contactId;
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
  
    contact.unread = 0;
  
    document.getElementById('current-chat-name').textContent = contact.name;
    document.getElementById('current-chat-status').textContent = contact.status;
    document.getElementById('current-chat-avatar').textContent = contact.avatar;
  
    appContainer.classList.add('mobile-chat-open');
  
    renderMessages();
    renderChatList(searchInput.value);
    announceToSR(`Conversa com ${contact.name} aberta.`);
  }
  
  // Renderização das Mensagens no Chat
  function renderMessages() {
    messagesContainerEl.innerHTML = '';
    const contact = contacts.find(c => c.id === activeChatId);
    if (!contact) return;
  
    contact.messages.forEach(msg => {
      const isMe = msg.sender === 'me';
      const bubble = document.createElement('article');
      bubble.className = `message-bubble ${isMe ? 'sent' : 'received'}`;
      bubble.setAttribute('tabindex', '0');
      bubble.setAttribute('aria-label', `${isMe ? 'Você disse' : contact.name + ' disse'}: ${msg.text} às ${msg.time}`);
  
      bubble.innerHTML = `
        <div class="message-text">${msg.text}</div>
        <div class="message-footer">
          <span>${msg.time}</span>
          ${isMe ? '<i class="bi bi-check2-all check-icon" aria-label="Entregue e lida"></i>' : ''}
          <button class="btn-tts-read" title="Ouvir Mensagem" aria-label="Ouvir esta mensagem em voz alta">
            <i class="bi bi-volume-up"></i>
          </button>
          <button class="btn-translate" title="Traduzir Mensagem" aria-label="Traduzir mensagem">
            <i class="bi bi-translate"></i>
          </button>
        </div>
      `;
  
      // Botão de Leitura individual
      const ttsBtn = bubble.querySelector('.btn-tts-read');
      ttsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speakText(msg.text);
      });
  
      // Ferramenta de Tradução individual
      const translateBtn = bubble.querySelector('.btn-translate');
      translateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        translateMessage(msg, bubble);
      });
  
      messagesContainerEl.appendChild(bubble);
    });
  
    messagesContainerEl.scrollTop = messagesContainerEl.scrollHeight;
  }
  
  // Envio de Mensagens
  function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;
  
    const contact = contacts.find(c => c.id === activeChatId);
    if (!contact) return;
  
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
    const newMsg = {
      id: Date.now(),
      sender: 'me',
      text: text,
      time: timeStr
    };
  
    contact.messages.push(newMsg);
    messageInput.value = '';
    renderMessages();
    renderChatList();
    playBeep(600, 'sine', 0.08);
    announceToSR("Mensagem enviada.");
  
    setTimeout(() => {
      simulateIncomingResponse(contact);
    }, 1500);
  }
  
  // Simulação de Resposta do Contato
  function simulateIncomingResponse(contact) {
    const responses = [
      "Recebi sua mensagem! Como posso te ajudar com a acessibilidade hoje?",
      "Entendido perfeitamente.",
      "Isso é ótimo! O sistema está funcionando muito bem.",
      "Obrigado pelo contato!"
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
    const replyMsg = {
      id: Date.now(),
      sender: 'them',
      text: randomResponse,
      time: timeStr
    };
  
    contact.messages.push(replyMsg);
  
    if (activeChatId === contact.id) {
      renderMessages();
    } else {
      contact.unread++;
    }
  
    renderChatList();
    playBeep(800, 'sine', 0.15);
  
    if (autoTtsToggle && autoTtsToggle.checked) {
      speakText(`${contact.name} diz: ${randomResponse}`);
    } else {
      announceToSR(`Nova mensagem de ${contact.name}: ${randomResponse}`);
    }
  
    // Se o Modo Chat de Voz Contínuo estiver ligado, responde em voz alta e ativa o microfone novamente
    if (isContinuousVoiceChatActive) {
      speakText(`${contact.name} respondeu: ${randomResponse}`, () => {
        setTimeout(() => startVoiceChatMode(), 500);
      });
    }
  }
  
  // Ferramenta de Tradução
  function translateMessage(msg, bubbleElement) {
    const langChoice = prompt("Para qual idioma deseja traduzir? Digite 'en' para Inglês ou 'es' para Espanhol:", "en");
    if (!langChoice) return;
  
    const targetLang = langChoice.toLowerCase().trim();
    let translatedText = "";
  
    if (translationDictionary[targetLang] && translationDictionary[targetLang][msg.text]) {
      translatedText = translationDictionary[targetLang][msg.text];
    } else {
      // Simulação de tradução automática dinâmica caso o texto não esteja no dicionário
      if (targetLang === 'en') {
        translatedText = `[EN] ${msg.text}`;
      } else if (targetLang === 'es') {
        translatedText = `[ES] ${msg.text}`;
      } else {
        translatedText = `[Traduzido] ${msg.text}`;
      }
    }
  
    const textElement = bubbleElement.querySelector('.message-text');
    textElement.innerHTML = `<div>${msg.text}</div><div style="font-size:0.85em; opacity:0.85; margin-top:4px; font-style:italic; border-top:1px dashed currentColor; padding-top:4px;">🌐 <strong>Tradução (${targetLang.toUpperCase()}):</strong> ${translatedText}</div>`;
  
    speakText(`Tradução para ${targetLang === 'en' ? 'Inglês' : 'Espanhol'}: ${translatedText}`, null, targetLang === 'en' ? 'en-US' : (targetLang === 'es' ? 'es-ES' : 'pt-BR'));
    announceToSR(`Mensagem traduzida para ${targetLang}: ${translatedText}`);
  }
  
  // Síntese de Voz (Text-to-Speech)
  function speakText(text, onEndCallback = null, lang = 'pt-BR') {
    if (!synth) {
      alert("Seu navegador não suporta Síntese de Voz.");
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
  
    if (onEndCallback) {
      utterance.onend = onEndCallback;
    }
  
    synth.speak(utterance);
  }
  
  // Leitura do Chat Completo
  function readFullChat() {
    const contact = contacts.find(c => c.id === activeChatId);
    if (!contact || contact.messages.length === 0) return;
  
    const fullText = contact.messages.map(m => `${m.sender === 'me' ? 'Você' : contact.name}: ${m.text}`).join('. ');
    speakText(`Histórico de conversas com ${contact.name}. ${fullText}`);
  }
  
  // Ditado por Voz Simples (Speech-to-Text)
  function toggleSpeechRecognition() {
    if (!recognition) {
      alert("Reconhecimento de voz não é suportado neste navegador.");
      return;
    }
  
    const micBtn = document.getElementById('btn-speech-input');
  
    if (isRecording) {
      recognition.stop();
      isRecording = false;
      if (micBtn) micBtn.classList.remove('recording');
      announceToSR("Ditado por voz encerrado.");
    } else {
      try {
        recognition.start();
        isRecording = true;
        if (micBtn) micBtn.classList.add('recording');
        announceToSR("Fale agora. Seu áudio será convertido em texto.");
      } catch (err) {
        console.error(err);
      }
    }
  
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      messageInput.value += (messageInput.value ? ' ' : '') + transcript;
      if (micBtn) micBtn.classList.remove('recording');
      isRecording = false;
      announceToSR(`Texto ditado inserido: ${transcript}`);
    };
  
    recognition.onerror = () => {
      if (micBtn) micBtn.classList.remove('recording');
      isRecording = false;
      announceToSR("Erro ao detectar som do microfone.");
    };
  
    recognition.onend = () => {
      if (micBtn) micBtn.classList.remove('recording');
      isRecording = false;
    };
  }
  
  // FERRAMENTA PARA DEFICIENTES VISUAIS: CHAT DE VOZ CONTINUO (Hands-Free Voice Chat)
  function startVoiceChatMode() {
    if (!recognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }
  
    isContinuousVoiceChatActive = true;
    announceToSR("Modo de conversa por voz ativo. Fale sua mensagem agora.");
    playBeep(880, 'sine', 0.2);
  
    try {
      recognition.start();
    } catch (e) {}
  
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      messageInput.value = transcript;
      announceToSR(`Você disse: ${transcript}. Enviando mensagem...`);
      sendMessage();
    };
  
    recognition.onerror = (e) => {
      announceToSR("Não entendi o que você disse. Tente novamente.");
      isContinuousVoiceChatActive = false;
    };
  }
  
  // Configuração dos Eventos dos Botões
  function setupEventListeners() {
    messageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage();
    });
  
    searchInput.addEventListener('input', (e) => {
      renderChatList(e.target.value);
    });
  
    const btnSpeech = document.getElementById('btn-speech-input');
    if (btnSpeech) btnSpeech.addEventListener('click', toggleSpeechRecognition);
  
    const btnReadChat = document.getElementById('btn-read-chat');
    if (btnReadChat) btnReadChat.addEventListener('click', readFullChat);
  
    // Botão dedicado ao Chat de Voz para Deficientes Visuais
    const btnVoiceChat = document.getElementById('btn-voice-chat');
    if (btnVoiceChat) {
      btnVoiceChat.addEventListener('click', () => {
        speakText("Modo assistente de voz ativado. Fale após o sinal sonoro.", () => {
          startVoiceChatMode();
        });
      });
    }
  
    // Alternador de Temas
    const btnTheme = document.getElementById('btn-theme');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        if (currentTheme === 'light') {
          currentTheme = 'dark';
          document.body.setAttribute('data-theme', 'dark');
          announceToSR("Modo escuro ativado.");
        } else if (currentTheme === 'dark') {
          currentTheme = 'high-contrast';
          document.body.setAttribute('data-theme', 'high-contrast');
          announceToSR("Modo de Alto Contraste ativado.");
        } else {
          currentTheme = 'light';
          document.body.removeAttribute('data-theme');
          announceToSR("Modo claro ativado.");
        }
      });
    }
  
    // Ajuste de Tamanho da Fonte
    const btnFontInc = document.getElementById('btn-font-increase');
    if (btnFontInc) {
      btnFontInc.addEventListener('click', () => {
        if (fontSizeBase < 24) {
          fontSizeBase += 2;
          document.documentElement.style.setProperty('--font-base', `${fontSizeBase}px`);
          announceToSR(`Tamanho do texto aumentado para ${fontSizeBase} pixels.`);
        }
      });
    }
  
    const btnFontDec = document.getElementById('btn-font-decrease');
    if (btnFontDec) {
      btnFontDec.addEventListener('click', () => {
        if (fontSizeBase > 12) {
          fontSizeBase -= 2;
          document.documentElement.style.setProperty('--font-base', `${fontSizeBase}px`);
          announceToSR(`Tamanho do texto diminuído para ${fontSizeBase} pixels.`);
        }
      });
    }
  
    const btnBack = document.getElementById('btn-back-sidebar');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        appContainer.classList.remove('mobile-chat-open');
        announceToSR("Voltando para a lista de conversas.");
      });
    }
  
    // Painel de Emojis
    const emojiBtn = document.getElementById('btn-emoji-toggle');
    if (emojiBtn && emojiPicker) {
      emojiBtn.addEventListener('click', () => {
        const isHidden = emojiPicker.classList.contains('hidden');
        if (isHidden) {
          emojiPicker.classList.remove('hidden');
          emojiBtn.setAttribute('aria-expanded', 'true');
        } else {
          emojiPicker.classList.add('hidden');
          emojiBtn.setAttribute('aria-expanded', 'false');
        }
      });
  
      document.querySelectorAll('.btn-emoji').forEach(btn => {
        btn.addEventListener('click', () => {
          messageInput.value += btn.textContent;
          emojiPicker.classList.add('hidden');
          emojiBtn.setAttribute('aria-expanded', 'false');
          messageInput.focus();
        });
      });
    }
  
    // Modais
    const btnShortcuts = document.getElementById('btn-shortcuts');
    if (btnShortcuts) {
      btnShortcuts.addEventListener('click', () => {
        if (modalShortcuts) {
          modalShortcuts.classList.remove('hidden');
          document.getElementById('btn-close-shortcuts').focus();
        }
      });
    }
  
    const btnCloseShortcuts = document.getElementById('btn-close-shortcuts');
    if (btnCloseShortcuts) {
      btnCloseShortcuts.addEventListener('click', () => {
        if (modalShortcuts) modalShortcuts.classList.add('hidden');
      });
    }
  
    const btnNewChat = document.getElementById('btn-new-chat');
    if (btnNewChat) btnNewChat.addEventListener('click', createNewChatPrompt);
  
    const btnCallAudio = document.getElementById('btn-call-audio');
    if (btnCallAudio) btnCallAudio.addEventListener('click', () => startCallSimulation('áudio'));
  
    const btnCallVideo = document.getElementById('btn-call-video');
    if (btnCallVideo) btnCallVideo.addEventListener('click', () => startCallSimulation('vídeo'));
  
    const btnEndCall = document.getElementById('btn-end-call');
    if (btnEndCall) btnEndCall.addEventListener('click', endCallSimulation);
  }
  
  // Criação de Contato
  function createNewChatPrompt() {
    const name = prompt("Digite o nome do novo contato:");
    if (name && name.trim()) {
      const newContact = {
        id: Date.now(),
        name: name.trim(),
        avatar: name.trim().charAt(0).toUpperCase(),
        status: "Online",
        unread: 0,
        messages: [
          { id: Date.now(), sender: "them", text: `Olá! Sou ${name.trim()}. Como posso te ajudar?`, time: "Agora" }
        ]
      };
      contacts.unshift(newContact);
      renderChatList();
      selectChat(newContact.id);
    }
  }
  
  // Simulação de Chamada
  function startCallSimulation(type) {
    const contact = contacts.find(c => c.id === activeChatId);
    if (!contact) return;
  
    document.getElementById('call-avatar').textContent = contact.avatar;
    document.getElementById('call-title').textContent = `Chamada de ${type} com ${contact.name}`;
    document.getElementById('call-status').textContent = "Conectando áudio e recursos acessíveis...";
    modalCall.classList.remove('hidden');
    announceToSR(`Iniciando chamada de ${type} com ${contact.name}`);
  }
  
  function endCallSimulation() {
    modalCall.classList.add('hidden');
    announceToSR("Chamada encerrada.");
  }
  
  // Atalhos Globais de Teclado
  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Alt + N: Novo Contato
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        createNewChatPrompt();
      }
  
      // Alt + S: Busca
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        searchInput.focus();
        announceToSR("Campo de busca focado.");
      }
  
      // Alt + M: Foco na Mensagem
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        messageInput.focus();
        announceToSR("Campo de texto focado.");
      }
  
      // Alt + V: Iniciar Chat de Voz Hands-free para Deficientes Visuais
      if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        speakText("Modo assistente de voz ativado. Fale sua mensagem após o sinal sonoro.", () => {
          startVoiceChatMode();
        });
      }
  
      // Alt + H: Menu de Atalhos
      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        if (modalShortcuts) {
          modalShortcuts.classList.remove('hidden');
          document.getElementById('btn-close-shortcuts').focus();
        }
      }
  
      // Esc: Fechar Modais
      if (e.key === 'Escape') {
        if (modalShortcuts) modalShortcuts.classList.add('hidden');
        if (modalCall) modalCall.classList.add('hidden');
        if (emojiPicker) emojiPicker.classList.add('hidden');
        isContinuousVoiceChatActive = false;
      }
    });
  }