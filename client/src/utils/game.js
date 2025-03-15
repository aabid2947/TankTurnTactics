// Calculate distance between two points on the grid
export const calculateDistance = (x1, y1, x2, y2) => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

// Check if a position is within range
export const isWithinRange = (x1, y1, x2, y2, range) => {
  return calculateDistance(x1, y1, x2, y2) <= range;
};

// Check if a position is valid (within the grid and not occupied)
export const isValidPosition = (x, y, grid, gridSize) => {
  // Check if position is within grid bounds
  if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) {
    return false;
  }

  // Check if position is not occupied
  return !grid[y][x].occupied;
};

// Get adjacent positions (up, down, left, right)
export const getAdjacentPositions = (x, y, gridSize) => {
  const positions = [];

  // Up
  if (y > 0) {
    positions.push({ x, y: y - 1 });
  }

  // Down
  if (y < gridSize - 1) {
    positions.push({ x, y: y + 1 });
  }

  // Left
  if (x > 0) {
    positions.push({ x: x - 1, y });
  }

  // Right
  if (x < gridSize - 1) {
    positions.push({ x: x + 1, y });
  }

  return positions;
};

// Format timestamp to readable date/time
export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
}; 