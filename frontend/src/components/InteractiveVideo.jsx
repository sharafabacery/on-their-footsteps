import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

const InteractiveVideo = () => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [interactivePoints, setInteractivePoints] = useState([
    { time: 30, title: "حادثة الإسراء والمعراج", content: "كيف صدق أبو بكر النبي ﷺ" },
    { time: 90, title: "الهجرة إلى المدينة", content: "رفقة أبو بكر للنبي في الغار" },
    { time: 150, title: "بيعة السقيفة", content: "كيف تم اختيار أبو بكر خليفة" }
  ]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleInteractiveClick = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Video Player */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          className="w-full h-auto"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          controls
        >
          <source src="/static/videos/abu_bakr_story.mp4" type="video/mp4" />
        </video>

        {/* Interactive Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {interactivePoints.map((point, idx) => {
            const isActive = Math.abs(currentTime - point.time) < 5;
            
            return (
              <motion.div
                key={idx}
                className="absolute pointer-events-auto"
                style={{
                  left: `${(point.time / 180) * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
                initial={{ scale: 0 }}
                animate={{ 
                  scale: isActive ? 1 : 0.8,
                  opacity: isActive ? 1 : 0.7
                }}
                whileHover={{ scale: 1.2 }}
              >
                <button
                  onClick={() => handleInteractiveClick(point.time)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg'
                      : 'bg-white/80 backdrop-blur-sm'
                  }`}
                >
                  <span className="text-white font-bold">{idx + 1}</span>
                </button>

                {/* Tooltip */}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 min-w-[200px] bg-white rounded-lg shadow-xl p-4"
                  >
                    <h4 className="font-bold text-gray-800 mb-2">{point.title}</h4>
                    <p className="text-sm text-gray-600">{point.content}</p>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Timeline Points */}
      <div className="mt-6">
        <div className="h-1 bg-gray-200 rounded-full relative">
          {interactivePoints.map((point, idx) => (
            <button
              key={idx}
              onClick={() => handleInteractiveClick(point.time)}
              className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-green-500 rounded-full hover:scale-125 transition-transform"
              style={{ left: `${(point.time / 180) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default InteractiveVideo;