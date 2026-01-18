import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services/api'

const CharacterDetailTest = () => {
  const { id } = useParams()
  const [character, setCharacter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        setLoading(true)
        console.log('Fetching character with ID:', id)
        const response = await api.get(`/characters/${id}`)
        console.log('API Response:', response)
        console.log('Character data:', response.data)
        setCharacter(response.data)
        setError(null)
      } catch (err) {
        console.error('Error fetching character:', err)
        console.error('Error response:', err.response)
        setError(err.message || 'Failed to load character')
      } finally {
        setLoading(false)
      }
    }

    fetchCharacter()
  }, [id])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!character) return <div>No character found</div>

  return (
    <div>
      <h1>Character Detail Test</h1>
      <h2>{character.arabic_name || character.name}</h2>
      <p>{character.description}</p>
      <pre>{JSON.stringify(character, null, 2)}</pre>
    </div>
  )
}

export default CharacterDetailTest
