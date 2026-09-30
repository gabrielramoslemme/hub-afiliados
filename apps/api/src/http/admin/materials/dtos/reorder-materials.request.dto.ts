import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { ReorderMaterialsRequest } from '@porto/contracts';

/** Espelha o `reorderMaterialsSchema`: a lista inteira, na ordem nova. */
export class ReorderMaterialsRequestDto implements ReorderMaterialsRequest {
  @ApiProperty({ type: [String], format: 'uuid', description: 'Todos os itens, na ordem nova' })
  @IsArray({ message: 'Informe a ordem dos itens' })
  @ArrayMinSize(1, { message: 'Informe a ordem dos itens' })
  @ArrayMaxSize(999, { message: 'A lista vai até 999 itens' })
  @ArrayUnique({ message: 'A ordem repete um item' })
  @IsUUID('all', { each: true, message: 'Item inválido na ordem' })
  ids: string[];
}
