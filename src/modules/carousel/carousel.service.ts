import { PrismaService } from '../prisma/prisma.service';
import { UpdateCarouselDto } from './dto/update-carousel.dto';
import { CreateCarouselDto } from './dto/create-carousel.dto';
import { CarouselResponseDto } from './dto/carousel-response.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CarouselPublicResponseDto } from './dto/carousel-public-response.dto';
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

@Injectable()
export class CarouselService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) { }

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

    const existsOrder = await this.prisma.carousel.findFirst({ where: { order: dto.order } });
    if (existsOrder) throw new ConflictException(`Já existe uma imagem na ordem ${dto.order}.`);

    const upload = await this.cloudinary.uploadFile(file);
    return this.prisma.carousel.create({
      data: {
        name: dto.name,
        imageUrl: upload.secure_url,
        isActive: dto.isActive,
        order: dto.order,
      },
    });
  }

  async update(id: number, dto: UpdateCarouselDto, file?: Express.Multer.File): Promise<CarouselResponseDto> {
    const exists = await this.prisma.carousel.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Imagem com id ${id} não encontrado.`);

    if (dto.name && dto.name !== exists.name) {
      const clashName = await this.prisma.carousel.findFirst({ where: { name: dto.name, id: { not: id } } });
      if (clashName) throw new ConflictException(`Já existe uma imagem com o nome "${dto.name}".`);
    }

    if (dto.order !== undefined && dto.order !== exists.order) {
      const clashOrder = await this.prisma.carousel.findFirst({ where: { order: dto.order, id: { not: id } } });
      if (clashOrder) throw new ConflictException(`Já existe uma imagem na ordem ${dto.order}.`);
    }

    let imageUrl = exists.imageUrl;

    if (file) {
      const parts = exists.imageUrl.split('/');
      const publicId = parts.slice(-2).join('/').split('.')[0];
      await this.cloudinary.deleteFile(publicId);

      const upload = await this.cloudinary.uploadFile(file);
      imageUrl = upload.secure_url;
    }

    return this.prisma.carousel.update({
      where: { id },
      data: { ...dto, ...(file && { imageUrl }) },
    });
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

    const parts = exists.imageUrl.split('/');
    const publicId = parts.slice(-2).join('/').split('.')[0];
    await this.cloudinary.deleteFile(publicId);

    await this.prisma.carousel.delete({ where: { id } });
    return { message: 'Item do carrossel deletado com sucesso.' };
  }
}
