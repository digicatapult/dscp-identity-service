const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api')
const { API_HOST, API_RPC_PORT, USER_URI, METADATA_KEY_LENGTH, METADATA_VALUE_LITERAL_LENGTH } = require('../env')
const logger = require('../logger')

const provider = new WsProvider(`ws://${API_HOST}:${API_RPC_PORT}`)
const apiOptions = {
  provider,
  types: {
    Address: 'MultiAddress',
    LookupSource: 'MultiAddress',
    PeerId: 'Vec<u8>',
    Key: 'Vec<u8>',
    TokenId: 'u128',
    TokenMetadataKey: `[u8; ${METADATA_KEY_LENGTH}]`,
    TokenMetadataValue: 'MetadataValue',
    Token: {
      id: 'TokenId',
      owner: 'AccountId',
      creator: 'AccountId',
      created_at: 'BlockNumber',
      destroyed_at: 'Option<BlockNumber>',
      metadata: 'BTreeMap<TokenMetadataKey, TokenMetadataValue>',
      parents: 'Vec<TokenId>',
      children: 'Option<Vec<TokenId>>',
    },
    MetadataValue: {
      _enum: {
        File: 'Hash',
        Literal: `[u8; ${METADATA_VALUE_LITERAL_LENGTH}]`,
        None: null,
      },
    },
  },
}

const api = new ApiPromise(apiOptions)

api.on('disconnected', () => {
  logger.warn(`Disconnected from substrate node at ${API_HOST}:${API_RPC_PORT}`)
})

api.on('connected', () => {
  logger.info(`Connected to substrate node at ${API_HOST}:${API_RPC_PORT}`)
})

api.on('error', (err) => {
  logger.error(`Error from substrate node connection. Error was ${err.message || JSON.stringify(err)}`)
})

const utf8ToUint8Array = (str, len) => {
  const arr = new Uint8Array(len)
  try {
    arr.set(Buffer.from(str, 'utf8'))
  } catch (err) {
    if (err instanceof RangeError) {
      throw new Error(`${str} is too long. Max length: ${len} bytes`)
    } else throw err
  }
  return arr
}

async function getLastTokenId() {
  await api.isReady
  const lastTokenId = await api.query.simpleNftModule.lastToken()

  return lastTokenId ? parseInt(lastTokenId, 10) : 0
}

async function runProcess(inputs, outputs) {
  if (inputs && outputs) {
    await api.isReady
    const keyring = new Keyring({ type: 'sr25519' })
    const alice = keyring.addFromUri(USER_URI)

    // [owner: 'OWNER_ID', metadata: METADATA_OBJ] -> ['OWNER_ID', METADATA_OBJ]
    const outputsAsPair = outputs.map(({ owner, metadata: md }) => [owner, md])
    logger.debug('Running Transaction inputs: %j outputs: %j', inputs, outputsAsPair)
    return new Promise((resolve) => {
      let unsub = null
      api.tx.simpleNftModule
        .runProcess(inputs, outputsAsPair)
        .signAndSend(alice, (result) => {
          logger.debug('result.status %s', JSON.stringify(result.status))
          logger.debug('result.status.isInBlock', result.status.isInBlock)
          if (result.status.isInBlock) {
            const tokens = result.events
              .filter(({ event: { method } }) => method === 'Minted')
              .map(({ event: { data } }) => data[0].toNumber())

            unsub()
            resolve(tokens)
          }
        })
        .then((res) => {
          unsub = res
        })
    })
  }

  return new Error('An error occurred whilst adding an item.')
}

const hexToUtf8 = (str) => {
  return Buffer.from(str.slice(2), 'hex').toString('utf8').replace(/\0/g, '') // remove padding
}

const validateTokenId = (tokenId) => {
  let id
  try {
    id = parseInt(tokenId, 10)
  } catch (err) {
    logger.error(`Error parsing tokenId. Error was ${err.message || JSON.stringify(err)}`)
    return null
  }

  if (!Number.isInteger(id) || id === 0) return null

  return id
}

module.exports = {
  runProcess,
  getLastTokenId,
  validateTokenId,
  hexToUtf8,
  utf8ToUint8Array,
}
