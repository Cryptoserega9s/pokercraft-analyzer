import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api';

function FileUpload({ onUploadSuccess }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Функция для сокращения длинных имен файлов
  const shortenFileName = (name, maxLength = 20) => {
    if (name.length <= maxLength) return name;
    const extension = name.split('.').pop();
    const nameWithoutExt = name.slice(0, name.lastIndexOf('.'));
    const shortName = nameWithoutExt.slice(0, maxLength - extension.length - 4);
    return `${shortName}...${extension}`;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(shortenFileName(selectedFile.name));
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('html', file);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    formData.append('timezone', timezone);

    try {
      await apiClient.post('/api/upload/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploadSuccess();
    } catch (err) {
      const errorMessage = err.response?.data?.message || t('dashboard.upload.uploadError');
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="header-upload-module">
      <span className="upload-label">{t('dashboard.upload.title')}:</span>
      
      {/* Скрытый инпут для выбора файла */}
      <input 
        type="file" 
        id="header-file-upload" 
        onChange={handleFileChange} 
        accept=".html"
        style={{ display: 'none' }} 
      />
      
      {/* Стильная кнопка, которая на самом деле является лейблом для инпута */}
      <label htmlFor="header-file-upload" className="file-input-btn">
        {fileName || t('dashboard.upload.selectFile')}
      </label>
      
      <button 
        className="upload-btn-header" 
        onClick={handleUpload} 
        disabled={!file || uploading}
      >
        {uploading ? t('dashboard.upload.uploading') : t('dashboard.upload.submit')}
      </button>

      {error && <div className="upload-error-tooltip">{error}</div>}
    </div>
  );
}

export default FileUpload;