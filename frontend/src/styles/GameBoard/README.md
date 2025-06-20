# GameBoard CSS Modularization

This document explains the modular CSS structure for the GameBoard component.

## 📁 Structure

The GameBoard CSS has been modularized into focused, maintainable modules:

```
frontend/src/styles/GameBoard/
├── index.css           # Main entry point - imports all modules
├── variables.css       # CSS custom properties and constants
├── containers.css      # Main container and layout styles
├── loading.css         # Loading screens and error states
├── player-positions.css # Player positioning for 2, 4, and 6 players
├── avatars.css         # Player avatar styles
├── cards.css           # Card styling and animations
├── header.css          # Game header and scoreboard
├── hand.css            # Player hand and card interaction
├── actions.css         # Action buttons and panels
├── table.css           # Game table/mesa styles
├── mode-2v2.css        # Specific styles for 2v2 mode
├── utilities.css       # Utility classes and indicators
└── responsive.css      # Responsive design and media queries
```

## 🎯 Module Breakdown

### **variables.css**
- CSS custom properties for colors, spacing, and z-index values
- Centralized constants for easy theming and maintenance

### **containers.css**
- Main game container and layout structure
- Basic flex layouts and positioning

### **loading.css**
- Loading spinner and animations
- Error screen styling
- Loading message styles

### **player-positions.css**
- Positioning logic for different player counts (1v1, 2v2, 3v3)
- Player slot positioning around the table
- Circular table layout calculations

### **avatars.css**
- Player avatar styling and states
- Connection indicators
- Team differentiation
- Hover and active states

### **cards.css**
- Card styling and animations
- Played card positioning
- Card interaction effects
- Card overlays and info displays

### **header.css**
- Game header layout and styling
- Team scoreboard
- Room information display
- Control buttons

### **hand.css**
- Player hand container and card layout
- Turn indicators
- Card selection and hover effects
- Hand placeholder states

### **actions.css**
- Action button styling (Truco, Envido, etc.)
- Panel layouts and backgrounds
- Button states and hover effects
- Form inputs for point declaration

### **table.css**
- Game table/mesa surface styling
- Player positioning around the table
- Card positioning on the table
- Perspective and layout for different game modes

### **mode-2v2.css**
- Specific styling for 2v2 game mode
- Z-index management for proper layering
- Avatar and card positioning optimization
- Debug mode styles for development
- Responsive adaptations for 2v2 layout

### **utilities.css**
- Utility classes for common styling needs
- Animation keyframes
- Text and spacing utilities
- Flex utilities
- Special indicators (like "TÚ" indicator)

### **responsive.css**
- Media queries for different screen sizes
- Mobile-specific adaptations
- Tablet and desktop breakpoints
- Responsive table layouts

## 🔄 Migration Guide

### **Before (Monolithic)**
```tsx
import '../styles/GameBoard.css';
```

### **After (Modular)**
```tsx
import '../styles/GameBoard/index.css';
```

The `index.css` file imports all modules in the correct order, maintaining backwards compatibility.

## 🎨 Benefits

1. **Better Organization**: Each module focuses on a specific concern
2. **Easier Maintenance**: Smaller, focused files are easier to update
3. **Better Collaboration**: Team members can work on different modules simultaneously
4. **Selective Importing**: Ability to import only specific modules if needed
5. **Performance**: Better CSS tree-shaking potential
6. **Debugging**: Easier to locate and fix style issues

## 📏 CSS Architecture Principles

- **Modular Design**: Each file has a single responsibility
- **Consistent Naming**: BEM-like naming convention maintained
- **Logical Ordering**: Imports follow dependency order
- **Responsive First**: Mobile styles integrated per module when relevant
- **Performance Optimized**: Animations and effects grouped efficiently

## 🔧 Development Guidelines

1. **Adding New Styles**: Add to the appropriate module based on functionality
2. **Variables**: Use CSS custom properties from `variables.css`
3. **Responsive**: Add responsive styles to `responsive.css` or inline with the component
4. **Utilities**: Common patterns should go in `utilities.css`
5. **Testing**: Always test across different screen sizes and game modes

## 📦 File Size Reduction

The original `GameBoard.css` was **1,752 lines**. The modular approach:
- Improves maintainability
- Enables better caching strategies
- Allows for easier debugging
- Facilitates team collaboration
- Provides better code organization

## 🚀 Future Enhancements

- Consider CSS-in-JS migration for dynamic theming
- Implement CSS modules for style encapsulation
- Add PostCSS processing for better optimization
- Consider Tailwind CSS integration for utility classes
