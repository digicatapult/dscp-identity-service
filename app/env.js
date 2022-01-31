const envalid = require('envalid')
const dotenv = require('dotenv')
const { version } = require('../package.json')

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: 'test/test.env' })
} else {
  dotenv.config({ path: '.env' })
}

const vars = envalid.cleanEnv(
  process.env,
  {
    SERVICE_TYPE: envalid.str({ default: 'vitalam-identity-service'.toUpperCase().replace(/-/g, '_') }),
    PORT: envalid.port({ default: 3002 }),
    API_HOST: envalid.host({ devDefault: 'localhost' }),
    API_PORT: envalid.port({ default: 9944 }),
    API_VERSION: envalid.str({ default: version }),
    API_MAJOR_VERSION: envalid.str({ default: 'v1' }),
    AUTH_JWKS_URI: envalid.url({ devDefault: 'https://vitalam.eu.auth0.com/.well-known/jwks.json' }),
    AUTH_AUDIENCE: envalid.str({ devDefault: 'vitalam-test' }),
    AUTH_ISSUER: envalid.url({ devDefault: 'https://vitalam.eu.auth0.com/' }),
    AUTH_TOKEN_URL: envalid.url({ devDefault: 'https://vitalam.eu.auth0.com/oauth/token' }),
    METADATA_KEY_LENGTH: envalid.num({ default: 32 }),
    METADATA_VALUE_LITERAL_LENGTH: envalid.num({ default: 32 }),
    LOG_LEVEL: envalid.str({ default: 'info', devDefault: 'debug' }),
    DB_HOST: envalid.host({ devDefault: 'localhost' }),
    DB_PORT: envalid.port({ default: 5432 }),
    DB_NAME: envalid.str({ default: 'vitalam' }),
    DB_USERNAME: envalid.str({ devDefault: 'postgres' }),
    DB_PASSWORD: envalid.str({ devDefault: 'postgres' }),
  },
  {
    strict: true,
  }
)

module.exports = vars
