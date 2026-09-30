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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreateTrainingModuleUseCase } from '@Application/materials/create-training-module.use-case';
import { DeleteTrainingModuleUseCase } from '@Application/materials/delete-training-module.use-case';
import { ListTrainingModulesUseCase } from '@Application/materials/list-training-modules.use-case';
import { ReorderTrainingModulesUseCase } from '@Application/materials/reorder-training-modules.use-case';
import { UpdateTrainingModuleUseCase } from '@Application/materials/update-training-module.use-case';
import { AdminGuard } from '@Http/shared/guards/admin.guard';
import { ReorderMaterialsRequestDto } from './dtos/reorder-materials.request.dto';
import { TrainingModuleRequestDto } from './dtos/training-module.request.dto';
import { TrainingModuleResponseDto } from './dtos/training-module.response.dto';

/** A trilha de formação que o afiliado assiste na aba Materiais. */
@ApiTags('admin/training-modules')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão ausente ou expirada' })
@UseGuards(AdminGuard)
@Controller('admin/training-modules')
export class AdminTrainingModulesController {
  constructor(
    private readonly listTrainingModulesUseCase: ListTrainingModulesUseCase,
    private readonly createTrainingModuleUseCase: CreateTrainingModuleUseCase,
    private readonly updateTrainingModuleUseCase: UpdateTrainingModuleUseCase,
    private readonly deleteTrainingModuleUseCase: DeleteTrainingModuleUseCase,
    private readonly reorderTrainingModulesUseCase: ReorderTrainingModulesUseCase,
  ) {}

  @Get()
  @ApiOkResponse({ type: [TrainingModuleResponseDto], description: 'Na ordem da trilha' })
  async list(): Promise<TrainingModuleResponseDto[]> {
    return (await this.listTrainingModulesUseCase.execute()).map(TrainingModuleResponseDto.from);
  }

  @Post()
  @ApiCreatedResponse({ type: TrainingModuleResponseDto })
  @ApiBadRequestResponse({ description: 'Campo fora do formato' })
  async create(@Body() body: TrainingModuleRequestDto): Promise<TrainingModuleResponseDto> {
    return TrainingModuleResponseDto.from(await this.createTrainingModuleUseCase.execute(body));
  }

  /**
   * A ordem nova de a trilha, com todos os itens. Declarada antes de `:publicId`,
   * que casaria `order` e o recusaria como uuid inválido.
   */
  @Put('order')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Ordem gravada' })
  @ApiBadRequestResponse({ description: 'Lista vazia, repetida ou com id inválido' })
  @ApiConflictResponse({ description: 'A lista não é mais a dos itens que existem' })
  reorder(@Body() body: ReorderMaterialsRequestDto): Promise<void> {
    return this.reorderTrainingModulesUseCase.execute(body.ids);
  }

  /** Troca o módulo inteiro. Quem já o assistiu continua marcado. */
  @Put(':publicId')
  @ApiOkResponse({ type: TrainingModuleResponseDto })
  @ApiBadRequestResponse({ description: 'Campo fora do formato' })
  @ApiNotFoundResponse({ description: 'Módulo não encontrado' })
  async update(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Body() body: TrainingModuleRequestDto,
  ): Promise<TrainingModuleResponseDto> {
    return TrainingModuleResponseDto.from(
      await this.updateTrainingModuleUseCase.execute({ ...body, publicId }),
    );
  }

  /** Apaga o módulo e o registro de quem o assistiu. */
  @Delete(':publicId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Módulo apagado' })
  @ApiNotFoundResponse({ description: 'Módulo não encontrado' })
  remove(@Param('publicId', ParseUUIDPipe) publicId: string): Promise<void> {
    return this.deleteTrainingModuleUseCase.execute(publicId);
  }
}
