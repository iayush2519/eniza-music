import { ConfigService } from '@nestjs/config';

import { EmailOtpProvider } from './email-otp-provider';
import { OtpDeliveryMessage } from './otp-delivery.interface';
import { EnvironmentVariables } from '../../config/env.validation';

type SentMail = { from: string; to: string; subject: string; text: string };

/**
 * `nodemailer`'s `createTransport` is mocked at the module level (rather
 * than hitting a real SMTP connection) — the same "mock the transport,
 * not the network" approach `jamendo-provider.spec.ts` uses for `fetch`.
 * `sendMail` is the one method `EmailOtpProvider` actually calls.
 */
const sendMailMock = jest.fn<Promise<void>, [SentMail]>();
const createTransportMock = jest.fn((options: unknown) => {
  void options;
  return { sendMail: sendMailMock };
});

jest.mock('nodemailer', () => ({
  createTransport: (options: unknown) => createTransportMock(options),
}));

/** Mirrors `jamendo-provider.spec.ts`'s `createConfigStub` — a minimal
 * `ConfigService`-shaped stub covering only the keys this provider
 * reads. */
function createConfigStub(overrides: Partial<EnvironmentVariables> = {}) {
  const values: Partial<EnvironmentVariables> = {
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: 587,
    SMTP_SECURE: 'false',
    SMTP_USER: 'apikey',
    SMTP_PASSWORD: 'secret',
    SMTP_FROM_ADDRESS: 'no-reply@example.com',
    ...overrides,
  };

  return {
    get: (key: keyof EnvironmentVariables) => values[key],
  } as ConfigService<EnvironmentVariables, true>;
}

const registerMessage: OtpDeliveryMessage = {
  email: 'user@example.com',
  code: '123456',
  purpose: 'register',
};

describe('EmailOtpProvider', () => {
  beforeEach(() => {
    jest.useRealTimers();
    sendMailMock.mockReset();
    createTransportMock.mockClear();
  });

  it('has providerId "email"', () => {
    const provider = new EmailOtpProvider(createConfigStub());
    expect(provider.providerId).toBe('email');
  });

  it('sends an email via the configured SMTP transport', async () => {
    sendMailMock.mockResolvedValueOnce(undefined);
    const provider = new EmailOtpProvider(createConfigStub());

    await provider.send(registerMessage);

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: { user: 'apikey', pass: 'secret' },
    });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const [sentMail] = sendMailMock.mock.calls[0];
    expect(sentMail.from).toBe('no-reply@example.com');
    expect(sentMail.to).toBe('user@example.com');
    expect(sentMail.subject).toMatch(/verify/i);
    expect(sentMail.text).toContain('123456');
  });

  it('sends a password_reset email with a distinct subject/body', async () => {
    sendMailMock.mockResolvedValueOnce(undefined);
    const provider = new EmailOtpProvider(createConfigStub());

    await provider.send({ ...registerMessage, purpose: 'password_reset' });

    const [sentMail] = sendMailMock.mock.calls[0];
    expect(sentMail.subject).toMatch(/reset/i);
    expect(sentMail.text).toContain('123456');
  });

  it('builds the transport with secure=true when SMTP_SECURE is "true"', async () => {
    sendMailMock.mockResolvedValueOnce(undefined);
    const provider = new EmailOtpProvider(
      createConfigStub({ SMTP_SECURE: 'true', SMTP_PORT: 465 }),
    );

    await provider.send(registerMessage);

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true, port: 465 }),
    );
  });

  it('omits auth when no SMTP credentials are configured', async () => {
    sendMailMock.mockResolvedValueOnce(undefined);
    const provider = new EmailOtpProvider(
      createConfigStub({ SMTP_USER: undefined, SMTP_PASSWORD: undefined }),
    );

    await provider.send(registerMessage);

    expect(createTransportMock).toHaveBeenCalledWith(expect.objectContaining({ auth: undefined }));
  });

  it('reuses the same transport across multiple sends', async () => {
    sendMailMock.mockResolvedValue(undefined);
    const provider = new EmailOtpProvider(createConfigStub());

    await provider.send(registerMessage);
    await provider.send(registerMessage);

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(2);
  });

  it('throws a descriptive error when SMTP_HOST is not configured', async () => {
    const provider = new EmailOtpProvider(createConfigStub({ SMTP_HOST: undefined }));

    await expect(provider.send(registerMessage)).rejects.toThrow(/SMTP_HOST/);
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it('retries on transient send failures and succeeds if a later attempt works', async () => {
    sendMailMock
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce(undefined);
    const provider = new EmailOtpProvider(createConfigStub());

    await provider.send(registerMessage);

    expect(sendMailMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after exhausting retries and throws a descriptive error', async () => {
    sendMailMock.mockRejectedValue(new Error('mailbox unavailable'));
    const provider = new EmailOtpProvider(createConfigStub());

    await expect(provider.send(registerMessage)).rejects.toThrow(/mailbox unavailable/);
    expect(sendMailMock).toHaveBeenCalledTimes(3);
  });
});
