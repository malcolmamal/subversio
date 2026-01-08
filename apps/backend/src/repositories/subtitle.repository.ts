import { PrismaClient, Subtitle } from '@prisma/client';

export class SubtitleRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(skip: number, take: number): Promise<[Subtitle[], number]> {
    return Promise.all([
      this.prisma.subtitle.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.subtitle.count(),
    ]);
  }

  async findById(id: string): Promise<Subtitle | null> {
    return this.prisma.subtitle.findUnique({ where: { id } });
  }

  async findByStatus(status: string): Promise<Subtitle[]> {
    return this.prisma.subtitle.findMany({ where: { status: status as any } });
  }

  async create(data: any): Promise<Subtitle> {
    return this.prisma.subtitle.create({ data });
  }

  async update(id: string, data: any): Promise<Subtitle> {
    return this.prisma.subtitle.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.subtitle.delete({ where: { id } });
  }
}
