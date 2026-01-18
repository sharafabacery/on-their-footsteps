import React from 'react'
import { Routes, Route } from 'react-router-dom'
import AbuBakrCharacter from './components/characters/AbuBakrCharacter'
import { abuBakrData } from './data/characters'

const AppRoutes = () => {
  return (
    <Routes>
      <Route 
        path="/characters/abu-bakr" 
        element={<AbuBakrCharacter character={abuBakrData} />} 
      />
      {/* ... مسارات أخرى */}
    </Routes>
  )
}

export default AppRoutes