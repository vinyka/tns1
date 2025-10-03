import React, { useState, useRef, useEffect } from "react";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { IconButton, Typography, LinearProgress, Box, Snackbar } from "@material-ui/core";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PauseIcon from "@material-ui/icons/Pause";
import RefreshIcon from "@material-ui/icons/Refresh";
import { Howl, Howler } from 'howler';

const useStyles = makeStyles((theme) => ({
  audioContainer: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxWidth: 250,
    backgroundColor: "transparent",
    borderRadius: 8,
    padding: theme.spacing(0.5),
    border: "none",
    overflow: "hidden",
  },
  playerControls: {
    display: "flex",
    alignItems: "center",
    backgroundColor: theme.palette.type === "dark" ? "rgba(60, 60, 60, 0.7)" : "rgba(255, 255, 255, 0.7)",
    borderRadius: 24,
    padding: theme.spacing(0.5),
    boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.08)",
  },
  playButton: {
    padding: 6,
    color: theme.palette.primary.main,
  },
  progressContainer: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    "& .MuiLinearProgress-bar": {
      backgroundColor: theme.palette.primary.main,
    }
  },
  timeInfo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeText: {
    fontSize: 10,
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
  retryButton: {
    position: "absolute",
    right: 8,
    top: 8,
    backgroundColor: theme.palette.error.main,
    color: "#fff",
    padding: 2,
    minWidth: "unset",
    width: 24,
    height: 24,
    fontSize: 10,
    borderRadius: "50%",
  },
}));

