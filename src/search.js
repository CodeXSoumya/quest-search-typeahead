import React, { useState, useEffect, useCallback } from 'react';
import { linkMap } from './data';
import logo1 from './logo1.png';
import './App.css';

class TrieNode {
  constructor() {
    this.children = {};
    this.topSuggestions = [];
    this.searchFrequency = 0;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  async insert(word) {
    const node = this._getNodeByWord(word);
    if (!node) {
      await this.update({ word, searchFrequency: 1 });
      return;
    }
    await this.update({ word, searchFrequency: node.searchFrequency + 1 });
  }

  async update({ word, searchFrequency }) {
    if (word.length < 3) return;

    let node = this.root;
    let depth = 1;

    for (let char of word) {
      node = await this._getOrCreateChild(node, char);

      if (depth >= 3) {
        await this.updateTopSuggestions(node, word, searchFrequency);
      }

      depth++;
    }
    node.searchFrequency = searchFrequency;
  }

  async _getOrCreateChild(node, char) {
    if (!node.children[char]) {
      node.children[char] = new TrieNode();
    }
    return node.children[char];
  }

  async updateTopSuggestions(node, word, searchFrequency) {
    node.topSuggestions = node.topSuggestions.filter(suggestion => suggestion.word !== word);
    node.topSuggestions.push({ word, searchFrequency });
    node.topSuggestions.sort((a, b) => b.searchFrequency - a.searchFrequency);
    node.topSuggestions = node.topSuggestions.slice(0, 10);
  }

  _getNodeByWord(word) {
    let node = this.root;
    for (let char of word) {
      node = node.children[char];
      if (!node) return null;
    }
    return node;
  }

  search(prefix) {
    const node = this._getNodeByWord(prefix);
    return node ? node.topSuggestions : [];
  }
}

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

const SearchComponent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [trie] = useState(new Trie());

  useEffect(() => {
    const initializeTrie = async () => {
      const previousSearchTerms = Object.keys(linkMap);
      for (let term of previousSearchTerms) {
        await trie.insert(term.toLowerCase());
      }
    };
    initializeTrie();
  }, [trie]);

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length >= 3) {
      const results = trie.search(query);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [searchQuery, trie]);

  const handleSearchDebounced = useCallback(debounce(handleSearch, 100), [handleSearch]);

  const handleInputChange = (event) => {
    setSearchQuery(event.target.value);
    handleSearchDebounced();
  };

  const handleEnterKey = async (event) => {
    if (event.key === 'Enter') {
      const query = searchQuery.trim();
      if (query.length > 3) {
        await trie.insert(query);
        updateSearchLinks(query);
        setShowSuggestions(false);
      }
    }
  };

  const updateSearchLinks = (term) => {
    if (!linkMap || !linkMap[term]) return [];
    return linkMap[term];
  };

  return (
    <div id="app">
      <div className="center-image">
        <img src={logo1} alt="quest" />
      </div>
      <div className="search-container" id="searchContainer">
        <div className="search-icon"><i className="fas fa-search"></i></div>
        <input
          type="text"
          id="searchInput"
          className="search-input"
          placeholder="Search Quest..."
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleEnterKey}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setShowSuggestions(false)}
        />
      </div>
      <div>
        <div className="search-options" id="searchOptions">
          {showSuggestions && suggestions.map((option) => (
            <div
              key={option.word}
              className="search-option"
              onMouseDown={async () => {
                setSearchQuery(option.word);
                setShowSuggestions(false);
                await trie.update({ ...option, searchFrequency: option.searchFrequency + 1 });
                updateSearchLinks(option.word);
              }}
            >
              {option.word}
            </div>
          ))}
        </div>
      </div>
      <div className="links" id="links">
        {updateSearchLinks(searchQuery.trim()).map((link, index) => (
          <a key={index} href={link} className="search-option">
            {link}
          </a>
        ))}
      </div>
    </div>
  );
};

export default SearchComponent;
