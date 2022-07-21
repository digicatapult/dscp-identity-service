const express = require('express')
const cors = require('cors')
const pinoHttp = require('pino-http')
const { initialize } = require('express-openapi')
const swaggerUi = require('swagger-ui-express')
const path = require('path')
const bodyParser = require('body-parser')
const compression = require('compression')

const { PORT, API_VERSION, API_MAJOR_VERSION, AUTH_TYPE, EXTERNAL_PATH_PREFIX } = require('./env')
const logger = require('./logger')
const v1ApiDoc = require('./api-v1/api-doc')
const v1ApiService = require('./api-v1/services/apiService')
const { verifyJwks } = require('./util/authUtil')

async function createHttpServer() {
  const app = express()
  const requestLogger = pinoHttp({ logger })

  app.use(cors())
  app.use(compression())
  app.use(bodyParser.json())

  app.get('/health', async (req, res) => {
    res.status(200).send({ version: API_VERSION, status: 'ok' })
    return
  })

  app.use((req, res, next) => {
    if (req.path !== '/health') requestLogger(req, res)
    next()
  })

  const securityHandlers =
    AUTH_TYPE === 'JWT'
      ? {
          bearerAuth: (req) => {
            return verifyJwks(req.headers['authorization'])
          },
        }
      : {}

  initialize({
    app,
    apiDoc: v1ApiDoc,
    securityHandlers: securityHandlers,
    dependencies: {
      apiService: v1ApiService,
    },
    paths: [path.resolve(__dirname, `api-${API_MAJOR_VERSION}/routes`)],
  })

  const options = {
    swaggerOptions: {
      urls: [
        {
          url: `${v1ApiDoc.servers[0].url}/api-docs`,
          name: 'IdentityService',
        },
      ],
    },
  }

  app.use(
    EXTERNAL_PATH_PREFIX ? `${EXTERNAL_PATH_PREFIX}/${API_MAJOR_VERSION}/swagger` : `/${API_MAJOR_VERSION}/swagger`,
    swaggerUi.serve,
    swaggerUi.setup(null, options)
  )

  // Sorry - app.use checks arity
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.status) {
      res.status(err.status).send({ error: err.status === 401 ? 'Unauthorised' : err.message })
    } else {
      logger.error('Fallback Error %j', err.stack)
      res.status(500).send('Fatal error!')
    }
  })

  logger.trace('Registered Express routes: %s', {
    toString: () => {
      return JSON.stringify(app._router.stack.map(({ route }) => route && route.path).filter((p) => !!p))
    },
  })

  return { app }
}

/* istanbul ignore next */
async function startServer() {
  try {
    const { app } = await createHttpServer()

    const setupGracefulExit = ({ sigName, server, exitCode }) => {
      process.on(sigName, async () => {
        server.close(() => {
          process.exit(exitCode)
        })
      })
    }

    const server = await new Promise((resolve, reject) => {
      let resolved = false
      const server = app.listen(PORT, (err) => {
        if (err) {
          if (!resolved) {
            resolved = true
            reject(err)
          }
        }
        logger.info(`Listening on port ${PORT} `)
        if (!resolved) {
          resolved = true
          resolve(server)
        }
      })
      server.on('error', (err) => {
        if (!resolved) {
          resolved = true
          reject(err)
        }
      })
    })

    setupGracefulExit({ sigName: 'SIGINT', server, exitCode: 0 })
    setupGracefulExit({ sigName: 'SIGTERM', server, exitCode: 143 })
  } catch (err) {
    logger.fatal('Fatal error during initialisation: %j', err)
    process.exit(1)
  }
}

module.exports = { startServer, createHttpServer }
