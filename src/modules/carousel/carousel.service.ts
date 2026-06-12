import { PrismaService } from '../prisma/prisma.service';
import { UpdateCarouselDto } from './dto/update-carousel.dto';
import { CreateCarouselDto } from './dto/create-carousel.dto';
import { CarouselResponseDto } from './dto/carousel-response.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CarouselPublicResponseDto } from './dto/carousel-public-response.dto';
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

@Injectable()
export class CarouselService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) { }

  private assertOrderRange(order: number, maxOrder: number) {
    if (!Number.isInteger(order) || order < 1 || order > maxOrder) {
      throw new BadRequestException(`Ordem deve ser um número inteiro entre 1 e ${maxOrder}.`);
    }
  }

  private async applySequentialOrders(tx: any, orderedIds: number[]) {
    if (!orderedIds.length) return;

    const maxOrder = await tx.carousel.aggregate({
      _max: { order: true },
    });
    const offset = (maxOrder._max.order ?? 0) + orderedIds.length + 1;

    await Promise.all(
      orderedIds.map((id, index) =>
        tx.carousel.update({
          where: { id },
          data: { order: offset + index },
        }),
      ),
    );

    await Promise.all(
      orderedIds.map((id, index) =>
        tx.carousel.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    );
  }

  private insertIdAtOrder(orderedIds: number[], id: number, order: number): number[] {
    const next = orderedIds.filter(itemId => itemId !== id);
    next.splice(order - 1, 0, id);
    return next;
  }

  async findAllPublic(): Promise<CarouselPublicResponseDto[]> {
    return this.prisma.carousel.findMany({
      where: { isActive: true },
      select: {
        name: true,
        imageUrl: true,
        order: true,
        isActive: true,
      },
      orderBy: { order: 'asc' },
    });
  }

  async findAll(): Promise<CarouselResponseDto[]> {
    return this.prisma.carousel.findMany({ orderBy: { order: 'asc' } });
  }

  async create(dto: CreateCarouselDto, file: Express.Multer.File): Promise<CarouselResponseDto> {
    if (!file) throw new ConflictException('Imagem obrigatória.');
    const existsName = await this.prisma.carousel.findFirst({ where: { name: dto.name } });
    if (existsName) throw new ConflictException(`Já existe uma imagem com o nome "${dto.name}".`);

    const count = await this.prisma.carousel.count();
    const targetOrder = dto.order ?? count + 1;
    this.assertOrderRange(targetOrder, count + 1);

    const upload = await this.cloudinary.uploadFile(file);
    return this.prisma.$transaction(async tx => {
      const maxOrder = await tx.carousel.aggregate({
        _max: { order: true },
      });
      const created = await tx.carousel.create({
        data: {
          name: dto.name,
          imageUrl: upload.secure_url,
          isActive: dto.isActive,
          order: (maxOrder._max.order ?? 0) + 1,
        },
      });
      const items = await tx.carousel.findMany({
        select: { id: true },
        orderBy: { order: 'asc' },
      });
      const orderedIds = this.insertIdAtOrder(items.map(item => item.id), created.id, targetOrder);
      await this.applySequentialOrders(tx, orderedIds);

      return tx.carousel.findUniqueOrThrow({ where: { id: created.id } });
    });
  }

  async update(id: number, dto: UpdateCarouselDto, file?: Express.Multer.File): Promise<CarouselResponseDto> {
    const exists = await this.prisma.carousel.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Imagem com id ${id} não encontrado.`);

    if (dto.name && dto.name !== exists.name) {
      const clashName = await this.prisma.carousel.findFirst({ where: { name: dto.name, id: { not: id } } });
      if (clashName) throw new ConflictException(`Já existe uma imagem com o nome "${dto.name}".`);
    }

    const items = await this.prisma.carousel.findMany({
      select: { id: true },
      orderBy: { order: 'asc' },
    });
    const currentPosition = items.findIndex(item => item.id === id) + 1;
    const targetOrder = dto.order ?? currentPosition;
    this.assertOrderRange(targetOrder, items.length);

    let imageUrl = exists.imageUrl;

    if (file) {
      const upload = await this.cloudinary.uploadFile(file);
      imageUrl = upload.secure_url;
    }

    const updated = await this.prisma.$transaction(async tx => {
      await tx.carousel.update({
        where: { id },
        data: {
          name: dto.name,
          isActive: dto.isActive,
          ...(file && { imageUrl }),
        },
      });
      const currentItems = await tx.carousel.findMany({
        select: { id: true },
        orderBy: { order: 'asc' },
      });
      const orderedIds = this.insertIdAtOrder(currentItems.map(item => item.id), id, targetOrder);
      await this.applySequentialOrders(tx, orderedIds);

      return tx.carousel.findUniqueOrThrow({ where: { id } });
    });

    if (file) {
      const parts = exists.imageUrl.split('/');
      const publicId = parts.slice(-2).join('/').split('.')[0];
      await this.cloudinary.deleteFile(publicId);
    }

    return updated;
  }

  async toggleActive(id: number, isActive: boolean): Promise<CarouselResponseDto> {
    const item = await this.prisma.carousel.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Slide com id ${id} não encontrado.`);
    return this.prisma.carousel.update({
      where: { id },
      data: { isActive },
    });
  }

  async delete(id: number): Promise<{ message: string }> {
    const exists = await this.prisma.carousel.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Carrossel com id ${id} não encontrado.`);

    await this.prisma.$transaction(async tx => {
      await tx.carousel.delete({ where: { id } });
      const items = await tx.carousel.findMany({
        select: { id: true },
        orderBy: { order: 'asc' },
      });
      await this.applySequentialOrders(tx, items.map(item => item.id));
    });

    const parts = exists.imageUrl.split('/');
    const publicId = parts.slice(-2).join('/').split('.')[0];
    await this.cloudinary.deleteFile(publicId);

    return { message: 'Item do carrossel deletado com sucesso.' };
  }
}
