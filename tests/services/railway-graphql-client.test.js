/**
 * Railway GraphQL Client Tests
 */

const RailwayGraphQLClient = require('../../services/railway-graphql-client');

describe('RailwayGraphQLClient', () => {
  let client;

  beforeEach(() => {
    client = new RailwayGraphQLClient('test-token');
  });

  describe('Initialization', () => {
    test('should require API token', () => {
      expect(() => {
        new RailwayGraphQLClient();
      }).toThrow('Railway API token is required');
    });

    test('should create client with token', () => {
      expect(client.apiToken).toBe('test-token');
      expect(client.endpoint).toBe('https://backboard.railway.app/graphql');
    });

    test('should mask token correctly', () => {
      const masked = client.maskToken();
      expect(masked).toBe('test****oken');
    });

    test('should handle short tokens', () => {
      const shortClient = new RailwayGraphQLClient('ab');
      const masked = shortClient.maskToken();
      expect(masked).toBe('****');
    });
  });

  describe('Token Validation', () => {
    test('should validate Railway token format', () => {
      const validToken = 'raily_12345678901234567890123456789012';
      expect(client.isValidTokenFormat(validToken, 'railway')).toBe(true);
    });

    test('should reject invalid Railway token', () => {
      const invalidToken = 'short';
      expect(client.isValidTokenFormat(invalidToken, 'railway')).toBe(false);
    });

    test('should accept generic tokens', () => {
      expect(client.isValidTokenFormat('any-token-with-8-plus-chars')).toBe(true);
    });
  });

  describe('Retry Logic', () => {
    test('should implement exponential backoff', async () => {
      // Mock axios to simulate failures then success
      const mockAxios = jest.spyOn(client.client, 'request');
      mockAxios
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { data: { test: 'success' } } });

      const result = await client.execute('query { test }', {}, { retry: 3 });
      
      expect(result).toEqual({ test: 'success' });
      expect(mockAxios).toHaveBeenCalledTimes(3);
      
      mockAxios.mockRestore();
    });
  });
});
