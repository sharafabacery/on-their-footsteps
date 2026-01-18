/**
 * Character Hook Tests
 * Tests for useCharacters and useCharacter hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useCharacters, useCharacter } from '../../hooks/useCharacters';
import CharacterRepository from '../../repositories/characterRepository';
import { createMockCharacter, createMockPagination, mockAsyncFunction } from '../utils/testUtils';

// Mock the CharacterRepository
jest.mock('../../repositories/characterRepository');

describe('useCharacters', () => {
  let mockRepository;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock repository
    mockRepository = {
      getAll: jest.fn(),
      search: jest.fn(),
      getByIdentifier: jest.fn(),
      getFeatured: jest.fn(),
      getCategories: jest.fn(),
      getEras: jest.fn(),
      setLike: jest.fn(),
      share: jest.fn(),
      incrementViews: jest.fn(),
    };
    
    // Mock the repository constructor
    CharacterRepository.mockImplementation(() => mockRepository);
  });

  describe('Basic functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useCharacters());

      expect(result.current.characters).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.pagination).toEqual({
        page: 1,
        limit: 12,
        total: 0,
        pages: 0
      });
    });

    it('should accept custom repository', () => {
      const customRepository = new CharacterRepository();
      const { result } = renderHook(() => useCharacters({ repository: customRepository }));

      expect(CharacterRepository).toHaveBeenCalledWith();
    });
  });

  describe('fetchCharacters', () => {
    it('should fetch characters successfully', async () => {
      const mockCharacters = [createMockCharacter(), createMockCharacter({ id: 2 })];
      const mockPagination = createMockPagination({ total: 2 });

      mockRepository.getAll.mockResolvedValue({
        data: mockCharacters,
        total: mockPagination.total,
        page: mockPagination.page,
        limit: mockPagination.limit
      });

      const { result } = renderHook(() => useCharacters());

      await act(async () => {
        await result.current.fetchCharacters();
      });

      expect(result.current.characters).toEqual(mockCharacters);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.pagination.total).toBe(2);
    });

    it('should handle fetch error', async () => {
      const errorMessage = 'Network error';
      mockRepository.getAll.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useCharacters());

      await act(async () => {
        await result.current.fetchCharacters();
      });

      expect(result.current.characters).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should use pagination parameters', async () => {
      const mockCharacters = [createMockCharacter()];
      mockRepository.getAll.mockResolvedValue({
        data: mockCharacters,
        total: 1,
        page: 2,
        limit: 10
      });

      const { result } = renderHook(() => useCharacters());

      // Set page and limit
      act(() => {
        result.current.setPage(2);
        result.current.setLimit(10);
      });

      await act(async () => {
        await result.current.fetchCharacters();
      });

      expect(mockRepository.getAll).toHaveBeenCalledWith({
        page: 2,
        limit: 10
      });
    });
  });

  describe('searchCharacters', () => {
    it('should search characters successfully', async () => {
      const mockResults = [createMockCharacter()];
      mockRepository.search.mockResolvedValue({
        results: mockResults,
        total: 1,
        query: 'test'
      });

      const { result } = renderHook(() => useCharacters());

      let searchResult;
      await act(async () => {
        searchResult = await result.current.searchCharacters('test');
      });

      expect(searchResult.results).toEqual(mockResults);
      expect(searchResult.total).toBe(1);
      expect(result.current.loading).toBe(false);
    });

    it('should handle search error', async () => {
      mockRepository.search.mockRejectedValue(new Error('Search failed'));

      const { result } = renderHook(() => useCharacters());

      let searchResult;
      await act(async () => {
        searchResult = await result.current.searchCharacters('test');
      });

      expect(searchResult.results).toEqual([]);
      expect(searchResult.total).toBe(0);
      expect(result.current.error).toBe('Search failed');
    });
  });

  describe('getFeatured', () => {
    it('should get featured characters', async () => {
      const mockFeatured = [createMockCharacter({ is_featured: true })];
      mockRepository.getFeatured.mockResolvedValue(mockFeatured);

      const { result } = renderHook(() => useCharacters());

      let featured;
      await act(async () => {
        featured = await result.current.getFeatured({ limit: 6 });
      });

      expect(featured).toEqual(mockFeatured);
      expect(mockRepository.getFeatured).toHaveBeenCalledWith({ limit: 6 });
    });
  });

  describe('getCategories', () => {
    it('should get categories', async () => {
      const mockCategories = ['الصحابة', 'الأنبياء'];
      mockRepository.getCategories.mockResolvedValue(mockCategories);

      const { result } = renderHook(() => useCharacters());

      let categories;
      await act(async () => {
        categories = await result.current.getCategories();
      });

      expect(categories).toEqual(mockCategories);
    });
  });

  describe('getEras', () => {
    it('should get eras', async () => {
      const mockEras = ['عصر النبوة', 'الخلافة الراشدة'];
      mockRepository.getEras.mockResolvedValue(mockEras);

      const { result } = renderHook(() => useCharacters());

      let eras;
      await act(async () => {
        eras = await result.current.getEras();
      });

      expect(eras).toEqual(mockEras);
    });
  });

  describe('pagination controls', () => {
    it('should set page', () => {
      const { result } = renderHook(() => useCharacters());

      act(() => {
        result.current.setPage(3);
      });

      expect(result.current.pagination.page).toBe(3);
    });

    it('should set limit', () => {
      const { result } = renderHook(() => useCharacters());

      act(() => {
        result.current.setLimit(20);
      });

      expect(result.current.pagination.limit).toBe(20);
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useCharacters());

      // Set error
      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('request cancellation', () => {
    it('should cancel previous request when new request is made', async () => {
      let resolveFirst;
      const firstPromise = new Promise(resolve => {
        resolveFirst = resolve;
      });

      const secondPromise = Promise.resolve({
        data: [createMockCharacter({ id: 2 })],
        total: 1,
        page: 1,
        limit: 12
      });

      mockRepository.getAll
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      const { result } = renderHook(() => useCharacters());

      // Start first request
      act(() => {
        result.current.fetchCharacters();
      });

      // Start second request (should cancel first)
      await act(async () => {
        await result.current.fetchCharacters();
      });

      // Resolve second request
      await act(async () => {
        resolveFirst([createMockCharacter({ id: 1 })]);
      });

      // Should have second request results
      expect(result.current.characters).toHaveLength(1);
      expect(result.current.characters[0].id).toBe(2);
    });
  });
});

describe('useCharacter', () => {
  let mockRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRepository = {
      getByIdentifier: jest.fn(),
      setLike: jest.fn(),
      share: jest.fn(),
      incrementViews: jest.fn(),
    };
    
    CharacterRepository.mockImplementation(() => mockRepository);
  });

  describe('Basic functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useCharacter('test-character'));

      expect(result.current.character).toBe(null);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should fetch character on mount', async () => {
      const mockCharacter = createMockCharacter({ slug: 'test-character' });
      mockRepository.getByIdentifier.mockResolvedValue(mockCharacter);

      const { result } = renderHook(() => useCharacter('test-character'));

      await waitFor(() => {
        expect(result.current.character).toEqual(mockCharacter);
        expect(result.current.loading).toBe(false);
      });

      expect(mockRepository.getByIdentifier).toHaveBeenCalledWith('test-character');
    });

    it('should handle fetch error', async () => {
      const errorMessage = 'Character not found';
      mockRepository.getByIdentifier.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useCharacter('test-character'));

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('toggleLike', () => {
    it('should toggle like successfully', async () => {
      const mockCharacter = createMockCharacter({ likes_count: 25 });
      const updatedCharacter = createMockCharacter({ likes_count: 26 });

      mockRepository.getByIdentifier.mockResolvedValue(mockCharacter);
      mockRepository.setLike.mockResolvedValue(updatedCharacter);

      const { result } = renderHook(() => useCharacter('test-character'));

      await waitFor(() => {
        expect(result.current.character).toEqual(mockCharacter);
      });

      await act(async () => {
        const result = await result.current.toggleLike(true);
      });

      expect(result).toEqual(updatedCharacter);
      expect(result.current.character.likes_count).toBe(26);
      expect(mockRepository.setLike).toHaveBeenCalledWith('test-character', true);
    });

    it('should handle toggle like error', async () => {
      const mockCharacter = createMockCharacter();
      mockRepository.getByIdentifier.mockResolvedValue(mockCharacter);
      mockRepository.setLike.mockRejectedValue(new Error('Failed to like'));

      const { result } = renderHook(() => useCharacter('test-character'));

      await waitFor(() => {
        expect(result.current.character).toEqual(mockCharacter);
      });

      await act(async () => {
        const result = await result.current.toggleLike(true);
      });

      expect(result).toBe(null);
      expect(result.current.error).toBe('Failed to like');
    });
  });

  describe('shareCharacter', () => {
    it('should share character successfully', async () => {
      const mockCharacter = createMockCharacter();
      const shareResult = { success: true, url: 'https://example.com/share' };

      mockRepository.getByIdentifier.mockResolvedValue(mockCharacter);
      mockRepository.share.mockResolvedValue(shareResult);

      const { result } = renderHook(() => useCharacter('test-character'));

      await waitFor(() => {
        expect(result.current.character).toEqual(mockCharacter);
      });

      await act(async () => {
        const result = await result.current.shareCharacter();
      });

      expect(result).toEqual(shareResult);
      expect(mockRepository.share).toHaveBeenCalledWith('test-character');
    });
  });

  describe('incrementViews', () => {
    it('should increment views successfully', async () => {
      const mockCharacter = createMockCharacter({ views_count: 100 });
      const updatedCharacter = createMockCharacter({ views_count: 101 });

      mockRepository.getByIdentifier.mockResolvedValue(mockCharacter);
      mockRepository.incrementViews.mockResolvedValue(updatedCharacter);

      const { result } = renderHook(() => useCharacter('test-character'));

      await waitFor(() => {
        expect(result.current.character).toEqual(mockCharacter);
      });

      await act(async () => {
        const result = await result.current.incrementViews();
      });

      expect(result).toEqual(updatedCharacter);
      expect(result.current.character.views_count).toBe(101);
    });

    it('should not set error on view increment failure', async () => {
      const mockCharacter = createMockCharacter();
      mockRepository.getByIdentifier.mockResolvedValue(mockCharacter);
      mockRepository.incrementViews.mockRejectedValue(new Error('Failed to increment'));

      const { result } = renderHook(() => useCharacter('test-character'));

      await waitFor(() => {
        expect(result.current.character).toEqual(mockCharacter);
      });

      await act(async () => {
        const result = await result.current.incrementViews();
      });

      expect(result).toBe(null);
      // Error should not be set for view count failures
      expect(result.current.error).toBe(null);
    });
  });

  describe('refetch', () => {
    it('should refetch character data', async () => {
      const initialCharacter = createMockCharacter({ views_count: 100 });
      const updatedCharacter = createMockCharacter({ views_count: 101 });

      mockRepository.getByIdentifier
        .mockResolvedValueOnce(initialCharacter)
        .mockResolvedValueOnce(updatedCharacter);

      const { result } = renderHook(() => useCharacter('test-character'));

      await waitFor(() => {
        expect(result.current.character).toEqual(initialCharacter);
      });

      await act(async () => {
        await result.current.fetchCharacter();
      });

      expect(result.current.character).toEqual(updatedCharacter);
      expect(mockRepository.getByIdentifier).toHaveBeenCalledTimes(2);
    });
  });

  describe('identifier change', () => {
    it('should fetch new character when identifier changes', async () => {
      const character1 = createMockCharacter({ id: 1, slug: 'character-1' });
      const character2 = createMockCharacter({ id: 2, slug: 'character-2' });

      mockRepository.getByIdentifier.mockResolvedValue(character1);

      const { result, rerender } = renderHook(
        ({ identifier }) => useCharacter(identifier),
        { initialProps: { identifier: 'character-1' } }
      );

      await waitFor(() => {
        expect(result.current.character).toEqual(character1);
      });

      // Change identifier
      mockRepository.getByIdentifier.mockResolvedValue(character2);
      rerender({ identifier: 'character-2' });

      await waitFor(() => {
        expect(result.current.character).toEqual(character2);
      });

      expect(mockRepository.getByIdentifier).toHaveBeenCalledWith('character-2');
    });
  });
});
