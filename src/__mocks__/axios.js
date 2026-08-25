const mockAxios = {
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {}, status: 200 })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
  create: jest.fn(function () {
    return mockAxios;
  }),
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
  defaults: { headers: { common: {} } },
};

export default mockAxios;
