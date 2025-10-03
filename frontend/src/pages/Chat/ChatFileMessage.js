import React, { useState, useRef, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  Link,
} from "@material-ui/core";
import GetAppIcon from "@material-ui/icons/GetApp";
import CloseIcon from "@material-ui/icons/Close";
import ImageIcon from "@material-ui/icons/Image";
import PictureAsPdfIcon from "@material-ui/icons/PictureAsPdf";
import DescriptionIcon from "@material-ui/icons/Description";
import MovieIcon from "@material-ui/icons/Movie";
import InsertDriveFileIcon from "@material-ui/icons/InsertDriveFile";
import VisibilityIcon from "@material-ui/icons/Visibility";
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';
import PauseCircleOutlineIcon from '@material-ui/icons/PauseCircleOutline';
import AudiotrackIcon from '@material-ui/icons/Audiotrack';
import ChatAudioPlayer from "./ChatAudioPlayer";

const useStyles = makeStyles((theme) => ({
  fileContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
    maxWidth: 280,
  },
  fileItem: {
    display: "flex",
    alignItems: "center",
    padding: 6,
    borderRadius: 4,
    backgroundColor: theme.palette.background.default,
    border: "1px solid rgba(0, 0, 0, 0.12)",
    width: "100%",
  },
  audioFileItem: {
    padding: 0,
    backgroundColor: "transparent",
    border: "none",
    borderRadius: 8,
    overflow: "hidden",
  },
  fileIcon: {
    marginRight: 8,
    fontSize: 24,
  },
  fileDetails: {
    flex: 1,
    overflow: "hidden",
  },
  fileName: {
    fontSize: 12,
    fontWeight: 500,
    textOverflow: "ellipsis",
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  fileSize: {
    fontSize: 10,
    color: theme.palette.text.secondary,
  },
  fileActions: {
    display: "flex",
    gap: 4,
  },
  actionButton: {
    padding: 4,
  },
  previewImage: {
    maxWidth: "100%",
    maxHeight: "80vh",
    objectFit: "contain",
  },
  previewVideo: {
    maxWidth: "100%",
    maxHeight: "80vh",
  },
  previewPdf: {
    width: "100%",
    height: "80vh",
  },
  previewDialog: {
    "& .MuiDialog-paper": {
      position: "relative",
    },
  },
  closeButton: {
    position: "absolute",
    right: 8,
    top: 8,
    color: theme.palette.grey[500],
    zIndex: 2,
    backgroundColor: "rgba(255,255,255,0.7)",
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.9)",
    },
  },
  thumbnailImage: {
    width: 40,
    height: 40,
    objectFit: "cover",
    borderRadius: 4,
    marginRight: 8,
  },
  audioPlayButton: {
    padding: 4,
  },
}));

// Função para formatar o tamanho do arquivo em KB ou MB
const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  
  if (bytes < 1024) {
    return bytes + " B";
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + " KB";
  } else {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
};

// Função para obter o ícone correto de acordo com o tipo de arquivo
const getFileIcon = (fileName) => {
  if (!fileName) return <InsertDriveFileIcon />;
  
  const extension = fileName.split('.').pop().toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
    return <ImageIcon color="primary" />;
  } else if (extension === 'pdf') {
    return <PictureAsPdfIcon color="error" />;
  } else if (['doc', 'docx'].includes(extension)) {
    return <DescriptionIcon color="primary" />;
  } else if (['mp4', 'avi', 'mov'].includes(extension)) {
    return <MovieIcon color="secondary" />;
  } else if (['mp3', 'wav', 'ogg', 'opus'].includes(extension)) {
    return <AudiotrackIcon color="primary" />;
  } else {
    return <InsertDriveFileIcon color="action" />;
  }
};

// Função para verificar se o arquivo é visualizável
const isPreviewable = (fileName) => {
  if (!fileName) return false;
  
  const extension = fileName.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'mp4', 'mp3', 'wav', 'ogg', 'opus', 'm4a'].includes(extension);
};

// Função para verificar se o arquivo é de áudio
const isAudioFile = (fileName) => {
  if (!fileName) return false;
  
  const extension = fileName.split('.').pop().toLowerCase();
  return ['mp3', 'wav', 'ogg', 'opus', 'm4a'].includes(extension);
};

// Função para obter a URL completa do arquivo
const getFullUrl = (url) => {
  if (!url) return "";
  
  // Se a URL já começa com http ou https, retornar como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Se a URL é relativa, adicionar o endereço do backend
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
  
  // Se começa com '/', removemos a barra para evitar duplicação
  const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
  
  // Verificar se já contém o prefixo public/ antes de adicioná-lo
  const urlWithPublic = cleanUrl.startsWith('public/') ? cleanUrl : `public/${cleanUrl}`;
  
  const fullUrl = `${BACKEND_URL}/${urlWithPublic}`;
  return fullUrl;
};

