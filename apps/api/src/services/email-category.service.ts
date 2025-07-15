import { prisma } from '@/config/database';

export class EmailCategoryService {
  // Prefer batchUpdateCategories for multiple updates
  static async updateEmailCategory(userId: string, emailId: string, category: string) {
    const email = await prisma.email.findFirst({
      where: { id: emailId, userId },
    });

    if (!email) {
      return null;
    }

    const originalCategory = email.category;

    const updatedEmail = await prisma.email.update({
      where: { id: emailId },
      data: {
        category,
        categoryConfidence: 1.0,
        categoryDescription: `Manually set to ${category}`,
        categorizedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (originalCategory && originalCategory !== category) {
      await this.recordCategoryCorrection(userId, emailId, originalCategory, category);
    }

    return updatedEmail;
  }

  static async getUserCategories(userId: string) {
    const categoryCounts = await prisma.email.groupBy({
      by: ['category'],
      _count: { id: true },
      where: {
        userId,
        category: { not: null },
      },
      orderBy: { _count: { id: 'desc' } },
    });

    return categoryCounts.map(item => ({
      name: item.category,
      count: item._count.id,
    }));
  }

  static async getCategoryStats(userId: string) {
    const stats = await prisma.email.groupBy({
      by: ['category'],
      _count: { id: true },
      _avg: { categoryConfidence: true },
      where: {
        userId,
        category: { not: null },
      },
    });

    return stats.map(stat => ({
      category: stat.category,
      count: stat._count.id,
      avgConfidence: stat._avg.categoryConfidence || 0,
    }));
  }

  static async getUncategorizedEmails(userId: string, limit = 50) {
    return prisma.email.findMany({
      where: {
        userId,
        category: null,
      },
      orderBy: { date: 'desc' },
      take: limit,
      select: {
        id: true,
        subject: true,
        from: true,
        snippet: true,
        date: true,
      },
    });
  }

  // Use this for efficient batch updates
  static async batchUpdateCategories(userId: string, updates: Array<{ emailId: string; category: string }>) {
    if (!updates.length) return [];
    const prismaOps = updates.map(update =>
      prisma.email.update({
        where: { id: update.emailId, userId },
        data: {
          category: update.category,
          categoryConfidence: 1.0,
          categoryDescription: `Manually set to ${update.category}`,
          categorizedAt: new Date(),
          updatedAt: new Date(),
        },
      })
    );
    let results = [];
    try {
      const txResults = await prisma.$transaction(prismaOps);
      results = txResults.map((res, i) => ({ emailId: updates[i].emailId, success: !!res }));
      // Optionally, record corrections in batch (not implemented here for brevity)
    } catch (error) {
      results = updates.map(update => ({ emailId: update.emailId, success: false, error }));
    }
    return results;
  }

  private static async recordCategoryCorrection(
    userId: string,
    emailId: string,
    originalCategory: string,
    newCategory: string
  ) {
    try {
      console.log(`Category correction recorded: ${originalCategory} -> ${newCategory} for email ${emailId}`);
    } catch (error) {
      console.error('Failed to record category correction:', error);
    }
  }
}