/**
 * O endereço público de uma atividade.
 *
 * **O professor não escolhe o link.** Antes ele digitava um slug, a tela
 * consultava disponibilidade a cada tecla e a publicação podia falhar com "esse
 * link já está em uso" — um campo a preencher, uma consulta a cada tecla e um
 * erro possível, os três para decidir um texto que ninguém lê: quem recebe o
 * link clica nele ou lê o QR. O endereço agora sai do id da atividade.
 *
 * Duas propriedades que isso dá de graça:
 *
 * - **Único por construção.** O id já é único no produto inteiro, então não
 *   existe colisão entre professores e não existe checagem a fazer.
 * - **Estável.** Publicar de novo cai no mesmo endereço, que é o que a tela
 *   promete ("o endereço continua o mesmo") e o que mantém válido o link já
 *   distribuído para a turma.
 *
 * O id de `Activity` é um cuid — só minúsculas e dígitos —, então ele já cabe
 * no formato de slug que a rota `/a/[slug]` aceita, sem transformação.
 */
export function linkDaAtividade(activityId: string): string {
	return activityId;
}
