import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  ChevronRightIcon, 
  ChevronLeftIcon,
  DocumentTextIcon,
  BookOpenIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';
import api from '../../services/api';

const TestCreationWizard = ({ onClose, onSave }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [testData, setTestData] = useState({
    test_name: '',
    test_description: '',
    total_time_minutes: 120,
    sections: [],
    campus_ids: [],
    course_ids: [],
    batch_ids: [],
    start_date: '',
    end_date: ''
  });
  
  const [availableModules, setAvailableModules] = useState([]);
  const [availableLevels, setAvailableLevels] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [questionBankStats, setQuestionBankStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [fetchedQuestions, setFetchedQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [currentQuestionSource, setCurrentQuestionSource] = useState(null);
  const [currentSectionId, setCurrentSectionId] = useState(null);
  const [fetchingQuestions, setFetchingQuestions] = useState(false);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [selectedBankQuestions, setSelectedBankQuestions] = useState([]);

  // Fetch modules and levels
  useEffect(() => {
    fetchModulesAndLevels();
    fetchCRTTopics();
    fetchQuestionBankStats();
  }, []);

  const fetchModulesAndLevels = async () => {
    try {
      const response = await api.get('/test-management/modules');
      
      if (response.data.success) {
        // Add category information to modules
        const modules = (response.data.data || []).map(module => ({
          ...module,
          category: module.id.startsWith('CRT_') ? 'crt' : 'versant'
        }));
        setAvailableModules(modules);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    }
  };

  const fetchLevelsForModule = async (moduleId) => {
    try {
      const response = await api.get(`/test-management/levels?module_id=${moduleId}`);
      
      if (response.data.success) {
        return response.data.data || [];
      }
    } catch (error) {
      console.error('Error fetching levels:', error);
    }
    return [];
  };

  const fetchCRTTopics = async () => {
    try {
      const response = await api.get('/test-management/crt-topics');
      
      if (response.data.success) {
        setAvailableTopics(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching CRT topics:', error);
    }
  };

  const fetchQuestionBankStats = async () => {
    try {
      const response = await api.get('/unified-test-management/question-sources/question-bank/stats');
      
      if (response.data.success) {
        setQuestionBankStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching question bank stats:', error);
    }
  };

  // Fetch questions using test management logic and endpoints
  const fetchQuestions = async (source, sectionId) => {
    try {
      setFetchingQuestions(true);
      
      // Use the first module_id as the main module (like test management)
      const moduleId = source.module_ids?.[0];
      const levelId = source.level_ids?.[0];
      const topicId = source.topic_ids?.[0];
      
      if (!moduleId) {
        Swal.fire({
          icon: 'warning',
          title: 'Module Required',
          text: 'Please select a module to fetch questions'
        });
        return;
      }

      // Determine the correct level_id based on module type (exactly like test management)
      let finalLevelId = levelId;
      let subcategory = null;

      if (moduleId.startsWith('CRT_')) {
        // For CRT modules, don't set level_id unless it's specifically needed
        finalLevelId = null;
        subcategory = null;
      } else if (moduleId === 'GRAMMAR') {
        // For Grammar, use level as level_id (since level contains the grammar category)
        finalLevelId = levelId;
        subcategory = null;
      } else {
        // For other modules (VOCABULARY, READING, LISTENING, SPEAKING, WRITING)
        finalLevelId = levelId;
        subcategory = null;
      }

      console.log('Fetching questions for unified test:', {
        module_id: moduleId,
        level_id: finalLevelId,
        subcategory: subcategory,
        topic_id: topicId,
        question_count: source.question_count || 10,
        original_level: levelId,
        isCRT: moduleId.startsWith('CRT_')
      });

      // Use the test management bulk selection endpoint
      const payload = {
        module_id: moduleId,
        level_id: finalLevelId,
        subcategory: subcategory,
        topic_id: topicId,
        question_count: source.question_count || 10,
        page: 1,
        limit: source.question_count || 10
      };

      let response = await api.post('/test-management/question-bank/bulk-selection', payload);

      // If no questions found and it's Grammar, try with subcategory as level_id
      if (moduleId === 'GRAMMAR' && (!response.data.success || !response.data.questions || response.data.questions.length === 0)) {
        console.log('No questions found with level, trying with subcategory as level_id');
        payload.level_id = subcategory;
        payload.subcategory = null;
        response = await api.post('/test-management/question-bank/bulk-selection', payload);
      }

      // If no questions found for CRT_TECHNICAL, try without level_id
      if (moduleId === 'CRT_TECHNICAL' && (!response.data.success || !response.data.questions || response.data.questions.length === 0)) {
        console.log('No questions found for CRT_TECHNICAL with level_id, trying without level_id');
        delete payload.level_id;
        response = await api.post('/test-management/question-bank/bulk-selection', payload);
      }

      if (response.data.success) {
        const questions = response.data.questions || [];
        const totalQuestions = response.data.total_count || 0;

        console.log('Successfully fetched questions for unified test:', {
          questionsCount: questions.length,
          totalQuestions: totalQuestions,
          firstQuestion: questions[0] ? questions[0].question?.substring(0, 100) : 'No questions',
          module: moduleId,
          level: levelId,
          topic_id: topicId
        });

        if (questions.length > 0) {
          // Add repeat count information to each question (like test management)
          const questionsWithRepeatInfo = questions.map(question => {
            const historicalUsage = question.used_count || 0;
            const currentUsage = historicalUsage + 1;

            // Determine repetition status
            let repetitionStatus = '';
            if (currentUsage === 1) {
              repetitionStatus = 'first_time';
            } else if (currentUsage === 2) {
              repetitionStatus = 'repeating_first_time';
            } else if (currentUsage === 3) {
              repetitionStatus = 'repeating_second_time';
            } else {
              repetitionStatus = `repeating_${currentUsage - 1}_time`;
            }

            return {
              ...question,
              repeatCount: historicalUsage,
              currentUsage: currentUsage,
              repetitionStatus: repetitionStatus
            };
          });

          setSelectedBankQuestions(questionsWithRepeatInfo);
          setCurrentQuestionSource(source);
          setCurrentSectionId(sectionId);
          setShowQuestionPreview(true);
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'No Questions Found',
            text: 'No questions match your current criteria. Try adjusting your selection.'
          });
        }
      } else {
        console.error('Failed to fetch questions:', response.data.message);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: response.data.message || 'Failed to fetch questions from bank'
        });
      }
    } catch (error) {
      console.error('Error fetching questions from bank:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to fetch questions from bank'
      });
    } finally {
      setFetchingQuestions(false);
    }
  };


  // Handle confirm button click
  const handleConfirmQuestions = (sectionId, sourceId) => {
    const section = testData.sections.find(s => s.section_id === sectionId);
    const source = section?.question_sources.find(s => s.source_id === sourceId);
    
    if (!source) return;

    // Validate required fields
    if (source.source_type === 'question_bank') {
      if (!source.module_ids?.length && !source.level_ids?.length && !source.topic_ids?.length) {
        Swal.fire({
          icon: 'warning',
          title: 'Selection Required',
          text: 'Please select at least one module, level, or topic'
        });
        return;
      }
    }

    if (source.question_count <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Count',
        text: 'Please enter a valid question count'
      });
      return;
    }

    fetchQuestions(source, sectionId);
  };

  // Handle preview confirmation (like test management)
  const handlePreviewConfirm = () => {
    if (selectedBankQuestions.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Questions Selected',
        text: 'Please select at least one question to add'
      });
      return;
    }

    // Update the question source with selected questions
    const updatedSource = {
      ...currentQuestionSource,
      selected_questions: selectedBankQuestions,
      actual_question_count: selectedBankQuestions.length
    };

    // Update the section
    const updatedSections = testData.sections.map(section => {
      if (section.section_id === currentSectionId) {
        return {
          ...section,
          question_sources: section.question_sources.map(source => 
            source.source_id === currentQuestionSource.source_id ? updatedSource : source
          ),
          question_count: section.question_sources.reduce((total, source) => {
            if (source.source_id === currentQuestionSource.source_id) {
              return total + selectedBankQuestions.length;
            }
            return total + (source.actual_question_count || 0);
          }, 0)
        };
      }
      return section;
    });

    setTestData(prev => ({ ...prev, sections: updatedSections }));
    setShowQuestionPreview(false);
    setSelectedBankQuestions([]);
    setCurrentQuestionSource(null);
    setCurrentSectionId(null);

    Swal.fire({
      icon: 'success',
      title: 'Questions Added',
      text: `${selectedBankQuestions.length} questions added to the section`
    });
  };


  const addSection = () => {
    const newSection = {
      section_id: `section_${Date.now()}`,
      section_name: `Section ${testData.sections.length + 1}`,
      section_description: '',
      time_limit_minutes: 30,
      question_sources: [],
      question_count: 0,
      section_order: testData.sections.length + 1
    };
    
    setTestData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const updateSection = (sectionId, updates) => {
    setTestData(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.section_id === sectionId 
          ? { ...section, ...updates }
          : section
      )
    }));
  };

  const removeSection = (sectionId) => {
    setTestData(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.section_id !== sectionId)
    }));
  };

  const addQuestionSource = (sectionId, sourceType) => {
    const newSource = {
      source_id: `source_${Date.now()}`,
      source_type: sourceType,
      question_count: 5,
      module_ids: [],
      level_ids: [],
      topic_ids: [],
      question_types: ['MCQ'],
      randomize: true,
      manual_questions: []
    };

    updateSection(sectionId, {
      question_sources: [...testData.sections.find(s => s.section_id === sectionId).question_sources, newSource]
    });
  };

  const updateQuestionSource = async (sectionId, sourceId, updates) => {
    // If module_ids are being updated, fetch levels for the selected modules
    if (updates.module_ids && updates.module_ids.length > 0) {
      const levels = [];
      for (const moduleId of updates.module_ids) {
        const moduleLevels = await fetchLevelsForModule(moduleId);
        levels.push(...moduleLevels);
      }
      updates.available_levels = levels;
    }

    updateSection(sectionId, {
      question_sources: testData.sections
        .find(s => s.section_id === sectionId)
        .question_sources
        .map(source => 
          source.source_id === sourceId 
            ? { ...source, ...updates }
            : source
        )
    });
  };

  const removeQuestionSource = (sectionId, sourceId) => {
    updateSection(sectionId, {
      question_sources: testData.sections
        .find(s => s.section_id === sectionId)
        .question_sources
        .filter(source => source.source_id !== sourceId)
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Calculate total questions for each section
      const sectionsWithCounts = testData.sections.map(section => ({
        ...section,
        question_count: section.question_sources.reduce((total, source) => total + (source.question_count || 0), 0)
      }));

      const finalTestData = {
        ...testData,
        sections: sectionsWithCounts,
        total_questions: sectionsWithCounts.reduce((total, section) => total + section.question_count, 0),
        total_sections: sectionsWithCounts.length
      };

      const response = await api.post('/unified-test-management/unified-tests', finalTestData);

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Unified test created successfully',
          confirmButtonText: 'OK'
        });
        onSave(response.data.test_id);
        onClose();
      } else {
        throw new Error(response.data.message || 'Failed to create test');
      }
    } catch (error) {
      console.error('Error creating test:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to create unified test'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Basic Test Information</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Test Name *
        </label>
        <input
          type="text"
          value={testData.test_name}
          onChange={(e) => setTestData(prev => ({ ...prev, test_name: e.target.value }))}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter test name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Test Description
        </label>
        <textarea
          value={testData.test_description}
          onChange={(e) => setTestData(prev => ({ ...prev, test_description: e.target.value }))}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          placeholder="Enter test description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Total Time (minutes) *
        </label>
        <input
          type="number"
          value={testData.total_time_minutes}
          onChange={(e) => setTestData(prev => ({ ...prev, total_time_minutes: parseInt(e.target.value) || 120 }))}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          min="1"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date (Optional)
          </label>
          <input
            type="datetime-local"
            value={testData.start_date}
            onChange={(e) => setTestData(prev => ({ ...prev, start_date: e.target.value }))}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty to make test always available</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date (Optional)
          </label>
          <input
            type="datetime-local"
            value={testData.end_date}
            onChange={(e) => setTestData(prev => ({ ...prev, end_date: e.target.value }))}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty for no end date</p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Test Sections</h3>
        <button
          onClick={addSection}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Section</span>
        </button>
      </div>

      {testData.sections.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p>No sections added yet. Click "Add Section" to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {testData.sections.map((section, index) => (
            <div key={section.section_id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={section.section_name}
                    onChange={(e) => updateSection(section.section_id, { section_name: e.target.value })}
                    className="text-lg font-medium text-gray-900 bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                  />
                  <textarea
                    value={section.section_description}
                    onChange={(e) => updateSection(section.section_id, { section_description: e.target.value })}
                    className="w-full mt-2 text-sm text-gray-600 bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                    rows={2}
                    placeholder="Section description"
                  />
                </div>
                <button
                  onClick={() => removeSection(section.section_id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    value={section.time_limit_minutes}
                    onChange={(e) => updateSection(section.section_id, { time_limit_minutes: parseInt(e.target.value) || 30 })}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Questions
                  </label>
                  <input
                    type="number"
                    value={section.question_count}
                    onChange={(e) => updateSection(section.section_id, { question_count: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    min="0"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section Order
                  </label>
                  <input
                    type="number"
                    value={section.section_order}
                    onChange={(e) => updateSection(section.section_id, { section_order: parseInt(e.target.value) || index + 1 })}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
              </div>

              {/* Question Sources */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-gray-700">Question Sources</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => addQuestionSource(section.section_id, 'question_bank')}
                      className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded flex items-center space-x-1"
                    >
                      <BookOpenIcon className="h-3 w-3" />
                      <span>Question Bank</span>
                    </button>
                    <button
                      onClick={() => addQuestionSource(section.section_id, 'manual')}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded flex items-center space-x-1"
                    >
                      <DocumentTextIcon className="h-3 w-3" />
                      <span>Manual</span>
                    </button>
                    <button
                      onClick={() => addQuestionSource(section.section_id, 'uploaded')}
                      className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 px-2 py-1 rounded flex items-center space-x-1"
                    >
                      <ArrowUpTrayIcon className="h-3 w-3" />
                      <span>Upload</span>
                    </button>
                  </div>
                </div>

                {section.question_sources.map((source, sourceIndex) => (
                  <div key={source.source_id} className="bg-gray-50 p-3 rounded border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {source.source_type === 'question_bank' && 'Question Bank'}
                        {source.source_type === 'manual' && 'Manual Questions'}
                        {source.source_type === 'uploaded' && 'Uploaded Questions'}
                      </span>
                      <button
                        onClick={() => removeQuestionSource(section.section_id, source.source_id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Question Count
                        </label>
                        <input
                          type="number"
                          value={source.question_count}
                          onChange={(e) => updateQuestionSource(section.section_id, source.source_id, { question_count: parseInt(e.target.value) || 0 })}
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>

                      {source.source_type === 'question_bank' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Modules
                            </label>
                            <select
                              multiple
                              value={source.module_ids || []}
                              onChange={(e) => updateQuestionSource(section.section_id, source.source_id, { module_ids: Array.from(e.target.selectedOptions, option => option.value) })}
                              className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            >
                              {availableModules.map(module => (
                                <option key={module.id} value={module.id}>
                                  {module.name} ({module.category?.toUpperCase()}) - {module.question_count || 0} questions
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Levels
                            </label>
                            <select
                              multiple
                              value={source.level_ids || []}
                              onChange={(e) => updateQuestionSource(section.section_id, source.source_id, { level_ids: Array.from(e.target.selectedOptions, option => option.value) })}
                              className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            >
                              {(source.available_levels || []).map(level => (
                                <option key={level.id} value={level.id}>
                                  {level.name} ({level.question_count || 0} questions)
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              CRT Topics
                            </label>
                            <select
                              multiple
                              value={source.topic_ids || []}
                              onChange={(e) => updateQuestionSource(section.section_id, source.source_id, { topic_ids: Array.from(e.target.selectedOptions, option => option.value) })}
                              className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            >
                              {availableTopics.map(topic => (
                                <option key={topic.id} value={topic.id}>
                                  {topic.topic_name} ({topic.question_count || 0} questions)
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Question Types
                            </label>
                            <select
                              multiple
                              value={source.question_types}
                              onChange={(e) => updateQuestionSource(section.section_id, source.source_id, { question_types: Array.from(e.target.selectedOptions, option => option.value) })}
                              className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="MCQ">MCQ</option>
                              <option value="Sentence">Sentence</option>
                              <option value="Audio">Audio</option>
                              <option value="Paragraph">Paragraph</option>
                            </select>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`randomize_${source.source_id}`}
                                checked={source.randomize}
                                onChange={(e) => updateQuestionSource(section.section_id, source.source_id, { randomize: e.target.checked })}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor={`randomize_${source.source_id}`} className="text-xs text-gray-600">
                                Randomize questions
                              </label>
                            </div>
                            <button
                              onClick={() => handleConfirmQuestions(section.section_id, source.source_id)}
                              disabled={fetchingQuestions}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs flex items-center space-x-1"
                            >
                              {fetchingQuestions ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  <span>Fetching...</span>
                                </>
                              ) : (
                                <>
                                  <span>Confirm</span>
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}

                      {source.source_type === 'manual' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Manual Questions
                            </label>
                            <div className="space-y-2">
                              {source.manual_questions?.map((question, qIndex) => (
                                <div key={qIndex} className="flex space-x-2">
                                  <input
                                    type="text"
                                    value={question.question_text || ''}
                                    onChange={(e) => {
                                      const newQuestions = [...(source.manual_questions || [])];
                                      newQuestions[qIndex] = { ...newQuestions[qIndex], question_text: e.target.value };
                                      updateQuestionSource(section.section_id, source.source_id, { manual_questions: newQuestions });
                                    }}
                                    placeholder="Enter question text"
                                    className="flex-1 p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <select
                                    value={question.question_type || 'MCQ'}
                                    onChange={(e) => {
                                      const newQuestions = [...(source.manual_questions || [])];
                                      newQuestions[qIndex] = { ...newQuestions[qIndex], question_type: e.target.value };
                                      updateQuestionSource(section.section_id, source.source_id, { manual_questions: newQuestions });
                                    }}
                                    className="p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="MCQ">MCQ</option>
                                    <option value="Sentence">Sentence</option>
                                    <option value="Audio">Audio</option>
                                    <option value="Paragraph">Paragraph</option>
                                  </select>
                                  <button
                                    onClick={() => {
                                      const newQuestions = (source.manual_questions || []).filter((_, idx) => idx !== qIndex);
                                      updateQuestionSource(section.section_id, source.source_id, { manual_questions: newQuestions });
                                    }}
                                    className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const newQuestions = [...(source.manual_questions || []), { question_text: '', question_type: 'MCQ' }];
                                  updateQuestionSource(section.section_id, source.source_id, { manual_questions: newQuestions });
                                }}
                                className="px-3 py-1 text-xs bg-green-100 text-green-600 rounded hover:bg-green-200"
                              >
                                Add Question
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Test Summary</h3>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Test Details</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Test Name:</span>
            <span className="ml-2 font-medium">{testData.test_name || 'Not specified'}</span>
          </div>
          <div>
            <span className="text-gray-600">Total Time:</span>
            <span className="ml-2 font-medium">{testData.total_time_minutes} minutes</span>
          </div>
          <div>
            <span className="text-gray-600">Total Sections:</span>
            <span className="ml-2 font-medium">{testData.sections.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Total Questions:</span>
            <span className="ml-2 font-medium">
              {testData.sections.reduce((total, section) => total + section.question_count, 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Sections Overview</h4>
        {testData.sections.map((section, index) => (
          <div key={section.section_id} className="border border-gray-200 rounded p-3">
            <div className="flex justify-between items-center">
              <div>
                <h5 className="font-medium text-gray-900">{section.section_name}</h5>
                <p className="text-sm text-gray-600">{section.section_description}</p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div>{section.question_count} questions</div>
                <div>{section.time_limit_minutes} min</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Sources: {section.question_sources.map(s => s.source_type).join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const steps = [
    { number: 1, title: 'Basic Info', component: renderStep1 },
    { number: 2, title: 'Sections', component: renderStep2 },
    { number: 3, title: 'Summary', component: renderStep3 }
  ];

  const canProceed = () => {
    if (currentStep === 1) {
      return testData.test_name.trim() !== '';
    }
    if (currentStep === 2) {
      return testData.sections.length > 0;
    }
    return true;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Create Unified Test</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  currentStep >= step.number 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step.number}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step Content */}
          <div className="mb-6">
            {steps[currentStep - 1].component()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              
              {currentStep < steps.length ? (
                <button
                  onClick={() => setCurrentStep(prev => Math.min(steps.length, prev + 1))}
                  disabled={!canProceed()}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={loading || !canProceed()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Test'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Question Preview Modal - Exactly like Test Management */}
      {showQuestionPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Preview Questions ({selectedBankQuestions.length} selected)
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Review the questions that will be added to this section
                </p>
              </div>
              <button
                onClick={() => {
                  setShowQuestionPreview(false);
                  setSelectedBankQuestions([]);
                  setCurrentQuestionSource(null);
                  setCurrentSectionId(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {selectedBankQuestions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500 mb-4">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709" />
                      </svg>
                      <p className="text-lg font-medium">No questions found</p>
                      <p className="text-sm">No questions are available in the question bank for this selection.</p>
                    </div>
                  </div>
                ) : (
                  selectedBankQuestions.map((question, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">Question {index + 1}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Randomly Selected</span>
                          {question.repetitionStatus === 'first_time' && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              First Time
                            </span>
                          )}
                          {question.repetitionStatus === 'repeating_first_time' && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                              Repeating First Time
                            </span>
                          )}
                          {question.repetitionStatus === 'repeating_second_time' && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              Repeating Second Time
                            </span>
                          )}
                          {question.repetitionStatus && question.repetitionStatus.startsWith('repeating_') && question.repetitionStatus !== 'repeating_first_time' && question.repetitionStatus !== 'repeating_second_time' && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              {question.repetitionStatus.replace('repeating_', 'Repeating ').replace('_', ' ').replace('time', 'Time')}
                            </span>
                          )}
                          {question.question_type === 'compiler_integrated' && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              Compiler
                            </span>
                          )}
                          {question.question_type === 'mcq' && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              MCQ
                            </span>
                          )}
                          {(currentQuestionSource?.module_ids?.some(id => id === 'LISTENING') || currentQuestionSource?.module_ids?.some(id => id === 'SPEAKING') || question.question_type === 'sentence') && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              Sentence
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Display based on question type */}
                      {question.question_type === 'compiler_integrated' ? (
                        <div>
                          <div className="mb-3">
                            <h4 className="font-medium text-gray-800 mb-2">{question.questionTitle || question.question}</h4>
                            <p className="text-gray-700">{question.problemStatement || question.statement}</p>
                          </div>
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            <div className="bg-gray-50 p-2 rounded">
                              <span className="font-medium">Language:</span> {question.language || 'python'}
                            </div>
                            {question.instructions && (
                              <div className="bg-gray-50 p-2 rounded">
                                <span className="font-medium">Instructions:</span> {question.instructions}
                              </div>
                            )}
                            {question.testCases && question.testCases.length > 0 && (
                              <div className="bg-gray-50 p-2 rounded">
                                <span className="font-medium">Test Cases:</span> {question.testCases.length} case(s)
                                <div className="mt-2 space-y-1">
                                  {Array.isArray(question.testCases) ? (
                                    question.testCases.map((testCase, idx) => (
                                      <div key={idx} className="text-xs bg-white p-1 rounded border">
                                        <div><strong>Input:</strong> {testCase.input || testCase}</div>
                                        <div><strong>Expected:</strong> {testCase.expectedOutput || 'N/A'}</div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-xs bg-white p-1 rounded border">
                                      <div><strong>Test Cases:</strong> {question.testCases}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (currentQuestionSource?.module_ids?.some(id => id === 'LISTENING') || currentQuestionSource?.module_ids?.some(id => id === 'SPEAKING') || question.question_type === 'sentence') ? (
                        <div>
                          <p className="text-gray-800 mb-3">{question.text || question.question || question.questionTitle || question.statement || question.problemStatement || 'Sentence text not available'}</p>
                          <div className="bg-blue-50 p-3 rounded">
                            <div className="text-sm text-blue-800">
                              <strong>Type:</strong> Sentence-based Question
                            </div>
                            {currentQuestionSource?.module_ids?.some(id => id === 'LISTENING') && (
                              <div className="mt-2 text-sm">
                                <strong>Audio Status:</strong> 🎵 Audio will be auto-generated for listening test
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-gray-800 mb-3">{question.question || question.questionTitle || question.statement || question.problemStatement || 'Question text not available'}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-gray-50 p-2 rounded">
                              <span className="font-medium">A:</span> {question.optionA || question.options?.[0] || 'N/A'}
                            </div>
                            <div className="bg-gray-50 p-2 rounded">
                              <span className="font-medium">B:</span> {question.optionB || question.options?.[1] || 'N/A'}
                            </div>
                            <div className="bg-gray-50 p-2 rounded">
                              <span className="font-medium">C:</span> {question.optionC || question.options?.[2] || 'N/A'}
                            </div>
                            <div className="bg-gray-50 p-2 rounded">
                              <span className="font-medium">D:</span> {question.optionD || question.options?.[3] || 'N/A'}
                            </div>
                          </div>
                          <div className="mt-2 text-sm">
                            <span className="font-medium text-green-600">Answer:</span> {question.answer || question.correct_answer || 'N/A'}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowQuestionPreview(false);
                  setSelectedBankQuestions([]);
                  setCurrentQuestionSource(null);
                  setCurrentSectionId(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePreviewConfirm}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Use These Questions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestCreationWizard;
