import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Chip,
  Typography,
  IconButton,
  Paper,
  Tooltip
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import ImageIcon from "@material-ui/icons/Image";
import PictureAsPdfIcon from "@material-ui/icons/PictureAsPdf";
import DescriptionIcon from "@material-ui/icons/Description";
import MovieIcon from "@material-ui/icons/Movie";
import InsertDriveFileIcon from "@material-ui/icons/InsertDriveFile";

const useStyles = makeStyles((theme) => ({
  previewContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    width: "100%"
  },
  filePreview: {
    position: "relative",
    width: 100,
    height: 100,
    padding: 4,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(0, 0, 0, 0.12)",
    borderRadius: 4,
    overflow: "hidden",
  },
  fileImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: 4,
  },
  fileIcon: {
    fontSize: 40,
    marginBottom: 4,
  },
  fileName: {
    fontSize: 10,
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "center",
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    padding: 4,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    color: "white",
    "&:hover": {
      backgroundColor: "rgba(0, 0, 0, 0.7)",
    },
  },
  fileSize: {
    fontSize: 9,
    color: theme.palette.text.secondary,
  }
}));

// Função para formatar o tamanho do arquivo em KB ou MB
const formatFileSize = (bytes) => {
  if (bytes < 1024) {
    return bytes + " B";
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + " KB";
  } else {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
};

// Função para obter o ícone correto de acordo com o tipo de arquivo
const getFileIcon = (file) => {
  const extension = file.name.split('.').pop().toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
    return <ImageIcon fontSize="large" />;
  } else if (extension === 'pdf') {
    return <PictureAsPdfIcon fontSize="large" color="error" />;
  } else if (['doc', 'docx'].includes(extension)) {
    return <DescriptionIcon fontSize="large" color="primary" />;
  } else if (['mp4', 'avi', 'mov'].includes(extension)) {
    return <MovieIcon fontSize="large" color="secondary" />;
  } else {
    return <InsertDriveFileIcon fontSize="large" color="action" />;
  }
};

export default function ChatFilePreview({ files, onRemove }) {
  const classes = useStyles();

  if (!files || files.length === 0) return null;

  return (
    <div className={classes.previewContainer}>
      {files.map((file, index) => {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension);
        
        return (
          <Paper key={index} className={classes.filePreview} elevation={1}>
            <IconButton 
              className={classes.removeButton} 
              size="small" 
              onClick={() => onRemove(index)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            
            {isImage ? (
              <img 
                src={URL.createObjectURL(file)} 
                alt={file.name} 
                className={classes.fileImage} 
              />
            ) : (
              <>
                {getFileIcon(file)}
                <Tooltip title={file.name}>
                  <Typography className={classes.fileName}>
                    {file.name.length > 15 
                      ? file.name.substring(0, 12) + '...' 
                      : file.name}
                  </Typography>
                </Tooltip>
              </>
            )}
            
            <Typography className={classes.fileSize}>
              {formatFileSize(file.size)}
            </Typography>
          </Paper>
        );
      })}
    </div>
  );
} 