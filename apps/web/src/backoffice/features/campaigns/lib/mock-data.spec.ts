import { PAGE_SIZE } from './campaign-params';
import { campaigns, currentCampaign, newParticipantsThisWeek, REFERENCE_DATE } from './mock-data';

/**
 * O dado é ilustrativo, e é por isso que ele precisa fechar a conta: uma tela de
 * exemplo cujos números se contradizem ensina a analista a não conferir a tela
 * de verdade. Cada teste aqui trava uma coerência que a tela mostra lado a lado.
 */
describe('campaigns mock data', () => {
  const reference = new Date(REFERENCE_DATE).getTime();

  it('gives every campaign an identifier of its own', () => {
    const ids = campaigns.map((campaign) => campaign.publicId);

    expect(new Set(ids).size).toBe(campaigns.length);
  });

  it('ends every campaign after it starts', () => {
    for (const campaign of campaigns) {
      expect(new Date(campaign.endsAt).getTime()).toBeGreaterThan(
        new Date(campaign.startsAt).getTime(),
      );
    }
  });

  it('runs a single campaign at a time, which is the one the panel highlights', () => {
    const running = campaigns.filter((campaign) => campaign.status === 'active');

    expect(running).toEqual([currentCampaign]);
  });

  it('keeps the running campaign inside its own window', () => {
    expect(new Date(currentCampaign.startsAt).getTime()).toBeLessThanOrEqual(reference);
    expect(new Date(currentCampaign.endsAt).getTime()).toBeGreaterThanOrEqual(reference);
  });

  it('only calls scheduled what has not started yet', () => {
    for (const campaign of campaigns.filter((item) => item.status === 'scheduled')) {
      expect(new Date(campaign.startsAt).getTime()).toBeGreaterThan(reference);
    }
  });

  it('only calls ended what has already finished', () => {
    for (const campaign of campaigns.filter((item) => item.status === 'ended')) {
      expect(new Date(campaign.endsAt).getTime()).toBeLessThan(reference);
    }
  });

  it('never owes more than it generated', () => {
    for (const campaign of campaigns) {
      expect(campaign.pendingCents).toBeLessThanOrEqual(campaign.generatedCents);
      expect(campaign.pendingCents).toBeGreaterThanOrEqual(0);
    }
  });

  it('generates money only where there are affiliates taking part', () => {
    for (const campaign of campaigns) {
      expect(campaign.generatedCents > 0).toBe(campaign.participants > 0);
    }
  });

  it('counts the week arrivals inside the total of participants', () => {
    expect(newParticipantsThisWeek).toBeLessThan(currentCampaign.participants);
  });

  it('fills more than one page, so the listing is read paginated', () => {
    expect(campaigns.length).toBeGreaterThan(PAGE_SIZE);
  });
});
