/**
 * Character Repository - Data access layer for character operations
 * Provides abstraction over API calls and handles data transformation
 */

import api from '../services/api';

class CharacterRepository {
  constructor(apiClient = api) {
    this.api = apiClient;
  }

  /**
   * Get all characters with optional filtering
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.category - Filter by category
   * @param {string} params.era - Filter by era
   * @param {string} params.sort - Sort field
   * @returns {Promise<Object>} Characters list with pagination
   */
  async getAll(params = {}) {
    const response = await this.api.get('/characters', { params });
    return {
      data: response.data,
      total: response.headers['x-total-count'] || response.data.length,
      page: params.page || 1,
      limit: params.limit || 12
    };
  }

  /**
   * Get character by ID or slug
   * @param {string|number} identifier - Character ID or slug
   * @returns {Promise<Object>} Character data
   */
  async getByIdentifier(identifier) {
    const response = await this.api.get(`/characters/${identifier}`);
    return response.data;
  }

  /**
   * Search characters by query
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {number} options.limit - Result limit
   * @param {string} options.category - Filter by category
   * @param {string} options.era - Filter by era
   * @returns {Promise<Object>} Search results
   */
  async search(query, options = {}) {
    const params = {
      q: query,
      limit: options.limit || 20,
      ...options
    };
    
    const response = await this.api.get('/content/search', { params });
    return {
      results: response.data.results || response.data,
      total: response.data.total || response.data.length,
      query,
      options
    };
  }

  /**
   * Get featured characters
   * @param {Object} options - Featured options
   * @param {number} options.limit - Number of items
   * @param {string} options.category - Filter by category
   * @returns {Promise<Array>} Featured characters
   */
  async getFeatured(options = {}) {
    const { limit = 6, category } = options;
    
    let url;
    if (category) {
      url = `/content/featured/${category}`;
    } else {
      url = '/content/featured/general';
    }
    
    const response = await this.api.get(url, { params: { limit } });
    return response.data;
  }

  /**
   * Get characters by category
   * @param {string} category - Category name
   * @param {Object} options - Query options
   * @param {number} options.limit - Result limit
   * @param {number} options.page - Page number
   * @param {string} options.sort - Sort field
   * @returns {Promise<Object>} Characters by category
   */
  async getByCategory(category, options = {}) {
    const params = {
      category,
      limit: options.limit || 12,
      page: options.page || 1,
      sort: options.sort || 'name'
    };
    
    const response = await this.api.get('/characters', { params });
    return {
      data: response.data,
      category,
      total: response.headers['x-total-count'] || response.data.length,
      page: params.page,
      limit: params.limit
    };
  }

  /**
   * Get characters by era
   * @param {string} era - Era name
   * @param {Object} options - Query options
   * @param {number} options.limit - Result limit
   * @param {number} options.page - Page number
   * @param {string} options.sort - Sort field
   * @returns {Promise<Object>} Characters by era
   */
  async getByEra(era, options = {}) {
    const params = {
      era,
      limit: options.limit || 12,
      page: options.page || 1,
      sort: options.sort || 'name'
    };
    
    const response = await this.api.get('/characters', { params });
    return {
      data: response.data,
      era,
      total: response.headers['x-total-count'] || response.data.length,
      page: params.page,
      limit: params.limit
    };
  }

  /**
   * Get related characters
   * @param {string|number} characterId - Character ID or slug
   * @param {Object} options - Query options
   * @param {number} options.limit - Result limit
   * @returns {Promise<Array>} Related characters
   */
  async getRelated(characterId, options = {}) {
    const params = {
      limit: options.limit || 6
    };
    
    const response = await this.api.get(`/characters/${characterId}/related`, { params });
    return response.data;
  }

  /**
   * Get all available categories
   * @returns {Promise<Array>} Categories list
   */
  async getCategories() {
    const response = await this.api.get('/content/categories');
    return response.data;
  }

  /**
   * Get all available eras
   * @returns {Promise<Array>} Eras list
   */
  async getEras() {
    const response = await this.api.get('/content/eras');
    return response.data;
  }

  /**
   * Get subcategories for a category
   * @param {string} category - Category name
   * @returns {Promise<Array>} Subcategories list
   */
  async getSubcategories(category) {
    const response = await this.api.get(`/content/subcategories/${category}`);
    return response.data;
  }

  /**
   * Create new character (admin only)
   * @param {Object} characterData - Character data
   * @returns {Promise<Object>} Created character
   */
  async create(characterData) {
    const response = await this.api.post('/characters', characterData);
    return response.data;
  }

  /**
   * Update character (admin only)
   * @param {string|number} identifier - Character ID or slug
   * @param {Object} characterData - Updated character data
   * @returns {Promise<Object>} Updated character
   */
  async update(identifier, characterData) {
    const response = await this.api.put(`/characters/${identifier}`, characterData);
    return response.data;
  }

  /**
   * Delete character (admin only)
   * @param {string|number} identifier - Character ID or slug
   * @returns {Promise<Object>} Deletion result
   */
  async delete(identifier) {
    const response = await this.api.delete(`/characters/${identifier}`);
    return response.data;
  }

  /**
   * Increment character view count
   * @param {string|number} identifier - Character ID or slug
   * @returns {Promise<Object>} Updated character
   */
  async incrementViews(identifier) {
    const response = await this.api.post(`/characters/${identifier}/view`);
    return response.data;
  }

  /**
   * Like/unlike character
   * @param {string|number} identifier - Character ID or slug
   * @param {boolean} liked - Like status
   * @returns {Promise<Object>} Updated character
   */
  async setLike(identifier, liked) {
    const response = await this.api.patch(`/characters/${identifier}/like`, { liked });
    return response.data;
  }

  /**
   * Share character
   * @param {string|number} identifier - Character ID or slug
   * @returns {Promise<Object>} Share result
   */
  async share(identifier) {
    const response = await this.api.post(`/characters/${identifier}/share`);
    return response.data;
  }
}

export default CharacterRepository;
