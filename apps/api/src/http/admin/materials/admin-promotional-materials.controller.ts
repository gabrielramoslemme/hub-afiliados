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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRoleEnum } from '@porto/contracts';
import { CreatePromotionalMaterialUseCase } from '@Application/materials/create-promotional-material.use-case';
import { DeletePromotionalMaterialUseCase } from '@Application/materials/delete-promotional-material.use-case';
import { ListPromotionalMaterialsUseCase } from '@Application/materials/list-promotional-materials.use-case';
import { ReorderPromotionalMaterialsUseCase } from '@Application/materials/reorder-promotional-materials.use-case';
import { UpdatePromotionalMaterialUseCase } from '@Application/materials/update-promotional-material.use-case';
import { Roles } from '@Http/shared/decorators/roles.decorator';
import { AdminGuard } from '@Http/shared/guards/admin.guard';
import { PromotionalMaterialRequestDto } from './dtos/promotional-material.request.dto';
import { PromotionalMaterialResponseDto } from './dtos/promotional-material.response.dto';
import { ReorderMaterialsRequestDto } from './dtos/reorder-materials.request.dto';

/** Os arquivos de divulgação que o afiliado baixa na aba Materiais. */
@ApiTags('admin/promotional-materials')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão ausente ou expirada' })
@ApiForbiddenResponse({ description: 'Token de outro canal, ou perfil fora dos que a rota aceita' })
@UseGuards(AdminGuard)
@Controller('admin/promotional-materials')
export class AdminPromotionalMaterialsController {
  constructor(
    private readonly listPromotionalMaterialsUseCase: ListPromotionalMaterialsUseCase,
    private readonly createPromotionalMaterialUseCase: CreatePromotionalMaterialUseCase,
    private readonly updatePromotionalMaterialUseCase: UpdatePromotionalMaterialUseCase,
    private readonly deletePromotionalMaterialUseCase: DeletePromotionalMaterialUseCase,
    private readonly reorderPromotionalMaterialsUseCase: ReorderPromotionalMaterialsUseCase,
  ) {}

  @Get()
  @Roles(UserRoleEnum.PORTO_ANALYST, UserRoleEnum.PORTO_ADMIN, UserRoleEnum.MESA_ADMIN)
  @ApiOkResponse({ type: [PromotionalMaterialResponseDto], description: 'Na ordem da lista' })
  async list(): Promise<PromotionalMaterialResponseDto[]> {
    return (await this.listPromotionalMaterialsUseCase.execute()).map(
      PromotionalMaterialResponseDto.from,
    );
  }

  @Post()
  @Roles(UserRoleEnum.PORTO_ANALYST, UserRoleEnum.PORTO_ADMIN, UserRoleEnum.MESA_ADMIN)
  @ApiCreatedResponse({ type: PromotionalMaterialResponseDto })
  @ApiBadRequestResponse({ description: 'Campo fora do formato' })
  async create(
    @Body() body: PromotionalMaterialRequestDto,
  ): Promise<PromotionalMaterialResponseDto> {
    return PromotionalMaterialResponseDto.from(
      await this.createPromotionalMaterialUseCase.execute(body),
    );
  }

  /**
   * A ordem nova de os downloads, com todos os itens. Declarada antes de `:publicId`,
   * que casaria `order` e o recusaria como uuid inválido.
   */
  @Put('order')
  @Roles(UserRoleEnum.PORTO_ANALYST, UserRoleEnum.PORTO_ADMIN, UserRoleEnum.MESA_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Ordem gravada' })
  @ApiBadRequestResponse({ description: 'Lista vazia, repetida ou com id inválido' })
  @ApiConflictResponse({ description: 'A lista não é mais a dos itens que existem' })
  reorder(@Body() body: ReorderMaterialsRequestDto): Promise<void> {
    return this.reorderPromotionalMaterialsUseCase.execute(body.ids);
  }

  @Put(':publicId')
  @Roles(UserRoleEnum.PORTO_ANALYST, UserRoleEnum.PORTO_ADMIN, UserRoleEnum.MESA_ADMIN)
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
  @Roles(UserRoleEnum.PORTO_ANALYST, UserRoleEnum.PORTO_ADMIN, UserRoleEnum.MESA_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Material apagado' })
  @ApiNotFoundResponse({ description: 'Material não encontrado' })
  remove(@Param('publicId', ParseUUIDPipe) publicId: string): Promise<void> {
    return this.deletePromotionalMaterialUseCase.execute(publicId);
  }
}