export default function ChatFileMessage({ files, isRight }) {
  const classes = useStyles();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef(null);
  const [audioDurations, setAudioDurations] = useState({});

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        setIsAudioPlaying(false);
      };
    }

    if (files && files.length > 0) {
      const processAudioFiles = async () => {
        const durations = { ...audioDurations };
        let hasNewDurations = false;
        
        for (const file of files) {
          const fileExt = file.name?.split('.').pop().toLowerCase();
          const isAudio = ['mp3', 'wav', 'ogg', 'opus', 'm4a'].includes(fileExt);
          
          if (isAudio) {
            // Skip files that already have durations
            if (audioDurations[file.id] && audioDurations[file.id] > 0) {
              continue;
            }
            
            // Tentar método alternativo para obter duração do áudio
            try {
              const fullUrl = getFullUrl(file.url);
              
              // Criar dois métodos paralelos para obter a duração e usar o que responder primeiro com valor válido
              const durationPromise1 = getDurationFromAudioElement(fullUrl);
              const durationPromise2 = getDurationFromAudioContext(fullUrl);
              
              // Tentar também obter a duração dos metadados diretos do arquivo
              let metadataDuration = null;
              if (file.metadata && file.metadata.duration && 
                  !isNaN(file.metadata.duration) && isFinite(file.metadata.duration) && file.metadata.duration > 0) {
                metadataDuration = file.metadata.duration;
              }
              
              // Próxima fonte: arquivo tem propriedade duration direta
              if (!metadataDuration && file.duration && !isNaN(file.duration) && isFinite(file.duration) && file.duration > 0) {
                metadataDuration = file.duration;
              }
              
              // Usar Promise.race para pegar o primeiro resultado válido
              const result = await Promise.race([
                durationPromise1,
                durationPromise2,
                // Se já temos uma duração dos metadados, transformá-la em uma promise resolvida imediatamente
                metadataDuration ? Promise.resolve({ success: true, duration: metadataDuration }) : new Promise(resolve => setTimeout(() => resolve({ success: false }), 5000))
              ]);
              
              if (result.success && result.duration) {
                // Garantir que a duração é um número válido
                const validDuration = parseFloat(result.duration);
                if (!isNaN(validDuration) && isFinite(validDuration) && validDuration > 0) {
                  durations[file.id] = validDuration;
                  hasNewDurations = true;
                } else {
                  // Se ainda obtivemos um valor inválido, usar duração padrão
                  durations[file.id] = 30;
                  hasNewDurations = true;
                }
              } else {
                // Se todas as estratégias falharam, usar um valor padrão realista
                durations[file.id] = 30;
                hasNewDurations = true;
              }
            } catch (error) {
              // Usar duração padrão em caso de erro
              durations[file.id] = 30;
              hasNewDurations = true;
            }
          }
        }
        
        // Atualizar o estado com todas as durações processadas
        // Só atualiza se existirem novas durações para evitar loop
        if (hasNewDurations) {
          setAudioDurations(durations);
        }
      };
      
      // Executar o processamento de áudios
      processAudioFiles();
    }
  }, [files]);

  // Função auxiliar para obter duração usando elemento Audio
  const getDurationFromAudioElement = (url) => {
    return new Promise((resolve) => {
      const audio = new Audio();
      
      const onLoadedMetadata = () => {
        if (!isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
          resolve({ success: true, duration: audio.duration });
        } else {
          resolve({ success: false });
        }
      };
      
      const onCanPlayThrough = () => {
        if (!isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
          resolve({ success: true, duration: audio.duration });
        }
      };
      
      const onError = (e) => {
        resolve({ success: false });
      };
      
      // Configurar os event listeners
      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('canplaythrough', onCanPlayThrough);
      audio.addEventListener('error', onError);
      
      // Timeout para não esperar infinitamente
      setTimeout(() => {
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        audio.removeEventListener('canplaythrough', onCanPlayThrough);
        audio.removeEventListener('error', onError);
        resolve({ success: false, timeout: true });
      }, 5000);
      
      // Configuração e carregamento
      audio.preload = 'metadata';
      audio.src = url;
      audio.load();
    });
  };
  
  // Função auxiliar para obter duração usando AudioContext (método alternativo)
  const getDurationFromAudioContext = (url) => {
    return new Promise((resolve) => {
      try {
        // Verificar se o navegador suporta AudioContext
        if (!window.AudioContext && !window.webkitAudioContext) {
          return resolve({ success: false, reason: 'AudioContext não suportado' });
        }
        
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioCtx();
        
        // Fazer uma solicitação XHR para obter os dados binários do áudio
        const request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        
        request.onload = () => {
          // Decodificar os dados de áudio para obter a duração
          audioContext.decodeAudioData(
            request.response,
            (buffer) => {
              const duration = buffer.duration;
              if (!isNaN(duration) && isFinite(duration) && duration > 0) {
                resolve({ success: true, duration: duration });
              } else {
                resolve({ success: false });
              }
              audioContext.close();
            },
            (error) => {
              resolve({ success: false });
              audioContext.close();
            }
          );
        };
        
        request.onerror = (error) => {
          resolve({ success: false });
          audioContext.close();
        };
        
        // Timeout para não esperar infinitamente
        setTimeout(() => {
          if (request.readyState !== 4) {
            request.abort();
            audioContext.close();
            resolve({ success: false, timeout: true });
          }
        }, 5000);
        
        request.send();
      } catch (error) {
        resolve({ success: false, error });
      }
    });
  };

  if (!files || files.length === 0) return null;

  const handlePreview = (file) => {
    setSelectedFile(file);
    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setIsAudioPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const toggleAudioPlayback = (file, event) => {
    event.stopPropagation();
    
    if (!audioRef.current) return;
    
    if (isAudioPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.src = getFullUrl(file.url);
      audioRef.current.play();
    }
    
    setIsAudioPlaying(!isAudioPlaying);
  };

  const renderPreview = () => {
    if (!selectedFile) return null;
    
    const fileExt = selectedFile.name?.split('.').pop().toLowerCase();
    const fileUrl = getFullUrl(selectedFile.url);
    
    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) {
      return (
        <img
          src={fileUrl}
          alt={selectedFile.name}
          style={{ maxWidth: '100%', maxHeight: 'calc(80vh - 64px)' }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `${process.env.PUBLIC_URL}/nopicture.png`;
          }}
        />
      );
    } else if (fileExt === 'pdf') {
      return (
        <iframe
          src={`${fileUrl}#view=FitH`}
          title={selectedFile.name}
          width="100%"
          height="80vh"
          style={{ border: 'none' }}
        />
      );
    } else if (['mp4', 'avi', 'mov'].includes(fileExt)) {
      return (
        <video
          src={fileUrl}
          controls
          autoPlay
          style={{ maxWidth: '100%', maxHeight: 'calc(80vh - 64px)' }}
        />
      );
    } else if (['mp3', 'wav', 'ogg', 'opus', 'm4a'].includes(fileExt)) {
      return (
        <div style={{ width: '100%', padding: '20px', textAlign: 'center' }}>
          <AudiotrackIcon style={{ fontSize: 60, color: '#3f51b5', marginBottom: 20 }} />
          <Typography variant="h6" style={{ marginBottom: 20 }}>
            {selectedFile.name}
          </Typography>
          <audio 
            ref={audioRef} 
            src={fileUrl} 
            controls 
            style={{ width: '100%' }} 
            onError={(e) => {
              if (fileUrl.includes('/public/')) {
                const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
                const originalUrl = selectedFile.url;
                const alternativeUrl = `${BACKEND_URL}/${originalUrl.startsWith('/') ? originalUrl.substring(1) : originalUrl}`;
                
                e.target.src = alternativeUrl;
                e.target.load();
              }
            }}
          />
        </div>
      );
    } else {
      return (
        <Typography variant="body1" style={{ padding: 20, textAlign: 'center' }}>
          Este tipo de arquivo não pode ser visualizado diretamente.
          <br />
          <Link href={fileUrl} target="_blank" download>
            Clique aqui para baixar
          </Link>
        </Typography>
      );
    }
  };

  const renderFileItems = () => {
    return files.map((file, index) => {
      const fileExt = file.name?.split('.').pop().toLowerCase();
      const isAudio = ['mp3', 'wav', 'ogg', 'opus', 'm4a'].includes(fileExt);
      
      if (isAudio) {
        // Obter a duração do estado ou usar valor padrão
        let audioDuration = audioDurations[file.id] || 0;
        
        return (
          <Box 
            key={index} 
            className={`${classes.fileItem} ${classes.audioFileItem}`} 
          >
            <ChatAudioPlayer 
              audioUrl={file.url} 
              duration={audioDuration}
              isRight={isRight} 
            />
          </Box>
        );
      }
      
      return (
        <Box key={index} className={classes.fileItem}>
          {(['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) ? (
            <img 
              src={getFullUrl(file.url)} 
              alt={file.name}
              className={classes.thumbnailImage}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `${process.env.PUBLIC_URL}/nopicture.png`;
              }}
            />
            ) : (
              getFileIcon(file.name)
            )}
          
          <Box className={classes.fileDetails}>
            <Typography className={classes.fileName}>
              {file.name}
            </Typography>
              <Typography className={classes.fileSize}>
                {formatFileSize(file.size)}
              </Typography>
          </Box>
          
          <Box className={classes.fileActions}>
              {isPreviewable(file.name) && (
                <Tooltip title="Visualizar">
                  <IconButton
                    className={classes.actionButton}
                    onClick={() => handlePreview(file)}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            
              <Tooltip title="Baixar">
                <IconButton
                  className={classes.actionButton}
                component={Link}
                  href={getFullUrl(file.url)}
                download={file.name}
                  target="_blank"
                >
                  <GetAppIcon fontSize="small" />
                </IconButton>
              </Tooltip>
          </Box>
        </Box>
      );
    });
  };

  return (
    <Box className={classes.fileContainer}>
      {renderFileItems()}

      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="lg"
        className={classes.previewDialog}
      >
        <IconButton className={classes.closeButton} onClick={handleClosePreview}>
          <CloseIcon />
        </IconButton>
        <DialogContent style={{ padding: 16 }}>
          {renderPreview()}
        </DialogContent>
        
        <audio ref={audioRef} style={{ display: 'none' }} />
      </Dialog>
    </Box>
  );
} 