// Import directly from the generated client directory with a more reliable path
const path = require('path');
const { PrismaClient } = require(path.join(__dirname, 'database/generated/client'));

// Use a singleton pattern to avoid multiple client instances
const prisma = new PrismaClient({
  log: [
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
    { emit: 'stdout', level: 'info' }
  ]
});

// Log any Prisma query errors
prisma.$on('error', (e) => {
  console.error('Prisma Error:', e);
});

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    console.log('Query: ' + e.query);
    console.log('Duration: ' + e.duration + 'ms');
  });
}

// Export for both CommonJS and possible ES Module interop
module.exports = { prisma }; 