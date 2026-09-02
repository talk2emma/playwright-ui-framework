# Pinned to the Playwright image matching the installed @playwright/test version.
# The browsers, system libraries and fonts are baked in, which is what makes a
# containerised run byte-identical to CI — the only way visual baselines hold.
FROM mcr.microsoft.com/playwright:v1.62.1-jammy

WORKDIR /app

ENV CI=true \
    HEADLESS=true \
    NODE_ENV=test

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx playwright install --with-deps

ENTRYPOINT ["npx", "playwright", "test"]
CMD []
