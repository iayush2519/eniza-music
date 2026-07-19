import { OtpCooldownError, OtpService } from './otp.service';
import { OtpDeliveryMessage } from './otp-delivery.interface';
import { PasswordService } from '../password.service';
import { EmailOtp } from '../../database/schema';

/**
 * A minimal fake of the subset of Drizzle's chainable query builder
 * `OtpService` actually calls, rather than a full mock ORM. Each fake
 * method returns `this` so the real fluent chain
 * (`.select().from().where().orderBy().limit()`) works unmodified, and
 * the terminal `await` resolves to whatever `selectResult`/`insertResult`
 * currently holds — set per-test before invoking the service.
 */
type UpdateCall = { values: { consumedAt: Date }; id: unknown };

function createFakeDb() {
  let selectResult: EmailOtp[] = [];
  const inserted: unknown[] = [];
  const updated: UpdateCall[] = [];

  const selectChain = {
    from: () => selectChain,
    where: () => selectChain,
    orderBy: () => selectChain,
    limit: () => Promise.resolve(selectResult),
  };

  const insertChain = {
    values: (values: unknown) => {
      inserted.push(values);
      return Promise.resolve(undefined);
    },
  };

  const updateChain = {
    set: (values: { consumedAt: Date }) => ({
      where: () => {
        updated.push({ values, id: undefined });
        return Promise.resolve(undefined);
      },
    }),
  };

  const db = {
    select: () => selectChain,
    insert: () => insertChain,
    update: () => updateChain,
  };

  return {
    db,
    setSelectResult: (rows: EmailOtp[]) => {
      selectResult = rows;
    },
    inserted,
    updated,
  };
}

function makeOtpRow(overrides: Partial<EmailOtp> = {}): EmailOtp {
  return {
    id: 'otp-1',
    userId: 'user-1',
    purpose: 'register',
    codeHash: '',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: null,
    ...overrides,
  };
}

describe('OtpService', () => {
  const passwordService = new PasswordService();
  const deliveryProvider = {
    providerId: 'test',
    send: jest.fn<Promise<void>, [OtpDeliveryMessage]>().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    deliveryProvider.send.mockClear();
  });

  describe('issue', () => {
    it('delivers a 6-digit code via the injected delivery provider', async () => {
      const fake = createFakeDb();
      fake.setSelectResult([]);
      const service = new OtpService(fake.db as never, passwordService, deliveryProvider);

      await service.issue({ userId: 'user-1', email: 'user@example.com', purpose: 'register' });

      expect(deliveryProvider.send).toHaveBeenCalledTimes(1);
      const message = deliveryProvider.send.mock.calls[0][0];
      expect(message.email).toBe('user@example.com');
      expect(message.purpose).toBe('register');
      expect(message.code).toMatch(/^\d{6}$/);
    });

    it('stores a hash of the code, never the plaintext code', async () => {
      const fake = createFakeDb();
      fake.setSelectResult([]);
      const service = new OtpService(fake.db as never, passwordService, deliveryProvider);

      await service.issue({ userId: 'user-1', email: 'user@example.com', purpose: 'register' });

      const sentMessage = deliveryProvider.send.mock.calls[0][0];
      const insertedRow = fake.inserted[0] as { codeHash: string };
      expect(insertedRow.codeHash).not.toBe(sentMessage.code);
      expect(insertedRow.codeHash.length).toBeGreaterThan(sentMessage.code.length);
    });

    it('throws OtpCooldownError if a code was issued too recently for the same user+purpose', async () => {
      const fake = createFakeDb();
      fake.setSelectResult([makeOtpRow({ createdAt: new Date() })]);
      const service = new OtpService(fake.db as never, passwordService, deliveryProvider);

      await expect(
        service.issue({ userId: 'user-1', email: 'user@example.com', purpose: 'register' }),
      ).rejects.toBeInstanceOf(OtpCooldownError);
      expect(deliveryProvider.send).not.toHaveBeenCalled();
    });

    it('allows issuing again once the cooldown has elapsed', async () => {
      const fake = createFakeDb();
      fake.setSelectResult([makeOtpRow({ createdAt: new Date(Date.now() - 60_000) })]);
      const service = new OtpService(fake.db as never, passwordService, deliveryProvider);

      await service.issue({ userId: 'user-1', email: 'user@example.com', purpose: 'register' });

      expect(deliveryProvider.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('verify', () => {
    it('returns true for a correct, unexpired, unconsumed code', async () => {
      const fake = createFakeDb();
      const service = new OtpService(fake.db as never, passwordService, deliveryProvider);
      const code = '123456';
      const codeHash = await passwordService.hash(code);
      fake.setSelectResult([makeOtpRow({ codeHash })]);

      await expect(service.verify({ userId: 'user-1', purpose: 'register', code })).resolves.toBe(
        true,
      );
    });

    it('returns false for an incorrect code', async () => {
      const fake = createFakeDb();
      const service = new OtpService(fake.db as never, passwordService, deliveryProvider);
      const codeHash = await passwordService.hash('123456');
      fake.setSelectResult([makeOtpRow({ codeHash })]);

      await expect(
        service.verify({ userId: 'user-1', purpose: 'register', code: '654321' }),
      ).resolves.toBe(false);
    });

    it('returns false for an expired code', async () => {
      const fake = createFakeDb();
      const service = new OtpService(fake.db as never, passwordService, deliveryProvider);
      const code = '123456';
      const codeHash = await passwordService.hash(code);
      fake.setSelectResult([makeOtpRow({ codeHash, expiresAt: new Date(Date.now() - 1000) })]);

      await expect(service.verify({ userId: 'user-1', purpose: 'register', code })).resolves.toBe(
        false,
      );
    });

    it('returns false when no OTP row exists for this user+purpose', async () => {
      const fake = createFakeDb();
      const service = new OtpService(fake.db as never, passwordService, deliveryProvider);
      fake.setSelectResult([]);

      await expect(
        service.verify({ userId: 'user-1', purpose: 'register', code: '123456' }),
      ).resolves.toBe(false);
    });

    it('marks the code as consumed after a successful verification', async () => {
      const fake = createFakeDb();
      const service = new OtpService(fake.db as never, passwordService, deliveryProvider);
      const code = '123456';
      const codeHash = await passwordService.hash(code);
      fake.setSelectResult([makeOtpRow({ codeHash })]);

      await service.verify({ userId: 'user-1', purpose: 'register', code });

      expect(fake.updated).toHaveLength(1);
      expect(fake.updated[0].values.consumedAt).toBeInstanceOf(Date);
    });
  });
});
