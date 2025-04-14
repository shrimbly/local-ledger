import { PrismaClient } from './src/main/database/generated/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('Connected successfully');
    
    // Create a test category
    const category = await prisma.category.create({
      data: { name: 'Test Category ' + new Date().toISOString() }
    });
    console.log('Created category:', category);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 