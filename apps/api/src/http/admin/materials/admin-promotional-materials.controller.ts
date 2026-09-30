import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreatePromotionalMaterialUseCase } from '@Application/materials/create-promotional-material.use-case';
import { DeletePromotionalMaterialUseCase } from '@Application/materials/delete-promotional-material.use-case';
import { ListPromotionalMaterialsUseCase } from '@Application/materials/list-promotional-materials.use-case';
import { UpdatePromotionalMaterialUseCase } from '@Application/materials/update-promotional-material.use-case';
import { AdminGuard } from '@Http/shared/guards/admin.guard';
import { PromotionalMaterialRequestDto } from './dtos/promotional-material.request.dto';
import { PromotionalMaterialResponseDto } from './dtos/promotional-material.response.dto';

/** Os arquivos de divulgação que o afiliado baixa na aba Materiais. */
@ApiTags('admin/promotional-materials')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão ausente ou expirada' })
@UseGuards(AdminGuard)
@Controller('admin/promotional-materials')
export class AdminPromotionalMaterialsController {
  constructor(
    private readonly listPromotionalMaterialsUseCase: ListPromotionalMaterialsUseCase,
    private readonly createPromotionalMaterialUseCase: CreatePromotionalMaterialUseCase,
    private readonly updatePromotionalMaterialUseCase: UpdatePromotionalMaterialUseCase,
    private readonly deletePromotionalMaterialUseCase: DeletePromotionalMaterialUseCase,
  ) {}

  @Get()
  @ApiOkResponse({ type: [PromotionalMaterialResponseDto], description: 'Na ordem da lista' })
  async list(): Promise<PromotionalMaterialResponseDto[]> {
    return (await this.listPromotionalMaterialsUseCase.execute()).map(
      PromotionalMaterialResponseDto.from,
    );
  }

  @Post()
  @ApiCreatedResponse({ type: PromotionalMaterialResponseDto })
  @ApiBadRequestResponse({ description: 'Campo fora do formato' })
  async create(
    @Body() body: PromotionalMaterialRequestDto,
  ): Promise<PromotionalMaterialResponseDto> {
    return PromotionalMaterialResponseDto.from(
      await this.createPromotionalMaterialUseCase.execute(body),
    );
  }

  @Put(':publicId')
  @ApiOkResponse({ type: PromotionalMaterialResponseDto })
  @ApiBadRequestResponse({ description: 'Campo fora do formato' })
  @ApiNotFoundResponse({ description: 'Material não encontrado' })
  async update(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Body() body: PromotionalMaterialRequestDto,
  ): Promise<PromotionalMaterialResponseDto> {
    return PromotionalMaterialResponseDto.from(
      await this.updatePromotionalMaterialUseCase.execute({ ...body, publicId }),
    );
  }

  @Delete(':publicId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Material apagado' })
  @ApiNotFoundResponse({ description: 'Material não encontrado' })
  remove(@Param('publicId', ParseUUIDPipe) publicId: string): Promise<void> {
    return this.deletePromotionalMaterialUseCase.execute(publicId);
  }
}
