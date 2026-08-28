/**
 * Toda a copy da landing page. Um arquivo só, de propósito: quem revisa texto
 * não deveria precisar abrir componente para trocar uma palavra.
 */

/**
 * Números que dependem da Porto — dependência D10 nos requisitos, fora deste
 * recorte. Enquanto forem `null`, a página descreve o mecanismo sem afirmar
 * valor: nenhuma promessa que o programa ainda não fez. Assim que a Porto
 * definir, basta preencher aqui e a seção correspondente passa a exibir.
 */
export const pendingFromPorto = {
  /** Ex.: 'R$ 25' — quanto o afiliado recebe por venda validada. */
  incentivePerSale: null as string | null,
  /** Ex.: '5%' — desconto que o cupom concede a quem compra. */
  customerDiscount: null as string | null,
  /** Ex.: 'até 5 dias úteis' — prazo de análise do cadastro. */
  reviewWindow: null as string | null,
  /** Ex.: 'todo dia 10' — quando o incentivo é pago. */
  payoutSchedule: null as string | null,
};

export const site = {
  program: 'Hub de Afiliados',
  company: 'Porto Serviços',
  contactEmail: 'afiliados@portoservico.com.br',
  accountCta: 'Acessar minha conta',
};

export const nav = [
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'O que você recebe', href: '#beneficios' },
  { label: 'Requisitos', href: '#requisitos' },
  { label: 'Dúvidas', href: '#duvidas' },
];

export const hero = {
  badge: 'Campanha 2026',
  eyebrow: 'Programa de afiliados',
  title: 'Seu público já precisa desses serviços.',
  titleAccent: 'Agora eles rendem para você.',
  lead: 'Você recebe um cupom exclusivo da Porto Serviços, indica para quem já confia em você e é remunerado a cada venda concluída. A contratação acontece nos canais da Porto — você não vende, não cobra e não executa o serviço.',
  primaryCta: 'Quero me cadastrar',
  secondaryCta: 'Ver como funciona',
  assurances: ['Cadastro gratuito', 'Sem CNPJ', 'Pagamento via PIX'],
};

/*
  O extrato do hero. Os valores são de exemplo e a peça diz isso na cara —
  `disclaimer` é renderizado ao lado do saldo, não em nota de rodapé. Quando a
  Porto fechar os números reais (`pendingFromPorto`), este bloco sai.

  As linhas somam exatamente `totalCents`: um extrato ilustrativo que não fecha
  a conta ensina o leitor a não confiar no extrato de verdade.
*/
export const showcase = {
  balanceLabel: 'Saldo acumulado',
  disclaimer: 'Valores ilustrativos',
  freshness: 'Atualizado agora',
  totalCents: 72000,
  lines: [
    { label: 'Serviços Automotivos', cents: 32000 },
    { label: 'Serviços Residenciais', cents: 24000 },
    { label: 'Funilaria e Pintura', cents: 16000 },
  ],
  note: 'O extrato completo abre na sua área assim que o cadastro é aprovado.',
};

export const requirements = {
  eyebrow: 'Requisitos',
  title: 'O que a Porto confere antes de aprovar',
  lead: 'A análise é manual e olha quatro coisas. Nenhuma delas custa dinheiro nem exige empresa aberta.',
  items: [
    'CPF regular e no seu nome. Não é preciso CNPJ nem MEI.',
    'Chave PIX registrada para o mesmo CPF do cadastro.',
    'Aceite do Regulamento do programa, no envio do formulário.',
    'Dados conferidos pelo time da Porto, cadastro por cadastro.',
  ],
  note: 'A decisão final é da Porto e chega por e-mail — aprovada, com o link para criar sua senha; reprovada, com o motivo.',
};

export const audience = {
  eyebrow: 'Para quem é',
  title: 'Feito para quem já é procurado quando o problema aparece',
  lead: 'O programa é aberto: qualquer pessoa pode se candidatar. Estes são os perfis em que ele costuma render mais.',
  profiles: [
    {
      title: 'Creators e criadores de conteúdo',
      description:
        'Sua audiência pede indicação de serviço toda semana. O cupom transforma a resposta que você já dá em receita.',
    },
    {
      title: 'Clubes de compra e comunidades',
      description:
        'Um benefício a mais para a sua base, sem custo para você e sem nada para operar.',
    },
    {
      title: 'Síndicos e condôminos',
      description:
        'Você é a primeira pessoa que o condomínio procura quando algo quebra. A indicação já acontece — agora ela é remunerada.',
    },
    {
      title: 'Profissionais do mercado imobiliário',
      description:
        'Quem acabou de mudar de casa contrata serviço no mesmo mês. É a janela mais curta entre a indicação e a venda.',
    },
    {
      title: 'E qualquer pessoa que indica',
      description:
        'Não é preciso audiência nem carteira de clientes. Quem responde o vizinho no grupo do prédio já pode se candidatar.',
    },
  ],
};

