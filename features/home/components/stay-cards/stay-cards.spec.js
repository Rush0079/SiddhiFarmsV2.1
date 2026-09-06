import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StayCardsDefaults, getStayCards } from './stay-cards.model.js';

describe('StayCards Component Suite', () => {
  it('StayCardsDefaults provides CTA and subtitle', () => {
    assert.equal(StayCardsDefaults.CTA_TEXT, 'View availability');
    assert.equal(StayCardsDefaults.SUBTITLE, 'Stay awhile');
  });

  it('getStayCards returns all accommodation packages', () => {
    const cards = getStayCards();
    assert.equal(cards.length, 3);
  });
});