const formatTime = (seconds) => {
  // Verificar se o valor é válido
  if (seconds === undefined || seconds === null || !isFinite(seconds) || isNaN(seconds)) {
    return "00:00";
  }
  
  // Garantir que seja um número positivo
  const safeSeconds = Math.max(0, Number(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const getFullUrl = (url) => {
  if (!url) return '';
  
  // Se já é uma URL absoluta, retornar como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Se a URL é relativa, adicionar o endereço do backend
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
  
  // Se começa com '/', removemos a barra para evitar duplicação
  const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
  
  // Verificar se já contém o prefixo public/ antes de adicioná-lo
  const urlWithPublic = cleanUrl.startsWith('public/') ? cleanUrl : `public/${cleanUrl}`;
  
  // Completar a URL com o domínio
  const fullUrl = `${BACKEND_URL}/${urlWithPublic}`;
  
  return fullUrl;
};

// Função adicional para resolver problemas de CORS
const addCorsProxyIfNeeded = (url) => {
  // Se já for uma URL interna ou localhost, não precisa de proxy
  if (url.includes(window.location.hostname) || 
      url.includes('localhost') || 
      url.includes('127.0.0.1')) {
    return url;
  }
  
  // Adicionar timestamp para evitar cache
  const timestamp = new Date().getTime();
  const separator = url.includes('?') ? '&' : '?';
  
  // Verificar se a URL é do domínio api.zaprun.com.br
  if (url.includes('api.zaprun.com.br')) {
    // Adicionar parâmetros para CORS e cache-busting
    const corsUrl = `${url}${separator}nocache=${timestamp}&cors=true`;
    
    // Verificar se contém indicações de áudio iOS
    if (url.includes('_ios.') || isIOS()) {
      return `${corsUrl}&format=ios&device=safari`;
    }
    
    return corsUrl;
  }
  
  return `${url}${separator}nocache=${timestamp}`;
};

// Função alternativa para usar proxy CORS quando necessário
const getProxiedUrl = (url) => {
  if (!url) return "";
  
  // Proxy CORS público gratuito
  // Observação: uso limitado, apenas para testes
  const corsProxies = [
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://proxy.cors.sh/${url}`,
    `https://cors-proxy.htmldriven.com/?url=${encodeURIComponent(url)}`
  ];
  
  // Usar o primeiro proxy na lista
  return corsProxies[0];
};

// Verificar se a URL é acessível
const checkUrlAccessibility = async (url) => {
  try {
    // Tentar fetch com HEAD para verificar se o recurso existe
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors', // Tentar contornar CORS para verificação
      cache: 'no-cache',
      headers: {
        'Accept': 'audio/mp4,audio/aac,audio/x-m4a,audio/mpeg,audio/*;q=0.8,*/*;q=0.5',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    // No-cors sempre retorna status 0, então não podemos confiar no status
    // Mas se não lançar erro, provavelmente o recurso existe
    return true;
  } catch (error) {
    return false;
  }
};

// Função para analisar a URL do áudio e tentar corrigir problemas comuns
const sanitizeAndFixAudioUrl = (url) => {
  if (!url) return "";
  
  // Normalizar URL
  let fixedUrl = url.trim();
  
  // Detectar e corrigir URLs incompletas
  if (fixedUrl.startsWith('company1/') || fixedUrl.startsWith('/company1/')) {
    // URL relativa a um company ID - muito provavelmente da API zaprun
    fixedUrl = `https://api.zaprun.com.br/public/${fixedUrl.startsWith('/') ? fixedUrl.substring(1) : fixedUrl}`;
  } else if (fixedUrl.match(/^https?:\/\/company\d+\//)) {
    // URL com protocolo mas sem domínio completo
    const urlParts = fixedUrl.split('/');
    const companyPath = urlParts.slice(2).join('/'); // Pegar todo o caminho após o protocolo e companyID
    fixedUrl = `https://api.zaprun.com.br/public/${companyPath}`;
  }
  
  // Se a URL não tiver protocolo, adicionar https
  if (!fixedUrl.startsWith('http://') && !fixedUrl.startsWith('https://')) {
    fixedUrl = `https://${fixedUrl}`;
  }
  
  // Substituir espaços por %20
  fixedUrl = fixedUrl.replace(/\s+/g, '%20');
  
  // Adicionar /public/ no caminho se for URL api.zaprun.com.br e não tiver
  if (fixedUrl.includes('api.zaprun.com.br') && !fixedUrl.includes('/public/')) {
    try {
      const urlObj = new URL(fixedUrl);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      
      if (pathParts.length > 0 && pathParts[0] !== 'public') {
        urlObj.pathname = `/public/${urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname}`;
        fixedUrl = urlObj.toString();
      }
    } catch (error) {
      // Continuar com a URL sem modificação
    }
  }
  
  // Verificar se a URL contém indicação de áudio iOS
  if (fixedUrl.includes('_ios.')) {
    // Garantir formato aceitável para iOS
    if (fixedUrl.endsWith('.webm') || fixedUrl.endsWith('.ogg')) {
      // Tentar substituir extensão por .m4a
      fixedUrl = fixedUrl.replace(/\.(webm|ogg)$/, '.m4a');
    }
  }
  
  return fixedUrl;
};

// Função para detectar iOS
const isIOS = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /iPad|iPhone|iPod/.test(userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// Função para obter a versão do iOS
const getIOSVersion = () => {
  if (!isIOS()) return 0;
  
  const match = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (match) {
    return parseFloat(`${match[1]}.${match[2]}`);
  }
  return 0;
};

// Desbloquear áudio no iOS - método agressivo
const forceUnlockAudio = () => {
  if (!isIOS()) return;
  
  try {
    // 1. WebAudio API - método mais confiável
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    
    // Criar oscilador e conectar
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.01; // Volume muito baixo, mas não zero
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Iniciar e parar rapidamente
    oscillator.start(0);
    oscillator.stop(0.1);
    
    // Forçar a retomada do contexto de áudio
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  } catch (e) {
    // Ignorar erros
  }
};

// Função para criar e gerenciar manualmente a reprodução em ambiente iOS
const createIOSAudioPlayer = (url, {
  onPlay, 
  onPause, 
  onEnd, 
  onTimeUpdate, 
  onLoad, 
  onError,
  onDebugLog
}) => {
  if (!url || typeof url !== 'string') {
    if (onDebugLog) onDebugLog("ERRO: URL de áudio inválida ou vazia");
    if (onError) onError(new Error("URL inválida"));
    return null;
  }

  try {
    // Limpar qualquer instância Howler anterior para economia de memória
    Howler.unload();
    
    if (onDebugLog) onDebugLog("Criando player iOS para URL: " + url);
    
    // Flag para rastrear se o áudio foi carregado com sucesso
    let audioLoaded = false;
    let errorTimeout = null;
    
    // Criar elemento de áudio nativo
    const audioElement = new Audio();
    
    // Forçar configurações de baixo nível
    audioElement.autoplay = false;
    audioElement.preload = 'auto';
    audioElement.crossOrigin = 'anonymous';
    audioElement.volume = 1.0;
    
    // Adicionar atributos para evitar problemas de reprodução no iOS
    audioElement.setAttribute('playsinline', '');
    audioElement.setAttribute('webkit-playsinline', '');
    
    // Eventos do elemento de áudio
    audioElement.addEventListener('canplaythrough', () => {
      const safeDuration = isFinite(audioElement.duration) ? audioElement.duration : 0;
      if (onDebugLog) onDebugLog("iOS Audio: canplaythrough, duração: " + safeDuration + "s");
      
      // Marcar como carregado (cancela timeout de erro)
      audioLoaded = true;
      if (errorTimeout) {
        clearTimeout(errorTimeout);
        errorTimeout = null;
      }
      
      if (onLoad && safeDuration > 0) onLoad(safeDuration);
    });
    
    audioElement.addEventListener('loadedmetadata', () => {
      const safeDuration = isFinite(audioElement.duration) ? audioElement.duration : 0;
      if (onDebugLog) onDebugLog("iOS Audio: loadedmetadata, duração: " + safeDuration + "s");
      
      // Marcar como carregado (cancela timeout de erro)
      audioLoaded = true;
      if (errorTimeout) {
        clearTimeout(errorTimeout);
        errorTimeout = null;
      }
      
      if (onLoad && safeDuration > 0) onLoad(safeDuration);
    });
    
    audioElement.addEventListener('error', (e) => {
      const errorCode = e.target.error ? e.target.error.code : 0;
      const errorDetails = e.target.error ? 
        `Código: ${errorCode}, Mensagem: ${e.target.error.message || ""}` : 
        "Erro desconhecido";
      
      if (onDebugLog) onDebugLog("ERRO iOS Audio: " + errorDetails);
      
      // Exibir detalhes específicos do erro de mídia
      let errorMessage = "Erro desconhecido";
      switch (errorCode) {
        case 1:
          errorMessage = "Operação abortada";
          break;
        case 2:
          errorMessage = "Erro de rede";
          break;
        case 3:
          errorMessage = "Erro de decodificação";
          break;
        case 4:
          errorMessage = "Formato não suportado ou URL inacessível";
          break;
      }
      
      if (onDebugLog) onDebugLog("ERRO iOS Audio detalhado: " + errorMessage);
      
      // Não disparar erro imediatamente, aguardar para ver se o áudio carrega
      // Em alguns casos, o iOS reporta erro mas depois consegue carregar
      if (!audioLoaded && !errorTimeout) {
        errorTimeout = setTimeout(() => {
          // Se depois de 2 segundos não tiver carregado, considerar como erro
          if (!audioLoaded) {
            if (onError) onError(e);
          }
        }, 2000);
      }
    });
    
    audioElement.addEventListener('ended', () => {
      if (onDebugLog) onDebugLog("iOS Audio: ended");
      if (onEnd) onEnd();
    });
    
    audioElement.addEventListener('timeupdate', () => {
      if (onTimeUpdate) onTimeUpdate(audioElement.currentTime);
    });
    
    audioElement.addEventListener('playing', () => {
      if (onDebugLog) onDebugLog("iOS Audio: playing");
    });
    
    audioElement.addEventListener('waiting', () => {
      if (onDebugLog) onDebugLog("iOS Audio: waiting");
    });
    
    audioElement.addEventListener('stalled', () => {
      if (onDebugLog) onDebugLog("iOS Audio: stalled");
    });
    
    audioElement.addEventListener('suspend', () => {
      if (onDebugLog) onDebugLog("iOS Audio: suspend");
    });
    
    // Definir a URL do áudio
    try {
      audioElement.src = url;
      audioElement.load();
      if (onDebugLog) onDebugLog("iOS Audio: load chamado");
    } catch (loadError) {
      if (onDebugLog) onDebugLog("ERRO iOS Audio ao carregar URL: " + loadError.message);
      if (onError) onError(loadError);
    }
    
    // Funções para controlar o áudio
    const play = () => {
      // Tentar desbloquear o áudio antes de reproduzir
      forceUnlockAudio();
      
      if (onDebugLog) onDebugLog("iOS Audio: tentando reproduzir");
      
      // Verificar se o elemento está em estado válido
      if (audioElement.error) {
        if (onDebugLog) onDebugLog("ERRO iOS Audio antes de play: " + 
          (audioElement.error ? `Código: ${audioElement.error.code}` : "Estado inválido"));
        if (onError) onError(audioElement.error || new Error("Estado inválido"));
        return;
      }
      
      // Atraso pequeno para garantir que o áudio seja desbloqueado
      setTimeout(() => {
        if (onDebugLog) onDebugLog("iOS Audio: estado antes de play: " + (audioElement.paused ? "pausado" : "tocando"));
        
        if (!audioElement.paused) {
          if (onDebugLog) onDebugLog("iOS Audio: já está reproduzindo, nada a fazer");
          if (onPlay) onPlay();
          return;
        }
        
        try {
          const playPromise = audioElement.play();
          
          if (playPromise) {
            if (onDebugLog) onDebugLog("iOS Audio: promise de play retornada");
            
            playPromise
              .then(() => {
                if (onDebugLog) onDebugLog("iOS Audio: promise de play resolvida com sucesso");
                if (onPlay) onPlay();
              })
              .catch((error) => {
                if (onDebugLog) onDebugLog("ERRO iOS Audio: falha na promise de play: " + error.message);
                
                // Verificar se o erro está relacionado a interação do usuário
                if (error.name === 'NotAllowedError') {
                  if (onDebugLog) onDebugLog("ERRO iOS Audio: reprodução não permitida sem interação do usuário");
                }
                
                // Tentar estratégia alternativa para iOS
                forceUnlockAudio();
                if (onDebugLog) onDebugLog("iOS Audio: tentando estratégia alternativa após erro");
                
                // Última tentativa - reproduzir com volume zero e depois aumentar
                audioElement.volume = 0;
                
                setTimeout(() => {
                  if (onDebugLog) onDebugLog("iOS Audio: última tentativa com volume zero");
                  try {
                    const finalAttempt = audioElement.play();
                    if (finalAttempt) {
                      finalAttempt.then(() => {
                        if (onDebugLog) onDebugLog("iOS Audio: última tentativa bem-sucedida");
                        // Aumentar gradualmente o volume para evitar problemas
                        const volumeInterval = setInterval(() => {
                          if (audioElement.volume < 1.0) {
                            audioElement.volume += 0.1;
                          } else {
                            clearInterval(volumeInterval);
                          }
                        }, 100);
                        
                        if (onPlay) onPlay();
                      }).catch((finalError) => {
                        if (onDebugLog) onDebugLog("ERRO iOS Audio: falha na última tentativa: " + finalError.message);
                        if (onError) onError(finalError);
                      });
                    } else {
                      if (onDebugLog) onDebugLog("ERRO iOS Audio: última tentativa não retornou promise");
                    }
                  } catch (finalCatchError) {
                    if (onDebugLog) onDebugLog("ERRO iOS Audio: exceção na última tentativa: " + finalCatchError.message);
                    if (onError) onError(finalCatchError);
                  }
                }, 500);
              });
          } else {
            // Navegadores antigos que não suportam promises
            if (onDebugLog) onDebugLog("iOS Audio: navegador antigo sem suporte a promise");
            if (onPlay) onPlay();
          }
        } catch (playError) {
          if (onDebugLog) onDebugLog("ERRO iOS Audio: exceção ao chamar play(): " + playError.message);
          if (onError) onError(playError);
        }
      }, 100);
    };
    
    const pause = () => {
      if (onDebugLog) onDebugLog("iOS Audio: pause chamado");
      audioElement.pause();
      if (onPause) onPause();
    };
    
    const stop = () => {
      audioElement.pause();
      audioElement.currentTime = 0;
      if (onPause) onPause();
    };
    
    const seek = (time) => {
      audioElement.currentTime = time;
    };
    
    const setVolume = (volume) => {
      audioElement.volume = volume;
    };
    
    const getCurrentTime = () => {
      try {
        const time = audioElement.currentTime;
        return isFinite(time) ? time : 0;
      } catch (e) {
        return 0;
      }
    };
    
    const getDuration = () => {
      try {
        const duration = audioElement.duration;
        return isFinite(duration) ? duration : 0;
      } catch (e) {
        return 0;
      }
    };
    
    const isPlaying = () => {
      try {
        return !audioElement.paused;
      } catch (e) {
        return false;
      }
    };
    
    const cleanup = () => {
      audioElement.pause();
      audioElement.src = '';
      audioElement.load();
    };
    
    return {
      play,
      pause,
      stop,
      seek,
      setVolume,
      getCurrentTime,
      getDuration,
      isPlaying,
      cleanup,
      element: audioElement // Expor o elemento para inspeção
    };
  } catch (e) {
    if (onDebugLog) onDebugLog("ERRO ao criar player iOS: " + e.message);
    if (onError) onError(e);
    return null;
  }
};

// Função para tentar converter áudio para formato compatível com iOS no cliente
// Limitada mas pode ajudar em alguns casos
const tryConvertAudioForIOS = async (audioUrl) => {
  if (!audioUrl) return null;
  
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) {
      return null;
    }
    
    const audioData = await response.arrayBuffer();
    
    // Verificar se temos o AudioContext disponível
    if (!window.AudioContext && !window.webkitAudioContext) {
      return null;
    }
    
    // Criar contexto de áudio
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Decodificar o áudio
    const decodedData = await audioContext.decodeAudioData(audioData);
    
    // Criar buffer source
    const source = audioContext.createBufferSource();
    source.buffer = decodedData;
    
    // Conectar a um destination node
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);
    
    // Criar um MediaRecorder para capturar a saída
    const recorder = new MediaRecorder(destination.stream, {
      mimeType: 'audio/mp4',
      audioBitsPerSecond: 128000
    });
    
    // Array para armazenar os chunks de dados
    const chunks = [];
    
    // Event listener para dados disponíveis
    recorder.addEventListener('dataavailable', (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    });
    
    // Promise para aguardar a conclusão da gravação
    const recordingPromise = new Promise((resolve) => {
      recorder.addEventListener('stop', () => {
        // Criar blob com os dados convertidos
        const blob = new Blob(chunks, { type: 'audio/mp4' });
        
        // Criar URL para o blob
        const convertedUrl = URL.createObjectURL(blob);
        
        // Resolver a promise com a URL convertida
        resolve(convertedUrl);
      });
    });
    
    // Iniciar gravação e reprodução
    recorder.start();
    source.start(0);
    
    // Parar a gravação após a duração do áudio
    setTimeout(() => {
      recorder.stop();
      source.stop();
    }, decodedData.duration * 1000 + 100); // Adicionar um pequeno buffer
    
    // Aguardar a conclusão da gravação
    return await recordingPromise;
  } catch (error) {
    return null;
  }
};

export default function ChatAudioPlayer({ audioUrl, duration, isRight }) {
  const classes = useStyles();
  const theme = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [loadingFailed, setLoadingFailed] = useState(false);
  const [showTryAgain, setShowTryAgain] = useState(false);
  const [playerState, setPlayerState] = useState('idle'); // idle, loading, ready, playing, paused, error
  const [playerMode, setPlayerMode] = useState('auto'); // auto, ios, howler, direct, proxy
  const [useProxy, setUseProxy] = useState(false);
  
  const soundRef = useRef(null);
  const iosPlayerRef = useRef(null);
  const progressInterval = useRef(null);
  const loadAttempts = useRef(0);
  const audioUrlRef = useRef(audioUrl);
  
  // Atualizar ref quando a URL mudar
  useEffect(() => {
    audioUrlRef.current = audioUrl;
  }, [audioUrl]);
  
  // Função para criar uma notificação para o usuário tentar novamente
  const showTryAgainMessage = () => {
    setShowTryAgain(true);
    setTimeout(() => setShowTryAgain(false), 3000);
  };
  
  // Validar duração para garantir valor numérico válido
  const validateDuration = (value) => {
    // Verificar se o valor é numérico e finito
    if (value === undefined || value === null || !isFinite(value) || isNaN(value) || value <= 0) {
      return 0;
    }
    return parseFloat(value);
  };
  
  // Desbloquear áudio ao montar o componente
  useEffect(() => {
    // Tentar desbloquear o áudio logo ao carregar o componente
    if (isIOS()) {
      forceUnlockAudio();
    }
    
    return () => {
      // Limpeza ao desmontar
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      
      if (soundRef.current) {
        soundRef.current.unload();
        soundRef.current = null;
      }
      
      if (iosPlayerRef.current) {
        iosPlayerRef.current.cleanup();
        iosPlayerRef.current = null;
      }
    };
  }, []);

  // Sempre que a duração for definida diretamente via prop, considerar os metadados como carregados
  useEffect(() => {
    const validDuration = validateDuration(duration);
    if (validDuration > 0) {
      setAudioDuration(validDuration);
      setMetadataLoaded(true);
    } else if (audioDuration > 0) {
      // Se já temos uma duração válida no estado, considerar os metadados como carregados
      setMetadataLoaded(true);
    }
  }, [duration, audioDuration]);

  // Função para mudar o modo de player e reinicializar
  const switchPlayerMode = () => {
    const nextMode = getNextPlayerMode();
    setPlayerMode(nextMode);
    
    // Limpar estado e recursos
    if (soundRef.current) {
      soundRef.current.unload();
      soundRef.current = null;
    }
    
    if (iosPlayerRef.current) {
      iosPlayerRef.current.cleanup();
      iosPlayerRef.current = null;
    }
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    
    // Resetar estados
    setLoadingFailed(false);
    setMetadataLoaded(false);
    setPlayerState('loading');
    setCurrentTime(0);
    setIsPlaying(false);
    setUseProxy(false);
    loadAttempts.current = 0;
    
    // Re-inicializar com o novo modo
    initializePlayer(audioUrlRef.current, nextMode);
  };
  
  // Determinar o próximo modo de player em uma rotação
  const getNextPlayerMode = () => {
    switch (playerMode) {
      case 'auto':
        return 'howler';
      case 'howler':
        return 'ios';
      case 'ios':
        return 'direct';
      case 'direct':
        return 'proxy';
      case 'proxy':
      default:
        return 'auto';
    }
  };
  
  // Inicializar o player com um modo específico
  const initializePlayer = (url, mode = 'auto') => {
    if (!url) {
      setMetadataLoaded(true);
      setPlayerState('idle');
      return;
    }
    
    // Tentar corrigir problemas na URL
    let fixedUrl = sanitizeAndFixAudioUrl(url);
    
    // Aplicar tratamentos adicionais à URL
    let fullUrl = getFullUrl(fixedUrl);
    fullUrl = addCorsProxyIfNeeded(fullUrl);
    
    // Se estiver no modo proxy, usar URL com proxy
    if (mode === 'proxy' || useProxy) {
      const proxiedUrl = getProxiedUrl(fullUrl);
      fullUrl = proxiedUrl;
    }
    
    // Verificar se é iOS com problema de reprodução
    const isIOSDevice = isIOS();
    
    // Verificar se a URL contém indicadores de incompatibilidade com iOS
    const potentialIOSIssue = isIOSDevice && 
                             (fullUrl.includes('.webm') || 
                              fullUrl.includes('.ogg') || 
                              !fullUrl.includes('.mp3') && 
                              !fullUrl.includes('.mp4') && 
                              !fullUrl.includes('.m4a') && 
                              !fullUrl.includes('.aac'));
    
    // Escolher o tipo de player baseado no modo
    if (mode === 'auto') {
      // Comportamento padrão - iOS para iOS, Howler para o resto
      if (isIOSDevice) {
        tryIOSPlayer(fullUrl);
      } else {
        tryHowlerPlayer(fullUrl);
      }
    } else if (mode === 'ios') {
      // Forçar player iOS
      tryIOSPlayer(fullUrl);
    } else if (mode === 'howler') {
      // Forçar Howler
      tryHowlerPlayer(fullUrl);
    } else if (mode === 'direct') {
      // Usar elemento de áudio nativo diretamente
      tryDirectPlayer(fullUrl);
    } else if (mode === 'proxy') {
      // Usar proxy CORS (alternar para URL com proxy)
      setUseProxy(true);
      // Determinar o melhor player para URL com proxy
      if (isIOSDevice) {
        tryIOSPlayer(fullUrl);
      } else {
        tryHowlerPlayer(fullUrl);
      }
    }
  };
  
  // Player iOS
  const tryIOSPlayer = (url) => {
    const iosVersion = getIOSVersion();
    
    // Desbloquear o áudio do sistema
    forceUnlockAudio();
    
    // Tentar aplicar estratégias específicas para iOS problemas de áudio
    handleIOSSpecificIssues(url).then(optimizedUrl => {
      try {
        // Criar player nativo para iOS
        iosPlayerRef.current = createIOSAudioPlayer(optimizedUrl, {
          onLoad: (audioDuration) => {
            const validDuration = validateDuration(audioDuration);
            setAudioDuration(validDuration || 30);
            setMetadataLoaded(true);
            setLoadingFailed(false);
            setPlayerState('ready');
          },
          onPlay: () => {
            setPlayerState('playing');
          },
          onPause: () => {
            setPlayerState('paused');
          },
          onEnd: () => {
            setIsPlaying(false);
            setCurrentTime(0);
            setPlayerState('ready');
            if (progressInterval.current) {
              clearInterval(progressInterval.current);
              progressInterval.current = null;
            }
          },
          onTimeUpdate: (time) => {
            setCurrentTime(time);
          },
          onError: (error) => {
            setLoadingFailed(true);
            setMetadataLoaded(true);
            setPlayerState('error');
            showTryAgainMessage();
          }
        });
        
        // Se temos duração prévia, usar para mostrar mesmo que não consiga carregar metadata
        if (duration > 0) {
          setAudioDuration(duration);
          setMetadataLoaded(true);
          setPlayerState('ready');
        }
      } catch (error) {
        setLoadingFailed(true);
        setMetadataLoaded(true);
        setPlayerState('error');
      }
    });
  };
  
  // Player direto - elemento de áudio nativo mais simples
  const tryDirectPlayer = (url) => {
    try {
      // Criar um elemento de áudio simples
      const directAudio = new Audio(url);
      
      // Configurações básicas
      directAudio.preload = 'auto';
      directAudio.setAttribute('playsinline', '');
      directAudio.setAttribute('webkit-playsinline', '');
      
      // Eventos
      directAudio.addEventListener('loadedmetadata', () => {
        const safeDuration = isFinite(directAudio.duration) ? directAudio.duration : 0;
        setAudioDuration(safeDuration || 30);
        setMetadataLoaded(true);
        setPlayerState('ready');
      });
      
      directAudio.addEventListener('error', (e) => {
        setLoadingFailed(true);
        setPlayerState('error');
      });
      
      directAudio.addEventListener('playing', () => {
        setPlayerState('playing');
      });
      
      directAudio.addEventListener('pause', () => {
        setPlayerState('paused');
      });
      
      directAudio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setPlayerState('ready');
      });
      
      directAudio.addEventListener('timeupdate', () => {
        setCurrentTime(directAudio.currentTime || 0);
      });
      
      // Armazenar na ref do soundRef
      soundRef.current = {
        play: () => {
          forceUnlockAudio();
          directAudio.play().catch(e => {
            // Error handler
          });
        },
        pause: () => {
          directAudio.pause();
        },
        stop: () => {
          directAudio.pause();
          directAudio.currentTime = 0;
        },
        seek: (time) => {
          directAudio.currentTime = time;
        },
        unload: () => {
          directAudio.pause();
          directAudio.src = '';
          directAudio.load();
        },
        playing: () => !directAudio.paused,
        duration: () => directAudio.duration || 0,
        seek: () => directAudio.currentTime || 0
      };
      
      // Carregar o áudio
      directAudio.load();
      
    } catch (error) {
      setLoadingFailed(true);
      setMetadataLoaded(true);
      setPlayerState('error');
    }
  };
  
  // Player Howler
  const tryHowlerPlayer = (url) => {
    try {
      const howlerConfig = {
        src: [url],
        html5: true,
        preload: true,
        format: ['aac', 'm4a', 'mp4', 'caf', 'mp3', 'mpeg', 'opus', 'ogg', 'oga', 'wav', 'weba', 'webm', 'dolby', 'flac'],
        volume: 1.0,
        xhr: {
          method: 'GET',
          headers: {
            'Accept': 'audio/mp4,audio/aac,audio/x-m4a,audio/mpeg,audio/*;q=0.8,*/*;q=0.5',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Device': isIOS() ? 'iOS' : 'other',
            'Cache-Control': 'no-cache'
          }
        },
        onload: function() {
          setMetadataLoaded(true);
          const validDuration = validateDuration(this.duration());
          setAudioDuration(validDuration || 30);
          setLoadingFailed(false);
          setPlayerState('ready');
        },
        onloaderror: function(id, error) {
          loadAttempts.current += 1;
          
          if (loadAttempts.current >= 3) {
            setLoadingFailed(true);
            setMetadataLoaded(true);
            setPlayerState('error');
            showTryAgainMessage();
          } else {
            // Tentar novamente com configuração HTML5 alternativa
            soundRef.current.unload();
            soundRef.current = new Howl({
              ...howlerConfig,
              html5: true
            });
          }
        },
        onplayerror: function(id, error) {
          setLoadingFailed(true);
          setPlayerState('error');
          showTryAgainMessage();
        },
        onplay: function() {
          setPlayerState('playing');
        },
        onpause: function() {
          setPlayerState('paused');
        },
        onend: function() {
          setIsPlaying(false);
          setCurrentTime(0);
          setPlayerState('ready');
          if (progressInterval.current) {
            clearInterval(progressInterval.current);
            progressInterval.current = null;
          }
        }
      };
      
      soundRef.current = new Howl(howlerConfig);
    } catch (error) {
      setLoadingFailed(true);
      setMetadataLoaded(true);
      setPlayerState('error');
      showTryAgainMessage();
    }
  };
  
  // Configurar o player de áudio quando a URL de áudio mudar
  useEffect(() => {
    // Limpar recursos anteriores
    if (soundRef.current) {
      soundRef.current.unload();
      soundRef.current = null;
    }
    
    if (iosPlayerRef.current) {
      iosPlayerRef.current.cleanup();
      iosPlayerRef.current = null;
    }
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    
    // Resetar estados para nova URL
    setLoadingFailed(false);
    setMetadataLoaded(false);
    setCurrentTime(0);
    setIsPlaying(false);
    loadAttempts.current = 0;
    
    // Inicializar player com o modo atual
    initializePlayer(audioUrl, playerMode);
  }, [audioUrl, duration, playerMode]);

  const togglePlayback = () => {
    // Verificar se estamos no estado de erro, e se sim, tentar reiniciar
    if (playerState === 'error') {
      resetPlayer();
      return;
    }
    
    // No iOS, usar o player nativo especial
    if (isIOS() && iosPlayerRef.current) {
      // Força desbloqueio do áudio antes da tentativa de reprodução
      forceUnlockAudio();
      
      if (isPlaying) {
        // Se já está tocando, pausar
        iosPlayerRef.current.pause();
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
          progressInterval.current = null;
        }
      } else {
        // Se está pausado, tocar
        iosPlayerRef.current.play();
        
        // Verificar se realmente começou a tocar
        setTimeout(() => {
          if (iosPlayerRef.current && iosPlayerRef.current.element) {
            const isActuallyPlaying = !iosPlayerRef.current.element.paused;
            
            // Se não estiver tocando após 500ms, considerar como falha
            if (!isActuallyPlaying && playerState !== 'error') {
              switchPlayerMode();
              return;
            }
          }
        }, 500);
        
        // Atualizar o progresso
        if (!progressInterval.current) {
          progressInterval.current = setInterval(() => {
            if (iosPlayerRef.current && iosPlayerRef.current.isPlaying()) {
              setCurrentTime(iosPlayerRef.current.getCurrentTime());
            }
          }, 100);
        }
      }
      
      setIsPlaying(!isPlaying);
      return;
    }
    
    // Para outros navegadores, usar Howler
    if (!soundRef.current) {
      return;
    }

    if (isPlaying) {
      // Se já está tocando, pausar
      soundRef.current.pause();
      if (progressInterval.current) {
      clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    } else {
      // Se está pausado, tocar
      try {
        const playId = soundRef.current.play();
        
        // Atualizar o progresso de reprodução em intervalos regulares
      progressInterval.current = setInterval(() => {
          if (soundRef.current && soundRef.current.playing()) {
            setCurrentTime(soundRef.current.seek());
          }
      }, 100);
      } catch (e) {
        setLoadingFailed(true);
        setPlayerState('error');
        showTryAgainMessage();
        return; // Não continuar se não conseguir reproduzir
      }
    }

    setIsPlaying(!isPlaying);
  };

  // Resetar o player para a URL original
  const resetPlayer = () => {
    // Limpar estado e recursos
    if (soundRef.current) {
      soundRef.current.unload();
      soundRef.current = null;
    }
    
    if (iosPlayerRef.current) {
      iosPlayerRef.current.cleanup();
      iosPlayerRef.current = null;
    }
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    
    // Resetar estados
    setLoadingFailed(false);
    setMetadataLoaded(false);
    setPlayerState('loading');
    setCurrentTime(0);
    setIsPlaying(false);
    setPlayerMode('auto');
    setUseProxy(false);
    loadAttempts.current = 0;
    
    // Re-inicializar com a URL atual
    initializePlayer(audioUrlRef.current, 'auto');
  };

  // Função agressiva para tratar problemas de áudio no iOS
  const handleIOSSpecificIssues = async (url) => {
    // 1. Tentar desbloquear áudio
    forceUnlockAudio();
    
    // 2. Verificar se a URL é acessível
    const isAccessible = await checkUrlAccessibility(url);
    if (!isAccessible) {
      return getProxiedUrl(url);
    }
    
    // 3. Verificar se o formato é compatível com iOS
    if (url.includes('.webm') || url.includes('.ogg')) {
      // Tentar converter no cliente se possível
      const convertedUrl = await tryConvertAudioForIOS(url);
      if (convertedUrl) {
        return convertedUrl;
      }
      
      // Se a conversão falhar, usar proxy como última alternativa
      return getProxiedUrl(url);
    }
    
    return url;
  };

  return (
    <>
      <Box className={classes.audioContainer} style={{ alignSelf: isRight ? "flex-end" : "flex-start", position: "relative" }}>
      <div className={classes.playerControls}>
        <IconButton 
          className={classes.playButton} 
            onClick={togglePlayback}
            disabled={loadingFailed || playerState === 'loading'}
          size="small" 
        >
            {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
        </IconButton>
        <div className={classes.progressContainer}>
          <LinearProgress 
            className={classes.progressBar} 
              variant={metadataLoaded ? "determinate" : "indeterminate"}
              value={audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}
          />
          <div className={classes.timeInfo}>
              <Typography className={classes.timeText} variant="caption">
              {formatTime(currentTime)}
            </Typography>
              <Typography className={classes.timeText} variant="caption" 
                onClick={resetPlayer} // Clicar no tempo reseta o player
                style={loadingFailed ? {color: theme.palette.error.main, cursor: 'pointer'} : {}}
              >
                {loadingFailed 
                  ? "Erro" 
                  : (!metadataLoaded 
                      ? "Carregando..." 
                      : formatTime(audioDuration))}
            </Typography>
          </div>
        </div>
      </div>
        
        {/* Botão de retry quando ocorrer erro */}
        {(loadingFailed || playerState === 'error') && (
          <IconButton 
            className={classes.retryButton}
            onClick={switchPlayerMode}
            size="small"
          >
            <RefreshIcon style={{ fontSize: 14 }} />
          </IconButton>
        )}
    </Box>
      
      <Snackbar
        open={showTryAgain}
        message="Tente clicar no botão de retry ou verifique o modo silencioso"
        autoHideDuration={3000}
        onClose={() => setShowTryAgain(false)}
      />
    </>
  );
} 