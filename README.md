# React Trie-based Search Component - Quest TypeAhead

This repository contains a React component that implements a search functionality using a Trie (prefix tree) data structure. The component dynamically suggests search results based on user input, with the ability to prioritize frequently searched terms.

## Features

- **Trie Data Structure**: Efficiently manages and retrieves search suggestions based on prefixes.
- **Debounced Search**: Reduces the number of search operations by debouncing user input.
- **Dynamic Search Suggestions**: Updates and displays the top search suggestions as the user types.
- **Search Frequency Tracking**: Prioritizes search results based on the frequency of past searches.
- **Responsive UI**: Provides a user-friendly interface with real-time search suggestions.

## Installation

1. Clone this repository:
    ```bash
    git clone https://github.com/yourusername/your-repo-name.git
    cd your-repo-name
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Start the development server:
    ```bash
    npm run start
    ```

4. Open your browser and navigate to `http://localhost:3000`.

## File Structure

- `App.css`: Contains the styling for the component.
- `data.js`: Contains a `linkMap` object that maps search terms to corresponding URLs.
- `logo1.png`: The logo displayed at the top of the search component.
- `SearchComponent.js`: The main React component that handles the search functionality using a Trie data structure.

## How It Works

### Trie Data Structure

The Trie data structure is implemented to store and retrieve search terms efficiently. Each node in the Trie represents a character in a search term and can store child nodes, top search suggestions, and the frequency of searches for terms that match the node.

### Search Functionality

- **Inserting a Term**: When a user submits a search term, it is inserted into the Trie. If the term already exists, its search frequency is updated.
- **Updating Top Suggestions**: As terms are added to the Trie, the top suggestions are updated based on the frequency of searches.
- **Debounced Search**: The search input is debounced to prevent excessive function calls, ensuring that the search is performed only after the user stops typing for a specified delay.

### UI Components

- **Search Input**: The input field where users can type their search query.
- **Search Suggestions**: Displays a list of top search suggestions as the user types.
- **Search Links**: After selecting a search suggestion, corresponding links from the `linkMap` are displayed.

## Usage

1. **Search Terms**: Begin typing a search term in the input field. Suggestions will appear if the term matches any previously searched terms.
2. **Selecting a Suggestion**: Click on a suggestion to update the search frequency and display relevant links.
3. **Search Execution**: Press Enter to execute a search, which updates the Trie with the new term and its frequency.

## Customization

- **Debounce Delay**: The delay for the debounce function can be adjusted by modifying the delay value in the `handleSearchDebounced` function.
- **Minimum Search Term Length**: The minimum length for a search term to be considered can be modified in the `update` method of the Trie class.

## Contributing

Contributions are welcome! Please fork this repository and submit a pull request for any features, bug fixes, or improvements.

