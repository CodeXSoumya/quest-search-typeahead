import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { linkMap } from './data';
import logo1 from './logo1.png';
import './App.css';

class TrieNode {
  constructor() {
    this.children = {};
    this.topSuggestions = [];
    this.searchFrequency = 0;
    this.isEndOfWord = false;
  }
}

class Trie {
  constructor(maxSuggestions = 10) {
    this.root = new TrieNode();
    this.maxSuggestions = maxSuggestions;
    this.cache = new Map();
  }

  insert(word) {
    if (!word || typeof word !== 'string' || word.length < 3) return;
    const normalizedWord = word.toLowerCase().trim();
    const node = this._getNodeByWord(normalizedWord);
    if (!node) {
      this.update({ word: normalizedWord, searchFrequency: 1 });
      return;
    }
    this.update({ word: normalizedWord, searchFrequency: node.searchFrequency + 1 });
    this._invalidateCache(normalizedWord);
  }

  update({ word, searchFrequency }) {
    if (!word || word.length < 3) return;
    let node = this.root;
    let depth = 0;
    for (const char of word) {
      node = this._getOrCreateChild(node, char);
      if (depth >= 2) this._updateTopSuggestions(node, word, searchFrequency);
      depth++;
    }
    node.searchFrequency = searchFrequency;
    node.isEndOfWord = true;
  }

  _getOrCreateChild(node, char) {
    if (!node.children[char]) node.children[char] = new TrieNode();
    return node.children[char];
  }

  _updateTopSuggestions(node, word, searchFrequency) {
    const existingIndex = node.topSuggestions.findIndex(s => s.word === word);
    if (existingIndex !== -1) node.topSuggestions.splice(existingIndex, 1);
    node.topSuggestions.push({ word, searchFrequency });
    node.topSuggestions.sort((a, b) => {
      if (b.searchFrequency !== a.searchFrequency) return b.searchFrequency - a.searchFrequency;
      return a.word.localeCompare(b.word);
    });
    if (node.topSuggestions.length > this.maxSuggestions) {
      node.topSuggestions = node.topSuggestions.slice(0, this.maxSuggestions);
    }
  }

  _getNodeByWord(word) {
    let node = this.root;
    for (const char of word) {
      node = node.children[char];
      if (!node) return null;
    }
    return node;
  }

  search(prefix) {
    if (!prefix || prefix.length < 3) return [];
    const normalizedPrefix = prefix.toLowerCase().trim();
    if (this.cache.has(normalizedPrefix)) return this.cache.get(normalizedPrefix);
    const node = this._getNodeByWord(normalizedPrefix);
    const results = node ? node.topSuggestions : [];
    this.cache.set(normalizedPrefix, results);
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    return results;
  }

  _invalidateCache(word) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (word.startsWith(key) || key.startsWith(word)) keysToDelete.push(key);
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  getStats() {
    let nodeCount = 0;
    let wordCount = 0;
    const traverse = node => {
      nodeCount++;
      if (node.isEndOfWord) wordCount++;
      Object.values(node.children).forEach(traverse);
    };
    traverse(this.root);
    return { nodeCount, wordCount, cacheSize: this.cache.size };
  }
}

