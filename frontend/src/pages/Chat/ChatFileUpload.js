import React, { useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
} from '@material-ui/core';
import AttachFileIcon from '@material-ui/icons/AttachFile';
import ImageIcon from '@material-ui/icons/Image';
import InsertDriveFileIcon from '@material-ui/icons/InsertDriveFile';
import PictureAsPdfIcon from '@material-ui/icons/PictureAsPdf';
import DeleteIcon from '@material-ui/icons/Delete';
import CloseIcon from '@material-ui/icons/Close';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    display: 'none',
  },
  fileList: {
    width: '100%',
    maxHeight: 300,
    overflow: 'auto',
    '& .MuiListItem-root': {
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
  },
  fileIcon: {
    minWidth: 40,
  },
  fileSize: {
    color: theme.palette.text.secondary,
    fontSize: 12,
  },
  errorText: {
    color: theme.palette.error.main,
    marginTop: theme.spacing(1),
  },
  progressContainer: {
    width: '100%',
    marginTop: theme.spacing(2),
  },
}));

// Função para formatar o tamanho do arquivo
const formatFileSize = (bytes) => {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
};

// Função para obter o ícone correto com base no tipo de arquivo
const getFileIcon = (fileName) => {
  if (!fileName) return <InsertDriveFileIcon />;
  
  const extension = fileName.split('.').pop().toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
    return <ImageIcon color="primary" />;
  } else if (extension === 'pdf') {
    return <PictureAsPdfIcon color="error" />;
  } else {
    return <InsertDriveFileIcon />;
  }
};

const ChatFileUpload = ({ onFilesSelected, disabled = false }) => {
  const classes = useStyles();
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [errors, setErrors] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Configurações de validação
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_FILES = 5;
  const ALLOWED_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'docx', 'xlsx', 'mp4'];

  const handleFileSelect = () => {
    fileInputRef.current.click();
  };

  const validateFiles = (files) => {
    const errorMessages = [];
    const validFiles = [];

    Array.from(files).forEach(file => {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      // Verificar tipo de arquivo
      if (!ALLOWED_TYPES.includes(fileExtension)) {
        errorMessages.push(`Arquivo "${file.name}" não é permitido. Formatos aceitos: ${ALLOWED_TYPES.join(', ')}`);
        return;
      }
      
      // Verificar tamanho
      if (file.size > MAX_FILE_SIZE) {
        errorMessages.push(`Arquivo "${file.name}" excede o limite de 10MB`);
        return;
      }
      
      validFiles.push(file);
    });
    
    // Verificar número máximo de arquivos
    if (selectedFiles.length + validFiles.length > MAX_FILES) {
      errorMessages.push(`Máximo de ${MAX_FILES} arquivos permitidos por mensagem`);
      return { validFiles: [], errors: errorMessages };
    }
    
    return { validFiles, errors: errorMessages };
  };

  const handleFileChange = (event) => {
    const files = event.target.files;
    
    if (files.length > 0) {
      const { validFiles, errors } = validateFiles(files);
      setErrors(errors);
      
      if (validFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
        setOpenDialog(true);
      } else if (errors.length > 0) {
        setOpenDialog(true);
      }
    }
    
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    event.target.value = null;
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCloseDialog = () => {
    if (selectedFiles.length === 0) {
      setOpenDialog(false);
      setErrors([]);
    }
  };

  const handleConfirm = () => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles, (progress) => {
        setIsUploading(true);
        setUploadProgress(progress);
      }, () => {
        setIsUploading(false);
        setSelectedFiles([]);
        setOpenDialog(false);
        setErrors([]);
        setUploadProgress(0);
      });
    } else {
      setOpenDialog(false);
      setErrors([]);
    }
  };

  return (
    <div className={classes.root}>
      <input
        accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,video/mp4"
        className={classes.input}
        id="file-upload-button"
        multiple
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={disabled}
      />
      <Tooltip title="Anexar arquivo">
        <span>
          <IconButton
            color="primary"
            aria-label="upload file"
            component="span"
            onClick={handleFileSelect}
            disabled={disabled}
          >
            {isUploading ? <CircularProgress size={24} /> : <AttachFileIcon />}
          </IconButton>
        </span>
      </Tooltip>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        aria-labelledby="file-upload-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="file-upload-dialog-title">
          Anexar Arquivos
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            style={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {errors.length > 0 && (
            <div className={classes.errorText}>
              {errors.map((error, index) => (
                <Typography key={index} variant="body2" color="error">
                  {error}
                </Typography>
              ))}
            </div>
          )}

          {selectedFiles.length > 0 && (
            <List className={classes.fileList}>
              {selectedFiles.map((file, index) => (
                <ListItem key={index}>
                  <ListItemIcon className={classes.fileIcon}>
                    {getFileIcon(file.name)}
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name}
                    secondary={
                      <span className={classes.fileSize}>
                        {formatFileSize(file.size)}
                      </span>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFile(index)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}

          {isUploading && (
            <div className={classes.progressContainer}>
              <Typography variant="body2" gutterBottom>
                Enviando arquivos: {uploadProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary" disabled={isUploading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            color="primary" 
            variant="contained" 
            disabled={selectedFiles.length === 0 || isUploading}
          >
            Enviar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ChatFileUpload; 