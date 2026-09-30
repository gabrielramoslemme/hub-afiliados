import { moveItem, positionAnnouncement } from './reorder';

describe('moveItem', () => {
  const ids = ['a', 'b', 'c', 'd'];

  it('moves an item down to where it was dropped', () => {
    expect(moveItem(ids, 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an item up to where it was dropped', () => {
    expect(moveItem(ids, 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });

  /* Soltar no mesmo lugar, ou fora da lista, não é mudança: nada vai para a API. */
  it.each([
    ['dropped on itself', 'b', 'b'],
    ['dropped outside the list', 'b', null],
    ['an id the list does not know', 'z', 'b'],
  ])('answers null when %s', (_case, active, over) => {
    expect(moveItem(ids, active, over)).toBeNull();
  });
});

describe('positionAnnouncement', () => {
  it('tells where the item is, counting from one', () => {
    expect(positionAnnouncement('Mídia Kit', 1, 3)).toBe('Mídia Kit está na posição 2 de 3.');
  });
});
