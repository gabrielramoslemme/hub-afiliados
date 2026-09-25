import { fetchAffiliatesSheetFile } from '@/backoffice/features/affiliates/data';

// A planilha é sempre a base de agora: nada de cache entre um download e outro.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const { fileName, content } = await fetchAffiliatesSheetFile();

  return new Response(content, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      // Leva CPF e chave PIX completos: não fica em cache de ninguém no caminho.
      'Cache-Control': 'no-store',
    },
  });
}