const debounce = (func, delay) => {
  let timeoutId;
  const debouncedFn = (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
  debouncedFn.cancel = () => clearTimeout(timeoutId);
  return debouncedFn;
};

const SearchComponent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLinks, setSelectedLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const trie = useMemo(() => new Trie(10), []);

  useEffect(() => {
    const initializeTrie = () => {
      try {
        setIsLoading(true);
        const previousSearchTerms = Object.keys(linkMap);
        previousSearchTerms.forEach(term => trie.insert(term.toLowerCase()));
        setIsLoading(false);
        console.log('Trie initialized:', trie.getStats());
      } catch (err) {
        console.error('Error initializing Trie:', err);
        setError('Failed to initialize search. Please refresh the page.');
        setIsLoading(false);
      }
    };
    initializeTrie();
  }, [trie]);

  const handleSearch = useCallback(() => {
    try {
      const query = searchQuery.trim().toLowerCase();
      if (query.length >= 3) {
        const results = trie.search(query);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setHighlightedIndex(-1);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedLinks([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed. Please try again.');
    }
  }, [searchQuery, trie]);

  const handleSearchDebounced = useMemo(() => debounce(handleSearch, 150), [handleSearch]);

  useEffect(() => {
    return () => {
      if (handleSearchDebounced.cancel) handleSearchDebounced.cancel();
    };
  }, [handleSearchDebounced]);

  const handleInputChange = event => {
    const value = event.target.value;
    setSearchQuery(value);
    setError(null);
    handleSearchDebounced();
  };

  const updateSearchLinks = useCallback(term => {
    const normalizedTerm = term.toLowerCase().trim();
    if (linkMap && linkMap[normalizedTerm]) {
      setSelectedLinks(linkMap[normalizedTerm]);
      return linkMap[normalizedTerm];
    }
    setSelectedLinks([]);
    return [];
  }, []);

  const selectSuggestion = useCallback(
    suggestion => {
      setSearchQuery(suggestion.word);
      setShowSuggestions(false);
      trie.insert(suggestion.word);
      updateSearchLinks(suggestion.word);
      setHighlightedIndex(-1);
    },
    [trie, updateSearchLinks]
  );

  const handleKeyDown = event => {
    if (!showSuggestions || suggestions.length === 0) {
      if (event.key === 'Enter' && searchQuery.trim().length >= 3) {
        const query = searchQuery.trim().toLowerCase();
        trie.insert(query);
        updateSearchLinks(query);
        setShowSuggestions(false);
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          selectSuggestion(suggestions[highlightedIndex]);
        } else if (searchQuery.trim().length >= 3) {
          const query = searchQuery.trim().toLowerCase();
          trie.insert(query);
          updateSearchLinks(query);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = event => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (highlightedIndex >= 0 && suggestionsRef.current) {
      const highlightedElement = suggestionsRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  return (
    <div id="app">
      <div className="center-image">
        <img src={logo1} alt="Quest Search Logo" />
      </div>

      {error && (
        <div
          className="error-message"
          style={{
            color: '#e74c3c',
            textAlign: 'center',
            marginBottom: '1rem',
            padding: '0.5rem',
            backgroundColor: '#fadbd8',
            borderRadius: '4px'
          }}
        >
          {error}
        </div>
      )}

      <div className="search-container" id="searchContainer">
        <div className="search-icon">
          <i className="fas fa-search"></i>
        </div>

        <input
          ref={inputRef}
          type="text"
          id="searchInput"
          className="search-input"
          placeholder={isLoading ? 'Loading...' : 'Search Quest...'}
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          disabled={isLoading}
          aria-label="Search for development resources"
          aria-autocomplete="list"
          aria-controls="searchOptions"
          aria-expanded={showSuggestions}
          autoComplete="off"
        />

        {searchQuery && (
          <button
            className="clear-button"
            onClick={() => {
              setSearchQuery('');
              setSuggestions([]);
              setShowSuggestions(false);
              setSelectedLinks([]);
              setHighlightedIndex(-1);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#999',
              padding: '4px'
            }}
          >
            ×
          </button>
        )}
      </div>

      <div>
        <div
          ref={suggestionsRef}
          className="search-options"
          id="searchOptions"
          role="listbox"
          style={{
            maxHeight: showSuggestions ? '400px' : '0',
            overflowY: 'auto',
            transition: 'max-height 0.3s ease'
          }}
        >
          {showSuggestions &&
            suggestions.map((option, index) => (
              <div
                key={`${option.word}-${index}`}
                className={`search-option ${index === highlightedIndex ? 'highlighted' : ''}`}
                onMouseDown={e => {
                  e.preventDefault();
                  selectSuggestion(option);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                role="option"
                aria-selected={index === highlightedIndex}
                style={{
                  backgroundColor: index === highlightedIndex ? '#f0f0f0' : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{option.word}</span>
                {option.searchFrequency > 1 && (
                  <span
                    className="frequency-badge"
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      backgroundColor: '#e0e0e0',
                      padding: '2px 6px',
                      borderRadius: '10px'
                    }}
                  >
                    {option.searchFrequency}
                  </span>
                )}
              </div>
            ))}

          {showSuggestions && suggestions.length === 0 && searchQuery.length >= 3 && (
            <div className="search-option" style={{ color: '#999', fontStyle: 'italic' }}>
              No suggestions found
            </div>
          )}
        </div>
      </div>

      <div className="links" id="links">
        {selectedLinks.length > 0 && (
          <div
            style={{
              marginBottom: '10px',
              fontSize: '14px',
              color: '#666',
              textAlign: 'center'
            }}
          >
            Found {selectedLinks.length} resources
          </div>
        )}

        {selectedLinks.map((link, index) => (
          <a
            key={`${link}-${index}`}
            href={link}
            className="search-option"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Resource ${index + 1}: ${link}`}
          >
            {link}
          </a>
        ))}
      </div>
    </div>
  );
};

export default SearchComponent;
