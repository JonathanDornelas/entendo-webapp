import { prisma } from '$lib/server/db/client';
import { idiomaOuNulo, idiomasValidos } from '$lib/idiomas';
import { avatarPadrao } from '$lib/avatar/montar';

/** O que o professor diz sobre o próprio ensino — e que vira PADRÃO nas telas de criar. */
export type PerfilDoProfessor = {
	/** Os idiomas que ele ensina, na ordem em que escolheu. Vazio = não respondeu. */
	idiomas: string[];
	/** A língua dos alunos; `pt-BR` quando nunca mudou. */
	idiomaDosAlunos: string;
	/** Desde quando tem conta — a linha de contexto do cabeçalho da conta. */
	desde: Date;
};

/**
 * A conta do PROFESSOR — o que ele muda sobre si mesmo.
 *
 * Existe para nenhuma remote function tocar `prisma.teacher` direto (regra
 * inviolável nº 4). O escopo aqui é sempre a própria conta: o id vem da sessão,
 * e nenhuma função deste arquivo aceita um id que não seja o dela — não há
 * "professor dono de professor".
 *
 * As outras leituras do professor não passam por aqui porque não precisam: os
 * campos de exibição (nome, plano, estado da cobrança) já viajam na sessão do
 * Better Auth. O PERFIL (idiomas) não está na sessão de propósito: não é
 * declarado no Better Auth, então o corpo do cadastro nunca o escreve — só
 * estas funções, com a lista de idiomas do produto como filtro.
 */
export function contaProfessor(teacher: { id: string }) {
	return {
		/** Grava o avatar. Dezoito números já normalizados — ver `avatar/schema.ts`. */
		async gravarAvatar(avatar: string): Promise<void> {
			await prisma.teacher.update({ where: { id: teacher.id }, data: { avatar } });
		},

		/** Grava o nome que aparece para os alunos nos convites. Já aparado e validado. */
		async gravarNome(name: string): Promise<void> {
			await prisma.teacher.update({ where: { id: teacher.id }, data: { name } });
		},

		/** O perfil, já saneado: tag que deixou de existir no produto some da lista. */
		async perfil(): Promise<PerfilDoProfessor> {
			const linha = await prisma.teacher.findUniqueOrThrow({
				where: { id: teacher.id },
				select: { idiomas: true, idiomaDosAlunos: true, createdAt: true }
			});
			return {
				idiomas: idiomasValidos(linha.idiomas),
				idiomaDosAlunos: idiomaOuNulo(linha.idiomaDosAlunos) ?? 'pt-BR',
				desde: linha.createdAt
			};
		},

		/**
		 * Grava os idiomas que ele ensina. Filtra o que não é idioma do produto e
		 * repetido — o pedido vem do navegador, e uma tag inventada viraria o
		 * padrão de uma atividade que nenhum `LanguageProfile` sabe corrigir.
		 */
		async gravarIdiomas(idiomas: string[]): Promise<string[]> {
			const limpos = idiomasValidos(idiomas);
			await prisma.teacher.update({ where: { id: teacher.id }, data: { idiomas: limpos } });
			return limpos;
		},

		/**
		 * O nome, os idiomas e a língua dos alunos — o formulário "Seus dados".
		 *
		 * **A ordem dos idiomas é preservada**: o primeiro é o padrão da atividade
		 * nova. O formulário manda os marcados na ordem da LISTA de idiomas, e
		 * regravar nela trocaria o padrão de quem só acrescentou um idioma. Quem já
		 * estava fica onde estava; o novo entra no fim.
		 */
		async gravarPerfil(dados: {
			name: string;
			idiomas: string[];
			idiomaDosAlunos: string;
		}): Promise<void> {
			const atual = await prisma.teacher.findUniqueOrThrow({
				where: { id: teacher.id },
				select: { idiomas: true, name: true, avatar: true }
			});
			const escolhidos = idiomasValidos(dados.idiomas);
			const idiomas = [
				...atual.idiomas.filter((t) => escolhidos.includes(t)),
				...escolhidos.filter((t) => !atual.idiomas.includes(t))
			];
			await prisma.teacher.update({
				where: { id: teacher.id },
				data: {
					name: dados.name,
					idiomas,
					idiomaDosAlunos: idiomaOuNulo(dados.idiomaDosAlunos) ?? 'pt-BR',
					// Conta sem avatar gravado mostra o rosto que sai do NOME
					// (`avatarPadrao`): trocar o nome trocaria o rosto. Grava-se o de
					// agora antes de o nome mudar.
					avatar: atual.avatar ?? avatarPadrao(atual.name)
				}
			});
		}
	};
}
