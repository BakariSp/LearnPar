# Learning Paths Shared Styles

This directory contains shared styles for the Learning Paths components.

## Usage

Import the shared styles in your component:

```jsx
// Option 1: Import all shared styles
import styles from '../styles';

// Option 2: Import specific styles
import { sharedStyles } from '../styles';
```

## Structure

- `shared.module.css`: Contains all shared styles extracted from learning-path-detail.module.css
- `index.ts`: Exports the shared styles for easy importing

## Shared Components

The following components use these shared styles:

1. `LearningPathLayout` - Main layout for learning paths
2. `PathNavigation` - Navigation sidebar for learning paths
3. `CardDetailView` - Displays card details 
4. `LearnAssistant` - AI assistant for learning

## Style Categories

The shared styles include:

- Page container and layout structure
- Navigation pane styles
- Card detail container and content
- Card progress indicators
- Loading and error states
- Responsive adjustments

## Customizing

Each component can still have its own specific styles in a separate CSS module. When both shared and component-specific styles are needed, import both:

```jsx
import styles from '../styles';
import localStyles from './YourComponent.module.css';
``` 