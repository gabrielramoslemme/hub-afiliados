import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRoleEnum } from '@porto/contracts';
import { CompleteTrainingModuleUseCase } from '@Application/materials/complete-training-module.use-case';
import { GetAffiliateMaterialsUseCase } from '@Application/materials/get-affiliate-materials.use-case';
import { UncompleteTrainingModuleUseCase } from '@Application/materials/uncomplete-training-module.use-case';
import { ActorInfo } from '@Http/shared/authenticated-request';
import { Actor } from '@Http/shared/decorators/actor.decorator';
import { Roles } from '@Http/shared/decorators/roles.decorator';
import { AffiliateGuard } from '@Http/shared/guards/affiliate.guard';
import { AffiliateMaterialsResponseDto } from './dtos/affiliate-materials.response.dto';

/**
 * Os materiais do lado de quem os consome: o afiliado lê a aba e marca o que
 * assistiu. Quem cadastra é o painel, em `http/admin/materials`. O path segue
 * sob `affiliate/me` porque o que sai daqui é sempre o progresso de quem
 * assinou o token, nunca o de um id da rota.
 */
@ApiTags('affiliate/materials')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão ausente ou expirada' })
@UseGuards(AffiliateGuard)
@Controller('affiliate/me')
export class AffiliateMaterialsController {
  constructor(
    private readonly getAffiliateMaterialsUseCase: GetAffiliateMaterialsUseCase,
    private readonly completeTrainingModuleUseCase: CompleteTrainingModuleUseCase,
    private readonly uncompleteTrainingModuleUseCase: UncompleteTrainingModuleUseCase,
  ) {}

  /** A aba Materiais: a trilha de formação com o progresso de quem pediu, e os arquivos. */
  @Get('materials')
  @Roles(UserRoleEnum.AFFILIATE)
  @ApiOkResponse({ type: AffiliateMaterialsResponseDto })
  async materials(@Actor() actor: ActorInfo): Promise<AffiliateMaterialsResponseDto> {
    return AffiliateMaterialsResponseDto.from(
      await this.getAffiliateMaterialsUseCase.execute(actor.publicId),
    );
  }

  /**
   * Marca o módulo como assistido por quem assinou o token. PUT porque repetir
   * não muda nada: a conclusão é um estado, e a data que fica é a da primeira vez.
   */
  @Put('training-modules/:publicId/completion')
  @Roles(UserRoleEnum.AFFILIATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Módulo marcado como assistido' })
  @ApiNotFoundResponse({ description: 'Módulo não encontrado' })
  async completeTrainingModule(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Actor() actor: ActorInfo,
  ): Promise<void> {
    await this.completeTrainingModuleUseCase.execute({
      userPublicId: actor.publicId,
      trainingModulePublicId: publicId,
    });
  }

  /** Desfaz a marca de assistido. Repetir não é erro, como no PUT. */
  @Delete('training-modules/:publicId/completion')
  @Roles(UserRoleEnum.AFFILIATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Marca de assistido removida' })
  @ApiNotFoundResponse({ description: 'Módulo não encontrado' })
  async uncompleteTrainingModule(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Actor() actor: ActorInfo,
  ): Promise<void> {
    await this.uncompleteTrainingModuleUseCase.execute({
      userPublicId: actor.publicId,
      trainingModulePublicId: publicId,
    });
  }
}
