import React, { useState } from 'react';
import { FaUpload, FaFileAlt, FaTrash } from 'react-icons/fa';

const WritingUpload = ({ onUpload, onClose }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const validateParagraph = (text) => {
    const characterCount = text.length;
    const wordCount = text.trim().split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length;

    const errors = [];
    
    if (characterCount < 200) {
      errors.push(`Character count (${characterCount}) is below minimum (200)`);
    }
    if (characterCount > 400) {
      errors.push(`Character count (${characterCount}) exceeds maximum (400)`);
    }
    if (wordCount < 80) {
      errors.push(`Word count (${wordCount}) is below minimum (80)`);
    }
    if (wordCount > 120) {
      errors.push(`Word count (${wordCount}) exceeds maximum (120)`);
    }
    if (sentenceCount < 5) {
      errors.push(`Sentence count (${sentenceCount}) is below minimum (5)`);
    }
    if (sentenceCount > 8) {
      errors.push(`Sentence count (${sentenceCount}) exceeds maximum (8)`);
    }

    return errors;
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/superadmin/writing-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Writing paragraphs uploaded successfully!');
        if (onUpload) {
          onUpload(result.data);
        }
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.message || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError('');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Upload Writing Paragraphs</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Requirements:</h3>
        <div className="bg-blue-50 p-4 rounded-lg">
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Character count: 200-400 characters</li>
            <li>• Word count: 80-120 words</li>
            <li>• Sentence count: 5-8 sentences</li>
            <li>• CSV format with columns: level, topic, paragraph, instructions</li>
            <li>• Levels: Beginner, Intermediate, Advanced</li>
          </ul>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select CSV File
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          {!file ? (
            <div>
              <FaUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Choose File
              </label>
              <p className="mt-2 text-sm text-gray-500">
                or drag and drop a CSV file here
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaFileAlt className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={removeFile}
                className="text-red-500 hover:text-red-700"
              >
                <FaTrash className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Uploading...
            </>
          ) : (
            'Upload Paragraphs'
          )}
        </button>
      </div>
    </div>
  );
};

export default WritingUpload; 