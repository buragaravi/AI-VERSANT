import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Save, Eye, Settings, Move, GripVertical } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../../services/api';

const FormBuilder = ({ editingFormId = null, onFormSaved = null, onCancel = null }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    template_type: 'custom',
    fields: [],
    is_required: false,
    settings: {
      isActive: true,
      allowMultipleSubmissions: false,
      showProgress: true,
      submissionDeadline: ''
    }
  });
  
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const fieldTypes = [
    { value: 'text', label: 'Text Input', icon: '📝' },
    { value: 'email', label: 'Email Input', icon: '📧' },
    { value: 'phone', label: 'Phone Number', icon: '📱' },
    { value: 'number', label: 'Number Input', icon: '🔢' },
    { value: 'textarea', label: 'Text Area', icon: '📄' },
    { value: 'dropdown', label: 'Dropdown', icon: '📋' },
    { value: 'radio', label: 'Radio Buttons', icon: '🔘' },
    { value: 'checkbox', label: 'Checkboxes', icon: '☑️' },
    { value: 'date', label: 'Date Picker', icon: '📅' }
  ];

  useEffect(() => {
    fetchTemplates();
    if (editingFormId) {
      fetchFormForEditing();
    }
  }, [editingFormId]);

  const fetchFormForEditing = async () => {
    try {
      const response = await api.get(`/forms/${editingFormId}`);
      if (response.data.success) {
        const formData = response.data.data.form;
        setForm({
          title: formData.title,
          description: formData.description,
          template_type: formData.template_type,
          fields: formData.fields,
          is_required: formData.is_required || false,
          settings: formData.settings
        });
      }
    } catch (error) {
      console.error('Error fetching form for editing:', error);
      Swal.fire('Error', 'Failed to load form for editing', 'error');
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/forms/templates');
      if (response.data.success) {
        setTemplates(response.data.data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const addField = (type) => {
    const newField = {
      field_id: `field_${Date.now()}`,
      label: `New ${fieldTypes.find(t => t.value === type)?.label || 'Field'}`,
      type: type,
      required: false,
      options: type === 'dropdown' || type === 'radio' || type === 'checkbox' ? ['Option 1', 'Option 2'] : [],
      placeholder: `Enter ${fieldTypes.find(t => t.value === type)?.label.toLowerCase() || 'value'}`,
      validation: {}
    };
    
    setForm(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  };

  const updateField = (index, updates) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => 
        i === index ? { ...field, ...updates } : field
      )
    }));
  };

  const removeField = (index) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
  };

  const moveField = (index, direction) => {
    const newFields = [...form.fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < newFields.length) {
      [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
      setForm(prev => ({ ...prev, fields: newFields }));
    }
  };

  const loadTemplate = (templateType) => {
    if (templates[templateType]) {
      const template = templates[templateType];
      setForm({
        title: template.title,
        description: template.description,
        template_type: templateType,
        fields: template.fields.map(field => ({
          ...field,
          field_id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })),
        settings: {
          isActive: true,
          allowMultipleSubmissions: false,
          showProgress: true,
          submissionDeadline: ''
        }
      });
      setSelectedTemplate(templateType);
    }
  };

  const saveForm = async () => {
    if (!form.title.trim()) {
      Swal.fire('Error', 'Please enter a form title', 'error');
      return;
    }

    if (form.fields.length === 0) {
      Swal.fire('Error', 'Please add at least one field', 'error');
      return;
    }

    setSaving(true);
    try {
      let response;
      if (editingFormId) {
        // Update existing form
        response = await api.put(`/forms/${editingFormId}`, form);
      } else {
        // Create new form
        response = await api.post('/forms/', form);
      }

      if (response.data.success) {
        Swal.fire('Success', `Form ${editingFormId ? 'updated' : 'created'} successfully!`, 'success');
        
        if (onFormSaved) {
          onFormSaved();
        } else {
          // Reset form only if not using callback
          setForm({
            title: '',
            description: '',
            template_type: 'custom',
            fields: [],
            is_required: false,
            settings: {
              isActive: true,
              allowMultipleSubmissions: false,
              showProgress: true,
              submissionDeadline: ''
            }
          });
          setSelectedTemplate('');
        }
      }
    } catch (error) {
      console.error('Error saving form:', error);
      Swal.fire('Error', `Failed to ${editingFormId ? 'update' : 'save'} form`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderFieldEditor = (field, index) => {
    return (
      <div key={field.field_id} className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
            <span className="text-sm font-medium text-gray-700">
              {fieldTypes.find(t => t.value === field.type)?.icon} {field.label}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => moveField(index, 'up')}
              disabled={index === 0}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              ↑
            </button>
            <button
              onClick={() => moveField(index, 'down')}
              disabled={index === form.fields.length - 1}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              ↓
            </button>
            <button
              onClick={() => removeField(index)}
              className="p-1 text-red-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Label
            </label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => updateField(index, { label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Type
            </label>
            <select
              value={field.type}
              onChange={(e) => updateField(index, { type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {fieldTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placeholder
            </label>
            <input
              type="text"
              value={field.placeholder}
              onChange={(e) => updateField(index, { placeholder: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(index, { required: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Required</span>
            </label>
          </div>
        </div>

        {(field.type === 'dropdown' || field.type === 'radio' || field.type === 'checkbox') && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Options
            </label>
            <div className="space-y-2">
              {field.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...field.options];
                      newOptions[optionIndex] = e.target.value;
                      updateField(index, { options: newOptions });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      const newOptions = field.options.filter((_, i) => i !== optionIndex);
                      updateField(index, { options: newOptions });
                    }}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newOptions = [...field.options, `Option ${field.options.length + 1}`];
                  updateField(index, { options: newOptions });
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Add Option
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPreview = () => {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{form.title}</h2>
        {form.description && (
          <p className="text-gray-600 mb-6">{form.description}</p>
        )}
        
        <div className="space-y-4">
          {form.fields.map((field, index) => (
            <div key={field.field_id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              {field.type === 'text' && (
                <input
                  type="text"
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled
                />
              )}
              
              {field.type === 'email' && (
                <input
                  type="email"
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled
                />
              )}
              
              {field.type === 'number' && (
                <input
                  type="number"
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled
                />
              )}
              
              {field.type === 'textarea' && (
                <textarea
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled
                />
              )}
              
              {field.type === 'dropdown' && (
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled
                >
                  <option value="">Select an option</option>
                  {field.options.map((option, i) => (
                    <option key={i} value={option}>{option}</option>
                  ))}
                </select>
              )}
              
              {field.type === 'radio' && (
                <div className="space-y-2">
                  {field.options.map((option, i) => (
                    <label key={i} className="flex items-center">
                      <input
                        type="radio"
                        name={field.field_id}
                        value={option}
                        className="mr-2"
                        disabled
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}
              
              {field.type === 'checkbox' && (
                <div className="space-y-2">
                  {field.options.map((option, i) => (
                    <label key={i} className="flex items-center">
                      <input
                        type="checkbox"
                        value={option}
                        className="mr-2"
                        disabled
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}
              
              {field.type === 'date' && (
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Form Builder</h1>
        <p className="text-gray-600 mt-2">Create dynamic forms for student submissions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Form Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Form Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter form title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Type
                </label>
                <select
                  value={form.template_type}
                  onChange={(e) => setForm(prev => ({ ...prev, template_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="custom">Custom Form</option>
                  {Object.keys(templates).map(type => (
                    <option key={type} value={type}>
                      {templates[type]?.title || type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter form description"
              />
            </div>
          </div>

          {/* Form Fields */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Form Fields</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {previewMode ? 'Edit' : 'Preview'}
                </button>
              </div>
            </div>

            {previewMode ? (
              renderPreview()
            ) : (
              <div>
                {form.fields.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No fields added yet. Click "Add Field" to get started.</p>
                  </div>
                ) : (
                  form.fields.map((field, index) => renderFieldEditor(field, index))
                )}
              </div>
            )}
          </div>

          {/* Form Settings */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Form Settings</h2>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRequired"
                  checked={form.is_required}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    is_required: e.target.checked
                  }))}
                  className="mr-2"
                />
                <label htmlFor="isRequired" className="text-sm font-medium text-gray-700">
                  Form is required for students
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.settings.isActive}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    settings: { ...prev.settings, isActive: e.target.checked }
                  }))}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Form is active
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowMultipleSubmissions"
                  checked={form.settings.allowMultipleSubmissions}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    settings: { ...prev.settings, allowMultipleSubmissions: e.target.checked }
                  }))}
                  className="mr-2"
                />
                <label htmlFor="allowMultipleSubmissions" className="text-sm font-medium text-gray-700">
                  Allow multiple submissions
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showProgress"
                  checked={form.settings.showProgress}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    settings: { ...prev.settings, showProgress: e.target.checked }
                  }))}
                  className="mr-2"
                />
                <label htmlFor="showProgress" className="text-sm font-medium text-gray-700">
                  Show progress bar
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Submission Deadline (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={form.settings.submissionDeadline}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    settings: { ...prev.settings, submissionDeadline: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Field Types */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Field</h3>
            <div className="grid grid-cols-2 gap-2">
              {fieldTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => addField(type.value)}
                  className="flex flex-col items-center p-3 text-sm font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 border border-gray-200"
                >
                  <span className="text-lg mb-1">{type.icon}</span>
                  <span className="text-xs">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Templates */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Templates</h3>
            <div className="space-y-2">
              {Object.entries(templates).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => loadTemplate(key)}
                  className={`w-full text-left p-3 rounded-md border ${
                    selectedTemplate === key
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{template.title}</div>
                  <div className="text-sm text-gray-500">{template.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={saveForm}
                disabled={saving || !form.title.trim() || form.fields.length === 0}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : (editingFormId ? 'Update Form' : 'Save Form')}
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="w-full flex items-center justify-center px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;
