import { hash, verify } from '@node-rs/argon2';
import { Injectable } from '@nestjs/common';

/**
 * Wraps argon2 (via @node-rs/argon2 — Rust bindings with prebuilt
 * binaries, no native build toolchain required) behind a small interface
 * so the rest of the app never imports a hashing library directly. Per
 * docs/architecture/security.md: "Passwords hashed with a modern adaptive
 * hash (argon2 or bcrypt)... never stored plain or with a fast
 * general-purpose hash."
 *
 * Argon2id (the library's default) is used deliberately over Argon2i/d —
 * it's the OWASP-recommended variant, balancing resistance to both
 * side-channel and GPU-cracking attacks.
 */
@Injectable()
export class PasswordService {
  async hash(plainTextPassword: string): Promise<string> {
    return hash(plainTextPassword);
  }

  async verify(hashedPassword: string, plainTextPassword: string): Promise<boolean> {
    return verify(hashedPassword, plainTextPassword);
  }
}
