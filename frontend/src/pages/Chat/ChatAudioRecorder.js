import React, { useState, useRef, useEffect } from 'react';
import { 
  IconButton, 
  makeStyles, 
  CircularProgress, 
  Paper,
  Typography, 
  Box, 
  LinearProgress,
  Tooltip 
} from '@material-ui/core';
import MicIcon from '@material-ui/icons/Mic';
import StopIcon from '@material-ui/icons/Stop';
import DeleteIcon from '@material-ui/icons/Delete';
import SendIcon from '@material-ui/icons/Send';
import PauseIcon from '@material-ui/icons/Pause';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
  },
  recordingButton: {
    color: theme.palette.error.main,
    animation: '$pulse 1.5s infinite'
  },
  '@keyframes pulse': {
    '0%': {
      boxShadow: '0 0 0 0 rgba(244, 67, 54, 0.4)'
    },
    '70%': {
      boxShadow: '0 0 0 10px rgba(244, 67, 54, 0)'
    },
    '100%': {
      boxShadow: '0 0 0 0 rgba(244, 67, 54, 0)'
    }
  },
  // Estilo para a barra de gravação estilo WhatsApp
  recorderBar: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    width: '100%',
    padding: theme.spacing(0.5, 1),
    borderRadius: 24,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
  },
  waveform: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
    margin: theme.spacing(0, 1),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: theme.spacing(0.5),
  },
  waveformCanvas: {
    width: '100%',
    height: '100%',
  },
  sendButton: {
    backgroundColor: '#00A884',
    color: 'white',
    '&:hover': {
      backgroundColor: '#008F72',
    },
    borderRadius: '50%',
    padding: 8,
    boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.2)',
    margin: theme.spacing(0, 0.5),
    border: '2px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.2s ease-in-out',
    '&:disabled': {
      backgroundColor: 'rgba(0, 168, 132, 0.6)',
      color: 'rgba(255, 255, 255, 0.7)',
    },
  },
  pauseResumeButton: {
    color: 'white',
    padding: 8,
  },
  trashButton: {
    color: 'white',
    padding: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: 'red',
    marginRight: theme.spacing(1),
    animation: '$blink 1s infinite',
  },
  '@keyframes blink': {
    '0%': { opacity: 1 },
    '50%': { opacity: 0.3 },
    '100%': { opacity: 1 },
  },
  reviewContainer: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1.2),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    border: 'none',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      boxShadow: '0 3px 10px rgba(0, 0, 0, 0.12)',
    },
  },
  reviewAudioInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
  },
  progressBar: {
    width: '100%',
    height: 6,
    marginTop: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    '& .MuiLinearProgress-bar': {
      backgroundColor: '#00A884',
      borderRadius: 3,
    },
  },
  audioLength: {
    fontSize: '0.7rem',
    color: theme.palette.text.secondary,
    marginTop: 2,
    display: 'flex',
    justifyContent: 'space-between',
  },
}));

