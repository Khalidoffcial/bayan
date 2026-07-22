// eventBus.js
const events = {};

export const emit = (event, data) => {
  if (events[event]) {
    events[event].forEach(callback => callback(data));
  }
};

export const on = (event, callback) => {
  if (!events[event]) {
    events[event] = [];
  }
  events[event].push(callback);
};

export const off = (event, callback) => {
  if (events[event]) {
    events[event] = events[event].filter(cb => cb !== callback);
  }
};
