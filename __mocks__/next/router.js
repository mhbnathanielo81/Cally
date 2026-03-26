// Mock next/router
const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  route: '/',
  events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
}));

module.exports = { useRouter, default: { useRouter } };
