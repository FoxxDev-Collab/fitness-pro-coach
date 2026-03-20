export type PasswordCheck = {
  label: string;
  test: (password: string) => boolean;
};

export const passwordChecks: PasswordCheck[] = [
  { label: "At least 12 characters", test: (p) => p.length >= 12 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "One number", test: (p) => /[0-9]/.test(p) },
  { label: "One special character (!@#$%^&*...)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors = passwordChecks
    .filter((c) => !c.test(password))
    .map((c) => c.label);

  return { valid: errors.length === 0, errors };
}

export function isCommonPassword(password: string): boolean {
  const common = [
    "password1234", "123456789012", "qwertyuiop12", "letmein12345",
    "iloveyou1234", "admin1234567", "welcome12345", "monkey123456",
    "dragon123456", "master123456", "changeme1234",
  ];
  return common.includes(password.toLowerCase());
}
