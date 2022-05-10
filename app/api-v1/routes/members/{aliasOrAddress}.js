const {
  memberAddressResponses,
  validateMemberAddressResponse,
} = require('../../validators/memberAddressResponseValidator')
const apiDoc = require('../../api-doc')

const addrRegex = new RegExp(`${apiDoc.components.schemas.Address.pattern}`)
const aliasRegex = new RegExp(`${apiDoc.components.schemas.Alias.pattern}`)

module.exports = function (apiService) {
  const doc = {
    GET: async function (req, res) {
      const { aliasOrAddress } = req.params
      let result = {},
        validationErrors

      if (addrRegex.test(aliasOrAddress)) {
        result = await apiService.getMembersByAddress(aliasOrAddress)
      }
      if (aliasRegex.test(aliasOrAddress)) {
        result = await apiService.getMembersByAlias(aliasOrAddress)
      }

      validationErrors = validateMemberAddressResponse(400, result)
      if (validationErrors) {
        res.status(400).json(validationErrors)
        return
      } else {
        res.status(200).json(result)
        return
      }
    },
  }

  doc.GET.apiDoc = {
    summary: 'Get member by alias or address',
    parameters: [
      {
        description: 'Alias or address of the member',
        in: 'path',
        required: true,
        name: 'aliasOrAddress',
        allowEmptyValue: true,
        schema: {
          // oneOf: [{ $ref: '#/components/schemas/Alias' }, { $ref: '#/components/schemas/Address' }],
          $ref: '#/components/schemas/Address',
        },
      },
    ],
    responses: memberAddressResponses,
    security: [{ bearerAuth: [] }],
    tags: ['members'],
  }

  return doc
}