export const steps = {
  eyebrow: 'Como funciona',
  title: 'Do cadastro ao primeiro incentivo',
  items: [
    {
      title: 'Cadastre-se',
      description:
        'Nome, e-mail, RG, CPF e a chave PIX em que você quer receber. Leva menos de dois minutos e nem senha pede.',
    },
    {
      title: 'A Porto analisa',
      description:
        'Cada cadastro é avaliado por uma pessoa do time da Porto, um a um. Não há triagem automática nem consulta a bureau.',
    },
    {
      title: 'Seu cupom é liberado',
      description:
        'Aprovado, você recebe por e-mail o link para criar sua senha e o cupom exclusivo que identifica as suas indicações.',
    },
    {
      title: 'Divulgue do seu jeito',
      description:
        'Story, grupo de WhatsApp, mural do condomínio, lista de transmissão. O cupom é o mesmo em qualquer lugar.',
    },
    {
      title: 'Acompanhe e receba',
      description:
        'Cada venda concluída com o seu cupom entra no seu extrato, e o incentivo cai na chave PIX que você cadastrou.',
    },
  ],
};

export const benefits = {
  eyebrow: 'O que você recebe',
  title: 'Um cupom, um extrato e o dinheiro na sua chave',
  highlight: {
    title: 'Um cupom exclusivo, só seu',
    description:
      'Ele é o que liga cada venda a você. Nenhuma indicação se perde por falta de rastreio e nenhum outro afiliado usa o seu código.',
  },
  items: [
    {
      title: 'Extrato por venda',
      description: 'Cada indicação aparece com data e situação, da compra à liberação.',
    },
    {
      title: 'Pagamento via PIX',
      description: 'Na chave que você cadastrou, sempre no seu nome.',
    },
    {
      title: 'Vantagem para quem compra',
      description: 'O cupom também é desconto para o cliente. Indicar fica bem mais fácil.',
    },
    {
      title: 'Sem custo e sem meta de entrada',
      description: 'Você não paga nada para participar e não precisa de CNPJ.',
    },
  ],
};

export const pitch = {
  eyebrow: 'Na prática',
  title: 'Como explicar para o cliente',
  lead: 'Não há link para rastrear nem formulário para preencher. Na hora de fechar a contratação no site da Porto, o cliente digita o seu cupom no campo de desconto.',
  sampleCoupon: 'MARINA25',
  quote:
    'Quando for fechar, coloca o meu cupom no campo de desconto. Você paga menos e a indicação fica registrada como minha.',
  /* Frases prontas: quem indica não quer redigir, quer copiar e colar. */
  phrases: [
    'No fim da compra, coloca o meu cupom de desconto.',
    'Digita o meu código no campo de cupom que você paga menos.',
    'É assim que a Porto identifica que a indicação foi minha.',
  ],
  phrasesLabel: 'Como pedir, em uma frase',
  note: 'O cupom aparece na sua área assim que o cadastro é aprovado. O exemplo acima é ilustrativo.',
};

export const faq = {
  eyebrow: 'Dúvidas',
  title: 'O que perguntam antes de se cadastrar',
  items: [
    {
      question: 'Preciso pagar alguma coisa para participar?',
      answer:
        'Não. O cadastro é gratuito, não há mensalidade e não existe meta mínima para continuar no programa.',
    },
    {
      question: 'Preciso ter CNPJ ou ser MEI?',
      answer:
        'Não. O cadastro é feito com CPF e o incentivo é pago na sua chave PIX de pessoa física.',
    },
    {
      question: 'A chave PIX pode estar no nome de outra pessoa?',
      answer:
        'Não. Ela precisa estar no seu nome — é o que garante que o incentivo chega a quem indicou. Se você escolher o tipo CPF, a chave tem que ser exatamente o CPF do cadastro.',
    },
    {
      question: 'Quanto tempo leva a análise?',
      answer:
        'A análise é manual, cadastro por cadastro, feita pelo time da Porto. Assim que houver decisão você recebe um e-mail — aprovado, com o link para criar sua senha; reprovado, com o motivo registrado.',
    },
    {
      question: 'Eu vendo o serviço ou recebo o dinheiro do cliente?',
      answer:
        'Nem um nem outro. A contratação, o pagamento e a execução acontecem inteiramente nos canais da Porto. Você indica; o resto é com eles.',
    },
    {
      question: 'Como acompanho as minhas indicações?',
      answer:
        'Depois de aprovado, você cria sua senha pelo link enviado por e-mail e acessa a sua área, onde ficam o cupom e o extrato das vendas.',
    },
  ],
};

export const registration = {
  eyebrow: 'Cadastro',
  title: 'Comece agora',
  lead: 'Cinco campos. Sem senha, sem anexo e sem taxa. Você recebe um e-mail confirmando o recebimento e outro com a decisão.',
  consent:
    'Ao enviar, você declara que leu e concorda com o Regulamento do programa e com a Política de Privacidade da Porto.',
  lgpd: 'Seus dados são tratados conforme a LGPD e usados apenas para a análise do cadastro e o pagamento dos incentivos.',
  marks: ['Cadastro 100% digital', 'Sem custo de adesão', 'Análise feita por uma pessoa'],
};

export const footer = {
  tagline: 'Um canal de aquisição da Porto Serviços operado com a Mesa.',
  links: [
    { label: 'Regulamento', href: '/regulamento' },
    { label: 'Política de Privacidade', href: '/privacidade' },
  ],
};
