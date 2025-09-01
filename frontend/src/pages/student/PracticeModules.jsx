import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

import LoadingSpinner from '../../components/common/LoadingSpinner';
import api, { getStudentTests, getStudentTestDetails, getUnlockedModules, getGrammarProgress, submitPracticeTest } from '../../services/api';
import { BookOpen, BrainCircuit, ChevronLeft, Lock, Unlock, CheckCircle, XCircle, Ear } from 'lucide-react';
import { io } from 'socket.io-client';
import { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';



const moduleIcons = {
  GRAMMAR: BrainCircuit,
  VOCABULARY: BookOpen,
  LISTENING: Ear,
  DEFAULT: BookOpen
};

const PracticeModules = () => {
  const [view, setView] = useState('main'); // 'main', 'grammar_categories', 'module_list', 'taking_module', 'result'
  const [modules, setModules] = useState([]);
  const [grammarProgress, setGrammarProgress] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [moduleList, setModuleList] = useState([]);
  const [currentModule, setCurrentModule] = useState(null);
  const [moduleResult, setModuleResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const { error: showError, success } = useNotification();
  const { user } = useContext(AuthContext); // Assumes user object contains student_id or _id
  const [showUnlockPopup, setShowUnlockPopup] = useState(false);
  const [unlockPopupMessage, setUnlockPopupMessage] = useState('');
  const [scrollToLevelId, setScrollToLevelId] = useState(null);
  const [showNextLevelPopup, setShowNextLevelPopup] = useState(false);
  const [nextLevelInfo, setNextLevelInfo] = useState(null);

  const resetToMain = () => {
    setView('main');
    setCurrentCategory(null);
    setModuleList([]);
    setCurrentModule(null);
    setModuleResult(null);
  };
  
  const handleSelectModule = async (module) => {
    if (module.locked) {
      setIsPopupVisible(true);
      return;
    }
    if (module.id === 'GRAMMAR') {
      setView('grammar_categories');
    } else {
      // Fetch levels and scores for this module
      setLoading(true);
      try {
        const res = await getUnlockedModules();
        const found = res.data.data.find(m => m.module_id === module.id);
        const levels = found ? found.levels : [];
        // Fetch scores for each level (simulate or use actual API)
        // For now, assume scores are in found.levels as {level_id, unlocked, score}
        const scores = {};
        levels.forEach(lvl => { scores[lvl.level_id] = { score: lvl.score || 0, unlocked: lvl.unlocked }; });
        setCurrentCategory({ id: module.id, name: module.name, levels, scores });
        setView('module_levels');
      } catch {
        setCurrentCategory({ id: module.id, name: module.name, levels: [], scores: {} });
        setView('module_levels');
      } finally {
        setLoading(false);
      }
    }
    setScrollToLevelId(null);
  };

  const handleSelectCategory = (category) => {
    if (category.unlocked) {
      setCurrentCategory({ ...category, id: 'GRAMMAR', subId: category.id, name: category.name });
      setView('module_list');
    } else {
      setUnlockPopupMessage('Complete the previous part with a score of 60% or more to unlock this. You are just one step away from progressing! Give it your best shot!');
      setShowUnlockPopup(true);
    }
  };

  const handleSelectPracticeModule = (module, idx = null) => {
    setCurrentModule(module);
    setView('taking_module');
    if (idx !== null) {
      setNextLevelInfo({ levelName: module.level_name, idx: idx });
      setShowNextLevelPopup(true);
    }
  };

  const handleModuleSubmit = (result) => {
    setModuleResult(result);
    // After submitting, fetch the latest grammar progress if it was a grammar module
    if (currentCategory?.id === 'GRAMMAR') {
       fetchGrammarProgress();
    }
    setView('result');
    // If next level is unlocked, show popup
    if (result.nextLevelUnlocked) {
      setNextLevelInfo(result.nextLevelInfo); // {levelName, idx, ...}
      setShowNextLevelPopup(true);
    }
  };

  const fetchGrammarProgress = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getGrammarProgress();
      setGrammarProgress(res.data.data);
    } catch (err) {
      showError('Failed to load your grammar progress. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      // Use the new endpoint for per-student module access
      const res = await getUnlockedModules();
      // Map backend unlocked -> frontend locked
      const modulesWithIcons = res.data.data.map(m => ({
        id: m.module_id,
        name: m.module_name,
        locked: !m.unlocked, // invert for UI
        icon: moduleIcons[m.module_id] || moduleIcons.DEFAULT
      }));
      setModules(modulesWithIcons);
    } catch (err) {
      console.error('Error fetching modules:', err);
      showError('Failed to load practice modules. Please try refreshing the page.');
      setModules([]);
    } finally {
      setLoading(false);
    }
  }, [showError]);


  useEffect(() => {
    if (view === 'main') {
      fetchModules();
    } else if (view === 'grammar_categories') {
      fetchGrammarProgress();
    } else if (view === 'module_list' && currentCategory) {
      const fetchModules = async () => {
        try {
          setLoading(true);
          let params = { module: currentCategory.id };
          // For Grammar, we use the subcategory ID
          if (currentCategory.id === 'GRAMMAR' && currentCategory.subId) {
             params.subcategory = currentCategory.subId;
          }
          
          const res = await getStudentTests(params);
          setModuleList(res.data.data);
        } catch (err) {
          showError('Failed to load modules for this category.');
        } finally {
          setLoading(false);
        }
      };
      fetchModules();
    }
  }, [view, currentCategory, fetchGrammarProgress, showError, fetchModules]);

  useEffect(() => {
    if (!user || !user._id) return;
    const socket = io(process.env.VITE_SOCKET_IO_URL || 'https://versant-backend.onrender.com', {
      transports: ['websocket'],
      auth: { token: localStorage.getItem('token') },
    });
    // Join a room for this student
    socket.emit('join', { student_id: user._id });
    // Listen for module access changes
    socket.on('module_access_changed', (data) => {
      if (data.student_id === user._id) {
        // Re-fetch modules when access changes
        fetchModules();
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [user, fetchModules]);

  useEffect(() => {
    if (scrollToLevelId) {
      const el = document.getElementById(`level-${scrollToLevelId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [scrollToLevelId]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      );
    }

    switch (view) {
      case 'grammar_categories':
        return <GrammarCategoryView categories={grammarProgress} onSelectCategory={handleSelectCategory} onBack={resetToMain} />;
      case 'module_list':
        return <ModuleListView category={currentCategory} modules={moduleList} onSelectModule={handleSelectPracticeModule} onBack={() => setView(currentCategory.id === 'GRAMMAR' ? 'grammar_categories' : 'main')} />;
      case 'taking_module':
        return <ModuleTakingView module={currentModule} onSubmit={handleModuleSubmit} onBack={() => setView('module_list')}/>;
      case 'result':
        return <ResultView result={moduleResult} onBack={() => { setView('module_list'); setModuleResult(null); }} />;
      case 'module_levels':
        return <ModuleLevelsView moduleId={currentCategory.id} levels={currentCategory.levels} scores={currentCategory.scores} onSelectLevel={handleSelectPracticeModule} onBack={resetToMain} />;
      default: // 'main'
        return <MainView modules={modules} onSelectModule={handleSelectModule} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {renderContent()}
      
      <PopupModal 
        isVisible={isPopupVisible} 
        onClose={() => setIsPopupVisible(false)} 
      />
        {/* Motivational Unlock Popup */}
        {showUnlockPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center border-4 border-yellow-400"
            >
              <div className="mx-auto bg-yellow-100 h-24 w-24 flex items-center justify-center rounded-full mb-4">
                <CheckCircle className="h-16 w-16 text-yellow-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mt-2 mb-2">Keep Going!</h2>
              <p className="text-lg text-gray-700 mb-4">{unlockPopupMessage}</p>
              <button 
                onClick={() => setShowUnlockPopup(false)}
                className="mt-4 w-full bg-yellow-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-600 transition-colors text-lg shadow"
              >
                Got it! I'll try again
              </button>
            </motion.div>
          </div>
        )}
        {showNextLevelPopup && nextLevelInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center border-4 border-green-400"
          >
            <div className="mx-auto bg-green-100 h-24 w-24 flex items-center justify-center rounded-full mb-4">
              <Unlock className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mt-2 mb-2">Congratulations!</h2>
            <p className="text-lg text-gray-700 mb-4">You've unlocked the next level: <span className="font-semibold">{nextLevelInfo.levelName}</span>! Keep up the great work and continue your progress.</p>
            <button 
              onClick={() => { setShowNextLevelPopup(false); handleSelectPracticeModule(nextLevelInfo.level, nextLevelInfo.idx); }}
              className="mt-4 w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors text-lg shadow"
            >
              Go to Next Level
            </button>
            <button 
              onClick={() => setShowNextLevelPopup(false)}
              className="mt-2 w-full bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-base"
            >
              Maybe Later
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const MainView = ({ modules, onSelectModule }) => {
  const [expandedModule, setExpandedModule] = React.useState(null);
  const [levels, setLevels] = React.useState([]);
  const [levelLoading, setLevelLoading] = React.useState(false);
  const [levelStatus, setLevelStatus] = React.useState({});

  const handleExpand = async (module) => {
    if (expandedModule === module.id) {
      setExpandedModule(null);
      setLevels([]);
      return;
    }
    setExpandedModule(module.id);
    setLevelLoading(true);
    try {
      // Fetch latest module status (including levels)
      const res = await getUnlockedModules();
      const found = res.data.data.find(m => m.module_id === module.id);
      setLevels(found ? found.levels : []);
      setLevelStatus(Object.fromEntries((found ? found.levels : []).map(l => [l.level_id, l.unlocked])));
    } catch {
      setLevels([]);
      setLevelStatus({});
    } finally {
      setLevelLoading(false);
    }
  };

  const handleLevelToggle = async (moduleId, levelId, unlocked) => {
    setLevelLoading(true);
    try {
      if (unlocked) {
        await api.post(`/batch-management/student/level/lock`, { module: moduleId, level: levelId });
      } else {
        await api.post(`/batch-management/student/level/unlock`, { module: moduleId, level: levelId });
      }
      // Refresh levels
      const res = await getUnlockedModules();
      const found = res.data.data.find(m => m.module_id === moduleId);
      setLevels(found ? found.levels : []);
      setLevelStatus(Object.fromEntries((found ? found.levels : []).map(l => [l.level_id, l.unlocked])));
    } catch {}
    setLevelLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-8">Practice Modules</h1>
      <p className="text-gray-600 mb-8 text-lg">Practice language skills to improve your English proficiency.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map(module => (
          <motion.div
            key={module.id}
            whileHover={!module.locked ? { scale: 1.05 } : {}}
            className={clsx(
              "bg-white p-8 rounded-2xl shadow-lg flex flex-col items-center text-center relative transition-all duration-300 hover:shadow-xl",
              {
                "cursor-pointer": !module.locked,
                "opacity-60 bg-gray-100 cursor-not-allowed": module.locked,
              }
            )}
            onClick={() => onSelectModule(module)}
          >
            {module.locked && (
              <div className="absolute top-4 right-4 bg-gray-300 p-2 rounded-full">
                <Lock className="h-5 w-5 text-gray-600" />
              </div>
            )}
            <module.icon className={clsx("h-20 w-20 mb-6", {
              "text-indigo-500": !module.locked,
              "text-gray-400": module.locked
            })} />
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">{module.name}</h2>
            <p className="text-gray-500 text-base">Improve your {module.name.toLowerCase()} skills.</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const PopupModal = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
      >
        <div className="mx-auto bg-yellow-100 h-20 w-20 flex items-center justify-center rounded-full">
          <BrainCircuit className="h-12 w-12 text-yellow-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mt-6">Coming Soon!</h2>
        <p className="text-gray-600 mt-4">
          This module is under development. Please complete the Grammar and Vocabulary sections first to build your foundation.
        </p>
        <button 
          onClick={onClose}
          className="mt-8 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Got it!
        </button>
      </motion.div>
    </div>
  );
};

const GrammarCategoryView = ({ categories, onSelectCategory, onBack }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <div className="flex items-center mb-8">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 mr-4"><ChevronLeft /></button>
        <h1 className="text-3xl font-bold text-gray-800">Grammar Learning Path</h1>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((cat, index) => (
        <motion.div
          key={cat.id}
          whileHover={cat.unlocked ? { scale: 1.05 } : {}}
          className={clsx("bg-white p-6 rounded-xl shadow-lg relative", {
            "cursor-pointer": cat.unlocked,
            "opacity-60 bg-gray-100": !cat.unlocked,
          })}
          onClick={() => onSelectCategory(cat)}
        >
          <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-semibold text-indigo-600">Part {index + 1}</p>
                <h3 className="text-xl font-bold text-gray-800 mt-1">{cat.name}</h3>
            </div>
            {cat.unlocked ? <Unlock className="h-6 w-6 text-green-500" /> : <Lock className="h-6 w-6 text-gray-400" />}
          </div>
          <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${cat.score}%` }}></div>
              </div>
              <p className="text-right text-sm text-gray-600 mt-1">Highest Score: {cat.score.toFixed(0)}%</p>
          </div>
          {!cat.unlocked && <p className="text-xs text-center text-yellow-800 bg-yellow-100 p-2 rounded-md mt-4">Complete the previous part with 60% or more to unlock.</p>}
        </motion.div>
      ))}
    </div>
  </motion.div>
);

const ModuleListView = ({ category, modules, onSelectModule, onBack }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center mb-8">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 mr-2 sm:mr-4"><ChevronLeft /></button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{category.name} Modules</h1>
        </div>
        {modules.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {modules.map(module => (
                    <motion.div
                        key={module._id}
                        whileHover={{ scale: 1.05 }}
                        className="bg-white p-6 rounded-xl shadow-lg cursor-pointer flex flex-col justify-between"
                        onClick={() => onSelectModule(module)}
                    >
                        <div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-800">{module.name}</h3>
                            <p className="text-gray-500 mt-2 text-xs sm:text-sm">A practice module to test your skills.</p>
                        </div>
                        <div className="mt-4">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${module.highest_score || 0}%` }}></div>
                            </div>
                            <p className="text-right text-xs sm:text-sm text-gray-600 mt-1">Highest Score: {Math.round(module.highest_score || 0)}%</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        ) : (
            <div className="text-center py-16">
                <h2 className="text-xl font-semibold text-gray-700">No Modules Here Yet</h2>
                <p className="text-gray-500 mt-2">Check back later for new practice modules in this category.</p>
            </div>
        )}
  </motion.div>
);

const ModuleLevelsView = ({ moduleId, levels, scores, onSelectLevel, onBack }) => {
  // Only for non-grammar modules
  // levels: [{level_id, level_name}], scores: {level_id: {score, unlocked}}
  let canUnlock = true;
  return (
    <div>
      <button onClick={onBack} className="mb-6 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 font-semibold">← Back to Modules</button>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {levels.map((level, idx) => {
          let unlocked = false;
          if (idx === 0) {
            unlocked = true;
          } else {
            // Previous level must be completed with >= 60%
            const prev = levels[idx - 1];
            unlocked = scores[prev.level_id]?.score >= 60;
          }
          return (
            <motion.div
              key={level.level_id}
              whileHover={unlocked ? { scale: 1.05 } : {}}
              className={clsx("bg-white p-6 rounded-xl shadow-lg relative", {
                "cursor-pointer": unlocked,
                "opacity-60 bg-gray-100": !unlocked,
              })}
              onClick={() => {
                if (unlocked) {
                  onSelectLevel(level, idx);
                } else {
                  setUnlockPopupMessage('Complete the previous level with 60% or more to unlock this! You are just one step away from progressing! Give it your best shot!');
                  setShowUnlockPopup(true);
                }
              }}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 mt-1">{level.level_name}</h3>
                {unlocked ? <Unlock className="h-6 w-6 text-green-500" /> : <Lock className="h-6 w-6 text-gray-400" />}
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${scores[level.level_id]?.score || 0}%` }}></div>
                </div>
                <p className="text-right text-sm text-gray-600 mt-1">Highest Score: {scores[level.level_id]?.score?.toFixed(0) ?? 0}%</p>
              </div>
              {!unlocked && <p className="text-xs text-center text-yellow-800 bg-yellow-100 p-2 rounded-md mt-4">Complete the previous level with 60% or more to unlock.</p>}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const ModuleTakingView = ({ module, onSubmit, onBack }) => {
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const { error: showError, success } = useNotification();
    const [cheatWarning, setCheatWarning] = useState(false);
    const [cheatCount, setCheatCount] = useState(0);
    const examRef = useRef(null);
    const [recordings, setRecordings] = useState({}); // For speaking answers
    const mediaRecorderRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingQuestionId, setRecordingQuestionId] = useState(null);
    const [audioURLs, setAudioURLs] = useState({});

    useEffect(() => {
        const fetchModuleDetails = async () => {
            try {
                setLoading(true);
                const res = await getStudentTestDetails(module._id);
                
                // Validate the response structure
                if (res.data && res.data.data && Array.isArray(res.data.data.questions)) {
                    setQuestions(res.data.data.questions);
                } else {
                    console.error('Invalid questions data structure:', res.data);
                    setQuestions([]);
                    showError("Invalid question data format received from server.");
                }
            } catch (err) {
                console.error('Error fetching module details:', err);
                showError("Failed to load module questions.");
                setQuestions([]);
            } finally {
                setLoading(false);
            }
        };

        if (module?._id) {
            fetchModuleDetails();
        }
    }, [module, showError]);

    useEffect(() => {
        // Anti-cheating: Prevent tab switching
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                setCheatWarning(true);
                setCheatCount(prev => prev + 1);
                // Optionally, auto-submit after N violations
                // if (cheatCount + 1 >= 2) handleSubmit();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Prevent copy/cut/paste and text selection
        const preventAction = (e) => e.preventDefault();
        const examNode = examRef.current;
        if (examNode) {
            examNode.addEventListener('copy', preventAction);
            examNode.addEventListener('cut', preventAction);
            examNode.addEventListener('paste', preventAction);
            examNode.addEventListener('contextmenu', preventAction);
            examNode.addEventListener('selectstart', preventAction);
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (examNode) {
                examNode.removeEventListener('copy', preventAction);
                examNode.removeEventListener('cut', preventAction);
                examNode.removeEventListener('paste', preventAction);
                examNode.removeEventListener('contextmenu', preventAction);
                examNode.removeEventListener('selectstart', preventAction);
            }
        };
    }, [cheatCount]);

    const handleAnswerChange = (questionId, answer) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    // Audio recording logic for Speaking module
    const startRecording = async (questionId) => {
        setRecordingQuestionId(questionId);
        setIsRecording(true);
        if (navigator.mediaDevices && window.MediaRecorder) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new window.MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            let chunks = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/wav' });
                setRecordings(prev => ({ ...prev, [questionId]: blob }));
                setAudioURLs(prev => ({ ...prev, [questionId]: URL.createObjectURL(blob) }));
                setIsRecording(false);
                setRecordingQuestionId(null);
                
                // For speaking modules, transcribe the audio for validation
                if (currentQuestion && currentQuestion.module_id === 'SPEAKING') {
                    transcribeAudio(blob, questionId);
                }
            };
            mediaRecorder.start();
        } else {
            showError('Audio recording is not supported in this browser.');
        }
    };

    // Transcribe audio for speaking validation
    const transcribeAudio = async (audioBlob, questionId) => {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
            
            const response = await api.post('/test-management/transcribe-audio', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success) {
                const transcript = response.data.transcript;
                setAnswers(prev => ({ ...prev, [questionId]: transcript }));
                
                // Validate transcript against original sentence
                if (currentQuestion && currentQuestion.sentence) {
                    validateTranscript(currentQuestion.sentence, transcript, questionId);
                }
            }
        } catch (error) {
            console.error('Transcription failed:', error);
            showError('Failed to transcribe audio. Please try recording again.');
        }
    };

    // Validate transcript for speaking modules
    const validateTranscript = async (originalSentence, studentTranscript, questionId) => {
        try {
            const response = await api.post('/test-management/validate-transcript', {
                original_sentence: originalSentence,
                student_transcript: studentTranscript,
                validation_config: {
                    tolerance: 0.8,
                    checkMismatchedWords: true,
                    allowPartialMatches: true
                }
            });
            
            if (response.data.success) {
                const validation = response.data.data;
                // Store validation results for later use
                setAnswers(prev => ({ 
                    ...prev, 
                    [`${questionId}_validation`]: validation 
                }));
            }
        } catch (error) {
            console.error('Transcript validation failed:', error);
        }
    };
    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
    };

    const handleSubmit = async () => {
        try {
            const formData = new FormData();
            formData.append('test_id', module._id);
            // Attach MCQ answers
            Object.entries(answers).forEach(([qid, ans]) => {
                formData.append(`answer_${qid}`, ans);
            });
            // Attach audio answers
            Object.entries(recordings).forEach(([qid, blob]) => {
                formData.append(`question_${qid}`, blob, `answer_${qid}.wav`);
            });
            const res = await submitPracticeTest(formData);
            if (res.data.success) {
                success("Module submitted successfully!");
                onSubmit(res.data.data); // Pass result data to parent
            } else {
                showError(res.data.message || 'Failed to submit your answers.');
            }
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to submit your answers. Please try again.');
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!Array.isArray(questions)) return <div className="text-center p-8">Invalid questions data format.</div>;
    if (questions.length === 0) return <div className="text-center p-8">This module has no questions.</div>;
    if (!questions[currentQuestionIndex]) return <div className="text-center p-8">Question not found.</div>;

    const currentQuestion = questions[currentQuestionIndex];
    
    // Check if question has required properties
    if (!currentQuestion.question_id || !currentQuestion.question_type) {
        return (
            <div className="text-center p-8">
                <div className="text-red-600 font-semibold mb-2">Invalid Question Data</div>
                <div className="text-gray-600 text-sm">
                    This question is missing required information. Please contact your instructor.
                </div>
                <div className="mt-4 text-xs text-gray-500">
                    Question ID: {currentQuestion._id || 'Missing'}<br/>
                    Question Type: {currentQuestion.question_type || 'Missing'}<br/>
                    Question Text: {currentQuestion.question ? 'Present' : 'Missing'}
                </div>
            </div>
        );
    }
    
    // Debug: Log the current question structure (remove in production)
    // console.log('Current question:', currentQuestion);
    // console.log('Questions array:', questions);

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 truncate">{module.name}</h1>
        </div>
        {cheatWarning && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-center">
            <strong>Tab switching or leaving the exam is not allowed!</strong> ({cheatCount} warning{cheatCount > 1 ? 's' : ''})
          </div>
        )}
        <div ref={examRef} className="bg-white rounded-2xl shadow-lg mx-auto p-4 sm:p-8 max-w-md w-full min-h-[350px] flex flex-col justify-center select-none">
            <div className="text-center mb-6 text-sm font-semibold text-gray-500">
                Question {currentQuestionIndex + 1} of {questions.length}
            </div>

            <div className="text-center">
                {/* Listening Module: Play audio if available */}
                {currentQuestion.question_type === 'audio' && currentQuestion.audio_url && (
                    <audio controls className="mx-auto mb-4">
                        <source src={currentQuestion.audio_url} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                )}
                <p className="text-lg sm:text-xl text-gray-800 mb-8 break-words">
                    {currentQuestion.question || 'Question text not available'}
                </p>
            </div>

            {currentQuestion.question_type === 'mcq' && currentQuestion.options && currentQuestion.question_id && (
                <div className="space-y-4 max-w-lg mx-auto w-full">
                    {Object.entries(currentQuestion.options).map(([key, value]) => (
                        <label 
                            key={key} 
                            className={clsx(
                                "flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all w-full",
                                {
                                    'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-300': answers[currentQuestion.question_id] === key,
                                    'border-gray-200 hover:border-indigo-400': answers[currentQuestion.question_id] !== key,
                                }
                            )}
                        >
                            <input
                                type="radio"
                                name={currentQuestion.question_id}
                                value={key}
                                checked={answers[currentQuestion.question_id] === key}
                                onChange={() => handleAnswerChange(currentQuestion.question_id, key)}
                                className="h-5 w-5 mr-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                            />
                            <span className="font-semibold text-gray-700">{key}.</span>
                            <span className="ml-3 text-gray-800">{value}</span>
                        </label>
                    ))}
                </div>
            )}

            {/* Speaking Module: Record answer if no audio_url */}
            {currentQuestion.question_type === 'audio' && !currentQuestion.audio_url && currentQuestion.question_id && (
                <div className="flex flex-col items-center mb-4 space-y-4">
                    {audioURLs[currentQuestion.question_id] ? (
                        <audio controls src={audioURLs[currentQuestion.question_id]} className="mb-2" />
                    ) : null}
                    
                    {/* Show transcript for speaking modules */}
                    {currentQuestion.module_id === 'SPEAKING' && answers[currentQuestion.question_id] && (
                        <div className="w-full max-w-md">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Your Transcript:</h4>
                            <div className="bg-gray-50 p-3 rounded-lg border">
                                <p className="text-sm text-gray-800">{answers[currentQuestion.question_id]}</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Show validation results for speaking modules */}
                    {currentQuestion.module_id === 'SPEAKING' && answers[`${currentQuestion.question_id}_validation`] && (
                        <div className="w-full max-w-md">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Validation Results:</h4>
                            <div className="bg-blue-50 p-3 rounded-lg border">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">Similarity Score:</span>
                                    <span className={`text-sm font-bold ${
                                        answers[`${currentQuestion.question_id}_validation`].is_valid ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {Math.round(answers[`${currentQuestion.question_id}_validation`].similarity_score * 100)}%
                                    </span>
                                </div>
                                
                                {answers[`${currentQuestion.question_id}_validation`].mismatched_words && (
                                    <div className="mt-2">
                                        <p className="text-xs text-gray-600 mb-1">Mismatched Words:</p>
                                        {answers[`${currentQuestion.question_id}_validation`].mismatched_words.missing.length > 0 && (
                                            <div className="mb-1">
                                                <span className="text-xs text-red-600">Missing: </span>
                                                <span className="text-xs text-gray-700">
                                                    {answers[`${currentQuestion.question_id}_validation`].mismatched_words.missing.join(', ')}
                                                </span>
                                            </div>
                                        )}
                                        {answers[`${currentQuestion.question_id}_validation`].mismatched_words.extra.length > 0 && (
                                            <div>
                                                <span className="text-xs text-orange-600">Extra: </span>
                                                <span className="text-xs text-gray-700">
                                                    {answers[`${currentQuestion.question_id}_validation`].mismatched_words.extra.join(', ')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {isRecording && recordingQuestionId === currentQuestion.question_id ? (
                        <button onClick={stopRecording} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                            Stop Recording
                        </button>
                    ) : (
                        <button onClick={() => startRecording(currentQuestion.question_id)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            Record Answer
                        </button>
                    )}
                </div>
            )}

            <div className="mt-10 flex justify-between items-center">
                <button
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    disabled={currentQuestionIndex === 0}
                    className="px-6 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Previous
                </button>
                {currentQuestionIndex === questions.length - 1 ? (
                    <button
                        onClick={handleSubmit}
                        disabled={Object.keys(answers).length !== questions.length}
                        className="px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                    >
                        Submit
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                        disabled={currentQuestionIndex === questions.length - 1}
                        className="px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    >
                        Next
                    </button>
                )}
            </div>
        </div>
      </motion.div>
    );
};


const ResultView = ({ result, onBack }) => {
    if (!result) {
        return (
            <div className="text-center">
                <h1 className="text-2xl font-bold">An error occurred while calculating your results.</h1>
                <button onClick={onBack} className="mt-8 px-8 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition">
                    Back to Modules
                </button>
            </div>
        )
    }
    
    const { correct_answers, total_questions, average_score, results } = result;
    const scorePercentage = average_score || 0;
    
    // Helper for word diff display
    const renderWordDiff = (expected, got) => {
        const expectedWords = expected.split(' ');
        const gotWords = got.split(' ');
        return (
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="font-semibold">Expected:</span>
                    {expectedWords.map((word, idx) => (
                        <span key={idx} className={gotWords[idx] === word ? 'bg-green-100 text-green-700 px-2 py-1 rounded flex items-center' : 'bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center'}>
                            {gotWords[idx] === word ? <>&#10003;&nbsp;</> : null}{word}
                        </span>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="font-semibold">Got:</span>
                    {gotWords.map((word, idx) => (
                        <span key={idx} className={expectedWords[idx] === word ? 'bg-green-100 text-green-700 px-2 py-1 rounded flex items-center' : 'bg-yellow-100 text-yellow-700 px-2 py-1 rounded flex items-center'}>
                            {expectedWords[idx] === word ? <>&#10003;&nbsp;</> : null}{word}
                        </span>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                <h1 className="text-3xl font-bold text-gray-800">Module Complete!</h1>
                <p className="text-gray-600 mt-2">Here's how you did:</p>
                <div className="my-8">
                    <p className="text-6xl font-bold text-indigo-600">{correct_answers}<span className="text-4xl text-gray-500">/{total_questions}</span></p>
                    <p className="text-xl font-semibold text-gray-700">Questions Correct</p>
                </div>
                <div className="bg-gray-100 p-6 rounded-lg mb-8">
                    <h3 className="text-lg font-semibold">Your Score</h3>
                    <p className="text-4xl font-bold text-green-600 mt-2">{scorePercentage.toFixed(0)}%</p>
                </div>
                <div className="mt-8 text-left">
                    {results && results.map((q, idx) => (
                        <div key={idx} className="mb-8 p-6 rounded-xl shadow border bg-white">
                            <div className="mb-2 font-semibold text-indigo-700">Question {idx + 1}</div>
                            {q.question_type === 'audio' ? (
                                <>
                                    {/* Listening: Play question audio if available */}
                                    {q.audio_url && (
                                        <audio controls className="mb-2">
                                            <source src={q.audio_url} type="audio/mpeg" />
                                            Your browser does not support the audio element.
                                        </audio>
                                    )}
                                    <div className="mb-2"><span className="font-semibold">Prompt:</span> {q.original_text || q.question}</div>
                                    <div className="mb-2 text-green-700 font-semibold">Result: Similarity Score: {q.similarity_score}</div>
                                    <div className="mb-2">
                                        <span className="font-semibold">Detailed Diff:</span>
                                        <div className="border rounded p-2 mt-1 bg-gray-50">
                                            {renderWordDiff(q.original_text || q.question, q.student_text || '')}
                                        </div>
                                    </div>
                                    {/* Missing/Extra words */}
                                    {(q.missing_words && q.missing_words.length > 0) && (
                                        <div className="text-sm text-yellow-700 mt-1">Missing: {q.missing_words.join(', ')}</div>
                                    )}
                                    {(q.extra_words && q.extra_words.length > 0) && (
                                        <div className="text-sm text-blue-700 mt-1">Extra: {q.extra_words.join(', ')}</div>
                                    )}
                                    {/* Student's submitted audio */}
                                    {q.student_audio_url && (
                                        <div className="mt-2">
                                            <span className="font-semibold">Your Submitted Audio:</span>
                                            <audio controls className="mt-1">
                                                <source src={q.student_audio_url} type="audio/wav" />
                                                Your browser does not support the audio element.
                                            </audio>
                                        </div>
                                    )}
                                </>
                            ) : (
                                // MCQ
                                <>
                                    <div className="mb-2 font-semibold">{q.question}</div>
                                    <div className="mb-2">Your Answer: <span className={q.is_correct ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>{q.student_answer}</span></div>
                                    <div className="mb-2">Correct Answer: <span className="font-semibold">{q.correct_answer}</span></div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
                <button onClick={onBack} className="mt-8 px-8 py-3 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition">
                    Retry Practice Test
                </button>
            </div>
        </motion.div>
    );
};

export default PracticeModules;