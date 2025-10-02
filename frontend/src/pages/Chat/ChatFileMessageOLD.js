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
  return ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'mp4', 'mp3', 'wav', 'ogg', 'opus'].includes(extension);
};

// Função para verificar se o arquivo é de áudio
const isAudioFile = (fileName) => {
  if (!fileName) return false;
  
  const extension = fileName.split('.').pop().toLowerCase();
  return ['mp3', 'wav', 'ogg', 'opus'].includes(extension);
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
  return `${BACKEND_URL}/${cleanUrl}`;
};

export default function ChatFileMessage({ files, isRight }) {
  const classes = useStyles();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef(null);

  // Movendo o useEffect para o nível superior, antes do return condicional
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        setIsAudioPlaying(false);
      };
    }
  }, []);

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
    } else if (['mp3', 'wav', 'ogg', 'opus'].includes(fileExt)) {
      return (
        <div style={{ width: '100%', padding: '20px', textAlign: 'center' }}>
          <AudiotrackIcon style={{ fontSize: 60, color: '#3f51b5', marginBottom: 20 }} />
          <Typography variant="h6" style={{ marginBottom: 20 }}>
            {selectedFile.name}
          </Typography>
          <audio ref={audioRef} src={fileUrl} controls style={{ width: '100%' }} />
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

  return (
    <div className={classes.fileContainer}>
      {files.map((file, index) => {
        const isAudio = isAudioFile(file.name);
        
        // Renderizar o player de áudio inline se for um arquivo de áudio
        if (isAudio) {
          return (
            <ChatAudioPlayer 
              key={index}
              audioUrl={file.url} 
              duration={file.metadata?.duration || 0}
              isRight={isRight} 
            />
          );
        }
        
        // Para outros tipos de arquivo, manter o comportamento atual
        return (
          <div key={index} className={classes.fileItem}>
            {file.thumbnail ? (
              <img src={getFullUrl(file.thumbnail)} alt="thumbnail" className={classes.thumbnailImage} />
            ) : (
              getFileIcon(file.name)
            )}
            <div className={classes.fileDetails}>
              <Typography className={classes.fileName}>{file.name}</Typography>
              <Typography className={classes.fileSize}>
                {formatFileSize(file.size)}
              </Typography>
            </div>
            <div className={classes.fileActions}>
              {isPreviewable(file.name) && (
                <Tooltip title="Visualizar">
                  <IconButton
                    className={classes.actionButton}
                    size="small"
                    onClick={() => handlePreview(file)}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Baixar">
                <IconButton
                  className={classes.actionButton}
                  size="small"
                  component="a"
                  href={getFullUrl(file.url)}
                  download
                  target="_blank"
                >
                  <GetAppIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        );
      })}

      <Dialog
        open={previewOpen}
        maxWidth="md"
        fullWidth
        onClose={handleClosePreview}
        className={classes.previewDialog}
      >
        <IconButton
          className={classes.closeButton}
          onClick={handleClosePreview}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent style={{ padding: 0, overflow: 'hidden' }}>
          {renderPreview()}
        </DialogContent>
      </Dialog>
      
      {/* Elemento de áudio escondido para reprodução */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
} 