// Componente de gravação de áudio estilo WhatsApp
const ChatAudioRecorder = ({ onAudioRecorded, disabled = false }) => {
  const classes = useStyles();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  
  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const audioRef = useRef(null);
  const progressIntervalRef = useRef(null);
  
  // Formatação de tempo (mm:ss)
  const formatTime = (seconds) => {
    // Verificar se o valor é válido
    if (seconds === undefined || seconds === null || isNaN(seconds) || !isFinite(seconds)) {
      return "00:00";
    }
    
    // Garantir que é um número e limitar a valores razoáveis
    const safeSeconds = Math.min(Math.max(0, Number(seconds)), 3600); // Limitar a 1 hora
    
    const mins = Math.floor(safeSeconds / 60);
    const secs = Math.floor(safeSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Função para iniciar o visualizador de áudio
  const startVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    analyserRef.current.fftSize = 256;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!isRecording || isPaused) return;
      
      animationRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      canvasCtx.clearRect(0, 0, width, height);
      
      // Desenhar forma de onda estilo WhatsApp
      const barWidth = 2;
      const gap = 1;
      const barCount = Math.floor(width / (barWidth + gap));
      const step = Math.floor(bufferLength / barCount) || 1;
      
      for (let i = 0; i < barCount; i++) {
        const dataIndex = i * step;
        if (dataIndex >= bufferLength) break;
        
        // Usar a média de alguns valores para suavizar
        let sum = 0;
        let count = 0;
        for (let j = 0; j < step && dataIndex + j < bufferLength; j++) {
          sum += dataArray[dataIndex + j];
          count++;
        }
        
        const average = count > 0 ? sum / count : 0;
        const barHeight = Math.max(1, (average / 255) * height);
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;
        
        // Cor cinza claro para as barras de visualização
        canvasCtx.fillStyle = '#CCCCCC';
        canvasCtx.fillRect(x, y, barWidth, barHeight);
      }
    };
    
    draw();
  };
  
  // Função para reproduzir o áudio gravado
  const playRecordedAudio = () => {
    if (!audioRef.current || !recordedAudio || isLoadingAudio) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      clearInterval(progressIntervalRef.current);
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      
      // Verificar se a URL do áudio ainda é válida
      if (recordedAudio.url) {
        audioRef.current.onerror = () => {
          setIsPlaying(false);
          setIsLoadingAudio(false);
          window.alert('Houve um erro ao reproduzir o áudio. Tente gravar novamente.');
        };
        
        audioRef.current.onloadstart = () => {
        };
        
        setIsLoadingAudio(true);
        
        audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setIsLoadingAudio(false);
      
      // Atualizar o progresso da reprodução
      progressIntervalRef.current = setInterval(() => {
        setCurrentTime(audioRef.current.currentTime);
      }, 100);
        })
        .catch(() => {
          window.alert('Não foi possível reproduzir o áudio. O formato pode não ser suportado.');
          setIsPlaying(false);
          setIsLoadingAudio(false);
        });
      } else {
        window.alert('URL de áudio inválida. Tente gravar novamente.');
        return;
      }
    }
  };
  
  // Função para enviar o áudio gravado
  const sendRecordedAudio = () => {
    if (!recordedAudio || !recordedAudio.blob) {
      window.alert('Nenhum áudio disponível para envio');
      return;
    }
    
    if (recordedAudio.blob.size === 0) {
      window.alert('O arquivo de áudio está vazio. Tente gravar novamente.');
      return;
    }
    
    try {
      // SEMPRE usar formato m4a para compatibilidade universal
      const extension = 'm4a';
      const mimeType = 'audio/mp4';
      
      // Verificar se estamos em um dispositivo iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      // Criar arquivo para envio com o nome usando timestamp para evitar conflitos
      const timestamp = Date.now();
      const fileName = `audio_${timestamp}.${extension}`;
      
      // Sempre criar um novo blob com o tipo MIME correto
      let finalBlob;
      try {
        finalBlob = new Blob([recordedAudio.blob], { type: mimeType });
      } catch (e) {
        // Continuar com o blob original
        finalBlob = recordedAudio.blob;
      }
      
      const audioFile = new File(
        [finalBlob], 
        fileName, 
        { 
          type: mimeType,
          lastModified: timestamp
        }
      );
      
      try {
        // Adicionar metadados extras para o servidor
        const audioFileWithMetadata = Object.defineProperties(audioFile, {
          needsConversion: { 
            value: true, // Sempre converter no servidor
            writable: true,
            enumerable: true
          },
          sourceDevice: {
            value: isIOS ? 'iOS' : 'other',
            writable: true,
            enumerable: true
          },
          originalFormat: {
            value: recordedAudio.mimeType || recordedAudio.blob.type,
            writable: true,
            enumerable: true
          },
          targetFormat: {
            value: mimeType,
            writable: true,
            enumerable: true
          },
          forceM4A: {
            value: true, // Sempre forçar para M4A
            writable: true,
            enumerable: true
          }
        });
        
        // Iniciar upload
        setIsUploading(true);
        
        // Callback para o componente pai
        onAudioRecorded(
          audioFileWithMetadata,
          (progress) => {
            setUploadProgress(progress);
          },
          () => {
            setIsUploading(false);
            // Limpar gravação após envio
            if (recordedAudio && recordedAudio.url) {
              URL.revokeObjectURL(recordedAudio.url);
            }
            setRecordedAudio(null);
            setRecordingTime(0);
            setCurrentTime(0);
          }
        );
        
      } catch (error) {
        window.alert('Erro ao processar o áudio. Tente novamente.');
        setIsUploading(false);
      }
      
    } catch (error) {
      window.alert('Erro ao processar o áudio. Tente novamente.');
      setIsUploading(false);
    }
  };
  
  // Manipulador de interrupção da gravação
  const handleRecordingStopped = () => {
    // Parar o stream de áudio
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Verificar se capturamos algum dado
    if (!audioChunksRef.current || audioChunksRef.current.length === 0) {
      window.alert('Não foi possível capturar áudio. Verifique o microfone.');
      return;
    }
    
    // Sempre usar audio/mp4 para compatibilidade com Safari
    const mimeType = 'audio/mp4';
    
    // Criar o blob de áudio com o tipo MIME para melhor compatibilidade
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    
    if (audioBlob.size === 0) {
      window.alert('Erro na gravação. Tente novamente.');
      return;
    }
    
    // Guardar a duração da gravação (verificar se é válida)
    const finalDuration = recordingTime > 0 ? recordingTime : 0;
    
    // Criar URL do blob para reprodução
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Verificar se estamos em um dispositivo iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // Se for iOS, adicionar flags especiais para o áudio
    if (isIOS) {
      setRecordedAudio({
        blob: audioBlob,
        url: audioUrl,
        duration: finalDuration,
        mimeType: mimeType,
        needsConversion: true,
        sourceDevice: "iOS",
        isiOSOptimized: true
      });
      
      // Inicializar o elemento de áudio para reprodução
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      
      // Adicionar atributos específicos para iOS
      audioRef.current.setAttribute('playsinline', '');
      audioRef.current.setAttribute('webkit-playsinline', '');
      audioRef.current.preload = 'auto';
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      
      return;
    }
    
    // Para dispositivos não-iOS, continuar com o fluxo normal
    setAudioDuration(finalDuration);
    setRecordedAudio({
      blob: audioBlob,
      url: audioUrl,
      duration: finalDuration,
      mimeType: audioBlob.type
    });
    
    // Inicializar o elemento de áudio para reprodução
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    audioRef.current.src = audioUrl;
    audioRef.current.load();
    
    // Tentar obter a duração exata do áudio
    try {
      const tempAudio = new Audio(audioUrl);
      
      tempAudio.addEventListener('loadedmetadata', () => {
        const actualDuration = tempAudio.duration;
        
        // Verificar se a duração é válida antes de usar
        if (!isNaN(actualDuration) && isFinite(actualDuration) && actualDuration > 0) {
          setAudioDuration(actualDuration);
          
          // Atualizar objeto de áudio com a duração correta
          setRecordedAudio(prev => ({
            ...prev,
            duration: actualDuration
          }));
        }
      });
      
    } catch (error) {
      // Continuar usando a duração da gravação
    }
  };
  
  // Função para iniciar gravação
  const startRecording = async () => {
    try {
      // Revogar URL de qualquer gravação anterior
      if (recordedAudio && recordedAudio.url) {
        URL.revokeObjectURL(recordedAudio.url);
        setRecordedAudio(null);
      }
      
      // Solicitar permissão para o microfone com configurações otimizadas
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      audioStreamRef.current = stream;
      
      // Configurar o contexto de áudio para visualização
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      // Redefinir o array de chunks
      audioChunksRef.current = [];
      
      // Testar formatos suportados - em ordem de preferência
      const tryFormats = [
        'audio/mp4;codecs=mp4a',
        'audio/aac',
        'audio/m4a',
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/webm',
        'audio/ogg',
        'audio/mp3',
        'audio/mpeg',
        'audio/wav'
      ];
      
      // Sempre tentar usar o formato MP4/AAC primeiro para compatibilidade com Safari
      let selectedMimeType = '';
      
      // Verificar se audio/mp4 é suportado
      if (MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a')) {
        selectedMimeType = 'audio/mp4;codecs=mp4a';
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        selectedMimeType = 'audio/aac';
      } else {
        // Se os formatos preferenciais não são suportados, tentar outros da lista
        for (const format of tryFormats) {
          if (MediaRecorder.isTypeSupported(format)) {
            selectedMimeType = format;
            break;
          }
        }
      }
      
      // Se nenhum formato específico for suportado, usar o padrão
      if (!selectedMimeType) {
        selectedMimeType = '';
      }
      
      // Criar MediaRecorder com configurações otimizadas
      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000 // 128kbps para boa qualidade
      });
      
      mediaRecorderRef.current = recorder;
      
      // Configurar eventos para o MediaRecorder
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });
      
      recorder.addEventListener('start', () => {
        setIsRecording(true);
        setIsPaused(false);
      
        // Iniciar timer
      timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
      }, 1000);
      
        // Iniciar visualizador
        if (canvasRef.current) {
          startVisualizer();
        }
      });
      
      recorder.addEventListener('stop', handleRecordingStopped);
      
      recorder.addEventListener('error', (event) => {
        window.alert('Erro na gravação. Verifique o microfone.');
        setIsRecording(false);
      });
      
      // Iniciar gravação
      recorder.start(1000); // Captura chunks a cada 1 segundo
      
    } catch (error) {
      window.alert('Erro ao acessar o microfone. Verifique as permissões do navegador.');
    }
  };
  
  // Função para pausar/continuar a gravação
  const togglePauseRecording = () => {
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      // Continuar gravação
      if (mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
      
      // Reiniciar timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
      
      // Reiniciar visualizador
      startVisualizer();
      
      setIsPaused(false);
    } else {
      // Pausar gravação
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }
      
      // Pausar timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Pausar visualizador
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      setIsPaused(true);
    }
  };
  
  // Função para parar a gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      // Limpar timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Parar visualizador
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      setIsRecording(false);
      setIsPaused(false);
    }
  };
  
  // Função para cancelar a gravação
  const cancelRecording = () => {
    // Parar a gravação se estiver ativa
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      // Parar o stream de áudio
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    }
    
    // Limpar timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Parar visualizador
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Resetar estado
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    
    // Limpar gravação se existir
    if (recordedAudio && recordedAudio.url) {
      URL.revokeObjectURL(recordedAudio.url);
      setRecordedAudio(null);
    }
  };
  
  // Eventos de áudio
  useEffect(() => {
    if (audioRef.current && recordedAudio) {
      // Carregar metadados do áudio quando disponível
      audioRef.current.onloadedmetadata = () => {
        const audioElementDuration = audioRef.current.duration;
        
        if (!isNaN(audioElementDuration) && isFinite(audioElementDuration) && audioElementDuration > 0) {
          setAudioDuration(audioElementDuration);
          
          // Atualizar objeto de áudio com a duração correta
          setRecordedAudio(prev => ({
            ...prev,
            duration: audioElementDuration
          }));
        } else {
        }
      };
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        clearInterval(progressIntervalRef.current);
      };
    }
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [recordedAudio]);
  
  // Ajustar o canvas quando necessário
  useEffect(() => {
    if (isRecording && canvasRef.current) {
      setTimeout(() => {
        canvasRef.current.width = canvasRef.current.offsetWidth;
        canvasRef.current.height = canvasRef.current.offsetHeight;
        if (!isPaused) startVisualizer();
      }, 100);
    }
  }, [isRecording, isPaused]);
  
  // Limpar recursos quando o componente for desmontado
  useEffect(() => {
    return () => {
      cancelRecording();
      
      if (recordedAudio && recordedAudio.url) {
        URL.revokeObjectURL(recordedAudio.url);
      }
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);
  
  // Renderizar a barra de gravação estilo WhatsApp
  if (isRecording) {
    return (
      <div className={classes.recorderBar}>
        <IconButton className={classes.trashButton} onClick={cancelRecording}>
          <DeleteIcon fontSize="small" />
        </IconButton>
        
        <div className={classes.recordingDot}></div>
        
        <Typography className={classes.timerText}>
          {formatTime(recordingTime)}
        </Typography>
        
        <div className={classes.waveform}>
          <canvas ref={canvasRef} className={classes.waveformCanvas} />
        </div>
        
        <IconButton className={classes.pauseResumeButton} onClick={togglePauseRecording}>
          {isPaused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
        </IconButton>
        
        <IconButton 
          className={classes.sendButton} 
          onClick={stopRecording}
          disabled={recordingTime < 1}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </div>
    );
  }
  
  // Renderizar o player de revisão se um áudio foi gravado
  if (recordedAudio) {
    // Garantir que a duração seja sempre um número válido
    const displayDuration = (!isNaN(audioDuration) && isFinite(audioDuration) && audioDuration > 0) ? 
      audioDuration : 
      (!isNaN(recordedAudio.duration) && isFinite(recordedAudio.duration) && recordedAudio.duration > 0) ? 
        recordedAudio.duration : 0;
    
    // Calcular a porcentagem de progresso de forma segura
    const progressPercentage = (isPlaying && displayDuration > 0) ? 
      Math.min(100, Math.max(0, (currentTime / displayDuration) * 100)) : 0;
    
    return (
      <div className={classes.reviewContainer}>
        <IconButton onClick={cancelRecording} size="small">
          <DeleteIcon fontSize="small" />
        </IconButton>
        
        <div className={classes.reviewAudioInfo}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={playRecordedAudio} size="small">
              {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
            </IconButton>
            <Typography variant="caption">
              Áudio gravado
            </Typography>
          </div>
          
          <LinearProgress 
            className={classes.progressBar} 
            variant="determinate" 
            value={progressPercentage}
          />
          
          <div className={classes.audioLength}>
            <span>{formatTime(isPlaying ? currentTime : 0)}</span>
            <span>{formatTime(displayDuration)}</span>
          </div>
        </div>
        
        <IconButton 
          className={classes.sendButton}
          onClick={sendRecordedAudio}
          disabled={isUploading}
          size="small"
        >
          {isUploading ? <CircularProgress size={20} color="inherit" /> : <SendIcon fontSize="small" />}
        </IconButton>
        
        <audio ref={audioRef} src={recordedAudio.url} style={{ display: 'none' }} preload="metadata" />
      </div>
    );
  }
  
  // Renderizar apenas o botão de microfone
  return (
    <Tooltip title="Gravar áudio">
      <span className={classes.root}>
        <IconButton
          color="primary"
          aria-label="gravar áudio"
          onClick={startRecording}
          disabled={disabled || isUploading}
        >
          <MicIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default ChatAudioRecorder; 