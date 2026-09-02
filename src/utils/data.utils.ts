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
