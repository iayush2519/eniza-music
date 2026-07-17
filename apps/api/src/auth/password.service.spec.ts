import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const passwordService = new PasswordService();

  it('produces a hash that verifies against the original password', async () => {
    const hash = await passwordService.hash('correct-password');
    await expect(passwordService.verify(hash, 'correct-password')).resolves.toBe(true);
  });

  it('rejects verification against a different password', async () => {
    const hash = await passwordService.hash('correct-password');
    await expect(passwordService.verify(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('produces a different hash for the same password on each call (random salt)', async () => {
    const hash1 = await passwordService.hash('same-password');
    const hash2 = await passwordService.hash('same-password');
    expect(hash1).not.toBe(hash2);
  });

  it('never stores the plaintext password in the hash output', async () => {
    const hash = await passwordService.hash('super-secret-value');
    expect(hash).not.toContain('super-secret-value');
  });
});
