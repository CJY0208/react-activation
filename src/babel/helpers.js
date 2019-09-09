// https://github.com/CJY0208/babel-plugin-tester 开发

const crypto = require('crypto')

function getMap() {
  let uuid = 0
  const map = new Map()

  // 对每种 NodeType 做编号处理
  function getIdByKey(key) {
    let id = map.get(key)

    if (!id) {
      id = (++uuid).toString(32)
      map.set(key, id)
    }

    return id
  }

  return getIdByKey
}

module.exports = function({ types: t, template }) {
  const jSXAttribute = (t.jSXAttribute || t.jsxAttribute).bind(t)
  const jSXIdentifier = (t.jSXIdentifier || t.jsxIdentifier).bind(t)
  const jSXExpressionContainer = (
    t.jSXExpressionContainer || t.jsxExpressionContainer
  ).bind(t)

  function getVisitor(filehashIdentifier) {
    const KATypeCountMap = new Map()
    // 对每种 NodeType 做编号处理
    const getTypeId = getMap()

    function genKAValue(openingElementNode) {
      try {
        const typeId = getTypeId(openingElementNode.name.name)

        const count = KATypeCountMap.get(typeId) || 0
        const kaValue = count + 1
        KATypeCountMap.set(typeId, kaValue)
        const nodeId = `${typeId}${kaValue.toString(32)}`

        return jSXExpressionContainer(
          t.templateLiteral(
            [
              t.templateElement({ raw: '', cooked: '' }),
              t.templateElement({ raw: nodeId, cooked: nodeId }, true)
            ],
            [filehashIdentifier]
          )
        )
        // return t.stringLiteral(`${typeId}${kaValue.toString(32)}`)
      } catch (error) {
        return t.stringLiteral(`error`)
      }
    }

    return {
      JSXOpeningElement: {
        enter(path) {
          // 排除 Fragment
          // TODO: 考虑 Fragment 重命名情况
          if (path.node.name.name.includes('Fragment')) {
            return
          }

          // 排除 key 为以下的项，保证 SSR 时两端结果一致
          const keyAttr = path.node.attributes.find(
            attr => attr.type === 'JSXAttribute' && attr.name.name === 'key'
          )
          if (
            keyAttr &&
            keyAttr.value &&
            ['keep-alive-placeholder', 'keeper-container'].includes(
              keyAttr.value.value
            )
          ) {
            return
          }

          // 不允许自定义 _ka 属性
          // TODO: 使用 key 属性替换，需考虑不覆盖 array 结构中的 key 属性，array 结构中保持 _ka 属性
          // 可参考：https://github.com/yannickcr/eslint-plugin-react/blob/master/lib/rules/jsx-key.js
          const attributes = path.node.attributes.filter(attr => {
            try {
              return attr.type !== 'JSXAttribute' || attr.name.name !== '_ka'
            } catch (error) {
              return true
            }
          })

          path.node.attributes = [
            ...attributes,
            jSXAttribute(jSXIdentifier('_ka'), genKAValue(path.node))
          ]
        }
      }
    }
  }

  return {
    visitor: {
      Program: {
        enter(path, { cwd, filename, file: { opts = {} } = {} }) {
          const md5 = crypto.createHash('md5')
          const filepath =
            filename && filename.replace && cwd
              ? filename.replace(cwd, '')
              : opts.sourceFileName
          md5.update(filepath)
          const hash = md5.digest('base64').slice(0, 4)
          const filehashIdentifier = path.scope.generateUidIdentifier(
            'filehash'
          )

          let filehashTemplate

          try {
            filehashTemplate = template(`const %%filehash%% = %%hashString%%;`)(
              {
                filehash: filehashIdentifier,
                hashString: t.stringLiteral(hash)
              }
            )
          } catch (error) {
            filehashTemplate = template(`const ${filehashIdentifier.name} = '${hash}';`)()
          }

          const imports = path.node.body.filter(node =>
            t.isImportDeclaration(node)
          )

          if (imports.length > 0) {
            const insertPlace = imports[imports.length - 1]
            const insertPlacePath = path.get(
              `body.${path.node.body.indexOf(insertPlace)}`
            )
            insertPlacePath.insertAfter(filehashTemplate)
          } else {
            const insertPlacePath = path.get(`body.0`)
            if (insertPlacePath) {
              insertPlacePath.insertBefore(filehashTemplate)
            }
          }

          path.traverse(getVisitor(filehashIdentifier))
        }
      }
    }
  }
}
