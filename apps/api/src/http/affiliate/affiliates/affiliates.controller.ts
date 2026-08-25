import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateAffiliateUseCase } from '@Application/affiliates/create-affiliate.use-case';
import { Public } from '@Http/shared/decorators/public.decorator';
import { CreateAffiliateRequestDto } from './dtos/create-affiliate.request.dto';
import { CreateAffiliateResponseDto } from './dtos/create-affiliate.response.dto';

@ApiTags('affiliates')
@Controller('affiliates')
export class AffiliatesController {
  constructor(private readonly createAffiliateUseCase: CreateAffiliateUseCase) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: CreateAffiliateResponseDto })
  @ApiBadRequestResponse({ description: 'Entrada inválida ou regra de cadastro violada' })
  @ApiConflictResponse({ description: 'E-mail ou CPF já cadastrado' })
  async create(@Body() body: CreateAffiliateRequestDto): Promise<CreateAffiliateResponseDto> {
    return this.createAffiliateUseCase.execute(body);
  }
}
