import { describe, it, expect } from 'vitest';

// Mock Decision Logic for Unit Testing
function calculateRisk(data: { age: number; bureauScore: number; livenessPass: boolean }) {
  let score = 0;
  if (data.age < 18 || data.age > 65) score += 40;
  if (data.bureauScore < 650) score += 30;
  if (!data.livenessPass) score += 100;
  return score;
}

describe('Loan Decision Engine', () => {
  it('should approve an applicant with good credentials', () => {
    const risk = calculateRisk({ age: 30, bureauScore: 750, livenessPass: true });
    expect(risk).toBeLessThan(50);
  });

  it('should reject an applicant with low bureau score and age issues', () => {
    const risk = calculateRisk({ age: 70, bureauScore: 600, livenessPass: true });
    expect(risk).toBeGreaterThan(50);
  });

  it('should trigger fraud alert if liveness fails', () => {
    const risk = calculateRisk({ age: 30, bureauScore: 800, livenessPass: false });
    expect(risk).toBe(100);
  });
});
