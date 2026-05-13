export const healthSchema = {
  tags: ['health'],
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        uptimeSeconds: { type: 'number' },
        timestamp: { type: 'string' },
        redis: { type: 'string' },
        postgres: { type: 'string' },
      },
      required: ['status', 'uptimeSeconds', 'timestamp', 'redis', 'postgres'],
    },
  },
} as const;
