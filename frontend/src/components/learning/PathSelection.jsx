import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './PathSelection.css';

const PathSelection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPath, setSelectedPath] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  const paths = [
    {
      id: 'chronological',
      name: 'رحلة تاريخ الإسلام',
      description: 'تعلم التاريخ الإسلامي بالترتيب من سيدنا آدم إلى يومنا هذا',
      icon: '🛤️',
      color: 'blue',
      lessons: [
        { id: 1, title: 'سيدنا آدم', arabic_title: 'آدم عليه السلام', duration: 15, hasQuiz: true },
        { id: 2, title: 'سيدنا نوح', arabic_title: 'نوح عليه السلام', duration: 20, hasQuiz: true },
        { id: 3, title: 'سيدنا إبراهيم', arabic_title: 'إبراهيم عليه السلام', duration: 25, hasQuiz: true },
        { id: 4, title: 'سيدنا موسى', arabic_title: 'موسى عليه السلام', duration: 30, hasQuiz: true },
        { id: 5, title: 'سيدنا عيسى', arabic_title: 'عيسى عليه السلام', duration: 20, hasQuiz: true },
        { id: 6, title: 'سيدنا محمد', arabic_title: 'محمد ﷺ', duration: 35, hasQuiz: true }
      ]
    },
    {
      id: 'character-based',
      name: 'اختيار شخصية',
      description: 'اختر شخصية إسلامية معينة وتعلم قصتها بالتفصيل',
      icon: '🧍',
      color: 'green',
      characters: [
        { id: 1, name: 'أبو بكر الصديق', title: 'الخليفة الأول', arabic_name: 'أبو بكر الصديق', duration: 25 },
        { id: 2, name: 'عمر بن الخطاب', title: 'الخليفة الثاني', arabic_name: 'عمر بن الخطاب', duration: 30 },
        { id: 3, name: 'عثمان بن عفان', title: 'الخليفة الثالث', arabic_name: 'عثمان بن عفان', duration: 25 },
        { id: 4, name: 'علي بن أبي طالب', title: 'الخليفة الرابع', arabic_name: 'علي بن أبي طالب', duration: 30 },
        { id: 5, name: 'خديجة بنت خويلد', title: 'زوجة النبي الأولى', arabic_name: 'خديجة بنت خويلد', duration: 20 },
        { id: 6, name: 'فاطمة الزهراء', title: 'بنت النبي', arabic_name: 'فاطمة الزهراء', duration: 20 }
      ]
    }
  ];

  const handlePathSelect = (path) => {
    setSelectedPath(path);
    setSelectedCharacter(null);
  };

  const handleCharacterSelect = (character) => {
    setSelectedCharacter(character);
  };

  const handleStartPath = () => {
    if (selectedPath.id === 'chronological') {
      navigate('/learning-paths/chronological');
    } else if (selectedPath.id === 'character-based' && selectedCharacter) {
      navigate(`/learning-paths/character/${selectedCharacter.id}`);
    }
  };

  const renderPathSelection = () => (
    <div className="path-selection">
      <div className="selection-header">
        <h2>اختر طريقة التعلم 🧭</h2>
        <p>الطفل يختار هو ماشي إزاي، مفيش فرض</p>
      </div>

      <div className="paths-grid">
        {paths.map((path) => (
          <div 
            key={path.id}
            className={`path-card ${selectedPath?.id === path.id ? 'selected' : ''}`}
            onClick={() => handlePathSelect(path)}
          >
            <div className="path-icon">{path.icon}</div>
            <div className="path-content">
              <h3>{path.name}</h3>
              <p>{path.description}</p>
            </div>
            <div className="path-arrow">→</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCharacterSelection = () => (
    <div className="character-selection">
      <div className="selection-header">
        <button className="back-btn" onClick={() => setSelectedPath(null)}>
          ← العودة
        </button>
        <h2>اختر الشخصية 🧍</h2>
        <p>اختر شخصية إسلامية معينة لتتعلم قصتها</p>
      </div>

      <div className="characters-grid">
        {selectedPath.characters.map((character) => (
          <div 
            key={character.id}
            className={`character-card ${selectedCharacter?.id === character.id ? 'selected' : ''}`}
            onClick={() => handleCharacterSelect(character)}
          >
            <div className="character-avatar">
              <span className="avatar-emoji">👤</span>
            </div>
            <div className="character-info">
              <h4>{character.arabic_name}</h4>
              <p className="character-title">{character.title}</p>
              <p className="character-duration">⏱️ {character.duration} دقيقة</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStartButton = () => (
    <div className="start-section">
      {selectedPath && (
        <div className="selected-info">
          <h3>اختيارك:</h3>
          <p>
            {selectedPath.icon} {selectedPath.name}
            {selectedCharacter && ` - ${selectedCharacter.arabic_name}`}
          </p>
        </div>
      )}
      
      <button 
        className="start-btn"
        onClick={handleStartPath}
        disabled={!selectedPath || (selectedPath.id === 'character-based' && !selectedCharacter)}
      >
        {selectedPath?.id === 'character-based' && !selectedCharacter 
          ? 'اختر شخصية أولاً' 
          : 'ابدأ رحلة التعلم 🚀'
        }
      </button>
    </div>
  );

  return (
    <div className="path-selection-container">
      <div className="container">
        {!selectedPath && renderPathSelection()}
        {selectedPath?.id === 'character-based' && renderCharacterSelection()}
        
        {selectedPath && renderStartButton()}
      </div>
    </div>
  );
};

export default PathSelection;
