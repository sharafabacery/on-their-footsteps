// Debug script to test character API
import api from './src/services/api.js';

async function testCharacter() {
  try {
    console.log('Testing character API...');
    const response = await api.get('/characters/abu-bakr');
    console.log('API Response:', response);
    console.log('Character data:', response.data);
    
    // Test specific fields that might cause issues
    const character = response.data;
    console.log('Arabic name:', character.arabic_name);
    console.log('Full story exists:', !!character.full_story);
    console.log('Timeline events:', character.timeline_events);
    console.log('Key achievements:', character.key_achievements);
    console.log('Lessons:', character.lessons);
    
  } catch (error) {
    console.error('API Error:', error);
    console.error('Error response:', error.response);
  }
}

testCharacter();
