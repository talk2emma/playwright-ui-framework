import { faker } from '@faker-js/faker';

export interface GeneratedUser {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  username: string;
  password: string;
  phone: string;
  company: string;
  jobTitle: string;
  dateOfBirth: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

/** Seeds faker so a failing run can be reproduced exactly. */
export function seedFaker(seed: number): void {
  faker.seed(seed);
}

export function generateUser(overrides: Partial<GeneratedUser> = {}): GeneratedUser {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email: faker.internet
      .email({ firstName, lastName, provider: 'test.example.com' })
      .toLowerCase(),
    username: faker.internet.username({ firstName, lastName }).toLowerCase(),
    password: `${faker.internet.password({ length: 12 })}A1!`,
    phone: faker.phone.number({ style: 'national' }),
    company: faker.company.name(),
    jobTitle: faker.person.jobTitle(),
    dateOfBirth: faker.date.birthdate({ min: 21, max: 70, mode: 'age' }).toISOString().slice(0, 10),
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode(),
      country: faker.location.country(),
    },
    ...overrides,
  };
}

/** Unique, human-readable id — safe to use as a test-data marker. */
export function uniqueId(prefix = 'e2e'): string {
  return `${prefix}-${Date.now().toString(36)}-${faker.string.alphanumeric(6).toLowerCase()}`;
}

export function randomString(length = 10): string {
  return faker.string.alphanumeric(length);
}

export function randomInt(min: number, max: number): number {
  return faker.number.int({ min, max });
}

export function randomFrom<T>(items: readonly T[]): T {
  return faker.helpers.arrayElement(items);
}

/** Strings that historically break form inputs — for boundary/negative coverage. */
export const EDGE_CASE_STRINGS = {
  empty: '',
  whitespace: '   ',
  sqlInjection: "' OR '1'='1",
  xssScript: '<script>alert("xss")</script>',
  htmlEntities: '&lt;div&gt;&amp;nbsp;',
  unicode: 'Ω≈ç√∫˜µ≤≥÷',
  emoji: '\u{1f680}\u{1f525}✅\u{1f9ea}',
  rightToLeft: 'مرحبا بالعالم',
  cjk: '日本語のテキスト',
  longString: 'a'.repeat(5000),
  leadingTrailingSpace: '  padded  ',
  newlines: 'line1\nline2\r\nline3',
  tabs: 'col1\tcol2',
  zeroWidth: 'a\u200Bb',
  quotes: `mixed "double" and 'single'`,
  pathTraversal: '../../etc/passwd',
  templateInjection: '{{7*7}}',
  numericString: '000123',
  negativeNumber: '-1',
  decimal: '3.14159',
} as const;

export { faker };
